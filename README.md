# PRAXIS — AI Research Execution System

<p align="center">
  <img src="praxis.png" alt="PRAXIS logo" width="320" />
</p>

**Live Demo:** https://praxisalautomation.vercel.app

> Type a scientific hypothesis. Get a complete, executable experiment plan in 90 seconds — protocol, reagents, budget, timeline, bioinformatics code, funding opportunities, and protein structure visualization.

Built for **Hack Nation 5th Hackathon 2026 · Challenge 4: AI Scientist OS**

---

## What It Does

PRAXIS closes the gap between scientific curiosity and operational reality. A researcher types a hypothesis in plain English. PRAXIS returns everything needed to walk into a lab on Monday and start running.

**Three stages matching the challenge brief:**

**Stage 1 — Input**
Natural language scientific hypothesis. No structured forms, no dropdowns. Just science.

**Stage 2 — Literature QC**
Before generating the plan, PRAXIS checks whether this experiment has been done before. Tavily and Semantic Scholar (214M papers) are searched in parallel. A novelty signal fires in under 2 seconds:
- `NOT FOUND` — you are breaking new ground
- `SIMILAR EXISTS` — related work found, review before proceeding
- `EXACT MATCH` — this protocol has been published

Up to 3 references with citation counts, influential citation scores, and AI-generated TLDRs from Semantic Scholar.

**Stage 3 — Experiment Plan**
A complete operational plan a real lab could execute:
- **Protocol** — step-by-step SOP with volumes, temperatures, controls, equipment
- **Materials** — real reagent catalog numbers, vendors (Sigma, Thermo, Abcam), current pricing
- **Budget** — line-item cost breakdown by phase, grand total
- **Timeline** — Gantt chart with critical path, milestones, dependencies
- **Validation** — success criteria, audit flags for methodological issues
- **Bioinformatics Code** — runnable Python and R scripts, download ready
- **Protein Structure** — AlphaFold via Tamarind Bio, RCSB fallback
- **Funding Intelligence** — NIH, BARDA, Wellcome Trust — grant fit scored automatically
- **GTM Pathway** — IND timeline, regulatory pathway, market context

**Stretch Goal — Scientist Review Loop**
Every correction a scientist makes improves future plans:
1. Scientist opens review drawer, marks a protocol step as wrong
2. Submits correction with reason (e.g. "CLSI M07 requires 5×10⁵ CFU/mL not 1×10⁶")
3. Correction stored in ChromaDB RAG + SQLite feedback store
4. Next plan for similar experiment type incorporates correction automatically
5. "↳ Applied from N prior reviews" tag visible in the corrected step

---

## Try It

**Live:** https://praxisalautomation.vercel.app

Click **LOAD DEMO** for an instant walkthrough, or paste one of these hypotheses:

```
Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks 
will reduce intestinal permeability by at least 30% compared to controls, 
measured by FITC-dextran assay, due to upregulation of tight junction 
proteins claudin-1 and occludin.
```

```
A paper-based electrochemical biosensor functionalized with anti-CRP 
antibodies will detect C-reactive protein in whole blood at concentrations 
below 0.5 mg/L within 10 minutes, matching laboratory ELISA sensitivity 
without requiring sample preprocessing.
```

```
Replacing sucrose with trehalose as a cryoprotectant in the freezing medium 
will increase post-thaw viability of HeLa cells by at least 15 percentage 
points compared to the standard DMSO protocol, due to trehalose's superior 
membrane stabilization at low temperatures.
```

```
Introducing Sporomusa ovata into a bioelectrochemical system at a cathode 
potential of −400mV vs SHE will fix CO₂ into acetate at a rate of at least 
150 mmol/L/day, outperforming current biocatalytic carbon capture benchmarks 
by at least 20%.
```

---

## Architecture

```
User Browser
     ↓
Vercel CDN → praxisalautomation.vercel.app
     ↓
Railway → praxis-research-terminal-production.up.railway.app
     ↓
  Claude (Anthropic)     — 9-agent pipeline, agentic tool use
  Tavily                 — live literature search + RAG indexing
  Semantic Scholar       — 214M papers, TLDRs, citation authority
  Tamarind Bio           — AlphaFold protein structure prediction
  Modal                  — GPU bioinformatics pipeline execution
  ChromaDB               — RAG vector store (20 protocols seeded)
  SQLite                 — scientist feedback + learning loop
```

**Agent Pipeline (10 agents, streams in real time):**
```
01 CONTEXT        — deterministic hypothesis parsing, zero LLM
02 LITERATURE     — novelty gate + Tavily + Semantic Scholar
03 BIOINFORMATICS — Python/R script generation
04 PROTOCOL       — step-by-step SOP with RAG grounding
05 STRUCTURE      — AlphaFold via Tamarind Bio, RCSB fallback
06 REAGENTS       — catalog lookup, real prices, learning loop
07 TIMELINE       — Gantt with critical path, dependencies
08 FUNDING        — grant scoring, NIH/BARDA/Wellcome fit
09 GTM            — IND pathway, regulatory, market sizing
10 AUDIT          — methodological flags, missing controls
```

**What makes it not just a prompt wrapper:**
- Deterministic parsers run before any LLM sees data
- Claude receives structured context, not raw text
- Every output is evidence-linked to source data
- RAG grounds protocol steps in retrieved published protocols
- Scientist corrections compound over time via few-shot injection

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind, shadcn/ui |
| Backend | FastAPI, Python 3.11, uvicorn |
| LLM | Claude claude-sonnet-4 (Anthropic) — agentic tool use |
| Literature | Tavily API + Semantic Scholar Academic Graph API |
| Compute | Tamarind Bio (AlphaFold), Modal (GPU pipelines) |
| RAG | ChromaDB + allenai-specter embeddings |
| Feedback | SQLite + ChromaDB (learning loop) |
| Frontend Deploy | Vercel |
| Backend Deploy | Railway |

---

## API

```
GET  /health                          — health check
GET  /usage                           — API spend tracking
POST /pipeline/stream                 — main SSE pipeline
GET  /demo                            — pre-built demo (zero API cost)
POST /review/submit                   — scientist correction
GET  /review/stats                    — feedback store stats
GET  /review/corrections/{type}       — corrections by experiment type
GET  /tamarind/test                   — protein structure diagnostic
POST /funding/generate-aims           — NIH specific aims generation
POST /modal/run-script                — execute script on Modal GPU
```

**SSE Events streamed in order:**
```
context → novelty → literature → bioinformatics → protocol →
structure → reagents → timeline → funding → gtm → audit →
key_finding → complete
```

---

## Visualizations

All built with pure SVG, no external chart libraries:

- **Evidence Landscape** — papers plotted on timeline by evidence type, knowledge gap detection
- **Protocol Flow** — Sankey-style step diagram with critical path
- **Gantt Chart** — week-by-week timeline with milestone diamonds
- **Budget Timeline** — cumulative spend curve with ±20% confidence envelope
- **Funding Radar** — multi-grant comparison across 6 fit dimensions
- **Mutation Heatmap** — resistance profile across strains and compounds
- **Docking Score Panel** — binding affinity landscape with interaction fingerprint
- **3D Protein Viewer** — 3Dmol.js with mutation site highlighting

---

## Repo Structure

```
praxis/
├── frontend/                    → Vercel
│   ├── src/
│   │   ├── hooks/
│   │   │   └── usePraxisStream.ts   ← SSE consumer, all state
│   │   ├── praxis/                  ← main UI components
│   │   └── components/
│   │       └── visualizations/      ← 8 SVG visualization components
│   └── vercel.json
│
└── backend/                     → Railway
    ├── main.py                   ← FastAPI + all endpoints
    ├── agents/
    │   ├── orchestrator.py       ← 10-agent pipeline, SSE streaming
    │   ├── context_extractor.py  ← deterministic, zero LLM
    │   ├── literature_agent.py   ← Tavily + S2 + novelty gate
    │   ├── semantic_scholar.py   ← S2 client, 1 req/sec enforced
    │   ├── protocol_agent.py     ← SOP generation + RAG
    │   ├── bioinformatics_agent.py ← code generation
    │   ├── reagent_agent.py      ← catalog + learning loop
    │   ├── tamarind_agent.py     ← AlphaFold + RCSB fallback
    │   ├── funding_agent.py      ← grant scoring
    │   ├── gtm_agent.py          ← IND pathway
    │   ├── timeline_agent.py     ← Gantt generation
    │   ├── assumption_auditor.py ← methodological QC
    │   └── agent_tools.py        ← 8 Claude tools for agentic loop
    ├── rag/
    │   ├── rag_engine.py         ← ChromaDB + SPECTER embeddings
    │   ├── seed_data.py          ← 20 protocols, reagents, grants
    │   └── tavily_indexer.py     ← Tavily → ChromaDB pipeline
    ├── models/
    │   ├── research_program.py   ← typed ResearchProgram anchor object
    │   └── sse_contracts.py      ← validated SSE event shapes
    ├── data/
    │   ├── reagents.json         ← 100 reagents with catalog numbers
    │   ├── grants.json           ← 20 funding opportunities
    │   ├── feedback_store.py     ← SQLite learning loop
    │   └── tamarind_cache.json   ← cached protein structures
    └── modal_runner.py           ← GPU pipeline functions
```

---

## The Learning Loop — How It Works

This is the stretch goal. Here is the exact demo:

1. Run the gut health hypothesis → full plan generates
2. Open **REVIEW PLAN** drawer (top right)
3. Find Protocol Step 2 → mark as **WRONG**
4. Enter correction: `5×10⁵ CFU/mL` (not `1×10⁶`)
5. Enter reason: `CLSI M07 standard for broth microdilution`
6. Submit review
7. Run a similar hypothesis (different probiotic, same assay type)
8. Protocol Step 2 in the new plan already shows `5×10⁵ CFU/mL`
9. Tag visible: `↳ Applied from 1 prior review`

**How it works technically:**
- Correction stored in SQLite (tagged by experiment type)
- Correction embedded via allenai-specter → stored in ChromaDB
- Next protocol generation: RAG retrieves relevant corrections
- Corrections injected as few-shot examples into Claude system prompt
- Claude produces corrected output without being explicitly re-prompted
- No fine-tuning required — retrieval + injection is sufficient

Three expert corrections are pre-seeded so the learning loop works immediately for judges without waiting for real input.

---

## Quality Bar

The challenge asks: *"Would a real scientist trust this plan enough to order the materials and start running it?"*

For the gut health hypothesis, PRAXIS produces:
- 8-step protocol citing CLSI M07 and Cani 2022 (Bio-protocol)
- FITC-dextran FD4 at 600mg/kg — the exact published dose
- 18 reagents with real Sigma/Abcam/Thermo catalog numbers
- $6,841 total budget across 3 phases
- 7-week Gantt with animal acclimatization → immunostaining → statistics
- Claudin-1 antibody: Abcam ab15098 — validated for mouse tissue
- 3 runnable analysis scripts (Python + R)
- NIH NIDDK R21 identified as best-fit grant (88/100)
- 3 methodological audit flags including power calculation gap

That is the bar. That is what PRAXIS delivers.

---

## Contact

Built by **Akhi Chappidi**
Hack Nation 5th Hackathon 2026 · Challenge 4 · AI Scientist OS
Powered by Anthropic · Tavily · Semantic Scholar · Tamarind Bio · Modal
