import pandas as pd
import scipy.stats as stats

# USER: replace with densitometry CSV.
WB_PATH = "./data/western_blot_quant.csv"
df = pd.read_csv(WB_PATH)
df["normalized"] = df["band_intensity"] / df["loading_control"]
print(df.groupby("condition")["normalized"].mean())
anova = stats.f_oneway(*[g["normalized"].values for _, g in df.groupby("condition")])
print({"f_stat": anova.statistic, "p_value": anova.pvalue})
