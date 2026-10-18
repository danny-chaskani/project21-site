// Project21 — product data access. Every page, the cart and the quote form
// read products and categories through this module, only from
// /data/products.json and /data/categories.json. No product data lives in HTML.
//
// Rules:
// - A product is shown only if status is "live"; products are ordered by `sort`.
// - A category is shown only if it has at least one live product; ordered by `order`.
// - price, material, finish and hanging may be null; null is never printed.

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
export const isLocalPreview = LOCAL_HOSTS.has(location.hostname);

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

let configPromise;
/** Site settings that are not product data (response days, box contents, care text). */
export function loadConfig() {
  configPromise ??= fetchJson('/data/config.json');
  return configPromise;
}

let productsPromise;
/** Live products, ordered by `sort`. */
export function loadProducts() {
  productsPromise ??= (async () => {
    const list = (await fetchJson('/data/products.json'))
      .filter((p) => p.status === 'live')
      .sort((a, b) => (a.sort ?? Infinity) - (b.sort ?? Infinity));
    warnOnBadData(list);
    return list;
  })();
  return productsPromise;
}

let categoriesPromise;
/** Categories that have at least one live product, ordered by `order`. */
export function loadCategories() {
  categoriesPromise ??= (async () => {
    const [cats, products] = await Promise.all([fetchJson('/data/categories.json'), loadProducts()]);
    const used = new Set(products.map((p) => p.category));
    return cats.filter((c) => used.has(c.id)).sort((a, b) => a.order - b.order);
  })();
  return categoriesPromise;
}

export async function getProduct(id) {
  return (await loadProducts()).find((p) => p.id === id || p.slug === id) ?? null;
}

function warnOnBadData(list) {
  const seen = new Set();
  for (const p of list) {
    if (seen.has(p.sku)) console.warn(`Duplicate SKU: ${p.sku}`);
    seen.add(p.sku);
  }
}

/** Product page URL (existing route; slug equals the old id). */
export function productUrl(p) {
  return `/frames/item/?id=${encodeURIComponent(p.slug || p.id)}`;
}

// ---------- Images ----------
// The data lists the original render PNGs. The site serves WebP copies with
// the printed caption removed: render-front.png -> render-front-800.webp / -1200.webp.
function renderVariants(png) {
  if (!png) return null;
  const base = png.replace(/\.png$/i, '');
  return { src: `${base}-800.webp`, srcset: `${base}-800.webp 800w, ${base}-1200.webp 1200w`, width: 800, height: 940 };
}

/** Front render for cards and thumbnails (4:5 box, image contained). */
export function cardImage(p) {
  const v = renderVariants(p.assets?.renders?.[0]);
  return v ? { ...v, alt: `הדמיה של ${p.name}` } : null;
}

/** Front and back renders, each with alt text. */
export function renders(p) {
  const labels = ['חזית', 'גב'];
  return (p.assets?.renders ?? []).map((png, i) => {
    const v = renderVariants(png);
    return v && { ...v, alt: `הדמיה של ${p.name}, ${labels[i] ?? ''}`.replace(/, $/, ''), label: labels[i] ?? '' };
  }).filter(Boolean);
}

/** Technical sketch, 1080x1350 PNG. */
export function sketchImage(p) {
  return p.assets?.sketch ? { src: p.assets.sketch, width: 1080, height: 1350, alt: `שרטוט טכני של ${p.name}` } : null;
}

/** og:image, 1200x630 JPG next to the product's assets. */
export function ogImage(p) {
  const dir = (p.assets?.sketch || '').replace(/\/[^/]+$/, '');
  return dir ? `${dir}/og.jpg` : '';
}

// ---------- Text helpers ----------
const ils = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });

/** Price line. No price → quote wording. A price is shown as a starting price
    while sales go through quotes. */
export function priceLine(p) {
  if (typeof p.price !== 'number') return { text: 'המחיר יישלח בהצעה אישית', hasPrice: false };
  return { text: `החל מ־${ils.format(p.price)}`, hasPrice: true };
}

/** Short price line for cards. */
export function cardPrice(p) {
  const line = priceLine(p);
  return line.hasPrice ? line.text : 'בהצעה אישית';
}

/** "180 × 240" style pair for mm values; empty string if missing. */
export function formatPair(pair) {
  return Array.isArray(pair) && pair.length === 2 ? `${pair[0]} × ${pair[1]}` : '';
}

/** Material and finish block is shown only when there is a specification. */
export function hasSpec(p) {
  return p.material != null && p.material !== '';
}
