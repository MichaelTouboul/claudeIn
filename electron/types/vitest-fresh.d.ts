// Vitest cache-busting idiom: tests `import("./module?fresh=<tag>")` to force a
// fresh module instance (bypassing the ESM module cache) so per-test env
// mutations apply. tsc can't resolve a `?query` suffix on its own, and a TS
// ambient wildcard may contain only a SINGLE `*` — which here captures the
// module path before the constant `?fresh=<tag>` suffix. We therefore declare
// one wildcard per distinct `<tag>` used in the suite. Do NOT rewrite the test
// pattern; add a new line here if a new `?fresh=<tag>` tag is introduced.
//
// The loose `any` lives only in this ambient declaration (allowed by CLAUDE.md);
// it never leaks into app code.
declare module "*?fresh=read" {
  const mod: any;
  export = mod;
}
declare module "*?fresh=user" {
  const mod: any;
  export = mod;
}
declare module "*?fresh=fallback" {
  const mod: any;
  export = mod;
}
declare module "*?fresh=missing" {
  const mod: any;
  export = mod;
}
declare module "*?fresh=derive" {
  const mod: any;
  export = mod;
}
declare module "*?fresh=list" {
  const mod: any;
  export = mod;
}
declare module "*?fresh=ctx-last" {
  const mod: any;
  export = mod;
}
declare module "*?fresh=ctx-cap" {
  const mod: any;
  export = mod;
}
declare module "*?fresh=ctx-1m" {
  const mod: any;
  export = mod;
}
declare module "*?fresh=ctx-none" {
  const mod: any;
  export = mod;
}
declare module "*?fresh=pw-1m" {
  const mod: any;
  export = mod;
}
declare module "*?fresh=pw-200k" {
  const mod: any;
  export = mod;
}
declare module "*?fresh=stop-boundary" {
  const mod: any;
  export = mod;
}
