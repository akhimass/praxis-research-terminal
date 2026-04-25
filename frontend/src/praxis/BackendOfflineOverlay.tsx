import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onRunDemo: () => void;
  onRetry: () => void;
}

export function BackendOfflineOverlay({ open, onRunDemo, onRetry }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "rgba(0,0,0,0.94)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Backend offline"
    >
      <div className="font-mono text-[14px] font-extrabold tracking-[0.25em] text-destructive uppercase">
        BACKEND OFFLINE
      </div>
      <div className="mt-3 font-mono text-[11px] text-text-muted tracking-[0.1em]">
        Cannot reach localhost:8000
      </div>
      <div className="mt-2 font-mono text-[11px] text-foreground/80 max-w-md text-center px-6">
        → Running in demo mode — all features available with sample data
      </div>
      <button
        type="button"
        onClick={onRunDemo}
        className={cn(
          "mt-8 h-11 px-8 inline-flex items-center justify-center rounded-none",
          "bg-foreground text-background",
          "font-mono text-[11px] font-extrabold tracking-[0.2em] uppercase",
          "hover:brightness-110 transition-all",
        )}
      >
        ▶ RUN DEMO
      </button>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 h-7 px-3 inline-flex items-center justify-center bg-transparent rounded-none font-mono text-[9px] font-bold tracking-[0.18em] uppercase border border-border text-text-muted hover:text-foreground hover:border-foreground/40 transition-colors"
      >
        ↻ RETRY CONNECTION
      </button>
    </div>
  );
}
