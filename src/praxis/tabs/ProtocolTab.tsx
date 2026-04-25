import { useState } from "react";
import { ProtocolStep } from "../lib/types";
import { ProtocolFlow } from "@/components/visualizations/ProtocolFlow";

export function ProtocolTab({ steps }: { steps: ProtocolStep[] }) {
  if (!steps.length) return <Empty>No protocol generated yet.</Empty>;
  const [active, setActive] = useState<number | null>(null);
  return (
    <div className="animate-praxis-fade flex flex-col gap-4">
      <ProtocolFlow
        steps={steps}
        activeIndex={active}
        onSelectStep={(i) => {
          setActive(i);
          const el = document.getElementById(`praxis-step-${i}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      />
      <div className="flex flex-col">
        {steps.map((s, i) => (
          <Step
            key={i}
            index={i + 1}
            step={s}
            isLast={i === steps.length - 1}
            forceOpen={active === i}
            onToggle={(open) => setActive(open ? i : (active === i ? null : active))}
          />
        ))}
      </div>
    </div>
  );
}

function Step({ index, step, isLast, forceOpen, onToggle }: {
  index: number; step: ProtocolStep; isLast: boolean;
  forceOpen?: boolean; onToggle?: (open: boolean) => void;
}) {
  const [openLocal, setOpenLocal] = useState(false);
  const open = forceOpen ?? openLocal;
  const toggle = () => {
    const next = !open;
    setOpenLocal(next);
    onToggle?.(next);
  };
  const num = String(index).padStart(2, "0");
  return (
    <div id={`praxis-step-${index - 1}`} className="flex gap-5 relative">
      <div className="flex flex-col items-center" style={{ width: 60 }}>
        <div className="font-mono font-extrabold" style={{ fontSize: 28, color: "#262626", lineHeight: 1 }}>
          {num}
        </div>
        {!isLast && <div className="flex-1 w-px mt-2" style={{ background: "#262626" }} />}
      </div>
      <div className="flex-1 min-w-0 pb-6 cursor-pointer" onClick={toggle}>
        <div className="font-mono font-bold" style={{ fontSize: 12, color: "#fafafa" }}>
          {step.title}
        </div>
        {step.description && (
          <div className="font-mono mt-1" style={{ fontSize: 10, color: "#a1a1a1", lineHeight: 1.6 }}>
            {step.description}
          </div>
        )}
        {open && (
          <div className="mt-3 grid gap-3 animate-praxis-fade" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
            {step.volume && <Field label="VOLUME" value={step.volume} />}
            {step.time && <Field label="TIME" value={step.time} />}
            {step.equipment && <Field label="EQUIPMENT" value={step.equipment} />}
            {(step.controls?.length ?? 0) > 0 && (
              <div className="col-span-3">
                <div className="font-mono mb-1" style={{ fontSize: 9, color: "#404040", letterSpacing: "0.15em" }}>CONTROLS</div>
                <div className="flex flex-wrap gap-1">
                  {step.controls!.map((c, i) => (
                    <span key={i} className="font-mono" style={{ fontSize: 9, padding: "3px 8px", background: "#a1a1a112", color: "#a1a1a1", border: "1px solid #a1a1a144" }}>{c}</span>
                  ))}
                </div>
              </div>
            )}
            {(step.missingControls?.length ?? 0) > 0 && (
              <div className="col-span-3">
                <div className="font-mono mb-1" style={{ fontSize: 9, color: "#404040", letterSpacing: "0.15em" }}>MISSING</div>
                <div className="flex flex-wrap gap-1">
                  {step.missingControls!.map((c, i) => (
                    <span key={i} className="font-mono" style={{ fontSize: 9, padding: "3px 8px", background: "#ff4d4d12", color: "#ff4d4d", border: "1px solid #ff4d4d44" }}>⚠ ADD: {c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#0a0a0a", border: "1px solid #262626", padding: 10 }}>
      <div className="font-mono mb-1" style={{ fontSize: 8, color: "#404040", letterSpacing: "0.2em" }}>{label}</div>
      <div className="font-mono" style={{ fontSize: 11, color: "#fafafa" }}>{value}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="font-mono" style={{ fontSize: 10, color: "#404040" }}>{children}</div>;
}