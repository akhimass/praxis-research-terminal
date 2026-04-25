from __future__ import annotations

"""Review / feedback loop hooks (optional LLM enrichment can live here later)."""

from backend.models.research_program import ProgramReview


def summarize_review(review: ProgramReview) -> str:
    n = len(review.section_reviews)
    return f"Program {review.program_id}: {n} section notes, overall {review.overall_rating}/5."
