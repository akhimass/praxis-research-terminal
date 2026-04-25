import pandas as pd
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
