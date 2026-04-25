import pandas as pd
import matplotlib.pyplot as plt

# USER: replace with your input file.
IN_PATH = "./data/input.csv"
df = pd.read_csv(IN_PATH)
print(df.head())
