// Local sign-in for working on the member panel, without the real CRM's member accounts.
//
// Sits between the local site and the SSH tunnel to the CRM:
//   - reads (properties, content, SEO, company) go to the real CRM unchanged, as guest;
//   - the member endpoints (/site/member/*) are answered here: any 6 digits sign you in,
//     the member and the favourites live only in this process;
//   - every other POST (inquiry, callback, property submission, viewing order …) is
//     answered "ok" here and never reaches the CRM — so the forms are safe to try locally.
//
// The level follows the e-mail you sign in with:
//   exclusive@local.test → exclusive · agent@local.test → agent · blocked@local.test → blocked
//   anything else → member
//
// Usage: node scripts/dev-member-proxy.mjs [port=3031] [upstream=http://127.0.0.1:3020]
//        then run the site with EALIDA_API=http://127.0.0.1:3031/api
// Local development only: it never runs on a server.
import { createServer } from 'node:http';

const PORT = Number(process.argv[2] ?? 3031);
const UPSTREAM = String(process.argv[3] ?? 'http://127.0.0.1:3020').replace(/\/$/, '');
const PREFIX = 'local-dev.';

/** The token is the e-mail (base64url, cookie-safe), so a restart of this process keeps you signed in. */
const favs = new Map();   // email → Set(ref)
const names = new Map();  // email → { name, phone }

const levelOf = (email) => {
  const l = email.split('@')[0];
  return ['exclusive', 'agent', 'blocked'].includes(l) ? l : 'member';
};
const memberOf = (req) => {
  const tok = String(req.headers['x-member-token'] ?? '');
  if (!tok.startsWith(PREFIX)) return null;
  let email = '';
  try { email = Buffer.from(tok.slice(PREFIX.length), 'base64url').toString('utf8'); } catch { return null; }
  if (!email) return null;
  const n = names.get(email) ?? { name: 'Sergei Local', phone: '+306900000000' };
  if (!favs.has(email)) favs.set(email, new Set());
  return { email, ...n };
};

const readBody = (req) => new Promise((resolve) => {
  let s = '';
  req.on('data', (c) => { s += c; if (s.length > 1e6) req.destroy(); });
  req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch { resolve({}); } });
});

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const p = url.pathname;
  if (process.env.PROXY_DEBUG) console.log(`[req] ${req.method} ${req.url} tok=${req.headers['x-member-token'] ?? '-'}`);
  const send = (status, body) => {
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
  };

  // ── the member endpoints: answered here ────────────────────────────────────────────
  if (p.startsWith('/api/site/member/')) {
    const what = p.slice('/api/site/member/'.length);
    const body = req.method === 'POST' ? await readBody(req) : {};
    if (what === 'request-code') {
      console.log(`[member] code asked for ${body.identifier} — type any 6 digits`);
      return send(200, { ok: true, delivered: true, channel: String(body.identifier ?? '').includes('@') ? 'email' : 'sms', hint: 'any 6 digits (local)' });
    }
    if (what === 'verify-code') {
      const id = String(body.identifier ?? '').toLowerCase();
      const email = id.includes('@') ? id : 'sergei@local.test';
      if (levelOf(email) === 'blocked') return send(401, { message: 'Ο λογαριασμός έχει ανασταλεί.' });
      console.log(`[member] signed in as ${email} (${levelOf(email)})`);
      return send(200, { ok: true, token: PREFIX + Buffer.from(email).toString('base64url'), name: (names.get(email) ?? { name: 'Sergei Local' }).name, needs: [] });
    }
    const me = memberOf(req);
    if (!me) return send(401, { message: 'not signed in (local)' });
    if (what === 'me') {
      return send(200, { email: me.email, name: me.name, phone: me.phone, favorites: [...favs.get(me.email)], level: levelOf(me.email), blocked: false });
    }
    if (what === 'favorite') {
      const set = favs.get(me.email);
      const ref = String(body.ref ?? '');
      const on = !set.has(ref);
      if (on) set.add(ref); else set.delete(ref);
      return send(200, { favorite: on, total: set.size });
    }
    if (what === 'complete') {
      const n = names.get(me.email) ?? { name: me.name, phone: me.phone };
      if (body.name) n.name = [body.name, body.surname].filter(Boolean).join(' ');
      if (body.phone) n.phone = String(body.phone);
      names.set(me.email, n);
      return send(200, { ok: true, saved: 'name', needs: [] });
    }
    // logout, complete-verify, events …
    return send(200, { ok: true, needs: [] });
  }

  // ── every other write: answered here, never sent to the CRM ────────────────────────
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const body = await readBody(req);
    console.log(`[blocked write] ${req.method} ${p} ${JSON.stringify(body).slice(0, 200)}`);
    return send(200, { ok: true, id: 'local-dev', local: true });
  }

  // ── reads: the real CRM, as guest (a local token means nothing to it) ────────────────
  const headers = { ...req.headers };
  delete headers.host;
  if (String(headers['x-member-token'] ?? '').startsWith(PREFIX)) delete headers['x-member-token'];
  try {
    const r = await fetch(UPSTREAM + req.url, { method: req.method, headers, signal: AbortSignal.timeout(30000) });
    const out = Buffer.from(await r.arrayBuffer());
    const h = {};
    r.headers.forEach((v, k) => { if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(k)) h[k] = v; });
    res.writeHead(r.status, h);
    res.end(out);
  } catch (e) {
    send(502, { message: `upstream ${UPSTREAM} unreachable: ${e.message}` });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Local member proxy on http://127.0.0.1:${PORT}/api → reads from ${UPSTREAM}`);
  console.log('Sign in with any e-mail and any 6 digits. exclusive@local.test / agent@local.test / blocked@local.test switch the level.');
});
