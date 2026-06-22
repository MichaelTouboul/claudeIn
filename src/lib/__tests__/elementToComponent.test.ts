import { describe, expect, it } from 'vitest';

import type { ComponentSource } from '@/lib/types';
import { elementToComponent, elementToComponentChain, smartDefaultTargetIndex } from '@/lib/utils';

function makeTree(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

describe('elementToComponent', () => {
  it('returns null for a null element', () => {
    expect(elementToComponent(null)).toBeNull();
  });

  it('resolves an element nested under an annotated ancestor', () => {
    const host = makeTree(
      `<section data-component="Panel" data-source="src/Panel.tsx:12">
         <button id="target">click</button>
       </section>`,
    );
    const target = host.querySelector('#target');
    expect(elementToComponent(target)).toEqual({
      component: 'Panel',
      sourcePath: 'src/Panel.tsx:12',
    });
  });

  it('returns null for an un-annotated tree (production)', () => {
    const host = makeTree(`<section><button id="target">click</button></section>`);
    const target = host.querySelector('#target');
    expect(elementToComponent(target)).toBeNull();
  });

  it('picks the NEAREST annotated ancestor when nested', () => {
    const host = makeTree(
      `<section data-component="Outer" data-source="src/Outer.tsx:1">
         <article data-component="Inner" data-source="src/Inner.tsx:5">
           <span id="target">x</span>
         </article>
       </section>`,
    );
    const target = host.querySelector('#target');
    expect(elementToComponent(target)).toEqual({
      component: 'Inner',
      sourcePath: 'src/Inner.tsx:5',
    });
  });

  it('resolves when the start element itself is annotated', () => {
    const host = makeTree(
      `<div id="target" data-component="Self" data-source="src/Self.tsx:3"></div>`,
    );
    const target = host.querySelector('#target');
    expect(elementToComponent(target)).toEqual({
      component: 'Self',
      sourcePath: 'src/Self.tsx:3',
    });
  });

  it('is the innermost entry of the chain', () => {
    const host = makeTree(
      `<section data-component="Outer" data-source="src/Outer.tsx:1">
         <article data-component="Inner" data-source="src/Inner.tsx:5">
           <span id="target">x</span>
         </article>
       </section>`,
    );
    const target = host.querySelector('#target');
    expect(elementToComponent(target)).toEqual(elementToComponentChain(target)[0]);
  });
});

describe('elementToComponentChain', () => {
  it('returns [] for a null element', () => {
    expect(elementToComponentChain(null)).toEqual([]);
  });

  it('returns [] for an un-annotated tree', () => {
    const host = makeTree(`<section><button id="target">x</button></section>`);
    expect(elementToComponentChain(host.querySelector('#target'))).toEqual([]);
  });

  it('collects the ordered chain innermost → outermost', () => {
    const host = makeTree(
      `<section data-component="Outer" data-source="src/Outer.tsx:1">
         <article data-component="Inner" data-source="src/Inner.tsx:5">
           <span id="target">x</span>
         </article>
       </section>`,
    );
    expect(elementToComponentChain(host.querySelector('#target'))).toEqual([
      { component: 'Inner', sourcePath: 'src/Inner.tsx:5' },
      { component: 'Outer', sourcePath: 'src/Outer.tsx:1' },
    ]);
  });

  it('collapses consecutive elements sharing the same data-component', () => {
    const host = makeTree(
      `<div data-component="Card" data-source="src/Card.tsx:1">
         <div data-component="Card" data-source="src/Card.tsx:2">
           <span id="target">x</span>
         </div>
       </div>`,
    );
    const chain = elementToComponentChain(host.querySelector('#target'));
    expect(chain).toHaveLength(1);
    expect(chain[0].component).toBe('Card');
  });
});

describe('smartDefaultTargetIndex', () => {
  const ui = (name: string): ComponentSource => ({
    component: name,
    sourcePath: `src/components/_ui/${name}/${name}.tsx:1`,
  });
  const feature = (name: string): ComponentSource => ({
    component: name,
    sourcePath: `src/components/Dashboard/${name}/${name}.tsx:1`,
  });

  it('returns 0 for an empty chain', () => {
    expect(smartDefaultTargetIndex([])).toBe(0);
  });

  it('picks the first non-_ui entry', () => {
    const chain = [ui('Button'), ui('Inline'), feature('AgentChatInput'), feature('AgentChat')];
    expect(smartDefaultTargetIndex(chain)).toBe(2);
  });

  it('falls back to 0 when every entry is a _ui primitive', () => {
    expect(smartDefaultTargetIndex([ui('Button'), ui('Flex')])).toBe(0);
  });

  it('returns 0 when the innermost is already a feature component', () => {
    expect(smartDefaultTargetIndex([feature('AgentChat'), ui('Stack')])).toBe(0);
  });
});
