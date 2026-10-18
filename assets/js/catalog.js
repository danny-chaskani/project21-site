// Catalog: category tabs + layout filter + product grid. One component for the
// homepage and the shop page.
//
//   mountCatalog(root, { syncUrl: true })        shop: all products, layout filter,
//                                                  state in ?c=&l= (back button works)
//   mountCatalog(root, { limit: 8, syncUrl: false, showFilter: false })   homepage
//
// ARIA tabs pattern: role=tablist/tab/tabpanel, aria-selected, aria-controls,
// roving tabindex. Keys are RTL-aware: ArrowLeft = next, ArrowRight = previous,
// Home/End = first/last. Selection follows focus.
import { loadProducts, loadCategories, cardImage, cardPrice, productUrl } from './products.js';

const ALL = 'all';
let instance = 0;

const el = (tag, props = {}, ...children) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...children);
  return n;
};

export function card(p) {
  const img = cardImage(p);
  const media = el('div', { className: 'card-media' });
  if (img) {
    media.append(el('img', {
      src: img.src, srcset: img.srcset, sizes: '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw',
      width: img.width, height: img.height, alt: img.alt, loading: 'lazy', decoding: 'async',
    }));
  }
  const name = el('p', { className: 'card-name product-name', lang: 'en', dir: 'ltr', textContent: p.name });
  const price = el('p', { className: 'card-price', textContent: cardPrice(p) });
  return el('li', {}, el('a', { className: 'card-link', href: productUrl(p) }, media, name, price));
}

export async function mountCatalog(root, { limit = Infinity, syncUrl = false, showFilter = true } = {}) {
  const [products, categories] = await Promise.all([loadProducts(), loadCategories()]);
  if (!products.length) { root.hidden = true; return; }

  const id = `cat${++instance}`;
  const tabsData = [{ id: ALL, name: 'הכל' }, ...categories];
  const state = { c: ALL, l: ALL };

  // ---------- Tabs ----------
  const tablist = el('div', { className: 'tabs', role: 'tablist' });
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'קטגוריות');
  const panelId = `${id}-panel`;
  const tabs = tabsData.map((t) => {
    const b = el('button', { type: 'button', className: 'tab', id: `${id}-tab-${t.id}`, textContent: t.name });
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', panelId);
    b.dataset.cat = t.id;
    return b;
  });
  tablist.append(...tabs);

  // ---------- Panel: optional layout filter + grid ----------
  const panel = el('div', { className: 'tabpanel', id: panelId });
  panel.setAttribute('role', 'tabpanel');
  const filters = el('ul', { className: 'filters' });
  filters.setAttribute('aria-label', 'סינון לפי פריסה');
  const grid = el('ul', { className: 'grid' });
  panel.append(filters, grid);
  root.replaceChildren(tablist, panel);

  const inCategory = (c) => products.filter((p) => c === ALL || p.category === c);

  function layoutsOf(c) {
    // Layouts in product order (by sort), each once, with their Hebrew label.
    const seen = new Map();
    for (const p of inCategory(c)) if (!seen.has(p.layout)) seen.set(p.layout, p.layout_he);
    return [...seen];
  }

  function render({ focusTab = false } = {}) {
    // Tabs
    for (const t of tabs) {
      const on = t.dataset.cat === state.c;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on) {
        panel.setAttribute('aria-labelledby', t.id);
        if (focusTab) t.focus();
      }
    }

    // Layout filter: only inside a category with more than one layout.
    const layouts = state.c === ALL ? [] : layoutsOf(state.c);
    const filterOn = showFilter && layouts.length > 1;
    if (!filterOn || !layouts.some(([k]) => k === state.l)) state.l = ALL;
    filters.hidden = !filterOn;
    if (filterOn) {
      filters.replaceChildren(...[[ALL, 'הכל'], ...layouts].map(([k, label]) => {
        const b = el('button', { type: 'button', className: 'chip', textContent: label });
        b.dataset.layout = k;
        b.setAttribute('aria-pressed', String(k === state.l));
        return el('li', {}, b);
      }));
    }

    // Grid
    const list = inCategory(state.c).filter((p) => state.l === ALL || p.layout === state.l).slice(0, limit);
    grid.replaceChildren(...list.map(card));
  }

  // ---------- URL (shop only) ----------
  function readUrl() {
    const q = new URLSearchParams(location.search);
    const c = q.get('c');
    state.c = tabsData.some((t) => t.id === c) ? c : ALL;
    state.l = q.get('l') || ALL;
  }
  function writeUrl() {
    if (!syncUrl) return;
    const q = new URLSearchParams(location.search);
    q.delete('c'); q.delete('l');
    if (state.c !== ALL) q.set('c', state.c);
    if (state.c !== ALL && state.l !== ALL) q.set('l', state.l);
    const next = `${location.pathname}${q.toString() ? `?${q}` : ''}`;
    if (next !== `${location.pathname}${location.search}`) history.pushState(null, '', next);
  }

  function select(c, opts) {
    if (c === state.c) return render(opts);
    state.c = c;
    state.l = ALL;
    render(opts);
    writeUrl();
  }

  // ---------- Events ----------
  tablist.addEventListener('click', (e) => {
    const t = e.target.closest('[role="tab"]');
    if (t) select(t.dataset.cat);
  });
  tablist.addEventListener('keydown', (e) => {
    const i = tabs.findIndex((t) => t.dataset.cat === state.c);
    let j = null;
    if (e.key === 'ArrowLeft') j = (i + 1) % tabs.length;              // RTL: left = next
    else if (e.key === 'ArrowRight') j = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = tabs.length - 1;
    if (j === null) return;
    e.preventDefault();
    select(tabs[j].dataset.cat, { focusTab: true });
  });
  filters.addEventListener('click', (e) => {
    const b = e.target.closest('button.chip');
    if (!b || b.dataset.layout === state.l) return;
    state.l = b.dataset.layout;
    render();
    writeUrl();
  });

  if (syncUrl) {
    readUrl();
    window.addEventListener('popstate', () => { readUrl(); render(); });
  }
  render();
}
