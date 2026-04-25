# PRAXIS template — visualization
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("mic_summary.csv")
fig, ax = plt.subplots(figsize=(8,5))
df.boxplot(column="mic_log2", by="haplotype", ax=ax, grid=False)
ax.set_ylabel("log2 MIC (ug/mL)")
plt.tight_layout()
plt.savefig("mic_plot.png", dpi=200)
