import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

interface BabelPlugin {
  name: string;
}
type PluginEntry = [BabelPlugin, { dev: boolean }];
interface TransformResult {
  code: string | null;
}
interface BabelCore {
  transformSync(code: string, opts: Record<string, unknown>): TransformResult | null;
}

const babel = require('@babel/core') as BabelCore;
const componentSourcePlugin = require('../../build/babel-plugin-component-source.cjs') as BabelPlugin;

const SAMPLE = `
function Foo() {
  return <div><span>hi</span></div>;
}
`;

function transform(code: string, dev: boolean): string {
  const plugin: PluginEntry = [componentSourcePlugin, { dev }];
  const result = babel.transformSync(code, {
    filename: '/repo/src/components/Foo/Foo.tsx',
    root: '/repo',
    parserOpts: { plugins: ['jsx'] },
    plugins: [plugin],
  });
  return result?.code ?? '';
}

describe('babel-plugin-component-source', () => {
  it('annotates JSX with data-source and data-component in dev mode', () => {
    const out = transform(SAMPLE, true);

    // Path is relative to root, line comes from the node's loc.
    expect(out).toMatch(/data-source="src\/components\/Foo\/Foo\.tsx:\d+"/);
    expect(out).toContain('data-component="Foo"');
  });

  it('uses the enclosing component name for nested elements', () => {
    const out = transform(SAMPLE, true);
    // Both <div> and <span> are inside Foo → both carry data-component="Foo".
    const matches = out.match(/data-component="Foo"/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('is a no-op in production mode', () => {
    const out = transform(SAMPLE, false);
    expect(out).not.toContain('data-source');
    expect(out).not.toContain('data-component');
  });

  it('does not annotate JSX with no PascalCase enclosing component', () => {
    const out = transform(`const x = render(<div>hi</div>);`, true);
    expect(out).not.toContain('data-component');
    // data-source is still added (it only depends on loc, not a component name).
    expect(out).toMatch(/data-source="src\/components\/Foo\/Foo\.tsx:\d+"/);
  });

  it('does not annotate Fragments', () => {
    const out = transform(
      `function Bar() { return <Fragment><p>x</p></Fragment>; }`,
      true,
    );
    // The <p> gets annotated, but the <Fragment> opening tag does not.
    expect(out).not.toMatch(/<Fragment[^>]*data-component/);
    expect(out).toContain('data-component="Bar"');
  });
});
