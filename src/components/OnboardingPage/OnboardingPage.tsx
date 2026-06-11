import { Button } from "@/components/_ui/Button";
import { AppPage, useAppStore } from "@/store/useAppStore";

/**
 * Stub onboarding page — P4 replaces this with the real consent-gated flow.
 * For now it just lets the router be exercised end to end.
 */
export function OnboardingPage() {
  const navigate = useAppStore((s) => s.navigate);
  return (
    <div
      className="h-full flex flex-col items-center justify-center gap-6 surface-grain"
      style={{ background: 'var(--color-surface-0)', color: 'var(--color-text-primary)' }}
    >
      <h1 className="text-lg font-semibold tracking-[0.02em]" style={{ fontFamily: 'var(--font-mono)' }}>
        Bienvenue dans ClaudeIn
      </h1>
      <p className="text-sm text-fg-muted">Onboarding (à venir)</p>
      <Button intent="primary" size="md" onClick={() => navigate(AppPage.Home)}>
        Commencer
      </Button>
    </div>
  );
}
