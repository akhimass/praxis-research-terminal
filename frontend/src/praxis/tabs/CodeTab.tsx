import { useEffect, useMemo, useRef, useState } from "react";
import { CodeScript, CodeLang } from "../lib/types";
import { AgentError } from "@/components/AgentError";

/* ---------- highlight.js loader (singleton) ---------- */

declare global {
  interface Window { hljs?: any; __praxisHljsPromise?: Promise<any>; }
}

const HLJS_VERSION = "11.9.0";

function loadHljs(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.hljs) return Promise.resolve(window.hljs);
  if (window.__praxisHljsPromise) return window.__praxisHljsPromise;
  window.__praxisHljsPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://cdn.jsdelivr.net/npm/highlight.js@${HLJS_VERSION}/lib/common.min.js`;
    s.async = true;
    s.onload = () => {
      // R isn't in "common" — load it separately.
      const r = document.createElement("script");
      r.src = `https://cdn.jsdelivr.net/npm/highlight.js@${HLJS_VERSION}/lib/languages/r.min.js`;
      r.async = true;
      r.onload = () => {
        try { window.hljs?.registerLanguage?.("r", (window as any).hljsR ?? (window as any).r); } catch { /* registered automatically by UMD */ }
        resolve(window.hljs);
      };
      r.onerror = () => resolve(window.hljs); // R may be available via UMD self-register
      document.head.appendChild(r);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.__praxisHljsPromise;
}

/* ---------- design tokens ---------- */

const LANG_COLOR: Record<CodeLang, string> = {
  python: "#fafafa",
  r:      "#fafafa",
  shell:  "#a1a1a1",
};
const LANG_LABEL: Record<CodeLang, string> = {
  python: "PYTHON",
  r:      "R",
  shell:  "SHELL",
};
const LANG_EXT: Record<CodeLang, string> = {
  python: ".py",
  r:      ".R",
  shell:  ".sh",
};
const HLJS_LANG: Record<CodeLang, string> = {
  python: "python",
  r:      "r",
  shell:  "bash",
};

/* PRAXIS hljs theme — inlined so it overrides any default. */
const PRAXIS_HLJS_CSS = `
.praxis-code .hljs            { color: #a0b8d0; background: transparent; }
.praxis-code .hljs-keyword,
.praxis-code .hljs-selector-tag,
.praxis-code .hljs-literal,
.praxis-code .hljs-section,
.praxis-code .hljs-link        { color: #fafafa; }
.praxis-code .hljs-string,
.praxis-code .hljs-attr,
.praxis-code .hljs-symbol,
.praxis-code .hljs-bullet      { color: #fafafa; }
.praxis-code .hljs-comment,
.praxis-code .hljs-quote,
.praxis-code .hljs-meta        { color: #404040; font-style: italic; }
.praxis-code .hljs-number,
.praxis-code .hljs-regexp      { color: #a1a1a1; }
.praxis-code .hljs-title,
.praxis-code .hljs-name,
.praxis-code .hljs-title.function_,
.praxis-code .hljs-built_in    { color: #fafafa; }
.praxis-code .hljs-type,
.praxis-code .hljs-class .hljs-title,
.praxis-code .hljs-builtin-name { color: #ff4d4d; }
.praxis-code .hljs-operator,
.praxis-code .hljs-punctuation { color: #fafafa; }
`;

function PraxisHljsStyle() {
  return <style dangerouslySetInnerHTML={{ __html: PRAXIS_HLJS_CSS }} />;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ---------- error state ---------- */

function ErrorContent({ assayType, onRetry }: { assayType: string; onRetry?: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <AgentError
          agent="BIOINFORMATICS"
          title="Script generation incomplete"
          message="Could not generate analysis scripts for this assay type."
          suggestion={`Download template scripts for ${assayType} assays.`}
          canRetry={!!onRetry}
          onRetry={onRetry}
          actions={[
            { label: "↓ MIC_ANALYSIS.PY", href: "/templates/mic_analysis_template.py" },
            { label: "↓ VISUALIZATION.PY", href: "/templates/visualization_template.py" },
            { label: "↓ STATISTICS.R", href: "/templates/statistics_template.R" },
          ]}
        />
      </div>
    </div>
  );
}

/* ---------- empty + loading states ---------- */

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center font-mono">
      <div style={{ fontSize: 9, color: "#404040", letterSpacing: "0.2em" }}>
        BIOINFORMATICS AGENT PENDING
      </div>
      <div className="my-6" style={{ fontSize: 32, color: "#a1a1a1", lineHeight: 1, animation: "praxis-blink 1s steps(2) infinite" }}>
        _
      </div>
      <div style={{ fontSize: 10, color: "#404040", maxWidth: 380, textAlign: "center", lineHeight: 1.6 }}>
        Generated Python and R analysis scripts will appear here as the
        bioinformatics agent completes synthesis.
      </div>
      <style>{`@keyframes praxis-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }`}</style>
    </div>
  );
}

const PLACEHOLDER_LINES = [
  "# PRAXIS: streaming analysis script...",
  "import pandas as pd",
  "import numpy as np",
  "",
  "def analyze(df):",
  "    return df.groupby('haplotype').median()",
  "",
  "# USER: replace with your isolate table",
  "df = pd.read_csv('isolates.csv')",
  "result = analyze(df)",
  "print(result)",
];

function LoadingState() {
  const [chars, setChars] = useState(0);
  const full = PLACEHOLDER_LINES.join("\n");
  useEffect(() => {
    let n = 0;
    const id = window.setInterval(() => {
      n = Math.min(full.length, n + 2);
      setChars(n);
      if (n >= full.length) window.clearInterval(id);
    }, 25); // ~80 chars/sec
    return () => window.clearInterval(id);
  }, [full.length]);
  const visible = full.slice(0, chars);
  const lines = visible.split("\n");
  return (
    <div className="flex-1 flex">
      <div style={{ width: 48, background: "#000000", borderRight: "1px solid #262626", padding: "12px 8px 12px 0" }}>
        {Array.from({ length: PLACEHOLDER_LINES.length }).map((_, i) => (
          <div key={i} className="font-mono text-right" style={{ fontSize: 10, color: "#262626", lineHeight: 1.7 }}>
            {String(i + 1).padStart(2, "0")}
          </div>
        ))}
      </div>
      <pre className="font-mono flex-1 m-0 px-4 py-3" style={{ fontSize: 11, color: "#262626", lineHeight: 1.7, whiteSpace: "pre" }}>
        {lines.join("\n")}
        <span style={{ color: "#a1a1a1", animation: "praxis-blink 1s steps(2) infinite" }}>▌</span>
      </pre>
      <style>{`@keyframes praxis-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }`}</style>
    </div>
  );
}

/* ---------- stub overlay for short scripts ---------- */

function StubOverlay() {
  return (
    <div 
      style={{ 
        position: "absolute", 
        inset: 0, 
        background: "rgba(5, 10, 20, 0.85)", 
        display: "flex", 
        flexDirection: "column",
        alignItems: "center", 
        justifyContent: "center",
        zIndex: 10,
      }}
    >
      <div 
        className="font-mono"
        style={{ 
          fontSize: 11, 
          color: "#5a7a9a", 
          letterSpacing: "0.2em",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        GENERATING FULL SCRIPT
        <span style={{ animation: "praxis-dots 1.5s steps(4) infinite" }}>...</span>
      </div>
      <style>{`
        @keyframes praxis-dots {
          0% { opacity: 0.2; }
          25% { opacity: 0.4; }
          50% { opacity: 0.6; }
          75% { opacity: 0.8; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ---------- file tab bar ---------- */

function FileTabBar({ scripts, active, onSelect }: { scripts: CodeScript[]; active: number; onSelect: (i: number) => void }) {
  return (
    <div className="flex items-stretch shrink-0" style={{ background: "#000000", borderBottom: "1px solid #262626" }}>
      {scripts.map((s, i) => {
        const isActive = i === active;
        const color = LANG_COLOR[s.language];
        const lineCount = s.code.split("\n").length;
        const isStub = lineCount < 10;
        return (
          <button
            key={s.name}
            type="button"
            onClick={() => onSelect(i)}
            className="font-mono inline-flex items-center gap-2 transition-all duration-150"
            style={{
              height: 28,
              padding: "0 14px",
              fontSize: 10,
              background: isActive ? "#111111" : "transparent",
              color: isActive ? "#fafafa" : "#404040",
              borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            <span style={{ display: "inline-block", width: 6, height: 6, background: color, boxShadow: isActive ? `0 0 6px ${color}` : "none" }} />
            <span>{s.name}</span>
            <span style={{ color: isStub ? "#f0a500" : "#404040", marginLeft: 4 }}>
              {isStub ? "STUB" : `${lineCount} LINES`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- code panel with line numbers + annotations ---------- */

type LineKind = "default" | "user" | "praxis";

function classifyLines(code: string): { text: string; kind: LineKind }[] {
  return code.split("\n").map((text) => {
    const t = text.trimStart();
    if (t.startsWith("# USER:") || t.startsWith("// USER:")) return { text, kind: "user" as LineKind };
    if (t.startsWith("# PRAXIS:") || t.startsWith("// PRAXIS:")) return { text, kind: "praxis" as LineKind };
    return { text, kind: "default" as LineKind };
  });
}

function CodePanel({ script }: { script: CodeScript }) {
  const [hljs, setHljs] = useState<any>(null);
  const [hoverLine, setHoverLine] = useState<number | null>(null);
  const codeRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadHljs().then(setHljs).catch(() => setHljs(null)); }, []);

  const lines = useMemo(() => classifyLines(script.code), [script.code]);
  const lang = HLJS_LANG[script.language];
  const isStub = lines.length < 10;

  const renderedLines = useMemo(() => {
    return lines.map((l) => {
      if (l.kind !== "default") return { ...l, html: escapeHtml(l.text) };
      let html = escapeHtml(l.text);
      if (hljs && hljs.getLanguage?.(lang)) {
        try {
          html = hljs.highlight(l.text, { language: lang, ignoreIllegals: true }).value;
        } catch { /* fall back to escaped */ }
      }
      return { ...l, html };
    });
  }, [lines, hljs, lang]);

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden relative" style={{ background: "#050505" }}>
      <PraxisHljsStyle />
      
      {/* Stub overlay for short scripts */}
      {isStub && <StubOverlay />}
      
      {/* Line numbers */}
      <div
        className="shrink-0 select-none praxis-scroll overflow-y-hidden"
        style={{ width: 48, background: "#000000", borderRight: "1px solid #262626", padding: "12px 8px 12px 0" }}
      >
        {renderedLines.map((_, i) => (
          <div
            key={i}
            className="font-mono text-right"
            style={{ fontSize: 10, lineHeight: 1.7, color: hoverLine === i ? "#a1a1a1" : "#404040" }}
          >
            {String(i + 1).padStart(2, "0")}
          </div>
        ))}
      </div>
      {/* Code area */}
      <div ref={codeRef} className="praxis-code praxis-scroll overflow-auto flex-1" style={{ padding: "12px 0" }}>
        {renderedLines.map((l, i) => {
          const baseStyle: React.CSSProperties = {
            fontSize: 11,
            lineHeight: 1.7,
            padding: "0 16px",
            whiteSpace: "pre",
            fontFamily: '"IBM Plex Mono", monospace',
            background: hoverLine === i ? "#11111120" : "transparent",
            transition: "background 100ms ease",
          };
          if (l.kind === "user") {
            return (
              <div
                key={i}
                onMouseEnter={() => setHoverLine(i)}
                onMouseLeave={() => setHoverLine(null)}
                style={{
                  ...baseStyle,
                  background: hoverLine === i ? "#a1a1a122" : "#a1a1a115",
                  borderLeft: "2px solid #a1a1a1",
                  paddingLeft: 14,
                  color: "#a1a1a1",
                }}
              >
                {l.text || "\u00a0"}
              </div>
            );
          }
          if (l.kind === "praxis") {
            return (
              <div
                key={i}
                onMouseEnter={() => setHoverLine(i)}
                onMouseLeave={() => setHoverLine(null)}
                style={{ ...baseStyle, color: "#fafafa", fontStyle: "italic" }}
              >
                {l.text || "\u00a0"}
              </div>
            );
          }
          return (
            <div
              key={i}
              onMouseEnter={() => setHoverLine(i)}
              onMouseLeave={() => setHoverLine(null)}
              style={baseStyle}
              dangerouslySetInnerHTML={{ __html: l.html || "&nbsp;" }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ---------- meta panel ---------- */

function MetaPanel({ script }: { script: CodeScript }) {
  const [copied, setCopied] = useState(false);
  const [cloudState, setCloudState] = useState<"idle" | "pending" | "complete">("idle");
  const langColor = LANG_COLOR[script.language];
  const ext = LANG_EXT[script.language];
  const lineCount = script.code.split("\n").length;
  const isStub = lineCount < 10;

  const onCopy = async () => {
    try { await navigator.clipboard.writeText(script.code); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = script.code; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const onDownload = () => {
    const blob = new Blob([script.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = script.name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onRunInCloud = () => {
    setCloudState("pending");
    window.setTimeout(() => {
      setCloudState("complete");
      window.setTimeout(() => setCloudState("idle"), 3000);
    }, 2000);
  };

  const colabHref = script.colabUrl ?? "https://colab.research.google.com/";

  return (
    <aside
      className="shrink-0 flex flex-col overflow-y-auto praxis-scroll"
      style={{ width: "25%", minWidth: 240, background: "#0a0a0a", borderLeft: "1px solid #262626", padding: 16 }}
    >
      {/* TOP */}
      <div className="font-mono font-bold" style={{ fontSize: 13, color: "#fafafa", wordBreak: "break-all" }}>
        {script.name}
      </div>
      <div className="mt-2">
        <span
          className="font-mono font-bold inline-block"
          style={{ fontSize: 9, padding: "3px 8px", color: langColor, border: `1px solid ${langColor}66`, letterSpacing: "0.2em" }}
        >
          {LANG_LABEL[script.language]}
        </span>
      </div>
      
      {/* Key finding banner with proper overflow handling */}
      <div 
        className="font-mono mt-3" 
        style={{ 
          fontSize: 11, 
          color: "#a1a1a1", 
          lineHeight: 1.5,
          maxHeight: 60,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
        }}
        title={script.purpose}
      >
        {script.purpose}
      </div>
      
      <div className="font-mono mt-3 flex justify-between" style={{ fontSize: 9, color: "#404040", letterSpacing: "0.15em" }}>
        <span style={{ color: isStub ? "#f0a500" : "#404040" }}>
          {isStub ? "STUB — BACKEND GENERATING" : `${lineCount} LINES`}
        </span>
      </div>
      <div className="font-mono mt-1" style={{ fontSize: 9, color: "#404040" }}>
        GENERATED BY · {script.generatedBy ?? "PRAXIS Bioinformatics Agent"}
      </div>

      {/* MIDDLE */}
      {script.requires && script.requires.length > 0 && (
        <div className="mt-5 pt-4" style={{ borderTop: "1px solid #262626" }}>
          <div className="font-mono mb-2" style={{ fontSize: 9, color: "#404040", letterSpacing: "0.2em" }}>
            REQUIRES
          </div>
          <div className="flex flex-wrap gap-1">
            {script.requires.map((r) => {
              const dot = r.standard ? "#fafafa" : "#a1a1a1";
              const installer = script.language === "r" ? `install.packages("${r.name}")` : `pip install ${r.name}`;
              return (
                <span
                  key={r.name}
                  title={r.standard ? r.name : installer}
                  className="font-mono inline-flex items-center gap-1.5"
                  style={{
                    fontSize: 10,
                    background: "#111111",
                    border: "1px solid #262626",
                    color: "#fafafa",
                    padding: "3px 8px",
                    cursor: r.standard ? "default" : "help",
                  }}
                >
                  <span style={{ width: 6, height: 6, background: dot, boxShadow: r.standard ? "none" : `0 0 6px ${dot}` }} />
                  {r.name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* BOTTOM */}
      <div className="mt-5 pt-4 flex flex-col gap-2" style={{ borderTop: "1px solid #262626" }}>
        <button
          type="button"
          onClick={onCopy}
          className="font-mono font-bold transition-all duration-150"
          style={{
            height: 32,
            background: "transparent",
            border: "1px solid #fafafa44",
            color: "#fafafa",
            fontSize: 10,
            letterSpacing: "0.15em",
            cursor: "pointer",
          }}
        >
          {copied ? "COPIED ✓" : "COPY CODE"}
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="font-mono font-extrabold transition-all duration-150"
          style={{
            height: 32,
            background: "#fafafa",
            color: "#000",
            fontSize: 10,
            letterSpacing: "0.15em",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
        >
          DOWNLOAD {ext}
        </button>
        <a
          href={colabHref}
          target="_blank"
          rel="noreferrer"
          className="font-mono font-bold inline-flex items-center justify-center transition-all duration-150"
          style={{
            height: 32,
            background: "transparent",
            border: "1px solid #fafafa44",
            color: "#fafafa",
            fontSize: 10,
            letterSpacing: "0.15em",
            textDecoration: "none",
          }}
        >
          RUN IN NOTEBOOK
        </a>
        
        {/* Run in Cloud button */}
        <button
          type="button"
          onClick={onRunInCloud}
          disabled={cloudState !== "idle"}
          className="font-mono font-bold transition-all duration-150"
          style={{
            height: 32,
            background: "#4d9fff18",
            border: "1px solid #4d9fff44",
            color: cloudState === "complete" ? "#00d97e" : "#4d9fff",
            fontSize: 9,
            letterSpacing: "0.15em",
            cursor: cloudState === "idle" ? "pointer" : "default",
          }}
        >
          {cloudState === "idle" && "▶ RUN IN CLOUD"}
          {cloudState === "pending" && "MODAL GPU PENDING..."}
          {cloudState === "complete" && "✓ EXECUTION COMPLETE"}
        </button>
      </div>
    </aside>
  );
}

/* ---------- main tab ---------- */

interface Props {
  scripts: CodeScript[];
  loading: boolean;
  errored?: boolean;
  assayType?: string;
  onRetry?: () => void;
}

export function CodeTab({ scripts, loading, errored, assayType = "MIC", onRetry }: Props) {
  const [active, setActive] = useState(0);

  // Reset selection if scripts change in a way that invalidates index
  useEffect(() => {
    if (active >= scripts.length) setActive(0);
  }, [scripts.length, active]);

  const current = scripts[active];

  return (
    <div
      className="flex flex-col w-full animate-praxis-fade"
      style={{ background: "#000000", height: "100%", minHeight: 480 }}
    >
      {scripts.length > 0 && (
        <FileTabBar scripts={scripts} active={active} onSelect={setActive} />
      )}

      <div className="flex flex-1 min-h-0">
        {scripts.length === 0 && !loading && errored && (
          <ErrorContent assayType={assayType} onRetry={onRetry} />
        )}
        {scripts.length === 0 && !loading && !errored && <EmptyState />}
        {scripts.length === 0 && loading && <LoadingState />}
        {current && (
          <>
            <CodePanel script={current} />
            <MetaPanel script={current} />
          </>
        )}
      </div>

      <div
        className="shrink-0 flex items-center px-4"
        style={{ height: 24, background: "#000000", borderTop: "1px solid #262626" }}
      >
        <span className="font-mono" style={{ fontSize: 9, color: "#404040", letterSpacing: "0.15em" }}>
          PRAXIS BIOINFORMATICS ENGINE · {scripts.length} SCRIPTS GENERATED · {scripts.length > 0 ? "READY TO EXECUTE" : "AWAITING SYNTHESIS"}
        </span>
      </div>
    </div>
  );
}

export default CodeTab;
