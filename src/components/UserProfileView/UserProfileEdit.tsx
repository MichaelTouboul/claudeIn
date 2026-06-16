import { useState } from "react";

import { Button } from "@/components/_ui/Button";
import { Inline } from "@/components/_ui/Inline";
import { Input } from "@/components/_ui/Input";
import { Stack } from "@/components/_ui/Stack";
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
  stack: string;
  domains: string;
};

function toDraft(p: UserProfile): Draft {
  return {
    name: p.name ?? "",
    role: p.role ?? "",
    stack: p.stack.join(", "),
    domains: p.domains.join(", "),
  };
}

/** Split a comma-separated draft field into trimmed, non-empty tags. */
function toTags(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function applyDraft(p: UserProfile, d: Draft): UserProfile {
  const blank = (v: string): string | null => (v.trim() === "" ? null : v.trim());
  return {
    ...p,
    name: blank(d.name),
    role: blank(d.role),
    stack: toTags(d.stack),
    domains: toTags(d.domains),
  };
}

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
    <Stack as="form" gap={4} onSubmit={submit}>
      <Stack as="label" gap={1} className="text-sm">
        <span className="text-[0.65rem] uppercase tracking-[0.12em] text-fg-subtle" style={{ fontFamily: "var(--font-sans)" }}>
          Name
        </span>
        <Input className="bg-surface-0" value={draft.name} onChange={set("name")} />
      </Stack>
      <Stack as="label" gap={1} className="text-sm">
        <span className="text-[0.65rem] uppercase tracking-[0.12em] text-fg-subtle" style={{ fontFamily: "var(--font-sans)" }}>
          Role
        </span>
        <Input className="bg-surface-0" value={draft.role} onChange={set("role")} />
      </Stack>
      <Stack as="label" gap={1} className="text-sm">
        <span className="text-[0.65rem] uppercase tracking-[0.12em] text-fg-subtle" style={{ fontFamily: "var(--font-sans)" }}>
          Stack (comma-separated)
        </span>
        <Input className="bg-surface-0" value={draft.stack} onChange={set("stack")} />
      </Stack>
      <Stack as="label" gap={1} className="text-sm">
        <span className="text-[0.65rem] uppercase tracking-[0.12em] text-fg-subtle" style={{ fontFamily: "var(--font-sans)" }}>
          Domains (comma-separated)
        </span>
        <Input className="bg-surface-0" value={draft.domains} onChange={set("domains")} />
      </Stack>
      <Inline gap={2}>
        <Button type="submit" intent="primary" size="md" disabled={saving}>
          Save
        </Button>
        <Button type="button" intent="ghost" size="md" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </Inline>
    </Stack>
  );
}
