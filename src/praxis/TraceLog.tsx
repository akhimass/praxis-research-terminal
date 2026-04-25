import { useEffect, useRef } from "react";
import { AGENT_BY_ID, AgentId, TraceEntry } from "./lib/types";

interface Props { entries: TraceEntry[] }

export function TraceLog({ entries }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries.length]);

  return (
    <div className="flex flex-col p-4 h-[200px]">
      <div className="mb-2 text-[10px] font-semibold tracking-[0.18em] uppercase text-text-muted">
        Execution Log
      </div>
      <div
        ref={ref}
        className="flex-1 overflow-y-auto praxis-scroll bg-background border border-border p-2 font-mono text-[10px] leading-[1.6]"
      >
        {entries.length === 0 && <div className="text-text-muted">// awaiting hypothesis...</div>}
        {entries.map((e, i) => {
          const meta = e.agent !== "system" ? AGENT_BY_ID[e.agent as AgentId] : undefined;
          return (
            <div key={i} className="animate-log-in flex gap-2">
              <span className="text-text-muted">[{e.ts}]</span>
              <span style={{ color: meta ? meta.hex : undefined }} className={meta ? "" : "text-text-dim"}>
                {meta ? meta.label : "SYSTEM"}
              </span>
              <span className="text-text-dim">→ {e.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}