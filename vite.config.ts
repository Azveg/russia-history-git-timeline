import { buildTimelineModuleIndex } from './scripts/buildTimelineModuleIndex.ts';
import { buildPages404 } from './scripts/buildPages404.mjs';
import fs from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig, type Plugin} from 'vite';
import {
  buildLlmsTxt,
  buildRootHtmlSnapshot,
  buildSchemaOrgJsonLd,
  collectRepositorySnapshot,
} from './scripts/seoSnapshot.ts';

function resolveBuildSiteUrl(): string {
  const raw = (process.env.VITE_SITE_URL || process.env.SITE_URL || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim()
    .replace(/\/+$/, '');
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return '';
    }
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function timelineDataModulesIndex(): Plugin {
  const rootDir = process.cwd();
  return {
    name: 'timeline-data-modules-index',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const cleanUrl = req.url?.split('?')[0] ?? '';
        if (cleanUrl === '/data/modules.index.json' || cleanUrl.endsWith('/data/modules.index.json')) {
          const payload = JSON.stringify(buildTimelineModuleIndex(path.join(rootDir, 'public')));
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(payload);
          return;
        }
        next();
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'data/modules.index.json',
        source: JSON.stringify(buildTimelineModuleIndex(path.join(rootDir, 'public'))),
      });
    },
  };
}

function timelineSeoSnapshotPlugin(): Plugin {
  const rootDir = process.cwd();
  return {
    name: 'timeline-seo-snapshot',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const cleanUrl = req.url?.split('?')[0] ?? '';
        if (cleanUrl === '/llms.txt' || cleanUrl.endsWith('/llms.txt')) {
          const snapshot = collectRepositorySnapshot(rootDir);
          const payload = buildLlmsTxt(snapshot, resolveBuildSiteUrl());
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(payload);
          return;
        }
        next();
      });
    },
    generateBundle() {
      const snapshot = collectRepositorySnapshot(rootDir);
      const siteUrl = resolveBuildSiteUrl();
      this.emitFile({
        type: 'asset',
        fileName: 'llms.txt',
        source: buildLlmsTxt(snapshot, siteUrl),
      });

      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: buildPages404(fs.readFileSync(path.join(rootDir, 'public/404.html'), 'utf8'), siteUrl),
      });

      if (siteUrl) {
        const lastmod = new Date().toISOString().slice(0, 10);
        this.emitFile({
          type: 'asset',
          fileName: 'robots.txt',
          source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
        });
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            '  <url>',
            `    <loc>${siteUrl}/</loc>`,
            `    <lastmod>${lastmod}</lastmod>`,
            '    <changefreq>weekly</changefreq>',
            '    <priority>1.0</priority>',
            '  </url>',
            '</urlset>',
            '',
          ].join('\n'),
        });
      }
    },
    transformIndexHtml(html) {
      const snapshot = collectRepositorySnapshot(rootDir);
      const siteUrl = resolveBuildSiteUrl();
      const jsonLd = buildSchemaOrgJsonLd(snapshot, siteUrl);
      const rootSnapshot = buildRootHtmlSnapshot(snapshot);
      const dynamicDescription = `Интерактивный Git-граф истории (${snapshot.minYear}–${snapshot.maxYear}): ${snapshot.branches.length} ветвей, ${snapshot.rulers.length} правлений и ${snapshot.events.length} событий — войны, реформы, дипломатия, наука, искусство и литература.`;

      let nextHtml = html.replace(
        /Интерактивный Git-граф истории \(\d+–\d+\): синхронное изучение правлений, войн, реформ, дипломатии, науки, культуры и литературы\./g,
        dynamicDescription,
      );

      if (siteUrl) {
        nextHtml = nextHtml.replace(/content="\.\/og-image\.png"/g, `content="${siteUrl}/og-image.png"`);
        if (!nextHtml.includes('rel="canonical"')) {
          nextHtml = nextHtml.replace(
            '</head>',
            `    <link rel="canonical" href="${siteUrl}/" />\n    <meta property="og:url" content="${siteUrl}/" />\n    <meta name="twitter:url" content="${siteUrl}/" />\n  </head>`,
          );
        }
      }

      if (!nextHtml.includes('application/ld+json')) {
        nextHtml = nextHtml.replace(
          '</head>',
          `    <script type="application/ld+json">\n${jsonLd}\n    </script>\n  </head>`,
        );
      }

      nextHtml = nextHtml.replace(
        '<!--SEO_NOSCRIPT_SNAPSHOT-->',
        `<noscript>\n${rootSnapshot}\n    </noscript>`,
      );

      return nextHtml;
    },
  };
}

function sanitizePublicArtifactsPlugin(isDevServer: boolean): Plugin {
  const rootDir = process.cwd();
  const forbiddenDirs = [
    path.resolve(rootDir, 'public/assets/aistudio'),
    path.resolve(rootDir, 'dist/assets/aistudio'),
  ];

  const purgeForbiddenDirs = () => {
    for (const dir of forbiddenDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, {recursive: true, force: true});
      }
    }
    const publicAssetsDir = path.resolve(rootDir, 'public/assets');
    if (fs.existsSync(publicAssetsDir) && fs.readdirSync(publicAssetsDir).length === 0) {
      fs.rmdirSync(publicAssetsDir);
    }
  };

  return {
    name: 'sanitize-public-artifacts',
    buildStart() {
      purgeForbiddenDirs();
    },
    transformIndexHtml(html) {
      const cspMatch = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
      if (!cspMatch) {
        throw new Error('[AppSec Guard] Missing <meta http-equiv="Content-Security-Policy"> in index.html');
      }
      const csp = cspMatch[1];
      if (!csp.includes("connect-src 'self'") || !csp.includes("object-src 'none'")) {
        throw new Error('[AppSec Guard] CSP meta directive in index.html is missing required core restrictions');
      }
      if (/script-src[^;]*'unsafe-inline'/i.test(csp) || /script-src[^;]*'unsafe-eval'/i.test(csp)) {
        throw new Error('[AppSec Guard] Forbidden unsafe-inline/unsafe-eval in CSP script-src directive');
      }
      if (/img-src[^;]*\bhttps:/i.test(csp)) {
        throw new Error('[AppSec Guard] Overly broad img-src https: directive is forbidden in CSP');
      }
      if (html.includes('fonts.googleapis.com') || html.includes('fonts.gstatic.com')) {
        throw new Error('[AppSec Guard] External Google Fonts CDN is forbidden; use self-hosted @fontsource packages');
      }
      if (!html.includes('name="referrer"') || !html.includes('strict-origin-when-cross-origin')) {
        throw new Error('[AppSec Guard] Missing <meta name="referrer" content="strict-origin-when-cross-origin"> in index.html');
      }

      // In local Vite dev server only, allow @vitejs/plugin-react inline Refresh preamble; production dist/ stays strictly script-src 'self'.
      if (isDevServer) {
        return html.replace(/script-src 'self';/i, "script-src 'self' 'unsafe-inline';");
      }
      return html;
    },
    closeBundle() {
      purgeForbiddenDirs();
    },
  };
}

export default defineConfig(({command}) => {
  const isDevServer = command === 'serve';
  return {
    base: './',
    build: {
      emptyOutDir: true,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'react-vendor',
                priority: 30,
                test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              },
              {
                name: 'icons-vendor',
                priority: 20,
                test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              },
              {
                name: 'timeline-engine',
                priority: 10,
                test: /[\\/]src[\\/]engine[\\/]/,
              },
            ],
          },
        },
      },
    },
    plugins: [
      sanitizePublicArtifactsPlugin(isDevServer),
      react(),
      tailwindcss(),
      timelineDataModulesIndex(),
      timelineSeoSnapshotPlugin(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
