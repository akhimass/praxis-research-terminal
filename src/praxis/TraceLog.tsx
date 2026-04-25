import { useEffect, useRef } from "react";
import { AGENT_BY_ID, AgentId, TraceEntry } from "./lib/types";

interface Props { entries: TraceEntry[] }

export function TraceLog({ entries }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries.length]);

  return (
    <div className="flex flex-col p-4" style={{ height: 200 }}>
      <div className="font-mono mb-2" style={{ fontSize: 9, letterSpacing: "0.15em", color: "#2a4060" }}>
        EXECUTION LOG
      </div>
      <div
        ref={ref}
        className="flex-1 overflow-y-auto praxis-scroll font-mono"
        style={{ background: "#050a14", border: "1px solid #1a2f50", padding: 8, fontSize: 9, lineHeight: 1.6 }}
      >
        {entries.length === 0 && <div style={{ color: "#2a4060" }}>// awaiting hypothesis...</div>}
        {entries.map((e, i) => {
          const meta = e.agent !== "system" ? AGENT_BY_ID[e.agent as AgentId] : undefined;
          return (
            <div key={i} className="animate-log-in flex gap-2">
              <span style={{ color: "#2a4060" }}>[{e.ts}]</span>
              <span style={{ color: meta ? meta.hex : "#5a7a9a" }}>{meta ? meta.label : "SYSTEM"}</span>
              <span style={{ color: "#5a7a9a" }}>→ {e.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}