// Thank-you page. Shows the request number and a short item summary, read
// from sessionStorage (no personal details are kept there).
import { loadConfig } from './products.js';

const config = await loadConfig();
const days = config.RESPONSE_DAYS;

let last = null;
try {
  last = JSON.parse(sessionStorage.getItem('p21_last_quote'));
} catch {
  last = null;
}

const line = document.getElementById('line');
if (last && typeof last.id === 'string') {
  const id = Object.assign(document.createElement('span'), { className: 'ltr mono', textContent: last.id });
  line.append('מספר הבקשה שלך: ', id, `. נחזור אליך עם הצעת מחיר תוך ${days} ימי עסקים, במייל או בטלפון.`);

  const list = document.getElementById('items');
  for (const item of Array.isArray(last.items) ? last.items : []) {
    const li = document.createElement('li');
    li.append(
      Object.assign(document.createElement('span'), { className: 'product-name', lang: 'en', dir: 'ltr', textContent: item.name }),
      Object.assign(document.createElement('span'), { className: 'small text-secondary', textContent: `כמות ${item.qty}${item.gift ? ', אריזת מתנה' : ''}` }),
    );
    list.append(li);
  }
  list.hidden = list.children.length === 0;
} else {
  line.textContent = `נחזור אליך תוך ${days} ימי עסקים.`;
}
