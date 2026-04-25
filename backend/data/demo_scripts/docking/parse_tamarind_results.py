import pandas as pd

# USER: replace with Tamarind result JSON/CSV export.
IN_PATH = "./data/tamarind_results.csv"
df = pd.read_csv(IN_PATH)
print(df.head())
print(df["confidence_score"].describe())
