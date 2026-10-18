// Shop page (/frames/): every live product, category tabs, layout filter,
// and the active tab/filter kept in the URL (?c=&l=).
import { mountCatalog } from './catalog.js';
import { loadCategories } from './products.js';

const intro = document.getElementById('intro');
const frames = (await loadCategories()).find((c) => c.id === 'frames');
if (frames?.intro) intro.textContent = frames.intro;
else intro.remove();

await mountCatalog(document.getElementById('catalog'), { syncUrl: true });
