// Node module hooks so build scripts can import the site's own TypeScript dictionaries
// (src/lib/*.ts) without a bundler: extensionless relative imports resolve to `.ts`, and Vite's
// `import.meta.env` (absent outside Vite) reads as an empty object. Types are stripped by Node
// (`--experimental-strip-types`, Node 22.6+). Used by scripts/check-i18n.mjs.
export async function resolve(specifier, context, next) {
  if (/^\.{1,2}\//.test(specifier) && !/\.[cm]?[jt]s$/.test(specifier)) {
    try { return await next(`${specifier}.ts`, context); } catch { /* fall through */ }
  }
  return next(specifier, context);
}
export async function load(url, context, next) {
  const r = await next(url, context);
  if (url.endsWith('.ts') && r.source) {
    const src = String(r.source).replace(/import\.meta\.env/g, '({})');
    return { ...r, source: src };
  }
  return r;
}
