from __future__ import annotations

import json
from pathlib import Path

from backend.agents._env import env_str
from backend.agents._llm import claude_messages_json
from backend.data.feedback_store import get_relevant_corrections
from backend.models.research_program import AuditFlag, ProtocolStep, ResearchProgram

_PROMPTS_DIR = Path(__file__).resolve().parents[1] / "prompts"


async def generate_protocol(program: ResearchProgram) -> list[ProtocolStep]:
    experiment_type = program.assay_type or "mic_assay"
    corrections = get_relevant_corrections(experiment_type, limit=5)

    corrections_context = ""
    if corrections:
        corrections_context = """
SCIENTIST CORRECTIONS FROM PRIOR REVIEWS (apply these to improve this plan):
"""
        for c in corrections:
            corrections_context += f"""
- Section: {c.get("section", "")}
  Original: {c.get("original", "")}
  Corrected to: {c.get("correction", "")}
  Reason ({c.get("reviewer_role", "")}): {c.get("reason", "")}
"""
        corrections_context += "\nApply these corrections when relevant to this experiment.\n"

    system_prompt = (_PROMPTS_DIR / "protocol.txt").read_text(encoding="utf-8")
    if corrections_context:
        system_prompt = system_prompt + "\n\n" + corrections_context
    if program.feedback_few_shot:
        system_prompt = system_prompt + "\n\n" + program.feedback_few_shot

    if env_str("ANTHROPIC_API_KEY"):
        try:
            user = json.dumps(
                {
                    "hypothesis": program.hypothesis,
                    "target": program.target,
                    "organism": program.organism,
                    "assay_type": program.assay_type,
                    "disease_context": program.disease_context,
                    "stage": str(program.stage.value),
                },
                indent=2,
            )
            user += (
                "\n\nReturn JSON ONLY: {\"steps\": ["
                '{"title": str, "description": str, "volumes": str, "time": str, '
                '"temperature": str, "equipment": [str], "controls": [str]}'
                "]} — at least 3 steps."
            )
            out = await claude_messages_json(system=system_prompt, user=user, max_tokens=4096)
            raw_steps = (out.get("steps") if isinstance(out, dict) else out) or []
            built: list[ProtocolStep] = []
            for s in raw_steps:
                if not isinstance(s, dict):
                    continue
                vol = s.get("volumes")
                if vol is not None and not isinstance(vol, str):
                    vol = json.dumps(vol) if isinstance(vol, dict) else str(vol)
                built.append(
                    ProtocolStep(
                        title=str(s.get("title") or "Step"),
                        description=str(s.get("description") or ""),
                        volumes=vol,
                        time=s.get("time") if s.get("time") is not None else None,
                        temperature=s.get("temperature") if s.get("temperature") is not None else None,
                        equipment=list(s.get("equipment") or []),
                        controls=list(s.get("controls") or []),
                    )
                )
            if built:
                return built
        except Exception:  # pragma: no cover
            pass

    return _default_steps(program, corrections_context)


def _default_steps(program: ResearchProgram, corrections_context: str) -> list[ProtocolStep]:
    first_desc = "Prepare starter culture and equilibrate to assay conditions."
    if corrections_context:
        first_desc = f"{corrections_context}\n\n{first_desc}"
    return [
        ProtocolStep(
            title="Culture Preparation",
            description=first_desc,
            volumes="5 mL starter + 45 mL growth media",
            time="16 h",
            temperature="37C",
            equipment=["Incubator shaker", "Sterile conical tubes"],
            controls=["Media-only blank"],
        ),
        ProtocolStep(
            title="Treatment Setup",
            description=f"Apply {program.target} perturbation conditions across replicates.",
            volumes="200 uL per well",
            time="30 min setup",
            temperature="Room temperature",
            equipment=["96-well plate", "Multichannel pipette"],
            controls=["Untreated control", "Positive control"],
        ),
        ProtocolStep(
            title="Readout and QC",
            description=f"Collect endpoint readout for {program.assay_type} and validate quality metrics.",
            volumes="As required by instrument",
            time="2 h",
            temperature="Instrument-specific",
            equipment=["Plate reader"],
            controls=["Technical triplicates"],
        ),
    ]


async def protocol_agent(program: ResearchProgram) -> ResearchProgram:
    steps = await generate_protocol(program)

    program.protocols = steps

    missing_controls = [s.title for s in steps if not s.controls]
    if missing_controls:
        program.audit_flags.append(
            AuditFlag(
                severity="warning",
                source="protocol_agent",
                message=f"Missing controls in steps: {', '.join(missing_controls)}",
            )
        )

    text_blob = " ".join(f"{s.title} {s.description}".lower() for s in steps)
    if "vehicle" not in text_blob:
        program.audit_flags.append(
            AuditFlag(
                severity="warning",
                source="protocol_agent",
                message="Assumption audit: vehicle control not explicitly called out across steps.",
            )
        )
    if "single" in program.hypothesis.lower() and "triplicate" not in text_blob:
        program.audit_flags.append(
            AuditFlag(
                severity="info",
                source="protocol_agent",
                message="Assumption audit: confirm biological replicate count (avoid single replicate designs).",
            )
        )
    if "positive control" not in text_blob:
        program.audit_flags.append(
            AuditFlag(
                severity="warning",
                source="protocol_agent",
                message="Assumption audit: positive control not clearly specified for all readouts.",
            )
        )

    program.refresh_computed_fields()
    return program
