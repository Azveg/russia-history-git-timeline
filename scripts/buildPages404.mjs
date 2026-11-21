/** @param {string} html @param {string} siteUrl */
export function buildPages404(html, siteUrl) {
  const directory = siteUrl ? new URL(siteUrl).pathname.replace(/^\/+|\/+$/g, '') : '';
  const base = directory ? `/${directory}/` : '/';
  const escapeAttribute = (/** @type {string} */ value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return html
    .replace('href="/404.css"', () => `href="${escapeAttribute(base + '404.css')}"`)
    .replace('src="/404-redirect.js"', () => `src="${escapeAttribute(base + '404-redirect.js')}"`)
    .replace('href="/"', () => `href="${escapeAttribute(base)}"`);
}
