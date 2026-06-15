import { FolderSearch, GitBranch, Shield } from "lucide-react";

import { type ConsentItem,ConsentStep } from "../ConsentStep/ConsentStep";

type ConsentReposStepProps = {
  /** Position in the flow (drives the progress header). */
  stepIndex: number;
  /** Step back to the profile review screen. */
  onBack: () => void;
  /** Authorize the repo search and advance to ReposPick. */
  onAuthorize: () => void;
};

const ITEMS: ConsentItem[] = [
  {
    icon: <FolderSearch size={16} aria-hidden="true" />,
    title: "Your code folders",
    detail: "Scanned to detect projects using Claude Code",
  },
  {
    icon: <GitBranch size={16} aria-hidden="true" />,
    title: "Repositories with .claude/",
    detail: "You pick which ones to keep as favorites",
  },
  {
    icon: <Shield size={16} aria-hidden="true" />,
    title: "Stays on-device",
    detail: "Nothing is uploaded or written without asking",
  },
];

/** Step 5 — explain the repo search and ask for consent (no skip). */
export function ConsentReposStep({ stepIndex, onBack, onAuthorize }: ConsentReposStepProps) {
  return (
    <ConsentStep
      stepIndex={stepIndex}
      title="Find your repositories"
      explanation="ClaudeIn scans your local code folders to detect repositories that use Claude Code. You'll then pick your favorites. Everything stays local."
      items={ITEMS}
      onBack={onBack}
      onAuthorize={onAuthorize}
    />
  );
}
