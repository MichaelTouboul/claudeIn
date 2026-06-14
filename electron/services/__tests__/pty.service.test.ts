// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';

import { createOrAttach, killAll, listProjects, write } from '../system/pty.service';

afterEach(() => killAll());

function waitFor(predicate: () => boolean, timeout = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (predicate()) return resolve();
      if (Date.now() - start > timeout) return reject(new Error('timeout'));
      setTimeout(tick, 20);
    };
    tick();
  });
}

describe('pty.service', () => {
  it('spawns a pty for a project and captures its output via the onData sink', async () => {
    const chunks: string[] = [];
    createOrAttach('/tmp', process.cwd(), 80, 24, (data) => chunks.push(data));
    write('/tmp', 'printf TERMOK\r');
    await waitFor(() => chunks.join('').includes('TERMOK'));
    expect(chunks.join('')).toContain('TERMOK');
    expect(listProjects()).toContain('/tmp');
  });

  it('killAll removes every pty', () => {
    createOrAttach('/tmp', process.cwd(), 80, 24, () => {});
    expect(listProjects().length).toBeGreaterThan(0);
    killAll();
    expect(listProjects()).toEqual([]);
  });
});
