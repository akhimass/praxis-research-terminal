"""Static seed documents for PRAXIS RAG collections."""

from __future__ import annotations


def _prot(
    pid: str,
    title: str,
    assay_type: str,
    organism: str,
    body: str,
    reagents: str,
    duration: str,
    pitfalls: str,
    controls: str,
    steps: int,
) -> dict:
    text = (
        f"{title}\n\n{body.strip()}\n\n"
        f"Key reagents (with catalog numbers where applicable): {reagents}\n"
        f"Typical duration: {duration}\n"
        f"Common pitfalls: {pitfalls}\n"
        f"Controls required: {controls}"
    )
    return {
        "id": pid,
        "text": text,
        "metadata": {
            "assay_type": assay_type,
            "organism": organism,
            "reagents_needed": reagents,
            "steps": str(steps),
            "typical_duration": duration,
            "pitfalls": pitfalls,
            "controls_summary": controls,
        },
    }


PROTOCOL_SEEDS: list[dict] = [
    _prot(
        "prot_m07_mic",
        "Broth microdilution MIC (CLSI M07)",
        "broth_microdilution_mic",
        "bacteria",
        """
Prepare Mueller–Hinton broth (MH) from dehydrated powder per manufacturer (e.g. BD 211443)
and verify cation concentration (Ca²⁺ 20–25 mg/L, Mg²⁺ 10–12.5 mg/L) using ICP-MS or lot COA.
Inoculate test strains on agar, pick 3–5 colonies, suspend in saline, and adjust to 0.5 McFarland;
then dilute 1:150 into MH to achieve ~5×10⁵ CFU/mL final in the microdilution plate. Prepare
serial 2-fold dilutions of antimicrobial in MH across columns; add 50 µL drug + 50 µL inoculum
per well in U-bottom 96-well plates. Include growth control (no drug), sterility control
(uninoculated), and organism QC (e.g. E. coli ATCC 25922) per CLSI M07. Incubate 35±2 °C
ambient air for 16–20 h. Read MIC as lowest concentration preventing visible turbidity; use
mirror or plate reader OD600 with validated cutoff. Document edge wells for evaporation.
        """,
        "BD Mueller–Hinton Broth 211443; BD MHB cation-adjusted lots; Corning 3599 plates; "
        "Thermo Sensititre or custom drug panels; ATCC 25922, ATCC 29213 QC strains",
        "2 calendar days (setup + read)",
        "Heavy inoculum (>10⁶ CFU/mL) falsely elevates MIC; drug precipitates in wells "
        "(especially azoles) misread as growth; DMSO >0.5% v/v alters MIC.",
        "Growth control; sterility control; QC strain within published MIC range; "
        "duplicate plates for critical studies",
        12,
    ),
    _prot(
        "prot_fitc_permeability",
        "FITC–dextran intestinal permeability (in vivo / ex vivo)",
        "intestinal_permeability",
        "mouse",
        """
Measure paracellular leak using FITC–dextran (4 or 70 kDa) after oral gavage. Fast mice
4–6 h, record weight, gavage FITC–dextran dissolved in PBS (pH 7.4) at 60–120 mg/kg for 4 kDa
or protocol-specific dose for 70 kDa. Bleed retro-orbital or cardiac puncture at 30, 60,
120 min; separate plasma by centrifugation 10 min at 4 °C. Prepare standard curve in blank
plasma (0–200 µg/mL) in black 96-well plate. Excitation 485 nm / emission 528 nm. Subtract
background from sham-gavaged controls. For Ussing chambers, mount freshly opened jejunum
1 cm segments, add FITC–dextran to mucosal side, sample serosal buffer at intervals; calculate
apparent permeability (Papp). Always normalize to plasma volume and body weight.
        """,
        "Sigma FD4 (4 kDa) FD70; Millex-GV filters; Greiner black plates 655076; "
        "Harvard Ussing system or equivalent",
        "1–2 days including prep",
        "Photobleaching lowers signal—minimize light exposure; hemolysis interferes—"
        "remove RBC if hemolyzed; pH shifts fluorescence intensity.",
        "Naive vs colitis model baseline; time-zero bleed; sham gavage PBS-only; "
        "standard curve on each plate day",
        10,
    ),
    _prot(
        "prot_mtt",
        "MTT cell viability assay",
        "cell_viability_mtt",
        "mammalian_cells",
        """
Seed adherent cells at log-phase density in 96-well plate (e.g. 5×10³–1×10⁴/well) in complete
medium; allow overnight adherence. Apply treatments in triplicate for 24–72 h. Add 10 µL
MTT reagent (5 mg/mL in PBS) per 100 µL medium; incubate 37 °C 2–4 h until purple formazan
appears. Remove medium carefully (aspiration without disturbing formazan). Solubilize with
100 µL acidic isopropanol (0.04 N HCl in isopropanol) or DMSO; shake 15 min room temperature.
Read absorbance 570 nm with 630 nm reference. Calculate % viability vs untreated control after
subtracting blank wells (medium + MTT, no cells). For suspension cells, spin before solubilizer.
        """,
        "Sigma M2128 MTT; Corning 3596 tissue-culture plate; BioTek plate reader",
        "2–3 days",
        "Phenol red quenches MTT—use phenol-red-free medium for low signal; edge effects—"
        "avoid outer wells or average them separately; DMSO vehicle toxicity at >1%.",
        "Medium-only blank; untreated control; positive cytotoxic control (e.g. 1% Triton "
        "on reference wells); technical triplicates",
        9,
    ),
    _prot(
        "prot_wb_standard",
        "Western blot (standard total protein)",
        "western_blot",
        "mammalian_cells",
        """
Lyse cells on ice in RIPA + protease inhibitors (cOmplete ULTRA, Roche 5892791001); clarify
14,000×g 15 min. Quantify protein (BCA, Pierce 23225). Load 20–40 µg per lane on 4–20%
Tris-glycine gel; run 120 V until dye front exits. Transfer to 0.2 µm PVDF (wet transfer
350 mA 90 min on ice). Ponceau stain optional for loading QC. Block 1 h in 5% non-fat milk
in TBST. Incubate primary antibody overnight 4 °C in milk or BSA per datasheet. Wash TBST
3×10 min. HRP-conjugated secondary 1 h room temperature; wash again. Develop with ECL
(Amersham RPN2232) and image with CCD. Strip and reprobe for housekeeping (β-actin, GAPDH)
if needed using mild stripping buffer.
        """,
        "RIPA buffer; PVDF Immobilon-P VPH00010; anti-GAPDH 60004-1-Ig; "
        "anti-target primary per vendor; HRP secondaries Jackson 111-035-003",
        "3 days",
        "Incomplete transfer shows high MW smear; milk masks some phospho epitopes—"
        "do not use milk for phospho blots; overloaded lanes mask quantitation.",
        "Positive lysate control; loading control on same blot; secondary-only lane; "
        "molecular weight ladder",
        14,
    ),
    _prot(
        "prot_wb_phospho",
        "Western blot for phospho-proteins",
        "western_blot_phospho",
        "mammalian_cells",
        """
Use phospho-safe lysis: 50 mM Tris-HCl pH 7.4, 150 mM NaCl, 1% NP-40, 0.25% sodium
deoxycholate, 10 mM sodium pyrophosphate, 10 mM β-glycerophosphate, 1 mM sodium orthovanadate,
protease + phosphatase inhibitors. Keep samples cold; avoid repeated freeze–thaw. Run and
transfer as standard blot. Block 1 h in 5% BSA in TBST (avoid milk). Primary phospho-
antibody (e.g. anti-pERK1/2 Thr202/Tyr204) overnight 4 °C in BSA. Include λ-phosphatase
treated control lysate on same gel to validate specificity. Strip and reprobe for total
target protein on same membrane when possible for normalization.
        """,
        "CST #9101 p44/42 MAPK (Erk1/2); CST #4370 total Erk; "
        "Phosphatase inhibitor cocktail PhosSTOP 4906845001",
        "3 days",
        "Milk contains phosphoproteins causing weak/absent phospho signal; "
        "overexpression artifacts—validate with pharmacologic stimulation controls.",
        "Untreated vs stimulated lysates; phosphatase-treated control; total protein "
        "reprobe; non-phospho peptide competition if available",
        15,
    ),
    _prot(
        "prot_elisa_sandwich",
        "Sandwich ELISA (quantitative cytokine)",
        "elisa_sandwich",
        "serum_plasma_cell_supernatant",
        """
Coat high-binding plate overnight 4 °C with capture antibody (1–5 µg/mL in PBS). Block 1–2 h
with 1% BSA in PBS. Add standards (recombinant analyte dilution series) and unknown samples
in duplicate; incubate 2 h room temperature. Wash PBS + 0.05% Tween-20, 5×. Add biotinylated
detection antibody; incubate 1 h. Wash. Add streptavidin-HRP conjugate; incubate 30 min.
Wash. Add TMB substrate; stop with 1 M H₂SO₄ when blue develops; read 450 nm with 540 nm
reference within 30 min of stop. Fit 4-parameter logistic curve for concentration. Dilute
samples predicted above upper asymptote; repeat if hook effect suspected for large antigens.
        """,
        "R&D DuoSet ELISA kits (e.g. DY406 for mouse IL-6); R&D DY994 reagent kit; "
        "Nunc MaxiSorp 468667",
        "2 days",
        "Edge effect—rotate standards across plate; biotin interference in streptavidin "
        "matrix samples; hemolysis affects optical density.",
        "Standard curve on every plate; blank wells; spike recovery in matrix; "
        "duplicate unknowns",
        11,
    ),
    _prot(
        "prot_elisa_competitive",
        "Competitive ELISA (small molecule / hapten)",
        "elisa_competitive",
        "serum",
        """
Pre-coat plate with anti-hapten antibody. Pre-incubate standards and samples with limited
HRP-labeled hapten tracer so free analyte competes off tracer binding. Transfer mixture to
coated plate; incubate; wash. Higher signal = lower analyte concentration (inverse curve).
Validate matrix dilution linearity; use charcoal-stripped serum for standard curve if needed.
Optimize tracer:antibody ratio to mid-log dynamic range.
        """,
        "HRP-hapten conjugate custom; coating antibody; TMB kit",
        "3–5 days optimization + 1 day assay",
        "Matrix effects shift IC50—match diluent to sample matrix; tracer instability—"
        "aliquot and store -80 °C.",
        "Zero analyte max signal control; excess analyte min signal; "
        "structurally unrelated competitor for specificity",
        10,
    ),
    _prot(
        "prot_flow_surface",
        "Flow cytometry — surface immunophenotyping",
        "flow_cytometry_surface",
        "human_mouse_cells",
        """
Harvest cells; block Fc receptors (TruStain FcX BioLegend 101302 human/mouse). Stain live/dead
Zombie NIR in PBS 15 min room temperature; quench with protein-containing buffer. Surface
stain cocktail in PBS + 2% FBS 30 min 4 °C protected from light. Wash twice. Fix if needed
with 1–2% PFA 10 min for intracellular exclusion only. Acquire on cytometer with appropriate
compensation controls (single-stain tubes or beads). Gate FSC/SSC → live → singlet →
population of interest. Export FCS with consistent voltage settings across longitudinal study.
        """,
        "BD FACSymphony or Cytek Aurora; BioLegend antibodies per panel; "
        "CompBead Plus anti-mouse/human kit 560497",
        "1 day staining + acquisition",
        "Under-compensation causes false positives; fixative quenches some epitopes—"
        "stain surface before fix; carryover—run PBS between high- and low-expression samples.",
        "FMO (fluorescence minus one); single-stain controls; unstained; "
        "biological reference sample each run",
        12,
    ),
    _prot(
        "prot_flow_apoptosis",
        "Flow cytometry — apoptosis (Annexin V)",
        "flow_cytometry_apoptosis",
        "mammalian_cells",
        """
Induce apoptosis per experimental arm. Collect adherent + detached cells. Wash cold PBS;
stain Annexin V in binding buffer (10 mM HEPES pH 7.4, 140 mM NaCl, 2.5 mM CaCl₂) 15 min 4 °C.
Add viability dye (7-AAD or DAPI) immediately before acquisition—late apoptotic/necrotic cells
lose membrane integrity. Do not use EDTA buffers before Annexin staining (chelates Ca²⁺).
Acquire within 1 h of staining. Quadrant analysis: early apoptotic Annexin+7-AAD−,
late apoptotic/necrotic double positive.
        """,
        "BD 556547 Annexin V-FITC kit; binding buffer 556454",
        "Same day",
        "Late apoptosis vs necrosis ambiguous—use additional markers (cleaved caspase-3); "
        "apoptosis continues ex vivo—keep cells on ice.",
        "Camptothecin or staurosporine positive control; untreated negative; "
        "single-stain compensation controls",
        9,
    ),
    _prot(
        "prot_qpcr_sybr",
        "qPCR — SYBR Green relative quantification",
        "qpcr_sybr",
        "dna_rna",
        """
Extract RNA with column kit (Qiagen 74104); DNase digest; quantify Nanodrop + RiboGreen.
Reverse transcribe with SSIV or equivalent; store cDNA -20 °C. Design primers spanning exon–
exon junction; verify single product by melt curve and gel. Run triplicate wells 10 µL SYBR
reaction (PowerUp SYBR A25742): 95 °C 2 min; 40 cycles 95 °C 15 s, 60 °C 1 min; melt 60–95 °C.
Use ΔΔCt vs housekeeping (GAPDH, ACTB) validated for your model. Include no-RT and no-
template controls every run. Report MIQE checklist fields.
        """,
        "Applied Biosystems QuantStudio; PowerUp SYBR A25742; SSIV V36918; "
        "primer pairs IDT Ultramer",
        "2 days",
        "Genomic DNA amplification without exon-spanning primers; primer-dimers inflate "
        "signal—optimize Mg and annealing; inefficient RT—check RIN.",
        "No-template control; no-RT control; positive cDNA control; "
        "housekeeping stability across conditions",
        14,
    ),
    _prot(
        "prot_qpcr_taqman",
        "qPCR — TaqMan gene expression",
        "qpcr_taqman",
        "dna_rna",
        """
Use inventoried TaqMan assays with FAM-MGB probes. Prepare master mix with TaqPath 1-step
or separate RT + qPCR per sample type. Standard curve method (absolute copies) or comparative
Ct vs endogenous control. Multiplex only after verifying no cross-fluorescence. Run UNG carryover
control if using master mix with dUTP. Export SDS file with passive reference ROX correction.
        """,
        "TaqMan Fast Advanced Master Mix 4444556; specific assay IDs from Thermo portal",
        "1–2 days",
        "Low-copy targets near LOD—increase input RNA; multiplex bleed-through; "
        "different efficiencies between target and housekeeping invalidate ΔΔCt.",
        "NTC; positive control template; inter-plate calibrator if multi-plate study",
        11,
    ),
    _prot(
        "prot_crispr_rnp",
        "CRISPR knockout — RNP electroporation",
        "crispr_knockout_rnp",
        "mammalian_cells",
        """
Design gRNA with >0.6 on-target score and minimal off-targets (Cas-OFFinder). Resuspend
synthetic sgRNA with purified Cas9 protein to form RNP 10–20 µM each; incubate 10 min RT.
Trypsinize cells; wash PBS; count. Resuspend in Neon or Nucleofector buffer at 1–2×10⁷/mL;
mix with RNP; electroporate per manufacturer program optimization (pulse voltage, width).
Immediately transfer to pre-warmed medium with RNase-free water wash of cuvette. Culture 48–
72 h; harvest for indel detection (T7E1, ICE assay, or NGS amplicon). FACS sort if HDR template
used. Mycoplasma-negative cells only.
        """,
        "IDT Alt-R crRNA/tracrRNA; Alt-R S.p. Cas9 Nuclease V3 1081058; Neon system MPK5000; "
        "Lonza SG Cell Line Nucleofector kits",
        "5–7 days including outgrowth",
        "Toxicity from excess Cas9—titrate RNP; genomic mosaicism—clone from single cell; "
        "off-target edits—NGS validate top sites.",
        "Non-targeting gRNA control; mock electroporation; "
        "viability stain 24 h post-pulse; Sanger/NGS confirmation",
        16,
    ),
    _prot(
        "prot_cryo_dmso",
        "Cell cryopreservation — DMSO slow-freeze",
        "cell_cryopreservation",
        "mammalian_cells",
        """
Log-phase cells >90% viability (Trypan). Centrifuge; resuspend in ice-cold freezing medium:
complete growth medium + 10% DMSO (or 90% FBS + 10% DMSO for sensitive lines). Aliquot 1 mL
into labeled cryovials. Place vials in Mr. Frosty or controlled-rate freezer -1 °C/min to
-80 °C overnight; next day transfer to liquid nitrogen vapor phase. Recovery: rapid thaw 37 °C
water bath; dilute dropwise into 10 mL warm medium; spin out DMSO within 5 min; resuspend in
fresh medium. Record passage and freeze date on LN₂ map.
        """,
        "Corning cryovials 430489; Mr. Frosty Nalgene 5100-0001; DMSO hybri-max D2650",
        "1 day prep + storage",
        "Slow thaw kills cells—always rapid thaw; DMSO not removed promptly causes loss; "
        "mycoplasma can survive freeze—test before banking master.",
        "Post-thaw viability count; sterility test on thawed aliquot; "
        "mycoplasma PCR before master bank",
        10,
    ),
    _prot(
        "prot_his_sec",
        "Protein purification — His-tag IMAC + SEC",
        "protein_purification_his_sec",
        "recombinant_protein",
        """
Lyse cells in buffer with 20–50 mM imidazole to reduce non-specific binding (20 mM Tris pH
8.0, 300 mM NaCl, 10 mM imidazole, protease inhibitors). Clarify; load onto Ni-NTA resin
(Qiagen 30210) gravity or FPLC. Wash with 20–40 mM imidazole; elute 250–500 mM imidazole
gradient. Pool fractions; concentrate Amicon 10 kDa MWCO; inject onto Superdex 200 Increase
10/300 GL in PBS + 150 mM NaCl + 0.5 mM TCEP. Collect monomer peak; SDS-PAGE + A280 purity;
endotoxin test if in vivo use. Snap-freeze aliquots -80 °C.
        """,
        "Cytiva HisTrap HP 17524701; Superdex 200 Increase 29148721; "
        "Amicon Ultra-15 UFC901024",
        "3–5 days",
        "Aggregates co-elute on SEC—pre-filter 0.22 µm; imidazole absorbance at 280 nm—"
        "use A260/A280 carefully; proteolysis—keep cold and add inhibitors.",
        "Flow-through for binding QC; reduced vs non-reduced gel; "
        "LAL endotoxin if injectable protein",
        13,
    ),
    _prot(
        "prot_alphafold",
        "AlphaFold structure prediction workflow",
        "structure_prediction_alphafold",
        "protein",
        """
Prepare FASTA of canonical UniProt sequence; remove signal peptide if mature chain studied.
Run ColabFold local or AlphaFold2.3 with monomer vs multimer preset based on oligomerization
evidence. Use Amber relaxation on top-ranked model; export PDB + PAE JSON. Compare to known
experimental structures in PDB if available (TM-score). Flag disordered regions (high pLDDT
drop). For complexes, provide paired MSA; document template usage. Deposit models with
metadata for reproducibility (seed, MSA depth, recycles).
        """,
        "ColabFold/AlphaFold2 conda env; MMseqs2 for MSA; NVIDIA A100 recommended",
        "Hours to days depending on length",
        "Multimer models overconfident without crosslinking data; ligands not predicted—"
        "do not interpret active site without docking or crystallography.",
        "Cross-validation with experimental PDB; pLDDT thresholding; "
        "disorder prediction (IUPred) overlay",
        8,
    ),
    _prot(
        "prot_docking",
        "Small-molecule molecular docking protocol",
        "molecular_docking",
        "protein_ligand",
        """
Prepare protein: remove waters/heterogens except structural ions; protonate at assay pH
(H++ or PDB2PQR). Generate binding site (co-crystal ligand box + 8 Å) or cavity detection.
Prepare ligands: enumerate tautomers/protonation states with Open Babel or Schrödinger Epik.
Run Glide SP/XP, AutoDock Vina, or GNINA with exhaustiveness ≥8. Cluster poses by RMSD;
compare Glide gscore or Vina affinity estimates. Re-rank top poses with MM-GBSA on prime if
licensed. Report protein preparation steps and protonation assumptions explicitly.
        """,
        "Schrödinger Maestro; AutoDock Vina 1.1.2; Open Babel 3.1; UCSF ChimeraX",
        "1–3 days per target library",
        "Crystal structure ≠ physiological conformation; scoring functions weak for "
        "charged species; neglect of entropy mis-ranks flexible ligands.",
        "Redock co-crystal ligand (RMSD <2 Å); decoy enrichment (DUD-E); "
        "positive control known binder if available",
        12,
    ),
    _prot(
        "prot_mouse_gavage",
        "Oral gavage in mice (acute dosing)",
        "mouse_gavage",
        "mouse",
        """
Fast or non-fast per IRB/IACUC protocol. Weigh mouse; select flexible gavage needle (18–22 G)
length based on esophageal depth (~2.5–3 cm for 20–25 g mouse). Restrain scruff with line of
sight to diaphragm; gently advance along roof of mouth into esophagus—never force if
resistance (tracheal intubation risk). Deliver volume ≤10 mL/kg (typically 100–200 µL).
Observe recovery; monitor for dyspnea (intratracheal mis-dose). Document technician training
credits and lot numbers of test article formulation.
        """,
        "Instech feeding needles FMJ-20-12; syringes 1 mL TB; "
        "test article vehicle matched to PK studies",
        "Daily or per dosing schedule",
        "Esophageal perforation if animal struggles—train on cadavers first; "
        "aspiration if volume too large or too fast.",
        "Vehicle-only sham; positive control article if efficacy study; "
        "pre-dose body weight trending",
        8,
    ),
    _prot(
        "prot_fix_section",
        "Tissue fixation, embedding, and microtomy",
        "histology_fixation_sectioning",
        "tissue",
        """
Harvest tissue within 5 min of euthanasia; immerse in 10% neutral-buffered formalin 10–20×
tissue volume for 24–48 h at RT on rocker. Transfer to 70% ethanol for storage/processing.
Dehydrate through graded ethanol, clear xylene or xylene substitute, infiltrate paraffin
56–58 °C. Embed oriented in cassette; cool blocks. Section 4–6 µm on microtome; float on warm
water bath; mount on charged slides (Superfrost Plus). Bake 60 °C 1 h. Store at RT protected
from dust until staining.
        """,
        "Fisher SF100-4 NBF; Leica TP1020 processor; Sakura Tissue-Tek VIP; "
        "Superfrost Plus 4951PLUS4",
        "3–5 days turnaround",
        "Over-fixation masks epitopes; under-fixation causes autolysis; "
        "folds/creases from water bath temperature wrong.",
        "Known positive tissue control slide; omit-primary antibody control for IHC later; "
        "orientation photo of cassette",
        14,
    ),
    _prot(
        "prot_if_staining",
        "Immunofluorescence on FFPE or cryosections",
        "immunofluorescence",
        "tissue_cells",
        """
Deparaffinize xylene → ethanol series; antigen retrieval (citrate pH 6.0 pressure cooker or
Tris-EDTA pH 9.0) per antibody datasheet. Block 1 h 5% normal serum species-matched in PBS.
Primary overnight 4 °C in humid chamber. PBS wash; fluorescent secondary 1 h RT dark.
Counterstain nuclei DAPI; mount aqueous antifade (ProLong Gold P36930). Image confocal with
consistent laser power; use same LUT scaling across genotypes. For cryo, fix cold acetone
10 min before blocking.
        """,
        "Cell Signaling Cleaved Caspase-3 Asp175 #9661; Alexa Fluor secondaries A-11034; "
        "ProLong Gold P36930",
        "2 days",
        "Autofluorescence in lung/liver—use spectral unmixing or quench; "
        "bleed-through—single-stain controls essential.",
        "Secondary-only control; isotype control for surface markers; "
        "positive tissue control",
        13,
    ),
    _prot(
        "prot_cfu",
        "Colony forming unit (CFU) enumeration",
        "cfu_assay",
        "bacteria",
        """
Prepare serial 10-fold dilutions in sterile saline or PBS from broth culture or homogenized
tissue slurry (stomacher + diluent). Plate duplicate or triplicate 10 or 100 µL spots or pour
plates. Use selective media (e.g. MacConkey) vs non-selective (TSA) as design requires. Incubate
aerobic/anaerobic per organism. Count 30–300 CFU per plate for statistical validity. Calculate
CFU/mL or CFU/g tissue with dilution factor and homogenate weight. Log-transform for ANOVA
comparisons. Document plating technician and incubator map position.
        """,
        "BD TSA 221283; MacConkey II 212123; sterile saline; stomacher bags",
        "Overnight to 48 h incubation",
        "Spreaders too hot kill cells; clumping causes undercount—vortex gently with glass "
        "beads if needed; edge drying on plates.",
        "Positive strain QC plate; media sterility plate; diluent-only negative; "
        "technical replicate agreement check",
        11,
    ),
    _prot(
        "prot_biofilm",
        "Biofilm formation assay (microtiter crystal violet)",
        "biofilm_assay",
        "bacteria",
        """
Inoculate 1:100 overnight culture into biofilm-promoting medium (e.g. tryptic soy + 1%
glucose) in flat-bottom 96-well plate; incubate static 37 °C 24–48 h. Remove planktonic cells
by aspiration; wash PBS gently 3× without disturbing biofilm. Fix with methanol 15 min or
heat-fix. Stain 0.1% crystal violet 15 min; wash until clear in negative wells. Solubilize
with 33% acetic acid or ethanol; read 570 nm. Normalize to crystal violet biomass vs crystal
violet protein (BCA lysate) if comparing different growth yields.
        """,
        "Corning 3596 flat-bottom; crystal violet C0775; acetic acid glacial",
        "2–3 days",
        "Shear during wash removes weak biofilms—standardize aspiration height; "
        "edge wells higher OD—exclude or average separately.",
        "Planktonic-only strain negative; media blank; positive biofilm former "
        "(e.g. PAO1) control",
        10,
    ),
    _prot(
        "prot_checkerboard",
        "Checkerboard synergy assay (FIC indices)",
        "checkerboard_synergy",
        "bacteria_fungi",
        """
Prepare 2-fold serial dilutions of drug A along rows and drug B along columns in 96-well
broth microdilution per CLSI M100/M27. Inoculate standardized inoculum. Incubate and read MIC
endpoints as turbidity. Calculate fractional inhibitory concentration (FIC) for each well at
first inhibitory combination; FICindex = FICA + FICB. Synergy typically FICindex ≤0.5;
antagonism ≥4. Graph isobolograms from raw OD if using sub-MIC gradient. Include single-agent
MIC on same plate for reference.
        """,
        "Same as CLSI M07 reagents; custom drug stock plates; sterile 96-well U-bottom",
        "2 days",
        "Drug–drug chemical incompatibility precipitates—visual inspect wells before read; "
        "trailing endpoints misread synergy.",
        "Each drug alone MIC on plate; growth control; sterility; "
        "QC organism MIC check",
        12,
    ),
    _prot(
        "prot_admet_microsomal",
        "ADMET — hepatic microsomal stability (t½, Clint)",
        "admet_microsomal_stability",
        "liver_microsomes",
        """
Thaw pooled human liver microsomes on ice (0.5–1 mg/mL final protein). Pre-warm reaction
buffer (50 mM potassium phosphate pH 7.4, 3.3 mM MgCl₂, 1 mM NADPH regenerating system:
glucose-6-phosphate + G6PDH + NADP⁺). Start reaction adding microsomes + test compound (1 µM
typical); aliquot 30 µL at 0, 5, 15, 30, 45, 60 min into acetonitrile + IS to quench. Spin
protein precipitate; inject supernatant LC-MS/MS MRM. Fit log-linear decay for t½; calculate
intrinsic clearance Clint. Include positive control (e.g. verapamil) and negative (heat-
inactivated microsomes) to validate enzyme activity batch-to-batch.
        """,
        "Corning human liver microsomes 452056; NADPH regenerating system R7900; "
        "ACN LC-MS grade",
        "1 assay day + LC-MS queue",
        "Nonspecific binding to microsomal protein underestimates clearance—"
        "measure fu_mic; depletion >80% in first timepoint loses kinetics.",
        "Heat-inactivated control; positive substrate control; "
        "zero-time stability in buffer without NADPH",
        11,
    ),
    _prot(
        "prot_echem_biosensor",
        "Electrochemical biosensor fabrication (3-electrode)",
        "electrochemical_biosensor",
        "sensor",
        """
Polish glassy carbon working electrode (GC) with alumina slurries 1 → 0.3 µm; sonicate;
dry. Drop-cast or electropolymerize recognition layer (e.g. chitosan + enzyme + mediator).
Condition in PBS cyclic voltammetry until stable background. Run chronoamperometry or DPV
with Ag/AgCl reference and Pt counter in Faraday cage. Calibrate vs known analyte spikes in
matrix-matched buffer. Store dry 4 °C with desiccant if disposable chips. Document Eapp,
sampling rate, and filter settings for GLP traceability.
        """,
        "CH Instruments 660E; BASi MF-2012 GC electrodes; chitosan C3646; "
        "HRP or GOx enzyme per assay",
        "3–7 days including curing",
        "Mediator leaching drifts baseline; biofouling in serum—use BSA blocking or "
        "dialysis membrane; oxygen interference for oxidase sensors.",
        "Nafion or dialysis membrane negative control; "
        "known analyte spike recovery; inter-chip CV%",
        14,
    ),
]


REAGENT_SEEDS: list[dict] = [
    {
        "id": "reag_mhb_bd",
        "text": (
            "Mueller–Hinton broth powder cation-adjusted for CLSI antimicrobial testing. "
            "Dissolve 21 g per liter; autoclave. Cat BD 211443."
        ),
        "metadata": {"vendor": "BD", "catalog": "211443", "unit_price_usd": "42", "spec": "500g"},
    },
    {
        "id": "reag_u_bottom_96",
        "text": "Corning Costar sterile 96-well U-bottom plates for broth microdilution MIC.",
        "metadata": {"vendor": "Corning", "catalog": "3599", "unit_price_usd": "120", "spec": "50/cs"},
    },
    {
        "id": "reag_fitc_d4",
        "text": "FITC–dextran 4 kDa for intestinal permeability assays in rodents.",
        "metadata": {"vendor": "Sigma", "catalog": "FD4", "unit_price_usd": "185", "spec": "1g"},
    },
    {
        "id": "reag_mtt",
        "text": "MTT cell proliferation reagent for colorimetric viability.",
        "metadata": {"vendor": "Sigma", "catalog": "M2128", "unit_price_usd": "95", "spec": "5g"},
    },
    {
        "id": "reag_pvdf",
        "text": "Immobilon-P PVDF membrane 0.45 µm for western transfer.",
        "metadata": {"vendor": "Millipore", "catalog": "IPVH00010", "unit_price_usd": "350", "spec": "10/pk"},
    },
    {
        "id": "reag_ripa",
        "text": "RIPA lysis buffer for whole-cell protein extraction prior to western.",
        "metadata": {"vendor": "Thermo", "catalog": "89900", "unit_price_usd": "210", "spec": "1L"},
    },
    {
        "id": "reag_elisa_il6",
        "text": "Mouse IL-6 DuoSet sandwich ELISA capture/detection antibodies and standards.",
        "metadata": {"vendor": "R&D Systems", "catalog": "DY406", "unit_price_usd": "520", "spec": "15 plates"},
    },
    {
        "id": "reag_annexin",
        "text": "Annexin V apoptosis detection kit with binding buffer for flow cytometry.",
        "metadata": {"vendor": "BD Biosciences", "catalog": "556547", "unit_price_usd": "380", "spec": "100 tests"},
    },
    {
        "id": "reag_sybr",
        "text": "PowerUp SYBR Green Master Mix for qPCR with hot-start polymerase.",
        "metadata": {"vendor": "Applied Biosystems", "catalog": "A25742", "unit_price_usd": "290", "spec": "5mL"},
    },
    {
        "id": "reag_cas9_rnp",
        "text": "Alt-R S.p. Cas9 Nuclease V3 for ribonucleoprotein CRISPR editing.",
        "metadata": {"vendor": "IDT", "catalog": "1081058", "unit_price_usd": "95", "spec": "100µg"},
    },
    {
        "id": "reag_ninta",
        "text": "Ni-NTA agarose resin for His-tagged protein purification by IMAC.",
        "metadata": {"vendor": "Qiagen", "catalog": "30210", "unit_price_usd": "310", "spec": "100mL"},
    },
    {
        "id": "reag_superdex200",
        "text": "Superdex 200 Increase 10/300 GL SEC column for polishing recombinant proteins.",
        "metadata": {"vendor": "Cytiva", "catalog": "29148721", "unit_price_usd": "5200", "spec": "1 column"},
    },
    {
        "id": "reag_gavage_needle",
        "text": "Flexible 20G × 1.5 in mouse oral gavage needles with 1 mL syringe fit.",
        "metadata": {"vendor": "Instech", "catalog": "FMJ-20-12", "unit_price_usd": "180", "spec": "10 pk"},
    },
    {
        "id": "reag_superfrost",
        "text": "Charged microscope slides for IHC/IF tissue adherence.",
        "metadata": {"vendor": "Fisher", "catalog": "4951PLUS4", "unit_price_usd": "95", "spec": "144/cs"},
    },
    {
        "id": "reag_crystal_violet",
        "text": "Crystal violet powder for biofilm biomass staining in microtiter assays.",
        "metadata": {"vendor": "Sigma", "catalog": "C0775", "unit_price_usd": "35", "spec": "25g"},
    },
    {
        "id": "reag_hlm_pool",
        "text": "Pooled human liver microsomes 150 donors for ADMET stability studies.",
        "metadata": {"vendor": "Corning", "catalog": "452056", "unit_price_usd": "890", "spec": "0.5mL 20mg/mL"},
    },
    {
        "id": "reag_trypsin_edta",
        "text": "0.25% Trypsin-EDTA for adherent cell detachment prior to passaging or assays.",
        "metadata": {"vendor": "Gibco", "catalog": "25200056", "unit_price_usd": "48", "spec": "100mL"},
    },
    {
        "id": "reag_pbs_tablets",
        "text": "Dulbecco PBS tablets dissolved in ultrapure water for cell wash buffers.",
        "metadata": {"vendor": "Sigma", "catalog": "P4417", "unit_price_usd": "42", "spec": "100 tablets"},
    },
]


GRANT_SEEDS: list[dict] = [
    {
        "id": "grant_niaid_r21",
        "text": (
            "NIH NIAID R21 exploratory/developmental grants for high-risk infectious disease "
            "mechanism studies. Typical budget $275k–$400k direct per year × 2 years. "
            "Review criteria: significance, innovation, approach, investigator, environment. "
            "Preliminary data encouraged but not required vs R01."
        ),
        "metadata": {"agency": "NIH", "mechanism": "R21", "focus": "infectious_disease"},
    },
    {
        "id": "grant_nigms_r35",
        "text": (
            "NIGMS MIRA R35 provides 5 years consolidated support for established investigators "
            "in basic cell biology, pharmacology, physiology. Emphasis on scientific breadth "
            "and rigor rather than specific aims micromanagement."
        ),
        "metadata": {"agency": "NIH", "mechanism": "R35", "focus": "basic_biomedical"},
    },
    {
        "id": "grant_darpa_amr",
        "text": (
            "DARPA BAA topics periodically target AMR diagnostics and novel therapeutics with "
            "fast-track milestones, cost-sharing, and go/no-go gates. Strong commercialization "
            "path and team with GMP experience scored highly."
        ),
        "metadata": {"agency": "DARPA", "mechanism": "BAA", "focus": "AMR_diagnostics"},
    },
    {
        "id": "grant_wellcome_discovery",
        "text": (
            "Wellcome Discovery Awards support bold infection and immunity science internationally. "
            "Emphasis on open science, public engagement, and LMIC equity. Multi-year budgets "
            "with inflation-linked adjustments."
        ),
        "metadata": {"agency": "Wellcome", "mechanism": "Discovery", "focus": "immunity"},
    },
    {
        "id": "grant_cdc_baa",
        "text": (
            "CDC Office of Advanced Molecular Detection broad agency announcements for "
            "genomic surveillance innovation including bioinformatics pipelines and "
            "reference-lab interoperability."
        ),
        "metadata": {"agency": "CDC", "mechanism": "BAA", "focus": "surveillance"},
    },
    {
        "id": "grant_nsf_cbet",
        "text": (
            "NSF CBET biosensing, bioprocessing, and reaction engineering including "
            "electrochemical sensors and microfluidic diagnostics for environmental monitoring."
        ),
        "metadata": {"agency": "NSF", "mechanism": "CBET", "focus": "biosensing"},
    },
    {
        "id": "grant_dod_cdmerp",
        "text": (
            "DoD CDMRP programs target combat-relevant infectious disease and chronic wound "
            "research with congressionally directed topic areas and peer-reviewed panels."
        ),
        "metadata": {"agency": "DoD", "mechanism": "CDMRP", "focus": "wound_infection"},
    },
    {
        "id": "grant_bartha_foundation",
        "text": (
            "Private foundation grants for early-stage antimicrobial resistance translational "
            "projects; LOI required; preference for academic–industry partnerships and "
            "clear milestone-based budgets."
        ),
        "metadata": {"agency": "Foundation", "mechanism": "RFP", "focus": "AMR_translation"},
    },
]


FEEDBACK_SEEDS: list[dict] = [
    {
        "id": "feedback_seed_mic_1",
        "text": (
            "In mic_assay experiments, protocol_step_inoculum: "
            "WRONG: Prepare inoculum at 1×10⁶ CFU/mL in MH broth "
            "CORRECT: Prepare inoculum at 5×10⁵ CFU/mL per CLSI M07 "
            "REASON: Higher inoculum falsely elevates MIC endpoints."
        ),
        "metadata": {
            "experiment_type": "mic_assay",
            "section": "protocol_step_inoculum",
            "reviewer_role": "PI",
            "severity": "high",
        },
    },
    {
        "id": "feedback_seed_mic_2",
        "text": (
            "In mic_assay experiments, reagent_vehicle: "
            "WRONG: DMSO vehicle at 2% v/v final "
            "CORRECT: DMSO ≤0.5% v/v final "
            "REASON: DMSO inhibits growth and confounds MIC readout."
        ),
        "metadata": {
            "experiment_type": "mic_assay",
            "section": "reagent_vehicle",
            "reviewer_role": "PI",
            "severity": "high",
        },
    },
    {
        "id": "feedback_seed_wb_1",
        "text": (
            "In western_blot experiments, protocol_step_blocking: "
            "WRONG: Block with 5% milk for phospho-epitope primary "
            "CORRECT: Block with 5% BSA in TBST for phospho antibodies "
            "REASON: Milk phosphoproteins compete away phospho signal."
        ),
        "metadata": {
            "experiment_type": "western_blot",
            "section": "protocol_step_blocking",
            "reviewer_role": "postdoc",
            "severity": "medium",
        },
    },
]
