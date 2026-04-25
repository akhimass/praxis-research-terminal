import { AGENTS, AgentRecord, AgentId } from "./lib/types";

interface Props {
  agents: Record<AgentId, AgentRecord>;
}

export function AgentPanel({ agents }: Props) {
  return (
    <div className="flex-1 min-h-0 p-4 flex flex-col" style={{ borderBottom: "1px solid #1a2f50" }}>
      <div className="font-mono mb-2" style={{ fontSize: 9, letterSpacing: "0.15em", color: "#2a4060" }}>
        AGENT PIPELINE
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto praxis-scroll pr-1">
        {AGENTS.map((a) => (
          <AgentRow key={a.id} index={a.index} label={a.label} record={agents[a.id]} />
        ))}
      </div>
    </div>
  );
}

function AgentRow({ index, label, record }: { index: string; label: string; record: AgentRecord }) {
  const state = record.state;
  let leftBorder = "#1a2f50";
  let textColor = "#2a4060";
  let right: React.ReactNode = null;

  if (state === "running") {
    leftBorder = "#f0a500";
    textColor = "#f0a500";
    right = (
      <span className="font-mono animate-praxis-dots" style={{ color: "#f0a500", fontSize: 12, letterSpacing: "0.15em" }}>
        ···
      </span>
    );
  } else if (state === "complete") {
    leftBorder = "#00d97e";
    textColor = "#e2eaf5";
    const sec = record.durationMs ? (record.durationMs / 1000).toFixed(1) : "0.0";
    right = (
      <span className="font-mono inline-flex items-center gap-2" style={{ fontSize: 9 }}>
        <span style={{ color: "#5a7a9a" }}>{sec}s</span>
        <span style={{ color: "#00d97e" }}>✓</span>
      </span>
    );
  } else if (state === "error") {
    leftBorder = "#ff4d4d";
    textColor = "#ff4d4d";
    right = <span className="font-mono" style={{ color: "#ff4d4d", fontSize: 11 }}>✗</span>;
  }

  return (
    <div
      className={`relative flex items-center justify-between transition-all duration-150 ${state === "running" ? "animate-praxis-pulse" : ""}`}
      style={{
        height: 36,
        background: "#050a14",
        border: "1px solid #1a2f50",
        borderLeft: `3px solid ${leftBorder}`,
        padding: "0 10px",
        overflow: "hidden",
      }}
    >
      {state === "running" && <div className="animate-scanline" />}
      <span className="font-mono font-semibold" style={{ fontSize: 10, color: textColor, letterSpacing: "0.05em" }}>
        <span style={{ opacity: 0.6, marginRight: 6 }}>{index}</span>
        {label}
      </span>
      {right}
    </div>
  );
}