import { useEffect, useRef, useState } from "react";
import { TamarindData } from "./lib/types";
import { AgentError } from "@/components/AgentError";

// 3Dmol is loaded from CDN at runtime.
declare global {
  interface Window {
    $3Dmol?: any;
  }
}

const CDN_URL = "https://cdn.jsdelivr.net/npm/3dmol/build/3Dmol-min.js";

let scriptPromise: Promise<void> | null = null;
function ensure3Dmol(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.$3Dmol) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CDN_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("3Dmol load failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = CDN_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("3Dmol load failed"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface Props {
  tamarind: TamarindData | null;
  isLoading: boolean;
  onRetry?: () => void;
}

export function ProteinViewer({ tamarind, isLoading, onRetry }: Props) {
  const pdbString = tamarind?.pdb ?? null;
  const proteinName = tamarind?.proteinName ?? null;
  const confidence = tamarind?.confidence ?? null;
  const residues = tamarind?.residues ?? null;
  const mutationSites = tamarind?.mutationSites ?? [];
  const error = tamarind?.error ?? null;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const surfaceIdRef = useRef<any>(null);

  const [spinning, setSpinning] = useState(true);
  const [showSurface, setShowSurface] = useState(false);
  const [showMutations, setShowMutations] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  // Loading timer
  useEffect(() => {
    if (!isLoading) { setElapsed(0); setTimedOut(false); return; }
    const start = Date.now();
    const id = window.setInterval(() => {
      const e = Math.floor((Date.now() - start) / 1000);
      setElapsed(e);
      if (e >= 60) setTimedOut(true);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isLoading]);

  // Initialize 3Dmol when a PDB string arrives.
  useEffect(() => {
    if (!pdbString || !containerRef.current) return;
    let cancelled = false;
    let viewer: any = null;

    ensure3Dmol()
      .then(() => {
        if (cancelled || !containerRef.current || !window.$3Dmol) return;
        // Wipe any stale child nodes from prior renders.
        containerRef.current.innerHTML = "";
        viewer = window.$3Dmol.createViewer(containerRef.current, {
          backgroundColor: 0x030810,
          antialias: true,
        });
        viewerRef.current = viewer;

        viewer.addModel(pdbString, "pdb");
        viewer.setStyle({}, { cartoon: { color: "white", opacity: 0.85 } });

        if (showMutations) applyMutationStyle(viewer, mutationSites);

        viewer.setBackgroundColor(0x030810);
        viewer.zoomTo();
        viewer.render();
        if (spinning) viewer.spin(true);

        // Disable native context menu inside the canvas.
        const el = containerRef.current;
        const onCtx = (e: Event) => e.preventDefault();
        el.addEventListener("contextmenu", onCtx);
        (el as any).__praxis_ctx = onCtx;
      })
      .catch(() => { /* swallow — UI shows error state via prop */ });

    return () => {
      cancelled = true;
      try {
        if (viewer) viewer.spin(false);
        if (containerRef.current) {
          const onCtx = (containerRef.current as any).__praxis_ctx;
          if (onCtx) containerRef.current.removeEventListener("contextmenu", onCtx);
          containerRef.current.innerHTML = "";
        }
      } catch { /* noop */ }
      viewerRef.current = null;
      surfaceIdRef.current = null;
    };
  // Reinitialize only when pdbString changes — control state changes are imperative below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdbString]);

  // Imperative controls
  const onSpinToggle = () => {
    const v = viewerRef.current; if (!v) return;
    const next = !spinning;
    setSpinning(next);
    v.spin(next);
  };
  const onZoomIn = () => { viewerRef.current?.zoom(1.2, 200); };
  const onZoomOut = () => { viewerRef.current?.zoom(0.8, 200); };
  const onReset = () => { const v = viewerRef.current; if (!v) return; v.zoomTo(); v.render(); };
  const onSurfaceToggle = () => {
    const v = viewerRef.current; if (!v || !window.$3Dmol) return;
    if (showSurface && surfaceIdRef.current != null) {
      try { v.removeSurface(surfaceIdRef.current); } catch { /* noop */ }
      surfaceIdRef.current = null;
      setShowSurface(false);
    } else {
      const id = v.addSurface(window.$3Dmol.SurfaceType.VDW, { opacity: 0.3, color: "white" });
      surfaceIdRef.current = id;
      setShowSurface(true);
    }
    v.render();
  };
  const onDownloadPdb = () => {
    if (!pdbString) return;
    const blob = new Blob([pdbString], { type: "chemical/x-pdb" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(proteinName ?? "structure").replace(/[^a-z0-9._-]+/gi, "_")}.pdb`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const onMutationsToggle = () => {
    const v = viewerRef.current; if (!v) return;
    const next = !showMutations;
    setShowMutations(next);
    if (next) applyMutationStyle(v, mutationSites);
    else {
      v.setStyle({}, { cartoon: { color: "white", opacity: 0.85 } });
    }
    v.render();
  };
  const focusResidue = (resi: number) => {
    const v = viewerRef.current; if (!v) return;
    v.zoomTo({ resi });
    v.render();
  };

  // pLDDT presentation
  const pLDDT = confidence != null ? confidence * 100 : null;
  const pLDDTColor = pLDDT == null ? "#404040" : pLDDT > 90 ? "#fafafa" : pLDDT >= 70 ? "#a1a1a1" : "#ff4d4d";

  // Determine state
  const state: "idle" | "loading" | "error" | "timeout" | "loaded" =
    error ? "error"
    : pdbString ? "loaded"
    : timedOut && isLoading ? "timeout"
    : isLoading || (tamarind && !pdbString && !error) ? "loading"
    : "idle";

  const proteinForSearch = proteinName || tamarind?.source || "GyrA E. coli";

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{ background: "#000000", borderLeft: "1px solid #262626" }}
    >
      {/* TOP HEADER BAR */}
      <div
        className="shrink-0 flex items-center"
        style={{ height: 36, background: "#050505", borderBottom: "1px solid #262626", padding: "0 12px" }}
      >
        <div className="font-mono uppercase" style={{ fontSize: 9, color: "#404040", letterSpacing: "0.15em" }}>
          STRUCTURAL ANALYSIS
        </div>
        <div className="flex-1 flex justify-center min-w-0 px-3">
          {proteinName && (
            <span className="font-mono font-bold truncate" style={{ fontSize: 11, color: "#fafafa", letterSpacing: "0.05em" }}>
              {proteinName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 font-mono shrink-0" style={{ fontSize: 8, color: "#404040", letterSpacing: "0.15em" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fafafa", opacity: 0.6, boxShadow: "0 0 6px #fafafa88" }} />
          {tamarind?.source ?? "TAMARIND BIO · ALPHAFOLD"}
        </div>
      </div>

      {/* VIEWER AREA */}
      <div className="relative flex-1 min-h-0" style={{ background: "#030810" }}>
        {state === "idle" && <IdleState />}
        {state === "loading" && <LoadingState elapsed={elapsed} />}
        {state === "error" && (
          <ErrorPanel
            title="Protein not in AlphaFold database"
            message={`No predicted structure found for ${proteinForSearch}`}
            suggestion="Try searching by UniProt ID, or use a homolog structure"
            proteinName={proteinForSearch}
            uniprot
            onRetry={onRetry}
          />
        )}
        {state === "timeout" && (
          <ErrorPanel
            title="Structure prediction timed out"
            message="AlphaFold job exceeded 60s. Tamarind Bio servers may be busy."
            suggestion="Try again in 2 minutes, or search RCSB manually"
            proteinName={proteinForSearch}
            onRetry={onRetry}
          />
        )}
        {/* 3Dmol target — always present so ref is stable, but visually hidden unless loaded */}
        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{ visibility: state === "loaded" ? "visible" : "hidden", touchAction: "none" }}
        />
      </div>

      {/* MUTATION ANNOTATION STRIP */}
      {state === "loaded" && mutationSites.length > 0 && (
        <div
          className="shrink-0 flex items-center font-mono"
          style={{ height: 32, background: "#ff4d4d08", borderTop: "1px solid #ff4d4d22", padding: "0 12px", fontSize: 9, color: "#ff4d4d", letterSpacing: "0.15em" }}
        >
          <span style={{ marginRight: 10 }}>MUTATION SITES:</span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
            {mutationSites.map((m) => {
              const resi = parseInt(m.replace(/[^0-9]/g, ""), 10);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => Number.isFinite(resi) && focusResidue(resi)}
                  className="font-mono font-bold transition-colors"
                  style={{
                    padding: "2px 8px",
                    border: "1px solid #ff4d4d44",
                    background: "transparent",
                    color: "#ff4d4d",
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#ff4d4d18")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {m}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onMutationsToggle}
            className="font-mono"
            style={{ background: "transparent", border: "none", color: "#ff4d4d", fontSize: 9, letterSpacing: "0.15em", cursor: "pointer", padding: "2px 6px" }}
          >
            {showMutations ? "HIDE" : "SHOW ALL"}
          </button>
        </div>
      )}

      {/* BOTTOM CONTROL BAR */}
      <div
        className="shrink-0 flex items-center gap-2"
        style={{ height: 48, background: "#050505", borderTop: "1px solid #262626", padding: "0 12px" }}
      >
        <CtrlButton label="SPIN ↻" active={spinning} activeColor="#fafafa" onClick={onSpinToggle} disabled={state !== "loaded"} />
        <CtrlButton label="+ ZOOM" onClick={onZoomIn} disabled={state !== "loaded"} />
        <CtrlButton label="− ZOOM" onClick={onZoomOut} disabled={state !== "loaded"} />
        <CtrlButton label="RESET" onClick={onReset} disabled={state !== "loaded"} />
        <CtrlButton label="SURFACE" active={showSurface} activeColor="#a1a1a1" onClick={onSurfaceToggle} disabled={state !== "loaded"} />
        <CtrlButton label="DOWNLOAD PDB" onClick={onDownloadPdb} disabled={state !== "loaded"} />

        <div className="flex-1" />

        {pLDDT != null && residues != null && (
          <div className="flex items-center gap-3 font-mono shrink-0" style={{ fontSize: 9, color: "#404040", letterSpacing: "0.1em" }}>
            <span>
              <span style={{ color: "#a1a1a1" }}>{residues}</span> RESIDUES
              <span style={{ margin: "0 6px", color: "#262626" }}>·</span>
              pLDDT <span style={{ color: pLDDTColor, fontWeight: 700 }}>{pLDDT.toFixed(1)}</span>
              <span style={{ margin: "0 6px", color: "#262626" }}>·</span>
              CONFIDENCE: <span style={{ color: pLDDTColor, fontWeight: 700 }}>
                {pLDDT > 90 ? "HIGH" : pLDDT >= 70 ? "MEDIUM" : "LOW"}
              </span>
            </span>
            <div style={{ width: 60, height: 3, background: "#262626" }}>
              <div style={{ width: `${Math.min(100, Math.max(0, pLDDT))}%`, height: 3, background: pLDDTColor, transition: "width 250ms ease" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------- Sub-components -------- */

function applyMutationStyle(viewer: any, sites: string[]) {
  for (const m of sites) {
    const resi = parseInt(m.replace(/[^0-9]/g, ""), 10);
    if (!Number.isFinite(resi)) continue;
    viewer.addStyle({ resi }, { sphere: { color: "#ff4d4d", radius: 0.8 } });
  }
}

function CtrlButton({
  label, active, activeColor, onClick, disabled,
}: {
  label: string;
  active?: boolean;
  activeColor?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const ac = activeColor ?? "#fafafa";
  const baseColor = active ? ac : hover && !disabled ? "#fafafa" : "#a1a1a1";
  const border = active ? `${ac}44` : "#262626";
  const bg = active ? `${ac}18` : "transparent";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="font-mono font-bold transition-colors"
      style={{
        height: 28,
        padding: "0 10px",
        background: bg,
        border: `1px solid ${border}`,
        color: disabled ? "#262626" : baseColor,
        fontSize: 9,
        letterSpacing: "0.15em",
        cursor: disabled ? "not-allowed" : "pointer",
        textTransform: "uppercase",
      }}
    >
      {label}
    </button>
  );
}

function IdleState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <svg width={80} height={80} viewBox="0 0 80 80">
        <polygon points="40,4 72,22 72,58 40,76 8,58 8,22" fill="none" stroke="#262626" strokeWidth={1.5} />
      </svg>
      <div className="font-mono mt-4" style={{ fontSize: 10, color: "#262626", letterSpacing: "0.2em" }}>
        STRUCTURAL PREDICTION
      </div>
      <div className="font-mono mt-1.5" style={{ fontSize: 9, color: "#111111", letterSpacing: "0.15em" }}>
        SUBMIT HYPOTHESIS TO INITIATE
      </div>
    </div>
  );
}

function LoadingState({ elapsed }: { elapsed: number }) {
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <div className="relative" style={{ width: 160, height: 160 }}>
        <Hex size={160} stroke="#fafafa22" duration="8s" />
        <Hex size={120} stroke="#fafafa22" duration="5s" reverse />
        <Hex size={80}  stroke="#fafafa22" duration="3s" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-mono"
            style={{ fontSize: 9, color: "#404040", letterSpacing: "0.2em", animation: "praxis-pulse 1.5s ease-in-out infinite" }}
          >
            ALPHAFOLD RUNNING
          </span>
        </div>
      </div>
      <div className="font-mono mt-6 flex flex-col gap-1.5 items-start" style={{ fontSize: 9, color: "#a1a1a1", letterSpacing: "0.1em" }}>
        <Step text="Sequence validated" delayMs={0} elapsed={elapsed} />
        <Step text="Structure prediction initiated" delayMs={2000} elapsed={elapsed * 1000} />
        <Step text="Folding" delayMs={4000} elapsed={elapsed * 1000} animated />
      </div>
      <div
        className="absolute font-mono"
        style={{ right: 14, bottom: 12, fontSize: 9, color: "#404040", letterSpacing: "0.15em", fontVariantNumeric: "tabular-nums" }}
      >
        {mm}:{ss}
      </div>
    </div>
  );
}

function Step({ text, delayMs, elapsed, animated }: { text: string; delayMs: number; elapsed: number; animated?: boolean }) {
  const visible = elapsed * 1000 >= delayMs || delayMs === 0;
  return (
    <div style={{ opacity: visible ? 1 : 0.25, transition: "opacity 200ms ease" }}>
      <span style={{ color: "#fafafa", marginRight: 6 }}>▸</span>
      {text}{animated && <span className="animate-praxis-dots">...</span>}
    </div>
  );
}

function Hex({ size, stroke, duration, reverse }: { size: number; stroke: string; duration: string; reverse?: boolean }) {
  const c = size / 2;
  const r = size / 2 - 2;
  const points = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${c + r * Math.cos(a)},${c + r * Math.sin(a)}`;
  }).join(" ");
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="absolute inset-0 m-auto"
      style={{
        animation: `praxis-spin ${duration} linear infinite${reverse ? " reverse" : ""}`,
        transformOrigin: "center",
      }}
    >
      <polygon points={points} fill="none" stroke={stroke} strokeWidth={1.5} />
    </svg>
  );
}

function ErrorPanel({
  title, message, suggestion, proteinName, onRetry, uniprot,
}: {
  title: string;
  message: string;
  suggestion: string;
  proteinName: string;
  onRetry?: () => void;
  uniprot?: boolean;
}) {
  const [query, setQuery] = useState(proteinName);
  const rcsbHref = `https://www.rcsb.org/search?request=%7B%22query%22%3A%7B%22type%22%3A%22terminal%22%2C%22service%22%3A%22full_text%22%2C%22parameters%22%3A%7B%22value%22%3A%22${encodeURIComponent(query)}%22%7D%7D%2C%22return_type%22%3A%22entry%22%7D`;
  const uniprotHref = `https://www.uniprot.org/uniprotkb?query=${encodeURIComponent(query)}`;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
      {/* Amber hex outline */}
      <svg width={88} height={88} viewBox="0 0 80 80" className="mb-4">
        <polygon points="40,4 72,22 72,58 40,76 8,58 8,22" fill="none" stroke="hsl(var(--accent-amber))" strokeWidth={1.5} />
      </svg>
      <div className="font-mono text-[10px] tracking-[0.2em] text-ax-amber uppercase mb-4">
        STRUCTURE UNAVAILABLE
      </div>
      <div className="w-full max-w-sm">
        <AgentError
          agent="TAMARIND"
          title={title}
          message={message}
          suggestion={suggestion}
          canRetry={!!onRetry}
          onRetry={onRetry}
          actions={[
            uniprot
              ? { label: "SEARCH UNIPROT ↗", href: uniprotHref }
              : { label: "SEARCH RCSB ↗", href: rcsbHref, variant: "primary" },
          ]}
        />
        <div className="mt-3 flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
            className="flex-1 h-7 bg-card border border-border px-2 font-mono text-[10px] text-foreground outline-none focus:border-foreground/40"
            placeholder="Protein name"
          />
          <a
            href={uniprot ? uniprotHref : rcsbHref}
            target="_blank"
            rel="noreferrer"
            className="h-7 px-3 inline-flex items-center justify-center bg-transparent rounded-none font-mono text-[9px] font-bold tracking-[0.18em] uppercase border border-foreground/40 text-foreground hover:bg-foreground/10 transition-colors"
          >
            SEARCH
          </a>
        </div>
      </div>
    </div>
  );
}
