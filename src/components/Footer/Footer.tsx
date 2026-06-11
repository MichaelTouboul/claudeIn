import { useEffect, useState } from "react";

import { DevReset } from "@/components/DevReset/DevReset";
import { api } from "@/services/api";

export function Footer() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void api.getAppVersion().then((v) => {
      if (active) setVersion(v);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      className="shrink-0 flex items-center justify-between px-3"
      style={{ height: '22px', background: 'var(--color-surface-1)', borderTop: '1px solid var(--color-border)' }}
    >
      {version ? (
        <span
          className="text-[10px] tabular-nums"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
        >
          v{version}
        </span>
      ) : (
        <span />
      )}
      <DevReset />
    </div>
  );
}
