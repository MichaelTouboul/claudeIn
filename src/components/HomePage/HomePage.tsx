import { Button } from "@/components/_ui/Button";
import { AppPage, useAppStore } from "@/store/useAppStore";

/**
 * Stub home page — P3 fills this with the real favorites grid + profile.
 * For now it provides a heading and a control to reach the Dashboard so the
 * router is testable.
 */
export function HomePage() {
  const navigate = useAppStore((s) => s.navigate);
  return (
    <div
      className="h-full flex flex-col items-center justify-center gap-6 surface-grain"
      style={{ background: 'var(--color-surface-0)', color: 'var(--color-text-primary)' }}
    >
      <h1 className="text-lg font-semibold tracking-[0.02em]" style={{ fontFamily: 'var(--font-mono)' }}>
        Accueil
      </h1>
      <p className="text-sm text-fg-muted">Vos dépôts favoris apparaîtront ici.</p>
      <Button intent="primary" size="md" onClick={() => navigate(AppPage.Dashboard)}>
        Ouvrir le tableau de bord
      </Button>
    </div>
  );
}
