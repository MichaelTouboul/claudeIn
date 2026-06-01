import { useEffect, useState } from 'react';

export type UseImageDataUrl = {
  src: string | null;
  loading: boolean;
  error: boolean;
};

export function useImageDataUrl(filePath: string | null): UseImageDataUrl {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!filePath) {
      setSrc(null);
      setLoading(false);
      setError(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    setSrc(null);
    window.api
      .readImageAsDataUrl(filePath)
      .then((url) => {
        if (cancelled) return;
        if (url) {
          setSrc(url);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  return { src, loading, error };
}
