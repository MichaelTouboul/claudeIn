import { type ReactElement } from "react";

import { CustomizePage } from "@/components/CustomizePage/CustomizePage";
import { DashboardPage } from "@/components/DashboardPage/DashboardPage";
import { ImproveNotification } from "@/components/Header/ImproveNotification/ImproveNotification";
import { HomePage } from "@/components/HomePage/HomePage";
import { ImproveModal } from "@/components/ImproveModal/ImproveModal";
import { OnboardingPage } from "@/components/OnboardingPage/OnboardingPage";
import { useBootPage } from "@/hooks/useBootPage";
import { useImproveContextMenu } from "@/hooks/useImproveContextMenu";
import { useInitImprove } from "@/hooks/useInitImprove";
import { AppPage } from "@/store/useAppStore";

/** Value→render map: each page maps to its component (no fallback chains). */
const PAGE_VIEW: Record<AppPage, () => ReactElement> = {
  [AppPage.Onboarding]: () => <OnboardingPage />,
  [AppPage.Home]: () => <HomePage />,
  [AppPage.Dashboard]: () => <DashboardPage />,
  [AppPage.Customize]: () => <CustomizePage />,
};

/**
 * The Self-Improve notification is hidden during first-run onboarding only;
 * it is always discoverable on every other page. Value→behavior map, not a
 * fallback chain (CLAUDE.md).
 */
const SHOW_IMPROVE_OVERLAY: Record<AppPage, boolean> = {
  [AppPage.Onboarding]: false,
  [AppPage.Home]: true,
  [AppPage.Dashboard]: true,
  [AppPage.Customize]: true,
};

function BootLoader() {
  return (
    <div className="h-full flex items-center justify-center text-fg-subtle bg-surface-0">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const currentPage = useBootPage();
  // Right-click "Improve this…" entry point — captures the clicked component and
  // opens the improve modal via the native context menu (I3). App-root scope.
  useImproveContextMenu();
  // Self-Improve notification (I5) — watch the inbox + subscribe + seed once at
  // the root so it runs regardless of which page is shown (not per-page).
  useInitImprove();
  if (currentPage === null) {
    return <BootLoader />;
  }
  return (
    <>
      {PAGE_VIEW[currentPage]()}
      {SHOW_IMPROVE_OVERLAY[currentPage] ? (
        <div className="fixed top-3 right-3 z-[60]">
          <ImproveNotification />
        </div>
      ) : null}
      <ImproveModal />
    </>
  );
}
