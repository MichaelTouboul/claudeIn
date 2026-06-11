type HomeGreetingProps = {
  name: string | null;
  onViewProfile: () => void;
};

/** Greeting header: a welcome line + a discreet "voir mon profil" affordance. */
export function HomeGreeting({ name, onViewProfile }: HomeGreetingProps) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-2">
      <h1 className="text-lg font-semibold tracking-[0.02em] text-fg" style={{ fontFamily: "var(--font-mono)" }}>
        {name === null ? "Bienvenue" : `Bonjour, ${name}`}
      </h1>
      <button
        type="button"
        onClick={onViewProfile}
        className="text-xs text-fg-subtle underline-offset-2 transition-colors hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        voir mon profil
      </button>
    </header>
  );
}
