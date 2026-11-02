// ═══════════════════════════════════════════════════════════════════════════
// DESKTOP CAROUSEL ROWS of the info pages (wave 1: Sell #105, then Services and Company).
// Same behaviour as the home rows (#101): a page of cards every 5 s while the row is on
// screen, back to the first after the last; a pointer or the keyboard focus over the row
// holds it; a dash scrolls to its page and restarts the count; the dashes follow the row.
// Every card is in the HTML — the row is scrolled, never loaded — so search engines see
// every link. Works only at ≥1024px; `prefers-reduced-motion` stops the motion.
//
// Markup: the row `[data-irail]` (with an `id`, `data-gap` = the gap in px) and its dashes
// `[data-irail-dash="<row id>"]` holding one `<button>` per page.
// ═══════════════════════════════════════════════════════════════════════════
export function initRails(root: ParentNode = document): void {
  const desk = window.matchMedia('(min-width: 1024px)');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const moving = () => desk.matches && !still.matches;
  root.querySelectorAll<HTMLElement>('[data-irail]').forEach((rail) => {
    if (rail.dataset.irailOn) return;
    rail.dataset.irailOn = '1';
    const dash = document.querySelector<HTMLElement>(`[data-irail-dash="${rail.id}"]`);
    if (!dash) return;
    const btns = Array.from(dash.querySelectorAll<HTMLButtonElement>('button'));
    const gap = Number(rail.dataset.gap || 0);
    const rtl = () => getComputedStyle(rail).direction === 'rtl';
    const pos = () => Math.abs(rail.scrollLeft);            // RTL: scrollLeft is negative
    const max = () => Math.max(0, rail.scrollWidth - rail.clientWidth);
    const to = (x: number) => rail.scrollTo({ left: rtl() ? -x : x, behavior: still.matches ? 'auto' : 'smooth' });
    let t0 = Date.now();
    let hold = false;
    const sync = () => {
      const m = max();
      const k = m ? Math.round((pos() / m) * (btns.length - 1)) : 0;
      btns.forEach((b, i) => { b.classList.toggle('on', i === k); b.setAttribute('aria-pressed', String(i === k)); });
    };
    rail.addEventListener('scroll', sync, { passive: true });
    btns.forEach((b, i) => b.addEventListener('click', () => {
      t0 = Date.now();
      to(Math.min(max(), i * (rail.clientWidth + gap)));
    }));
    rail.addEventListener('mouseenter', () => { hold = true; });
    rail.addEventListener('mouseleave', () => { hold = false; t0 = Date.now(); });
    rail.addEventListener('focusin', () => { hold = true; });
    rail.addEventListener('focusout', () => { hold = false; t0 = Date.now(); });
    rail.addEventListener('pointerdown', () => { t0 = Date.now(); }, { passive: true });
    window.setInterval(() => {
      if (!moving() || document.hidden || hold || Date.now() - t0 < 5000) return;
      const r = rail.getBoundingClientRect();
      t0 = Date.now();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const m = max();
      to(pos() >= m - 4 ? 0 : Math.min(m, pos() + rail.clientWidth + gap));
    }, 250);
    sync();
  });
}
