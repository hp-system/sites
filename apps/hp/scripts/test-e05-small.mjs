// Acceptance for M1-S07 small fixes against the stub API: B-13 (valuation form hidden, D-157),
// B-18 (off-market block follows the CMS key `offmarket.count`, fallback 79), and file checks for
// B-10 (SITE_URL build arg, TYPEFACE documented) and B-22 (screenshots out of the build context).
// B-23 (RTL overflow) is measured in a real browser — see the vault (baseline tool, scrollWidth).
// Usage (from site/, after `pnpm build`): node scripts/test-e05-small.mjs   → exit 1 on any FAIL.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { startStub } from './stub-api.mjs';

const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };

async function home(content) {
  const stub = await startStub({ port: 4339, n: 30, content });
  const site = spawn(process.execPath, ['dist/server/entry.mjs'], { env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview' } });
  for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }
  try { return await (await fetch(SITE + '/en')).text(); } finally { site.kill(); stub.server.close(); await sleep(400); }
}

const plain = await home(undefined);
// The event name also sits in the tracking snippet's list, so look for the element itself.
check('B-13 no valuation form on the home page', !plain.includes('data-ev="seller:valuation_report"') && !/action="[^"]*\/valuation"/.test(plain), 'form and its event absent');
check('B-18 off-market block shown by default (fallback 79)', plain.includes('id="off-h"'), 'block present');
const zero = await home({ t: { en: { 'offmarket.count': '0' } }, media: {} });
check('B-18 CMS offmarket.count = 0 hides the block', !zero.includes('id="off-h"'), 'block absent');
const junk = await home({ t: { en: { 'offmarket.count': 'many' } }, media: {} });
check('B-18 non-numeric CMS value is ignored', junk.includes('id="off-h"'), 'block present (fallback)');

const docker = readFileSync('Dockerfile', 'utf8');
check('B-10 SITE_URL is an explicit build arg', /ARG SITE_URL=https:\/\/www\.halkidikiproperties\.com/.test(docker) && /ENV SITE_URL=\$SITE_URL/.test(docker), 'Dockerfile');
const compose = readFileSync('docker-compose.yml', 'utf8');
check('B-10 compose passes SITE_URL and documents TYPEFACE', /SITE_URL: https:\/\/www\.halkidikiproperties\.com/.test(compose) && /TYPEFACE: ""/.test(compose), 'docker-compose.yml');
const ignore = readFileSync('.dockerignore', 'utf8').split('\n').map((l) => l.trim());
check('B-22 shots/ and backups out of the build context', ignore.includes('shots') && ignore.includes('*.bak*'), '.dockerignore');

console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
