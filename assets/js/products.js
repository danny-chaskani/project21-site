// Project21 — product data access. Every page, the cart and the quote form
// read products through this module; no product data lives in HTML.
//
// Live site:      /data/products.json only (live products).
// Local preview:  also /data/products.draft.json, which is git-ignored and
//                 never published. Decided by host only; there is no URL
//                 parameter or browser switch that reveals drafts.

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
export const isLocalPreview = LOCAL_HOSTS.has(location.hostname);

const LIVE_DRAWINGS = '/assets/products/';
const DRAFT_DRAWINGS = '/_dev/products/';

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
/** Products visible on this host: live everywhere, plus drafts in local preview. */
export function loadProducts() {
  productsPromise ??= (async () => {
    const live = (await fetchJson('/data/products.json')).filter((p) => p.status === 'live');
    let drafts = [];
    if (isLocalPreview) {
      try {
        drafts = (await fetchJson('/data/products.draft.json')).filter((p) => p.status === 'draft');
      } catch {
        drafts = [];
      }
    }
    const byId = new Map();
    for (const p of [...live, ...drafts]) if (!byId.has(p.id)) byId.set(p.id, p);
    const list = [...byId.values()];
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

/** Main image: first photo if there are photos, otherwise the drawing. */
export function mainImage(p) {
  if (Array.isArray(p.photos) && p.photos.length) {
    const ph = p.photos[0];
    return { src: ph.src, alt: ph.alt || p.name, isDrawing: false };
  }
  const base = p.status === 'live' ? LIVE_DRAWINGS : DRAFT_DRAWINGS;
  return { src: base + p.drawing, alt: `שרטוט של ${p.name}`, isDrawing: true };
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
