import { Skeleton } from "@/components/Skeleton";

const cardBorder = "border border-border border-l-[3px] border-l-border bg-card";

/* ---------------- SCIENCE ---------------- */
export function ScienceSkeleton() {
  return (
    <div className="grid w-full h-full" style={{ gridTemplateColumns: "55fr 45fr", gap: 16 }}>
      <div className="flex flex-col min-h-0">
        <div className="mb-3"><Skeleton width="180px" height="10px" /></div>
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cardBorder} style={{ padding: "12px 14px" }}>
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-2">
                  <Skeleton width="70%" height="12px" />
                  <Skeleton width="45%" height="10px" />
                  <Skeleton width="20%" height="10px" />
                </div>
                <Skeleton width="4px" height="60px" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={`flex items-center justify-center ${cardBorder.replace("border-l-[3px] border-l-border", "")}`} style={{ minHeight: 240 }}>
        <Skeleton width="120px" height="120px" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} />
      </div>
    </div>
  );
}

/* ---------------- PROTOCOL ---------------- */
export function ProtocolSkeleton() {
  return (
    <div className="flex flex-col">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-5" style={{ borderBottom: i < 4 ? "1px solid hsl(var(--card))" : "none", padding: "12px 0" }}>
          <div className="flex flex-col items-center" style={{ width: 60 }}>
            <Skeleton width="32px" height="32px" />
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton width="60%" height="14px" />
            <Skeleton width="85%" height="10px" />
            <Skeleton width="65%" height="10px" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- CODE ---------------- */
export function CodeSkeleton() {
  // Varying widths in % to mimic source code shape.
  const lines: Array<{ indent: number; width: string } | "blank"> = [
    { indent: 0,  width: "40%" }, { indent: 0,  width: "65%" }, { indent: 0,  width: "55%" },
    "blank",
    { indent: 20, width: "70%" }, { indent: 20, width: "80%" }, { indent: 20, width: "60%" }, { indent: 20, width: "75%" },
    "blank",
    { indent: 0,  width: "45%" }, { indent: 0,  width: "70%" }, { indent: 20, width: "55%" }, { indent: 20, width: "80%" }, { indent: 0,  width: "40%" },
    "blank",
    { indent: 0,  width: "60%" }, { indent: 20, width: "75%" }, { indent: 20, width: "50%" }, { indent: 20, width: "65%" }, { indent: 0,  width: "35%" },
  ];
  return (
    <div className="flex w-full h-full" style={{ background: "hsl(var(--background))" }}>
      <div className="flex-1 min-w-0 flex flex-col">
        {/* tab bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="80px" height="28px" />
          ))}
        </div>
        {/* code area */}
        <div className="flex-1 flex" style={{ background: "hsl(var(--surface-deep))" }}>
          <div className="shrink-0 flex flex-col items-end gap-2 py-3 px-2" style={{ width: 48, background: "#050a14" }}>
            {lines.map((_, i) => (
              <Skeleton key={i} width="18px" height="10px" />
            ))}
          </div>
          <div className="flex-1 flex flex-col gap-2 py-3 px-3">
            {lines.map((l, i) =>
              l === "blank" ? <div key={i} style={{ height: 8 }} /> : (
                <div key={i} style={{ paddingLeft: l.indent }}>
                  <Skeleton width={l.width} height="12px" />
                </div>
              )
            )}
          </div>
        </div>
      </div>
      {/* meta panel */}
      <div className="shrink-0 w-[260px] border-l border-border p-4 flex flex-col gap-3">
        <Skeleton width="60%" height="12px" />
        <Skeleton width="100%" height="48px" />
        <Skeleton width="100%" height="48px" />
        <Skeleton width="100%" height="48px" />
      </div>
    </div>
  );
}

/* ---------------- BUDGET ---------------- */
export function BudgetSkeleton() {
  return (
    <div className="flex flex-col w-full" style={{ background: "hsl(var(--background))", padding: 16, gap: 12 }}>
      {/* stat tiles */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cardBorder.replace("border-l-[3px] border-l-border", "")} style={{ padding: 12 }}>
            <Skeleton width="60%" height="10px" />
            <div className="mt-2"><Skeleton width="80%" height="20px" /></div>
          </div>
        ))}
      </div>
      {/* phase bar */}
      <Skeleton width="100%" height="6px" />
      {/* table header */}
      <Skeleton width="100%" height="32px" />
      {/* rows */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid gap-3 items-center" style={{ gridTemplateColumns: "32px 2fr 1fr 1fr 1fr 60px 1fr", height: 40 }}>
            <Skeleton width="20px" height="12px" />
            <Skeleton width="80%" height="12px" />
            <Skeleton width="60%" height="12px" />
            <Skeleton width="50%" height="12px" />
            <Skeleton width="40%" height="12px" />
            <Skeleton width="30px" height="12px" />
            <Skeleton width="60%" height="12px" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- FUNDING ---------------- */
export function FundingSkeleton() {
  return (
    <div className="grid w-full h-full" style={{ gridTemplateColumns: "360px 1fr", gap: 0 }}>
      {/* left list */}
      <div className="flex flex-col gap-2 p-4 border-r border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={cardBorder} style={{ padding: "12px 14px" }}>
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton width="65%" height="12px" />
                <Skeleton width="45%" height="10px" />
              </div>
              <Skeleton width="4px" height="40px" />
            </div>
          </div>
        ))}
      </div>
      {/* right detail */}
      <div className="p-6 flex flex-col gap-4">
        <Skeleton width="50%" height="20px" />
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cardBorder.replace("border-l-[3px] border-l-border", "")} style={{ padding: 12 }}>
              <Skeleton width="70%" height="10px" />
              <div className="mt-2"><Skeleton width="50%" height="18px" /></div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton width="140px" height="10px" />
              <div className="flex-1"><Skeleton width="100%" height="8px" /></div>
              <Skeleton width="32px" height="10px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- RISKS ---------------- */
export function RisksSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className={cardBorder} style={{ padding: "12px 14px", height: 64 }}>
          <div className="flex items-center gap-3">
            <Skeleton width="60px" height="20px" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton width="55%" height="12px" />
              <Skeleton width="80%" height="10px" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
