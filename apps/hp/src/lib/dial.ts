// Country-code picker with search (George's DIAL list, lib/callback.ts) — the browser half.
// One implementation for every page that has it: the property page's request form (#103) and
// the desktop sign-in popup (#104). The markup is a button (`.dial`, its label `[data-dial-l]`),
// a search field (`[data-dial-q]`) and one option button per country (`[data-cc]`, `[data-code]`,
// `[data-q]` = the words it is found by), plus `.dial__none`, all inside `root`.
import { DIAL, LANG_CC } from './callback';

/** First guess of the country: the browser's region (de-AT → Austria), else the page language. */
// «en-US» is the default of most English browsers wherever the person lives, so a US region says nothing: it is skipped
// (Sergei 2026-11-23: a Greek mobile was sent as +1 69…, the SMS failed). Other regions (de-AT, ro-RO …) still count.
export function guessCc(lang: string): string {
  const region = (navigator.languages ?? [navigator.language])
    .map((l) => l.split('-')[1]?.toUpperCase()).find((r) => r && r !== 'US' && DIAL.some((d) => d.cc === r));
  return region || LANG_CC[lang] || 'GR';
}

export type Dial = { code: () => string };

/**
 * Wires the picker inside `root`. `onPick` runs after a country is chosen from the list (the
 * property page and the popup move the focus to the phone field). Returns null if the markup
 * is missing; `code()` is the dialling code chosen now (digits only).
 */
export function initDial(root: HTMLElement | null, guess: string, onPick?: () => void): Dial | null {
  const btn = root?.querySelector<HTMLButtonElement>('.dial');
  const pop = root?.querySelector<HTMLElement>('.dial__pop');
  const q = root?.querySelector<HTMLInputElement>('[data-dial-q]');
  const lbl = root?.querySelector<HTMLElement>('[data-dial-l]');
  if (!root || !btn || !pop || !q || !lbl) return null;
  let code = '30';
  const opts = Array.from(pop.querySelectorAll<HTMLButtonElement>('[data-cc]'));
  const none = pop.querySelector<HTMLElement>('.dial__none');
  const pick = (cc: string) => {
    const o = opts.find((x) => x.dataset.cc === cc) ?? opts[0];
    if (!o) return;
    opts.forEach((x) => x.setAttribute('aria-selected', String(x === o)));
    code = o.dataset.code ?? '30';
    lbl.textContent = `${o.querySelector('.dial__f')?.textContent ?? ''} +${code}`;
  };
  pick(guess);
  const filter = () => {
    const s = q.value.trim().toLowerCase().replace(/^\+/, '');
    let n = 0;
    opts.forEach((x) => {
      const hit = !s || (x.dataset.q ?? '').includes(s) || (x.dataset.code ?? '').startsWith(s);
      x.hidden = !hit; if (hit) n++;
    });
    if (none) none.hidden = n > 0;
  };
  const show = (o: boolean) => {
    pop.hidden = !o; btn.setAttribute('aria-expanded', String(o));
    if (o) { q.value = ''; filter(); q.focus(); }
  };
  btn.addEventListener('click', () => show(pop.hidden));
  q.addEventListener('input', filter);
  opts.forEach((x) => x.addEventListener('click', () => { pick(x.dataset.cc ?? ''); show(false); onPick?.(); }));
  document.addEventListener('click', (e) => { if (!pop.hidden && !root.contains(e.target as Node)) show(false); });
  // Esc closes the list only — not the form or the popup around it.
  pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); show(false); btn.focus(); } });
  return { code: () => code };
}
