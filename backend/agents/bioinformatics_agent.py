from __future__ import annotations

from backend.models.research_program import GeneratedScript, ResearchProgram


def _py_script(name: str, body: str, description: str) -> GeneratedScript:
    return GeneratedScript(filename=name, language="python", content=body, description=description)


def _r_script(name: str, body: str, description: str) -> GeneratedScript:
    return GeneratedScript(filename=name, language="r", content=body, description=description)


def _scripts_for_assay(assay_type: str) -> list[GeneratedScript]:
    common_header = "# USER: replace this path with your dataset\nDATA_PATH = \"./data/input.csv\"\n"
    if assay_type == "mic_assay":
        return [
            _py_script(
                "resistance_analysis.py",
                f"""import pandas as pd
import scipy.stats as stats
import matplotlib.pyplot as plt

{common_header}
df = pd.read_csv(DATA_PATH)
# Calculate group-wise resistance summary.
summary = df.groupby("condition")["mic_value"].describe()
print(summary)
# Mann-Whitney U test for two primary groups.
u, p = stats.mannwhitneyu(df[df["condition"]=="control"]["mic_value"], df[df["condition"]=="treated"]["mic_value"])
print({{"u_stat": u, "p_value": p}})
""",
                "Analyzes MIC distributions and group differences.",
            ),
            _py_script(
                "volcano_plot.py",
                """import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# USER: replace this path with differential results table.
DE_PATH = "./data/differential.csv"
df = pd.read_csv(DE_PATH)
df["neg_log10_p"] = -np.log10(df["pvalue"].clip(lower=1e-300))
plt.scatter(df["log2fc"], df["neg_log10_p"], s=10, alpha=0.7)
plt.axvline(1, linestyle="--")
plt.axvline(-1, linestyle="--")
plt.axhline(-np.log10(0.05), linestyle="--")
plt.xlabel("log2 Fold Change")
plt.ylabel("-log10 p-value")
plt.title("Volcano Plot")
plt.show()
""",
                "Creates a volcano plot for resistance features.",
            ),
        ]
    if assay_type == "single_cell":
        return [
            _py_script(
                "scrna_pipeline.py",
                """import scanpy as sc

# USER: replace this with your AnnData h5ad file.
ADATA_PATH = "./data/single_cell.h5ad"
adata = sc.read_h5ad(ADATA_PATH)
sc.pp.filter_cells(adata, min_genes=200)
sc.pp.filter_genes(adata, min_cells=3)
sc.pp.normalize_total(adata, target_sum=1e4)
sc.pp.log1p(adata)
sc.pp.highly_variable_genes(adata, n_top_genes=2000)
adata = adata[:, adata.var["highly_variable"]]
sc.pp.scale(adata, max_value=10)
sc.tl.pca(adata)
sc.pp.neighbors(adata)
sc.tl.umap(adata)
adata.write("./data/processed_sc.h5ad")
""",
                "Runs an end-to-end scRNA-seq preprocessing pipeline.",
            ),
            _py_script(
                "umap_visualization.py",
                """import scanpy as sc

# USER: replace this with your processed AnnData file.
ADATA_PATH = "./data/processed_sc.h5ad"
adata = sc.read_h5ad(ADATA_PATH)
sc.pl.umap(adata, color=["cell_type", "condition"])
""",
                "Plots UMAP projections by metadata columns.",
            ),
        ]
    if assay_type == "proteomics":
        return [
            _r_script(
                "differential_expression.R",
                """library(limma)
library(readr)

# USER: replace this path with proteomics matrix.
expr <- read_csv("./data/proteomics_matrix.csv")
# Placeholder model matrix for two-group comparison.
group <- factor(expr$condition)
design <- model.matrix(~ group)
fit <- lmFit(as.matrix(expr[, -which(names(expr) == "condition")]), design)
fit <- eBayes(fit)
top <- topTable(fit, coef = 2, number = 100)
print(top)
""",
                "Computes differential protein abundance with limma.",
            ),
            _py_script(
                "pathway_enrichment.py",
                """import pandas as pd

# USER: replace this with DE protein results.
DE_PATH = "./data/proteomics_de.csv"
df = pd.read_csv(DE_PATH)
sig = df[df["adj_p"] < 0.05]["protein_id"].tolist()
print(f"Significant proteins: {len(sig)}")
# Placeholder for enrichment call (e.g., gseapy.enrichr).
""",
                "Prepares significant proteins for pathway enrichment.",
            ),
        ]
    if assay_type == "docking":
        return [
            _py_script(
                "parse_tamarind_results.py",
                """import pandas as pd

# USER: replace with Tamarind result JSON/CSV export.
IN_PATH = "./data/tamarind_results.csv"
df = pd.read_csv(IN_PATH)
print(df.head())
print(df["confidence_score"].describe())
""",
                "Parses Tamarind docking output into tabular form.",
            ),
            _py_script(
                "binding_analysis.py",
                """import pandas as pd
import matplotlib.pyplot as plt

# USER: replace this path with Tamarind scores.
SCORES_PATH = "./data/binding_scores.csv"
df = pd.read_csv(SCORES_PATH)
df = df.sort_values("binding_energy")
plt.plot(df["ligand"], df["binding_energy"])
plt.xticks(rotation=90)
plt.ylabel("Binding energy")
plt.tight_layout()
plt.show()
""",
                "Ranks ligands by predicted binding energy.",
            ),
        ]
    if assay_type == "western_blot":
        return [
            _py_script(
                "quantification_analysis.py",
                """import pandas as pd
import scipy.stats as stats

# USER: replace with densitometry CSV.
WB_PATH = "./data/western_blot_quant.csv"
df = pd.read_csv(WB_PATH)
df["normalized"] = df["band_intensity"] / df["loading_control"]
print(df.groupby("condition")["normalized"].mean())
anova = stats.f_oneway(*[g["normalized"].values for _, g in df.groupby("condition")])
print({"f_stat": anova.statistic, "p_value": anova.pvalue})
""",
                "Normalizes and compares western blot signals.",
            )
        ]
    if assay_type == "crispr":
        return [
            _py_script(
                "guide_efficiency_analysis.py",
                """import pandas as pd

# USER: replace with guide score table.
GUIDE_PATH = "./data/guides.csv"
df = pd.read_csv(GUIDE_PATH)
df["efficiency_rank"] = df["efficiency_score"].rank(ascending=False)
print(df.sort_values("efficiency_rank").head(20))
""",
                "Ranks CRISPR guides by predicted efficiency.",
            ),
            _py_script(
                "indel_scoring.py",
                """import pandas as pd

# USER: replace with indel quantification output.
INDEL_PATH = "./data/indels.csv"
df = pd.read_csv(INDEL_PATH)
df["indel_rate"] = (df["edited_reads"] / df["total_reads"]) * 100
print(df[["guide_id", "indel_rate"]].sort_values("indel_rate", ascending=False))
""",
                "Calculates indel rates across guide designs.",
            ),
        ]
    return [
        _py_script(
            "analysis_template.py",
            """import pandas as pd
import matplotlib.pyplot as plt

# USER: replace with your input file.
IN_PATH = "./data/input.csv"
df = pd.read_csv(IN_PATH)
print(df.head())
""",
            "Fallback analysis template.",
        )
    ]


async def bioinformatics_agent(program: ResearchProgram) -> ResearchProgram:
    program.scripts = _scripts_for_assay(program.assay_type)
    program.refresh_computed_fields()
    return program
