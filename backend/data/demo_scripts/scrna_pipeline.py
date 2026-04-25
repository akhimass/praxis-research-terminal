# PRAXIS: generated for Validate Compound-14 inhibits GyrA in fluoroquinolone-resistant E. coli with gyrA D87N mutation
# USER: set env PRAXIS_HYPOTHESIS to annotate saved object metadata (optional).
"""
Single-cell RNA-seq demo pipeline (scanpy):
QC → normalize → HVG → PCA → neighbors → UMAP → Leiden → rank_genes_groups → marker dotplot.
"""

from __future__ import annotations

import os
from pathlib import Path

import numpy as np
import pandas as pd
import scanpy as sc
from anndata import AnnData

# USER: replace with a 10x mtx path (matrix.mtx + genes.tsv + barcodes.tsv) OR a cell×gene CSV.
INPUT_10X_DIR = "./tenx_filtered_matrix/"
# USER: replace with a cell×gene CSV alternative (rows=cells, cols=genes) if you are not using 10x.
INPUT_CSV = "./scrna_matrix.csv"

OUT_DIR = Path("./praxis_output")
OUT_H5AD = OUT_DIR / "processed.h5ad"


def _synthetic_anndata(*, n_cells: int = 600, n_genes: int = 1200, seed: int = 0) -> AnnData:
    rng = np.random.default_rng(seed)
    X = rng.poisson(1.2, size=(n_cells, n_genes)).astype(np.float32)
    obs = pd.DataFrame(
        {
            "cell_type": rng.choice(["A", "B"], size=n_cells, p=[0.55, 0.45]),
            "condition": rng.choice(["ctrl", "treat"], size=n_cells, p=[0.5, 0.5]),
        }
    )
    var = pd.DataFrame(index=[f"GENE{i}" for i in range(n_genes)])
    adata = AnnData(X=X, obs=obs, var=var)
    adata.obs_names = [f"cell_{i}" for i in range(n_cells)]
    # fake mitochondrial fraction for QC demo
    mito_genes = np.zeros(n_genes, dtype=bool)
    mito_genes[: max(10, n_genes // 100)] = True
    adata.var["mt"] = mito_genes
    return adata


def read_input() -> AnnData:
    mtx_dir = Path(INPUT_10X_DIR)
    if mtx_dir.exists() and (mtx_dir / "matrix.mtx").exists():
        return sc.read_10x_mtx(mtx_dir, var_names="gene_symbols", cache=True)

    csv_path = Path(INPUT_CSV)
    if csv_path.exists():
        df = pd.read_csv(csv_path, index_col=0)
        return AnnData(X=df.to_numpy(dtype=np.float32), obs=pd.DataFrame(index=df.index), var=pd.DataFrame(index=df.columns))

    return _synthetic_anndata()


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sc.settings.verbosity = 2
    sc.settings.set_figure_params(dpi=120, frameon=False)

    adata = read_input()
    adata.var_names_make_unique()

    # QC
    adata.obs["n_genes_by_counts"] = np.asarray((adata.X > 0).sum(axis=1)).ravel()
    adata.obs["total_counts"] = np.asarray(adata.X.sum(axis=1)).ravel()
    if "mt" in adata.var.columns:
        mt = adata.var["mt"].to_numpy()
        mt_idx = np.where(mt)[0]
        if len(mt_idx):
            xs = adata.X[:, mt_idx]
            adata.obs["pct_counts_mt"] = np.asarray(xs.sum(axis=1)).ravel() / np.maximum(
                adata.obs["total_counts"].to_numpy(), 1e-9
            )
        else:
            adata.obs["pct_counts_mt"] = 0.0
    else:
        adata.obs["pct_counts_mt"] = 0.0

    sc.pp.filter_cells(adata, min_genes=150)
    sc.pp.filter_genes(adata, min_cells=3)
    adata = adata[adata.obs["pct_counts_mt"] < 15, :].copy()

    sc.pp.normalize_total(adata, target_sum=1e4)
    sc.pp.log1p(adata)
    sc.pp.highly_variable_genes(adata, n_top_genes=800, flavor="seurat", subset=False)
    adata = adata[:, adata.var["highly_variable"]].copy()
    sc.pp.scale(adata, max_value=10)

    sc.tl.pca(adata, svd_solver="arpack")
    sc.pp.neighbors(adata, n_neighbors=15, n_pcs=min(40, adata.obsm["X_pca"].shape[1]))
    sc.tl.umap(adata)
    sc.tl.leiden(adata, resolution=0.6, key_added="leiden")

    sc.tl.rank_genes_groups(adata, groupby="leiden", method="wilcoxon")

    sc.pl.rank_genes_groups_dotplot(
        adata, n_genes=6, groupby="leiden", show=False, save="_praxis_top_markers.pdf"
    )
    # scanpy saves into ./figures/ by default
    print("Dotplot saved via scanpy (see ./figures/).")

    adata.write_h5ad(OUT_H5AD)
    print(f"Wrote: {OUT_H5AD}")


if __name__ == "__main__":
    INPUT_10X_DIR = os.environ.get("PRAXIS_10X_DIR", INPUT_10X_DIR)
    INPUT_CSV = os.environ.get("PRAXIS_SCRNA_CSV", INPUT_CSV)
    main()
