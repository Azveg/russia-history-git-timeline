(function () {
  var loc = window.location;
  var segments = loc.pathname.split('/').filter(Boolean);
  // Support both custom domain root (/) and GitHub Pages project subpath (/<repo>/)
  var isGithubPagesProject =
    /\.github\.io$/i.test(loc.hostname) && segments.length > 0;
  var targetPath = isGithubPagesProject ? '/' + segments[0] + '/' : '/';

  if (loc.pathname !== targetPath) {
    loc.replace(loc.origin + targetPath + loc.search + loc.hash);
  }
})();
