interface Props { text: string; onDismiss: () => void; }
export function KeyFindingBanner({ text, onDismiss }: Props) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-5 py-3 animate-praxis-fade"
      style={{ background: "#00d97e10", borderBottom: "1px solid #00d97e44" }}
    >
      <span
        className="font-mono font-bold shrink-0"
        style={{ fontSize: 10, letterSpacing: "0.2em", color: "#00d97e" }}
      >
        ◆ KEY FINDING
      </span>
      <span className="font-mono flex-1" style={{ fontSize: 11, color: "#e2eaf5" }}>
        {text}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="font-mono"
        style={{ fontSize: 14, color: "#5a7a9a", cursor: "pointer", padding: "0 8px", background: "transparent", border: "none" }}
        aria-label="Dismiss key finding"
      >
        ×
      </button>
    </div>
  );
}