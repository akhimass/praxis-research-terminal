# PRAXIS: generated for Validate Compound-14 inhibits GyrA in fluoroquinolone-resistant E. coli with gyrA D87N mutation
# USER: set env PRAXIS_HYPOTHESIS for custom subtitle text in the plot (optional).
# MIC distribution visualization with geometric mean + breakpoint overlay (ggplot2).

suppressPackageStartupMessages({
  library(readr)
  library(dplyr)
  library(ggplot2)
  library(scales)
})

# USER: replace this with your MIC long-format CSV (columns: strain, mic_ugml).
DATA_CSV <- Sys.getenv("PRAXIS_MIC_CSV", unset = "./mic_long.csv")

out_dir <- "./praxis_output"
dir.create(out_dir, showWarnings = FALSE, recursive = TRUE)

if (!file.exists(DATA_CSV)) {
  df <- data.frame(
    strain = rep(c("WT", "gyrA D87N"), each = 8),
    mic_ugml = c(
      0.25, 0.5, 0.5, 0.5, 0.5, 0.25, 0.5, 0.5,
      4, 8, 8, 16, 8, 4, 8, 16
    ),
    stringsAsFactors = FALSE
  )
} else {
  df <- read_csv(DATA_CSV, show_col_types = FALSE)
}

if (!all(c("strain", "mic_ugml") %in% names(df))) {
  stop("Expected columns: strain, mic_ugml")
}

df <- df %>%
  mutate(mic_ugml = as.numeric(mic_ugml)) %>%
  filter(is.finite(mic_ugml), mic_ugml > 0)

geo_mean <- function(x) {
  exp(mean(log(x)))
}

summ <- df %>%
  group_by(strain) %>%
  summarise(
    n = dplyr::n(),
    gm_mic = geo_mean(mic_ugml),
    median_mic = median(mic_ugml),
    .groups = "drop"
  )

write_tsv(summ, file.path(out_dir, "mic_geometric_summary.tsv"))

# Demo breakpoint overlay (µg/mL) — replace with EUCAST/CLSI clinical BP for your drug/bug.
BP_S <- 1.0
BP_R <- 4.0

p <- ggplot(df, aes(x = factor(strain), y = mic_ugml)) +
  geom_jitter(width = 0.12, height = 0, alpha = 0.85, size = 2) +
  geom_hline(yintercept = BP_S, linetype = "dashed", color = "#2ca02c", linewidth = 0.8) +
  geom_hline(yintercept = BP_R, linetype = "dashed", color = "#d62728", linewidth = 0.8) +
  scale_y_log10() +
  labs(
    title = "MIC distribution (log scale) with demo S/R cutoffs",
    subtitle = paste0("Geometric mean MIC by strain:\n", paste(
      apply(summ, 1, function(r) sprintf("%s: %.3g", r[["strain"]], as.numeric(r[["gm_mic"]]))),
      collapse = " | "
    )),
    x = "Strain",
    y = "MIC (µg/mL)"
  ) +
  theme_bw()

ggsave(filename = file.path(out_dir, "mic_distribution.pdf"), plot = p, width = 9, height = 6, device = pdf)

message("Wrote: ", file.path(out_dir, "mic_distribution.pdf"))
message("Wrote: ", file.path(out_dir, "mic_geometric_summary.tsv"))
