// Call-me-back (#82): the country codes offered and the one phone check used by the page AND the
// endpoint, so the visitor sees the same verdict the server gives.

/** Where HP buyers come from first, then the rest of Europe and a few far ones. */
export const DIAL: { cc: string; code: string }[] = [
  { cc: 'GR', code: '30' }, { cc: 'CY', code: '357' }, { cc: 'BG', code: '359' }, { cc: 'RS', code: '381' },
  { cc: 'RO', code: '40' }, { cc: 'TR', code: '90' }, { cc: 'IL', code: '972' }, { cc: 'RU', code: '7' },
  { cc: 'UA', code: '380' }, { cc: 'MK', code: '389' }, { cc: 'AL', code: '355' }, { cc: 'DE', code: '49' },
  { cc: 'AT', code: '43' }, { cc: 'CH', code: '41' }, { cc: 'GB', code: '44' }, { cc: 'IE', code: '353' },
  { cc: 'FR', code: '33' }, { cc: 'IT', code: '39' }, { cc: 'ES', code: '34' }, { cc: 'NL', code: '31' },
  { cc: 'BE', code: '32' }, { cc: 'PL', code: '48' }, { cc: 'CZ', code: '420' }, { cc: 'SK', code: '421' },
  { cc: 'HU', code: '36' }, { cc: 'SI', code: '386' }, { cc: 'HR', code: '385' }, { cc: 'SE', code: '46' },
  { cc: 'NO', code: '47' }, { cc: 'DK', code: '45' }, { cc: 'FI', code: '358' }, { cc: 'US', code: '1' },
  { cc: 'AU', code: '61' }, { cc: 'AE', code: '971' },
];

/** The page language's usual country — only a first guess; the browser's region wins on the page. */
export const LANG_CC: Record<string, string> = {
  el: 'GR', en: 'GB', bg: 'BG', sr: 'RS', de: 'DE', ro: 'RO', tr: 'TR', he: 'IL', ru: 'RU',
};

export const flag = (cc: string) =>
  String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

export type PhoneCheck = { ok: true; e164: string } | { ok: false; code: 'short' | 'gr' };

/**
 * `code` is the dialling code from the list (digits only); `raw` is what the visitor typed.
 * A number typed with + or 00 is taken as complete and the list is ignored.
 */
export function checkPhone(code: string, raw: string): PhoneCheck {
  const t = String(raw ?? '').trim();
  let digits = t.replace(/\D/g, '');
  let cc = String(code ?? '').replace(/\D/g, '');
  const explicit = /^(\+|00)/.test(t);
  if (explicit) {
    if (t.startsWith('00')) digits = digits.slice(2);
    const hit = DIAL.map((d) => d.code).sort((a, b) => b.length - a.length).find((c) => digits.startsWith(c));
    if (!hit) return digits.length >= 9 && digits.length <= 15 ? { ok: true, e164: '+' + digits } : { ok: false, code: 'short' };
    cc = hit; digits = digits.slice(hit.length);
  }
  // the trunk 0 a visitor types out of habit (Germany 0151…), except Italy where it belongs to the number
  if (cc !== '39' && digits.startsWith('0')) digits = digits.replace(/^0+/, '');
  if (cc === '30') return /^(2\d{9}|69\d{8})$/.test(digits) ? { ok: true, e164: '+30' + digits } : { ok: false, code: 'gr' };
  // a Greek mobile (69 + 8 digits) typed under another country's flag is the wrong flag, not a foreign number: no listed
  // country but Germany (069 Frankfurt) has a 10-digit national number starting 69 (2026-11-23: +1 69… reached the SMS
  // provider and failed). Only when no + / 00 was typed — then the visitor chose the country on purpose.
  if (!explicit && cc !== '30' && cc !== '49' && /^69\d{8}$/.test(digits)) return { ok: true, e164: '+30' + digits };
  if (cc === '1') return /^\d{10}$/.test(digits) ? { ok: true, e164: '+1' + digits } : { ok: false, code: 'short' };
  // no other listed country has a mobile number under 7 digits
  if (digits.length < 7 || cc.length + digits.length > 15) return { ok: false, code: 'short' };
  return { ok: true, e164: '+' + cc + digits };
}

/**
 * The CRM files website leads by e-mail. A visitor who leaves only a phone gets one address per
 * phone number, never one per property: with `<property>@lead.local` every later visitor on the
 * same property was attached to the first one and their phone was lost (#82).
 */
export const phoneLeadEmail = (e164: string) => `p${e164.replace(/\D/g, '')}@lead.local`;
