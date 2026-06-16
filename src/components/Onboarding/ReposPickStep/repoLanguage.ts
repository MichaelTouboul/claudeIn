/**
 * Map a detected language name (as produced by the back-end `detectRepoLanguage`)
 * to its dot color CSS token (defined in `index.css`). Unknown languages fall
 * back to the neutral default token. The lookup is case-insensitive so minor
 * casing differences still resolve.
 */
const LANGUAGE_TOKEN: Record<string, string> = {
  typescript: "--color-lang-typescript",
  javascript: "--color-lang-javascript",
  python: "--color-lang-python",
  go: "--color-lang-go",
  rust: "--color-lang-rust",
  java: "--color-lang-java",
  kotlin: "--color-lang-kotlin",
  ruby: "--color-lang-ruby",
  php: "--color-lang-php",
  c: "--color-lang-c",
  "c++": "--color-lang-cpp",
  "c#": "--color-lang-csharp",
  swift: "--color-lang-swift",
};

/** The `var(--color-lang-*)` CSS value for a language dot, neutral when unknown. */
export function languageDotColor(language: string): string {
  const token = LANGUAGE_TOKEN[language.toLowerCase()] ?? "--color-lang-default";
  return `var(${token})`;
}
