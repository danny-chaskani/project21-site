// Site header: cart link with item count, on the left side in RTL.
// No count is shown while the cart is empty.
import { cartCount, CART_EVENT } from './cart.js';

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
