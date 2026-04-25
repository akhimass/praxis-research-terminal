import pandas as pd

# USER: replace with indel quantification output.
INDEL_PATH = "./data/indels.csv"
df = pd.read_csv(INDEL_PATH)
df["indel_rate"] = (df["edited_reads"] / df["total_reads"]) * 100
print(df[["guide_id", "indel_rate"]].sort_values("indel_rate", ascending=False))
