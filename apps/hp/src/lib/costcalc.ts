// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY COST CALCULATOR — Greece 2026 (the tax article).
// Same rates and rules as the old site's calculator (read from its script and
// ported unchanged in the approved mockup, George 20/10/2026). Default example:
// €350,000 resale → €21,245 on top (6.07 %).
//
// One module, two uses: the server renders the calculator WITH the default
// results (readable without JavaScript and by Google), the browser recomputes on
// every change. The markdown marker `<!-- widget: cost-calculator -->` is replaced
// by `calcHtml()` (see remarkWidgets).
// ═══════════════════════════════════════════════════════════════════════════
export const RATES = {
  tt: 0.0309, tt2027: 0.15, vat: 0.24, notary: 0.01, lawyer: 0.01, registry: 0.005, tap: 0.0003,
  enfia: { village: [2.5, 3.5], coastal: [4, 6], premium: [7, 10] } as Record<string, [number, number]>,
};

export type Inputs = {
  price: number; ptype: 'resale' | 'newsusp' | 'newvat'; buyer: 'eu' | 'noneu';
  sqm: number; zone: 'village' | 'coastal' | 'premium'; rent: number;
  rate2027: boolean; insured: boolean; notary: boolean; lawyer: boolean; registry: boolean;
};

export const DEFAULTS: Inputs = {
  price: 350000, ptype: 'resale', buyer: 'eu', sqm: 120, zone: 'coastal', rent: 0,
  rate2027: false, insured: true, notary: true, lawyer: true, registry: true,
};

export const eur = (n: number) => '€' + Math.round(n).toLocaleString('en-GB');
export const pct = (n: number) => (n * 100).toFixed(2) + ' %';

export function rentTax(r: number): number {
  const t = r * 0.95;
  let tax = 0, prev = 0;
  for (const [lim, rate] of [[12000, 0.15], [24000, 0.25], [35000, 0.35], [Infinity, 0.45]] as const) {
    if (t > prev) tax += (Math.min(t, lim) - prev) * rate;
    prev = lim;
  }
  return tax;
}

export type Result = {
  oneoff: [string, number][]; total: number; price: number;
  annual: [string, string][]; notes: ['ok' | 'warn', string][];
};

export function compute(v: Inputs): Result {
  const p = v.price > 0 ? v.price : 0;
  const oneoff: [string, number][] = [];
  const notes: ['ok' | 'warn', string][] = [];
  let total = 0;
  if (v.ptype === 'newvat') {
    const vat = p * RATES.vat;
    oneoff.push(['VAT 24 % (new build, developer opted out of the suspension)', vat]); total += vat;
    notes.push(['warn', 'No transfer tax is due when VAT applies. Most developers use the suspension until 31 Dec 2026: ask for it in writing.']);
  } else {
    const r = v.buyer === 'noneu' && v.rate2027 ? RATES.tt2027 : RATES.tt;
    const tt = p * r;
    oneoff.push(['Transfer tax ' + (r === RATES.tt2027 ? '15 % (announced non-EU rate, planned 1 Jul 2027)' : '3.09 %'), tt]); total += tt;
    if (v.ptype === 'newsusp') notes.push(['ok', 'New build under the VAT suspension (Law 5246/2025, until 31 Dec 2026): 3.09 % instead of 24 % VAT, saving ' + eur(p * RATES.vat - p * RATES.tt) + '.']);
  }
  if (v.notary) { const n = p * RATES.notary * 1.24; oneoff.push(['Notary ≈1 % + 24 % VAT', n]); total += n; }
  if (v.lawyer) { const l = p * RATES.lawyer * 1.24; oneoff.push(['Lawyer ≈1 % + 24 % VAT', l]); total += l; }
  if (v.registry) { const g = p * RATES.registry; oneoff.push(['Land registry ≈0.5 %', g]); total += g; }

  const z = RATES.enfia[v.zone] || RATES.enfia.coastal;
  const disc = v.insured ? (p <= 500000 ? 0.8 : 0.9) : 1;
  const lo = v.sqm * z[0] * disc, hi = v.sqm * z[1] * disc, tap = p * RATES.tap;
  const annual: [string, string][] = [
    ['ENFIA (estimate, ' + v.zone + ' zone' + (v.insured ? ', insured −' + (p <= 500000 ? '20' : '10') + ' %' : '') + ')', eur(lo) + ' – ' + eur(hi)],
    ['Municipal fee TAP (via electricity bill, estimate)', eur(tap)],
  ];
  if (v.rent > 0) {
    annual.push(['Income tax on €' + v.rent.toLocaleString('en-GB') + ' rent (2026 brackets, after 5 % deduction)', eur(rentTax(v.rent))]);
    annual.push(['Net rent after tax', eur(v.rent - rentTax(v.rent))]);
  }
  if (v.buyer === 'noneu' && !v.rate2027) notes.push(['warn', 'Non-EU buyer: today you pay the same 3.09 %. A 15 % rate was announced on 6 Sept 2026 for purchases from 1 July 2027 (not yet law). Tick the box above to see the impact.']);
  if (p >= 400000 && v.sqm >= 120) notes.push(['ok', 'Golden Visa: this purchase meets the Halkidiki threshold (€400,000, single property ≥120 m²). Residence permit for the buyer and family, renewable every 5 years.']);
  else if (p >= 400000) notes.push(['warn', 'Golden Visa: the price qualifies (€400,000) but the property must be at least 120 m².']);
  if (p > 500000) notes.push(['warn', 'Total Greek property value above about €500,000: an ENFIA surcharge of 0.1–1 % on the excess may apply.']);
  notes.push(['ok', 'Selling later: no capital gains tax for private individuals until 31 Dec 2026.']);
  return { oneoff, total, price: p, annual, notes };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The output parts, as HTML — used by the server render and by the browser. */
export function outputs(r: Result) {
  return {
    oneoff: r.oneoff.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${eur(b)}</td><td>${r.price ? pct(b / r.price) : ''}</td></tr>`).join(''),
    total: eur(r.total),
    totalpct: r.price ? pct(r.total / r.price) : '',
    budget: eur(r.price + r.total),
    annual: r.annual.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join(''),
    notes: r.notes.map(([c, t]) => `<span class="${c}">${esc(t)}</span>`).join(''),
  };
}

/** The whole calculator with the default results filled in. */
export function calcHtml(id = 'cc'): string {
  const o = outputs(compute(DEFAULTS));
  const opt = (pairs: [string, string][], sel: string) =>
    pairs.map(([v, t]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${esc(t)}</option>`).join('');
  return `<div class="calc" data-calc>
<div class="c-in">
<label for="${id}-price">Purchase price (€)<input id="${id}-price" type="number" data-k="price" value="350000" min="10000" step="1000" inputmode="numeric"></label>
<label for="${id}-ptype">Property<select id="${id}-ptype" data-k="ptype">${opt([['resale', 'Resale (existing home)'], ['newsusp', 'New build – VAT suspended (3.09 % transfer tax)'], ['newvat', 'New build – with 24 % VAT']], 'resale')}</select></label>
<label for="${id}-buyer">Buyer<select id="${id}-buyer" data-k="buyer">${opt([['eu', 'EU / EEA citizen'], ['noneu', 'Non-EU citizen (UK, Serbia, USA…)']], 'eu')}</select></label>
<label for="${id}-sqm">Size (m²)<input id="${id}-sqm" type="number" data-k="sqm" value="120" min="20" step="5" inputmode="numeric"></label>
<label for="${id}-zone">Zone<select id="${id}-zone" data-k="zone">${opt([['village', 'Inland village'], ['coastal', 'Coastal village / town'], ['premium', 'Premium seafront (Sani, Nikiti, Vourvourou…)']], 'coastal')}</select></label>
<label for="${id}-rent">Expected rent per year (€, optional)<input id="${id}-rent" type="number" data-k="rent" value="0" min="0" step="500" inputmode="numeric"></label>
<div class="c-chk">
<label for="${id}-r27" hidden><input id="${id}-r27" type="checkbox" data-k="rate2027"> Apply the announced 15 % non-EU rate (planned from 1 July 2027, not yet law)</label>
<label for="${id}-ins"><input id="${id}-ins" type="checkbox" data-k="insured" checked> Home insured against natural disasters (−20 % ENFIA)</label>
<label for="${id}-not"><input id="${id}-not" type="checkbox" data-k="notary" checked> Notary ~1 % + VAT</label>
<label for="${id}-law"><input id="${id}-law" type="checkbox" data-k="lawyer" checked> Lawyer ~1 % + VAT</label>
<label for="${id}-reg"><input id="${id}-reg" type="checkbox" data-k="registry" checked> Land registry ~0.5 %</label>
</div>
</div>
<div class="c-out">
<div><p class="c-lab">One-off costs when buying</p><table><tbody data-out="oneoff">${o.oneoff}</tbody></table>
<div class="c-tot"><span>Total on top of the price</span><span><span data-out="total">${o.total}</span> · <span data-out="totalpct">${o.totalpct}</span></span></div>
<div class="c-tot big"><span>Total budget</span><span data-out="budget">${o.budget}</span></div></div>
<div><p class="c-lab">Every year</p><table><tbody data-out="annual">${o.annual}</tbody></table></div>
</div>
<div class="c-notes" data-out="notes">${o.notes}</div>
<p class="c-fine">Estimate for information only, based on the 2026 rules. Fees vary by notary, lawyer and property; ENFIA depends on the official zone price, age and floor. Confirm the figures with your accountant before you sign.</p>
</div>`;
}

/** Browser: wire every calculator on the page. */
export function wireCalculators(doc: Document) {
  doc.querySelectorAll<HTMLElement>('[data-calc]').forEach((root) => {
    const run = () => {
      const v: Record<string, unknown> = {};
      root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-k]').forEach((el) => {
        const k = el.dataset.k as string;
        v[k] = el instanceof HTMLInputElement && el.type === 'checkbox' ? el.checked
          : el instanceof HTMLSelectElement ? el.value : parseFloat(el.value) || 0;
      });
      const r27 = root.querySelector('[data-k=rate2027]')?.closest('label');
      if (r27) r27.hidden = v.buyer !== 'noneu';
      const o = outputs(compute(v as Inputs));
      for (const [k, html] of Object.entries(o)) {
        const el = root.querySelector(`[data-out=${k}]`);
        if (el) el.innerHTML = html;
      }
    };
    root.addEventListener('input', run);
    root.addEventListener('change', run);
    run();
  });
}
