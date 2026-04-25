from __future__ import annotations

from backend.models.research_program import (
    AuditFlag,
    FundingOpp,
    GTMPathway,
    GanttItem,
    GeneratedScript,
    PaperResult,
    ProtocolStep,
    ReagentLine,
    ResearchProgram,
    Stage,
    TamarindOutput,
)

DEMO_HYPOTHESIS = (
    "Validate Compound-14 inhibits GyrA in fluoroquinolone-resistant E. coli "
    "with gyrA D87N mutation (validation stage)"
)

DEMO_LITERATURE: list[PaperResult] = [
    PaperResult(
        pmid="37104821",
        title="Quinolone scaffold activity against E. coli GyrA D87N mutants",
        authors="Chen X et al.",
        journal="J Med Chem",
        year=2023,
        abstract=(
            "Classic quinolone compounds showed IC50 > 890 nM against GyrA D87N; "
            "structure-guided analogs improved potency in broth microdilution MIC assays."
        ),
        url="https://pubmed.ncbi.nlm.nih.gov/37104821/",
        relevance_score=0.95,
        quantitative_claims=["IC50 > 890 nM vs GyrA D87N (quinolone class)"],
        protocol_hints=["Broth microdilution per CLSI M07", "Include WT comparator strain"],
    ),
    PaperResult(
        pmid="36299102",
        title="DNA gyrase inhibition kinetics in fluoroquinolone-resistant backgrounds",
        authors="Patel R et al.",
        year=2022,
        abstract="Enzyme inhibition assays with ATPase readout distinguished competitive vs partial inhibition.",
        url="https://pubmed.ncbi.nlm.nih.gov/36299102/",
        relevance_score=0.88,
        quantitative_claims=["ATPase IC50 shift 6.4× vs WT enzyme"],
        protocol_hints=["Preincubate enzyme with DNA before compound titration"],
    ),
    PaperResult(
        pmid="35550111",
        title="Efflux interplay confounds MIC shifts for gyrase-targeting agents",
        authors="Nguyen L et al.",
        year=2021,
        abstract="TolC and AcrAB efflux modulators altered MIC 2–8× without changing target engagement.",
        url="https://pubmed.ncbi.nlm.nih.gov/35550111/",
        relevance_score=0.74,
        quantitative_claims=["MIC fold-change up to 8× with efflux induction"],
        protocol_hints=["Add efflux inhibitor control panel", "Measure intracellular compound"],
    ),
    PaperResult(
        pmid="34000001",
        title="Developability checklist for antibacterial hit-to-lead transitions",
        authors="WHO AMR Working Group",
        year=2020,
        abstract="Highlights in vitro translation risks for Gram-negative agents including permeability and PPB.",
        url="https://pubmed.ncbi.nlm.nih.gov/34000001/",
        relevance_score=0.62,
        quantitative_claims=["PPB > 95% correlates with loss of intracellular MIC in panel strains"],
        protocol_hints=["Measure protein binding early", "Use physiologic media supplements"],
    ),
]

DEMO_PROTOCOL: list[ProtocolStep] = [
    ProtocolStep(
        title="Bacterial Culture Preparation",
        description="Grow E. coli strains overnight in cation-adjusted Mueller–Hinton broth.",
        volumes="5 mL MH broth per strain; inoculum standardized to ~5×10⁵ CFU/mL",
        time="16–18 h",
        temperature="37°C",
        equipment=["orbital shaker 200 rpm", "37°C incubator"],
        controls=["E. coli ATCC 25922 (WT susceptible control)"],
    ),
    ProtocolStep(
        title="Colony purity check",
        description="Streak for isolation on MH agar; confirm morphology before assay setup.",
        volumes="15 cm plate",
        time="18 h",
        temperature="37°C",
        equipment=["biosafety cabinet", "incubator"],
        controls=["Negative streak control (sterile loop)"],
    ),
    ProtocolStep(
        title="Compound stock preparation",
        description="Prepare Compound-14 serial dilutions in DMSO; keep final DMSO ≤0.5% v/v.",
        volumes="100% DMSO stocks → intermediate → assay plate",
        time="45 min",
        temperature="Room temperature",
        equipment=["analytical balance", "vortex", "sterile tubes"],
        controls=["Vehicle-only column on each plate"],
    ),
    ProtocolStep(
        title="Broth microdilution MIC (CLSI M07)",
        description="Perform 2-fold dilution series in 96-well U-bottom plates in triplicate.",
        volumes="100 µL final per well",
        time="16–20 h incubation",
        temperature="37°C",
        equipment=["plate reader (OD600)", "MH broth"],
        controls=["ATCC 25922", "D87N clinical isolate", "media sterility"],
    ),
    ProtocolStep(
        title="MIC quality metrics",
        description="Acceptance: growth control turbid; sterility clear; duplicate MIC within 1 dilution.",
        volumes="N/A",
        time="30 min readout",
        temperature="37°C",
        equipment=["plate imager optional"],
        controls=["Growth/sterility controls per CLSI"],
    ),
    ProtocolStep(
        title="Gyrase ATPase inhibition assay",
        description="Measure ATP hydrolysis rate vs compound concentration with DNA present.",
        volumes="50 µL reaction",
        time="60 min assay window",
        temperature="37°C",
        equipment=["fluorometric plate reader or malachite green endpoint"],
        controls=["No-enzyme control", "no-DNA control", "known inhibitor control"],
    ),
    ProtocolStep(
        title="DNA supercoiling gel shift (optional orthogonal)",
        description="Relaxed plasmid → supercoiled product monitored by agarose gel.",
        volumes="20 µL reaction",
        time="45 min",
        temperature="37°C",
        equipment=["gel electrophoresis system"],
        controls=["No compound control", "fluoroquinolone comparator lane"],
    ),
    ProtocolStep(
        title="Cytotoxicity counter-screen (host cells)",
        description="HEK293 viability after 24 h exposure to rule out promiscuous toxicity.",
        volumes="100 µL per well",
        time="24 h",
        temperature="37°C 5% CO2",
        equipment=["tissue culture hood", "plate reader"],
        controls=["DMSO vehicle", "staurosporine positive control"],
    ),
    ProtocolStep(
        title="Permeability / efflux panel",
        description="Repeat MIC in tolC/porin mutants to test efflux confounding.",
        volumes="same as MIC",
        time="16–20 h",
        temperature="37°C",
        equipment=["incubator"],
        controls=["Parent vs knockout pairs"],
    ),
    ProtocolStep(
        title="Data analysis and QC gates",
        description="Compute fold-shift vs WT; flag outliers; summarize replicate concordance.",
        volumes="N/A",
        time="2 h",
        temperature="N/A",
        equipment=["Python/R workstation"],
        controls=["Blinded replicate labels optional"],
    ),
    ProtocolStep(
        title="Reporting and ELN capture",
        description="Export plate maps, raw OD, calculated MIC tables, and gel images to ELN.",
        volumes="N/A",
        time="1 h",
        temperature="N/A",
        equipment=["ELN"],
        controls=["Versioned file naming", "checksum on raw data"],
    ),
    ProtocolStep(
        title="Go/No-Go decision",
        description="Compare Compound-14 IC50/MIC vs quinolone class benchmark and efflux-corrected MIC.",
        volumes="N/A",
        time="1 h",
        temperature="N/A",
        equipment=["program management"],
        controls=["Independent scientific reviewer optional"],
    ),
]

DEMO_SCRIPTS: list[GeneratedScript] = [
    GeneratedScript(
        filename="resistance_analysis.py",
        language="python",
        description="MIC fold-shift analysis, CLSI-style classification, Mann–Whitney testing, bar chart export.",
        content="# See backend/data/demo_scripts/resistance_analysis.py (downloaded artifact).",
    ),
    GeneratedScript(
        filename="volcano_plot.py",
        language="python",
        description="Compound screen volcano plot with hit coloring and top labels.",
        content="# See backend/data/demo_scripts/volcano_plot.py (downloaded artifact).",
    ),
    GeneratedScript(
        filename="mic_statistics.R",
        language="r",
        description="MIC distributions, geometric means, breakpoint overlays, PDF export.",
        content="# See backend/data/demo_scripts/mic_statistics.R (downloaded artifact).",
    ),
]

DEMO_KEY_FINDING = (
    "Compound-14 shows 27.8× lower IC50 than published quinolone class against GyrA D87N — "
    "consistent with a non-chelating binding hypothesis that may bypass classic QRDR effects. "
    "Next: confirm with enzyme inhibition + rule out efflux-mediated MIC shifts."
)


def build_demo_research_program() -> ResearchProgram:
    return ResearchProgram(
        program_id="prog_demo_lovable",
        hypothesis=DEMO_HYPOTHESIS,
        target="GyrA",
        organism="Escherichia coli",
        assay_type="enzyme_inhibition",
        disease_context="antibiotic_resistance",
        stage=Stage.validation,
        compound_type="small_molecule",
        evidence={
            "in_vitro_mic": True,
            "mechanism_data": True,
            "novel_scaffold": True,
            "preliminary_data": True,
        },
        novelty_signal="similar_exists",
        novelty_summary="Related gyrase inhibition literature exists; differentiation should emphasize D87N potency and efflux-corrected MIC.",
        novelty_references=DEMO_LITERATURE[:3],
        literature=DEMO_LITERATURE,
        protocols=DEMO_PROTOCOL,
        scripts=DEMO_SCRIPTS,
        reagents=[
            ReagentLine(
                reagent_name="Mueller-Hinton Broth",
                catalog_number="70192",
                vendor="Sigma-Aldrich",
                unit_cost_usd=89.0,
                quantity_needed=2.0,
                quantity_unit="500 g",
                line_total_usd=178.0,
            ),
            ReagentLine(
                reagent_name="DMSO",
                catalog_number="D2650",
                vendor="Sigma-Aldrich",
                unit_cost_usd=41.0,
                quantity_needed=1.0,
                quantity_unit="100 mL",
                line_total_usd=41.0,
            ),
            ReagentLine(
                reagent_name="96-Well Plate",
                catalog_number="CLS353072",
                vendor="Corning",
                unit_cost_usd=129.0,
                quantity_needed=4.0,
                quantity_unit="50 plates",
                line_total_usd=516.0,
            ),
        ],
        budget_total_usd=14200.00,
        timeline_weeks=[
            GanttItem(
                milestone="MIC Assay — Compound-14 vs resistant strains",
                week_start=1,
                week_end=2,
                depends_on=[],
            ),
            GanttItem(
                milestone="Enzyme inhibition dose-response",
                week_start=2,
                week_end=3,
                depends_on=["MIC Assay — Compound-14 vs resistant strains"],
            ),
            GanttItem(
                milestone="Orthogonal supercoiling assay",
                week_start=3,
                week_end=4,
                depends_on=["Enzyme inhibition dose-response"],
            ),
            GanttItem(
                milestone="Efflux panel + isogenic mutants",
                week_start=4,
                week_end=5,
                is_parallel=True,
            ),
            GanttItem(
                milestone="PK/PD modeling (exploratory)",
                week_start=5,
                week_end=6,
                is_parallel=True,
            ),
            GanttItem(
                milestone="ADMET counter-screens",
                week_start=6,
                week_end=8,
                depends_on=["Orthogonal supercoiling assay"],
            ),
            GanttItem(
                milestone="Hit-to-lead chemistry sprint",
                week_start=8,
                week_end=10,
                depends_on=["ADMET counter-screens"],
            ),
            GanttItem(
                milestone="IND-enabling tox planning",
                week_start=10,
                week_end=12,
                depends_on=["Hit-to-lead chemistry sprint"],
            ),
            GanttItem(
                milestone="Data package + external review",
                week_start=12,
                week_end=13,
                depends_on=["IND-enabling tox planning"],
            ),
        ],
        funding_opportunities=[
            FundingOpp(
                grant_id="barda_carbx",
                grant_name="BARDA CARB-X",
                sponsor="BARDA / Wellcome",
                amount_usd=1250000.0,
                deadline="rolling",
                stage_fit_score=1.0,
                disease_fit_score=0.7,
                evidence_fit_score=0.75,
                technology_fit_score=0.8,
                overall_fit_score=92.0,
                fit_color_tier="green",
                rationale=(
                    "Strong fit: gram-negative AMR target with novel scaffold story; ensure in vivo POC plan."
                ),
                source_url="https://carb-x.org/apply",
                requirements_met=["novel mechanism", "gram-negative", "in vitro data"],
                requirements_missing=["in vivo POC", "ADMET profiling"],
            ),
            FundingOpp(
                grant_id="nih_sbir_r43_niaid",
                grant_name="NIH SBIR R43 (NIAID)",
                sponsor="NIH / NIAID",
                amount_usd=350000.0,
                deadline="April 5, August 5, December 5",
                stage_fit_score=0.6,
                disease_fit_score=0.7,
                evidence_fit_score=0.5,
                technology_fit_score=0.6,
                overall_fit_score=62.0,
                fit_color_tier="blue",
                rationale="Feasible for SBIR-style de-risking if commercialization pathway is sharpened.",
                source_url="https://grants.nih.gov/grants/guide/pa-files/PAR-24-042.html",
                requirements_met=["preliminary_data"],
                requirements_missing=["specific_aims", "commercialization_plan"],
            ),
        ],
        gtm_pathway=GTMPathway(
            regulatory_pathway="505(b)(1) NDA with pre-IND meeting package for antibacterial efficacy + safety",
            qidp_eligible=True,
            fast_track_eligible=True,
            breakthrough_eligible=False,
            market_size_notes="AMR antibiotics remain a constrained but high-need market; differentiation via resistance phenotype matters.",
            competitive_notes="Competes with revived quinolone analogs and novel topoisomerase programs; PK and efflux will decide positioning.",
            estimated_time_to_ind_months=38,
        ),
        tamarind_results=TamarindOutput(
            requested=True,
            pdb_url=None,
            pdb_content=None,
            confidence_score=None,
            status="structure_unavailable",
            note="Demo mode: structure prediction not executed.",
        ),
        audit_flags=[
            AuditFlag(
                severity="info",
                source="demo",
                message="This ResearchProgram object is intended for offline demo streaming.",
            )
        ],
        key_finding=DEMO_KEY_FINDING,
    )


DEMO_PROGRAM: ResearchProgram = build_demo_research_program()
