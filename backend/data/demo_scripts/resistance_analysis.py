# PRAXIS: generated for Validate Compound-14 inhibits GyrA in fluoroquinolone-resistant E. coli with gyrA D87N mutation
# USER: set env PRAXIS_HYPOTHESIS to override the title string in plots only.
"""
MIC fold-shift analysis with CLSI-style breakpoint classification, Mann–Whitney U testing,
and an exportable strain-vs-fold-shift bar chart.
"""

from __future__ import annotations

import os
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy import stats

# USER: replace this with your MIC results CSV (wide or long; columns auto-detected).
DATA_CSV = "./mic_data.csv"

OUT_DIR = Path("./praxis_output")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def _find_col(df: pd.DataFrame, candidates: list[str]) -> str | None:
    cols = {c.lower(): c for c in df.columns}
    for cand in candidates:
        if cand.lower() in cols:
            return cols[cand.lower()]
    return None


def load_mic_table(path: str) -> pd.DataFrame:
    p = Path(path)
    if not p.exists():
        # Synthetic demo dataset (MIC in µg/mL).
        return pd.DataFrame(
            {
                "strain": [
                    "E.coli WT (ATCC25922)",
                    "E.coli WT (ATCC25922)",
                    "E.coli gyrA D87N",
                    "E.coli gyrA D87N",
                    "E.coli gyrA D87N",
                ],
                "mic_ugml": [0.5, 0.5, 8.0, 16.0, 8.0],
            }
        )
    return pd.read_csv(path)


def classify_fold_shift(fold: float, breakpoint_fold: float = 4.0) -> str:
    if fold >= breakpoint_fold:
        return "RESISTANT"
    if fold >= 2.0:
        return "INTERMEDIATE"
    return "SUSCEPTIBLE"


def main() -> None:
    df = load_mic_table(DATA_CSV)

    strain_col = _find_col(df, ["strain", "isolate", "bug"]) or df.columns[0]
    mic_col = _find_col(df, ["mic_ugml", "mic", "mic_ug_ml", "mic_value"]) or df.columns[1]

    mic = pd.to_numeric(df[mic_col], errors="coerce")
    strains = df[strain_col].astype(str)
    work = pd.DataFrame({"strain": strains, "mic_ugml": mic}).dropna()

    wt_mask = work["strain"].str.contains(r"\bWT\b", case=False, regex=True) | work["strain"].str.contains(
        "ATCC25922", case=False
    )
    wt_mic = work.loc[wt_mask, "mic_ugml"].median()
    if not np.isfinite(wt_mic) or wt_mic <= 0:
        wt_mic = float(work["mic_ugml"].median())

    work["fold_shift"] = work["mic_ugml"] / wt_mic
    work["clsli_class"] = [classify_fold_shift(float(x)) for x in work["fold_shift"]]

    wt_vals = work.loc[wt_mask, "mic_ugml"]
    mut_vals = work.loc[~wt_mask, "mic_ugml"]
    if len(wt_vals) >= 2 and len(mut_vals) >= 2:
        u_stat, pval = stats.mannwhitneyu(wt_vals, mut_vals, alternative="two-sided")
    else:
        u_stat, pval = (float("nan"), float("nan"))

    summary_path = OUT_DIR / "stats_summary.txt"
    lines = [
        f"WT median MIC (µg/mL): {wt_mic:.4g}",
        f"Max fold-shift: {work['fold_shift'].max():.3f}x",
        f"Mann-Whitney U p-value: {pval:.6g}" if np.isfinite(pval) else "Mann-Whitney U: insufficient groups",
        "",
        "Per-strain table:",
        work.sort_values("fold_shift", ascending=False).to_string(index=False),
    ]
    summary_path.write_text("\n".join(lines), encoding="utf-8")

    colors = ["#2ca02c" if c == "SUSCEPTIBLE" else ("#ff7f0e" if c == "INTERMEDIATE" else "#d62728") for c in work["clsli_class"]]

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.bar(work["strain"], work["fold_shift"], color=colors)
    ax.axhline(4.0, color="#9467bd", linestyle="--", linewidth=2, label="CLSI-style 4× breakpoint (demo)")
    ax.set_xlabel("Strain")
    ax.set_ylabel("MIC fold-shift vs WT median")
    hyp = os.environ.get(
        "PRAXIS_HYPOTHESIS",
        "Validate Compound-14 inhibits GyrA in fluoroquinolone-resistant E. coli with gyrA D87N mutation",
    )
    ax.set_title(f"Resistance profile — {hyp[:80]}…")
    ax.legend()
    plt.xticks(rotation=35, ha="right")
    fig.tight_layout()
    fig.savefig(OUT_DIR / "resistance_profile.png", dpi=300)
    plt.close(fig)

    print(f"Wrote: {OUT_DIR / 'resistance_profile.png'}")
    print(f"Wrote: {summary_path}")


if __name__ == "__main__":
    # Allow overriding input path without editing the file.
    DATA_CSV = os.environ.get("PRAXIS_MIC_CSV", DATA_CSV)
    main()
