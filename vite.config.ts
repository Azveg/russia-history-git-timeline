import fs from 'fs';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig, type Plugin} from 'vite';
import {
  buildLlmsTxt,
  buildRootHtmlSnapshot,
  buildSchemaOrgJsonLd,
  collectRepositorySnapshot,
} from './scripts/seoSnapshot.ts';

function scanDataModules(rootDir: string): string[] {
  const dataDir = path.resolve(rootDir, 'public/data');
  if (!fs.existsSync(dataDir)) {
    return [];
  }

  const results: string[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, {withFileTypes: true});
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        if (entry.name === 'sync.manifest.json' || entry.name === 'modules.index.json') {
          continue;
        }
        const relFromPublic = path.relative(path.resolve(rootDir, 'public'), fullPath).replace(/\\/g, '/');
        results.push(relFromPublic);
      }
    }
  }

  walk(dataDir);
  return results.sort((a, b) => a.localeCompare(b));
}

function resolveBuildSiteUrl(): string {
  return (process.env.VITE_SITE_URL || process.env.SITE_URL || process.env.APP_URL || '')
    .trim()
    .replace(/\/+$/, '');
}

function timelineDataModulesIndex(): Plugin {
  const rootDir = process.cwd();
  return {
    name: 'timeline-data-modules-index',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const cleanUrl = req.url?.split('?')[0] ?? '';
        if (cleanUrl === '/data/modules.index.json' || cleanUrl.endsWith('/data/modules.index.json')) {
          const payload = JSON.stringify(
            {
              generatedAt: new Date().toISOString(),
              files: scanDataModules(rootDir),
            },
            null,
            2,
          );
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
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
        source: JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            files: scanDataModules(rootDir),
          },
          null,
          2,
        ),
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
      this.emitFile({
        type: 'asset',
        fileName: 'llms.txt',
        source: buildLlmsTxt(snapshot, resolveBuildSiteUrl()),
      });
    },
    transformIndexHtml(html) {
      const snapshot = collectRepositorySnapshot(rootDir);
      const siteUrl = resolveBuildSiteUrl();
      const jsonLd = buildSchemaOrgJsonLd(snapshot, siteUrl);
      const rootSnapshot = buildRootHtmlSnapshot(snapshot);

      let nextHtml = html;

      if (siteUrl) {
        nextHtml = nextHtml.replace(/content="\.\/og-image\.png"/g, `content="${siteUrl}/og-image.png"`);
        if (!nextHtml.includes('rel="canonical"')) {
          nextHtml = nextHtml.replace(
            '</head>',
            `    <link rel="canonical" href="${siteUrl}/" />\n    <meta property="og:url" content="${siteUrl}/" />\n  </head>`,
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
        /<div id="root">\s*<\/div>/,
        `<div id="root">\n${rootSnapshot}\n    </div>`,
      );

      return nextHtml;
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), timelineDataModulesIndex(), timelineSeoSnapshotPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
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
