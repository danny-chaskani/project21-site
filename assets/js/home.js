// Homepage product area: up to 8 products by sort, category tabs, no layout
// filter, and the URL stays clean (no ?c=).
import { mountCatalog } from './catalog.js';

await mountCatalog(document.getElementById('catalog'), { limit: 8, syncUrl: false, showFilter: false });
