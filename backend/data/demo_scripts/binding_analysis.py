# PRAXIS: generated for Validate Compound-14 inhibits GyrA in fluoroquinolone-resistant E. coli with gyrA D87N mutation
# USER: set env PRAXIS_HYPOTHESIS for plot title override (optional).
"""
Parse Tamarind-like docking JSON, rank poses, plot score distribution, and list top interacting residues.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

# USER: replace with docking output JSON from Tamarind (or compatible schema).
DOCKING_JSON = "./tamarind_docking_results.json"

OUT_DIR = Path("./praxis_output")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def _demo_payload() -> dict:
    return {
        "poses": [
            {"pose_id": "p01", "affinity_kcal_mol": -7.8, "key_residues": ["ASP87", "GLY85", "SER84"]},
            {"pose_id": "p02", "affinity_kcal_mol": -7.1, "key_residues": ["ASP87", "THR88"]},
            {"pose_id": "p03", "affinity_kcal_mol": -6.6, "key_residues": ["LEU83"]},
            {"pose_id": "p04", "affinity_kcal_mol": -6.2, "key_residues": ["ASP87", "ARG76"]},
            {"pose_id": "p05", "affinity_kcal_mol": -5.9, "key_residues": ["GLY85"]},
        ]
    }


def main() -> None:
    p = Path(DOCKING_JSON)
    payload = json.loads(p.read_text(encoding="utf-8")) if p.exists() else _demo_payload()
    rows = payload.get("poses") or payload.get("results") or []
    df = pd.DataFrame(rows)
    if df.empty:
        raise ValueError("No poses found in docking JSON.")

    if "affinity_kcal_mol" not in df.columns and "score" in df.columns:
        df = df.rename(columns={"score": "affinity_kcal_mol"})

    df["affinity_kcal_mol"] = pd.to_numeric(df["affinity_kcal_mol"], errors="coerce")
    df = df.dropna(subset=["affinity_kcal_mol"]).sort_values("affinity_kcal_mol", ascending=True)

    fig, ax = plt.subplots(figsize=(9, 5))
    ax.hist(df["affinity_kcal_mol"], bins=min(20, max(6, len(df))), color="#1f77b4", alpha=0.85)
    ax.set_title("Docking score distribution (more negative = better)")
    ax.set_xlabel("Affinity (kcal/mol)")
    ax.set_ylabel("Count")
    fig.tight_layout()
    fig.savefig(OUT_DIR / "docking_score_distribution.png", dpi=300)
    plt.close(fig)

    top = df.head(10)
    residue_counts: dict[str, int] = {}
    if "key_residues" in top.columns:
        for residues in top["key_residues"].tolist():
            if isinstance(residues, list):
                for r in residues:
                    residue_counts[str(r)] = residue_counts.get(str(r), 0) + 1

    (OUT_DIR / "docking_top_poses.tsv").write_text(top.to_csv(sep="\t", index=False), encoding="utf-8")
    (OUT_DIR / "docking_key_residues.json").write_text(json.dumps(residue_counts, indent=2), encoding="utf-8")

    print(f"Wrote: {OUT_DIR / 'docking_score_distribution.png'}")
    print(f"Wrote: {OUT_DIR / 'docking_top_poses.tsv'}")
    print(f"Wrote: {OUT_DIR / 'docking_key_residues.json'}")


if __name__ == "__main__":
    DOCKING_JSON = os.environ.get("PRAXIS_DOCKING_JSON", DOCKING_JSON)
    main()
