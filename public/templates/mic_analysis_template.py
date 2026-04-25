# PRAXIS template — MIC analysis
# Replace the input path and adjust column names as needed.
import pandas as pd
import numpy as np

ISOLATES_CSV = "data/isolates.csv"

def main():
    df = pd.read_csv(ISOLATES_CSV)
    df["mic_log2"] = np.log2(df["mic_ugml"].astype(float))
    print(df.groupby("haplotype")["mic_log2"].agg(["count","median","mean","std"]))

if __name__ == "__main__":
    main()
