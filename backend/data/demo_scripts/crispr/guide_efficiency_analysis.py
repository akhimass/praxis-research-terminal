import pandas as pd

# USER: replace with guide score table.
GUIDE_PATH = "./data/guides.csv"
df = pd.read_csv(GUIDE_PATH)
df["efficiency_rank"] = df["efficiency_score"].rank(ascending=False)
print(df.sort_values("efficiency_rank").head(20))
