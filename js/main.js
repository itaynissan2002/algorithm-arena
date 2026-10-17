// Tabs, theme, resize wiring.
(() => {
  const TABS = {
    sorting: SortTab,
    race: RaceTab,
    pathfinding: PathTab,
    compare: CompareTab,
  };
  let current = 'sorting';

  function show(name) {
    if (!TABS[name]) name = 'sorting';
    Object.entries(TABS).forEach(([k, t]) => { if (k !== name && t.pause) t.pause(); });
    document.querySelectorAll('.tab').forEach((b) => {
      const on = b.dataset.tab === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on);
    });
    document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === 'tab-' + name));
    current = name;
    // canvases in hidden panels have zero width — size them now
    if (name === 'compare') CompareTab.show();
    else TABS[name].resize();
    if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
  }

  // ----- theme -----
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem('theme');
    if (saved) root.dataset.theme = saved;
  } catch (e) { /* storage unavailable */ }
  $('#themeToggle').addEventListener('click', () => {
    const dark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) { /* ignore */ }
    retheme();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', retheme);
  function retheme() { Object.values(TABS).forEach((t) => t.retheme()); }

  // ----- repo link (works automatically on <user>.github.io/<repo>) -----
  const m = location.hostname.match(/^([^.]+)\.github\.io$/);
  if (m) {
    const repo = location.pathname.split('/').filter(Boolean)[0];
    $('#repoLink').href = `https://github.com/${m[1]}/${repo || m[1] + '.github.io'}`;
  }

  // ----- init -----
  fillInputSelects();
  SortTab.init();
  RaceTab.init();
  PathTab.init();
  CompareTab.init();

  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
  window.addEventListener('hashchange', () => show(location.hash.slice(1)));
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => TABS[current].resize(), 120);
  });
  show(location.hash.slice(1) || 'sorting');
})();
