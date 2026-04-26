"""
Tavily → Chroma protocol indexing: pay Tavily once, retrieve via RAG forever.

Runs targeted searches (protocol-focused domains) and upserts into the existing
``protocols`` collection on ``PRAxISRAG``. Dedupes by stable MD5 of canonical URL.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
from typing import Any

from backend.agents._env import env_str
from backend.rag.rag_engine import get_praxis_rag

logger = logging.getLogger(__name__)

# Domains Tavily can restrict to (hostnames only; paths are not supported by the API).
PROTOCOL_SEARCH_DOMAINS: list[str] = [
    "protocols.io",
    "bio-protocol.org",
    "nature.com",
    "pubmed.ncbi.nlm.nih.gov",
    "jove.com",
    "openwetware.org",
]

STARTUP_QUERIES: list[tuple[str, str]] = [
    ("FITC-dextran intestinal permeability mouse protocol", "fitc_assay"),
    ("broth microdilution MIC assay CLSI M07 protocol", "mic_assay"),
    ("CRISPR RNP knockout protocol HEK293", "crispr"),
    ("western blot protocol phospho-protein", "western_blot"),
    ("ELISA sandwich protocol reagents", "elisa"),
    ("MTT cell viability assay protocol", "cell_viability"),
    ("AlphaFold protein structure prediction workflow", "alphafold"),
    ("molecular docking AutoDock protocol", "docking"),
    ("cryopreservation HeLa cells trehalose DMSO", "cryopreservation"),
    ("electrochemical biosensor CRP antibody fabrication", "biosensor"),
]


def _tavily_search_sync(query: str, max_results: int, api_key: str) -> dict[str, Any]:
    from tavily import TavilyClient

    client = TavilyClient(api_key=api_key)
    try:
        return client.search(
            query,
            max_results=max_results,
            search_depth="advanced",
            include_domains=PROTOCOL_SEARCH_DOMAINS,
        )
    except TypeError:
        # Older client signatures without include_domains
        return client.search(query, max_results=max_results, search_depth="advanced")
    except Exception:
        # If domain filter is rejected by API, retry without it
        return client.search(query, max_results=max_results, search_depth="advanced")


def _protocol_doc_id(url: str) -> str:
    return hashlib.md5(url.strip().encode("utf-8"), usedforsecurity=False).hexdigest()


def _protocol_exists(rag: Any, doc_id: str) -> bool:
    try:
        got = rag.protocols.get(ids=[doc_id])
        ids = got.get("ids") or []
        return bool(ids) and doc_id in ids
    except Exception:
        return False


async def index_protocol_search(query: str, assay_type: str, max_results: int = 5) -> int:
    """
    Search Tavily for a protocol-oriented query and index hits into Chroma ``protocols``.

    Returns the number of **new** documents added (skips URLs already present).
    """
    api_key = env_str("TAVILY_API_KEY")
    if not api_key:
        logger.info("Tavily indexing skipped: TAVILY_API_KEY not set")
        return 0

    rag = get_praxis_rag()
    if rag is None:
        logger.warning("Tavily indexing skipped: PRAxISRAG unavailable")
        return 0

    resp = await asyncio.to_thread(_tavily_search_sync, query, max_results, api_key)
    rows = resp.get("results") or []
    indexed = 0

    for r in rows:
        url = (r.get("url") or "").strip()
        if not url:
            continue
        doc_id = _protocol_doc_id(url)
        if _protocol_exists(rag, doc_id):
            continue

        title = (r.get("title") or "").strip()
        content = (r.get("content") or r.get("raw_content") or "").strip()
        text = f"""PROTOCOL SOURCE: {title}
URL: {url}
CONTENT: {content}
"""
        try:
            embedding = rag.embed(text)
            score = r.get("score", 0)
            rag.protocols.add(
                ids=[doc_id],
                embeddings=[embedding],
                documents=[text],
                metadatas=[
                    {
                        "assay_type": assay_type,
                        "source": "tavily",
                        "url": url[:2000],
                        "title": title[:2000],
                        "score": str(score),
                    }
                ],
            )
            indexed += 1
        except Exception as exc:
            logger.debug("Skip indexing row %s: %s", url[:80], exc)
            continue

    return indexed


async def run_startup_indexing() -> int:
    """
    Index all ``STARTUP_QUERIES`` into RAG. Idempotent per URL (MD5 id).

    Safe to schedule on app startup: no-ops without Tavily/RAG.
    """
    total = 0
    for query, assay_type in STARTUP_QUERIES:
        try:
            n = await index_protocol_search(query, assay_type)
            if n > 0:
                logger.info("Indexed %s new Tavily protocol doc(s) for assay_type=%s", n, assay_type)
            total += n
        except Exception as exc:
            logger.warning("Startup Tavily index failed for %s: %s", assay_type, exc)
    logger.info("Tavily RAG startup indexing finished: %s new document(s)", total)
    return total
