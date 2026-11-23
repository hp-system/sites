// One file of a property submission → the CRM's private document store (CRM #498, `POST /site/member/uploads`,
// George 2026-11-23: «inside EALIDA, private — not R2»). The browser sends the file as multipart (one per call);
// here it becomes the CRM's JSON `{ kind, name, data: base64 }` with the member's own token. Nothing is kept here.
//
// 🔒 Not the public DB: the file goes site server → CRM over the private link, as every member write; the public DB
//    (guest mirror) never sees it. A photo is published only if staff publish the property, through the normal
//    watermarked pipeline; documents are never published.
// The answer `{ ok, uploadId, kind }` is passed to /api/panel/submit, which attaches the files to the draft.
import type { APIRoute } from 'astro';
import { memberOf } from '../../../lib/member';
import { memberCall } from '../../../lib/member-api';

export const prerender = false;
const json = (d: unknown) => new Response(JSON.stringify(d), {
  status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' },
});

const MAX = 15 * 1024 * 1024;   // the CRM's own limit per file
const TYPES: Record<'photo' | 'document', Set<string>> = {
  photo: new Set(['image/jpeg', 'image/png']),
  document: new Set(['application/pdf', 'image/jpeg', 'image/png']),
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('member_token')?.value;
  const me = await memberOf(token);
  if (!me || me.blocked || !token) return json({ ok: false, code: 'expired' });

  let fd: FormData;
  try { fd = await request.formData(); } catch { return json({ ok: false, code: 'bad_file' }); }
  const kind = fd.get('kind') === 'document' ? 'document' : fd.get('kind') === 'photo' ? 'photo' : null;
  const file = fd.get('file');
  if (!kind || !(file instanceof File)) return json({ ok: false, code: 'bad_file' });
  if (file.size === 0 || file.size > MAX) return json({ ok: false, code: 'too_big' });
  if (!TYPES[kind].has(file.type)) return json({ ok: false, code: 'bad_type' });   // the CRM checks the bytes again

  const name = file.name.replace(/[\u0000-\u001f\u007f/\\]/g, ' ').trim().slice(0, 120) || (kind === 'photo' ? 'photo' : 'document');
  const data = Buffer.from(await file.arrayBuffer()).toString('base64');
  const r = await memberCall(token, 'POST', 'uploads', { kind, name, data }, 60_000);
  if (r.status === 200 || r.status === 201) return json({ ok: true, uploadId: String(r.body?.uploadId ?? ''), kind });
  if (r.status === 404) return json({ ok: false, code: 'noapi' });
  if (r.status === 409) return json({ ok: false, code: 'limit' });
  if (r.status === 400) return json({ ok: false, code: 'bad_type' });
  if (r.status === 401) return json({ ok: false, code: 'expired' });
  return json({ ok: false, code: 'fail' });
};

export const ALL: APIRoute = () => new Response(null, { status: 405, headers: { allow: 'POST' } });
