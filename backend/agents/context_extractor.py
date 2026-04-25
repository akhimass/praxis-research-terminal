from __future__ import annotations

import re

from backend.models.research_program import ResearchProgram, Stage


ASSAY_KEYWORDS = {
    "enzyme_inhibition": [
        "enzyme inhibition",
        "enzyme_inhibition",
        "gyrase",
        "gyra",
        "atpase",
        "ic50",
    ],
    "mic_assay": ["mic", "minimum inhibitory concentration", "broth microdilution"],
    "single_cell": ["single-cell", "single cell", "scrna", "scRNA", "10x"],
    "proteomics": ["proteomics", "mass spectrometry", "lc-ms", "lfq"],
    "docking": ["docking", "alphafold", "binding affinity", "in silico"],
    "western_blot": ["western blot", "immunoblot"],
    "crispr": ["crispr", "cas9", "guide rna", "indel"],
}

STAGE_KEYWORDS = {
    Stage.discovery: ["discovery", "hit finding", "screening"],
    Stage.validation: ["validation", "target validation", "orthogonal"],
    Stage.preclinical: ["preclinical", "in vivo", "animal model"],
    Stage.ind_enabling: ["ind", "ind-enabling", "toxicology", "glp"],
}


def _extract_target(text: str) -> str:
    patterns = [
        r"target(?:ing)?\s+([A-Za-z0-9\-\_]+)",
        r"inhibit(?:ing)?\s+([A-Za-z0-9\-\_]+)",
        r"against\s+([A-Za-z0-9\-\_]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return match.group(1)
    tokens = re.findall(r"\b[A-Z0-9]{3,10}\b", text)
    return tokens[0] if tokens else "unknown_target"


def _extract_organism(text: str) -> str:
    organism_patterns = [
        r"(e\.?\s*coli)",
        r"(s\.?\s*aureus)",
        r"(p\.?\s*aeruginosa)",
        r"(k\.?\s*pneumoniae)",
        r"(homo sapiens|human)",
        r"(mouse|murine)",
        r"(yeast|s\.?\s*cerevisiae)",
    ]
    for pattern in organism_patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return match.group(1).replace("  ", " ").strip()
    return "unknown_organism"


async def context_extractor(program: ResearchProgram) -> ResearchProgram:
    text = program.hypothesis or ""
    lowered = text.lower()

    program.target = _extract_target(text)
    program.organism = _extract_organism(text)
    if "gyra" in lowered:
        program.target = "GyrA"

    for assay, keys in ASSAY_KEYWORDS.items():
        if any(k.lower() in lowered for k in keys):
            program.assay_type = assay
            break
    if not program.assay_type:
        program.assay_type = "mic_assay"

    for stage, keys in STAGE_KEYWORDS.items():
        if any(k in lowered for k in keys):
            program.stage = stage
            break

    if "cancer" in lowered:
        program.disease_context = "oncology"
    elif (
        "antibiotic resistance" in lowered
        or "amr" in lowered
        or "fluoroquinolone" in lowered
        or "quinolone-resistant" in lowered
    ):
        program.disease_context = "antibiotic_resistance"
    elif "infection" in lowered or "resistance" in lowered:
        program.disease_context = "infectious_disease"
    elif "neuro" in lowered:
        program.disease_context = "neurology"
    else:
        program.disease_context = "general_biomedical"

    if "small molecule" in lowered or "compound-" in lowered:
        program.compound_type = "small_molecule"
    if "biologic" in lowered or "antibody" in lowered:
        program.compound_type = "biologic"

    ev: dict[str, bool] = {}
    if program.assay_type in {"mic_assay", "enzyme_inhibition"} or "mic" in lowered:
        ev["in_vitro_mic"] = True
    if "mechanism" in lowered or "inhibit" in lowered:
        ev["mechanism_data"] = True
    if "novel" in lowered or "scaffold" in lowered:
        ev["novel_scaffold"] = True
    if "preliminary" in lowered or "pilot" in lowered:
        ev["preliminary_data"] = True
    program.evidence = ev

    program.refresh_computed_fields()
    return program
