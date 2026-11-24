// #349 (Sergei with George 2026-11-24): the carousels' page dashes become two arrows — previous / next — that unfold
// on hover like the list pager's (a short mark stretches into an arrow). One rule for every carousel on the site:
// the home rows (`.h-dash`), link tiles and page blocks and the spec mosaic (`.k-dash`), the info pages' rows
// (`.ir-dash`) and the property page's related row (`.rdash`).
//
// The dash group stays in the page and keeps working: each carousel's own script still moves the row and marks the
// current page (`button.on`). The arrows only press the dash before or after the current one, so no carousel script
// changes. They are `<span role="button">`, not `<button>`, because several scripts count the group's buttons as its
// pages. The group's own visibility rules (hidden on phones) still apply, since the arrows live inside it.
// Not for the step stacks (`.h-bars`): those turn text, not a row.

const GROUPS = '.h-dash, .k-dash, .ir-dash, .rdash';

const CHEV = {
  p: '<svg class="ra__c" width="7" height="12" viewBox="0 0 7 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M6 1L1 6l5 5"/></svg>',
  n: '<svg class="ra__c" width="7" height="12" viewBox="0 0 7 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M1 1l5 5-5 5"/></svg>',
};

export function railArrows(labels: { prev: string; next: string }): void {
  document.querySelectorAll<HTMLElement>(GROUPS).forEach((g) => {
    if (g.dataset.ra) return;
    g.dataset.ra = '1';
    g.classList.add('ra');
    const dashes = () => Array.from(g.querySelectorAll<HTMLButtonElement>('button'));
    const cur = () => dashes().findIndex((b) => b.classList.contains('on'));

    const make = (dir: 'p' | 'n') => {
      const a = document.createElement('span');
      a.className = `ra__b ra__b--${dir}`;
      a.setAttribute('role', 'button');
      a.tabIndex = 0;
      a.setAttribute('aria-label', dir === 'p' ? labels.prev : labels.next);
      a.innerHTML = `<i class="ra__d"></i>${CHEV[dir]}`;
      const go = () => {
        const d = dashes(), k = cur();
        const to = dir === 'p' ? k - 1 : k + 1;
        if (to >= 0 && to < d.length) d[to].click();
      };
      a.addEventListener('click', go);
      a.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      return a;
    };
    const prev = make('p'), next = make('n');
    g.prepend(prev);
    g.append(next);

    // the end arrows rest greyed when there is nothing more that way
    const sync = () => {
      const d = dashes(), k = Math.max(0, cur());
      prev.setAttribute('aria-disabled', String(k <= 0));
      next.setAttribute('aria-disabled', String(k >= d.length - 1));
    };
    sync();
    new MutationObserver(sync).observe(g, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
}
