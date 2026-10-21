// Markdown widgets: `<!-- widget: cost-calculator -->` in an article becomes the
// server-rendered calculator (src/lib/costcalc.ts). Unknown widgets are left as they are.
//
// `<!-- widget: video <YouTube id> | <title> -->` (#62, George 21/10/2026: the videos the live
// pages had go back, in the same place): a lazy youtube-nocookie player — no YouTube cookie
// until the visitor presses play, no layout shift (fixed 16:9 box).
import { calcHtml } from './costcalc.ts';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function videoHtml(arg) {
  const [idRaw, ...rest] = String(arg ?? '').split('|');
  const id = idRaw.trim();
  if (!/^[\w-]{11}$/.test(id)) return null;
  const title = esc(rest.join('|').trim() || 'Video');
  return `<figure class="vid" style="margin:28px 0"><div style="position:relative;aspect-ratio:16/9;background:#0d1114">`
    + `<iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0" title="${title}" loading="lazy" `
    + `allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen `
    + `referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>`
    + `</div></figure>`;
}

const WIDGETS = { 'cost-calculator': () => calcHtml('cc'), video: (arg) => videoHtml(arg) };

export function remarkWidgets() {
  return (tree) => {
    const walk = (node) => {
      if (node.type === 'html') {
        const m = /^<!--\s*widget:\s*([a-z0-9-]+)(?:\s+([^>]*?))?\s*-->$/.exec(node.value.trim());
        const out = m && WIDGETS[m[1]] ? WIDGETS[m[1]](m[2]) : null;
        if (out) node.value = out;
      }
      (node.children || []).forEach(walk);
    };
    walk(tree);
  };
}
