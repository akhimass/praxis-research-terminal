"""
Semantic Scholar API client for PRAXIS.

Rate limit policy: max 1 request/second when key is configured.
Implementation guarantees no parallel S2 calls process-wide and enforces a 1.1s
minimum gap between consecutive S2 HTTP requests.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx

from backend.agents._env import env_str

S2_BASE = "https://api.semanticscholar.org/graph/v1"
S2_RECO_BASE = "https://api.semanticscholar.org/recommendations/v1/papers"

_S2_SEMAPHORE = asyncio.Semaphore(1)
_S2_LAST_REQUEST_TIME = 0.0

PAPER_FIELDS = ",".join(
    [
        "paperId",
        "title",
        "authors",
        "year",
        "abstract",
        "tldr",
        "citationCount",
        "influentialCitationCount",
        "publicationTypes",
        "journal",
        "externalIds",
        "openAccessPdf",
    ]
)


def _s2_headers() -> dict[str, str]:
    key = env_str("SEMANTIC_SCHOLAR_API_KEY", "")
    return {"x-api-key": key} if key else {}


async def _s2_get(endpoint: str, params: dict[str, Any], timeout: float = 10.0) -> dict[str, Any] | None:
    """Single globally rate-limited S2 GET with a hard 1.1s minimum inter-request gap."""
    global _S2_LAST_REQUEST_TIME
    async with _S2_SEMAPHORE:
        now = time.monotonic()
        gap = now - _S2_LAST_REQUEST_TIME
        if gap < 1.1:
            await asyncio.sleep(1.1 - gap)

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.get(
                    f"{S2_BASE}{endpoint}",
                    params=params,
                    headers=_s2_headers(),
                )

            if resp.status_code == 200:
                return resp.json()
            if resp.status_code == 429:
                print("S2 rate limit hit — skipping request")
                await asyncio.sleep(2.0)
                return None
            if resp.status_code == 403:
                print("S2 API key invalid or missing")
                return None
            print(f"S2 API error: {resp.status_code}")
            return None
        except Exception as exc:  # pragma: no cover - network
            print(f"S2 request failed: {exc}")
            return None
        finally:
            # Count every outbound attempt toward global pacing (including failures/429s).
            _S2_LAST_REQUEST_TIME = time.monotonic()


def _format_paper(p: dict[str, Any]) -> dict[str, Any]:
    authors = p.get("authors", []) or []
    author_str = ", ".join(a.get("name", "") for a in authors[:3])
    if len(authors) > 3:
        author_str += " et al."

    external = p.get("externalIds", {}) or {}
    pmid = str(external.get("PubMed", "")) or str(p.get("paperId", ""))

    tldr_obj = p.get("tldr")
    tldr = tldr_obj.get("text", "") if isinstance(tldr_obj, dict) else ""

    pdf_obj = p.get("openAccessPdf")
    pdf_url = pdf_obj.get("url", "") if isinstance(pdf_obj, dict) else ""

    influential = int(p.get("influentialCitationCount", 0) or 0)
    citations = int(p.get("citationCount", 0) or 0)
    relevance = min(
        0.5 + (influential / max(citations, 1)) * 0.3 + min(citations / 1000, 0.2),
        0.99,
    )

    journal_obj = p.get("journal")
    journal = journal_obj.get("name", "") if isinstance(journal_obj, dict) else ""

    return {
        "pmid": pmid,
        "s2_paper_id": p.get("paperId", ""),
        "title": (p.get("title") or "")[:200],
        "authors": author_str,
        "journal": journal,
        "year": p.get("year") or 0,
        "abstract": (p.get("abstract") or "")[:2000],
        "tldr": tldr[:300],
        "citation_count": citations,
        "influential_citations": influential,
        "pdf_url": pdf_url,
        "relevance_score": round(relevance, 3),
        "source": "semantic_scholar",
        "quantitative_claims": [],
    }


async def search_papers(query: str, limit: int = 5, year_filter: str | None = None) -> list[dict[str, Any]]:
    params: dict[str, Any] = {
        "query": query,
        "fields": PAPER_FIELDS,
        "limit": min(limit, 10),
    }
    if year_filter:
        params["year"] = year_filter
    data = await _s2_get("/paper/search", params)
    if not data:
        return []
    papers = data.get("data", []) or []
    return [_format_paper(p) for p in papers if p.get("abstract")]


async def get_paper_details(paper_id: str) -> dict[str, Any] | None:
    data = await _s2_get(f"/paper/{paper_id}", {"fields": PAPER_FIELDS})
    if not data:
        return None
    return _format_paper(data)


async def get_recommendations(paper_id: str, limit: int = 3) -> list[dict[str, Any]]:
    global _S2_LAST_REQUEST_TIME
    try:
        async with _S2_SEMAPHORE:
            now = time.monotonic()
            gap = now - _S2_LAST_REQUEST_TIME
            if gap < 1.1:
                await asyncio.sleep(1.1 - gap)

            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(
                        S2_RECO_BASE,
                        params={
                            "positivePaperIds": paper_id,
                            "fields": PAPER_FIELDS,
                            "limit": limit,
                        },
                        headers=_s2_headers(),
                    )
            finally:
                # Count every outbound attempt toward global pacing (including failures/429s).
                _S2_LAST_REQUEST_TIME = time.monotonic()

            if resp.status_code == 200:
                papers = resp.json().get("recommendedPapers", []) or []
                return [_format_paper(p) for p in papers if p.get("abstract")]
    except Exception as exc:  # pragma: no cover - network
        print(f"S2 recommendations failed: {exc}")
    return []


async def search_protocol_papers(
    hypothesis: str,
    assay_type: str,
    organism: str = "",
    limit: int = 4,
) -> list[dict[str, Any]]:
    """PRAXIS protocol-focused S2 retrieval (2 sequential requests + dedupe)."""
    results: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    def add_papers(papers: list[dict[str, Any]]) -> None:
        for p in papers:
            pid = p.get("s2_paper_id") or p.get("pmid")
            if pid and pid not in seen_ids:
                seen_ids.add(pid)
                results.append(p)

    query1 = f"{assay_type} protocol method {organism}".strip()
    papers1 = await search_papers(query1, limit=limit, year_filter="2018-")
    add_papers(papers1)

    query2 = f"{hypothesis[:80]} {assay_type}".strip()
    papers2 = await search_papers(query2, limit=limit)
    add_papers(papers2)

    results.sort(
        key=lambda p: (
            p.get("influential_citations", 0) or 0,
            p.get("citation_count", 0) or 0,
        ),
        reverse=True,
    )
    return results[: limit + 2]
