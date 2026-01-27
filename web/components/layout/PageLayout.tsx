"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ErrorBoundary } from "../ui";
import { GlobalNav } from "../nav/GlobalNav";
import { MobileNav } from "../nav/MobileNav";
import { SideNav } from "../nav/SideNav";
import { DegradedBanner } from "../states/DegradedBanner";
import { PolicyBanner } from "../policy/PolicyBanner";
import { DensityProvider } from "./DensityProvider";
import { EffectsProvider } from "./EffectsProvider";
import { InspectorRail } from "./InspectorRail";
import { readPanel, clearPanel, loadPanelMode, savePanelMode, type PanelMode } from "../../lib/panelRouting";
import { SubmissionPanel } from "../panels/SubmissionPanel";
import { ValidationRequestPanel } from "../panels/ValidationRequestPanel";
import { TimeEntryPanel } from "../panels/TimeEntryPanel";
import { ErrorState } from "../states/ErrorState";
import { BackgroundFX } from "../theme/BackgroundFX";

export function PageLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const panelState = readPanel(searchParams);
  const [panelMode, setPanelMode] = useState<PanelMode>("pinned");
  const [isDesktop, setIsDesktop] = useState(true);

  const panelContent = (() => {
    if (!panelState) return null;
    if (panelState.panel === "submission") {
      if (!panelState.panelId || !panelState.params.orgId) {
        return <ErrorState message="Submission panel is missing context." />;
      }
      return <SubmissionPanel submissionId={panelState.panelId} orgId={panelState.params.orgId} />;
    }
    if (panelState.panel === "validation") {
      if (!panelState.panelId) return <ErrorState message="Validation panel is missing context." />;
      return <ValidationRequestPanel requestId={panelState.panelId} />;
    }
    if (panelState.panel === "time-entry") {
      if (!panelState.panelId || !panelState.params.projectSlug) {
        return <ErrorState message="Time entry panel is missing context." />;
      }
      return <TimeEntryPanel entryId={panelState.panelId} projectSlug={panelState.params.projectSlug} />;
    }
    return <ErrorState message="Unknown panel requested." />;
  })();

  const panelTitle = (() => {
    if (!panelState) return "Inspector";
    if (panelState.panel === "submission") return "Submission";
    if (panelState.panel === "validation") return "Validation Request";
    if (panelState.panel === "time-entry") return "Time Entry";
    return "Inspector";
  })();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (globalThis as { __ACHIEVO_PAGE_LAYOUT__?: boolean }).__ACHIEVO_PAGE_LAYOUT__ = true;
    }
  }, []);

  useEffect(() => {
    setPanelMode(loadPanelMode());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  const hasPanel = Boolean(panelContent);
  const effectiveMode: PanelMode = isDesktop ? panelMode : "overlay";
  const showPinnedInGrid = hasPanel && effectiveMode === "pinned";
  const inspectorRail = hasPanel ? (
    <InspectorRail
      title={panelTitle}
      mode={panelMode}
      displayMode={effectiveMode}
      canPin={isDesktop}
      onModeChange={(mode) => {
        setPanelMode(mode);
        savePanelMode(mode);
      }}
      onClose={() => clearPanel({ router, pathname, searchParams })}
    >
      {panelContent}
    </InspectorRail>
  ) : null;

  return (
    <DensityProvider>
      <EffectsProvider>
        <div className="min-h-screen text-text relative overflow-hidden">
          <BackgroundFX />
          <div className="relative z-10">
            <GlobalNav />
            <div
              className={`mx-auto w-full max-w-6xl px-4 pb-24 pt-6 lg:grid lg:gap-8 lg:pb-12 ${
                showPinnedInGrid ? "lg:grid-cols-[220px,1fr,420px]" : "lg:grid-cols-[220px,1fr]"
              }`}
            >
              <SideNav />
              <main className="min-h-[60vh] space-y-6">
                <PolicyBanner />
                <DegradedBanner />
                <ErrorBoundary>{children}</ErrorBoundary>
              </main>
              {showPinnedInGrid ? inspectorRail : null}
            </div>
            {!showPinnedInGrid ? inspectorRail : null}
            <MobileNav />
          </div>
        </div>
      </EffectsProvider>
    </DensityProvider>
  );
}
