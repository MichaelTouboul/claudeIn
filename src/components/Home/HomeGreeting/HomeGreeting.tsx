type HomeGreetingProps = {
  /** The user's name, or null before a profile exists. */
  name: string | null;
};

/**
 * Greeting header — a warm "Hello, {name}" with a calm subtitle. Falls back to
 * a generic greeting (never "Unnamed user") when no name is known yet.
 */
export function HomeGreeting({ name }: HomeGreetingProps) {
  return (
    <header>
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-fg">
        {name === null ? "Hello there" : `Hello, ${name}`}
      </h1>
      <p className="mt-1.5 text-[15px] text-fg-muted">
        Pick up where you left off, or start something new.
      </p>
    </header>
  );
}
