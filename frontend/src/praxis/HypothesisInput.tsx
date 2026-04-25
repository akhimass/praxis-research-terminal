import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  disabled: boolean;
  onRun: (h: string) => void;
}

export function HypothesisInput({ disabled, onRun }: Props) {
  const [value, setValue] = useState("");
  const canRun = value.trim().length > 0 && !disabled;

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
    </div>
  );
}