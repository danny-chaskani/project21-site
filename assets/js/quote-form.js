// Quote request form, on the cart page. Validates on submit, sends through
// submitQuote(), and on success empties the cart and moves to /thanks/.
// Personal details are never stored in localStorage or put in a URL.
import { loadProducts } from './products.js';
import { getCart, clearCart } from './cart.js';
import { validateCustomer, requestId } from './quote-validate.js';
import { submitQuote } from './quote-api.js';

const form = document.getElementById('quote-form');
const submit = document.getElementById('q-submit');
const failed = document.getElementById('q-failed');
const request = document.getElementById('request');

const fields = {
  name: document.getElementById('q-name'),
  email: document.getElementById('q-email'),
  phone: document.getElementById('q-phone'),
  consent: document.getElementById('q-consent'),
};
const order = ['name', 'email', 'phone', 'consent'];

// One primary button per screen: the open form's submit replaces the cart's button.
window.addEventListener('p21:quote-open', () => {
  request.hidden = true;
  fields.name.focus({ preventScroll: true });
});

function showError(key, message) {
  const input = fields[key];
  const err = document.getElementById(`${input.id}-err`);
  if (message) {
    // Phone examples stay one LTR run, never split or reordered.
    // One wrapper so the flex row (icon + text) treats the message as a single item.
    const text = document.createElement('span');
    text.append(...message.split(/(\d{3}-\d{7})/).map((part, i) => (i % 2
      ? Object.assign(document.createElement('span'), { className: 'ltr nowrap', textContent: part })
      : part)));
    err.replaceChildren(text);
    err.hidden = false;
    input.setAttribute('aria-invalid', 'true');
  } else {
    err.textContent = '';
    err.hidden = true;
    input.removeAttribute('aria-invalid');
  }
}

for (const key of order) {
  fields[key].addEventListener(key === 'consent' ? 'change' : 'input', () => showError(key, ''));
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  failed.hidden = true;

  // Honeypot filled: a bot. Do not send anything.
  if (form.elements.company.value.trim() !== '') return;

  const check = validateCustomer({
    name: fields.name.value,
    email: fields.email.value,
    phone: fields.phone.value,
    notes: form.elements.notes.value,
    consent: fields.consent.checked,
  });
  for (const key of order) showError(key, check.errors[key] || '');
  if (!check.ok) {
    fields[order.find((k) => check.errors[k])].focus();
    return;
  }

  const products = await loadProducts();
  const byId = new Map(products.map((p) => [p.id, p]));
  const items = getCart()
    .filter((i) => byId.has(i.id))
    .map((i) => ({ id: i.id, sku: i.sku, name: byId.get(i.id).name, qty: i.qty, gift: i.gift, giftMessage: i.giftMessage }));
  if (!items.length) return;

  const payload = {
    customer: { ...check.value, consent: true },
    company: form.elements.company.value,
    items,
    request: { id: requestId(), sentAt: new Date().toISOString(), pageUrl: location.href },
  };

  submit.disabled = true;
  let ok = false;
  try {
    const result = await submitQuote(payload);
    ok = result.ok === true;
    // The server may assign a new number if the browser's one was taken.
    if (ok && result.id) payload.request.id = result.id;
  } catch {
    ok = false;
  }
  submit.disabled = false;

  if (!ok) {
    // Cart and everything typed stay as they are.
    failed.hidden = false;
    return;
  }

  // Only the request number and an item summary go to the thank-you page.
  try {
    sessionStorage.setItem('p21_last_quote', JSON.stringify({
      id: payload.request.id,
      items: items.map(({ name, qty, gift }) => ({ name, qty, gift })),
    }));
  } catch {
    // Without session storage the thank-you page still shows its message.
  }
  form.reset();
  clearCart();
  location.assign('/thanks/');
});
