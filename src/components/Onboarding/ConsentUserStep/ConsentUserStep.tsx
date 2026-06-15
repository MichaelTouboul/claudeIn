import { Brain, FolderOpen, Shield } from "lucide-react";

import { type ConsentItem,ConsentStep } from "../ConsentStep/ConsentStep";

type ConsentUserStepProps = {
  /** Position in the flow (drives the progress header). */
  stepIndex: number;
  /** Step back to the welcome screen. */
  onBack: () => void;
  /** Authorize the user-info search and advance to SearchUser. */
  onAuthorize: () => void;
};

const ITEMS: ConsentItem[] = [
  {
    icon: <FolderOpen size={16} aria-hidden="true" />,
    title: "Your .claude folder",
    detail: "Located on your machine to read your setup",
  },
  {
    icon: <Brain size={16} aria-hidden="true" />,
    title: "Agents, skills, MCP & hooks",
    detail: "Summarized to build your profile",
  },
  {
    icon: <Shield size={16} aria-hidden="true" />,
    title: "Stays on-device",
    detail: "Nothing is uploaded or written without asking",
  },
];

/** Step 2 — explain the user-info search and ask for consent (no skip). */
export function ConsentUserStep({ stepIndex, onBack, onAuthorize }: ConsentUserStepProps) {
  return (
    <ConsentStep
      stepIndex={stepIndex}
      title="Analyze your profile"
      explanation="ClaudeIn reads a few things on your machine to tailor the experience. It never writes without asking, and nothing is uploaded."
      items={ITEMS}
      onBack={onBack}
      onAuthorize={onAuthorize}
    />
  );
}
