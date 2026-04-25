from __future__ import annotations

import json
from pathlib import Path

from backend.agents.grant_scorer import score_grant
from backend.models.research_program import FundingOpp, ResearchProgram


def _data_path() -> Path:
    return Path(__file__).resolve().parents[1] / "data" / "grants.json"


def _representative_amount_usd(grant: dict) -> float:
    lo = float(grant["amount_min"])
    hi = float(grant["amount_max"])
    mid = (lo + hi) / 2.0
    if grant.get("currency") == "EUR":
        return round(mid * 1.08, 2)
    return mid


async def funding_agent(program: ResearchProgram) -> ResearchProgram:
    with _data_path().open("r", encoding="utf-8") as fp:
        grants = json.load(fp)

    scored: list[FundingOpp] = []
    for grant in grants:
        fit = score_grant(program, grant)
        rationale = (
            f"{grant.get('name')} fit score {fit.fit_score}/100 ({fit.fit_color_tier}). "
            f"Stage {fit.stage_score:.2f}, disease {fit.disease_score:.2f}, "
            f"evidence {fit.evidence_score:.2f}, technology {fit.technology_score:.2f}. "
            f"{grant.get('description', '')[:220]}"
        )
        scored.append(
            FundingOpp(
                grant_id=fit.grant_id,
                grant_name=str(grant["name"]),
                sponsor=str(grant["organization"]),
                amount_usd=_representative_amount_usd(grant),
                deadline=str(grant["deadline"]),
                stage_fit_score=fit.stage_score,
                disease_fit_score=fit.disease_score,
                evidence_fit_score=fit.evidence_score,
                technology_fit_score=fit.technology_score,
                overall_fit_score=fit.fit_score,
                fit_color_tier=fit.fit_color_tier,
                rationale=rationale,
                source_url=grant.get("url"),
                requirements_met=fit.requirements_met,
                requirements_missing=fit.requirements_missing,
            )
        )
    scored.sort(key=lambda g: g.overall_fit_score, reverse=True)
    program.funding_opportunities = scored[:12]
    program.refresh_computed_fields()
    return program
