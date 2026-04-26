import { useMemo, useState, useRef } from "react";
import { Header } from "./Header";
import { HypothesisInput, HypothesisInputRef } from "./HypothesisInput";
import { AgentPanel } from "./AgentPanel";
import { TraceLog } from "./TraceLog";
import { TabBar, TabId, TabDotStatus } from "./TabBar";
import { KeyFindingBanner } from "./KeyFindingBanner";
import { EmptyState } from "./EmptyState";
import { ScienceTab, LiteratureStatus, NoveltySignal } from "./tabs/ScienceTab";
import { ProtocolTab } from "./tabs/ProtocolTab";
import { PlaceholderTab } from "./tabs/PlaceholderTab";
import { RisksTab } from "./tabs/RisksTab";
import { CodeTab } from "./tabs/CodeTab";
import { BudgetTab } from "./tabs/BudgetTab";
import { FundingTab } from "./tabs/FundingTab";
import { ReviewDrawer } from "./ReviewDrawer";
import { BackendOfflineOverlay } from "./BackendOfflineOverlay";
import { usePraxisPipeline } from "./lib/usePraxisPipeline";
import { PrintableReport, type ResearchProgram } from "@/components/PrintableReport";
import { SkeletonWrapper } from "@/components/SkeletonWrapper";
import {
  ScienceSkeleton, ProtocolSkeleton, CodeSkeleton,
  BudgetSkeleton, FundingSkeleton, RisksSkeleton,
} from "./skeletons/TabSkeletons";

export function Praxis() {
  const { state, run, dismissKeyFinding, retry } = usePraxisPipeline();
  const [tab, setTab] = useState<TabId>("SCIENCE");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const hypothesisRef = useRef<HypothesisInputRef>(null);

  const handleSelectHypothesis = (hypothesis: string) => {
    hypothesisRef.current?.setValue(hypothesis);
  };

  const anyData = Object.values(state.hasData).some(Boolean);

  // Per-tab status dots derived from agent state + data presence.
  const tabStatus = useMemo<Partial<Record<TabId, TabDotStatus>>>(() => {
    const ag = state.agents;
    const s = (a: keyof typeof ag, hasData: boolean): TabDotStatus => {
      const st = ag[a]?.state;
      if (st === "running") return "running";
      if (st === "error") return "error";
      if (st === "complete" && !hasData) return "warn";
      if (hasData) return "ok";
      return "none";
    };
    return {
      SCIENCE:  s("literature", state.papers.length > 0),
      PROTOCOL: s("protocol", state.protocol.length > 0),
      CODE:     s("bioinformatics", state.bioinformatics.length > 0),
      BUDGET:   s("reagents", state.budget.reagents.length > 0),
      FUNDING:  s("funding", state.funding.grants.length > 0),
      RISKS:    state.audit.length > 0
        ? (state.audit.some((a) => a.severity === "HIGH") ? "error" : "warn")
        : "none",
    };
  }, [state]);

  // Determine partial-failure status.
  const failedAgents = useMemo(
    () => Object.entries(state.agents).filter(([, a]) => a.state === "error").map(([id]) => id),
    [state.agents]
  );
  const hasFailures = failedAgents.length > 0;
  const headerStatus =
    state.status === "COMPLETE" && hasFailures ? "PARTIAL" : state.status;

  // Errored flags for each tab — true when agent errored OR completed but produced no usable data.
  const literatureStatus: LiteratureStatus =
    state.agents.literature?.state === "error"
      ? "api_error"
      : state.agents.literature?.state === "complete" && state.papers.length === 0
        ? "no_results"
        : "ok";

  const novelty: NoveltySignal | undefined =
    state.agents.literature?.state === "complete" && state.papers.length === 0
      ? "NOT FOUND"
      : undefined;

  const codeErrored =
    state.agents.bioinformatics?.state === "error" ||
    (state.agents.bioinformatics?.state === "complete" && state.bioinformatics.length === 0);

  const fundingErrored =
    state.agents.funding?.state === "error" ||
    (state.agents.funding?.state === "complete" && state.funding.grants.length === 0);

  // A tab is "loading" when its agent is running AND no data has arrived yet.
  const loading = {
    SCIENCE: state.agents.literature?.state === "running" && state.papers.length === 0,
    PROTOCOL: state.agents.protocol?.state === "running" && state.protocol.length === 0,
    CODE: state.agents.bioinformatics?.state === "running" && state.bioinformatics.length === 0,
    BUDGET: state.agents.reagents?.state === "running" && state.budget.reagents.length === 0,
    FUNDING: state.agents.funding?.state === "running" && state.funding.grants.length === 0,
    RISKS: state.status === "RUNNING" && state.audit.length === 0,
  };

  const program: ResearchProgram = {
    hypothesis: state.lastHypothesis ?? "",
    papers: state.papers,
    protocol: state.protocol,
    budget: state.budget,
    funding: state.funding,
    audit: state.audit,
    keyFinding: state.keyFinding,
    estimatedWeeks: state.budget?.estimatedWeeks,
    noveltySignal: novelty ?? "NOT FOUND",
  };

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      window.print();
      setExporting(false);
    }, 300);
  };

  const handleRunDemo = () => {
    setOverlayDismissed(true);
    run("Demo: gyrA mutations confer fluoroquinolone resistance in E. coli");
  };

  const handleRetryConnection = () => {
    setOverlayDismissed(true);
    if (state.lastHypothesis) run(state.lastHypothesis);
  };

  // Show overlay only on initial load before any run.
  const showOverlay =
    state.backendOffline && !overlayDismissed && state.status === "READY" && !anyData;

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground font-sans overflow-hidden">
      <Header
        status={headerStatus}
        onReviewClick={() => setReviewOpen(true)}
        onExportClick={handleExport}
        exportDisabled={!anyData}
        exporting={exporting}
        hasFailures={hasFailures}
        onRetryFailed={retry}
      />

      <div className="flex flex-1 min-h-0">
        {/* ZONE B */}
        <aside className="flex flex-col shrink-0 w-[320px] bg-card border-r border-border">
          <HypothesisInput ref={hypothesisRef} disabled={state.status === "RUNNING"} onRun={run} />
          <AgentPanel agents={state.agents} />
          <TraceLog entries={state.trace} />
        </aside>

        {/* ZONE C */}
        <main className="flex-1 flex flex-col min-w-0 bg-background">
          <TabBar
            active={tab}
            onChange={setTab}
            hasData={state.hasData as any}
            status={tabStatus}
          />
          {state.keyFinding && (
            <KeyFindingBanner text={state.keyFinding} onDismiss={dismissKeyFinding} />
          )}
          <section
            className={`flex-1 min-h-0 ${tab === "CODE" || tab === "BUDGET" || tab === "FUNDING" ? "overflow-hidden" : "overflow-y-auto praxis-scroll"}`}
            style={tab === "CODE" || tab === "BUDGET" || tab === "FUNDING" ? { padding: 0 } : { padding: 20 }}
          >
            {!anyData && state.status !== "RUNNING" ? (
              <EmptyState 
                onSelectHypothesis={handleSelectHypothesis}
                textareaRef={hypothesisRef.current?.textareaRef}
              />
            ) : tab === "SCIENCE" ? (
              <SkeletonWrapper isLoading={loading.SCIENCE} skeleton={<ScienceSkeleton />}>
                <ScienceTab
                  papers={state.papers}
                  tamarind={state.tamarind}
                  isStructureLoading={state.agents.structure?.state === "running"}
                  literatureStatus={literatureStatus}
                  novelty={novelty}
                  hypothesisTerms={state.lastHypothesis ?? ""}
                  onRetry={retry}
                />
              </SkeletonWrapper>
            ) : tab === "PROTOCOL" ? (
              <SkeletonWrapper isLoading={loading.PROTOCOL} skeleton={<ProtocolSkeleton />}>
                <ProtocolTab steps={state.protocol} />
              </SkeletonWrapper>
            ) : tab === "RISKS" ? (
              <SkeletonWrapper isLoading={loading.RISKS} skeleton={<RisksSkeleton />}>
                <RisksTab flags={state.audit} />
              </SkeletonWrapper>
            ) : tab === "CODE" ? (
              <SkeletonWrapper isLoading={loading.CODE} skeleton={<CodeSkeleton />}>
                <CodeTab
                  scripts={state.bioinformatics}
                  loading={state.agents.bioinformatics?.state === "running"}
                  errored={codeErrored}
                  onRetry={retry}
                />
              </SkeletonWrapper>
            ) : tab === "BUDGET" ? (
              <SkeletonWrapper isLoading={loading.BUDGET} skeleton={<BudgetSkeleton />}>
                <BudgetTab
                  data={state.budget}
                  loading={state.agents.reagents?.state === "running"}
                  onRetry={retry}
                />
              </SkeletonWrapper>
            ) : tab === "FUNDING" ? (
              <SkeletonWrapper isLoading={loading.FUNDING} skeleton={<FundingSkeleton />}>
                <FundingTab
                  data={state.funding}
                  loading={state.agents.funding?.state === "running"}
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
        protocol={state.protocol}
        budget={state.budget}
        tamarind={state.tamarind}
      />
      <BackendOfflineOverlay
        open={showOverlay}
        onRunDemo={handleRunDemo}
        onRetry={handleRetryConnection}
      />
      <PrintableReport program={program} />
    </div>
  );
}
