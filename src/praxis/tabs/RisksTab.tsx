import { useState } from "react";
import { AuditFlag } from "../lib/types";

export function RisksTab({ flags }: { flags: AuditFlag[] }) {
  if (!flags.length) {
    return (
      <div className="animate-praxis-fade flex items-center justify-center" style={{ minHeight: 240 }}>
        <div
          className="font-mono font-bold glow-green"
          style={{ fontSize: 12, color: "#00d97e", letterSpacing: "0.2em", padding: "12px 20px", border: "1px solid #00d97e44", background: "#00d97e10" }}
        >
          ✓ NO FLAGS DETECTED
        </div>
      </div>
    );
  }

  const high = flags.filter((f) => f.severity === "HIGH").length;
  const med = flags.filter((f) => f.severity === "MEDIUM").length;
  const low = flags.filter((f) => f.severity === "LOW").length;

  return (
    <div className="animate-praxis-fade flex flex-col gap-2">
      <div className="font-mono mb-2" style={{ fontSize: 10, color: "#5a7a9a", letterSpacing: "0.15em" }}>
        {flags.length} FLAGS — <span style={{ color: "#ff4d4d" }}>{high} HIGH</span>, <span style={{ color: "#f0a500" }}>{med} MEDIUM</span>, <span style={{ color: "#5a7a9a" }}>{low} LOW</span>
      </div>
      {flags.map((f, i) => <FlagCard key={i} flag={f} />)}
    </div>
  );
}

function FlagCard({ flag }: { flag: AuditFlag }) {
  const [open, setOpen] = useState(false);
  const cfg = flag.severity === "HIGH"
    ? { border: "#ff4d4d", bg: "#ff4d4d08", badge: "#ff4d4d" }
    : flag.severity === "MEDIUM"
    ? { border: "#f0a500", bg: "#f0a50008", badge: "#f0a500" }
    : { border: "#1a2f50", bg: "transparent", badge: "#5a7a9a" };

  return (
    <div
      className="cursor-pointer transition-all duration-150"
      onClick={() => setOpen((o) => !o)}
      style={{ background: cfg.bg, borderLeft: `3px solid ${cfg.border}`, borderTop: "1px solid #1a2f50", borderRight: "1px solid #1a2f50", borderBottom: "1px solid #1a2f50", padding: "12px 14px" }}
    >
      <div className="flex items-center gap-3">
        <span className="font-mono font-bold" style={{ fontSize: 9, padding: "3px 8px", color: cfg.badge, border: `1px solid ${cfg.badge}44`, letterSpacing: "0.15em" }}>
          {flag.severity}
        </span>
        <span className="font-mono" style={{ fontSize: 12, color: "#e2eaf5" }}>{flag.title}</span>
      </div>
      {open && flag.detail && (
        <div className="font-mono mt-3 animate-praxis-fade" style={{ fontSize: 10, color: "#5a7a9a", lineHeight: 1.6 }}>
          {flag.detail}
        </div>
      )}
    </div>
  );
}