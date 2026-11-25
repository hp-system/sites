// #373: the tile rail (types row of list pages, guides): shared by LinkTiles and PageBlocks — a page without SEO
// sections (Luxury, Under €50,000) has PageBlocks only, and its row never turned.
// The type row (Collections on list pages and guides): four tiles a page, the dashes turn it and follow it.
// Autoplay as on the home page (Sergei 2026-11-16: «должен автоматически листаться как на главной странице везде»):
// a page every 5 s while on screen; pointer or focus holds it; a dash, a swipe or a scroll restarts the count;
// none with reduced motion. Starts again after the listing page swaps its parts in place (hp:swap).
export const initLt = () => document.querySelectorAll<HTMLElement>('[data-lt-rail]:not([data-on])').forEach((rail) => {
  rail.dataset.on = '1';
  const dash = document.querySelector<HTMLElement>(`[data-lt-dash="${rail.id}"]`);
  if (!dash) return;
  const btns = Array.from(dash.querySelectorAll<HTMLButtonElement>('button'));
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rtl = () => getComputedStyle(rail).direction === 'rtl';
  const pos = () => Math.abs(rail.scrollLeft);
  const max = () => Math.max(0, rail.scrollWidth - rail.clientWidth);
  const to = (x: number) => rail.scrollTo({ left: rtl() ? -x : x, behavior: still ? 'auto' : 'smooth' });
  let t0 = Date.now();
  let hold = false;
  const sync = () => {
    const m = max(); const k = m ? Math.round((pos() / m) * (btns.length - 1)) : 0;
    btns.forEach((b, i) => { b.classList.toggle('on', i === k); b.setAttribute('aria-pressed', String(i === k)); });
  };
  rail.addEventListener('scroll', sync, { passive: true });
  btns.forEach((b, i) => b.addEventListener('click', () => { t0 = Date.now(); to(Math.min(max(), i * rail.clientWidth)); }));
  rail.addEventListener('mouseenter', () => { hold = true; });
  rail.addEventListener('mouseleave', () => { hold = false; t0 = Date.now(); });
  rail.addEventListener('focusin', () => { hold = true; });
  rail.addEventListener('focusout', () => { hold = false; t0 = Date.now(); });
  rail.addEventListener('pointerdown', () => { t0 = Date.now(); }, { passive: true });
  rail.addEventListener('touchstart', () => { t0 = Date.now(); }, { passive: true });
  if (!still) {
    const timer = window.setInterval(() => {
      if (!rail.isConnected) { window.clearInterval(timer); return; }   // swapped out (hp:swap)
      if (document.hidden || hold || Date.now() - t0 < 5000) return;
      const r = rail.getBoundingClientRect();
      t0 = Date.now();
      if (r.bottom < 0 || r.top > window.innerHeight || r.width === 0) return;
      const m = max();
      if (!m) return;
      to(pos() >= m - 4 ? 0 : Math.min(m, pos() + rail.clientWidth));
    }, 250);
  }
  sync();
});

let wired = false;
/** Starts every rail on the page, and again after the listing page swaps its parts in place (hp:swap). */
export function wireRails(): void {
  initLt();
  if (wired) return;
  wired = true;
  document.addEventListener('hp:swap', initLt);
}
