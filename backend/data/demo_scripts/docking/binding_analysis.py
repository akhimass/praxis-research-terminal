import pandas as pd
import matplotlib.pyplot as plt

# USER: replace this path with Tamarind scores.
SCORES_PATH = "./data/binding_scores.csv"
df = pd.read_csv(SCORES_PATH)
df = df.sort_values("binding_energy")
plt.plot(df["ligand"], df["binding_energy"])
plt.xticks(rotation=90)
plt.ylabel("Binding energy")
plt.tight_layout()
plt.show()
