"""
Modal compute jobs for PRAXIS — GPU scRNA-seq, sandboxed script execution, RAG index builds.

Deploy: ``modal deploy -m backend.modal_runner`` (from repo root with ``PYTHONPATH`` set).

Requires ``modal`` CLI auth (``modal token new``). Railway calls ``.remote()`` against the
deployed app; configure the same Modal workspace/token in that environment.
"""

from __future__ import annotations

from typing import Any

import modal

app = modal.App("praxis-compute")

# Persisted Chroma data for Modal-side RAG builds (separate from local ``backend/rag/chroma_db``).
RAG_VOLUME = modal.Volume.from_name("praxis-rag", create_if_missing=True)

_scanpy_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libopenblas-dev")
    .pip_install(
        "scanpy==1.10.3",
        "anndata",
        "scipy",
        "numpy",
        "pandas",
        "matplotlib",
        "seaborn",
        "pydeseq2",
        "h5py",
    )
)

_script_image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "pandas",
    "numpy",
    "scipy",
    "matplotlib",
    "seaborn",
    "statsmodels",
    "scikit-learn",
)

_rag_image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "sentence-transformers",
    "chromadb",
    "torch",
)


@app.function(
    gpu="T4",
    image=_scanpy_image,
    timeout=600,
)
def run_scrna_pipeline(h5ad_data: bytes, params: dict[str, Any]) -> dict[str, Any]:
    """
    Run a standard scRNA-seq workflow on Modal (T4).

    Accepts ``.h5ad`` bytes. Returns UMAP coordinates, Leiden clusters, and top marker genes
    per cluster (may be large — prefer saving artifacts to object storage for huge matrices).
    """
    import io

    import numpy as np
    import scanpy as sc

    resolution = float(params.get("resolution", 0.5))

    adata = sc.read_h5ad(io.BytesIO(h5ad_data))

    sc.pp.filter_cells(adata, min_genes=200)
    sc.pp.filter_genes(adata, min_cells=3)
    sc.pp.normalize_total(adata, target_sum=1e4)
    sc.pp.log1p(adata)
    sc.pp.highly_variable_genes(adata, n_top_genes=2000)
    sc.tl.pca(adata)
    sc.pp.neighbors(adata)
    sc.tl.umap(adata)
    sc.tl.leiden(adata, resolution=resolution)
    sc.tl.rank_genes_groups(adata, "leiden", method="wilcoxon")

    umap_xy = np.asarray(adata.obsm["X_umap"])
    clusters = adata.obs["leiden"].astype(str).tolist()

    top_markers: dict[str, list[str]] = {}
    try:
        df = sc.get.rank_genes_groups_df(adata, group=None)
        if df is not None and len(df) > 0 and "group" in df.columns and "names" in df.columns:
            for g, sub in df.groupby("group"):
                top_markers[str(g)] = [str(x) for x in sub["names"].head(10).tolist()]
    except Exception:
        names_obj = adata.uns.get("rank_genes_groups", {}).get("names")
        if names_obj is not None and hasattr(names_obj, "dtype") and names_obj.dtype.names:
            for g in adata.obs["leiden"].cat.categories:
                gstr = str(g)
                if gstr in names_obj.dtype.names:
                    top_markers[gstr] = [str(x) for x in names_obj[gstr][:10].tolist()]

    return {
        "n_cells": int(adata.n_obs),
        "n_genes": int(adata.n_vars),
        "n_clusters": int(len(adata.obs["leiden"].unique())),
        "umap": umap_xy.tolist(),
        "clusters": clusters,
        "top_markers": top_markers,
    }


@app.function(
    image=_script_image,
    timeout=120,
)
def execute_analysis_script(script_code: str, input_data: dict[str, Any]) -> dict[str, Any]:
    """
    Run a PRAXIS-generated Python script in an isolated temp directory.

    ``input_data`` maps filename -> str (written as UTF-8 text) or JSON-serializable object
    (written as ``.json``). Executing untrusted code is unsafe — only run vetted scripts.
    """
    import json
    import os
    import subprocess
    import tempfile

    with tempfile.TemporaryDirectory() as tmpdir:
        for filename, content in (input_data or {}).items():
            safe_name = os.path.basename(str(filename))
            if not safe_name or safe_name in {".", ".."}:
                continue
            path = os.path.join(tmpdir, safe_name)
            if isinstance(content, str):
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
            else:
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(content, f)

        script_path = os.path.join(tmpdir, "analysis.py")
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(script_code)

        result = subprocess.run(
            ["python3", script_path],
            cwd=tmpdir,
            capture_output=True,
            text=True,
            timeout=100,
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
            "success": result.returncode == 0,
        }


def _normalize_metadata(meta: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in (meta or {}).items():
        if isinstance(v, (str, int, float, bool)) or v is None:
            out[str(k)] = v if v is not None else ""
        else:
            out[str(k)] = str(v)
    return out


@app.function(
    image=_rag_image,
    timeout=300,
    volumes={"/data": RAG_VOLUME},
)
def build_rag_index(documents: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Build or upsert the ``protocols`` collection in Chroma on a Modal Volume (``/data/chroma``).
    """
    import chromadb
    from sentence_transformers import SentenceTransformer

    client = chromadb.PersistentClient(path="/data/chroma")
    encoder = SentenceTransformer("allenai/specter")
    collection = client.get_or_create_collection(
        name="protocols",
        metadata={"hnsw:space": "cosine"},
    )

    texts = [str(d["text"]) for d in documents]
    ids = [str(d["id"]) for d in documents]
    metadatas = [_normalize_metadata(d.get("metadata") or {}) for d in documents]
    emb = encoder.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    embeddings = emb.tolist()

    collection.upsert(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)
    RAG_VOLUME.commit()

    return {"indexed": len(documents), "total": collection.count()}
