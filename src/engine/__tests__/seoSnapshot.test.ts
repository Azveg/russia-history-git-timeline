import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { buildTimelineModuleIndex } from '../../../scripts/buildTimelineModuleIndex';
import { buildPages404 } from '../../../scripts/buildPages404.mjs';
import { describe, expect, it } from 'vitest';
import {
  buildRootHtmlSnapshot,
  buildSchemaOrgJsonLd,
  collectRepositorySnapshot,
} from '../../../scripts/seoSnapshot';

describe('seoSnapshot — full 23-module indexing & zero inline styles', () => {
  it('indexes all 23 historical JSON modules and generates clean noscript HTML without inline styles', () => {
    const snapshot = collectRepositorySnapshot(process.cwd());
    expect(snapshot.mountedFiles.length).toBe(23);
    expect(snapshot.rulers.length).toBeGreaterThanOrEqual(70);
    expect(snapshot.events.length).toBeGreaterThan(250);

    const html = buildRootHtmlSnapshot(snapshot);
    expect(html).not.toMatch(/\sstyle="/i);
    expect(html).toContain('class="seo-noscript-snapshot"');
  });

  it('escapes closing script sequences in Schema.org JSON-LD and avoids staging URLs when siteUrl is empty', () => {
    const snapshot = collectRepositorySnapshot(process.cwd());
    const jsonLd = buildSchemaOrgJsonLd(snapshot, 'https://example.org/atlas');
    expect(jsonLd).not.toContain('</script>');
    expect(jsonLd).toContain('https://example.org/atlas/');
  });
});

describe('published corpus and nested Pages routes', () => {
  it('keeps discovery, visibility and link lookups consistent for nested files', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chronograph-data-'));
    try {
      const data = path.join(root, 'public/data');
      fs.mkdirSync(path.join(data, 'nested'), { recursive: true });
      const node = { id: 'sample', title: 'Sample', task: 'SAMPLE', startYear: 1812, endYear: 1812, period: '1812' };
      fs.writeFileSync(path.join(data, 'nested/open.json'), JSON.stringify({
        branch: { id: 'SAMPLE', label: 'Sample' },
        nodes: [{ ...node, linksTo: [{ targetId: 'file-disabled' }] }],
      }));
      fs.writeFileSync(path.join(data, 'file-disabled.json'), JSON.stringify({
        enabled: false, nodes: [{ ...node, id: 'file-disabled' }],
      }));
      fs.writeFileSync(path.join(data, 'manifest-disabled.json'), JSON.stringify({
        nodes: [{ ...node, id: 'manifest-disabled' }],
      }));
      fs.writeFileSync(path.join(data, 'sync.manifest.json'), JSON.stringify({
        schemaVersion: '2.1.0',
        mountedFiles: [{ path: 'data/manifest-disabled.json', enabled: false }],
        macroEras: [], crossLinks: [{ id: 'hidden', from: 'sample', to: 'manifest-disabled', label: 'Hidden' }],
      }));
      const snapshot = collectRepositorySnapshot(root);
      const index = buildTimelineModuleIndex(path.join(root, 'public'));
      expect(index.files).toEqual(['data/nested/open.json']);
      expect(index.disabledFiles).toEqual(['data/file-disabled.json', 'data/manifest-disabled.json']);
      expect(index.cardModules).toEqual({ sample: 'data/nested/open.json' });
      expect(snapshot.events.map(({ id }) => id)).toEqual(['sample']);
      expect(snapshot.totalLinks).toBe(0);
    } finally {
      fs.rmSync(root, { force: true, recursive: true });
    }
  });

  it('keeps 404 assets and home available from nested project and custom domain URLs', () => {
    const template = fs.readFileSync('public/404.html', 'utf8');
    const script = fs.readFileSync('public/404-redirect.js', 'utf8');
    for (const base of ['https://host.github.io/repo', 'https://custom.example']) {
      const html = buildPages404(template, base);
      const assets = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
      const missingPage = new URL(base + '/x/y?card=sample#part');
      expect(assets.map((asset) => new URL(asset, missingPage).href)).toEqual([
        base + '/404.css', base + '/404-redirect.js', base + '/',
      ]);
      let redirected = '';
      class Anchor { href = new URL(assets[2], missingPage).href; }
      runInNewContext(script, {
        URL, HTMLAnchorElement: Anchor, document: { querySelector: () => new Anchor() },
        window: { location: { ...missingPage, origin: missingPage.origin, pathname: missingPage.pathname,
          search: missingPage.search, hash: missingPage.hash, replace: (href: string) => { redirected = href; } } },
      });
      expect(redirected).toBe(base + '/?card=sample#part');
    }
  });
});
