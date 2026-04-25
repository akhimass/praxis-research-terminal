from __future__ import annotations

import json

import pytest

from backend.models.sse_contracts import (
    map_complete,
    map_context,
    map_gtm,
    map_key_finding,
    map_literature,
    map_novelty,
    map_tamarind,
    make_trace,
    validate_event,
    wrap_event,
)
from backend.models.research_program import (
    GTMPathway,
    PaperResult,
    ResearchProgram,
    Stage,
    TamarindOutput,
)


def test_validate_event_each_type() -> None:
    samples: dict[str, dict] = {
        "context": {
            "target": "GyrA",
            "organism": "Escherichia coli",
            "assay_type": "enzyme_inhibition",
            "disease_context": "antibiotic_resistance",
            "stage": "validation",
            "stage_confidence": 0.93,
        },
        "novelty": {
            "signal": "similar_exists",
            "summary": "Test",
            "references": [
                {
                    "title": "T",
                    "authors": "A",
                    "year": 2023,
                    "pmid": "1",
                }
            ],
        },
        "literature": {
            "papers": [
                {
                    "pmid": "37104821",
                    "title": "T",
                    "authors": "Chen",
                    "journal": "J Med Chem",
                    "year": 2023,
                    "abstract": "abs",
                    "relevance_score": 0.95,
                    "quantitative_claims": [
                        {"type": "ic50", "value": 890, "unit": "nM", "target": "GyrA D87N"}
                    ],
                }
            ]
        },
        "bioinformatics": {
            "scripts": [
                {
                    "filename": "x.py",
                    "language": "python",
                    "description": "d",
                    "code": "import pandas as pd\n",
                    "dependencies": ["pandas"],
                    "line_count": 1,
                }
            ]
        },
        "protocol": {
            "steps": [
                {
                    "step_number": 1,
                    "title": "S",
                    "description": "D",
                    "volumes": {"a": "b"},
                    "temperature": "37C",
                    "duration": "1h",
                    "equipment": ["e"],
                    "controls": ["c"],
                    "notes": "n",
                }
            ]
        },
        "reagents": {
            "items": [
                {
                    "name": "R",
                    "vendor": "V",
                    "catalog_number": "1",
                    "unit_price": 1.0,
                    "unit": "g",
                    "quantity_needed": 1.0,
                    "total_cost": 1.0,
                    "phase": "P1",
                    "assay_type": "mic_assay",
                }
            ],
            "budget_total": 100.0,
            "phase_breakdown": {"P1": 100.0},
            "vendor_count": 1,
            "estimated_weeks": 4,
        },
        "timeline": {
            "items": [
                {
                    "task": "t",
                    "week_start": 1,
                    "week_end": 2,
                    "phase": "validation",
                    "is_critical_path": True,
                    "parallel_with": None,
                    "milestone": False,
                }
            ],
            "total_weeks": 3,
            "critical_path_weeks": 2,
        },
        "funding": {
            "opportunities": [
                {
                    "id": "barda_carbx",
                    "name": "BARDA CARB-X",
                    "organization": "X",
                    "type": "federal_partnership",
                    "amount_min": 1.0,
                    "amount_max": 2.0,
                    "follow_on_max": 3.0,
                    "deadline": "rolling",
                    "next_review": "June 2026",
                    "fit_score": 90,
                    "fit_rationale": "r",
                    "fit_breakdown": {"disease_area": 90, "stage_alignment": 90, "evidence_required": 80, "technology_fit": 85},
                    "requirements_met": ["a"],
                    "requirements_missing": ["b"],
                    "url": "https://x",
                }
            ],
            "total_addressable_usd": 100.0,
        },
        "gtm": {
            "current_stage": "T3",
            "ind_timeline_months": 24,
            "regulatory_pathway": "x",
            "qidp_eligible": True,
            "fast_track_eligible": True,
            "market_sizing_note": "m",
            "milestones": [
                {
                    "name": "M",
                    "month_start": 0,
                    "month_end": 6,
                    "phase": "p",
                    "cost_range": "c",
                    "is_current": True,
                }
            ],
        },
        "tamarind": {
            "protein_name": "GyrA",
            "organism": "E. coli",
            "mutation_label": "D87N mutant",
            "pdb_string": None,
            "pdb_url": "https://example",
            "confidence_score": 87.4,
            "residue_count": 100,
            "mutation_sites": ["D87N"],
            "source": "alphafold",
        },
        "audit": {
            "flags": [
                {
                    "id": "f1",
                    "severity": "high",
                    "title": "t",
                    "detail": "d",
                    "field_source": "p",
                    "suggested_fix": "s",
                }
            ],
            "flag_counts": {"high": 1, "medium": 0, "low": 0},
        },
        "key_finding": {"finding": "f", "blocking_question": "q"},
        "trace": {
            "step": 1,
            "agent": "A",
            "action": "act",
            "finding": "f",
            "duration_ms": 10,
            "timestamp": "12:00:00",
        },
        "complete": {
            "program_id": "prog_x",
            "completeness_pct": 80.0,
            "total_duration_seconds": 1.0,
            "agent_timings": {"context": 0.1},
        },
        "error": {"agent": "a", "message": "m", "recoverable": True},
    }

    for et, inner in samples.items():
        w = wrap_event(et, inner)
        assert w["type"] == et
        back = json.loads(json.dumps(w))
        assert back["type"] == et
        assert "data" in back
        again = validate_event(et, back["data"])
        assert again == back["data"] or isinstance(again, dict)


def test_mappers_from_program() -> None:
    p = ResearchProgram(
        hypothesis="h",
        target="GyrA",
        organism="E. coli",
        assay_type="enzyme_inhibition",
        disease_context="amr",
        stage=Stage.validation,
    )
    p.literature = [
        PaperResult(
            title="P",
            pmid="1",
            journal="J",
            quantitative_claims=["IC50 10 nM"],
        )
    ]
    p.gtm_pathway = GTMPathway(regulatory_pathway="r", market_size_notes="m", estimated_time_to_ind_months=20)
    p.tamarind_results = TamarindOutput(pdb_url="https://u", confidence_score=0.87, status="complete", pdb_content="ATOM 1 x")
    p.key_finding = "K"
    p.program_id = "prog_test"

    validate_event("context", map_context(p))
    validate_event("literature", map_literature(p))
    validate_event("gtm", map_gtm(p))
    validate_event("tamarind", map_tamarind(p))
    validate_event("key_finding", map_key_finding(p))
    validate_event(
        "complete",
        map_complete(p, total_seconds=1.2, timings={"context": 0.1}),
    )
    make_trace(1, "A", "x", "y", 5)


def test_wrap_unknown_raises() -> None:
    with pytest.raises(ValueError):
        validate_event("not_a_type", {})

