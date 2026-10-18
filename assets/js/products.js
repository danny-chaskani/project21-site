// Project21 — product data access. Every page, the cart and the quote form
// read products through this module; no product data lives in HTML.
// Only products with status "live" are visible.

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
export const isLocalPreview = LOCAL_HOSTS.has(location.hostname);

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

let configPromise;
export function loadConfig() {
  configPromise ??= fetchJson('/data/config.json');
  return configPromise;
}

let productsPromise;
/** Live products only. */
export function loadProducts() {
  productsPromise ??= (async () => {
    const list = (await fetchJson('/data/products.json')).filter((p) => p.status === 'live');
    warnOnBadData(list);
    return list;
  })();
  return productsPromise;
}

export async function getProduct(id) {
  return (await loadProducts()).find((p) => p.id === id) ?? null;
}

function warnOnBadData(list) {
  const seen = new Set();
  for (const p of list) {
    if (seen.has(p.sku)) console.warn(`Duplicate SKU: ${p.sku}`);
    seen.add(p.sku);
  }
}

/** Main image: the front render. (Card-size copies come in stage 2–3.) */
export function mainImage(p) {
  return { src: p.assets?.renders?.[0] ?? '', alt: `הדמיה של ${p.name}` };
}

const ils = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });

/** Price line. No price → quote wording. A price is shown as a starting price
    while sales go through quotes. */
export function priceLine(p) {
  if (typeof p.price !== 'number') return { text: 'המחיר יישלח בהצעה אישית', hasPrice: false };
  return { text: `החל מ־${ils.format(p.price)}`, hasPrice: true };
}

/** "180 × 240" style pair for mm values; empty string if missing. */
export function formatPair(pair) {
  return Array.isArray(pair) && pair.length === 2 ? `${pair[0]} × ${pair[1]}` : '';
}
