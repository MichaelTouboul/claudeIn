import { Eye, FileText, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/_ui/Badge";
import { Button } from "@/components/_ui/Button";
import { Dialog } from "@/components/_ui/Dialog";
import { IconButton } from "@/components/_ui/IconButton";
import { MarkdownBody } from "@/components/_ui/MarkdownBody";
import { Textarea } from "@/components/_ui/Textarea";
import type { MemoryEntry } from "@/lib/types";

import { formatBytes } from "./formatBytes";

type LoadState = "loading" | "loaded" | "error";

// Editable memory drawer. On open it loads the file's full body by path
// (`readMemoryFile`, validated mirror-side against the current scope), shows it
// in a mono textarea with a Markdown preview toggle, tracks dirtiness, and saves
// via `writeMemoryFile` (atomic, re-emits the memory-changed event). The mirror
// list refreshes off that push; the drawer reflects the saved size inline.
export function MemoryDrawer({
  entry,
  repoScope,
  open,
  onOpenChange,
}: {
  entry: MemoryEntry;
  repoScope: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = useState<LoadState>("loading");
  const [original, setOriginal] = useState("");
  const [content, setContent] = useState("");
  const [size, setSize] = useState(entry.size);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState("loading");
    setError(null);
    setPreview(false);
    void window.api
      .readMemoryFile(entry.path, repoScope ?? undefined)
      .then((body) => {
        if (cancelled) return;
        setOriginal(body);
        setContent(body);
        setState("loaded");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not read this file.");
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [open, entry.path, repoScope]);

  const dirty = content !== original;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const refreshed = await window.api.writeMemoryFile(entry.path, content, repoScope ?? undefined);
      setOriginal(content);
      setSize(refreshed.size);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save this file.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      variant="drawer-right"
      title={`Memory ${entry.path}`}
      contentClassName="w-[560px] max-w-[94vw]"
    >
      <div
        className="flex h-full w-full flex-col border-l"
        style={{ background: "var(--color-surface-1)", borderColor: "var(--color-border)" }}
      >
        <div
          className="flex items-center gap-3 border-b px-5 py-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <span className="flex" style={{ color: "var(--color-history)" }}>
            <FileText size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-sm font-semibold"
              style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-primary)" }}
            >
              {entry.path}
            </div>
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {entry.scope}
            </div>
          </div>
          <Badge variant="purple">{formatBytes(size)}</Badge>
          <IconButton aria-label="Close" onClick={() => onOpenChange(false)}>
            <X size={16} aria-hidden="true" />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {state === "loading" ? (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Loading file…
            </p>
          ) : null}

          {state === "error" ? (
            <p className="text-sm" style={{ color: "var(--color-danger)" }}>
              {error ?? "Could not read this file."}
            </p>
          ) : null}

          {state === "loaded" ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p
                  className="text-xs uppercase tracking-[0.08em]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {preview ? "Preview" : "Editor"}
                </p>
                <Button
                  intent="ghost"
                  size="sm"
                  onClick={() => setPreview((p) => !p)}
                  leftIcon={preview ? <Pencil size={12} /> : <Eye size={12} />}
                >
                  {preview ? "Edit" : "Preview"}
                </Button>
              </div>

              {preview ? (
                <MarkdownBody content={content || "(empty)"} />
              ) : (
                <Textarea
                  font="mono"
                  size="sm"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  aria-label={`Edit ${entry.path}`}
                  className="min-h-[60vh] resize-y leading-relaxed"
                />
              )}

              {error ? (
                <p className="text-sm" style={{ color: "var(--color-danger)" }}>
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {state === "loaded" ? (
          <div
            className="flex items-center justify-end gap-2 border-t px-5 py-3"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Button intent="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button intent="primary" size="sm" onClick={handleSave} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
