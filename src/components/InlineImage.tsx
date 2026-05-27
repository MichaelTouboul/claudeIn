import { useState, useEffect } from "react";
import { ImageIcon, Loader2 } from "lucide-react";

// Full-line path: starts with /, ends with image extension — handles spaces in filenames
const IMAGE_LINE_REGEX = /^(\/.*\.(?:png|jpe?g|webp|gif|svg))$/i;
// Inline path: no spaces — for paths embedded in text
const IMAGE_INLINE_REGEX = /((?:\/[\w.\-~]+)+\.(?:png|jpe?g|webp|gif|svg))/gi;

function renderFormattedText(text: string, keyOffset: number = 0): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Match **bold**, `inline code`, or *italic* (but not **)
  const regex = /(\*\*(.+?)\*\*)|(`([^`\n]+?)`)|((?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = keyOffset;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      // Bold: **text**
      parts.push(
        <strong key={`f${key++}`} style={{ fontWeight: 600, color: 'inherit' }}>{match[2]}</strong>
      );
    } else if (match[4]) {
      // Inline code: `text`
      parts.push(
        <code
          key={`f${key++}`}
          style={{
            background: 'rgba(255,255,255,0.06)',
            padding: '1px 5px',
            borderRadius: '4px',
            fontSize: '0.9em',
            color: 'inherit',
          }}
        >{match[4]}</code>
      );
    } else if (match[6]) {
      // Italic: *text*
      parts.push(
        <em key={`f${key++}`} style={{ fontStyle: 'italic', color: 'inherit' }}>{match[6]}</em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex === 0) return text; // No matches, return raw string
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return <>{parts}</>;
}

export function renderContentWithImages(content: string): React.ReactNode {
  if (!content) return content;

  const lines = content.split("\n");
  const result: React.ReactNode[] = [];
  let hasTransform = false;
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    if (i > 0) result.push("\n");
    const line = lines[i];

    // Strategy 1: entire line is an image path (handles spaces)
    const lineMatch = line.trim().match(IMAGE_LINE_REGEX);
    if (lineMatch) {
      result.push(<InlineImage key={key++} filePath={lineMatch[1]} />);
      hasTransform = true;
      continue;
    }

    // Strategy 2: inline paths without spaces
    IMAGE_INLINE_REGEX.lastIndex = 0;
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    let lineHasImage = false;

    while ((match = IMAGE_INLINE_REGEX.exec(line)) !== null) {
      if (match.index > lastIdx) {
        const pre = renderFormattedText(line.slice(lastIdx, match.index));
        result.push(pre);
        if (typeof pre !== "string") hasTransform = true;
      }
      result.push(<InlineImage key={key++} filePath={match[1]} />);
      lastIdx = IMAGE_INLINE_REGEX.lastIndex;
      lineHasImage = true;
    }

    if (lineHasImage) {
      hasTransform = true;
      if (lastIdx < line.length) {
        const post = renderFormattedText(line.slice(lastIdx));
        result.push(post);
        if (typeof post !== "string") hasTransform = true;
      }
    } else {
      const formatted = renderFormattedText(line);
      result.push(formatted);
      if (typeof formatted !== "string") hasTransform = true;
    }
  }

  if (!hasTransform) return content;
  return <>{result}</>;
}

function InlineImage({ filePath }: { filePath: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setDataUrl(null);

    window.api.readImageAsDataUrl(filePath).then((result) => {
      if (cancelled) return;
      if (result) {
        setDataUrl(result);
      } else {
        setError(true);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [filePath]);

  if (loading) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded my-1"
        style={{
          background: "var(--color-surface-2)",
          color: "var(--color-text-muted)",
          border: "1px solid var(--color-border)",
        }}
      >
        <Loader2 size={10} className="animate-spin" />
        {filePath.split("/").pop()}
      </span>
    );
  }

  if (error || !dataUrl) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded my-1"
        style={{
          background: "var(--color-surface-2)",
          color: "var(--color-text-muted)",
          border: "1px solid var(--color-border)",
        }}
      >
        <ImageIcon size={10} />
        {filePath.split("/").pop()}
      </span>
    );
  }

  return (
    <span className="block my-2">
      <img
        src={dataUrl}
        alt={filePath.split("/").pop() || "image"}
        className="rounded-lg"
        style={{
          maxWidth: "300px",
          maxHeight: "300px",
          border: "1px solid var(--color-border)",
        }}
      />
      <span
        className="block text-[10px] mt-0.5"
        style={{ color: "var(--color-text-muted)" }}
      >
        {filePath.split("/").pop()}
      </span>
    </span>
  );
}

export default InlineImage;
