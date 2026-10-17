// Category page: frames. Renders cards and layout filters from product data.
import { loadProducts, loadConfig, mainImage, priceLine } from './products.js';

const grid = document.getElementById('grid');
const filters = document.getElementById('filters');

const [all, config] = await Promise.all([loadProducts(), loadConfig()]);
const frames = all.filter((p) => p.category === 'frames');

function card(p) {
  const img = mainImage(p);
  const price = priceLine(p);
  const li = document.createElement('li');
  li.dataset.layout = p.layout;

  const a = document.createElement('a');
  a.className = 'card-link';
  a.href = `/frames/item/?id=${encodeURIComponent(p.id)}`;

  const media = document.createElement('div');
  media.className = 'card-media';
  const im = document.createElement('img');
  im.src = img.src;
  im.alt = img.alt;
  im.loading = 'lazy';
  im.decoding = 'async';
  media.append(im);

  const name = document.createElement('p');
  name.className = 'card-name product-name';
  name.lang = 'en';
  name.dir = 'ltr';
  name.textContent = p.name;

  const priceEl = document.createElement('p');
  priceEl.className = 'card-price';
  priceEl.textContent = price.hasPrice ? price.text : 'בהצעה אישית';

  a.append(media, name, priceEl);
  li.append(a);
  return li;
}

grid.replaceChildren(...frames.map(card));

// Filters: "all" plus only layouts that have products, in config order.
const present = Object.keys(config.layouts).filter((k) => frames.some((p) => p.layout === k));
if (present.length > 1) {
  const options = [['all', 'הכל'], ...present.map((k) => [k, config.layouts[k]])];
  const buttons = options.map(([key, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = label;
    b.dataset.layout = key;
    b.setAttribute('aria-pressed', String(key === 'all'));
    return b;
  });
  filters.replaceChildren(...buttons.map((b) => { const li = document.createElement('li'); li.append(b); return li; }));
  filters.hidden = false;

  filters.addEventListener('click', (e) => {
    const b = e.target.closest('button.chip');
    if (!b) return;
    const key = b.dataset.layout;
    for (const x of buttons) x.setAttribute('aria-pressed', String(x === b));
    for (const li of grid.children) li.hidden = key !== 'all' && li.dataset.layout !== key;
  });
}
