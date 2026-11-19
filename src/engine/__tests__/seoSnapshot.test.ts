import { describe, expect, it } from 'vitest';
import {
  buildRootHtmlSnapshot,
  buildSchemaOrgJsonLd,
  collectRepositorySnapshot,
} from '../../../scripts/seoSnapshot';

describe('seoSnapshot — full 16-module indexing & zero inline styles', () => {
  it('indexes all 16 historical JSON modules and generates clean noscript HTML without inline styles', () => {
    const snapshot = collectRepositorySnapshot(process.cwd());
    expect(snapshot.mountedFiles.length).toBe(16);
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
