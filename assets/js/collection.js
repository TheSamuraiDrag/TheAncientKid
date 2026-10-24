// Curated collections: Lowest-II picks (single foods, II < 45) and Mixed meals.
// Light filters (group, reference food, sort) kept in the URL, cards render progressively.

import { card, esc, groupStyle, pageHero, plain, badge, refTag } from './ui.js';

const BATCH = 48;

export const COLLECTIONS = {
  lowest: {
    eyebrow: 'Lowest-II picks',
    title: (n) => `${n} single foods under II 45`,
    lede: 'Single foods that scored under 45, the site’s “low” band. Low doesn’t automatically mean better, and a “vs bread” number can’t be lined up against a “vs glucose” one.',
    photo: 557659, emoji: '🥗', tone: '#D8F0DC,#A9DDB4',
    filter: (f) => f.meal === 'SINGLE' && f.iiValue < 45,
    explorer: '#/explorer?level=low&meal=single',
  },
  mixed: {
    eyebrow: 'Mixed meals',
    title: (n) => `All ${n} mixed meals`,
    lede: 'Breakfasts, lunches, dinners and food combinations eaten together. Real meals, so portions and volunteers vary a lot between studies.',
    photo: 11873900, emoji: '🍱', tone: '#E9DFF7,#CDB8EE',
    filter: (f) => f.meal === 'MIXED MEAL',
    explorer: '#/explorer?meal=mixed',
    highlights: true,
  },
};

const SORTS = { asc: 'II low → high', desc: 'II high → low', az: 'A–Z' };

export function renderCollection(app, data, params, route) {
  const cfg = COLLECTIONS[route];
  const all = data.foods.filter(cfg.filter);
  const groups = data.groups.filter((g) => all.some((f) => f.group === g.id));
  const state = {
    group: groups.some((g) => g.id === params.get('group')) ? params.get('group') : '',
    ref: ['glucose', 'bread'].includes(params.get('ref')) ? params.get('ref') : '',
    sort: SORTS[params.get('sort')] ? params.get('sort') : 'asc',
  };
  const byRef = (r) => all.filter((f) => f.ref === r).length;
  const top = groups.map((g) => [g, all.filter((f) => f.group === g.id).length]).sort((a, b) => b[1] - a[1]);
  const sortedAll = [...all].sort((a, b) => a.iiValue - b.iiValue);

  const highlight = (f, label) => `<button type="button" class="hl-card" data-open="${f.n}" style="${groupStyle(data.groups.find((g) => g.id === f.group))}">
    <span class="hl-label">${label}</span>
    <span class="hl-ii">${esc(f.ii)}</span>
    <span class="hl-name">${esc(plain(f.name))}</span>
    <span class="hl-tags">${badge(f.level)}${refTag(f.ref)}</span>
  </button>`;

  app.innerHTML = `
  ${pageHero({
    eyebrow: cfg.eyebrow, title: esc(cfg.title(all.length)), lede: cfg.lede,
    photo: cfg.photo, emoji: cfg.emoji, tone: cfg.tone,
    extra: `<ul class="hero-facts">
      <li><strong>${byRef('glucose')}</strong> vs glucose</li>
      <li><strong>${byRef('bread')}</strong> vs bread</li>
      <li>II <strong>${esc(sortedAll[0].ii)}</strong> to <strong>${esc(sortedAll[sortedAll.length - 1].ii)}</strong></li>
    </ul>`,
  })}

  <section class="wrap section-tight">
    ${cfg.highlights ? `<div class="hl-row reveal">
      ${highlight(sortedAll[0], 'Lowest mixed meal')}
      ${highlight(sortedAll[sortedAll.length - 1], 'Highest mixed meal')}
    </div>` : `<p class="note reveal"><span aria-hidden="true">🥚</span><span>Most come from ${top.slice(0, 3).map(([g, n]) => `<strong>${esc(g.label)}</strong> (${n})`).join(', ')}.</span></p>`}

    <div class="coll-controls">
      <div class="chip-scroll" role="group" aria-label="Food group">
        <button type="button" class="chip" data-g="" aria-pressed="${!state.group}"><span class="chip-label">All groups</span><span class="chip-n">${all.length}</span></button>
        ${top.map(([g, n]) => `<button type="button" class="chip chip-group" data-g="${g.id}" style="${groupStyle(g)}" aria-pressed="${state.group === g.id}">
          <span aria-hidden="true">${g.emoji}</span><span class="chip-label">${esc(g.label)}</span><span class="chip-n">${n}</span></button>`).join('')}
      </div>
      <div class="coll-row">
        <div class="seg" role="group" aria-label="Reference food">
          ${[['', 'All'], ['glucose', 'vs glucose'], ['bread', 'vs bread']].map(([v, l]) => `<button type="button" data-ref="${v}" aria-pressed="${state.ref === v}">${l}</button>`).join('')}
        </div>
        <label class="sort"><span class="sr-only">Sort by</span>
          <select id="csort">${Object.entries(SORTS).map(([v, l]) => `<option value="${v}"${v === state.sort ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <p class="count" id="ccount" aria-live="polite"></p>
        <a class="see-all" href="${cfg.explorer}">Open in Explorer <span aria-hidden="true">→</span></a>
      </div>
    </div>

    <ul class="cards cards-wide" id="ccards"></ul>
    <div class="sentinel" id="csentinel" aria-hidden="true"></div>
  </section>`;

  const $ = (s) => app.querySelector(s);
  // Listen on this page's own root: #app outlives each page, so listeners there would pile up.
  const root = app.querySelector('.section-tight');
  const list = $('#ccards');
  const sentinel = $('#csentinel');
  let results = [];
  let shown = 0;

  function more() {
    const next = results.slice(shown, shown + BATCH);
    list.insertAdjacentHTML('beforeend', next.map((f, i) => card(f, i)).join(''));
    shown += next.length;
    sentinel.hidden = shown >= results.length;
  }

  function update() {
    results = all.filter((f) => (!state.group || f.group === state.group) && (!state.ref || f.ref === state.ref));
    if (state.sort === 'az') results.sort((a, b) => a.searchKey.localeCompare(b.searchKey));
    else results.sort((a, b) => (state.sort === 'desc' ? b.iiValue - a.iiValue : a.iiValue - b.iiValue) || a.searchKey.localeCompare(b.searchKey));
    shown = 0;
    list.innerHTML = '';
    more();
    $('#ccount').innerHTML = `<strong>${results.length}</strong> of ${all.length}`;
    app.querySelectorAll('[data-g]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.g === state.group)));
    app.querySelectorAll('[data-ref]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ref === state.ref)));
    const p = new URLSearchParams();
    if (state.group) p.set('group', state.group);
    if (state.ref) p.set('ref', state.ref);
    if (state.sort !== 'asc') p.set('sort', state.sort);
    const qs = p.toString();
    history.replaceState(null, '', `#/${route}${qs ? `?${qs}` : ''}`);
  }

  root.addEventListener('click', (e) => {
    const g = e.target.closest('[data-g]');
    if (g) { state.group = g.dataset.g; update(); return; }
    const r = e.target.closest('[data-ref]');
    if (r) { state.ref = r.dataset.ref; update(); }
  });
  $('#csort').addEventListener('change', (e) => { state.sort = e.target.value; update(); });

  const io = new IntersectionObserver((en) => { if (en.some((x) => x.isIntersecting) && shown < results.length) more(); }, { rootMargin: '900px 0px' });
  io.observe(sentinel);
  update();
  return () => io.disconnect();
}
