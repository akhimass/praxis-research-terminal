import { GlobalStatus } from "./lib/types";

interface Props {
  status: GlobalStatus;
  onReviewClick?: () => void;
}

export function Header({ status, onReviewClick }: Props) {
  return (
    <header
      className="flex items-center h-12 w-full bg-background border-b border-border"
      style={{ borderColor: "#1a2f50" }}
    >
      <div className="pl-5 pr-4">
        <span
          className="font-mono font-extrabold text-ax-green"
          style={{ fontSize: 13, letterSpacing: "0.3em" }}
        >
          PRAXIS
        </span>
      </div>
      <div className="h-12 w-px" style={{ background: "#1a2f50" }} />
      <div className="px-4">
        <span
          className="font-mono"
          style={{ fontSize: 9, letterSpacing: "0.2em", color: "#2a4060" }}
        >
          AI RESEARCH EXECUTION SYSTEM
        </span>
      </div>
      <div className="ml-auto pr-5 flex items-center gap-3">
        {onReviewClick && <ReviewButton onClick={onReviewClick} />}
        <StatusPill status={status} />
      </div>
    </header>
  );
}

function ReviewButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center font-mono font-bold transition-colors"
      style={{
        height: 26,
        padding: "0 12px",
        background: "transparent",
        border: "1px solid #00d97e44",
        color: "#00d97e",
        fontSize: 9,
        letterSpacing: "0.2em",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#00d97e18")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      ◆ REVIEW PLAN
    </button>
  );
}

function StatusPill({ status }: { status: GlobalStatus }) {
  if (status === "RUNNING") {
    return (
      <span
        className="inline-flex items-center px-3 py-1 font-mono font-bold animate-status-pulse"
        style={{ fontSize: 10, letterSpacing: "0.2em", color: "#f0a500", border: "1px solid #f0a50066" }}
      >
        ● RUNNING
      </span>
    );
  }
  if (status === "COMPLETE") {
    return (
      <span
        className="inline-flex items-center px-3 py-1 font-mono font-bold glow-green"
        style={{ fontSize: 10, letterSpacing: "0.2em", color: "#00d97e", border: "1px solid #00d97e", background: "#00d97e10" }}
      >
        ✓ COMPLETE
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center px-3 py-1 font-mono"
      style={{ fontSize: 10, letterSpacing: "0.2em", color: "#5a7a9a", border: "1px solid #1a2f50" }}
    >
      ○ READY
    </span>
  );
}