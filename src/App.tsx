import { type ReactElement } from "react";

import { CustomizePage } from "@/components/CustomizePage/CustomizePage";
import { DashboardPage } from "@/components/DashboardPage/DashboardPage";
import { HomePage } from "@/components/HomePage/HomePage";
import { OnboardingPage } from "@/components/OnboardingPage/OnboardingPage";
import { useBootPage } from "@/hooks/useBootPage";
import { useImproveContextMenu } from "@/hooks/useImproveContextMenu";
import { AppPage } from "@/store/useAppStore";

/** Value→render map: each page maps to its component (no fallback chains). */
const PAGE_VIEW: Record<AppPage, () => ReactElement> = {
  [AppPage.Onboarding]: () => <OnboardingPage />,
  [AppPage.Home]: () => <HomePage />,
  [AppPage.Dashboard]: () => <DashboardPage />,
  [AppPage.Customize]: () => <CustomizePage />,
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
  if (currentPage === null) {
    return <BootLoader />;
  }
  return PAGE_VIEW[currentPage]();
}
