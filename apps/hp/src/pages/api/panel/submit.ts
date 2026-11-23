// ═══════════════════════════════════════════════════════════════════════════
// ΥΠΟΒΟΛΗ ΑΚΙΝΗΤΟΥ ΑΠΟ ΤΟΝ ΠΙΝΑΚΑ → `POST /site/property-submission`
//
// 🔴 ΤΟ ΟΝΟΜΑ ΚΑΙ ΤΟ E-MAIL ΔΕΝ ΕΡΧΟΝΤΑΙ ΑΠΟ ΤΗ ΦΟΡΜΑ — ΕΡΧΟΝΤΑΙ ΑΠΟ ΤΟ ΕΙΣΙΤΗΡΙΟ.
//    Αν τα δεχόμασταν από το σώμα του αιτήματος, οποιοσδήποτε θα υπέβαλλε ακίνητο
//    στο όνομα τρίτου: το CRM θα δημιουργούσε ή θα ένωνε επαφή με ξένο e-mail
//    (`upsertContact`) και ο πραγματικός άνθρωπος θα δεχόταν τηλέφωνο για ακίνητο
//    που δεν έχει. Εδώ η ταυτότητα αποδεικνύεται, δεν δηλώνεται.
//
// 🪤 ΤΟ API ΑΠΑΝΤΑ 404 ΟΤΑΝ ΛΕΙΠΕΙ name Ή email (`NotFoundException`, ΟΧΙ 400).
//    Μη το μεταφράσεις σε «δεν βρέθηκε» — ο χρήστης θα νόμιζε ότι χάθηκε η σελίδα.
//
// ⛔ ΜΗΝ προωθήσεις εδώ πεδία που δεν διαβάζει ο διακομιστής: μπαίνουν στη βάση
//    μέσα στο `attributes` μόνο όσα αναγνωρίζει, τα υπόλοιπα χάνονται σιωπηλά και
//    ο ιδιοκτήτης νομίζει ότι τα έστειλε.
// ═══════════════════════════════════════════════════════════════════════════
import type { APIRoute } from 'astro';
import { sendLead } from '../../../lib/lead-outbox';
import { memberOf } from '../../../lib/member';
import { forgetOwner } from '../../../lib/member-api';
import { forwardIp } from '../../../lib/clientip';
import { originHeader } from '../../../lib/origin';

export const prerender = false;
const API = import.meta.env.EALIDA_API || process.env.EALIDA_API || 'http://localhost:3020/api';


// B-15: the site's own errors go out as a `code`; the page shows its translation (all 9 languages).
// A `message` is only the CRM's own text, passed through unchanged.
const json = (d: unknown) => new Response(JSON.stringify(d), {
  status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

const clean = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);

// Το EALIDA κρατά `category` και `subcategory` πεζά. Η φόρμα δίνει ένα «είδος»·
// εδώ γίνεται το ζεύγος που περιμένει η βάση.
const KIND: Record<string, { category: string; subcategory: string }> = {
  house:      { category: 'residential', subcategory: 'house' },
  apartment:  { category: 'residential', subcategory: 'apartment' },
  maisonette: { category: 'residential', subcategory: 'maisonette' },
  villa:      { category: 'residential', subcategory: 'villa' },
  land:       { category: 'land',        subcategory: 'plot' },
  commercial: { category: 'commercial',  subcategory: 'commercial' },
};

// The Details window (Sergei 2026-11-23): since CRM #496 the CRM stores address, levels, orientation and road access in
// the property's own fields (`address`, `levels`, `orientation`, `road_access` below; unknown values are dropped there).
// Files (CRM #498): uploaded one by one before (/api/panel/upload) and attached here as `uploads: [{uploadId, kind}]`;
// the CRM attaches them to the draft and links the member as its owner — both need the member's token, so this send
// goes straight to the CRM with it. Only if the CRM cannot take it now does it fall back to the outbox, WITHOUT the
// token (a token is never written to disk) and without the files; then the `[Details]` line tells the adviser how many
// photos / documents the owner has ready.
const ORIENT = new Set(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']);
const ROAD = new Set(['asphalt', 'paved', 'dirt', 'boat']);
function extras(b: Record<string, unknown>) {
  const addr = clean(b.address, 160).replace(/[\u0000-\u001f\u007f]/g, ' ');
  const lv = Number(String(b.levels ?? '').replace(/\D/g, ''));
  const o = clean(b.orient, 4).toLowerCase();
  const r = clean(b.road, 10).toLowerCase();
  return {
    address: addr || undefined,
    levels: lv >= 1 && lv <= 9 ? lv : undefined,
    orientation: ORIENT.has(o) ? o : undefined,
    road_access: ROAD.has(r) ? r : undefined,
  };
}
function describe(b: Record<string, unknown>): string {
  const bits: string[] = [];
  const ph = Math.min(99, Number(b.photosN) || 0), dc = Math.min(99, Number(b.docsN) || 0);
  if (ph > 0) bits.push(`photos ready=${ph}`);
  if (dc > 0) bits.push(`documents ready=${dc}`);
  const desc = clean(b.desc, 3000);
  return [bits.length ? `[Details] ${bits.join('; ')}` : '', desc].filter(Boolean).join('\n\n').slice(0, 3400);
}

export const POST: APIRoute = async ({ request, url, cookies, clientAddress }) => {
  const token = cookies.get('member_token')?.value;
  const me = await memberOf(token);
  if (!me || me.blocked) {
    return json({ ok: false, code: 'expired' });
  }
  // Ο ίδιος έλεγχος που κάνει και η σελίδα πριν δείξει τη φόρμα — εδώ όμως είναι ο
  // δεσμευτικός: η σελίδα μπορεί να παρακαμφθεί, αυτό όχι.
  if (!me.name || !me.email) {
    return json({ ok: false, code: 'name_first' });
  }

  let b: Record<string, unknown> = {};
  try { b = await request.json(); } catch { /* κενό → πέφτει στον έλεγχο περιοχής */ }

  const area = clean(b.area, 120);
  if (!area) return json({ ok: false, code: 'area' });

  const k = KIND[clean(b.kind, 20)] ?? KIND.house;
  const payload = {
    name: me.name, email: me.email, phone: me.phone || undefined,
    category: k.category, subcategory: k.subcategory,
    area,
    sqm: Number(String(b.sqm ?? '').replace(/\D/g, '')) || undefined,
    price: Number(String(b.price ?? '').replace(/\D/g, '')) || undefined,
    ...extras(b),
    description: describe(b) || undefined,
  };

  // never lost: kept in the outbox and resent when the CRM cannot take it now (lib/lead-outbox, 2026-11-11);
  // the site origin goes with it as with every other form (forms audit: it was missing here)
  const uploads = (Array.isArray(b.uploads) ? b.uploads : []).slice(0, 40)
    .map((u: any) => ({ uploadId: clean(u?.uploadId, 80), kind: u?.kind === 'document' ? 'document' : 'photo' }))
    .filter((u: { uploadId: string }) => u.uploadId);
  const hdr = { ...forwardIp(request, clientAddress), ...originHeader(request, url) };
  try {
    const r = await fetch(`${API}/site/property-submission`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-member-token': token!, ...hdr },
      body: JSON.stringify({ ...payload, ...(uploads.length ? { uploads } : {}) }), signal: AbortSignal.timeout(20_000),
    });
    if (r.ok) { forgetOwner(token); return json({ ok: true, files: uploads.length }); }
    if (r.status < 500) return json({ ok: false, code: 'fail' });
  } catch { /* unreachable: the outbox below */ }
  const sent = await sendLead('/site/property-submission', hdr, payload, 12_000);
  // a 4xx here means «name/email missing», not «page gone»
  return json(sent.ok ? { ok: true } : { ok: false, code: sent.status >= 500 ? 'offline' : 'fail' });
};
