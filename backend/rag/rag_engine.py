"""
RAG pipeline for PRAXIS: ChromaDB + SPECTER (sentence-transformers) embeddings.

Primary embeddings: ``allenai/specter`` (no API cost). Optional backends (Anthropic
``client.embeddings``, Voyage) can be added later via environment flags; this module
uses SentenceTransformer only for reproducibility and offline use.
"""

from __future__ import annotations

import logging
import threading
import uuid
from pathlib import Path
from typing import Any

from backend.rag.seed_data import FEEDBACK_SEEDS, GRANT_SEEDS, PROTOCOL_SEEDS, REAGENT_SEEDS

logger = logging.getLogger(__name__)

_RAG_LOCK = threading.Lock()
_rag_instance: PRAxISRAG | None = None
_rag_init_failed = False

# SentenceTransformer Hub ID (user-facing name "allenai-specter" maps here)
SPECTER_MODEL_ID = "allenai/specter"


def get_praxis_rag() -> PRAxISRAG | None:
    """Singleton RAG engine; returns None if dependencies or model load fail."""
    global _rag_instance, _rag_init_failed
    if _rag_init_failed:
        return None
    if _rag_instance is not None:
        return _rag_instance
    with _RAG_LOCK:
        if _rag_instance is not None:
            return _rag_instance
        if _rag_init_failed:
            return None
        try:
            _rag_instance = PRAxISRAG()
        except Exception as exc:  # pragma: no cover - env specific
            logger.warning("PRAxISRAG unavailable: %s", exc)
            _rag_init_failed = True
            return None
    return _rag_instance


class PRAxISRAG:
    """Chroma persistent store with four collections: protocols, reagents, grants, feedback."""

    def __init__(self, chroma_path: Path | None = None) -> None:
        import chromadb
        from sentence_transformers import SentenceTransformer

        if chroma_path is None:
            chroma_path = Path(__file__).resolve().parent / "chroma_db"

        chroma_path.mkdir(parents=True, exist_ok=True)

        self._chroma_path = chroma_path
        self.client = chromadb.PersistentClient(path=str(chroma_path))
        self.model = SentenceTransformer(SPECTER_MODEL_ID)

        meta = {"hnsw:space": "cosine"}
        self.protocols = self.client.get_or_create_collection(name="protocols", metadata=meta)
        self.reagents = self.client.get_or_create_collection(name="reagents", metadata=meta)
        self.grants = self.client.get_or_create_collection(name="grants", metadata=meta)
        self.feedback = self.client.get_or_create_collection(name="feedback", metadata=meta)

        self._seed_if_empty()

    def embed(self, text: str) -> list[float]:
        """Dense embedding (SPECTER); L2-normalized for cosine distance in Chroma."""
        vec = self.model.encode(text, normalize_embeddings=True)
        return vec.tolist()

    def _seed_if_empty(self) -> None:
        if self.protocols.count() == 0:
            self._bulk_add(self.protocols, PROTOCOL_SEEDS)
        if self.reagents.count() == 0:
            self._bulk_add(self.reagents, REAGENT_SEEDS)
        if self.grants.count() == 0:
            self._bulk_add(self.grants, GRANT_SEEDS)
        if self.feedback.count() == 0:
            self._bulk_add(self.feedback, FEEDBACK_SEEDS, id_key="id")

    def _bulk_add(self, coll: Any, rows: list[dict], id_key: str = "id") -> None:
        ids: list[str] = []
        documents: list[str] = []
        metadatas: list[dict[str, Any]] = []
        embeddings: list[list[float]] = []
        for row in rows:
            rid = str(row[id_key])
            doc = row["text"]
            meta = {k: _chroma_meta_value(v) for k, v in (row.get("metadata") or {}).items()}
            ids.append(rid)
            documents.append(doc)
            metadatas.append(meta)
            embeddings.append(self.embed(doc))
        if ids:
            coll.add(ids=ids, documents=documents, metadatas=metadatas, embeddings=embeddings)

    @staticmethod
    def _format_results(results: dict[str, Any]) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        docs = results.get("documents") or []
        metas = results.get("metadatas") or []
        dists = results.get("distances") or []
        if not docs or not docs[0]:
            return out
        for i, doc in enumerate(docs[0]):
            dist = (dists[0][i] if dists and dists[0] and i < len(dists[0]) else 0.0) or 0.0
            sim = max(0.0, min(1.0, 1.0 - float(dist)))
            meta = (metas[0][i] if metas and metas[0] and i < len(metas[0]) else {}) or {}
            out.append({"protocol": doc, "metadata": meta, "similarity": sim})
        return out

    def query_protocols(
        self,
        hypothesis: str,
        assay_type: str,
        n_results: int = 3,
    ) -> list[dict[str, Any]]:
        """Ranked protocols for hypothesis + assay type (grounding for protocol generation)."""
        query_text = f"{hypothesis} {assay_type} protocol method"
        embedding = self.embed(query_text)
        results = self.protocols.query(
            query_embeddings=[embedding],
            n_results=n_results,
            include=["documents", "metadatas", "distances"],
        )
        return [
            {
                "protocol": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "similarity": max(0.0, min(1.0, 1.0 - float(results["distances"][0][i]))),
            }
            for i in range(len(results["documents"][0]))
        ]

    def query_reagents(
        self,
        protocol_steps: list[str],
        n_results: int = 5,
    ) -> list[dict[str, Any]]:
        """Reagents relevant to early protocol steps."""
        query = " ".join(protocol_steps[:3]) if protocol_steps else "general laboratory reagents"
        embedding = self.embed(query)
        results = self.reagents.query(
            query_embeddings=[embedding],
            n_results=n_results,
            include=["documents", "metadatas", "distances"],
        )
        return self._format_results(results)

    def query_feedback(
        self,
        experiment_type: str,
        protocol_step: str,
        n_results: int = 5,
    ) -> list[dict[str, Any]]:
        """Past scientist corrections filtered by experiment type."""
        query = f"{experiment_type} {protocol_step} correction"
        embedding = self.embed(query)
        where: dict[str, Any] = {"experiment_type": experiment_type}
        try:
            results = self.feedback.query(
                query_embeddings=[embedding],
                n_results=n_results,
                include=["documents", "metadatas", "distances"],
                where=where,
            )
        except Exception as exc:
            logger.debug("feedback query with where failed, retrying without filter: %s", exc)
            results = self.feedback.query(
                query_embeddings=[embedding],
                n_results=n_results,
                include=["documents", "metadatas", "distances"],
            )
            formatted = self._format_results(results)
            return [r for r in formatted if r["metadata"].get("experiment_type") == experiment_type][
                :n_results
            ]

        return self._format_results(results)

    def query_grants(self, hypothesis: str, n_results: int = 5) -> list[dict[str, Any]]:
        """Funding opportunities semantically related to the hypothesis."""
        embedding = self.embed(f"{hypothesis} funding grant opportunity criteria")
        results = self.grants.query(
            query_embeddings=[embedding],
            n_results=n_results,
            include=["documents", "metadatas", "distances"],
        )
        return self._format_results(results)

    def add_correction(self, correction: dict[str, Any], experiment_type: str) -> None:
        """Embed a scientist correction into the feedback collection for future retrieval."""
        cid = str(correction.get("id") or uuid.uuid4().hex)
        text = (
            f"In {experiment_type} experiments, "
            f"{correction['section']}: "
            f"WRONG: {correction['original']} "
            f"CORRECT: {correction['correction']} "
            f"REASON: {correction['reason']}"
        )
        embedding = self.embed(text)
        self.feedback.add(
            ids=[f"feedback_{cid}"],
            embeddings=[embedding],
            documents=[text],
            metadatas=[
                {
                    "experiment_type": experiment_type,
                    "section": str(correction.get("section", "")),
                    "reviewer_role": str(correction.get("reviewer_role", "unknown")),
                    "severity": str(correction.get("severity", "medium")).lower(),
                }
            ],
        )


def _chroma_meta_value(v: Any) -> str | int | float | bool:
    if isinstance(v, (str, int, float, bool)):
        return v
    return str(v)


def reset_rag_singleton_for_tests() -> None:
    """Test helper: clear module singleton."""
    global _rag_instance, _rag_init_failed
    _rag_instance = None
    _rag_init_failed = False
