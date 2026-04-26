from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


def _new_program_id() -> str:
    return f"prog_{uuid.uuid4().hex[:10]}"


class Stage(str, Enum):
    discovery = "discovery"
    validation = "validation"
    preclinical = "preclinical"
    ind_enabling = "IND_enabling"


class PaperResult(BaseModel):
    pmid: str | None = None
    s2_paper_id: str | None = None
    title: str
    authors: str | None = None
    journal: str | None = None
    year: int | None = None
    abstract: str | None = None
    url: str | None = None
    tldr: str | None = None
    citation_count: int = 0
    influential_citations: int = 0
    pdf_url: str | None = None
    relevance_score: float = Field(default=0.0, ge=0, le=1)
    source: str = "tavily"
    quantitative_claims: list[str] = Field(default_factory=list)
    protocol_hints: list[str] = Field(default_factory=list)


class ProtocolStep(BaseModel):
    step_number: int | None = None
    title: str
    description: str
    volumes: str | None = None
    volumes_detail: dict[str, str] | None = None
    time: str | None = None
    duration: str | None = None
    temperature: str | None = None
    notes: str | None = None
    equipment: list[str] = Field(default_factory=list)
    controls: list[str] = Field(default_factory=list)


class GeneratedScript(BaseModel):
    filename: str
    language: Literal["python", "r"]
    content: str
    description: str


class ReagentLine(BaseModel):
    reagent_name: str
    catalog_number: str
    vendor: str
    unit_cost_usd: float
    quantity_needed: float
    quantity_unit: str
    line_total_usd: float
    phase: str = "P1"
    assay_type: str = ""


class GanttItem(BaseModel):
    milestone: str
    task: str | None = None
    phase: str | None = None
    week_start: int
    week_end: int
    is_parallel: bool = False
    depends_on: list[str] = Field(default_factory=list)


class FundingOpp(BaseModel):
    grant_id: str = ""
    grant_name: str
    sponsor: str
    amount_usd: float
    deadline: str
    stage_fit_score: float = Field(default=0.0, ge=0, le=1)
    disease_fit_score: float = Field(default=0.0, ge=0, le=1)
    evidence_fit_score: float = Field(default=0.0, ge=0, le=1)
    technology_fit_score: float = Field(default=0.0, ge=0, le=1)
    overall_fit_score: float = Field(default=0.0, ge=0, le=100)
    fit_color_tier: Literal["green", "amber", "blue"] = "blue"
    rationale: str
    source_url: str | None = None
    requirements_met: list[str] = Field(default_factory=list)
    requirements_missing: list[str] = Field(default_factory=list)


class GTMPathway(BaseModel):
    regulatory_pathway: str = ""
    qidp_eligible: bool = False
    fast_track_eligible: bool = False
    breakthrough_eligible: bool = False
    market_size_notes: str = ""
    competitive_notes: str = ""
    estimated_time_to_ind_months: int = 0


class TamarindOutput(BaseModel):
    requested: bool = False
    pdb_url: str | None = None
    pdb_content: str | None = None
    confidence_score: float | None = None
    status: str = "not_run"
    note: str = ""


class AuditFlag(BaseModel):
    severity: Literal["info", "warning", "critical"] = "info"
    source: str
    message: str


class SectionReview(BaseModel):
    section: str
    rating: int = Field(ge=1, le=5)
    correction: str
    reason: str
    experiment_type: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProgramReview(BaseModel):
    program_id: str
    overall_rating: int = Field(ge=1, le=5)
    section_reviews: list[SectionReview]
    would_use: bool
    reviewer_role: str


class ResearchProgram(BaseModel):
    program_id: str = Field(default_factory=_new_program_id)
    hypothesis: str
    target: str = ""
    organism: str = ""
    assay_type: str = ""
    disease_context: str = ""
    stage: Stage = Stage.discovery
    compound_type: str = "small_molecule"
    evidence: dict[str, bool] = Field(default_factory=dict)
    feedback_few_shot: str = ""
    # Populated by Claude tool `emit_sse_event`; orchestrator drains into SSE traces.
    agent_tool_events: list[dict[str, Any]] = Field(default_factory=list)

    novelty_signal: Literal["not_found", "similar_exists", "exact_match"] = "not_found"
    novelty_references: list[PaperResult] = Field(default_factory=list)
    novelty_summary: str = ""

    literature: list[PaperResult] = Field(default_factory=list)
    protocols: list[ProtocolStep] = Field(default_factory=list)
    scripts: list[GeneratedScript] = Field(default_factory=list)
    reagents: list[ReagentLine] = Field(default_factory=list)
    budget_total_usd: float = 0.0
    timeline_weeks: list[GanttItem] = Field(default_factory=list)
    funding_opportunities: list[FundingOpp] = Field(default_factory=list)
    gtm_pathway: GTMPathway = Field(default_factory=GTMPathway)
    tamarind_results: TamarindOutput = Field(default_factory=TamarindOutput)
    audit_flags: list[AuditFlag] = Field(default_factory=list)
    key_finding: str = ""

    completeness_pct: float = 0.0
    estimated_time_to_ind_months: int = 0

    @field_validator("novelty_references")
    @classmethod
    def _cap_novelty_refs(cls, v: list[PaperResult]) -> list[PaperResult]:
        return v[:3]

    def refresh_computed_fields(self) -> None:
        checks = [
            bool(self.target),
            bool(self.organism),
            bool(self.assay_type),
            bool(self.literature),
            bool(self.protocols),
            bool(self.scripts),
            bool(self.reagents),
            bool(self.timeline_weeks),
            bool(self.funding_opportunities),
            bool(self.gtm_pathway.regulatory_pathway),
        ]
        self.completeness_pct = round((sum(checks) / len(checks)) * 100, 2)
        self.estimated_time_to_ind_months = self.gtm_pathway.estimated_time_to_ind_months
