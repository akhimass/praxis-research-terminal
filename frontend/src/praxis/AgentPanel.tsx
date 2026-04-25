import { AGENTS, AgentRecord, AgentId } from "./lib/types";
import { cn } from "@/lib/utils";

interface Props {
  agents: Record<AgentId, AgentRecord>;
}

export function AgentPanel({ agents }: Props) {
  return (
    <div className="flex-1 min-h-0 p-4 flex flex-col border-b border-border">
      <div className="mb-2 text-[10px] font-semibold tracking-[0.18em] uppercase text-text-muted">
        Agent Pipeline
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
  let leftBorderClass = "border-l-border";
  let textClass = "text-text-muted";
  let right: React.ReactNode = null;

  if (state === "running") {
    leftBorderClass = "border-l-ax-amber";
    textClass = "text-ax-amber";
    right = (
      <span className="font-mono animate-praxis-dots text-ax-amber text-[12px] tracking-[0.15em]">
        ···
      </span>
    );
  } else if (state === "complete") {
    leftBorderClass = "border-l-ax-green";
    textClass = "text-foreground";
    const sec = record.durationMs ? (record.durationMs / 1000).toFixed(1) : "0.0";
    right = (
      <span className="font-mono inline-flex items-center gap-2 text-[10px]">
        <span className="text-text-dim">{sec}s</span>
        <span className="text-ax-green">✓</span>
      </span>
    );
  } else if (state === "error") {
    leftBorderClass = "border-l-ax-red";
    textClass = "text-ax-red";
    right = <span className="font-mono text-ax-red text-[11px]">✗</span>;
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-between h-9 px-2.5 bg-background border border-border border-l-[3px] overflow-hidden transition-all",
        leftBorderClass,
        state === "running" && "animate-praxis-pulse",
      )}
    >
      {state === "running" && <div className="animate-scanline" />}
      <span className={cn("text-[11px] font-semibold tracking-[0.02em]", textClass)}>
        <span className="font-mono opacity-60 mr-1.5">{index}</span>
        {label}
      </span>
      {right}
    </div>
  );
}