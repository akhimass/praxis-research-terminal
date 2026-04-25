import pandas as pd
import scipy.stats as stats
import matplotlib.pyplot as plt

# USER: replace this path with your dataset
DATA_PATH = "./data/input.csv"
df = pd.read_csv(DATA_PATH)
# Calculate group-wise resistance summary.
summary = df.groupby("condition")["mic_value"].describe()
print(summary)
# Mann-Whitney U test for two primary groups.
u, p = stats.mannwhitneyu(
    df[df["condition"] == "control"]["mic_value"],
    df[df["condition"] == "treated"]["mic_value"],
)
print({"u_stat": u, "p_value": p})
