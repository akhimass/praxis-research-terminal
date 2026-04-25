import { GlobalStatus } from "./lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ExportPdfButton } from "./ExportPdfButton";

interface Props {
  status: GlobalStatus | "PARTIAL";
  onReviewClick?: () => void;
  onExportClick?: () => void;
  exportDisabled?: boolean;
  exporting?: boolean;
  onRetryFailed?: () => void;
  hasFailures?: boolean;
}

export function Header({
  status, onReviewClick, onExportClick, exportDisabled, exporting,
  onRetryFailed, hasFailures,
}: Props) {
  return (
    <header className="no-print flex items-center h-12 w-full bg-background border-b border-border">
      <div className="pl-5 pr-4">
        <span className="font-mono font-extrabold text-foreground text-[13px] tracking-[0.3em]">
          PRAXIS
        </span>
      </div>
      <Separator orientation="vertical" className="h-12" />
      <div className="px-4">
        <span className="text-[10px] font-medium tracking-[0.2em] text-text-muted uppercase">
          AI Research Execution System
        </span>
      </div>
      <div className="ml-auto pr-5 flex items-center gap-3">
        {hasFailures && onRetryFailed && (
          <button
            type="button"
            onClick={onRetryFailed}
            className="h-7 px-3 inline-flex items-center justify-center bg-transparent rounded-none font-mono text-[9px] font-bold tracking-[0.18em] uppercase border border-ax-amber/40 text-ax-amber/90 hover:bg-ax-amber/10 transition-colors"
          >
            ↻ RETRY FAILED
          </button>
        )}
        {onReviewClick && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReviewClick}
            className="h-7 px-3 text-[10px] font-semibold tracking-[0.18em] uppercase border-ax-green/40 text-ax-green hover:bg-ax-green/10 hover:text-ax-green bg-transparent"
          >
            ◆ Review Plan
          </Button>
        )}
        {onExportClick && (
          <ExportPdfButton
            onClick={onExportClick}
            disabled={exportDisabled}
            exporting={exporting}
          />
        )}
        <StatusPill status={status} />
      </div>
    </header>
  );
}

function StatusPill({ status }: { status: GlobalStatus | "PARTIAL" }) {
  const base =
    "rounded-none px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase border bg-transparent";
  if (status === "RUNNING") {
    return (
      <Badge variant="outline" className={cn(base, "text-ax-amber border-ax-amber/40 animate-status-pulse")}>
        ● Running
      </Badge>
    );
  }
  if (status === "PARTIAL") {
    return (
      <Badge variant="outline" className={cn(base, "text-ax-amber border-ax-amber/60 bg-ax-amber/10")}>
        ◐ Partial Results
      </Badge>
    );
  }
  if (status === "COMPLETE") {
    return (
      <Badge variant="outline" className={cn(base, "text-ax-green border-ax-green bg-ax-green/10 glow-green")}>
        ✓ Complete
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn(base, "text-text-dim border-border")}>
      ○ Ready
    </Badge>
  );
}