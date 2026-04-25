import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  disabled: boolean;
  onRun: (h: string) => void;
  value?: string;
  onChange?: (value: string) => void;
  isRunning?: boolean;
  onDemo?: () => void;
  onCancel?: () => void;
  onReset?: () => void;
}

export function HypothesisInput({
  disabled,
  onRun,
  value: controlledValue,
  onChange,
  isRunning = false,
  onDemo,
  onCancel,
  onReset,
}: Props) {
  const isControlled = controlledValue !== undefined;
  const [local, setLocal] = React.useState("");
  const value = isControlled ? controlledValue! : local;
  const setValue = (v: string) => {
    if (onChange) onChange(v);
    else setLocal(v);
  };

  const canRun = value.trim().length > 0 && !disabled && !isRunning;

  return (
    <div className="p-4 border-b border-border">
      <div className="mb-2 text-[10px] font-semibold tracking-[0.18em] uppercase text-text-muted">
        Hypothesis
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe your scientific hypothesis..."
        spellCheck={false}
        className="h-[120px] resize-none rounded-none border-border bg-background px-2.5 py-2 font-mono text-[11px] text-foreground placeholder:text-text-muted focus-visible:border-ax-green focus-visible:ring-0 focus-visible:ring-offset-0 praxis-scroll"
      />
      <div className="flex justify-between mt-1 mb-3 font-mono text-[10px] text-text-muted">
        <span>{value.length === 0 ? "—" : `${value.length} chars`}</span>
        <span>{value.trim().split(/\s+/).filter(Boolean).length} words</span>
      </div>
      <Button
        type="button"
        disabled={!canRun}
        onClick={() => canRun && onRun(value.trim())}
        className={cn(
          "w-full h-9 rounded-none text-[11px] font-bold tracking-[0.15em] uppercase transition-all",
          canRun
            ? "bg-ax-green text-black hover:bg-ax-green hover:brightness-110"
            : "bg-secondary text-text-muted cursor-not-allowed hover:bg-secondary",
        )}
      >
        ▶ Run Praxis
      </Button>
      <div className="flex flex-col gap-2 mt-2">
        {onDemo && (
          <Button
            type="button"
            variant="outline"
            disabled={isRunning}
            onClick={onDemo}
            className="h-8 rounded-none text-[10px] font-bold tracking-[0.12em] uppercase border-border w-full"
          >
            ▶ Load Demo
          </Button>
        )}
        {isRunning && onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-8 rounded-none text-[10px] font-bold tracking-[0.12em] uppercase border-ax-amber/50 text-ax-amber w-full"
          >
            Cancel
          </Button>
        )}
        {onReset && (
          <Button
            type="button"
            variant="ghost"
            disabled={isRunning}
            onClick={onReset}
            className="h-8 rounded-none text-[10px] font-bold tracking-[0.12em] uppercase w-full"
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
