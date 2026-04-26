"""SQLite-backed review + few-shot correction store (stdlib only)."""

from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).parent / "praxis_feedback.db"


def _push_section_reviews_to_rag(review: dict[str, Any]) -> None:
    """Best-effort: embed 'wrong' corrections into Chroma feedback collection."""
    try:
        from backend.rag.rag_engine import get_praxis_rag
    except Exception:
        return
    rag = get_praxis_rag()
    if rag is None:
        return
    experiment_type = str(review.get("experiment_type") or "unknown")
    for sr in review.get("section_reviews", []) or []:
        if not isinstance(sr, dict):
            continue
        if str(sr.get("rating", "")).lower() != "wrong":
            continue
        correction_text = (sr.get("correction") or "").strip()
        if not correction_text:
            continue
        try:
            rag.add_correction(
                {
                    "id": uuid.uuid4().hex,
                    "section": str(sr.get("section", "")),
                    "original": str(sr.get("original_text", "")),
                    "correction": correction_text,
                    "reason": str(sr.get("reason", "")),
                    "reviewer_role": str(review.get("reviewer_role", "unknown")),
                    "severity": str(sr.get("severity", "medium")),
                },
                experiment_type,
            )
        except Exception:
            pass


def init_db() -> None:
    """Create tables if not exist. Run on startup."""
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS section_reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                program_id TEXT,
                experiment_type TEXT,
                section TEXT,
                rating TEXT,
                original_text TEXT,
                correction TEXT,
                reason TEXT,
                reviewer_role TEXT,
                created_at TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS program_reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                program_id TEXT UNIQUE,
                overall_rating INTEGER,
                would_use INTEGER,
                reviewer_role TEXT,
                created_at TEXT
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def save_review(program_id: str, review: dict[str, Any]) -> bool:
    """Save full program review. Returns True on success."""
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            INSERT OR REPLACE INTO program_reviews
            (program_id, overall_rating, would_use, reviewer_role, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                program_id,
                review.get("overall_rating", 0),
                1 if review.get("would_use") else 0,
                review.get("reviewer_role", "unknown"),
                datetime.now().isoformat(),
            ),
        )

        for sr in review.get("section_reviews", []) or []:
            if not isinstance(sr, dict):
                continue
            rating = sr.get("rating", "")
            if not isinstance(rating, str):
                rating = str(rating)
            conn.execute(
                """
                INSERT INTO section_reviews
                (program_id, experiment_type, section, rating,
                 original_text, correction, reason, reviewer_role, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    program_id,
                    review.get("experiment_type", "unknown"),
                    sr.get("section"),
                    rating,
                    sr.get("original_text", ""),
                    sr.get("correction", ""),
                    sr.get("reason", ""),
                    review.get("reviewer_role", "unknown"),
                    datetime.now().isoformat(),
                ),
            )

        conn.commit()

        _push_section_reviews_to_rag(review)
        return True
    except Exception as e:  # pragma: no cover
        print(f"Review save failed: {e}")
        return False
    finally:
        conn.close()


def get_relevant_corrections(experiment_type: str, limit: int = 5) -> list[dict[str, Any]]:
    """
    Fetch past corrections for this experiment type.
    Used for few-shot injection into Claude prompts.
    """
    init_db()
    conn = sqlite3.connect(DB_PATH)
    try:
        rows = conn.execute(
            """
            SELECT section, original_text, correction, reason, reviewer_role
            FROM section_reviews
            WHERE experiment_type = ?
              AND rating = 'wrong'
              AND correction != ''
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (experiment_type, limit),
        ).fetchall()
    finally:
        conn.close()

    return [
        {
            "section": r[0],
            "original": r[1],
            "correction": r[2],
            "reason": r[3],
            "reviewer_role": r[4],
        }
        for r in rows
    ]


def get_stats() -> dict[str, Any]:
    """Stats for the review loop indicator."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    try:
        total = conn.execute("SELECT COUNT(*) FROM program_reviews").fetchone()[0]
        avg = conn.execute("SELECT AVG(overall_rating) FROM program_reviews").fetchone()[0] or 0
        corrections = conn.execute(
            "SELECT COUNT(*) FROM section_reviews WHERE rating='wrong'"
        ).fetchone()[0]
    finally:
        conn.close()
    return {
        "total_reviews": total,
        "avg_rating": round(float(avg), 1) if avg is not None else 0.0,
        "total_corrections": corrections,
    }


def seed_demo_corrections() -> None:
    """
    Seed 3 pre-written expert corrections so the learning loop
    works immediately for judges without waiting for real input.
    Only seeds if table is empty.
    """
    init_db()
    conn = sqlite3.connect(DB_PATH)
    try:
        existing = conn.execute("SELECT COUNT(*) FROM section_reviews").fetchone()[0]
        if existing > 0:
            return

        demo_corrections = [
            {
                "program_id": "demo_seed_001",
                "experiment_type": "mic_assay",
                "section": "protocol_step_2",
                "rating": "wrong",
                "original_text": "Prepare inoculum at 1×10⁶ CFU/mL in MH broth",
                "correction": "Prepare inoculum at 5×10⁵ CFU/mL in MH broth",
                "reason": (
                    "CLSI M07 standard specifies 5×10⁵ CFU/mL for broth microdilution. "
                    "1×10⁶ will give artificially elevated MIC values."
                ),
                "reviewer_role": "PI",
            },
            {
                "program_id": "demo_seed_001",
                "experiment_type": "mic_assay",
                "section": "reagent_dmso",
                "rating": "wrong",
                "original_text": "DMSO vehicle control at 2% v/v final concentration",
                "correction": "DMSO vehicle control must not exceed 0.5% v/v",
                "reason": (
                    "DMSO >1% inhibits bacterial growth directly, confounding MIC determination. "
                    "CLSI recommends ≤0.5%."
                ),
                "reviewer_role": "PI",
            },
            {
                "program_id": "demo_seed_002",
                "experiment_type": "western_blot",
                "section": "protocol_step_5",
                "rating": "wrong",
                "original_text": "Block membrane with 5% non-fat milk in TBST for 1 hour",
                "correction": "Block with 5% BSA in TBST for phospho-antibodies. Use milk only for non-phospho targets.",
                "reason": (
                    "Milk contains casein, a phosphoprotein. It competes with phospho-epitopes and kills "
                    "signal for phospho-antibodies."
                ),
                "reviewer_role": "postdoc",
            },
        ]

        for c in demo_corrections:
            conn.execute(
                """
                INSERT INTO section_reviews
                (program_id, experiment_type, section, rating,
                 original_text, correction, reason, reviewer_role, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    c["program_id"],
                    c["experiment_type"],
                    c["section"],
                    c["rating"],
                    c["original_text"],
                    c["correction"],
                    c["reason"],
                    c["reviewer_role"],
                    datetime.now().isoformat(),
                ),
            )

        conn.commit()
        print("✓ Seeded 3 demo expert corrections")
    finally:
        conn.close()


# --- Extras used by orchestrator / protocol / reagent / main (legacy API) ---


def get_similar_feedback(
    experiment_type: str,
    target: str = "*",
    assay_type: str = "*",
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Alias for `get_relevant_corrections` (orchestrator); target/assay reserved for future use."""
    _ = target, assay_type
    return get_relevant_corrections(experiment_type, limit=limit)


def format_few_shot(corrections: list[dict[str, Any]], experiment_type: str) -> str:
    if not corrections:
        return ""
    lines = [f"Previous scientist corrections for {experiment_type}:"]
    for c in corrections:
        lines.append(
            f"- {c.get('section')}: [{c.get('original', '')}] → [{c.get('correction', '')}] "
            f"(reason: {c.get('reason', '')})"
        )
    lines.append("Use these corrections to improve this plan.")
    return "\n".join(lines)


def list_feedback_by_experiment(experiment_type: str) -> list[dict[str, Any]]:
    """List recent `section_reviews` rows (used by `GET /review/feedback/...`)."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            SELECT id, program_id, experiment_type, section, rating, original_text,
                   correction, reason, reviewer_role, created_at
            FROM section_reviews
            WHERE experiment_type = ?
            ORDER BY id DESC
            LIMIT 25
            """,
            (experiment_type,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


init_db()
seed_demo_corrections()
