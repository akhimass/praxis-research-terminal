import pandas as pd

# USER: replace this with DE protein results.
DE_PATH = "./data/proteomics_de.csv"
df = pd.read_csv(DE_PATH)
sig = df[df["adj_p"] < 0.05]["protein_id"].tolist()
print(f"Significant proteins: {len(sig)}")
# Placeholder for enrichment call (e.g., gseapy.enrichr).
