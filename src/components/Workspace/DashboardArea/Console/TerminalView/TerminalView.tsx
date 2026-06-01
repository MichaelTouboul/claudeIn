import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { useEffect, useRef } from 'react';

import '@xterm/xterm/css/xterm.css';

export type TerminalViewProps = { projectPath: string };

export function TerminalView({ projectPath }: TerminalViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const css = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const term = new Terminal({
      fontFamily: "'JetBrains Mono', var(--font-mono), monospace",
      fontSize: 13,
      fontWeight: 400,
      fontWeightBold: 600,
      lineHeight: 1.45,
      cursorBlink: true,
      theme: {
        background: token('--color-surface-0', '#06080c'),
        foreground: token('--color-text-primary', '#e2e8f0'),
        cursor: token('--color-accent', '#06b6d4'),
        cursorAccent: token('--color-surface-0', '#06080c'),
        selectionBackground: token('--color-accent-dim', 'rgba(6,182,212,0.12)'),
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    fit.fit();

    void window.api.ptyCreate(projectPath, projectPath, term.cols, term.rows);
    const offData = window.api.onPtyData((p) => {
      if (p.projectPath === projectPath) term.write(p.data);
    });
    const inputSub = term.onData((data) => window.api.ptyWrite(projectPath, data));

    const onResize = () => {
      fit.fit();
      window.api.ptyResize(projectPath, term.cols, term.rows);
    };
    window.addEventListener('resize', onResize);

    return () => {
      offData();
      inputSub.dispose();
      window.removeEventListener('resize', onResize);
      term.dispose();
    };
  }, [projectPath]);

  return (
    <div
      ref={hostRef}
      className="h-full w-full"
      style={{ background: 'var(--color-surface-0)', padding: '10px 14px', boxSizing: 'border-box' }}
    />
  );
}
