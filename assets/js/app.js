// Boot, data loading and hash routing.
// Hash routes (#/explorer?group=bread) keep every view shareable and refresh-safe on GitHub Pages.

import { setData, wireGlobal, wireImages, wireReveal, setDetailListener, closeSheet, esc } from './ui.js';
import { renderHome } from './home.js';
import { renderExplorer } from './explorer.js';

const app = document.getElementById('app');
let data = null;
let current = { route: null, cleanup: null };

const PAGES = {
  groups: { title: 'Food groups', emoji: '🧺' },
  lowest: { title: 'Lowest-II picks', emoji: '🥗' },
  mixed: { title: 'Mixed meals', emoji: '🍱' },
  guide: { title: 'How to read the II', emoji: '📈' },
  about: { title: 'About & sources', emoji: '📚' },
};

export function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  return { route: path.split('/')[0] || 'home', params: new URLSearchParams(query) };
}

function renderPlaceholder(route) {
  const p = PAGES[route];
  app.innerHTML = `<section class="wrap page-soon">
    <span class="soon-emoji" aria-hidden="true">${p.emoji}</span>
    <h1>${esc(p.title)}</h1>
    <p>This page is being built next. In the meantime, the Food Explorer has all 629 foods.</p>
    <a class="btn btn-primary" href="#/explorer">Open the Explorer</a>
  </section>`;
}

function render() {
  const { route, params } = parseHash();
  const sameRoute = route === current.route;
  current.cleanup?.();
  current.cleanup = null;

  document.querySelectorAll('.nav-list a').forEach((a) => {
    if (a.dataset.route === route) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  closeNav();
  const detail = document.getElementById('detail');
  if (detail.open && !params.get('food')) closeSheet(detail);

  if (route === 'home') current.cleanup = renderHome(app, data);
  else if (route === 'explorer') current.cleanup = renderExplorer(app, data, params);
  else if (PAGES[route]) renderPlaceholder(route);
  else { location.replace('#/'); return; }

  document.title = route === 'home' ? 'Insulin Index Explorer'
    : `${route === 'explorer' ? 'Food Explorer' : PAGES[route].title} · Insulin Index Explorer`;

  wireImages(app);
  wireReveal(app);
  if (!sameRoute) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    app.focus({ preventScroll: true });
  }
  current.route = route;
}

function navigate() {
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.startViewTransition(render);
  } else {
    render();
  }
}

/* ---------- Mobile nav ---------- */

const toggle = document.querySelector('.nav-toggle');
function closeNav() {
  toggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('nav-open');
}
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('nav-open', open);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });

// Header gets a soft shadow once the page scrolls.
const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Boot ---------- */

async function boot() {
  try {
    const res = await fetch('data/foods.json');
    if (!res.ok) throw new Error(res.status);
    data = await res.json();
  } catch (err) {
    app.innerHTML = `<section class="wrap page-soon"><h1>Couldn’t load the food data</h1>
      <p>Please refresh the page. If you opened the file directly, serve the folder with a local web server.</p></section>`;
    return;
  }
  setData(data);
  wireGlobal();
  setDetailListener((n) => {
    // Keep the open food in the URL on the Explorer so the view can be shared.
    const { route, params } = parseHash();
    if (route !== 'explorer') return;
    if (n) params.set('food', n); else params.delete('food');
    const q = params.toString();
    history.replaceState(null, '', `#/explorer${q ? `?${q}` : ''}`);
  });
  window.addEventListener('hashchange', navigate);
  render();
}

boot();
