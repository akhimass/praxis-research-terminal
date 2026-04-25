import { cn } from "@/lib/utils";

interface Props {
  disabled?: boolean;
  exporting?: boolean;
  onClick: () => void;
}

export function ExportPdfButton({ disabled, exporting, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || exporting}
      className={cn(
        "h-7 px-3 inline-flex items-center justify-center bg-transparent rounded-none",
        "font-mono text-[9pt] font-bold tracking-[0.18em] uppercase",
        "border transition-colors",
        exporting
          ? "border-ax-amber/60 text-ax-amber animate-status-pulse cursor-wait"
          : "border-[#5a7a9a44] text-foreground hover:border-ax-green/60 hover:text-ax-green",
        disabled && !exporting && "opacity-30 cursor-not-allowed hover:border-[#5a7a9a44] hover:text-foreground",
      )}
    >
      {exporting ? "GENERATING···" : "↓ EXPORT PDF"}
    </button>
  );
}
