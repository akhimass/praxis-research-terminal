# PRAXIS template — statistics
library(dplyr)
library(readr)

df <- read_csv("mic_summary.csv")
summary <- df %>% group_by(haplotype) %>%
  summarize(n = n(), median = median(mic_log2), sd = sd(mic_log2))
print(summary)
