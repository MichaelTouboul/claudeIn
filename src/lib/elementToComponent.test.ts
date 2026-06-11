import { describe, expect, it } from 'vitest';

import { elementToComponent } from '@/lib/elementToComponent';

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
});
