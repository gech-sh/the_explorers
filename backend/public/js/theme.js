(() => {
  const key = 'explorers-color-theme';
  let saved;
  try { saved = localStorage.getItem(key); } catch {}
  const root = document.documentElement;
  root.dataset.theme = saved === 'light' ? 'light' : 'dark';
  root.style.colorScheme = root.dataset.theme;
  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('theme-toggle');
    const update = () => {
      const dark = root.dataset.theme === 'dark';
      toggle.setAttribute('aria-checked', String(dark));
      toggle.setAttribute('aria-label', dark ? 'Dark mode enabled. Switch to light mode' : 'Light mode enabled. Switch to dark mode');
      document.getElementById('theme-current').textContent = dark ? 'Dark' : 'Light';
    };
    toggle.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.style.colorScheme = root.dataset.theme;
      try { localStorage.setItem(key, root.dataset.theme); } catch {}
      update();
    });
    update();
  });
})();
