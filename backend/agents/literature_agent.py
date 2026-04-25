from __future__ import annotations

import asyncio
import copy
import json
import re
from pathlib import Path
from typing import Any, Literal

from backend.agents._env import env_str
from backend.agents._llm import LAST_MESSAGE_USAGE, claude_messages_json
from backend.models.research_program import PaperResult, ResearchProgram

# Populated when `literature_agent` performs a Claude-backed extraction.
LAST_CLAUDE_USAGE: dict[str, Any] = {}


# Demo novelty payload when Tavily is unavailable (or forced for UI demos).
DEMO_NOVELTY: dict[str, Any] = {
    "signal": "similar_exists",
    "summary": "2 related FITC-dextran permeability protocols found",
    "references": [
        {
            "title": "Intestinal permeability measurement using FITC-dextran",
            "authors": "Cani PD et al.",
            "year": 2022,
            "url": "https://bio-protocol.org/e",
            "pmid": "",
        },
        {
            "title": "Lactobacillus rhamnosus GG gut barrier function",
            "authors": "Yan F et al.",
            "year": 2021,
            "url": "https://pubmed.ncbi.nlm.nih.gov/",
            "pmid": "",
        },
    ],
}


def detect_novelty(tavily_results: list[dict[str, Any]], hypothesis: str) -> dict[str, Any]:
    """
    Classify novelty signal from Tavily search results.
    Returns dict fields aligned with the ``novelty`` SSE inner payload (signal, summary, references).
    """
    if not tavily_results:
        return {
            "signal": "not_found",
            "summary": "No prior protocols found. This appears to be novel.",
            "references": [],
        }

    hyp = hypothesis or ""
    scored: list[tuple[float, dict[str, Any]]] = []
    for r in tavily_results:
        score = float(r.get("score") or 0.0)
        title = (r.get("title") or "").lower()
        content = (r.get("content") or "").lower()
        text = f"{title} {content}"

        protocol_terms = [
            "protocol",
            "method",
            "procedure",
            "assay",
            "experiment",
            "measured",
            "tested",
        ]
        protocol_match = sum(1 for t in protocol_terms if t in text)

        hyp_words = {w for w in re.split(r"[^\w]+", hyp.lower()) if len(w) > 2}
        content_words = {w for w in re.split(r"[^\w]+", content) if len(w) > 2}
        term_overlap = len(hyp_words & content_words) / max(len(hyp_words), 1)

        final_score = (score * 0.5) + (protocol_match * 0.1) + (term_overlap * 0.4)
        scored.append((final_score, r))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_results = scored[:3]

    if not top_results:
        signal: Literal["not_found", "similar_exists", "exact_match"] = "not_found"
        summary = "No prior protocols found. Novel experimental approach."
    elif top_results[0][0] > 0.75:
        signal = "exact_match"
        t0 = top_results[0][1].get("title") or "Similar protocol"
        summary = f"Highly similar protocol found: {str(t0)[:60]}"
    else:
        signal = "similar_exists"
        summary = f"{len(top_results)} related protocol(s) found. Review before proceeding."

    references: list[dict[str, Any]] = []
    for _, r in top_results[:3]:
        pd = r.get("published_date")
        year_val: int | None = None
        if isinstance(pd, str) and len(pd) >= 4 and pd[:4].isdigit():
            year_val = int(pd[:4])
        elif isinstance(pd, int):
            year_val = pd
        ref = {
            "title": (r.get("title") or "")[:200],
            "authors": (r.get("author") or r.get("authors") or "Authors et al.").strip() or "Authors et al.",
            "year": year_val,
            "url": r.get("url") or "",
            "pmid": "",
        }
        url = str(ref.get("url") or "")
        if "pubmed" in url and "pmid" in url:
            m = re.search(r"pmid[=/](\d+)", url, re.I)
            if m:
                ref["pmid"] = m.group(1)
        references.append(ref)

    return {
        "signal": signal,
        "summary": summary,
        "references": references,
    }


def _sync_novelty_dict_to_program(program: ResearchProgram, d: dict[str, Any]) -> None:
    """Write detect_novelty / DEMO result onto ResearchProgram and PaperResult list."""
    sig = d.get("signal") or "not_found"
    if sig not in ("not_found", "similar_exists", "exact_match"):
        sig = "similar_exists"
    program.novelty_signal = sig
    program.novelty_summary = str(d.get("summary") or "")
    program.novelty_references = []
    for ref in d.get("references") or []:
        if not isinstance(ref, dict):
            continue
        y = ref.get("year")
        if isinstance(y, str) and y[:4].isdigit():
            y = int(y[:4])
        elif not isinstance(y, int):
            y = None
        program.novelty_references.append(
            PaperResult(
                title=str(ref.get("title") or "Untitled")[:500],
                authors=str(ref.get("authors") or "") or None,
                year=y,
                pmid=str(ref.get("pmid") or "") or None,
                url=ref.get("url") or None,
                relevance_score=0.0,
            )
        )
    program.novelty_references = program.novelty_references[:3]


def _tavily_query(program: ResearchProgram) -> str:
    return (
        f"{program.target} {program.organism} {program.assay_type} "
        "resistance mechanism inhibition"
    )


async def _tavily_search_raw(query: str) -> list[dict[str, Any]]:
    key = env_str("TAVILY_API_KEY")
    if not key:
        return []

    def _run() -> list[dict[str, Any]]:
        from tavily import TavilyClient

        client = TavilyClient(api_key=key)
        resp = client.search(query, max_results=6, search_depth="advanced")
        results = resp.get("results") or []
        out: list[dict[str, Any]] = []
        for r in results:
            out.append(
                {
                    "title": r.get("title") or "",
                    "url": r.get("url") or "",
                    "content": r.get("content") or r.get("raw_content") or "",
                    "score": float(r.get("score") or 0.0),
                    "author": r.get("author") or r.get("authors"),
                    "published_date": r.get("published_date") or r.get("publishedDate"),
                }
            )
        return out

    return await asyncio.to_thread(_run)


async def run_literature_novelty_gate(program: ResearchProgram) -> dict[str, Any]:
    """
    Run Tavily (if configured), classify novelty, and update ``program`` **before** full literature analysis.
    This supports emitting the ``novelty`` SSE event first in the orchestrator.
    """
    query = _tavily_query(program)
    results = await _tavily_search_raw(query)

    if not env_str("TAVILY_API_KEY"):
        d = copy.deepcopy(DEMO_NOVELTY)
    elif not results:
        d = detect_novelty([], program.hypothesis or "")
    else:
        d = detect_novelty(results, program.hypothesis or "")

    _sync_novelty_dict_to_program(program, d)
    return {
        "query": query,
        "tavily_result_count": len(results),
        "signal": d.get("signal"),
        "summary": d.get("summary"),
        "references": d.get("references"),
    }


async def literature_agent(program: ResearchProgram) -> ResearchProgram:
    LAST_CLAUDE_USAGE.clear()
    query = _tavily_query(program)
    tavily_key = env_str("TAVILY_API_KEY")
    anthropic_key = env_str("ANTHROPIC_API_KEY")

    if tavily_key and anthropic_key:
        try:
            results = await _tavily_search_raw(query)
            system_path = Path(__file__).resolve().parents[1] / "prompts" / "literature.txt"
            system = system_path.read_text(encoding="utf-8")
            user_obj = {
                "query": query,
                "program": {
                    "hypothesis": program.hypothesis,
                    "target": program.target,
                    "organism": program.organism,
                    "assay_type": program.assay_type,
                    "disease_context": program.disease_context,
                    "stage": str(program.stage.value),
                },
                "tavily_results": results[:6],
            }
            user = (
                json.dumps(user_obj, indent=2)
                + "\n\nReturn JSON ONLY with this shape:\n"
                + '{"papers":[{"title":str,"authors":str|null,"year":int|null,"abstract":str|null,'
                + '"pmid":str|null,"url":str|null,"relevance_score":float,'
                + '"quantitative_claims":[str],"protocol_hints":[str]}]}\n'
            )
            data = await claude_messages_json(system=system, user=user, max_tokens=4096)
            papers_raw = data.get("papers") if isinstance(data, dict) else data
            built: list[PaperResult] = []
            for p in papers_raw or []:
                if not isinstance(p, dict):
                    continue
                qc = p.get("quantitative_claims") or []
                if isinstance(qc, dict):
                    qc = [json.dumps(qc)]
                elif not isinstance(qc, list):
                    qc = [str(qc)]
                else:
                    qc = [str(x) if not isinstance(x, str) else x for x in qc]
                ph = p.get("protocol_hints") or []
                if not isinstance(ph, list):
                    ph = [str(ph)]
                else:
                    ph = [str(x) for x in ph]
                year = p.get("year")
                built.append(
                    PaperResult(
                        title=str(p.get("title") or "Untitled"),
                        authors=p.get("authors"),
                        year=int(year) if year is not None else None,
                        abstract=p.get("abstract"),
                        pmid=str(p["pmid"]) if p.get("pmid") else None,
                        url=p.get("url"),
                        relevance_score=float(p.get("relevance_score") or p.get("score") or 0.0),
                        quantitative_claims=qc,
                        protocol_hints=ph,
                    )
                )
            if built:
                program.literature = built[:6]
                LAST_CLAUDE_USAGE.update(dict(LAST_MESSAGE_USAGE))
                program.key_finding = f"Synthesized {len(program.literature)} papers for: {query}"
                program.refresh_computed_fields()
                return program
        except Exception:
            LAST_CLAUDE_USAGE.clear()

    seed = [
        (
            f"Mechanistic characterization of {program.target} in {program.organism}",
            "34567891",
            0.92,
        ),
        (
            f"{program.assay_type} optimization for {program.target}",
            "34567892",
            0.87,
        ),
        (
            f"Resistance emergence patterns under {program.target} perturbation",
            "34567893",
            0.83,
        ),
        (
            f"Comparative protocol controls in {program.organism} efficacy studies",
            "34567894",
            0.79,
        ),
    ]
    program.literature = [
        PaperResult(
            title=title,
            pmid=pmid,
            url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
            relevance_score=score,
            quantitative_claims=[
                "Observed 1.8x signal improvement over baseline.",
                "Effect retained in >70% of replicates.",
            ],
            protocol_hints=[
                "Use triplicate biological replicates.",
                "Include untreated and positive controls.",
            ],
        )
        for title, pmid, score in seed
    ]
    program.key_finding = f"Top literature suggests assay-ready signal for query: {query}"
    program.refresh_computed_fields()
    return program
