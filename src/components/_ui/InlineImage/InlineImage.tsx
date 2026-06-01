import { ImageIcon, Loader2 } from "lucide-react";

import { useImageDataUrl } from "@/hooks/useImageDataUrl";

export type InlineImageProps = {
  src: string | null;
  fileName: string;
  loading?: boolean;
  error?: boolean;
};

const placeholderClass = "inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded my-1";
const placeholderStyle = {
  background: "var(--color-surface-2)",
  color: "var(--color-text-muted)",
  border: "1px solid var(--color-border)",
} as const;

export function InlineImage({ src, fileName, loading = false, error = false }: InlineImageProps) {
  if (loading) {
    return (
      <span className={placeholderClass} style={placeholderStyle}>
        <Loader2 size={10} className="animate-spin" />
        {fileName}
      </span>
    );
  }

  if (error || !src) {
    return (
      <span className={placeholderClass} style={placeholderStyle}>
        <ImageIcon size={10} />
        {fileName}
      </span>
    );
  }

  return (
    <span className="block my-2">
      <img
        src={src}
        alt={fileName || "image"}
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
        {fileName}
      </span>
    </span>
  );
}

export type ImageLoaderProps = { filePath: string };

// Bridges a file path to the renderer IPC (via useImageDataUrl) and feeds the
// resolved data into the pure InlineImage primitive.
export function ImageLoader({ filePath }: ImageLoaderProps) {
  const { src, loading, error } = useImageDataUrl(filePath);
  const fileName = filePath.split("/").pop() || "image";
  return <InlineImage src={src} fileName={fileName} loading={loading} error={error} />;
}
