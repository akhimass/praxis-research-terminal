"""
Claude tool definitions and executor for PRAXIS agentic loops (Anthropic tool use).

Agents call ``run_agentic_loop`` / ``run_agentic_claude_json`` instead of one-shot
``messages.create`` without tools so Claude can search, query RAG, score grants, etc.
"""

from __future__ import annotations

import asyncio
import json
import uuid
from pathlib import Path
from typing import Any

from backend.agents._env import env_str
from backend.agents._llm import LAST_MESSAGE_USAGE, parse_json_loose

from backend.models.research_program import ResearchProgram, Stage, TamarindOutput

# --- Tool definitions (Anthropic Messages API: tools=[{name, description, input_schema}]) ---

PRAXIS_AGENT_TOOLS: list[dict[str, Any]] = [
    {
        "name": "search_literature",
        "description": (
            "Search PubMed and protocol repositories for relevant papers and protocols. "
            "Use when you need to ground recommendations in published science."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "source": {
                    "type": "string",
                    "enum": ["pubmed", "protocols_io", "biorxiv", "all"],
                    "description": "Which source to bias the search toward (default: all)",
                },
                "max_results": {"type": "integer", "description": "Max results to return (default 5)"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "lookup_reagent",
        "description": (
            "Look up a specific reagent in the catalog database. "
            "Returns catalog number, vendor, price, and specifications."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "reagent_name": {"type": "string"},
                "vendor_preference": {
                    "type": "string",
                    "enum": ["sigma", "thermo", "abcam", "neb", "any"],
                    "description": "Vendor filter (default any)",
                },
            },
            "required": ["reagent_name"],
        },
    },
    {
        "name": "run_tamarind_job",
        "description": (
            "Submit a computational biology job to Tamarind Bio. "
            "Use for protein structure prediction, molecular docking, or binding affinity calculation."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "job_type": {"type": "string", "enum": ["alphafold", "docking", "proteinmpnn", "admet"]},
                "protein_sequence": {"type": "string"},
                "compound_smiles": {"type": "string"},
                "target_pdb_id": {"type": "string"},
            },
            "required": ["job_type"],
        },
    },
    {
        "name": "query_rag",
        "description": (
            "Query the PRAXIS knowledge base for relevant protocols, reagents, grants, "
            "or past scientist corrections."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "collection": {
                    "type": "string",
                    "enum": ["protocols", "reagents", "grants", "feedback"],
                },
                "n_results": {"type": "integer", "description": "Number of hits (default 3)"},
            },
            "required": ["query", "collection"],
        },
    },
    {
        "name": "calculate_budget",
        "description": (
            "Calculate the total budget for a list of reagents including quantities and current prices. "
            "Include unit_price (USD per unit) on each line when known."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "reagents": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "quantity": {"type": "number"},
                            "unit": {"type": "string"},
                            "unit_price": {"type": "number"},
                        },
                    },
                }
            },
            "required": ["reagents"],
        },
    },
    {
        "name": "score_grant_fit",
        "description": "Score how well the current research program fits a specific grant opportunity.",
        "input_schema": {
            "type": "object",
            "properties": {
                "grant_id": {"type": "string"},
                "program_stage": {"type": "string"},
                "disease_area": {"type": "string"},
                "evidence_available": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["grant_id", "program_stage"],
        },
    },
    {
        "name": "critique_plan",
        "description": (
            "Run a scientific critique pass on the generated plan. "
            "Identifies methodological errors, missing controls, unrealistic assumptions."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "plan_section": {
                    "type": "string",
                    "enum": ["protocol", "reagents", "budget", "timeline", "full"],
                },
                "plan_content": {"type": "string"},
            },
            "required": ["plan_section", "plan_content"],
        },
    },
    {
        "name": "emit_sse_event",
        "description": "Stream a result to the frontend. Call this after each major finding.",
        "input_schema": {
            "type": "object",
            "properties": {
                "event_type": {"type": "string"},
                "data": {"type": "object"},
            },
            "required": ["event_type", "data"],
        },
    },
]


def _grants_data_path() -> Path:
    return Path(__file__).resolve().parents[1] / "data" / "grants.json"


async def submit_tamarind_job(
    job_type: str,
    protein_sequence: str | None,
    compound_smiles: str | None,
    target_pdb_id: str | None = None,
) -> dict[str, Any]:
    """Placeholder Tamarind submission (replace with live API)."""
    await asyncio.sleep(0)
    return {
        "job_id": f"tam_{uuid.uuid4().hex[:10]}",
        "status": "submitted",
        "job_type": job_type,
        "target_pdb_id": target_pdb_id,
        "protein_sequence_provided": bool(protein_sequence and protein_sequence.strip()),
        "compound_smiles_provided": bool(compound_smiles and compound_smiles.strip()),
        "message": "Mock Tamarind job queued. Wire Tamarind REST client here.",
    }


async def run_critique_agent(plan_content: str, plan_section: str) -> list[dict[str, Any]]:
    """LLM pass returning structured audit flags."""
    api_key = env_str("ANTHROPIC_API_KEY")
    if not api_key:
        return [{"severity": "medium", "title": "Critique skipped", "detail": "ANTHROPIC_API_KEY not set"}]
    try:
        from anthropic import AsyncAnthropic
    except ImportError:  # pragma: no cover
        return [{"severity": "low", "title": "Critique unavailable", "detail": "anthropic package missing"}]

    system = (
        "You are a rigorous preclinical methods reviewer. "
        'Return JSON ONLY: {"flags":[{"severity":"high"|"medium"|"low","title":str,"detail":str}]} '
        "— concise, actionable items only."
    )
    user = f"Plan section: {plan_section}\n\n---\n{plan_content[:14000]}"
    model = env_str("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
    client = AsyncAnthropic(api_key=api_key)
    message = await client.messages.create(
        model=model,
        max_tokens=2048,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    parts: list[str] = []
    for block in message.content:
        if getattr(block, "type", None) == "text":
            parts.append(block.text)
    text = "\n".join(parts).strip()
    try:
        data = parse_json_loose(text)
        flags = data.get("flags") if isinstance(data, dict) else None
        if isinstance(flags, list):
            return [f for f in flags if isinstance(f, dict)]
    except Exception:
        pass
    return [{"severity": "low", "title": "Critique parse failed", "detail": text[:400]}]


async def tavily_search_literature(
    query: str,
    source: str,
    max_results: int,
) -> list[dict[str, Any]]:
    """Tavily-backed search with optional site bias."""
    from backend.agents.literature_agent import _tavily_search_raw

    max_results = max(1, min(int(max_results or 5), 15))
    q = query.strip()
    src = (source or "all").lower()
    if src == "pubmed":
        q = f"{q} (site:pubmed.ncbi.nlm.nih.gov OR site:ncbi.nlm.nih.gov)"
    elif src == "biorxiv":
        q = f"{q} site:biorxiv.org"
    elif src == "protocols_io":
        q = f"{q} site:protocols.io"
    rows = await _tavily_search_raw(q)
    return rows[:max_results]


def _resolve_rag(rag: Any | None) -> Any | None:
    if rag is not None:
        return rag
    try:
        from backend.rag.rag_engine import get_praxis_rag

        return get_praxis_rag()
    except Exception:
        return None


async def execute_tool(
    tool_name: str,
    tool_input: dict[str, Any],
    program: ResearchProgram,
    rag: Any | None,
) -> dict[str, Any]:
    """Execute a single Claude tool call; return JSON-serializable dict."""
    rag_engine = _resolve_rag(rag)

    if tool_name == "search_literature":
        src = tool_input.get("source") or "all"
        n = int(tool_input.get("max_results") or 5)
        results = await tavily_search_literature(tool_input["query"], str(src), n)
        return {"papers": results, "count": len(results), "source": src}

    if tool_name == "lookup_reagent":
        if not rag_engine:
            return {"error": "RAG unavailable"}
        rows = rag_engine.query_reagents([tool_input["reagent_name"]], n_results=5)
        pref = (tool_input.get("vendor_preference") or "any").lower()
        if pref != "any" and rows:
            rows = [
                r
                for r in rows
                if pref in (str(r.get("metadata", {}).get("vendor", "")).lower())
            ] or rag_engine.query_reagents([tool_input["reagent_name"]], n_results=1)
        if rows:
            top = rows[0]
            return {
                "protocol": top.get("protocol"),
                "metadata": top.get("metadata"),
                "similarity": top.get("similarity"),
            }
        return {"error": "not found"}

    if tool_name == "run_tamarind_job":
        jt = str(tool_input.get("job_type") or "")
        seq = tool_input.get("protein_sequence") or ""
        pdb_id = tool_input.get("target_pdb_id") or ""

        if jt == "alphafold":
            from backend.agents.tamarind_agent import run_tamarind_alphafold, tamarind_result_to_model

            pname = (program.target or "").strip() or "GyrA"
            if program.target in {"", "unknown_target"} and not seq.strip() and not pdb_id.strip():
                program.tamarind_results = TamarindOutput(
                    requested=False,
                    pdb_url=None,
                    confidence_score=None,
                    status="structure_unavailable",
                    note="Protein unknown; structure unavailable.",
                )
                return {"status": "skipped", "reason": "no target or sequence"}

            res = await run_tamarind_alphafold(
                pname,
                program.organism or "",
                "",
                [],
            )
            program.tamarind_results = tamarind_result_to_model(program, res)
            return {
                "job_name": res.get("job_name"),
                "status": "complete" if res.get("pdb_string") else "failed",
                "source": res.get("source"),
                "residue_count": res.get("residue_count"),
                "plddt_mean": res.get("plddt_mean"),
                "error": res.get("error"),
            }

        result = await submit_tamarind_job(
            jt,
            tool_input.get("protein_sequence"),
            tool_input.get("compound_smiles"),
            tool_input.get("target_pdb_id"),
        )
        note = result.get("message", "")
        if program.target in {"", "unknown_target"} and not seq.strip() and not pdb_id.strip():
            program.tamarind_results = TamarindOutput(
                requested=False,
                pdb_url=None,
                confidence_score=None,
                status="structure_unavailable",
                note="Protein unknown; structure unavailable.",
            )
        else:
            program.tamarind_results = TamarindOutput(
                requested=True,
                pdb_url=None,
                pdb_content=None,
                confidence_score=None,
                status="not_run",
                note=note,
            )
        return result

    if tool_name == "query_rag":
        if not rag_engine:
            return {"error": "RAG unavailable", "results": []}
        coll = tool_input["collection"]
        q = tool_input["query"]
        n = int(tool_input.get("n_results") or 3)
        assay = program.assay_type or "general"
        if coll == "protocols":
            results = rag_engine.query_protocols(q, assay, n_results=n)
            return {"collection": coll, "results": results}
        if coll == "reagents":
            results = rag_engine.query_reagents([q], n_results=n)
            return {"collection": coll, "results": results}
        if coll == "grants":
            results = rag_engine.query_grants(q, n_results=n)
            return {"collection": coll, "results": results}
        if coll == "feedback":
            results = rag_engine.query_feedback(assay, q, n_results=n)
            return {"collection": coll, "results": results}
        return {"error": f"unknown collection: {coll}", "results": []}

    if tool_name == "calculate_budget":
        reagents_in = tool_input.get("reagents") or []
        total = 0.0
        line_items: list[dict[str, Any]] = []
        for r in reagents_in:
            if not isinstance(r, dict):
                continue
            name = str(r.get("name", ""))
            qty = float(r.get("quantity") or 1)
            unit_price = float(r.get("unit_price") or 0)
            if unit_price <= 0 and rag_engine and name:
                hit = rag_engine.query_reagents([name], n_results=1)
                if hit:
                    meta = hit[0].get("metadata") or {}
                    try:
                        unit_price = float(meta.get("unit_price_usd") or 0)
                    except (TypeError, ValueError):
                        unit_price = 0.0
            line_usd = round(unit_price * qty, 2)
            total += line_usd
            row = dict(r)
            row["line_usd"] = line_usd
            if unit_price and "unit_price" not in row:
                row["unit_price"] = unit_price
            line_items.append(row)
        return {"total_usd": round(total, 2), "line_items": line_items}

    if tool_name == "score_grant_fit":
        from backend.agents.grant_scorer import score_grant

        grant_id = tool_input["grant_id"]
        path = _grants_data_path()
        if not path.exists():
            return {"error": "grants.json not found"}
        raw = json.loads(path.read_text(encoding="utf-8"))
        grant = next((g for g in raw if str(g.get("id")) == grant_id), None)
        if not grant:
            return {"error": f"grant not found: {grant_id}"}

        evidence = dict(program.evidence)
        for k in tool_input.get("evidence_available") or []:
            evidence[str(k)] = True
        stage_str = tool_input.get("program_stage") or program.stage.value
        try:
            st = Stage(str(stage_str))
        except ValueError:
            st = program.stage
        disease = tool_input.get("disease_area") or program.disease_context
        temp = program.model_copy(update={"evidence": evidence, "stage": st, "disease_context": disease})
        fit = score_grant(temp, grant)
        return {
            "grant_id": grant_id,
            "grant_name": grant.get("name"),
            "fit": fit.model_dump(),
        }

    if tool_name == "critique_plan":
        flags = await run_critique_agent(
            tool_input.get("plan_content", ""),
            tool_input.get("plan_section", "full"),
        )
        return {"flags": flags}

    if tool_name == "emit_sse_event":
        program.agent_tool_events.append(
            {"event_type": tool_input.get("event_type", "unknown"), "data": tool_input.get("data") or {}}
        )
        return {"ok": True, "queued": True}

    return {"error": f"Unknown tool: {tool_name}"}


def _assistant_blocks_to_api_dicts(content: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for block in content:
        btype = getattr(block, "type", None)
        if btype == "text":
            out.append({"type": "text", "text": getattr(block, "text", "")})
        elif btype == "tool_use":
            out.append(
                {
                    "type": "tool_use",
                    "id": block.id,
                    "name": block.name,
                    "input": block.input if isinstance(block.input, dict) else dict(block.input or {}),
                }
            )
    return out


def _final_text_from_message(message: Any) -> str:
    parts: list[str] = []
    for block in message.content:
        if getattr(block, "type", None) == "text":
            parts.append(getattr(block, "text", ""))
    return "\n".join(parts).strip()


def _apply_usage(message: Any) -> None:
    usage_obj = getattr(message, "usage", None)
    if usage_obj is None:
        return
    LAST_MESSAGE_USAGE["input"] = getattr(usage_obj, "input_tokens", None)
    LAST_MESSAGE_USAGE["output"] = getattr(usage_obj, "output_tokens", None)


async def run_agentic_loop(
    system_prompt: str,
    user_message: str,
    program: ResearchProgram,
    rag: Any | None,
    *,
    max_iterations: int = 10,
    max_tokens: int = 4096,
) -> str:
    """
    Run Claude with tool use until ``end_turn`` or max iterations.
    Returns the assistant's final plain-text (concatenated text blocks).
    """
    api_key = env_str("ANTHROPIC_API_KEY")
    if not api_key:
        return ""

    try:
        from anthropic import AsyncAnthropic
    except ImportError:  # pragma: no cover
        return ""

    model = env_str("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
    client = AsyncAnthropic(api_key=api_key)
    messages: list[dict[str, Any]] = [{"role": "user", "content": user_message}]
    last_text = ""

    for _ in range(max_iterations):
        message = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system_prompt,
            tools=PRAXIS_AGENT_TOOLS,
            messages=messages,
        )
        _apply_usage(message)
        last_text = _final_text_from_message(message) or last_text
        reason = getattr(message, "stop_reason", None) or ""

        if reason == "end_turn":
            return last_text

        if reason == "tool_use":
            messages.append({"role": "assistant", "content": _assistant_blocks_to_api_dicts(message.content)})
            tool_blocks = [b for b in message.content if getattr(b, "type", None) == "tool_use"]
            if not tool_blocks:
                return last_text

            async def _one(block: Any) -> dict[str, Any]:
                inp = block.input if isinstance(block.input, dict) else {}
                return await execute_tool(block.name, inp, program, rag)

            results = await asyncio.gather(*[_one(b) for b in tool_blocks])
            tool_result_blocks: list[dict[str, Any]] = []
            for block, result in zip(tool_blocks, results):
                tool_result_blocks.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result, default=str),
                    }
                )
            messages.append({"role": "user", "content": tool_result_blocks})
            continue

        # max_tokens, refusal, etc.
        return last_text

    return last_text


async def run_agentic_claude_json(
    *,
    system_prompt: str,
    user_message: str,
    program: ResearchProgram,
    rag: Any | None = None,
    max_iterations: int = 10,
    max_tokens: int = 4096,
) -> Any:
    """Agentic loop then parse JSON from the final assistant text."""
    text = await run_agentic_loop(
        system_prompt,
        user_message,
        program,
        rag,
        max_iterations=max_iterations,
        max_tokens=max_tokens,
    )
    if not text.strip():
        return {}
    try:
        return parse_json_loose(text)
    except Exception:
        return {}
