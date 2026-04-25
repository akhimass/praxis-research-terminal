from __future__ import annotations

import json
import re
from pathlib import Path

from backend.data.feedback_store import get_relevant_corrections
from backend.models.research_program import AuditFlag, ReagentLine, ResearchProgram


def _data_path() -> Path:
    return Path(__file__).resolve().parents[1] / "data" / "reagents.json"


def _reagent_corrections_context(program: ResearchProgram) -> str:
    """Few-shot text for vehicles, solvents, buffers — injected before line-item selection."""
    experiment_type = program.assay_type or "mic_assay"
    corrections = get_relevant_corrections(experiment_type, limit=5)
    relevant = []
    for c in corrections:
        sec = str(c.get("section", "")).lower()
        orig = str(c.get("original", "")).lower()
        cor = str(c.get("correction", "")).lower()
        if "reagent" in sec or "dmso" in sec or "dmso" in orig or "dmso" in cor:
            relevant.append(c)
        elif re.search(r"milk|bsa|tbst|buffer|vehicle|solvent", " ".join((orig, cor, sec))):
            relevant.append(c)

    if not relevant:
        return ""

    block = """
SCIENTIST CORRECTIONS — REAGENT / VEHICLE / BUFFER (apply before selecting catalog lines):
"""
    for c in relevant:
        block += f"""
- Section: {c.get("section", "")}
  Original: {c.get("original", "")}
  Corrected to: {c.get("correction", "")}
  Reason ({c.get("reviewer_role", "")}): {c.get("reason", "")}
"""
    block += "\nApply these when choosing reagents and vehicle controls for this experiment.\n"
    return block


async def reagent_agent(program: ResearchProgram) -> ResearchProgram:
    reagent_context = _reagent_corrections_context(program)

    with _data_path().open("r", encoding="utf-8") as fp:
        catalog = json.load(fp)
    by_name = {r["reagent_name"]: r for r in catalog}

    needed = ["Growth Media", "PBS Buffer", "Control Compound", "Pipette Tips", "96-Well Plate"]

    blob = reagent_context.lower() + (program.feedback_few_shot or "").lower()
    if "dmso" in blob and "DMSO" in by_name and "DMSO" not in needed:
        needed.append("DMSO")
    if re.search(r"bsa|bovine serum albumin", blob) and "BSA" in by_name and "BSA" not in needed:
        needed.append("BSA")

    lines: list[ReagentLine] = []
    for reagent_name in needed:
        found = by_name.get(reagent_name) or next(
            (r for r in catalog if r["reagent_name"] == reagent_name), None
        )
        if not found:
            continue
        qty = 2 if reagent_name in {"96-Well Plate", "Pipette Tips"} else 1
        lines.append(
            ReagentLine(
                reagent_name=found["reagent_name"],
                catalog_number=found["catalog_number"],
                vendor=found["vendor"],
                unit_cost_usd=float(found["unit_cost_usd"]),
                quantity_needed=float(qty),
                quantity_unit=found["unit"],
                line_total_usd=round(float(found["unit_cost_usd"]) * qty, 2),
            )
        )

    program.reagents = lines
    program.budget_total_usd = round(sum(l.line_total_usd for l in lines), 2)

    if reagent_context:
        program.audit_flags.append(
            AuditFlag(
                severity="info",
                source="reagent_agent",
                message=(
                    "Prior-review few-shot (reagent/vehicle) applied before selection. "
                    + reagent_context[:500]
                    + ("…" if len(reagent_context) > 500 else "")
                ),
            )
        )
    elif program.feedback_few_shot:
        program.audit_flags.append(
            AuditFlag(
                severity="info",
                source="reagent_agent",
                message="Upstream few-shot text present; verify DMSO limits and catalog numbers.",
            )
        )

    program.refresh_computed_fields()
    return program
