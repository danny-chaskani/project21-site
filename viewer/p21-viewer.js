/**
 * Project21 – 3D product viewer (wraps Google <model-viewer>).
 * Usage:
 *   <div class="p21-3d" data-model="models/lintel-13x18.glb"
 *        data-poster="posters/lintel-13x18.webp" data-name="Lintel 13×18"></div>
 *   <script type="module" src="vendor/model-viewer.min.js"></script>
 *   <script type="module" src="viewer/p21-viewer.js"></script>
 * Or from JS: P21Viewer.mount(element, {model, poster, name})
 */
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const VIEWS = { front: '25deg 80deg auto', back: '205deg 80deg auto' };

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch { return false; }
}

function mount(el, opts = {}) {
  const model = opts.model || el.dataset.model;
  const poster = opts.poster || el.dataset.poster;
  const name = opts.name || el.dataset.name || 'Project21';
  if (!model || el.dataset.p21Mounted) return;
  el.dataset.p21Mounted = '1';
  el.classList.add('p21-3d');

  const fallback = document.createElement('img');
  fallback.className = 'p21-3d__fallback';
  fallback.src = poster || '';
  fallback.alt = `${name}, הדמיה`;
  fallback.loading = 'lazy';
  el.appendChild(fallback);

  if (!webglOK()) { el.classList.add('is-fallback'); return; }

  const mv = document.createElement('model-viewer');
  Object.entries({
    src: model,
    poster: poster || '',
    alt: `${name}, הדמיה תלת־ממדית. אפשר לסובב בגרירה.`,
    'camera-controls': '',
    'touch-action': 'pan-y',
    'camera-orbit': VIEWS.front,
    'min-camera-orbit': 'auto 40deg auto',
    'max-camera-orbit': 'auto 120deg auto',
    'interaction-prompt': 'none',
    'environment-image': 'neutral',
    'shadow-intensity': '0.5',
    'shadow-softness': '1',
    exposure: '1',
    loading: 'lazy',
    reveal: 'auto',
    ar: '',
    'ar-modes': 'webxr scene-viewer quick-look',
    'ar-placement': 'wall',
    'ar-scale': 'fixed'
  }).forEach(([k, v]) => mv.setAttribute(k, v));
  if (!REDUCED) {
    mv.setAttribute('auto-rotate', '');
    mv.setAttribute('auto-rotate-delay', '2500');
    mv.setAttribute('rotation-per-second', '14deg');
  }

  const ar = document.createElement('button');
  ar.slot = 'ar-button';
  ar.type = 'button';
  ar.className = 'p21-3d__btn p21-3d__btn--ar';
  ar.textContent = 'לראות על הקיר שלך';
  mv.appendChild(ar);

  const hint = document.createElement('div');
  hint.className = 'p21-3d__hint';
  hint.textContent = 'גררו כדי לסובב';
  const tag = document.createElement('div');
  tag.className = 'p21-3d__tag';
  tag.textContent = '3D RENDER';

  const bar = document.createElement('div');
  bar.className = 'p21-3d__bar';
  const mk = (label, view) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'p21-3d__btn'; b.textContent = label;
    b.setAttribute('aria-pressed', view === 'front' ? 'true' : 'false');
    b.addEventListener('click', () => {
      mv.removeAttribute('auto-rotate');
      mv.cameraOrbit = VIEWS[view];
      mv.cameraTarget = 'auto auto auto';
      mv.fieldOfView = 'auto';
      bar.querySelectorAll('[data-view]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    });
    b.dataset.view = view;
    return b;
  };
  bar.append(mk('חזית', 'front'), mk('גב', 'back'));

  mv.addEventListener('camera-change', e => {
    if (e.detail.source === 'user-interaction') {
      el.classList.add('is-touched');
      bar.querySelectorAll('[data-view]').forEach(x => x.setAttribute('aria-pressed', 'false'));
    }
  });
  mv.addEventListener('error', () => el.classList.add('is-fallback'));

  el.append(mv, hint, tag);
  mv.appendChild(bar); // inside model-viewer so it also shows in fullscreen
}

function mountAll(root = document) { root.querySelectorAll('.p21-3d[data-model]').forEach(el => mount(el)); }

window.P21Viewer = { mount, mountAll };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mountAll());
else mountAll();
