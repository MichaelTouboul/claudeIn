import { useState, useEffect } from "react";
import { ImageIcon, Loader2 } from "lucide-react";

// Full-line path: starts with /, ends with image extension — handles spaces in filenames
const IMAGE_LINE_REGEX = /^(\/.*\.(?:png|jpe?g|webp|gif|svg))$/i;
// Inline path: no spaces — for paths embedded in text
const IMAGE_INLINE_REGEX = /((?:\/[\w.\-~]+)+\.(?:png|jpe?g|webp|gif|svg))/gi;

export function renderContentWithImages(content: string): React.ReactNode {
  if (!content) return content;

  const lines = content.split("\n");
  const result: React.ReactNode[] = [];
  let hasImage = false;
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    if (i > 0) result.push("\n");
    const line = lines[i];

    // Strategy 1: entire line is an image path (handles spaces)
    const lineMatch = line.trim().match(IMAGE_LINE_REGEX);
    if (lineMatch) {
      result.push(<InlineImage key={key++} filePath={lineMatch[1]} />);
      hasImage = true;
      continue;
    }

    // Strategy 2: inline paths without spaces
    IMAGE_INLINE_REGEX.lastIndex = 0;
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    let lineHasImage = false;

    while ((match = IMAGE_INLINE_REGEX.exec(line)) !== null) {
      if (match.index > lastIdx) {
        result.push(line.slice(lastIdx, match.index));
      }
      result.push(<InlineImage key={key++} filePath={match[1]} />);
      lastIdx = IMAGE_INLINE_REGEX.lastIndex;
      lineHasImage = true;
    }

    if (lineHasImage) {
      hasImage = true;
      if (lastIdx < line.length) {
        result.push(line.slice(lastIdx));
      }
    } else {
      result.push(line);
    }
  }

  if (!hasImage) return content;
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
