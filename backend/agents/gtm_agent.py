from __future__ import annotations

from backend.models.research_program import GTMPathway, ResearchProgram, Stage


IND_MONTHS_BY_STAGE = {
    Stage.discovery: 36,
    Stage.validation: 28,
    Stage.preclinical: 18,
    Stage.ind_enabling: 9,
}


async def gtm_agent(program: ResearchProgram) -> ResearchProgram:
    months = IND_MONTHS_BY_STAGE.get(program.stage, 30)
    ctx = program.disease_context or ""
    is_antimicrobial = any(
        k in ctx for k in ("infectious", "antibiotic", "AMR", "amr", "resistance")
    )
    program.gtm_pathway = GTMPathway(
        regulatory_pathway="505(b)(1) NDA with pre-IND consultation",
        qidp_eligible=is_antimicrobial,
        fast_track_eligible=program.stage in {Stage.preclinical, Stage.ind_enabling},
        breakthrough_eligible=bool(program.key_finding),
        market_size_notes=(
            "Initial SOM estimated from specialty indications; expand after Phase II signal."
        ),
        competitive_notes=(
            "Landscape includes incumbent small molecules and emerging biologics; "
            "differentiation likely driven by resistance profile and dosing convenience."
        ),
        estimated_time_to_ind_months=months,
    )
    program.estimated_time_to_ind_months = months
    program.refresh_computed_fields()
    return program
