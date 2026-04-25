/**
 * Timed demo events for usePraxisStream.runDemo() — gut barrier / LGG hypothesis.
 * Zero network I/O; consumed only by the hook.
 */

export const DEMO_HYPOTHESIS =
  "Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG " +
  "for 4 weeks will reduce intestinal permeability by at least " +
  "30% compared to controls, measured by FITC-dextran assay, " +
  "due to upregulation of tight junction proteins claudin-1 and occludin.";

export interface DemoTimedEvent {
  delay_ms: number;
  type: string;
  data: Record<string, unknown>;
}

function demoPapers() {
  return [
    {
      pmid: "37881234",
      title: "Lactobacillus rhamnosus GG attenuates DSS-induced colonic permeability in mice",
      authors: "Patel S, et al.",
      journal: "Gut Microbes",
      year: 2023,
      abstract:
        "Oral LGG preserved ZO-1 and occludin junctional localization and reduced serum LPS after 14 days of DSS.",
      relevance_score: 0.94,
      quantitative_claims: [
        { type: "fold_change", value: 0.42, unit: "vs control", target: "FITC-dextran flux" },
        { type: "expression", value: 1.8, unit: "fold", target: "occludin mRNA" },
      ],
    },
    {
      pmid: "36590122",
      title: "FITC-dextran gavage as a standardized readout of small intestinal permeability",
      authors: "Lee M, Chen W",
      journal: "American Journal of Physiology",
      year: 2022,
      abstract:
        "Method comparison across molecular weights; 4 kDa FITC-dextran optimized for jejunal leak detection.",
      relevance_score: 0.88,
      quantitative_claims: [
        { type: "dose", value: 600, unit: "mg/kg", target: "FITC-dextran (4 kDa)" },
      ],
    },
    {
      pmid: "36004411",
      title: "Claudin-1 genetic variants associate with IBD risk loci",
      authors: "Nguyen T, et al.",
      journal: "Nature Communications",
      year: 2023,
      abstract: "GWAS meta-analysis links CLDN1 expression QTLs to disease severity scores.",
      relevance_score: 0.81,
      quantitative_claims: [{ type: "odds_ratio", value: 1.12, unit: "OR", target: "IBD" }],
    },
    {
      pmid: "35120009",
      title: "Probiotic dosing windows that maximize mucosal colonization in rodents",
      authors: "Romano C, et al.",
      journal: "Microbiome",
      year: 2021,
      abstract: "Twice-daily gavage for 28 days yielded stable ileal LGG recovery without dysbiosis.",
      relevance_score: 0.76,
      quantitative_claims: [{ type: "duration", value: 28, unit: "days", target: "LGG gavage" }],
    },
  ];
}

function demoScripts() {
  return [
    {
      filename: "fitc_dextran_flux.py",
      language: "python",
      description: "Normalize serum FITC signal to standard curve and compare groups (LGG vs vehicle).",
      code: `# PRAXIS demo — FITC-dextran analysis\nimport numpy as np\nimport pandas as pd\n\ndef auc_ratio(trt, veh):\n    return float(np.mean(trt) / np.mean(veh))\n`,
      dependencies: ["numpy", "pandas"],
      line_count: 8,
    },
    {
      filename: "tight_junction_qpcr.py",
      language: "python",
      description: "ΔΔCt workflow for Cldn1, Ocln, Tjp1 with Hprt housekeeping.",
      code: `# PRAXIS demo — qPCR\nfrom dataclasses import dataclass\n\n@dataclass\nclass GeneResult:\n    gene: str\n    fold_change: float\n`,
      dependencies: ["pandas"],
      line_count: 6,
    },
    {
      filename: "barrier_volcano.R",
      language: "R",
      description: "Volcano plot of jejunal transcriptome (LGG vs vehicle; DESeq2).",
      code: `# PRAXIS demo — R\nlibrary(DESeq2)\n# counts <- read.csv("counts.csv")\n`,
      dependencies: ["DESeq2", "ggplot2"],
      line_count: 5,
    },
  ];
}

function demoProtocolSteps() {
  return [
    { step_number: 1, title: "Power calculation", description: "n=12/group for 30% permeability reduction (α=0.05, power 0.8).", equipment: ["G*Power"], controls: [], notes: "Pre-register primary endpoint." },
    { step_number: 2, title: "Animal housing", description: "C57BL/6 males 8 wk; 12h light cycle; thermoneutral cage enrichment.", temperature: "22 ± 1°C", duration: "acclimation 7 d", equipment: ["IVC racks"], controls: [], notes: "AAALAC-compliant facility." },
    { step_number: 3, title: "LGG preparation", description: "ATCC 53103 culture; 1×10^9 CFU per mouse per day in 200 µL PBS.", volumes: { gavage: "200 µL" }, duration: "28 d", equipment: ["biosafety cabinet"], controls: ["heat-killed LGG"], notes: "CFU plating weekly on MRS." },
    { step_number: 4, title: "FITC-dextran assay", description: "4 kDa FITC-dextran 600 mg/kg oral gavage; serum sampling at 4 h.", volumes: { blood: "50 µL" }, temperature: "37°C", duration: "4 h endpoint", equipment: ["plate reader 485/528 nm"], controls: ["naive + vehicle"], notes: "Randomize gavage order." },
    { step_number: 5, title: "Western blot — junction proteins", description: "Jejunal scrapes; RIPA lysis; SDS-PAGE for claudin-1, occludin, ZO-1.", duration: "2 d", equipment: ["chemiluminescence imager"], controls: ["β-actin loading"], notes: "Blinded densitometry." },
    { step_number: 6, title: "Immunofluorescence", description: "Frozen sections; anti-claudin-1 AF488; confocal z-stacks.", temperature: "4°C overnight", duration: "48 h", equipment: ["confocal microscope"], controls: ["isotype control"], notes: "Quantify linear junction index." },
    { step_number: 7, title: "16S profiling (optional)", description: "Ileal luminal contents; V4 amplicon sequencing.", duration: "3 wk turnaround", equipment: ["MiSeq"], controls: ["extraction blanks"], notes: "Link diversity to permeability." },
    { step_number: 8, title: "Statistics", description: "Two-way ANOVA (treatment × time) with Holm-Šidák post-tests.", equipment: ["GraphPad / R"], controls: [], notes: "Pre-specify one-sided test on primary." },
  ];
}

function demoReagents() {
  /* 18 lines; line totals sum to exactly $6,841 (demo budget target). */
  const totals = [2648, 441, 221, 662, 331, 221, 221, 110, 221, 110, 441, 221, 221, 221, 221, 110, 110, 110];
  const rows = [
    { name: "C57BL/6 male mice (8 wk)", vendor: "Charles River", cat: "027", unit: "cage-week", phase: "P1" },
    { name: "LGG ATCC 53103 lyophilized", vendor: "ATCC", cat: "53103", unit: "vial", phase: "P1" },
    { name: "FITC-dextran (4 kDa)", vendor: "Sigma", cat: "46944", unit: "1 g", phase: "P1" },
    { name: "PBS tablets", vendor: "Thermo", cat: "10010023", unit: "L", phase: "P1" },
    { name: "Gavage needles 22G", vendor: "Kent Scientific", cat: "NP22", unit: "box", phase: "P1" },
    { name: "Anti-claudin-1 rabbit mAb", vendor: "Invitrogen", cat: "37-4900", unit: "100 µL", phase: "P2" },
    { name: "Anti-occludin", vendor: "Abcam", cat: "ab31721", unit: "100 µg", phase: "P2" },
    { name: "HRP anti-rabbit IgG", vendor: "Cell Signaling", cat: "7074S", unit: "100 mL", phase: "P2" },
    { name: "RIPA buffer", vendor: "Thermo", cat: "89900", unit: "500 mL", phase: "P2" },
    { name: "Protease inhibitor cocktail", vendor: "Roche", cat: "11836170001", unit: "10 mL", phase: "P2" },
    { name: "PVDF membranes 0.45 µm", vendor: "Bio-Rad", cat: "1620177", unit: "pk/10", phase: "P2" },
    { name: "ECL substrate", vendor: "Cytiva", cat: "RPN2232", unit: "500 mL", phase: "P2" },
    { name: "DAPI mounting medium", vendor: "Vector", cat: "H-1200", unit: "kit", phase: "P2" },
    { name: "OCT compound", vendor: "Sakura", cat: "4583", unit: "case", phase: "P2" },
    { name: "DNA stool mini kit", vendor: "Qiagen", cat: "51504", unit: "50 rxn", phase: "P3" },
    { name: "NEBNext Ultra II DNA Library Prep", vendor: "NEB", cat: "E7645S", unit: "96 rxn", phase: "P3" },
    { name: "MiSeq reagent kit v3", vendor: "Illumina", cat: "MS-102-3003", unit: "600 cycles", phase: "P3" },
    { name: "GraphPad Prism license", vendor: "GraphPad", cat: "SUB-1YR", unit: "1 seat", phase: "P3" },
  ];
  return rows.map((r, i) => {
    const total_cost = totals[i];
    return {
      id: `r-${i + 1}`,
      name: r.name,
      vendor: r.vendor,
      catalog_number: r.cat,
      unit_price: total_cost,
      unit: r.unit,
      quantity_needed: 1,
      total_cost,
      phase: r.phase,
      assay_type: "gut_permeability",
    };
  });
}

function demoTimeline() {
  const tasks = [
    ["IACUC submission & approval", 0, 3, "admin", true, true],
    ["Animal order & acclimation", 2, 5, "in_vivo", true, false],
    ["LGG dosing + daily monitoring", 5, 9, "in_vivo", true, false],
    ["FITC-dextran primary endpoint", 9, 10, "assay", true, true],
    ["Western + IF cohort 1", 8, 12, "assay", false, false],
    ["16S library prep", 10, 14, "omics", false, false],
    ["Bioinformatics QC", 14, 16, "analysis", false, false],
    ["Manuscript figure lock", 16, 18, "reporting", true, true],
    ["Regulatory consult (optional IND-style)", 12, 20, "admin", false, false],
  ] as const;
  return tasks.map(([task, ws, we, phase, cp, ms], i) => ({
    id: `tl-${i + 1}`,
    task,
    week_start: ws,
    week_end: we,
    phase,
    is_critical_path: cp,
    milestone: ms,
    parallel_with: null as string | null,
    cost_range: undefined as string | undefined,
    description: undefined as string | undefined,
    dependencies: [] as string[],
  }));
}

function demoFunding() {
  const mk = (
    id: string,
    name: string,
    org: string,
    type: string,
    amin: number,
    amax: number,
    deadline: string,
    fit: number,
    rationale: string,
    met: string[],
    miss: string[],
  ) => ({
    id,
    name,
    organization: org,
    type,
    amount_min: amin,
    amount_max: amax,
    follow_on_max: amax * 2,
    deadline,
    next_review: "Jun 2026",
    fit_score: fit,
    fit_rationale: rationale,
    fit_breakdown: { disease_area: 92, stage_alignment: 88, evidence_required: 84, technology_fit: 90 },
    requirements_met: met,
    requirements_missing: miss,
    url: "https://grants.nih.gov/",
  });
  return [
    mk("nih-gut-r21", "R21 — Microbiome & barrier function", "NIH NIDDK", "federal", 275000, 400000, "2026-08-01", 91, "Strong fit: mechanistic barrier biology + probiotic intervention.", ["PI eligibility"], ["human subjects N/A"]),
    mk("crohns-foundation", "Research fellowship — IBD mechanisms", "Crohn's & Colitis Foundation", "private", 180000, 260000, "2026-05-15", 84, "Gut permeability aligns with IBD science priorities.", ["animal model"], ["patient cohort"]),
    mk("afs-grant", "Agricultural Microbiome Health", "USDA AFRI", "federal", 350000, 650000, "rolling", 76, "LGG is GRAS-listed; translational angle to livestock barrier optional.", [], ["co-PI with ag school"]),
    mk("wellcome-discovery", "Discovery Award — Host-microbe", "Wellcome Trust", "private", 500000, 2000000, "2026-09-01", 72, "Bold science on mucosal defense; UK/EU eligibility constraints.", ["open data"], ["UK lead institution"]),
    mk("startup-seed", "University translational seed", "Internal seed fund", "academic", 50000, 75000, "2026-04-30", 64, "Bridge funding for pilot permeability cohort expansion.", ["institutional match"], ["matching funds"]),
  ];
}

export const DEMO_EVENTS: DemoTimedEvent[] = [
  { delay_ms: 400, type: "context", data: { target: "Claudin-1 / occludin", organism: "Mus musculus", assay_type: "FITC-dextran permeability", disease_context: "gut_barrier", stage: "validation", stage_confidence: 0.91 } },
  {
    delay_ms: 1400,
    type: "novelty",
    data: {
      signal: "similar_exists",
      summary: "Several LGG + DSS models exist; fewer studies isolate FITC-dextran with junctional protein kinetics as co-primary endpoints.",
      references: [
        { title: "Probiotic barrier trials in mice (review)", authors: "Costello ME", year: "2022", url: "https://pubmed.ncbi.nlm.nih.gov/", pmid: "35120009" },
        { title: "FITC-dextran standardization", authors: "Lee M", year: "2022", url: "https://pubmed.ncbi.nlm.nih.gov/", pmid: "36590122" },
      ],
    },
  },
  { delay_ms: 2400, type: "literature", data: { papers: demoPapers() } },
  { delay_ms: 3200, type: "bioinformatics", data: { scripts: demoScripts() } },
  { delay_ms: 4000, type: "protocol", data: { steps: demoProtocolSteps() } },
  {
    delay_ms: 4800,
    type: "reagents",
    data: (() => {
      const items = demoReagents();
      const budget_total = Math.round(items.reduce((s, r) => s + r.total_cost, 0) * 100) / 100;
      return {
        items,
        budget_total,
        phase_breakdown: { P1: Math.round(budget_total * 0.42), P2: Math.round(budget_total * 0.38), P3: Math.round(budget_total * 0.2) },
        vendor_count: new Set(items.map((i) => i.vendor)).size,
        estimated_weeks: 18,
      };
    })(),
  },
  {
    delay_ms: 5400,
    type: "timeline",
    data: { items: demoTimeline(), total_weeks: 20, critical_path_weeks: 14 },
  },
  {
    delay_ms: 6200,
    type: "funding",
    data: { opportunities: demoFunding(), total_addressable_usd: 3_200_000 },
  },
  {
    delay_ms: 6800,
    type: "gtm",
    data: {
      current_stage: "T2",
      ind_timeline_months: 0,
      regulatory_pathway: "Dietary supplement / GRAS self-affirmation pathway for LGG; no IND for murine academic study.",
      qidp_eligible: false,
      fast_track_eligible: false,
      market_sizing_note: "Global probiotics ~$62B TAM; research-grade LGG reagents niche ~$120M serviceable.",
      milestones: [
        { name: "Pilot barrier data package", month_start: 0, month_end: 6, phase: "validation", cost_range: "$80k–$140k", is_current: true },
        { name: "IND-enabling tox only if humanized", month_start: 6, month_end: 24, phase: "preclinical", cost_range: "N/A" },
      ],
    },
  },
  {
    delay_ms: 7600,
    type: "tamarind",
    data: {
      protein_name: "Claudin-1",
      organism: "Mus musculus",
      mutation_label: "wild-type",
      pdb_string: null,
      pdb_url: "https://www.rcsb.org/structure/1P79",
      confidence_score: 88,
      residue_count: 211,
      mutation_sites: [],
      source: "rcsb",
      docking_results: [
        {
          compound_name: "Lactobacillus-secreted metabolite (TBA)",
          binding_affinity_kcal: -6.2,
          rmsd: 1.1,
          pose_count: 12,
          interacting_residues: ["Y158", "Q192"],
          confidence: "medium",
        },
      ],
    },
  },
  {
    delay_ms: 8200,
    type: "audit",
    data: {
      flags: [
        { id: "f-001", severity: "high", title: "Blinding", detail: "Operator not blinded to treatment during FITC bleed.", field_source: "protocol", suggested_fix: "Use coded tubes + second operator." },
        { id: "f-002", severity: "medium", title: "Sample size", detail: "n=12 may be underpowered if SD >25% for permeability.", field_source: "statistics", suggested_fix: "Increase to n=15 or tighten inclusion." },
        { id: "f-003", severity: "low", title: "Vendor lock", detail: "Single-source LGG strain.", field_source: "reagents", suggested_fix: "Qualify backup lot." },
      ],
      flag_counts: { high: 1, medium: 1, low: 1 },
    },
  },
  {
    delay_ms: 8600,
    type: "key_finding",
    data: {
      finding: "LGG supplementation is predicted to lower FITC-dextran AUC by ≥30% if claudin-1 membrane intensity increases ≥1.5-fold at day 28.",
      blocking_question: "Does jejunal colonization density correlate with junctional protein fold-change at the primary endpoint?",
    },
  },
  { delay_ms: 9000, type: "complete", data: { program_id: "demo-program-gut-001", completeness_pct: 91, total_duration_seconds: 9, agent_timings: {} } },
];
