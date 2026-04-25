from __future__ import annotations

"""Run the Praxis pipeline with timing and pass/fail reporting.

From repository root:
  python scripts/test_pipeline.py
  python scripts/test_pipeline.py --demo
  python scripts/test_pipeline.py --no-llm
"""

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path
from typing import Any

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend.agents import literature_agent as literature_agent_mod
from backend.agents._env import load_praxis_env
from backend.agents.bioinformatics_agent import bioinformatics_agent
from backend.agents.context_extractor import context_extractor
from backend.agents.funding_agent import funding_agent
from backend.agents.gtm_agent import gtm_agent
from backend.agents.literature_agent import run_literature_novelty_gate
from backend.agents.protocol_agent import protocol_agent
from backend.agents.reagent_agent import reagent_agent
from backend.agents.tamarind_agent import tamarind_agent
from backend.agents.timeline_agent import timeline_agent
from backend.data import demo_data
from backend.data.feedback_store import format_few_shot, get_similar_feedback, init_db, seed_demo_corrections
from backend.models.research_program import ResearchProgram


def _print_header(title: str) -> None:
    print("\n" + "=" * 88)
    print(title)
    print("=" * 88)


async def _timed(name: str, coro, state: dict[str, Any]) -> Any:
    t0 = time.perf_counter()
    ok = True
    err = ""
    try:
        out = await coro
    except Exception as exc:  # pragma: no cover
        ok = False
        err = str(exc)
        out = None
    dt = (time.perf_counter() - t0) * 1000.0
    state["per_agent_ms"][name] = dt
    state["pass_fail"][name] = ok
    if not ok:
        state["errors"][name] = err
    print(f"- {name}: {dt:,.1f} ms | {'PASS' if ok else 'FAIL'} {err}")
    return out


async def run_full(*, demo: bool, no_llm: bool) -> None:
    load_praxis_env()
    hypothesis = demo_data.DEMO_HYPOTHESIS if demo else (
        "Validate Compound-14 inhibits GyrA in fluoroquinolone-resistant E. coli"
    )
    program = ResearchProgram(hypothesis=hypothesis)

    state: dict[str, Any] = {
        "per_agent_ms": {},
        "pass_fail": {},
        "errors": {},
        "tavily_result_count": None,
        "tokens": {"input": None, "output": None, "note": "set when literature_agent uses Claude"},
    }

    t_all0 = time.perf_counter()
    _print_header("PRAXIS pipeline test")

    program = await _timed("context_extractor", context_extractor(program), state)
    print(json.dumps(program.model_dump(), indent=2)[:4000])

    novelty = await _timed("literature_novelty_gate", run_literature_novelty_gate(program), state)
    if isinstance(novelty, dict):
        state["tavily_result_count"] = novelty.get("tavily_result_count")
    print("novelty:", json.dumps(novelty, indent=2)[:4000])

    if no_llm:
        _print_header("Stopping early (--no-llm)")
    else:
        literature_agent_mod.LAST_CLAUDE_USAGE.clear()
        program = await _timed("literature_agent", literature_agent_mod.literature_agent(program), state)
        usage = getattr(literature_agent_mod, "LAST_CLAUDE_USAGE", {}) or {}
        if usage:
            state["tokens"] = usage
        print(f"literature papers: {len(program.literature)}")

        program = await _timed("tamarind_agent", tamarind_agent(program), state)
        print("tamarind:", program.tamarind_results.model_dump())

        init_db()
        seed_demo_corrections()
        corrections = get_similar_feedback(
            program.assay_type or "mic_assay",
            program.target or "*",
            program.assay_type or "*",
        )
        program.feedback_few_shot = format_few_shot(corrections, program.assay_type or "mic_assay")

        program = await _timed("protocol_agent", protocol_agent(program), state)
        print(f"protocol steps: {len(program.protocols)}")

        program = await _timed("bioinformatics_agent", bioinformatics_agent(program), state)
        print(f"scripts: {len(program.scripts)}")

        program = await _timed("timeline_agent", timeline_agent(program), state)
        print(f"timeline items: {len(program.timeline_weeks)}")

        program = await _timed("reagent_agent", reagent_agent(program), state)
        print(f"reagents: {len(program.reagents)} budget={program.budget_total_usd}")

        program = await _timed("funding_agent", funding_agent(program), state)
        print(f"funding opps: {len(program.funding_opportunities)}")

        program = await _timed("gtm_agent", gtm_agent(program), state)
        print("gtm:", program.gtm_pathway.model_dump())

    program.refresh_computed_fields()
    total_ms = (time.perf_counter() - t_all0) * 1000.0

    _print_header("Summary")
    print(f"Total pipeline time: {total_ms:,.1f} ms")
    print(f"Tavily result count (novelty gate): {state['tavily_result_count']}")
    print(f"Token counts (best-effort): {state['tokens']}")
    print(f"Completeness %: {program.completeness_pct}")
    print("Per-agent PASS/FAIL:", json.dumps(state["pass_fail"], indent=2))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--demo", action="store_true", help="Use the bundled demo hypothesis.")
    ap.add_argument("--no-llm", action="store_true", help="Stop after novelty gate (fast smoke test).")
    args = ap.parse_args()
    asyncio.run(run_full(demo=args.demo, no_llm=args.no_llm))


if __name__ == "__main__":
    main()
