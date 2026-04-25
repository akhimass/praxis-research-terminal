import { useState } from "react";

interface Props {
  disabled: boolean;
  onRun: (h: string) => void;
}

export function HypothesisInput({ disabled, onRun }: Props) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  const canRun = value.trim().length > 0 && !disabled;

  return (
    <div className="p-4" style={{ borderBottom: "1px solid #1a2f50" }}>
      <div className="font-mono mb-2" style={{ fontSize: 9, letterSpacing: "0.15em", color: "#2a4060" }}>
        HYPOTHESIS
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Describe your scientific hypothesis..."
        spellCheck={false}
        className="w-full font-mono text-foreground transition-all duration-150 outline-none resize-none praxis-scroll"
        style={{
          height: 120,
          background: "#050a14",
          border: `1px solid ${focused ? "#00d97e" : "#1a2f50"}`,
          fontSize: 11,
          padding: 10,
          color: "#e2eaf5",
          boxShadow: focused ? "0 0 20px #00d97e22" : "none",
        }}
      />
      <div className="flex justify-between mt-1 mb-3 font-mono" style={{ fontSize: 9, color: "#2a4060" }}>
        <span>{value.length === 0 ? "—" : `${value.length} chars`}</span>
        <span>{value.trim().split(/\s+/).filter(Boolean).length} words</span>
      </div>
      <button
        type="button"
        disabled={!canRun}
        onClick={() => canRun && onRun(value.trim())}
        className="w-full font-mono font-extrabold transition-all duration-150"
        style={{
          height: 36,
          background: canRun ? "#00d97e" : "#1a2f50",
          color: canRun ? "#000000" : "#2a4060",
          fontSize: 11,
          letterSpacing: "0.15em",
          cursor: canRun ? "pointer" : "not-allowed",
        }}
        onMouseEnter={(e) => { if (canRun) (e.currentTarget.style.filter = "brightness(1.1)"); }}
        onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
      >
        ▶ RUN PRAXIS
      </button>
    </div>
  );
}