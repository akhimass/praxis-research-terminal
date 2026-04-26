"""
PRAXIS pipeline orchestrator.

Literature and protocol phases use Claude **tool use** (see ``backend.agents.agent_tools``):
Claude may call search_literature, query_rag, critique_plan, emit_sse_event, etc., in a loop
before emitting final structured JSON. Other agents remain deterministic / parallel as before.
"""

from __future__ import annotations

import asyncio
import json
import time
from collections.abc import AsyncGenerator

from backend.agents.bioinformatics_agent import bioinformatics_agent
from backend.agents.context_extractor import context_extractor
from backend.agents.funding_agent import funding_agent
from backend.agents.gtm_agent import gtm_agent
from backend.agents.literature_agent import literature_agent, run_literature_novelty_gate
from backend.agents.protocol_agent import protocol_agent
from backend.agents.reagent_agent import reagent_agent
from backend.agents.tamarind_agent import tamarind_agent
from backend.agents.timeline_agent import timeline_agent
from backend.data.feedback_store import format_few_shot, get_similar_feedback, init_db, seed_demo_corrections
from backend.models.research_program import ResearchProgram
from backend.models.sse_contracts import (
    make_trace,
    map_audit,
    map_bioinformatics,
    map_complete,
    map_context,
    map_error,
    map_funding,
    map_gtm,
    map_key_finding,
    map_literature,
    map_novelty,
    map_protocol,
    map_reagents,
    map_tamarind,
    map_timeline,
    wrap_event,
)


def _sse(event_name: str, data: dict) -> dict:
    """`payload` is the full envelope ``{type, data}`` for the SSE body."""
    return {"event": event_name, "payload": wrap_event(event_name, data)}


def _t(name: str, timings: dict[str, float], t0: float) -> None:
    timings[name] = round(time.perf_counter() - t0, 3)


async def run_praxis_pipeline(hypothesis: str) -> AsyncGenerator[dict, None]:
    t_pipeline0 = time.perf_counter()
    timings: dict[str, float] = {}
    program = ResearchProgram(hypothesis=hypothesis)
    trace_i = 0

    def _trace(agent: str, action: str, finding: str, t_start: float) -> dict:
        nonlocal trace_i
        trace_i += 1
        dms = max(0, int((time.perf_counter() - t_start) * 1000))
        return make_trace(step=trace_i, agent=agent, action=action, finding=finding, duration_ms=dms)

    def _drain_tool_sse(agent: str) -> list[dict]:
        """Emit trace rows for ``emit_sse_event`` tool calls buffered on ``program``."""
        buf = program.agent_tool_events[:]
        program.agent_tool_events.clear()
        rows: list[dict] = []
        for ev in buf:
            t0 = time.perf_counter()
            et = str(ev.get("event_type", "tool"))
            payload = json.dumps(ev.get("data") or {}, default=str)[:400]
            rows.append(_sse("trace", _trace(agent, et, payload, t0)))
        return rows

    # --- context ---
    t0 = time.perf_counter()
    try:
        program = await context_extractor(program)
    except Exception as exc:
        yield _sse("error", map_error(agent="context_extractor", message=str(exc), recoverable=False))
        raise
    _t("context", timings, t0)
    yield _sse("context", map_context(program))
    yield _sse("trace", _trace("CONTEXT", "Extract structured context", f"target={program.target} stage={program.stage.value}", t0))

    # --- novelty (gate) ---
    t0 = time.perf_counter()
    try:
        await run_literature_novelty_gate(program)
    except Exception as exc:
        yield _sse("error", map_error(agent="literature_novelty_gate", message=str(exc), recoverable=True))
        raise
    _t("novelty", timings, t0)
    yield _sse("novelty", map_novelty(program))
    yield _sse(
        "trace",
        _trace("NOVELTY", "Tavily preview + QC gate", str(program.novelty_signal), t0),
    )

    # --- literature + tamarind (parallel) ---
    t0 = time.perf_counter()
    try:
        lit_task = asyncio.create_task(literature_agent(program))
        tam_task = asyncio.create_task(tamarind_agent(program))
        done, _ = await asyncio.wait({lit_task, tam_task}, return_when=asyncio.ALL_COMPLETED)
        for task in done:
            program = task.result()
    except Exception as exc:
        yield _sse("error", map_error(agent="literature|tamarind", message=str(exc), recoverable=True))
        raise
    wall = time.perf_counter() - t0
    timings["literature"] = round(wall, 3)
    timings["tamarind"] = round(
        wall, 3
    )  # wall-clock shared for parallel; refined timing would need per-task hooks
    tamarind_body = map_tamarind(program)
    yield _sse("literature", map_literature(program))
    yield _sse("trace", _trace("LITERATURE", "Synthesize papers", f"{len(program.literature)} papers", t0))
    for row in _drain_tool_sse("LITERATURE"):
        yield row
    # defer tamarind event until after gtm per frontend ordering; keep payload
    tamarind_pending = tamarind_body

    init_db()
    seed_demo_corrections()
    corrections = get_similar_feedback(
        program.assay_type or "mic_assay",
        program.target or "*",
        program.assay_type or "*",
    )
    program.feedback_few_shot = format_few_shot(corrections, program.assay_type or "mic_assay")

    # --- protocol ---
    t0 = time.perf_counter()
    try:
        program = await protocol_agent(program)
    except Exception as exc:
        yield _sse("error", map_error(agent="protocol_agent", message=str(exc), recoverable=True))
        raise
    _t("protocol", timings, t0)
    yield _sse("protocol", map_protocol(program))
    yield _sse("trace", _trace("PROTOCOL", "Generate SOP", f"{len(program.protocols)} steps", t0))
    for row in _drain_tool_sse("PROTOCOL"):
        yield row

    # --- bioinformatics + timeline (parallel) ---
    t0 = time.perf_counter()
    try:
        bio_task = asyncio.create_task(bioinformatics_agent(program))
        tl_task = asyncio.create_task(timeline_agent(program))
        done, _ = await asyncio.wait({bio_task, tl_task}, return_when=asyncio.ALL_COMPLETED)
        for task in done:
            program = task.result()
    except Exception as exc:
        yield _sse("error", map_error(agent="bio|timeline", message=str(exc), recoverable=True))
        raise
    wall2 = time.perf_counter() - t0
    timings["bioinformatics"] = round(wall2, 3)
    timings["timeline"] = round(wall2, 3)
    yield _sse("bioinformatics", map_bioinformatics(program))
    yield _sse("trace", _trace("BIOINFORMATICS", "Render scripts", f"{len(program.scripts)} artifacts", t0))
    yield _sse("timeline", map_timeline(program))
    yield _sse("trace", _trace("TIMELINE", "Gantt", f"{len(program.timeline_weeks)} items", t0))

    # --- reagents ---
    t0 = time.perf_counter()
    try:
        program = await reagent_agent(program)
    except Exception as exc:
        yield _sse("error", map_error(agent="reagent_agent", message=str(exc), recoverable=True))
        raise
    _t("reagents", timings, t0)
    yield _sse("reagents", map_reagents(program))
    yield _sse("trace", _trace("REAGENTS", "Budget", f"total ${program.budget_total_usd:,.0f}", t0))

    # --- funding ---
    t0 = time.perf_counter()
    try:
        program = await funding_agent(program)
    except Exception as exc:
        yield _sse("error", map_error(agent="funding_agent", message=str(exc), recoverable=True))
        raise
    _t("funding", timings, t0)
    yield _sse("funding", map_funding(program))
    yield _sse("trace", _trace("FUNDING", "Score opportunities", f"{len(program.funding_opportunities)} opps", t0))

    # --- gtm ---
    t0 = time.perf_counter()
    try:
        program = await gtm_agent(program)
    except Exception as exc:
        yield _sse("error", map_error(agent="gtm_agent", message=str(exc), recoverable=True))
        raise
    _t("gtm", timings, t0)
    yield _sse("gtm", map_gtm(program))
    yield _sse("trace", _trace("GTM", "Reg path", program.gtm_pathway.regulatory_pathway[:60], t0))

    # tamarind (emitted after gtm to match Lovable event order)
    t_tam = time.perf_counter()
    yield _sse("tamarind", tamarind_pending)
    yield _sse("trace", _trace("TAMARIND", "Structure", program.tamarind_results.status, t_tam))

    # --- audit ---
    yield _sse("audit", map_audit(program))

    # --- key finding ---
    yield _sse("key_finding", map_key_finding(program))

    program.refresh_computed_fields()
    total_s = time.perf_counter() - t_pipeline0
    if "novelty" not in timings:
        timings["novelty"] = 0.0
    yield _sse(
        "complete",
        map_complete(
            program,
            total_seconds=total_s,
            timings=timings,
        ),
    )


async def run_demo_pipeline(*, fast: bool = False) -> AsyncGenerator[dict, None]:
    """SSE demo stream: same contract as /pipeline/stream, no external APIs."""
    from backend.data import demo_data

    program = demo_data.DEMO_PROGRAM.model_copy(deep=True)
    scale = 0.5 if fast else 1.0

    t0_all = time.perf_counter()
    fake_timings = {
        "context": 0.3,
        "novelty": 0.2,
        "literature": 1.1,
        "bioinformatics": 1.4,
        "protocol": 0.9,
        "reagents": 0.5,
        "timeline": 0.4,
        "funding": 0.8,
        "gtm": 0.6,
        "tamarind": 3.0,
    }

    def emit(name: str, build: dict) -> dict:
        return _sse(name, build)

    schedule: list[tuple[float, str, dict]] = [
        (0.0, "context", map_context(program)),
        (0.4, "novelty", map_novelty(program)),
        (1.0, "trace", make_trace(1, "DEMO", "load_fixture", "Seeded DEMO_PROGRAM", 12)),
        (1.2, "literature", map_literature(program)),
        (1.8, "bioinformatics", map_bioinformatics(program)),
        (2.2, "protocol", map_protocol(program)),
        (2.8, "reagents", map_reagents(program)),
        (3.3, "timeline", map_timeline(program)),
        (4.0, "funding", map_funding(program)),
        (4.5, "gtm", map_gtm(program)),
        (5.5, "tamarind", map_tamarind(program)),
        (5.6, "audit", map_audit(program)),
        (5.7, "key_finding", map_key_finding(program)),
        (6.2, "complete", {}),
    ]

    prev = 0.0
    for t, name, data in schedule:
        await asyncio.sleep(max(0.0, (t - prev) * scale))
        prev = t
        if name == "complete":
            program.refresh_computed_fields()
            data = map_complete(
                program,
                total_seconds=round(time.perf_counter() - t0_all, 2),
                timings=fake_timings,
            )
        yield _sse(name, data)
