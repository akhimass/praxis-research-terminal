from __future__ import annotations

import asyncio
import json
import logging
import os
from collections.abc import AsyncGenerator
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.agents._env import load_praxis_env
from backend.agents._llm import claude_text
from backend.agents.orchestrator import run_demo_pipeline, run_praxis_pipeline
from backend.data import feedback_store
from backend.data.feedback_store import get_relevant_corrections, get_stats, save_review
from backend.utils.budget_guard import get_usage_snapshot

load_praxis_env()

logger = logging.getLogger(__name__)

app = FastAPI(title="Praxis Backend", version="0.1.0")


@app.on_event("startup")
async def _startup_schedule_tavily_rag() -> None:
    """Background Tavily → Chroma protocol indexing (non-blocking server boot)."""
    s2_key = os.environ.get("SEMANTIC_SCHOLAR_API_KEY", "")
    print(f"Semantic Scholar: {'✓ API key set' if s2_key else '⚠ no key (shared rate limit)'}")
    enable_startup_indexing = os.environ.get("TAVILY_RAG_STARTUP_INDEX", "false").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    if not enable_startup_indexing:
        print("Tavily RAG startup indexing: disabled (set TAVILY_RAG_STARTUP_INDEX=true to enable)")
        app.state.tavily_rag_index_task = None
        return

    async def _run() -> None:
        try:
            from backend.rag.tavily_indexer import run_startup_indexing

            # Run in a worker thread so model init/embedding work never blocks the ASGI loop.
            await asyncio.to_thread(lambda: asyncio.run(run_startup_indexing()))
        except Exception:
            logger.exception("Tavily RAG startup indexing task crashed")

    app.state.tavily_rag_index_task = asyncio.create_task(_run())

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://praxis-research-terminal.vercel.app",
        "https://praxis-research.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache for program snapshots (e.g. future POST /program/snapshot). Unknown ids fall back to demo.
_program_by_id: dict[str, dict[str, Any]] = {}


def _grants_path() -> Path:
    return Path(__file__).resolve().parent / "data" / "grants.json"


def _load_grant(grant_id: str | None) -> dict[str, Any] | None:
    if not grant_id:
        return None
    raw = _grants_path().read_text(encoding="utf-8")
    for g in json.loads(raw):
        if g.get("id") == grant_id:
            return g
    return None


def _program_context(program_id: str | None) -> dict[str, Any]:
    if program_id and program_id in _program_by_id:
        return _program_by_id[program_id]
    from backend.data import demo_data

    return demo_data.DEMO_PROGRAM.model_dump()


async def _generate_aims_claude(grant_id: str | None, program_id: str | None) -> str:
    """NIH-style specific aims from grant + program context."""
    grant = _load_grant(grant_id)
    if grant is None:
        raw = json.loads(_grants_path().read_text(encoding="utf-8"))
        grant = raw[0] if raw else {"name": "Unknown grant", "description": ""}

    program = _program_context(program_id)

    system = (
        "You are an NIH grant-writing assistant. Write a Specific Aims section outline for the program "
        "below, matched to the grant opportunity. Use clear numbered aims (1–3), each with 2–3 measurable "
        "milestones. Reference resistance mechanism, compound series, and proposed assays when present. "
        "Output plain text with Markdown headings, no JSON."
    )
    user = json.dumps(
        {
            "grant": {
                "id": grant.get("id"),
                "name": grant.get("name"),
                "organization": grant.get("organization"),
                "description": grant.get("description"),
                "disease_areas": grant.get("disease_areas"),
                "evidence_required": grant.get("evidence_required"),
            },
            "program": {
                "hypothesis": program.get("hypothesis"),
                "target": program.get("target"),
                "organism": program.get("organism"),
                "assay_type": program.get("assay_type"),
                "disease_context": program.get("disease_context"),
                "stage": program.get("stage"),
                "key_finding": program.get("key_finding"),
            },
        },
        indent=2,
    )

    text = await claude_text(system=system, user=user, max_tokens=4096)
    if text:
        return text

    gname = grant.get("name", "Grant")
    hyp = program.get("hypothesis", "Program hypothesis")
    return (
        f"## Specific Aims (offline draft)\n\n"
        f"_Set `ANTHROPIC_API_KEY` for full Claude generation._\n\n"
        f"**Target opportunity:** {gname}\n\n"
        f"**Program:** {hyp}\n\n"
        f"### Aim 1 — Establish in vitro activity and resistance context\n"
        f"Complete MIC and target engagement assays; compare to reference controls.\n\n"
        f"### Aim 2 — Define mechanism and selectivity\n"
        f"Enzyme/biochemical validation and counterscreens for off-target risk.\n\n"
        f"### Aim 3 — Enable IND-enabling path\n"
        f"ADME/PK gaps, tox strategy, and regulatory milestones aligned to the solicitation.\n"
    )


class HypothesisRequest(BaseModel):
    hypothesis: str


class ModalScriptRequest(BaseModel):
    """Body for ``POST /modal/run-script`` — PRAXIS-generated analysis code + optional input files."""

    code: str = ""
    data: dict[str, Any] = Field(default_factory=dict)


async def _sse_stream(hypothesis: str) -> AsyncGenerator[str, None]:
    async for evt in run_praxis_pipeline(hypothesis):
        yield f"event: {evt['event']}\n"
        yield f"data: {json.dumps(evt['payload'])}\n\n"


async def _sse_demo(*, fast: bool) -> AsyncGenerator[str, None]:
    async for evt in run_demo_pipeline(fast=fast):
        yield f"event: {evt['event']}\n"
        yield f"data: {json.dumps(evt['payload'])}\n\n"


@app.get("/")
async def root() -> dict[str, str]:
    return {"service": "PRAXIS API", "status": "running", "version": "1.0.0"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/usage")
async def usage() -> dict[str, Any]:
    """Anthropic session token spend estimate for this worker (see ``budget_guard``)."""
    return get_usage_snapshot()


@app.get("/tamarind/status")
async def tamarind_status() -> dict[str, Any]:
    """Jobs charged against the local Tamarind cache cap (see ``tamarind_cache.json``)."""
    from backend.agents.tamarind_agent import CACHE_PATH, _load_cache
    from backend.agents._env import env_str

    cache = _load_cache() if CACHE_PATH.exists() else {}
    jobs_used = int(cache.get("__jobs_used__", 0) or 0)
    max_jobs = int(env_str("TAMARIND_MAX_JOBS_PER_CACHE", "10") or "10")
    return {
        "jobs_used": jobs_used,
        "jobs_remaining": max(0, max_jobs - jobs_used),
        "cache_path": str(CACHE_PATH),
    }


@app.get("/tamarind/test")
async def test_tamarind() -> dict[str, Any]:
    """Smoke-test Tamarind / RCSB structure path (uses demo ``GyrA`` sequence when no API key)."""
    from backend.agents.tamarind_agent import run_tamarind_alphafold

    result = await run_tamarind_alphafold("GyrA", "E. coli")
    return {
        "source": result.get("source"),
        "has_pdb": result.get("pdb_string") is not None,
        "residues": result.get("residue_count"),
        "confidence": result.get("confidence_score"),
        "plddt_mean": result.get("plddt_mean"),
        "error": result.get("error"),
    }


@app.post("/pipeline/stream")
async def pipeline_stream(payload: HypothesisRequest) -> StreamingResponse:
    return StreamingResponse(_sse_stream(payload.hypothesis), media_type="text/event-stream")


@app.get("/demo")
async def demo_stream(speed: str | None = Query(default=None)) -> StreamingResponse:
    fast = (speed or "").lower() == "fast"
    return StreamingResponse(_sse_demo(fast=fast), media_type="text/event-stream")


@app.post("/demo/preload")
async def demo_preload() -> dict:
    from backend.data import demo_data

    return demo_data.DEMO_PROGRAM.model_dump()


@app.post("/review/submit")
async def submit_review(review: dict[str, Any]) -> dict:
    """Accept scientist review from the drawer (dict for flexible frontend payloads)."""
    feedback_store.init_db()
    program_id = str(review.get("program_id") or "unknown")
    success = save_review(program_id=program_id, review=review)
    stats = get_stats()
    return {
        "saved": success,
        "stats": stats,
        "message": "Review saved. Next plan will incorporate your corrections.",
    }


@app.get("/review/stats")
async def review_stats() -> dict:
    feedback_store.init_db()
    return get_stats()


@app.get("/review/corrections/{experiment_type}")
async def get_corrections(experiment_type: str) -> dict:
    feedback_store.init_db()
    return {
        "experiment_type": experiment_type,
        "corrections": get_relevant_corrections(experiment_type),
    }


@app.get("/review/feedback/{experiment_type}")
async def review_feedback(experiment_type: str) -> dict:
    """Legacy alias: same data as /review/corrections/{experiment_type} under `items`."""
    feedback_store.init_db()
    feedback_store.seed_demo_corrections()
    rows = feedback_store.list_feedback_by_experiment(experiment_type)
    return {"experiment_type": experiment_type, "items": rows}


@app.post("/modal/run-script")
async def run_script_on_modal(request: ModalScriptRequest) -> dict[str, Any]:
    """
    Execute a generated analysis script on Modal (CPU image, sandboxed temp dir).
    Frontend \"RUN IN CLOUD\" can POST ``{ \"code\": \"...\", \"data\": { \"foo.csv\": \"...\" } }``.
    """
    try:
        from backend.modal_runner import execute_analysis_script
    except ImportError as exc:
        return {"success": False, "error": f"modal_runner unavailable: {exc}"}

    try:
        import modal

        def _call() -> Any:
            with modal.enable_output():
                return execute_analysis_script.remote(
                    script_code=request.code,
                    input_data=request.data,
                )

        result = await asyncio.to_thread(_call)
        return {"success": True, "result": result}
    except Exception as exc:  # pragma: no cover - Modal auth / deploy
        return {"success": False, "error": str(exc)}


@app.post("/modal/run-scrna")
async def run_scrna_on_modal(
    file: UploadFile = File(..., description="AnnData .h5ad file"),
    resolution: float = Query(0.5, ge=0.1, le=3.0, description="Leiden resolution"),
) -> dict[str, Any]:
    """
    Run scRNA-seq preprocessing + UMAP + Leiden on a Modal T4.
    Upload ``.h5ad`` as multipart form field ``file``.
    """
    try:
        from backend.modal_runner import run_scrna_pipeline
    except ImportError as exc:
        return {"success": False, "error": f"modal_runner unavailable: {exc}"}

    try:
        import modal

        raw = await file.read()

        def _call() -> Any:
            with modal.enable_output():
                return run_scrna_pipeline.remote(raw, {"resolution": resolution})

        result = await asyncio.to_thread(_call)
        if isinstance(result, dict):
            result.setdefault("success", True)
        return result if isinstance(result, dict) else {"success": True, "result": result}
    except Exception as exc:  # pragma: no cover
        return {"success": False, "error": str(exc)}


@app.post("/funding/generate-aims")
async def generate_aims(request: dict[str, Any]) -> dict:
    """
    Generate a Specific Aims outline for a grant application.
    Used by the funding tab [GENERATE SPECIFIC AIMS] button.
    """
    grant_id = request.get("grant_id")
    if isinstance(grant_id, str):
        gid: str | None = grant_id
    else:
        gid = str(grant_id) if grant_id is not None else None

    program_id = request.get("program_id")
    pid: str | None = str(program_id) if program_id is not None else None

    aims_text = await _generate_aims_claude(gid, pid)

    return {
        "grant_id": gid,
        "aims_text": aims_text,
        "sections": [
            "Background & Significance",
            "Innovation",
            "Approach — Aim 1",
            "Approach — Aim 2",
            "Approach — Aim 3",
        ],
    }
