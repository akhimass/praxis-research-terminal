import { Button } from "@/components/ui/button";

interface Props { text: string; onDismiss: () => void; }

export function KeyFindingBanner({ text, onDismiss }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3 animate-praxis-fade bg-ax-green/10 border-b border-ax-green/40">
      <span className="shrink-0 text-[11px] font-bold tracking-[0.2em] uppercase text-ax-green">
        ◆ Key Finding
      </span>
      <span className="flex-1 text-[12px] text-foreground">
        {text}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        aria-label="Dismiss key finding"
        className="h-6 w-6 p-0 text-text-dim hover:text-foreground hover:bg-transparent"
      >
        ×
      </Button>
    </div>
  );
}