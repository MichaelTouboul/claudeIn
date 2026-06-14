import { useState } from "react";

import { Button } from "@/components/_ui/Button";
import type { UserProfile } from "@/lib/types";

type UserProfileEditProps = {
  profile: UserProfile;
  onSave: (next: UserProfile) => Promise<UserProfile>;
  onCancel: () => void;
};

/** Form draft for the editable fields only. Deterministic fields are not touched. */
type Draft = {
  name: string;
  role: string;
  summary: string;
  workflow: string;
  domains: string;
};

function toDraft(p: UserProfile): Draft {
  return {
    name: p.name ?? "",
    role: p.role ?? "",
    summary: p.summary ?? "",
    workflow: p.workflow ?? "",
    domains: p.domains.join(", "),
  };
}

function applyDraft(p: UserProfile, d: Draft): UserProfile {
  const blank = (v: string): string | null => (v.trim() === "" ? null : v.trim());
  return {
    ...p,
    name: blank(d.name),
    role: blank(d.role),
    summary: blank(d.summary),
    workflow: blank(d.workflow),
    domains: d.domains
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

const fieldClass =
  "w-full rounded border border-border bg-surface-0 px-2 py-1.5 text-sm text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent";

/** Inline edit form for the narrative + identity fields of the user profile. */
export function UserProfileEdit({ profile, onSave, onCancel }: UserProfileEditProps) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(profile));
  const [saving, setSaving] = useState(false);

  const set = (key: keyof Draft) => (e: { target: { value: string } }) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(applyDraft(profile, draft));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[0.65rem] uppercase tracking-[0.12em] text-fg-subtle" style={{ fontFamily: "var(--font-mono)" }}>
          Name
        </span>
        <input className={fieldClass} value={draft.name} onChange={set("name")} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[0.65rem] uppercase tracking-[0.12em] text-fg-subtle" style={{ fontFamily: "var(--font-mono)" }}>
          Role
        </span>
        <input className={fieldClass} value={draft.role} onChange={set("role")} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[0.65rem] uppercase tracking-[0.12em] text-fg-subtle" style={{ fontFamily: "var(--font-mono)" }}>
          Summary
        </span>
        <textarea className={fieldClass} rows={3} value={draft.summary} onChange={set("summary")} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[0.65rem] uppercase tracking-[0.12em] text-fg-subtle" style={{ fontFamily: "var(--font-mono)" }}>
          Domains (comma-separated)
        </span>
        <input className={fieldClass} value={draft.domains} onChange={set("domains")} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[0.65rem] uppercase tracking-[0.12em] text-fg-subtle" style={{ fontFamily: "var(--font-mono)" }}>
          Workflow
        </span>
        <textarea className={fieldClass} rows={2} value={draft.workflow} onChange={set("workflow")} />
      </label>
      <div className="flex items-center gap-2">
        <Button type="submit" intent="primary" size="md" disabled={saving}>
          Save
        </Button>
        <Button type="button" intent="ghost" size="md" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
