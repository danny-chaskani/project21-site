// Site header: cart link with item count, on the left side in RTL.
// No count is shown while the cart is empty.
// Also runs the one-time cart move from p21_cart_v1 to p21_cart_v2 and shows
// its notice once, under the header.
import { cartCount, CART_EVENT, hasLegacyCart, migrateFromV1, takeCartNotice } from './cart.js';
import { loadProducts } from './products.js';

const slot = document.querySelector('[data-cart-slot]');

if (slot) {
  const a = document.createElement('a');
  a.className = 'cart-link';
  a.href = '/cart/';
  a.innerHTML =
    '<svg class="cart-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M4.5 8.5h15l-1 12h-13l-1-12Z" fill="none" stroke="currentColor" stroke-width="1.25"/>' +
    '<path d="M8.5 8.5V7a3.5 3.5 0 0 1 7 0v1.5" fill="none" stroke="currentColor" stroke-width="1.25"/>' +
    '</svg><span class="cart-count" hidden></span>';
  slot.replaceChildren(a);

  const badge = a.querySelector('.cart-count');
  const render = () => {
    const n = cartCount();
    badge.hidden = n === 0;
    badge.textContent = n ? String(n) : '';
    a.setAttribute('aria-label', n === 0 ? 'לסל' : n === 1 ? 'לסל, פריט אחד' : `לסל, ${n} פריטים`);
  };
  render();
  window.addEventListener(CART_EVENT, render);
}

// Product data is fetched only when there is an old cart to move.
if (hasLegacyCart()) {
  try {
    migrateFromV1(await loadProducts());
  } catch {
    // Product data unavailable: try again on the next page load.
  }
}

const notice = takeCartNotice();
if (notice) {
  const p = Object.assign(document.createElement('p'), { className: 'notice', textContent: notice });
  p.setAttribute('role', 'status');
  const wrap = Object.assign(document.createElement('div'), { className: 'container cart-migrated' });
  wrap.append(p);
  const rule = document.querySelector('.site-header')?.closest('.container')?.nextElementSibling;
  if (rule && rule.matches('hr')) rule.after(wrap);
  else document.querySelector('main')?.prepend(wrap);
}
