/** The two-step onboarding flow: pick scopes, then watch them ingest. */
export const WizardStep = {
  Scan: "scan",
  Ingest: "ingest",
} as const;
export type WizardStep = (typeof WizardStep)[keyof typeof WizardStep];
