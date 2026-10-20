// Markdown widgets: `<!-- widget: cost-calculator -->` in an article becomes the
// server-rendered calculator (src/lib/costcalc.ts). Unknown widgets are left as they are.
import { calcHtml } from './costcalc.ts';

const WIDGETS = { 'cost-calculator': () => calcHtml('cc') };

export function remarkWidgets() {
  return (tree) => {
    const walk = (node) => {
      if (node.type === 'html') {
        const m = /^<!--\s*widget:\s*([a-z0-9-]+)\s*-->$/.exec(node.value.trim());
        if (m && WIDGETS[m[1]]) node.value = WIDGETS[m[1]]();
      }
      (node.children || []).forEach(walk);
    };
    walk(tree);
  };
}
