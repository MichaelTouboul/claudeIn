import { type ReactElement } from "react";

import { ImproveNotification } from "@/components/Header/ImproveNotification/ImproveNotification";
import { VersionNotification } from "@/components/Header/VersionNotification/VersionNotification";
import { ImproveModal } from "@/components/ImproveModal/ImproveModal";
import { useBootPage } from "@/hooks/useBootPage";
import { useImproveContextMenu } from "@/hooks/useImproveContextMenu";
import { useInitImprove } from "@/hooks/useInitImprove";
import { useInitVersion } from "@/hooks/useInitVersion";
import { CustomizePage } from "@/pages/CustomizePage/CustomizePage";
import { DashboardPage } from "@/pages/DashboardPage/DashboardPage";
import { HomePage } from "@/pages/HomePage/HomePage";
import { OnboardingPage } from "@/pages/OnboardingPage/OnboardingPage";
import { AppPage } from "@/store/useAppStore";

/** Value→render map: each page maps to its component (no fallback chains). */
const PAGE_VIEW: Record<AppPage, () => ReactElement> = {
  [AppPage.Onboarding]: () => <OnboardingPage />,
  [AppPage.Home]: () => <HomePage />,
  [AppPage.Dashboard]: () => <DashboardPage />,
  [AppPage.Customize]: () => <CustomizePage />,
};

/**
 * The Header notification overlays (Self-Improve + app-version) are hidden during
 * first-run onboarding only; always discoverable on every other page. Value→
 * behavior map, not a fallback chain (CLAUDE.md).
 */
const SHOW_HEADER_OVERLAYS: Record<AppPage, boolean> = {
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
  // App-version notification — watch package.json for land.sh bumps + subscribe
  // + seed once at the root, same lifecycle as the improve notification.
  useInitVersion();
  if (currentPage === null) {
    return <BootLoader />;
  }
  return (
    <>
      {PAGE_VIEW[currentPage]()}
      {SHOW_HEADER_OVERLAYS[currentPage] ? (
        // Top-right notification overlay. The page top bars reserve a matching
        // right gutter (`--header-overlay-gutter`) so these two buttons never
        // sit on top of the header's right-edge controls.
        <div className="fixed top-3 right-3 z-[60] flex items-center gap-2">
          <VersionNotification />
          <ImproveNotification />
        </div>
      ) : null}
      <ImproveModal />
    </>
  );
}
