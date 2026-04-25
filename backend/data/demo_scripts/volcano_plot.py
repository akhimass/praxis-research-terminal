# PRAXIS: generated for Validate Compound-14 inhibits GyrA in fluoroquinolone-resistant E. coli with gyrA D87N mutation
# USER: set env PRAXIS_HYPOTHESIS to override the label used in exported plot titles only.
"""
Compound screen volcano plot.

Supports either:
- zscore + pvalue columns (primary), with reference lines at zscore = 2.5 and 3.5, or
- IC50 + pvalue: derives a z-score on log10(IC50) for ranking/hit coloring, same reference lines on that scale.
"""

from __future__ import annotations

import os
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy import stats

# USER: replace this with your screen results CSV.
DATA_CSV = "./screen_results.csv"

OUT_DIR = Path("./praxis_output")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def _find_col(df: pd.DataFrame, names: list[str]) -> str | None:
    lower = {c.lower(): c for c in df.columns}
    for n in names:
        if n.lower() in lower:
            return lower[n.lower()]
    return None


def _demo_df() -> pd.DataFrame:
    rng = np.random.default_rng(7)
    n = 220
    z = rng.normal(0, 1.1, size=n)
    p = 10 ** (-rng.uniform(0.5, 4.0, size=n))
    flag = np.where(z > 3.5, "TOP_HIT", np.where(z > 2.5, "FOLLOW_UP", "DEPRIORITIZE"))
    cmpd = [f"CMPD-{i:04d}" for i in range(n)]
    return pd.DataFrame({"compound_id": cmpd, "zscore": z, "pvalue": p, "flag": flag})


def _ensure_zscore(df: pd.DataFrame) -> tuple[pd.DataFrame, str]:
    """Return dataframe with a 'zscore' column and x-axis label."""
    if "zscore" in df.columns:
        return df, "z-score (screening statistic)"

    ic_col = _find_col(df, ["ic50", "ic50_nm", "ic50_um", "ic50_ug_ml"])
    if ic_col is None:
        raise ValueError("Expected 'zscore' or an IC50-like column (ic50, ic50_nm, …).")

    ic = pd.to_numeric(df[ic_col], errors="coerce").clip(lower=1e-12)
    log_ic = np.log10(ic)
    z = stats.zscore(log_ic, nan_policy="omit")
    out = df.copy()
    out["zscore"] = z
    return out, f"z-score of log10({ic_col}) (higher = more potent in this orientation)"


def main() -> None:
    path = Path(DATA_CSV)
    df = pd.read_csv(path) if path.exists() else _demo_df()

    p_col = _find_col(df, ["pvalue", "p_value", "p.val", "p"])
    if p_col is None:
        raise ValueError("Expected a p-value column (pvalue, p_value, …).")

    df = df.rename(columns={p_col: "pvalue"})
    df, x_label = _ensure_zscore(df)

    df["neg_log10_p"] = -np.log10(pd.to_numeric(df["pvalue"], errors="coerce").clip(lower=1e-300))

    if "flag" not in df.columns:
        df["flag"] = np.where(
            df["zscore"] >= 3.5,
            "TOP_HIT",
            np.where(df["zscore"] >= 2.5, "FOLLOW_UP", "DEPRIORITIZE"),
        )

    color_map = {"TOP_HIT": "#2ca02c", "FOLLOW_UP": "#1f77b4", "DEPRIORITIZE": "#7f7f7f"}
    colors = [color_map.get(str(x), "#7f7f7f") for x in df["flag"]]

    fig, ax = plt.subplots(figsize=(10, 7))
    ax.scatter(df["zscore"], df["neg_log10_p"], c=colors, s=22, alpha=0.85, linewidths=0)
    ax.axvline(2.5, color="#9467bd", linestyle="--", linewidth=1.5)
    ax.axvline(3.5, color="#9467bd", linestyle="--", linewidth=1.5)
    ax.axhline(-np.log10(0.05), color="#8c564b", linestyle=":", linewidth=1.2)

    id_col = _find_col(df, ["compound_id", "compound", "name", "drug", "molecule_id"]) or df.columns[0]
    top = df.reindex(df["zscore"].abs().sort_values(ascending=False).head(5).index)
    for _, r in top.iterrows():
        ax.text(
            float(r["zscore"]),
            float(r["neg_log10_p"]),
            str(r.get(id_col, "")),
            fontsize=8,
            ha="left",
            va="bottom",
        )

    ax.set_xlabel(x_label)
    ax.set_ylabel("-log10(p-value)")
    hyp = os.environ.get(
        "PRAXIS_HYPOTHESIS",
        "Validate Compound-14 inhibits GyrA in fluoroquinolone-resistant E. coli with gyrA D87N mutation",
    )
    ax.set_title(f"Compound screen volcano — {hyp[:90]}…")
    fig.tight_layout()
    out = OUT_DIR / "volcano_screen.png"
    fig.savefig(out, dpi=300)
    plt.close(fig)
    print(f"Wrote: {out}")


if __name__ == "__main__":
    DATA_CSV = os.environ.get("PRAXIS_SCREEN_CSV", DATA_CSV)
    main()
