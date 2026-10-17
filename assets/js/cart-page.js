// Cart page: lines, quantities, gift options, summary. The quote request form
// (stage 6) opens on this same page, under the cart.
import { loadProducts, mainImage } from './products.js';
import { getCart, updateItem, removeItem, reconcile, CART_EVENT, QTY_MIN, QTY_MAX, GIFT_MAX } from './cart.js';

const $ = (sel) => document.querySelector(sel);
const el = (tag, props = {}, ...children) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...children);
  return n;
};

const products = await loadProducts();
const byId = new Map(products.map((p) => [p.id, p]));

// Items whose product became draft or was deleted are dropped, with a notice.
const removed = reconcile(products);
if (removed) {
  const notice = $('#notice');
  notice.textContent = removed === 1
    ? 'פריט אחד כבר לא זמין והוסר מהסל.'
    : `${removed} פריטים כבר לא זמינים והוסרו מהסל.`;
  notice.hidden = false;
}

const ils = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });

function lineView(item, index) {
  const p = byId.get(item.id);
  const img = mainImage(p);
  const href = `/frames/item/?id=${encodeURIComponent(p.id)}`;
  const uid = `l${index}`;

  const thumb = el('a', { className: 'line-thumb', href, tabIndex: -1 },
    el('img', { src: img.src, alt: '', decoding: 'async' }));
  thumb.setAttribute('aria-hidden', 'true');

  const name = el('a', { className: 'line-name product-name', href, textContent: p.name, lang: 'en', dir: 'ltr' });
  const sku = el('p', { className: 'sku', textContent: p.sku });

  const qty = el('select', { className: 'select', id: `${uid}-qty` });
  for (let n = QTY_MIN; n <= QTY_MAX; n++) qty.append(el('option', { value: String(n), textContent: String(n), selected: n === item.qty }));
  qty.addEventListener('change', () => updateItem(index, { qty: Number(qty.value) }));

  const remove = el('button', { type: 'button', className: 'btn btn-secondary btn-small', textContent: 'הסרה' });
  remove.setAttribute('aria-label', `הסרה של ${p.name}`);
  remove.addEventListener('click', () => removeItem(index));

  const gift = el('input', { type: 'checkbox', id: `${uid}-gift`, checked: item.gift });
  gift.addEventListener('change', () => updateItem(index, { gift: gift.checked, giftMessage: gift.checked ? item.giftMessage : '' }));

  const giftBlock = el('div', { className: 'line-gift' },
    el('label', { className: 'check' }, gift, el('span', { textContent: 'לארוז כמתנה? נוסיף שרוול, רצועה וכרטיס עם הברכה שלך.' })));

  if (item.gift) {
    const msg = el('textarea', { className: 'textarea', id: `${uid}-msg`, maxLength: GIFT_MAX, value: item.giftMessage });
    // Save when the field is left, so typing is never interrupted by a re-render.
    msg.addEventListener('change', () => updateItem(index, { giftMessage: msg.value.trim() }));
    giftBlock.append(el('div', { className: 'field' }, el('label', { htmlFor: msg.id, textContent: 'ברכה' }), msg));
  }

  return el('li', { className: 'cart-line' },
    thumb,
    el('div', { className: 'line-info' }, name, sku),
    el('div', { className: 'line-controls' },
      el('div', { className: 'field qty-field' }, el('label', { htmlFor: qty.id, textContent: 'כמות' }), qty),
      remove),
    giftBlock);
}

function render() {
  const items = getCart().filter((i) => byId.has(i.id));
  $('#empty').hidden = items.length > 0;
  $('#filled').hidden = items.length === 0;
  if (!items.length) { closeQuote(); }

  // Keep the original cart index for each line (updates and removals use it).
  const all = getCart();
  $('#lines').replaceChildren(...all.map((item, i) => (byId.has(item.id) ? lineView(item, i) : null)).filter(Boolean));

  const total = items.reduce((n, i) => n + i.qty, 0);
  $('#count').textContent = total === 1 ? 'פריט אחד בסל' : `${total} פריטים בסל`;

  // Estimated sum only when every line has a price.
  const estimate = $('#estimate');
  const priced = items.every((i) => typeof byId.get(i.id).price === 'number');
  if (items.length && priced) {
    const sum = items.reduce((s, i) => s + byId.get(i.id).price * i.qty, 0);
    estimate.textContent = `${ils.format(sum)}. סכום משוער. המחיר הסופי יופיע בהצעה.`;
    estimate.hidden = false;
  } else {
    estimate.hidden = true;
  }
}

// ---------- Quote form toggle (form itself arrives in stage 6) ----------
const request = $('#request');
const quote = $('#quote');
function openQuote() {
  quote.hidden = false;
  request.setAttribute('aria-expanded', 'true');
  window.dispatchEvent(new CustomEvent('p21:quote-open'));
  quote.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function closeQuote() {
  quote.hidden = true;
  request.hidden = false;
  request.setAttribute('aria-expanded', 'false');
}
request.addEventListener('click', openQuote);

render();
window.addEventListener(CART_EVENT, render);
