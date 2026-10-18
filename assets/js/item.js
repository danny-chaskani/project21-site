// Product page: one template for every product, filled from product data.
import { getProduct, loadConfig, mainImage, priceLine, formatPair } from './products.js';
import { addItem, QTY_MIN, QTY_MAX, GIFT_MAX } from './cart.js';

const GALLERY_ORDER = ['front', '45', 'closeup', 'ambience', 'packaging'];

const id = new URLSearchParams(location.search).get('id');
const [p, config] = await Promise.all([id ? getProduct(id) : null, loadConfig()]);

// Unknown or unpublished product: back to the category page.
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

// ---------- SEO ----------
document.title = `${p.name} | מסגרת מתכת | Project21`;
document.querySelector('meta[name="description"]').content = p.desc;

const image = mainImage(p);
const ld = { '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku, description: p.desc,
  brand: { '@type': 'Brand', name: 'Project21' }, image: new URL(image.src, location.origin).href };
if (typeof p.price === 'number') {
  ld.offers = { '@type': 'Offer', price: p.price, priceCurrency: 'ILS', url: location.href };
}
document.head.append(el('script', { type: 'application/ld+json', textContent: JSON.stringify(ld) }));

// ---------- Gallery: photos in the agreed order, else the drawing only ----------
const gallery = $('#gallery');
const photos = Array.isArray(p.photos) && p.photos.length
  ? [...p.photos].sort((a, b) => GALLERY_ORDER.indexOf(a.kind) - GALLERY_ORDER.indexOf(b.kind))
  : [{ src: image.src, alt: image.alt }];
for (const ph of photos) {
  gallery.append(el('figure', { className: 'gallery-item' }, el('img', { src: ph.src, alt: ph.alt || p.name, decoding: 'async' })));
}

// ---------- Name, SKU, price, description ----------
$('#name').textContent = p.name;
$('#sku').textContent = p.sku;
const price = priceLine(p);
$('#price').textContent = price.text;
$('#price').classList.toggle('price-line--quote', !price.hasPrice);
$('#desc').textContent = p.desc;

// ---------- Quantity and gift ----------
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

// ---------- Add to cart: update header count, short note, no navigation ----------
const added = $('#added');
let noteTimer;
$('#add-form').addEventListener('submit', (e) => {
  e.preventDefault();
  addItem({
    id: p.id,
    sku: p.sku,
    qty: Number(qty.value),
    gift: gift.checked,
    giftMessage: gift.checked ? giftMessage.value.trim() : '',
  });
  added.replaceChildren('נוסף לסל. ', el('a', { href: '/cart/', textContent: 'לסל' }));
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => added.replaceChildren(), 8000);
});

// ---------- Information blocks, in the agreed order ----------
const blocks = $('#blocks');
const block = (title, ...content) => blocks.append(el('section', { className: 'info-block' }, el('h2', { className: 'info-title', textContent: title }), ...content));

const row = (label, value, unit) => el('tr', {},
  el('th', { scope: 'row', textContent: label }),
  el('td', {}, el('span', { className: 'ltr', textContent: value }), ` ${unit}`));
const dims = el('table', { className: 'spec' });
const rows = [
  ['פאנל', formatPair(p.panel_mm), 'מ״מ'],
  ['חלון גלוי', formatPair(p.window_mm), 'מ״מ'],
  ['עומק כיפוף', p.depth_mm != null ? String(p.depth_mm) : '', 'מ״מ'],
  ['מידת התמונה', p.print_cm || '', 'ס״מ'],
].filter(([, v]) => v);
dims.append(el('tbody', {}, ...rows.map(([l, v, u]) => row(l, v, u))));
block('מידות', dims);

if (p.material != null) {
  const lines = [p.material, p.finish].filter((v) => v != null && v !== '');
  block('חומר וגימור', ...lines.map((t) => el('p', { textContent: t })));
}

if (Array.isArray(config.box_contents) && config.box_contents.length) {
  block('מה בקופסה', el('ul', { className: 'plain-list' }, ...config.box_contents.map((t) => el('li', { textContent: t }))));
}

block('טיפול', el('p', { textContent: config.care }));

block('איך מזמינים', el('p', {
  textContent: `מוסיפים לסל ומשאירים פרטים. נחזור אליך תוך ${config.RESPONSE_DAYS} ימי עסקים עם הצעת מחיר, זמן אספקה ואפשרויות משלוח.`,
}));

$('#main').hidden = false;
