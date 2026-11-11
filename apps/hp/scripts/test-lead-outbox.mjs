// Leads are never lost (forms audit 2026-11-11). With the CRM down, /api/inquiry answers «ok, queued» and the lead
// waits in the outbox (LEAD_OUTBOX_DIR); when the CRM is back the server resends it on its own (first pass after
// 30 s) and the outbox empties. Also: a plain form post (no JavaScript) goes back to the page with #sent and never
// puts the details in the address; a post from another site is refused.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-lead-outbox.mjs   (about 45 s)
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 4341, CRM = 4342, SITE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), 'hp-outbox-'));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lines = () => readdirSync(dir).filter((f) => f.endsWith('.jsonl')).flatMap((f) => readFileSync(join(dir, f), 'utf8').split('\n').filter(Boolean));

// the site, with the CRM on a port where nothing listens yet
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(PORT), EALIDA_API: `http://127.0.0.1:${CRM}/api`, LEAD_OUTBOX_DIR: dir, SITE_ENV: 'preview', PUBLIC_ORIGIN: SITE },
  stdio: ['ignore', 'ignore', 'pipe'],
});
let crm;
try {
  for (let i = 0; i < 60; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }
  const lead = { name: 'Test Lead', email: 'lead@example.com', phone: '+30 690 000 0000', message: '[Contact] hello', lang: 'en', t: Date.now() - 10_000 };
  const r1 = await fetch(SITE + '/api/inquiry', { method: 'POST', headers: { 'content-type': 'application/json', origin: SITE }, body: JSON.stringify(lead) });
  const j1 = await r1.json();
  check('CRM down: the visitor gets ok (queued)', r1.status === 200 && j1.ok === true && j1.queued === true, JSON.stringify(j1));
  check('CRM down: the lead waits in the outbox', lines().length === 1 && lines()[0].includes('lead@example.com'), `${lines().length} line(s)`);

  // the CRM comes back: the server resends the outbox on its own
  const got = [];
  crm = createServer((req, res) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { got.push({ url: req.url, b }); res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true}'); }); }).listen(CRM, '127.0.0.1');
  for (let i = 0; i < 80 && !got.length; i++) await sleep(500);
  await sleep(500);
  check('CRM back: the kept lead reaches the CRM', got.length === 1 && got[0].url === '/api/site/inquiry' && got[0].b.includes('lead@example.com'), `${got.length} resent`);
  check('CRM back: the outbox is empty', lines().length === 0, `${lines().length} left`);

  // a plain form (no JavaScript): back to the page with #sent, the details never in the address
  const form = new URLSearchParams({ first: 'Plain', last: 'Form', email: 'plain@example.com', phone: '', message: 'hi', source: 'Contact', lang: 'en', t: String(Date.now() - 10_000), website: '' });
  const r2 = await fetch(SITE + '/api/inquiry', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: SITE, referer: SITE + '/en/contact' }, body: form });
  const loc = r2.headers.get('location') ?? '';
  check('plain form: 303 back to the page with #sent', r2.status === 303 && /\/en\/contact#sent$/.test(loc) && !/plain@example\.com/.test(loc), `${r2.status} ${loc}`);
  check('plain form: the source goes in front of the message', got.some((g) => g.b.includes('[Contact] hi') && g.b.includes('Plain Form')), 'source');

  // another site
  const r3 = await fetch(SITE + '/api/inquiry', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example' }, body: JSON.stringify(lead) });
  check('another site: refused', r3.status === 403, String(r3.status));
} finally {
  site.kill(); crm?.close();
}
console.log(fails ? `\n${fails} FAIL` : '\nALL OK');
process.exit(fails ? 1 : 0);
