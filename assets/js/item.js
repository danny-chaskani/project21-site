// Product page: one template for every product, filled from /data/products.json.
// Media: segmented control (3D / sketch / side by side from 1280px) over one
// 4:5 stage. The 3D viewer is mounted once and only hidden when another view
// is shown, so the camera angle is kept and the model is not loaded twice.
import {
  getProduct, loadProducts, loadConfig, priceLine, formatPair, hasSpec,
  sketchImage, renders, ogImage, productUrl,
} from './products.js';
import { addItem, QTY_MIN, QTY_MAX, GIFT_MAX } from './cart.js';
import { card } from './catalog.js';

const id = new URLSearchParams(location.search).get('id');
const [p, config, all] = await Promise.all([id ? getProduct(id) : null, loadConfig(), loadProducts()]);

// Unknown or unpublished product: back to the shop.
if (!p) {
  location.replace('/frames/');
  throw new Error('product not found');
}

const $ = (sel) => document.querySelector(sel);
const el = (tag, props = {}, ...children) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...children);
  return n;
};
const absolute = (path) => new URL(path, location.origin).href;

// ---------- SEO ----------
// Material is not confirmed yet, so the title says "metal" (brand rule).
document.title = `${p.name} | מסגרת מתכת | Project21`;
const meta = (sel, value) => { const m = document.querySelector(sel); if (m) m.content = value; };
meta('meta[name="description"]', p.desc);
meta('meta[property="og:title"]', document.title);
meta('meta[property="og:description"]', p.desc);
meta('meta[property="og:image"]', absolute(ogImage(p)));

const front = renders(p)[0];
const ld = {
  '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku, description: p.desc,
  brand: { '@type': 'Brand', name: 'Project21' }, url: absolute(productUrl(p)),
};
if (front) ld.image = [absolute(front.src), absolute(p.assets.sketch)];
if (p.material != null) ld.material = p.material;
if (typeof p.price === 'number') {
  ld.offers = { '@type': 'Offer', price: p.price, priceCurrency: 'ILS', url: absolute(productUrl(p)) };
}
document.head.append(el('script', { type: 'application/ld+json', textContent: JSON.stringify(ld) }));

// ---------- Media ----------
const stage = $('#stage');
const modeTabs = [...document.querySelectorAll('.segmented [role="tab"]')];
const sideTab = $('#mode-side');
const wide = window.matchMedia('(min-width: 1280px)');

const sketch = sketchImage(p);
const sketchImg = $('#sketch');
Object.assign(sketchImg, { src: sketch.src, width: sketch.width, height: sketch.height, alt: sketch.alt, decoding: 'async' });

const renderImg = $('#render');
const renderList = renders(p);

// Viewer: mounted once.
window.P21Viewer.mount($('#viewer'), { model: p.assets.model, poster: p.assets.poster, name: p.name });

// Thumbnails: 3D, sketch, front render, back render.
const thumbs = [
  { key: '3d', label: 'הדמיה 3D', img: p.assets.poster },
  { key: 'sketch', label: 'שרטוט', img: sketch.src },
  ...renderList.map((r, i) => ({ key: `render-${i}`, label: r.alt, img: r.src, render: r })),
];
const thumbButtons = thumbs.map((t) => {
  const b = el('button', { type: 'button', className: 'thumb' }, el('img', { src: t.img, alt: '', loading: 'lazy', decoding: 'async', width: 80, height: 100 }));
  b.setAttribute('aria-label', t.label);
  b.dataset.key = t.key;
  return b;
});
$('#thumbs').append(...thumbButtons);

let current = { mode: '3d', thumb: '3d' };

function show(mode, { thumb = mode, focusTab = false } = {}) {
  if (mode === 'side' && !wide.matches) mode = '3d';
  current = { mode, thumb };
  stage.dataset.mode = mode;

  // The segmented control follows: a render belongs to "הדמיה 3D".
  const tabMode = mode === 'render' ? '3d' : mode;
  for (const t of modeTabs) {
    const on = t.dataset.mode === tabMode;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    if (on) {
      stage.setAttribute('aria-labelledby', t.id);
      if (focusTab) t.focus();
    }
  }
  for (const b of thumbButtons) b.setAttribute('aria-pressed', String(b.dataset.key === thumb));
}

function showRender(i) {
  const r = renderList[i];
  Object.assign(renderImg, { src: r.src, srcset: r.srcset, sizes: '(min-width: 1024px) 58vw, 100vw', width: r.width, height: r.height, alt: r.alt });
  show('render', { thumb: `render-${i}` });
}

const segmented = $('.segmented');
segmented.addEventListener('click', (e) => {
  const t = e.target.closest('[role="tab"]');
  if (t) show(t.dataset.mode);
});
segmented.addEventListener('keydown', (e) => {
  const visible = modeTabs.filter((t) => !t.hidden);
  const i = visible.findIndex((t) => t.getAttribute('aria-selected') === 'true');
  let j = null;
  if (e.key === 'ArrowLeft') j = (i + 1) % visible.length;               // RTL: left = next
  else if (e.key === 'ArrowRight') j = (i - 1 + visible.length) % visible.length;
  else if (e.key === 'Home') j = 0;
  else if (e.key === 'End') j = visible.length - 1;
  if (j === null) return;
  e.preventDefault();
  show(visible[j].dataset.mode, { focusTab: true });
});
$('#thumbs').addEventListener('click', (e) => {
  const b = e.target.closest('.thumb');
  if (!b) return;
  const key = b.dataset.key;
  if (key.startsWith('render-')) showRender(Number(key.slice(7)));
  else show(key);
});

// "Side by side" only from 1280px; leaving that width falls back to 3D.
function syncWide() {
  sideTab.hidden = !wide.matches;
  if (!wide.matches && current.mode === 'side') show('3d');
}
wide.addEventListener('change', syncWide);
syncWide();
show('3d');

// ---------- Info ----------
$('#name').textContent = p.name;
$('#sku').textContent = p.sku;
const price = priceLine(p);
$('#price').textContent = price.text;
$('#price').classList.toggle('price-line--quote', !price.hasPrice);
$('#desc').textContent = p.desc;

const tags = $('#tags');
if (p.layout_he) tags.append(el('span', { className: 'tag', textContent: p.layout_he }));
if (p.print_cm) {
  tags.append(el('span', { className: 'tag' }, 'תמונה ', el('span', { className: 'ltr mono', textContent: p.print_cm }), ' ס״מ'));
}
if (!tags.children.length) tags.remove();

// Quantity and gift (existing logic)
const qty = $('#qty');
for (let n = QTY_MIN; n <= QTY_MAX; n++) qty.append(el('option', { value: String(n), textContent: String(n) }));

const gift = $('#gift');
const giftField = $('#gift-message-field');
const giftMessage = $('#gift-message');
const giftCount = $('#gift-count-n');
giftMessage.maxLength = GIFT_MAX;
const renderCount = () => { giftCount.textContent = `${giftMessage.value.length}/${GIFT_MAX}`; };
gift.addEventListener('change', () => {
  giftField.hidden = !gift.checked;
  gift.setAttribute('aria-expanded', String(gift.checked));
  if (gift.checked) giftMessage.focus();
});
giftMessage.addEventListener('input', renderCount);
renderCount();

// Add to cart: header count updates, short note, no navigation.
const added = $('#added');
let noteTimer;
$('#add-form').addEventListener('submit', (e) => {
  e.preventDefault();
  addItem({ id: p.id, sku: p.sku, qty: Number(qty.value), gift: gift.checked, giftMessage: gift.checked ? giftMessage.value.trim() : '' });
  added.replaceChildren('נוסף לסל. ', el('a', { href: '/cart/', textContent: 'לסל' }));
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => added.replaceChildren(), 8000);
});

// ---------- Accordions ----------
const acc = $('#accordions');
const section = (title, open, ...content) => acc.append(el('details', { className: 'acc', open },
  el('summary', { className: 'acc-title', textContent: title }), el('div', { className: 'acc-body' }, ...content)));

const row = (label, value, unit) => el('tr', {},
  el('th', { scope: 'row', textContent: label }),
  el('td', {}, el('span', { className: 'ltr', textContent: value }), ` ${unit}`));
const rows = [
  ['פאנל', formatPair(p.panel_mm), 'מ״מ'],
  ['חלון גלוי', formatPair(p.window_mm), 'מ״מ'],
  ['עומק כיפוף', p.depth_mm != null ? String(p.depth_mm) : '', 'מ״מ'],
  ['תמונה', p.print_cm || '', 'ס״מ'],
].filter(([, v]) => v);
section('מידות', true, el('table', { className: 'spec' }, el('tbody', {}, ...rows.map(([l, v, u]) => row(l, v, u)))));

if (hasSpec(p)) {
  section('חומר וגימור', false, ...[p.material, p.finish].filter((v) => v != null && v !== '').map((t) => el('p', { textContent: t })));
}
if (Array.isArray(config.box_contents) && config.box_contents.length) {
  section('מה בקופסה', false, el('ul', { className: 'plain-list' }, ...config.box_contents.map((t) => el('li', { textContent: t }))));
}
section('טיפול', false, el('p', { textContent: config.care }));
section('איך מזמינים', false, el('p', {
  textContent: `מוסיפים לסל ומשאירים פרטים. נחזור אליך תוך ${config.RESPONSE_DAYS} ימי עסקים עם הצעת מחיר, זמן אספקה ואפשרויות משלוח.`,
}));

// ---------- More from the series: up to 4 from the same category ----------
const more = all.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
if (more.length) {
  $('#more-grid').append(...more.map(card));
  $('#more').hidden = false;
}

$('#main').hidden = false;
