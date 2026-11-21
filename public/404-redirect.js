(function () {
  const home = document.querySelector('.fallback-link');
  if (!(home instanceof HTMLAnchorElement)) return;
  const target = new URL(home.href);
  const { location } = window;
  if (target.origin !== location.origin || location.pathname === target.pathname) return;
  target.search = location.search;
  target.hash = location.hash;
  location.replace(target.href);
})();
