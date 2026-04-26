import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  disabled: boolean;
  onRun: (h: string) => void;
}

export interface HypothesisInputRef {
  setValue: (val: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export const HypothesisInput = forwardRef<HypothesisInputRef, Props>(
  function HypothesisInput({ disabled, onRun }, ref) {
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const canRun = value.trim().length > 0 && !disabled;

    useImperativeHandle(ref, () => ({
      setValue: (val: string) => setValue(val),
      textareaRef,
    }));

    const wordCount = value.trim().split(/\s+/).filter(Boolean).length;

    const getWordCountLabel = () => {
      if (wordCount === 0) return "0 words · be specific for best results";
      if (wordCount <= 10) return `${wordCount} words · add more detail`;
      if (wordCount <= 30) return `${wordCount} words · good hypothesis`;
      return `${wordCount} words · ✓ excellent detail`;
    };

    const wordCountClass =
      wordCount === 0
        ? "text-muted-foreground"
        : wordCount <= 10
          ? "text-muted-foreground"
          : wordCount <= 30
            ? "text-muted-foreground/90"
            : "text-foreground";

    const placeholder = `Describe your scientific hypothesis...

Example: Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to controls...`;

    return (
      <div className="p-4 border-b border-border">
        <div className="mb-2 text-[10px] font-semibold tracking-[0.18em] uppercase text-text-muted">
          Hypothesis
        </div>
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          className="h-[120px] resize-none rounded-md border-input bg-background px-2.5 py-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 praxis-scroll"
        />
        <div className="flex justify-between mt-1 mb-3 font-mono text-[10px] text-muted-foreground">
          <span>{value.length === 0 ? "—" : `${value.length} chars`}</span>
          <span className={cn(wordCountClass)}>{getWordCountLabel()}</span>
        </div>
        <Button
          type="button"
          variant={canRun ? "default" : "secondary"}
          disabled={!canRun}
          onClick={() => canRun && onRun(value.trim())}
          className={cn(
            "w-full h-9 rounded-md text-[11px] font-bold tracking-[0.15em] uppercase",
            !canRun && "cursor-not-allowed opacity-60",
          )}
        >
          ▶ Run Praxis
        </Button>
        <div className="font-mono text-[8px] text-center mt-1.5 text-muted-foreground">
          Results in ~90 seconds · Literature QC fires first
        </div>
      </div>
    );
  }
);
