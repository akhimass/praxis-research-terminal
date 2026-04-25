import scanpy as sc

# USER: replace this with your processed AnnData file.
ADATA_PATH = "./data/processed_sc.h5ad"
adata = sc.read_h5ad(ADATA_PATH)
sc.pl.umap(adata, color=["cell_type", "condition"])
