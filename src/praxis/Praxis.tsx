import { useState } from "react";
import { Header } from "./Header";
import { HypothesisInput } from "./HypothesisInput";
import { AgentPanel } from "./AgentPanel";
import { TraceLog } from "./TraceLog";
import { TabBar, TabId } from "./TabBar";
import { KeyFindingBanner } from "./KeyFindingBanner";
import { EmptyState } from "./EmptyState";
import { ScienceTab } from "./tabs/ScienceTab";
import { ProtocolTab } from "./tabs/ProtocolTab";
import { PlaceholderTab } from "./tabs/PlaceholderTab";
import { RisksTab } from "./tabs/RisksTab";
import { CodeTab } from "./tabs/CodeTab";
import { BudgetTab } from "./tabs/BudgetTab";
import { FundingTab } from "./tabs/FundingTab";
import { ReviewDrawer } from "./ReviewDrawer";
import { VerifyPreviewButton } from "./VerifyPreviewButton";
import { usePraxisPipeline } from "./lib/usePraxisPipeline";

export function Praxis() {
  const { state, run, dismissKeyFinding } = usePraxisPipeline();
  const [tab, setTab] = useState<TabId>("SCIENCE");
  const [reviewOpen, setReviewOpen] = useState(false);

  const anyData = Object.values(state.hasData).some(Boolean);

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground font-sans overflow-hidden">
      <Header status={state.status} onReviewClick={() => setReviewOpen(true)} />

      <div className="flex flex-1 min-h-0">
        {/* ZONE B */}
        <aside className="flex flex-col shrink-0 w-[320px] bg-surface-deep border-r border-border">
          <HypothesisInput disabled={state.status === "RUNNING"} onRun={run} />
          <AgentPanel agents={state.agents} />
          <TraceLog entries={state.trace} />
        </aside>

        {/* ZONE C */}
        <main className="flex-1 flex flex-col min-w-0 bg-background">
          <TabBar
            active={tab}
            onChange={setTab}
            hasData={state.hasData as any}
          />
          {state.keyFinding && (
            <KeyFindingBanner text={state.keyFinding} onDismiss={dismissKeyFinding} />
          )}
          <section
            className={`flex-1 min-h-0 ${tab === "CODE" || tab === "BUDGET" || tab === "FUNDING" ? "overflow-hidden" : "overflow-y-auto praxis-scroll"}`}
            style={tab === "CODE" || tab === "BUDGET" || tab === "FUNDING" ? { padding: 0 } : { padding: 20 }}
          >
            {!anyData && state.status !== "RUNNING" ? (
              <EmptyState />
            ) : tab === "SCIENCE" ? (
              <ScienceTab
                papers={state.papers}
                tamarind={state.tamarind}
                isStructureLoading={state.agents.bioinformatics?.state === "running"}
              />
            ) : tab === "PROTOCOL" ? (
              <ProtocolTab steps={state.protocol} />
            ) : tab === "RISKS" ? (
              <RisksTab flags={state.audit} />
            ) : tab === "CODE" ? (
              <CodeTab
                scripts={state.bioinformatics}
                loading={state.agents.bioinformatics?.state === "running"}
              />
            ) : tab === "BUDGET" ? (
              <BudgetTab
                data={state.budget}
                loading={state.agents.reagents?.state === "running"}
              />
            ) : tab === "FUNDING" ? (
              <FundingTab
                data={state.funding}
                loading={state.agents.funding?.state === "running"}
              />
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
      <VerifyPreviewButton />
    </div>
  );
}