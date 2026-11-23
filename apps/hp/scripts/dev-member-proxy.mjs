// Local sign-in for working on the member panel, without the real CRM's member accounts.
//
// Sits between the local site and the SSH tunnel to the CRM:
//   - reads (properties, content, SEO, company) go to the real CRM unchanged, as guest;
//   - the member endpoints (/site/member/*) are answered here: any 6 digits sign you in,
//     the member and the favourites live only in this process;
//   - every other POST (inquiry, callback, property submission, viewing order …) is
//     answered "ok" here and never reaches the CRM — so the forms are safe to try locally.
//
// The role and the level follow the e-mail you sign in with (see `parse` below):
//   buyer@ · seller@ · agent@ · partner@ · blocked@ — and «.exclusive», e.g. seller.exclusive@local.test
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
const searches = new Map(); // email → [Search]   (CRM #496 member/searches, memory only)
const prefs = new Map();    // email → Preferences (CRM #496 member/preferences, memory only)
const PREFS0 = { gender: null, contactWays: ['email', 'whatsapp'], frequency: 'week' };

// The e-mail's name sets the role and the level, as the demo strip of the design board:
//   buyer@ · seller@ · agent@ (agent competitor) · partner@ (agent association) · blocked@
//   add «.exclusive» for the Exclusive level: seller.exclusive@local.test. Any other e-mail = buyer, member.
const parse = (email) => {
  const [role0, lvl0] = email.split('@')[0].split('.');
  const role = ['buyer', 'seller', 'agent', 'partner'].includes(role0) ? role0 : 'buyer';
  const level = role0 === 'blocked' ? 'blocked' : role === 'agent' || role === 'partner' ? 'agent' : lvl0 === 'exclusive' ? 'exclusive' : 'member';
  return { role, level };
};
const levelOf = (email) => parse(email).level;
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
  req.on('data', (c) => { s += c; if (s.length > 22e6) req.destroy(); });
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
    const body = req.method === 'POST' || req.method === 'PATCH' ? await readBody(req) : {};
    if (what === 'request-code') {
      console.log(`[member] code asked for ${body.identifier}${body.intent ? ` (intent ${body.intent})` : ''} — type any 6 digits`);
      return send(200, { ok: true, delivered: true, channel: String(body.identifier ?? '').includes('@') ? 'email' : 'sms', hint: 'any 6 digits (local)' });
    }
    if (what === 'verify-code') {
      const id = String(body.identifier ?? '').toLowerCase();
      const email = id.includes('@') ? id : 'sergei@local.test';
      if (levelOf(email) === 'blocked') return send(401, { message: 'Ο λογαριασμός έχει ανασταλεί.' });
      console.log(`[member] signed in as ${email} (${parse(email).role}, ${levelOf(email)})${body.intent ? ` intent ${body.intent}` : ''}`);
      return send(200, { ok: true, token: PREFIX + Buffer.from(email).toString('base64url'), name: (names.get(email) ?? { name: 'Sergei Local' }).name, needs: [] });
    }
    const me = memberOf(req);
    if (!me) return send(401, { message: 'not signed in (local)' });
    if (what === 'me') {
      return send(200, { email: me.email, name: me.name, phone: me.phone, favorites: [...favs.get(me.email)], level: levelOf(me.email), role: parse(me.email).role, preferences: prefs.get(me.email) ?? PREFS0, blocked: false });
    }
    if (what === 'favorite') {
      const set = favs.get(me.email);
      const ref = String(body.ref ?? '');
      const on = !set.has(ref);
      if (on) set.add(ref); else set.delete(ref);
      return send(200, { favorite: on, total: set.size });
    }
    // ── the panel endpoints of CRM #496, in memory ──
    if (what === 'searches' || what.startsWith('searches/')) {
      const list = searches.get(me.email) ?? []; searches.set(me.email, list);
      const id = decodeURIComponent(what.slice('searches/'.length));
      const now = new Date().toISOString();
      if (what === 'searches' && req.method === 'GET') return send(200, { items: list });
      if (what === 'searches' && req.method === 'POST') {
        if (list.length >= 30) return send(409, { code: 'limit', message: 'limit' });
        const it = { id: `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, q: String(body.q ?? ''), label: String(body.label ?? ''), createdAt: now, updatedAt: now };
        list.unshift(it); console.log(`[member] search saved: ${it.label}`); return send(201, it);
      }
      const at = list.findIndex((x) => x.id === id);
      if (at < 0) return send(404, { code: 'not_found' });
      if (req.method === 'PATCH') { list[at] = { ...list[at], ...('q' in body ? { q: String(body.q) } : {}), ...('label' in body ? { label: String(body.label) } : {}), updatedAt: now }; return send(200, list[at]); }
      if (req.method === 'DELETE') { list.splice(at, 1); return send(200, { ok: true }); }
    }
    if (what === 'preferences' && req.method === 'PATCH') {
      const cur = { ...(prefs.get(me.email) ?? PREFS0) };
      if ('gender' in body) cur.gender = body.gender;
      if ('contactWays' in body) cur.contactWays = body.contactWays;
      if ('frequency' in body) cur.frequency = body.frequency;
      prefs.set(me.email, cur); console.log(`[member] preferences ${JSON.stringify(cur)}`); return send(200, cur);
    }
    if (what === 'uploads') {
      const kb = Math.round(String(body.data ?? '').length * 3 / 4 / 1024);
      console.log(`[member] upload ${body.kind} «${body.name}» ${kb} KB`);
      return send(200, { uploadId: `u${Date.now().toString(36)}`, kind: body.kind, name: body.name, size: kb * 1024, type: 'image/jpeg' });
    }
    if (what === 'delete-request') { console.log(`[member] delete request from ${me.email}`); return send(200, { ok: true }); }
    if (what === 'properties') {
      // a seller owns two: one online (a real public number), one not yet
      const items = parse(me.email).role !== 'seller' ? [] : [
        { id: '6544', title: 'Maisonette, Kassandra', status: 'published', published: true, createdAt: '2026-09-01T09:00:00Z', views: { members: 41, visitors: 268, last30: 57 }, attributes: {} },
        { id: '9901', title: 'Plot in Sithonia', status: 'draft', published: false, createdAt: '2026-11-20T09:00:00Z', views: { members: 0, visitors: 0, last30: 0 }, attributes: {} },
      ];
      return send(200, { items });
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
  const local = String(headers['x-member-token'] ?? '').startsWith(PREFIX);
  if (local) delete headers['x-member-token'];
  try {
    const r = await fetch(UPSTREAM + req.url, { method: req.method, headers, signal: AbortSignal.timeout(30000) });
    let out = Buffer.from(await r.arrayBuffer());
    // The CRM gives the closed collection only to a real member token; a local sign-in reads as a guest and would see
    // none. For a local member every 25th home is marked secret here, so the closed collection has something to show.
    // Local preview only: nothing is written anywhere.
    if (local && r.ok && p === '/api/site/properties') {
      try {
        const d = JSON.parse(out.toString('utf8'));
        (d.items ?? []).forEach((it) => {
          const h = [...String(it.id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
          if (h % 25 === 0) it.attributes = { ...(it.attributes ?? {}), secret_portfolio: true };
        });
        out = Buffer.from(JSON.stringify(d));
      } catch { /* leave the answer as it came */ }
    }
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
  console.log('Sign in with any e-mail and any 6 digits. buyer@ seller@ agent@ partner@ (+ .exclusive, e.g. seller.exclusive@local.test) set the role and level.');
});
