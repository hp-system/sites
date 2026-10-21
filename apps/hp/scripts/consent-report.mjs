// Totals of the anonymous cookie-banner choices (pages/api/consent-stat.ts).
// Reads container log lines (file or stdin), keeps only `consent_stat {…}` lines of the
// production environment, and prints counts and percentages by choice, country and device.
// Usage:
//   docker logs hp-site 2>&1 | node scripts/consent-report.mjs [--from 2026-12-01] [--to 2026-12-31] [--env preview|production|all]
//   node scripts/consent-report.mjs logs.txt --from 2026-12-01
//   node scripts/consent-report.mjs --dir /data/consent-stats --from 2026-12-01   (persistent store, #52)
//   on the box: docker exec hp-site-hp-site-1 node scripts/consent-report.mjs --dir /data/consent-stats
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function parse(text, { from = '', to = '9999', env = 'production' } = {}) {
  const rows = [];
  for (const line of text.split('\n')) {
    const i = line.indexOf('consent_stat ');
    if (i < 0) continue;
    let r;
    try { r = JSON.parse(line.slice(i + 13)); } catch { continue; }
    if (!r || typeof r !== 'object') continue;
    if (env !== 'all' && r.env !== env) continue;
    if (r.day < from || r.day > to) continue;
    rows.push(r);
  }
  return rows;
}

export function summarise(rows) {
  const by = (key) => {
    const m = new Map();
    for (const r of rows) {
      const k = r[key] ?? 'XX';
      const c = m.get(k) ?? { total: 0, accept: 0, reject: 0, custom: 0 };
      c.total++; c[r.choice]++;
      m.set(k, c);
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
  };
  const all = { total: rows.length, accept: 0, reject: 0, custom: 0, analytics: 0, marketing: 0 };
  for (const r of rows) { all[r.choice]++; if (r.analytics) all.analytics++; if (r.marketing) all.marketing++; }
  return { all, country: by('country'), device: by('device'), page: by('page') };
}

const pct = (n, d) => (d ? `${(100 * n / d).toFixed(1)}%` : '—');

export function render(s) {
  const out = [];
  const a = s.all;
  out.push(`Choices: ${a.total}`);
  out.push(`  accept ${a.accept} (${pct(a.accept, a.total)}) · reject ${a.reject} (${pct(a.reject, a.total)}) · custom ${a.custom} (${pct(a.custom, a.total)})`);
  out.push(`  analytics allowed ${pct(a.analytics, a.total)} · marketing allowed ${pct(a.marketing, a.total)}`);
  for (const [title, list] of [['By country', s.country], ['By device', s.device], ['By page', s.page]]) {
    out.push('', title);
    for (const [k, c] of list) out.push(`  ${String(k).padEnd(10)} ${String(c.total).padStart(6)}   accept ${pct(c.accept, c.total).padStart(6)}   reject ${pct(c.reject, c.total).padStart(6)}   custom ${pct(c.custom, c.total).padStart(6)}`);
  }
  return out.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const file = args.find((x, i) => !x.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
  const dir = opt('--dir', '');
  // The store keeps bare JSON lines; give them the same prefix as the log lines so one parser reads both.
  const text = dir
    ? readdirSync(dir).filter((f) => /^consent-\d{4}-\d{2}\.jsonl$/.test(f)).sort()
      .flatMap((f) => readFileSync(join(dir, f), 'utf8').split('\n').filter(Boolean).map((l) => `consent_stat ${l}`)).join('\n')
    : file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8');
  console.log(render(summarise(parse(text, { from: opt('--from', ''), to: opt('--to', '9999'), env: opt('--env', 'production') }))));
}
