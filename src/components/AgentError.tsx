import { cn } from "@/lib/utils";

export interface AgentErrorAction {
  label: string;
  onClick?: () => void;
  href?: string;        // if present, renders as link
  variant?: "primary" | "ghost";
}

interface Props {
  agent: string;            // "TAMARIND" | "LITERATURE" | etc.
  errorType?: string;       // for analytics; not displayed
  title: string;
  message: string;
  suggestion: string;
  canRetry?: boolean;
  onRetry?: () => void;
  retryLabel?: string;      // defaults to "RETRY"
  actions?: AgentErrorAction[];   // extra contextual actions
  className?: string;
  compact?: boolean;
}

export function AgentError({
  agent, title, message, suggestion,
  canRetry, onRetry, retryLabel = "RETRY",
  actions, className, compact,
}: Props) {
  return (
    <div
      role="alert"
      aria-label={`${agent} agent error`}
      className={cn(
        "bg-card border border-border border-l-[3px] border-l-ax-amber",
        compact ? "px-4 py-3" : "px-[18px] py-4",
        className,
      )}
    >
      <div className="font-mono text-[9px] font-bold tracking-[0.2em] uppercase text-ax-amber">
        ⚠ {agent} AGENT
      </div>
      <div className="mt-1.5 font-mono text-[12px] font-bold text-foreground">
        {title}
      </div>
      <div className="mt-1 font-mono text-[11px] text-text-muted leading-relaxed">
        {message}
      </div>
      <div className="mt-2 font-mono text-[11px] text-foreground/90 leading-relaxed">
        → {suggestion}
      </div>

      {(canRetry || (actions && actions.length > 0)) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {canRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="h-7 px-3 inline-flex items-center justify-center bg-transparent rounded-none font-mono text-[9px] font-bold tracking-[0.18em] uppercase border border-ax-amber/40 text-ax-amber hover:bg-ax-amber/10 transition-colors"
            >
              ↻ {retryLabel}
            </button>
          )}
          {actions?.map((a, i) =>
            a.href ? (
              <a
                key={i}
                href={a.href}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "h-7 px-3 inline-flex items-center justify-center rounded-none font-mono text-[9px] font-bold tracking-[0.18em] uppercase border transition-colors",
                  a.variant === "primary"
                    ? "border-foreground/60 text-foreground hover:bg-foreground/10"
                    : "border-border text-text-muted hover:text-foreground hover:border-foreground/40",
                )}
              >
                {a.label}
              </a>
            ) : (
              <button
                key={i}
                type="button"
                onClick={a.onClick}
                className={cn(
                  "h-7 px-3 inline-flex items-center justify-center bg-transparent rounded-none font-mono text-[9px] font-bold tracking-[0.18em] uppercase border transition-colors",
                  a.variant === "primary"
                    ? "border-foreground/60 text-foreground hover:bg-foreground/10"
                    : "border-border text-text-muted hover:text-foreground hover:border-foreground/40",
                )}
              >
                {a.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
