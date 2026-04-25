library(limma)
library(readr)

# USER: replace this path with proteomics matrix.
expr <- read_csv("./data/proteomics_matrix.csv")
# Placeholder model matrix for two-group comparison.
group <- factor(expr$condition)
design <- model.matrix(~ group)
fit <- lmFit(as.matrix(expr[, -which(names(expr) == "condition")]), design)
fit <- eBayes(fit)
top <- topTable(fit, coef = 2, number = 100)
print(top)
