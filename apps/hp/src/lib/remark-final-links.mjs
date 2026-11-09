// Links inside Markdown (the articles) point at the FINAL address (#152): a link whose path the
// redirect table moves (src/data/redirects.json, 301 rows) is rewritten to the target at build
// time, keeping its query and #anchor. The article texts themselves stay as they were copied;
// only the rendered href changes. Google follows no redirect hop from our own pages.
// Covers Markdown links and raw `href="/…"` in inline HTML.
import { readFileSync } from 'node:fs';

const T = JSON.parse(readFileSync(new URL('../data/redirects.json', import.meta.url), 'utf8'));
const MOVED = new Map(T.rows.filter((r) => r.status === 301).map((r) => [r.from, r.to]));
const key = (p) => { let s = p; try { s = decodeURIComponent(p); } catch { /* raw */ } return s.normalize('NFC').toLowerCase().replace(/\/+$/, '') || '/'; };

export function finalHref(href) {
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return href;
  const m = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(href);
  const to = MOVED.get(key(m[1]));
  return to ? encodeURI(to) + (m[2] ?? '') + (m[3] ?? '') : href;
}

export function remarkFinalLinks() {
  return (tree) => {
    const walk = (node) => {
      if ((node.type === 'link' || node.type === 'definition') && node.url) node.url = finalHref(node.url);
      if (node.type === 'html' && node.value) node.value = node.value.replace(/href="(\/[^"]*)"/g, (_, h) => `href="${finalHref(h)}"`);
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}
