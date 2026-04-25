from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from backend.models.research_program import ResearchProgram, Stage


class FitResult(BaseModel):
    grant_id: str
    fit_score: float = Field(ge=0, le=100)
    stage_score: float = Field(ge=0, le=1)
    disease_score: float = Field(ge=0, le=1)
    evidence_score: float = Field(ge=0, le=1)
    technology_score: float = Field(ge=0, le=1)
    requirements_met: list[str] = Field(default_factory=list)
    requirements_missing: list[str] = Field(default_factory=list)
    fit_color_tier: Literal["green", "amber", "blue"] = "blue"


_STAGE_ORDER: dict[Stage, int] = {
    Stage.discovery: 0,
    Stage.validation: 1,
    Stage.preclinical: 2,
    Stage.ind_enabling: 3,
}

# Map grant stage_fit tokens to coarse pipeline stage index.
_TOKEN_TO_ORDER: dict[str, int] = {
    "hit_discovery": 0,
    "feasibility_prototype": 0,
    "pilot_study": 0,
    "high_risk_demonstration": 0,
    "mechanistic_depth": 1,
    "validation": 1,
    "target_validation": 1,
    "pilot_scale": 1,
    "pilot_intervention": 1,
    "rapid_pivot": 1,
    "lead_optimization": 2,
    "preclinical": 2,
    "in_vivo_poC": 2,
    "productization": 2,
    "patient_centered": 2,
    "IND_enabling": 3,
    "clinical_translation": 3,
    "glp_tox": 3,
    "implementation": 3,
}


def _stage_indices_for_grant(stage_fit: list[str]) -> set[int]:
    out: set[int] = set()
    for tok in stage_fit or []:
        if tok in _TOKEN_TO_ORDER:
            out.add(_TOKEN_TO_ORDER[tok])
    return out


def stage_score(program: ResearchProgram, grant: dict) -> float:
    p_idx = _STAGE_ORDER.get(program.stage, 1)
    grant_idx = _stage_indices_for_grant(list(grant.get("stage_fit") or []))
    if not grant_idx:
        return 0.0
    if p_idx in grant_idx:
        return 1.0
    dist = min(abs(p_idx - g) for g in grant_idx)
    if dist == 1:
        return 0.6
    return 0.0


def disease_score(program: ResearchProgram, grant: dict) -> float:
    ctx = (program.disease_context or "").lower().strip()
    areas = {str(a).lower() for a in (grant.get("disease_areas") or [])}
    fit_criteria = " ".join(str(x).lower() for x in (grant.get("fit_criteria") or []))

    if ctx and ctx in areas:
        return 1.0

    # Token overlap (substring) for common synonyms.
    for a in areas:
        if ctx and (ctx in a or a in ctx):
            return 1.0

    # Related: AMR / gram_negative ↔ infectious_disease / antibiotic_resistance
    amr_tokens = {"amr", "gram_negative", "gram_positive", "antimicrobial", "tb", "fungal"}
    if ctx in {"infectious_disease", "antibiotic_resistance", "amr"} and (areas & amr_tokens):
        return 0.7
    if ctx == "antibiotic_resistance" and ("infectious_disease" in areas or (areas & amr_tokens)):
        return 0.7

    if ctx == "oncology" and any("onco" in a for a in areas):
        return 1.0
    if ctx == "oncology" and ("oncology" in fit_criteria or "cancer" in fit_criteria):
        return 0.7

    if ctx == "neurology" and any("neuro" in a for a in areas):
        return 1.0

    if ctx == "general_biomedical" and ("general_biomedical" in areas or "tools" in areas):
        return 0.7

    return 0.0


def evidence_score(program: ResearchProgram, grant: dict) -> tuple[float, list[str], list[str]]:
    required = list(grant.get("evidence_required") or [])
    if not required:
        return 1.0, [], []

    ev = program.evidence or {}
    met: list[str] = []
    missing: list[str] = []
    for key in required:
        if ev.get(key):
            met.append(key)
        else:
            missing.append(key)
    ratio = len(met) / max(len(required), 1)
    return ratio, met, missing


def technology_score(program: ResearchProgram, grant: dict) -> float:
    tech = {str(t).lower() for t in (grant.get("technology_fit") or [])}
    if not tech:
        return 0.0

    assay = (program.assay_type or "").lower()
    compound = (program.compound_type or "small_molecule").lower()

    tokens: set[str] = set()
    tokens.add(compound)
    if "mic" in assay or assay in {"mic_assay", "broth_microdilution"}:
        tokens.update({"antimicrobial", "small_molecule", "assay_platform"})
    if "enzyme" in assay or "gyrase" in assay or "inhibition" in assay:
        tokens.update({"small_molecule", "enzymatic_assay", "assay_platform", "novel_mechanism"})
    if "western" in assay:
        tokens.update({"biologic", "assay_platform"})
    if "single_cell" in assay or "scrna" in assay:
        tokens.update({"genomics", "computational", "software"})
    if "docking" in assay:
        tokens.update({"computational", "software", "small_molecule"})
    if "crispr" in assay:
        tokens.update({"genomics", "platform_tech"})

    hits = sum(1 for t in tokens if t in tech)
    if hits == 0:
        # Soft match on antimicrobial for resistance programs
        if program.disease_context in {"infectious_disease", "antibiotic_resistance", "amr"} and (
            "antimicrobial" in tech or "small_molecule" in tech
        ):
            return 0.5
        return 0.0
    return min(1.0, 0.4 + 0.2 * hits)


def final_fit_score(stage: float, disease: float, evidence: float, technology: float) -> float:
    raw = stage * 0.35 + disease * 0.30 + evidence * 0.25 + technology * 0.10
    return round(raw * 100, 1)


def fit_color_tier(fit_score: float) -> Literal["green", "amber", "blue"]:
    if fit_score >= 85:
        return "green"
    if fit_score >= 65:
        return "amber"
    return "blue"


def score_grant(program: ResearchProgram, grant: dict) -> FitResult:
    grant_id = str(grant.get("id") or grant.get("grant_id") or "")
    s = stage_score(program, grant)
    d = disease_score(program, grant)
    e, met, missing = evidence_score(program, grant)
    t = technology_score(program, grant)
    fit = final_fit_score(s, d, e, t)
    return FitResult(
        grant_id=grant_id,
        fit_score=fit,
        stage_score=s,
        disease_score=d,
        evidence_score=e,
        technology_score=t,
        requirements_met=met,
        requirements_missing=missing,
        fit_color_tier=fit_color_tier(fit),
    )
