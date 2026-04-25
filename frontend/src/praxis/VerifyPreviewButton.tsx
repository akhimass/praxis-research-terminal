import { useState } from "react";

interface Report {
  route: string;
  rootMounted: boolean;
  praxisMounted: boolean;
  headerText: string | null;
  topComponent: string;
  childCount: number;
  bodyBg: string;
  timestamp: string;
}

export function VerifyPreviewButton() {
  const [report, setReport] = useState<Report | null>(null);
  const [open, setOpen] = useState(false);

  const verify = () => {
    const root = document.getElementById("root");
    const firstChild = root?.firstElementChild as HTMLElement | null;
    const praxisHeader = document.querySelector("header");
    const praxisBrand = Array.from(document.querySelectorAll("span")).find(
      (el) => el.textContent?.trim() === "PRAXIS",
    );

    const r: Report = {
      route: window.location.pathname,
      rootMounted: !!root && root.childElementCount > 0,
      praxisMounted: !!praxisBrand,
      headerText: praxisHeader?.textContent?.trim().slice(0, 80) ?? null,
      topComponent: firstChild
        ? `<${firstChild.tagName.toLowerCase()}> .${firstChild.className.toString().slice(0, 60)}`
        : "none",
      childCount: root?.childElementCount ?? 0,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      timestamp: new Date().toISOString().split("T")[1].slice(0, 8),
    };

    setReport(r);
    setOpen(true);
    // eslint-disable-next-line no-console
    console.log("[VerifyPreviewRender]", r);
  };

  return (
    <>
      <button
        type="button"
        onClick={verify}
        className="fixed font-mono font-bold transition-colors"
        style={{
          bottom: 16,
          right: 16,
          zIndex: 9999,
          height: 32,
          padding: "0 14px",
          background: "#0a0a0a",
          border: "1px solid #fafafa66",
          color: "#fafafa",
          fontSize: 10,
          letterSpacing: "0.2em",
          cursor: "pointer",
        }}
      >
        ◈ VERIFY PREVIEW RENDER
      </button>

      {open && report && (
        <div
          className="fixed font-mono"
          style={{
            bottom: 56,
            right: 16,
            zIndex: 9999,
            width: 360,
            background: "#0a0a0a",
            border: "1px solid #262626",
            padding: 14,
            color: "#fafafa",
            fontSize: 10,
            lineHeight: 1.7,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span style={{ color: "#fafafa", letterSpacing: "0.2em", fontWeight: 800 }}>
              ◈ RENDER REPORT
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{ color: "#a1a1a1", background: "transparent", border: "none", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
          <Row k="ROUTE" v={report.route} />
          <Row k="ROOT MOUNTED" v={report.rootMounted ? "✓ YES" : "✗ NO"} ok={report.rootMounted} />
          <Row k="PRAXIS MOUNTED" v={report.praxisMounted ? "✓ YES" : "✗ NO"} ok={report.praxisMounted} />
          <Row k="TOP NODE" v={report.topComponent} />
          <Row k="ROOT CHILDREN" v={String(report.childCount)} />
          <Row k="HEADER" v={report.headerText ?? "—"} />
          <Row k="BODY BG" v={report.bodyBg} />
          <Row k="CHECKED AT" v={report.timestamp} />
          <div
            className="mt-3 pt-2"
            style={{
              borderTop: "1px solid #262626",
              color: report.praxisMounted ? "#fafafa" : "#a1a1a1",
              letterSpacing: "0.15em",
              fontWeight: 700,
            }}
          >
            {report.praxisMounted
              ? "✓ PRAXIS IS RENDERING CORRECTLY"
              : "⚠ PRAXIS NOT FOUND IN DOM"}
          </div>
        </div>
      )}
    </>
  );
}

function Row({ k, v, ok }: { k: string; v: string; ok?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span style={{ color: "#a1a1a1", letterSpacing: "0.15em" }}>{k}</span>
      <span
        style={{
          color: ok === undefined ? "#fafafa" : ok ? "#fafafa" : "#a1a1a1",
          textAlign: "right",
          maxWidth: 220,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {v}
      </span>
    </div>
  );
}