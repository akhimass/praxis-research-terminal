from __future__ import annotations

import json
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Literal, cast

from pydantic import BaseModel, Field

# --- Data payloads (inner `data` of each SSE envelope) ---


class ContextData(BaseModel):
    target: str
    organism: str
    assay_type: str
    disease_context: str
    stage: str
    stage_confidence: float = Field(ge=0.0, le=1.0)


class NoveltyReferenceItem(BaseModel):
    title: str
    authors: str = ""
    year: int | None = None
    pmid: str = ""
    url: str = ""


class NoveltyData(BaseModel):
    signal: Literal["not_found", "similar_exists", "exact_match"]
    summary: str
    references: list[NoveltyReferenceItem] = Field(default_factory=list)


class QuantitativeClaim(BaseModel):
    type: str
    value: float | int | None = None
    unit: str = ""
    target: str = ""


class LiteraturePaper(BaseModel):
    pmid: str
    title: str
    authors: str = ""
    journal: str = ""
    year: int | None = None
    abstract: str = ""
    relevance_score: float = Field(default=0.0, ge=0.0, le=1.0)
    quantitative_claims: list[QuantitativeClaim] = Field(default_factory=list)


class LiteratureData(BaseModel):
    papers: list[LiteraturePaper] = Field(default_factory=list)


class BioinformaticsScript(BaseModel):
    filename: str
    language: str
    description: str
    code: str
    dependencies: list[str] = Field(default_factory=list)
    line_count: int = 0


class BioinformaticsData(BaseModel):
    scripts: list[BioinformaticsScript] = Field(default_factory=list)


class ProtocolStepData(BaseModel):
    step_number: int
    title: str
    description: str
    volumes: dict[str, str] = Field(default_factory=dict)
    temperature: str = ""
    duration: str = ""
    equipment: list[str] = Field(default_factory=list)
    controls: list[str] = Field(default_factory=list)
    notes: str = ""


class ProtocolData(BaseModel):
    steps: list[ProtocolStepData] = Field(default_factory=list)


class ReagentItemData(BaseModel):
    name: str
    vendor: str
    catalog_number: str
    unit_price: float
    unit: str
    quantity_needed: float
    total_cost: float
    phase: str = "P1"
    assay_type: str = "mic_assay"


class ReagentsData(BaseModel):
    items: list[ReagentItemData] = Field(default_factory=list)
    budget_total: float
    phase_breakdown: dict[str, float] = Field(default_factory=dict)
    vendor_count: int = 0
    estimated_weeks: int = 0


class TimelineItemData(BaseModel):
    task: str
    week_start: int
    week_end: int
    phase: str = "validation"
    is_critical_path: bool = False
    parallel_with: str | None = None
    milestone: bool = False


class TimelineData(BaseModel):
    items: list[TimelineItemData] = Field(default_factory=list)
    total_weeks: int = 0
    critical_path_weeks: int = 0


class FundingOpportunityData(BaseModel):
    id: str
    name: str
    organization: str
    type: str = "federal"
    amount_min: float
    amount_max: float
    follow_on_max: float = 0.0
    deadline: str
    next_review: str = ""
    fit_score: int = Field(ge=0, le=100)
    fit_rationale: str
    fit_breakdown: dict[str, int] = Field(default_factory=dict)
    requirements_met: list[str] = Field(default_factory=list)
    requirements_missing: list[str] = Field(default_factory=list)
    url: str = ""


class FundingData(BaseModel):
    opportunities: list[FundingOpportunityData] = Field(default_factory=list)
    total_addressable_usd: float = 0.0


class GTMMilestone(BaseModel):
    name: str
    month_start: int = 0
    month_end: int = 0
    phase: str = ""
    cost_range: str = ""
    is_current: bool = False


class GTMData(BaseModel):
    current_stage: str = "T2"
    ind_timeline_months: int = 0
    regulatory_pathway: str
    qidp_eligible: bool
    fast_track_eligible: bool
    market_sizing_note: str
    milestones: list[GTMMilestone] = Field(default_factory=list)


class TamarindData(BaseModel):
    protein_name: str
    organism: str
    mutation_label: str = ""
    pdb_string: str | None = None
    pdb_url: str | None = None
    confidence_score: float = 0.0
    residue_count: int = 0
    mutation_sites: list[str] = Field(default_factory=list)
    source: Literal["alphafold", "rcsb", "unavailable"] = "unavailable"


class AuditFlagData(BaseModel):
    id: str
    severity: Literal["high", "medium", "low"]
    title: str
    detail: str
    field_source: str
    suggested_fix: str = ""


class AuditData(BaseModel):
    flags: list[AuditFlagData] = Field(default_factory=list)
    flag_counts: dict[str, int] = Field(default_factory=dict)


class KeyFindingData(BaseModel):
    finding: str
    blocking_question: str = ""


class TraceData(BaseModel):
    step: int
    agent: str
    action: str
    finding: str
    duration_ms: int = 0
    timestamp: str


class CompleteData(BaseModel):
    program_id: str
    completeness_pct: float
    total_duration_seconds: float
    agent_timings: dict[str, float] = Field(default_factory=dict)


class ErrorData(BaseModel):
    agent: str
    message: str
    recoverable: bool = True


# Map event type name → inner data model
_EVENT_DATA_MODELS: dict[str, type[BaseModel]] = {
    "context": ContextData,
    "novelty": NoveltyData,
    "literature": LiteratureData,
    "bioinformatics": BioinformaticsData,
    "protocol": ProtocolData,
    "reagents": ReagentsData,
    "timeline": TimelineData,
    "funding": FundingData,
    "gtm": GTMData,
    "tamarind": TamarindData,
    "audit": AuditData,
    "key_finding": KeyFindingData,
    "trace": TraceData,
    "complete": CompleteData,
    "error": ErrorData,
}


def validate_event(event_type: str, data: dict[str, Any]) -> dict[str, Any]:
    """Validate `data` (inner payload) for `event_type`; return JSON-serializable dict."""
    model = _EVENT_DATA_MODELS.get(event_type)
    if model is None:
        raise ValueError(f"Unknown event type: {event_type!r}")
    return model.model_validate(data).model_dump()


def wrap_event(event_type: str, data: dict[str, Any]) -> dict[str, Any]:
    """Return envelope ``{type, data}`` with validated, normalized inner data."""
    return {"type": event_type, "data": validate_event(event_type, data)}


# --- Mappers: domain models → contract payloads ---


def _volumes_to_dict(v: str | dict | None) -> dict[str, str]:
    if isinstance(v, dict):
        return {str(k): str(val) for k, val in v.items()}
    if not v:
        return {}
    if len(v) < 200 and ("{" in v and "}" in v):
        try:
            parsed = json.loads(v)
            if isinstance(parsed, dict):
                return {str(k): str(val) for k, val in parsed.items()}
        except Exception:
            pass
    return {"default": v}


def _claim_from_string(s: str) -> dict[str, Any]:
    m = re.search(
        r"(IC50|MIC|Ki|EC50|K_D)\s*[<>=]?\s*([0-9.]+)\s*([a-zA-Z%µ/]+)?",
        s,
        re.IGNORECASE,
    )
    if m:
        typ = m.group(1).lower()
        val = float(m.group(2))
        unit = (m.group(3) or "").strip() or "unit"
        return {"type": typ, "value": val, "unit": unit, "target": s[:120]}
    return {"type": "text", "value": 0, "unit": "", "target": s[:200]}


def _stage_confidence(p: Any) -> float:
    # Simple heuristic: more filled fields → higher confidence
    n = 0
    for k in ("target", "organism", "assay_type", "disease_context"):
        if str(getattr(p, k, "") or "").strip():
            n += 1
    if n == 4:
        return 0.93
    if n >= 2:
        return 0.88
    return 0.85


def map_context(program: Any) -> dict[str, Any]:
    return ContextData(
        target=program.target or "",
        organism=program.organism or "",
        assay_type=program.assay_type or "",
        disease_context=program.disease_context or "",
        stage=str(program.stage.value) if hasattr(program.stage, "value") else str(program.stage),
        stage_confidence=_stage_confidence(program),
    ).model_dump()


def map_novelty(program: Any) -> dict[str, Any]:
    refs: list[NoveltyReferenceItem] = []
    for p in (program.novelty_references or [])[:3]:
        refs.append(
            NoveltyReferenceItem(
                title=getattr(p, "title", "") or "",
                authors=getattr(p, "authors", None) or "",
                year=getattr(p, "year", None),
                pmid=str(getattr(p, "pmid", "") or "")[:32],
                url=str(getattr(p, "url", "") or "")[:2048],
            )
        )
    return NoveltyData(
        signal=program.novelty_signal,
        summary=program.novelty_summary or "Novelty check complete.",
        references=refs,
    ).model_dump()


def map_literature(program: Any) -> dict[str, Any]:
    papers: list[LiteraturePaper] = []
    for p in program.literature or []:
        qcs: list[QuantitativeClaim] = []
        for c in p.quantitative_claims or []:
            if isinstance(c, dict):
                qcs.append(QuantitativeClaim.model_validate(c))
            else:
                qcs.append(QuantitativeClaim.model_validate(_claim_from_string(str(c))))
        journal = getattr(p, "journal", None) or ""
        papers.append(
            LiteraturePaper(
                pmid=str(p.pmid or ""),
                title=p.title,
                authors=p.authors or "",
                journal=str(journal),
                year=p.year,
                abstract=(p.abstract or "")[:4000],
                relevance_score=float(p.relevance_score or 0.0),
                quantitative_claims=qcs,
            )
        )
    return LiteratureData(papers=papers).model_dump()


def _parse_imports(code: str) -> list[str]:
    deps: set[str] = set()
    for line in code.splitlines():
        m = re.match(r"^\s*import\s+([A-Za-z0-9_.]+)", line)
        if m:
            deps.add(m.group(1).split(".")[0])
        m2 = re.match(r"^\s*from\s+([A-Za-z0-9_]+)", line)
        if m2:
            deps.add(m2.group(1).split(".")[0])
    common = ["numpy", "pandas", "scipy", "matplotlib", "scanpy", "anndata", "seaborn"]
    for c in common:
        if c in code and c not in deps:
            deps.add(c)
    return sorted(deps)[:20]


def map_bioinformatics(program: Any) -> dict[str, Any]:
    scripts: list[BioinformaticsScript] = []
    for s in program.scripts or []:
        code = s.content or ""
        scripts.append(
            BioinformaticsScript(
                filename=s.filename,
                language=s.language,
                description=s.description,
                code=code,
                dependencies=_parse_imports(code),
                line_count=len(code.splitlines()),
            )
        )
    return BioinformaticsData(scripts=scripts).model_dump()


def map_protocol(program: Any) -> dict[str, Any]:
    steps: list[ProtocolStepData] = []
    for i, s in enumerate(program.protocols or [], start=1):
        sn = getattr(s, "step_number", None) or i
        notes = getattr(s, "notes", None) or ""
        dur = getattr(s, "duration", None) or s.time or ""
        steps.append(
            ProtocolStepData(
                step_number=int(sn),
                title=s.title,
                description=s.description,
                volumes=_volumes_to_dict(getattr(s, "volumes_detail", None) or s.volumes),
                temperature=s.temperature or "",
                duration=str(dur),
                equipment=list(s.equipment or []),
                controls=list(s.controls or []),
                notes=str(notes),
            )
        )
    return ProtocolData(steps=steps).model_dump()


def _estimate_weeks(timeline: list) -> int:
    if not timeline:
        return 0
    return max((getattr(x, "week_end", 0) or 0) for x in timeline)


def _critical_path_weeks(timeline: list) -> int:
    # Longest chain by week span when dependencies exist (simplified: max week_end - min week_start)
    if not timeline:
        return 0
    w0 = min(getattr(x, "week_start", 0) for x in timeline)
    w1 = max(getattr(x, "week_end", 0) for x in timeline)
    return max(0, w1 - w0 + 1)


def map_timeline(program: Any) -> dict[str, Any]:
    items: list[TimelineItemData] = []
    for t in program.timeline_weeks or []:
        name = getattr(t, "task", None) or t.milestone
        phase = getattr(t, "phase", None) or "validation"
        items.append(
            TimelineItemData(
                task=str(name),
                week_start=t.week_start,
                week_end=t.week_end,
                phase=str(phase),
                is_critical_path=not getattr(t, "is_parallel", False) and not t.depends_on,
                parallel_with=(t.depends_on[0] if t.depends_on else None),
                milestone=False,
            )
        )
    total = _estimate_weeks(program.timeline_weeks or [])
    cp = _critical_path_weeks(program.timeline_weeks or [])
    return TimelineData(
        items=items,
        total_weeks=total,
        critical_path_weeks=cp,
    ).model_dump()


def map_reagents(program: Any) -> dict[str, Any]:
    items: list[ReagentItemData] = []
    default_phase = "P1"
    default_assay = program.assay_type or "mic_assay"
    for r in program.reagents or []:
        items.append(
            ReagentItemData(
                name=r.reagent_name,
                vendor=r.vendor,
                catalog_number=r.catalog_number,
                unit_price=r.unit_cost_usd,
                unit=r.quantity_unit,
                quantity_needed=r.quantity_needed,
                total_cost=r.line_total_usd,
                phase=getattr(r, "phase", None) or default_phase,
                assay_type=getattr(r, "assay_type", None) or default_assay,
            )
        )
    vendors = {i.vendor for i in items}
    # simple phase split if budget known
    bt = program.budget_total_usd or 0.0
    phase_breakdown = {
        "P1": round(bt * 0.45, 2),
        "P2": round(bt * 0.35, 2),
        "P3": round(bt * 0.20, 2),
    }
    if bt <= 0:
        phase_breakdown = {"P1": 0.0, "P2": 0.0, "P3": 0.0}
    return ReagentsData(
        items=items,
        budget_total=program.budget_total_usd or 0.0,
        phase_breakdown=phase_breakdown,
        vendor_count=len(vendors),
        estimated_weeks=_estimate_weeks(program.timeline_weeks or []) or 7,
    ).model_dump()


def _grants_by_id() -> dict[str, dict[str, Any]]:
    path = Path(__file__).resolve().parents[1] / "data" / "grants.json"
    if not path.exists():
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    return {g["id"]: g for g in raw if g.get("id")}


def map_funding(program: Any) -> dict[str, Any]:
    gmap = _grants_by_id()
    opps: list[FundingOpportunityData] = []
    total_addr = 0.0
    for f in program.funding_opportunities or []:
        gid = f.grant_id
        g = gmap.get(gid, {})
        amax = float(g.get("amount_max", f.amount_usd or 0))
        amin = float(g.get("amount_min", 0))
        total_addr += amax
        nrev = str(f.deadline or "rolling")
        if isinstance(g.get("review_cycles"), list) and g["review_cycles"]:
            nrev = f"Next review: {g['review_cycles'][-1]} 2026"
        fbd = {
            "disease_area": int(round((f.disease_fit_score or 0) * 100)),
            "stage_alignment": int(round((f.stage_fit_score or 0) * 100)),
            "evidence_required": int(round((f.evidence_fit_score or 0) * 100)),
            "technology_fit": int(round((f.technology_fit_score or 0) * 100)),
        }
        opps.append(
            FundingOpportunityData(
                id=gid,
                name=g.get("name", f.grant_name),
                organization=g.get("organization", f.sponsor),
                type=str(g.get("type", "federal")),
                amount_min=amin,
                amount_max=amax,
                follow_on_max=float(g.get("follow_on_max", 0)),
                deadline=f.deadline,
                next_review=nrev,
                fit_score=int(round(f.overall_fit_score)),
                fit_rationale=f.rationale,
                fit_breakdown=fbd,
                requirements_met=list(f.requirements_met or []),
                requirements_missing=list(f.requirements_missing or []),
                url=str(f.source_url or g.get("url", "")),
            )
        )
    return FundingData(opportunities=opps, total_addressable_usd=total_addr).model_dump()


def map_gtm(program: Any) -> dict[str, Any]:
    g = program.gtm_pathway
    sv = str(program.stage.value) if hasattr(program.stage, "value") else str(program.stage)
    stage_t = {
        "discovery": "T1",
        "validation": "T3",
        "preclinical": "T4",
        "IND_enabling": "T5",
    }
    current = stage_t.get(sv, "T2")
    milestones: list[GTMMilestone] = [
        GTMMilestone(
            name="Mechanism confirmation",
            month_start=0,
            month_end=6,
            phase="validation",
            cost_range="$50k–$120k",
            is_current=True,
        )
    ]
    return GTMData(
        current_stage=current,
        ind_timeline_months=int(g.estimated_time_to_ind_months or 0),
        regulatory_pathway=g.regulatory_pathway,
        qidp_eligible=bool(g.qidp_eligible),
        fast_track_eligible=bool(g.fast_track_eligible),
        market_sizing_note=g.market_size_notes or g.competitive_notes or "",
        milestones=milestones,
    ).model_dump()


def _parse_mutations(hyp: str) -> list[str]:
    return re.findall(r"\b([A-Z][0-9]+[A-Z])\b", hyp or "")


def map_tamarind(program: Any) -> dict[str, Any]:
    t = program.tamarind_results
    hyp = program.hypothesis or ""
    conf = t.confidence_score
    if conf is not None and conf <= 1.0 + 1e-6:
        conf = float(conf) * 100.0
    pdb = t.pdb_content
    if pdb and "ATOM" not in pdb[:200] and "HEADER" not in pdb[:20]:
        pdb = None
    rc = 0
    if t.pdb_content:
        rc = sum(1 for line in t.pdb_content.splitlines() if line.startswith(("ATOM  ", "HETATM", "ATOM\t")))
    source: Literal["alphafold", "rcsb", "unavailable"] = "unavailable"
    if t.pdb_url and "rcsb" in t.pdb_url:
        source = "rcsb"
    elif t.status == "complete" and (t.pdb_url or t.pdb_content):
        source = "alphafold"
    muts = _parse_mutations(hyp)
    mlab = f"{muts[0]} mutant" if muts else ("gyrA D87N mutant" if "D87N" in hyp else "unknown")
    return TamarindData(
        protein_name=program.target or "target",
        organism=program.organism or "",
        mutation_label=mlab,
        pdb_string=t.pdb_content,
        pdb_url=t.pdb_url,
        confidence_score=float(conf or 0.0),
        residue_count=rc,
        mutation_sites=_parse_mutations(hyp) or [],
        source=source,
    ).model_dump()


def _severity_to_band(sev: str) -> str:
    return {"info": "low", "warning": "medium", "critical": "high"}.get(sev, "low")


def map_audit(program: Any) -> dict[str, Any]:
    flags: list[AuditFlagData] = []
    counts = {"high": 0, "medium": 0, "low": 0}
    for i, a in enumerate(program.audit_flags or []):
        band = _severity_to_band(a.severity)
        sev = cast(Literal["high", "medium", "low"], band)
        counts[sev] = counts.get(sev, 0) + 1
        flags.append(
            AuditFlagData(
                id=f"flag_{i+1:03d}",
                severity=sev,
                title=a.source,
                detail=a.message,
                field_source=a.source,
                suggested_fix="Review protocol copy and add explicit control wells.",
            )
        )
    return AuditData(flags=flags, flag_counts=counts).model_dump()


def map_key_finding(program: Any) -> dict[str, Any]:
    finding = program.key_finding or ""
    block = "Is the phenotype driven by on-target binding, efflux, or confounding solubility issues?"
    if "efflux" in finding.lower() or "efflux" in (program.hypothesis or "").lower():
        block = "Is the activity due to efflux bypass or direct target binding?"
    return KeyFindingData(finding=finding, blocking_question=block).model_dump()


def map_complete(
    program: Any, *, total_seconds: float, timings: dict[str, float]
) -> dict[str, Any]:
    return CompleteData(
        program_id=program.program_id,
        completeness_pct=program.completeness_pct,
        total_duration_seconds=round(float(total_seconds), 2),
        agent_timings=timings,
    ).model_dump()


def map_error(*, agent: str, message: str, recoverable: bool = True) -> dict[str, Any]:
    return ErrorData(agent=agent, message=message, recoverable=recoverable).model_dump()


def make_trace(
    step: int,
    agent: str,
    action: str,
    finding: str,
    duration_ms: int,
) -> dict[str, Any]:
    return TraceData(
        step=step,
        agent=agent,
        action=action,
        finding=finding,
        duration_ms=duration_ms,
        timestamp=datetime.now().strftime("%H:%M:%S"),
    ).model_dump()


def new_trace_step() -> int:
    return int(time.time() * 1000) & 0x7FFFFFFF
