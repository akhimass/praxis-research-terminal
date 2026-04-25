import scanpy as sc

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
