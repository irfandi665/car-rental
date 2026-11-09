// src/lib/search-params.ts
export const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;