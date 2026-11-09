// Tests: is a URL moved by the redirect table (src/data/redirects.json, #152)? A page that a
// decision redirects (D1/D2 area pages, D-20261109-SS-2 old articles) is checked as a 301, not
// as a page. Same key as the engine: decoded, NFC, lower case, no trailing slash.
import { readFileSync } from 'node:fs';
const T = JSON.parse(readFileSync(new URL('../src/data/redirects.json', import.meta.url), 'utf8'));
const key = (p) => { let s = p; try { s = decodeURIComponent(p); } catch {} return s.normalize('NFC').toLowerCase().replace(/\/+$/, '') || '/'; };
const MOVED = new Map(T.rows.filter((r) => r.status === 301).map((r) => [r.from, r.to]));
/** The target the table sends this path to, or undefined. */
export const movedTo = (path) => MOVED.get(key(path.split('?')[0]));
