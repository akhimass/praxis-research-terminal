import { useMemo, useRef, useState } from "react";
import { Header } from "./Header";
import { HypothesisInput } from "./HypothesisInput";
import { AgentPanel } from "./AgentPanel";
import { TraceLog } from "./TraceLog";
import { TabBar, TabId, TabDotStatus } from "./TabBar";
import { KeyFindingBanner } from "./KeyFindingBanner";
import { EmptyState } from "./EmptyState";
import { ScienceTab, LiteratureStatus } from "./tabs/ScienceTab";
import { ProtocolTab } from "./tabs/ProtocolTab";
import { PlaceholderTab } from "./tabs/PlaceholderTab";
import { RisksTab } from "./tabs/RisksTab";
import { CodeTab } from "./tabs/CodeTab";
import { BudgetTab } from "./tabs/BudgetTab";
import { FundingTab } from "./tabs/FundingTab";
import { ReviewDrawer } from "./ReviewDrawer";
import { usePraxisStream, DEMO_HYPOTHESIS } from "@/hooks/usePraxisStream";
import { PrintableReport, type ResearchProgram } from "@/components/PrintableReport";
import { SkeletonWrapper } from "@/components/SkeletonWrapper";
import {
  ScienceSkeleton,
  ProtocolSkeleton,
  CodeSkeleton,
  BudgetSkeleton,
  FundingSkeleton,
  RisksSkeleton,
} from "./skeletons/TabSkeletons";
import {
  keyFindingText,
  mapNoveltyToTabSignal,
  mapStreamAgents,
  mapStreamAudit,
  mapStreamBudget,
  mapStreamFunding,
  mapStreamPapers,
  mapStreamProtocol,
  mapStreamScripts,
  mapStreamTrace,
  mapTamarindForViewer,
  streamHeaderStatus,
} from "./streamMappers";

export function Praxis() {
  const { state: stream, run: runStream, runDemo, cancel, reset, clearKeyFinding } = usePraxisStream();
  const [hypothesis, setHypothesis] = useState("");
  const lastHypothesisRef = useRef("");
  const [tab, setTab] = useState<TabId>("SCIENCE");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const uiAgents = useMemo(() => mapStreamAgents(stream.agentStates as Record<string, { state: string; duration?: number; finding?: string }>), [stream.agentStates]);
  const papers = useMemo(() => mapStreamPapers(stream.papers), [stream.papers]);
  const protocol = useMemo(() => mapStreamProtocol(stream.protocolSteps), [stream.protocolSteps]);
  const scripts = useMemo(() => mapStreamScripts(stream.scripts), [stream.scripts]);
  const budget = useMemo(
    () => mapStreamBudget(stream.reagents, stream.budgetTotal, stream.estimatedWeeks),
    [stream.reagents, stream.budgetTotal, stream.estimatedWeeks],
  );
  const funding = useMemo(() => mapStreamFunding(stream.funding), [stream.funding]);
  const audit = useMemo(() => mapStreamAudit(stream.auditFlags), [stream.auditFlags]);
  const tamarind = useMemo(() => mapTamarindForViewer(stream.tamarind), [stream.tamarind]);
  const trace = useMemo(() => mapStreamTrace(stream.trace), [stream.trace]);
  const noveltyTab = useMemo(() => mapNoveltyToTabSignal(stream.novelty), [stream.novelty]);
  const keyFindingStr = useMemo(() => keyFindingText(stream.keyFinding), [stream.keyFinding]);

  const headerStatus = streamHeaderStatus(stream.phase, stream.agentStates as Record<string, { state: string }>);

  const isRunning = stream.isRunning;
  const anyData =
    papers.length > 0 ||
    protocol.length > 0 ||
    scripts.length > 0 ||
    budget.reagents.length > 0 ||
    funding.grants.length > 0 ||
    audit.length > 0 ||
    tamarind != null;

  const tabStatus = useMemo<Partial<Record<TabId, TabDotStatus>>>(() => {
    const ag = uiAgents;
    const s = (a: keyof typeof ag, hasData: boolean): TabDotStatus => {
      const st = ag[a]?.state;
      if (st === "running") return "running";
      if (st === "error") return "error";
      if (st === "complete" && !hasData) return "warn";
      if (hasData) return "ok";
      return "none";
    };
    return {
      SCIENCE: s("literature", papers.length > 0 || tamarind != null),
      PROTOCOL: s("protocol", protocol.length > 0),
      CODE: s("bioinformatics", scripts.length > 0),
      BUDGET: s("reagents", budget.reagents.length > 0),
      FUNDING: s("funding", funding.grants.length > 0),
      RISKS: s("audit", audit.length > 0),
    };
  }, [uiAgents, papers.length, protocol.length, scripts.length, budget.reagents.length, funding.grants.length, audit.length, tamarind]);

  const failedAgents = useMemo(
    () => Object.entries(uiAgents).filter(([, a]) => a.state === "error").map(([id]) => id),
    [uiAgents],
  );
  const hasFailures = failedAgents.length > 0;
  const headerDisplay =
    headerStatus === "COMPLETE" && hasFailures ? ("PARTIAL" as const) : headerStatus;

  const literatureStatus: LiteratureStatus =
    uiAgents.literature?.state === "error"
      ? "api_error"
      : uiAgents.literature?.state === "complete" && papers.length === 0
        ? "no_results"
        : "ok";

  const codeErrored =
    uiAgents.bioinformatics?.state === "error" ||
    (uiAgents.bioinformatics?.state === "complete" && scripts.length === 0);

  const fundingErrored =
    uiAgents.funding?.state === "error" ||
    (uiAgents.funding?.state === "complete" && funding.grants.length === 0);

  const loading = {
    SCIENCE: uiAgents.literature?.state === "running" && papers.length === 0,
    PROTOCOL: uiAgents.protocol?.state === "running" && protocol.length === 0,
    CODE: uiAgents.bioinformatics?.state === "running" && scripts.length === 0,
    BUDGET: uiAgents.reagents?.state === "running" && budget.reagents.length === 0,
    FUNDING: uiAgents.funding?.state === "running" && funding.grants.length === 0,
    RISKS: uiAgents.audit?.state === "running" && audit.length === 0,
  };

  const program: ResearchProgram = {
    hypothesis: lastHypothesisRef.current || hypothesis,
    papers,
    protocol,
    budget,
    funding,
    audit,
    keyFinding: keyFindingStr,
    estimatedWeeks: budget.estimatedWeeks,
    noveltySignal: noveltyTab ?? "NOT FOUND",
  };

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      window.print();
      setExporting(false);
    }, 300);
  };

  const run = (h: string) => {
    lastHypothesisRef.current = h;
    void runStream(h);
  };

  const handleDemo = () => {
    setHypothesis(DEMO_HYPOTHESIS);
    lastHypothesisRef.current = DEMO_HYPOTHESIS;
    void runDemo();
  };

  const handleReset = () => {
    reset();
    setHypothesis("");
    lastHypothesisRef.current = "";
  };

  const retry = () => {
    const h = lastHypothesisRef.current || hypothesis.trim();
    if (h) void runStream(h);
  };

  const hasDataFlags = {
    science: papers.length > 0 || tamarind != null,
    protocol: protocol.length > 0,
    code: scripts.length > 0,
    budget: budget.reagents.length > 0,
    funding: funding.grants.length > 0,
    risks: audit.length > 0,
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground font-sans overflow-hidden">
      <Header
        status={headerDisplay}
        onReviewClick={() => setReviewOpen(true)}
        onExportClick={handleExport}
        exportDisabled={!anyData}
        exporting={exporting}
        hasFailures={hasFailures}
        onRetryFailed={retry}
      />

      <div className="flex flex-1 min-h-0">
        <aside className="flex flex-col shrink-0 w-[320px] bg-surface-deep border-r border-border">
          <HypothesisInput
            disabled={isRunning}
            onRun={run}
            value={hypothesis}
            onChange={setHypothesis}
            isRunning={isRunning}
            onDemo={handleDemo}
            onCancel={cancel}
            onReset={handleReset}
          />
          <AgentPanel agents={uiAgents} />
          <TraceLog entries={trace} />
        </aside>

        <main className="flex-1 flex flex-col min-w-0 bg-background">
          <TabBar active={tab} onChange={setTab} hasData={hasDataFlags} status={tabStatus} />
          {stream.novelty && (
            <div className="px-5 py-2 border-b border-ax-amber/30 bg-ax-amber/5 font-mono text-[10px] text-foreground/90 shrink-0">
              <span className="font-bold tracking-[0.15em] text-ax-amber">NOVELTY</span>
              <span className="mx-2 opacity-60">·</span>
              <span className="uppercase">{stream.novelty.signal.replace(/_/g, " ")}</span>
              <span className="mx-2 opacity-60">—</span>
              {stream.novelty.summary}
            </div>
          )}
          {keyFindingStr && (
            <KeyFindingBanner text={keyFindingStr} onDismiss={clearKeyFinding} />
          )}
          <section
            className={`flex-1 min-h-0 ${tab === "CODE" || tab === "BUDGET" || tab === "FUNDING" ? "overflow-hidden" : "overflow-y-auto praxis-scroll"}`}
            style={tab === "CODE" || tab === "BUDGET" || tab === "FUNDING" ? { padding: 0 } : { padding: 20 }}
          >
            {!anyData && !isRunning ? (
              <EmptyState />
            ) : tab === "SCIENCE" ? (
              <SkeletonWrapper isLoading={loading.SCIENCE} skeleton={<ScienceSkeleton />}>
                <ScienceTab
                  papers={papers}
                  tamarind={tamarind}
                  isStructureLoading={uiAgents.tamarind?.state === "running"}
                  isLoadingLiterature={uiAgents.literature?.state === "running"}
                  isLoadingTamarind={uiAgents.tamarind?.state === "running"}
                  literatureStatus={literatureStatus}
                  novelty={noveltyTab}
                  hypothesisTerms={lastHypothesisRef.current || hypothesis}
                  onRetry={retry}
                />
              </SkeletonWrapper>
            ) : tab === "PROTOCOL" ? (
              <SkeletonWrapper isLoading={loading.PROTOCOL} skeleton={<ProtocolSkeleton />}>
                <ProtocolTab steps={protocol} isLoading={uiAgents.protocol?.state === "running"} />
              </SkeletonWrapper>
            ) : tab === "RISKS" ? (
              <SkeletonWrapper isLoading={loading.RISKS} skeleton={<RisksSkeleton />}>
                <RisksTab flags={audit} isLoading={uiAgents.audit?.state === "running"} />
              </SkeletonWrapper>
            ) : tab === "CODE" ? (
              <SkeletonWrapper isLoading={loading.CODE} skeleton={<CodeSkeleton />}>
                <CodeTab
                  scripts={scripts}
                  loading={uiAgents.bioinformatics?.state === "running"}
                  errored={codeErrored}
                  onRetry={retry}
                />
              </SkeletonWrapper>
            ) : tab === "BUDGET" ? (
              <SkeletonWrapper isLoading={loading.BUDGET} skeleton={<BudgetSkeleton />}>
                <BudgetTab
                  data={budget}
                  loading={uiAgents.reagents?.state === "running" || uiAgents.timeline?.state === "running"}
                  onRetry={retry}
                />
              </SkeletonWrapper>
            ) : tab === "FUNDING" ? (
              <SkeletonWrapper isLoading={loading.FUNDING} skeleton={<FundingSkeleton />}>
                <FundingTab
                  data={funding}
                  loading={uiAgents.funding?.state === "running"}
                  errored={fundingErrored}
                  onRetry={retry}
                />
              </SkeletonWrapper>
            ) : (
              <PlaceholderTab name={tab} />
            )}
          </section>
        </main>
      </div>
      <ReviewDrawer
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        protocol={protocol}
        budget={budget}
        tamarind={tamarind}
      />
      <PrintableReport program={program} />
    </div>
  );
}
