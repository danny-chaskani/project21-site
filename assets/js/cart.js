// Project21 — cart storage. Client side only, in localStorage under p21_cart_v2.
// Item shape: {id, sku, qty, gift, giftMessage}. Name, sizes and image are
// always read from product data by id, never stored here.
// If storage is unavailable, the cart lives in page memory only.

const KEY = 'p21_cart_v2';
const LEGACY_KEY = 'p21_cart_v1';
const NOTICE_KEY = 'p21_cart_notice';
export const QTY_MIN = 1;
export const QTY_MAX = 20;
export const GIFT_MAX = 200;
export const CART_EVENT = 'p21:cart';

let memory = [];

function clampQty(n) {
  n = Math.floor(Number(n));
  if (!Number.isFinite(n)) return QTY_MIN;
  return Math.min(QTY_MAX, Math.max(QTY_MIN, n));
}

function clean(item) {
  if (!item || typeof item.id !== 'string' || typeof item.sku !== 'string') return null;
  const gift = item.gift === true;
  return {
    id: item.id,
    sku: item.sku,
    qty: clampQty(item.qty),
    gift,
    giftMessage: gift ? String(item.giftMessage ?? '').slice(0, GIFT_MAX) : '',
  };
}

export function getCart() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    memory = Array.isArray(parsed) ? parsed.map(clean).filter(Boolean) : [];
  } catch {
    // Storage blocked or bad JSON: fall back to the in-memory copy.
  }
  return memory.map((i) => ({ ...i }));
}

function save(items) {
  memory = items.map(clean).filter(Boolean);
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    // Storage unavailable: keep the in-memory cart for this page.
  }
  window.dispatchEvent(new CustomEvent(CART_EVENT));
}

const sameLine = (a, b) => a.id === b.id && a.gift === b.gift && a.giftMessage === b.giftMessage;

/** Add an item. Same product with the same gift settings merges into one line. */
export function addItem(item) {
  const next = clean(item);
  if (!next) return;
  const items = getCart();
  const line = items.find((i) => sameLine(i, next));
  if (line) line.qty = clampQty(line.qty + next.qty);
  else items.push(next);
  save(items);
}

/** Replace the line at index with new values; merges if it now matches another line. */
export function updateItem(index, changes) {
  const items = getCart();
  if (!items[index]) return;
  const updated = clean({ ...items[index], ...changes });
  items.splice(index, 1);
  const other = items.find((i) => sameLine(i, updated));
  if (other) other.qty = clampQty(other.qty + updated.qty);
  else items.splice(index, 0, updated);
  save(items);
}

export function removeItem(index) {
  const items = getCart();
  items.splice(index, 1);
  save(items);
}

export function clearCart() {
  save([]);
}

export function cartCount() {
  return getCart().reduce((n, i) => n + i.qty, 0);
}

/** Drop lines whose product is no longer visible (made draft or deleted).
    Returns how many lines were removed. */
export function reconcile(products) {
  const ids = new Set(products.map((p) => p.id));
  const items = getCart();
  const kept = items.filter((i) => ids.has(i.id));
  if (kept.length !== items.length) save(kept);
  return items.length - kept.length;
}

/** True if an old p21_cart_v1 cart is still in storage. */
export function hasLegacyCart() {
  try {
    return localStorage.getItem(LEGACY_KEY) !== null;
  } catch {
    return false;
  }
}

/** One-time move from p21_cart_v1: keep lines whose id exists in the current
    products (SKU refreshed from the data), drop the rest, delete the old key.
    If anything was dropped, a one-time notice is queued (see takeCartNotice). */
export function migrateFromV1(products) {
  let raw;
  try {
    raw = localStorage.getItem(LEGACY_KEY);
  } catch {
    return;
  }
  if (raw === null) return;

  let old = [];
  let unreadable = false;
  try {
    const parsed = JSON.parse(raw);
    old = Array.isArray(parsed) ? parsed : [];
    unreadable = !Array.isArray(parsed);
  } catch {
    unreadable = true;
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  const kept = old
    .filter((i) => i && byId.has(i.id))
    .map((i) => clean({ ...i, sku: byId.get(i.id).sku }))
    .filter(Boolean);
  const changed = unreadable || kept.length !== old.length || old.some((i) => i && byId.has(i.id) && i.sku !== byId.get(i.id).sku);

  try {
    // A v2 cart already exists: it wins; v1 lines are merged into it.
    const current = getCart();
    for (const k of kept) {
      const line = current.find((c) => sameLine(c, k));
      if (line) line.qty = clampQty(line.qty + k.qty);
      else current.push(k);
    }
    save(current);
    localStorage.removeItem(LEGACY_KEY);
    if (changed) localStorage.setItem(NOTICE_KEY, '1');
  } catch {
    // Storage unavailable: nothing to migrate.
  }
}

/** Returns the one-time migration notice text once, then clears it. */
export function takeCartNotice() {
  try {
    if (localStorage.getItem(NOTICE_KEY) !== '1') return '';
    localStorage.removeItem(NOTICE_KEY);
    return 'חלק מהפריטים בסל עודכנו או הוסרו.';
  } catch {
    return '';
  }
}

// Keep tabs in sync.
window.addEventListener('storage', (e) => {
  if (e.key === KEY) window.dispatchEvent(new CustomEvent(CART_EVENT));
});
