import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildVersionedDataUrl,
  clearTimelineRepositoryCache,
  fetchTimelineRepository,
  hydrateRemainingTimelineModules,
  sanitizeBranchDefinition,
  sanitizeTimelineNode,
} from '../repository/timelineRepository';

describe('timelineRepository — cache busting, sanitization, progressive loader & manifest parity', () => {
  afterEach(() => {
    clearTimelineRepositoryCache();
    vi.restoreAllMocks();
  });

  it('builds content-hash URLs (?h=) when SHA-256 hash is available and falls back to ?v= otherwise', () => {
    expect(buildVersionedDataUrl('data/wars.json', 'a1b2c3d4e5f6', true)).toBe('./data/wars.json?h=a1b2c3d4e5f6');
    expect(buildVersionedDataUrl('/data/wars.json', '2.1.0', false)).toBe('./data/wars.json?v=2.1.0');
  });

  it('sanitizes branch definitions and rejects unsafe CSS badge classes / invalid hex colors', () => {
    const clean = sanitizeBranchDefinition(
      {
        id: 'TEST_BRANCH',
        label: 'Тестовая ветка',
        color: 'javascript:alert(1)',
        badgeClass: 'bg-red-500" onclick="alert(1)',
      },
      'data/test.json',
    );
    expect(clean).not.toBeNull();
    expect(clean?.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(clean?.badgeClass).not.toContain('onclick');
  });

  it('sanitizes timeline nodes and drops non-HTTPS source URLs to prevent javascript: XSS', () => {
    const node = sanitizeTimelineNode(
      {
        id: 'test-node-1',
        period: '1812',
        title: 'Отечественная война 1812 года',
        task: 'WAR_CONTINENTAL',
        sources: [
          { type: 'primary', citation: 'Валидный источник', url: 'https://example.org/doc' },
          { type: 'reference', citation: 'Опасная ссылка', url: 'javascript:alert(1)' },
          { type: 'document', citation: 'Небезопасный HTTP', url: 'http://insecure.example.org' },
        ],
      },
      'WAR_CONTINENTAL',
    );
    expect(node).not.toBeNull();
    expect(node?.sources).toHaveLength(3);
    expect(node?.sources?.[0].url).toBe('https://example.org/doc');
    expect(node?.sources?.[1].url).toBeUndefined();
    expect(node?.sources?.[2].url).toBeUndefined();
  });

  it('supports 2-phase progressive loading and on-demand hydration with content-hash URLs', async () => {
    const requestedUrls: string[] = [];

    const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.startsWith('./data/sync.manifest.json')) {
        return new Response(
          JSON.stringify({
            project: 'Test Atlas',
            schemaVersion: '2.1.0',
            mountedFiles: [
              { fileId: 'rulers', path: 'data/rulers.json', role: 'rulers_branch', branchIds: ['MAIN_RULERS'], title: 'Rulers', enabled: true },
              { fileId: 'arts_culture', path: 'data/arts_culture.json', role: 'thematic_branch', branchIds: ['ARTS_CULTURE'], title: 'Arts', enabled: true },
            ],
            macroEras: [],
            crossLinks: [],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (url.startsWith('./data/modules.index.json')) {
        return new Response(
          JSON.stringify({
            schemaVersion: '2.1.0',
            generatedAt: '2026-11-19T00:00:00Z',
            files: ['data/rulers.json', 'data/arts_culture.json'],
            fileHashes: {
              'data/rulers.json': 'hash_rulers_1',
              'data/arts_culture.json': 'hash_arts_2',
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (url.startsWith('./data/rulers.json')) {
        return new Response(
          JSON.stringify({
            fileId: 'rulers',
            path: 'data/rulers.json',
            branch: { id: 'MAIN_RULERS', label: 'Правители' },
            rulers: [{ id: 'r1', eraId: 'ERA_1', ruler: 'Рюрик', shortRuler: 'Рюрик', reignPeriod: '862–879', startYear: 862, endYear: 879, reignTitle: 'Княжение', reignThesis: 'Тезис' }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (url.startsWith('./data/arts_culture.json')) {
        return new Response(
          JSON.stringify({
            fileId: 'arts_culture',
            path: 'data/arts_culture.json',
            branch: { id: 'ARTS_CULTURE', label: 'Искусство' },
            nodes: [{ id: 'art-1', period: '1870', title: 'Передвижники', task: 'ARTS_CULTURE' }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('Not found', { status: 404 });
    });

    vi.stubGlobal('fetch', mockFetch);

    // Phase 1: only core module (rulers.json) is fetched initially
    const phase1 = await fetchTimelineRepository({ progressive: true });
    expect(phase1.isFullyHydrated).toBe(false);
    expect(Object.keys(phase1.files)).toEqual(['data/rulers.json']);
    expect(requestedUrls).toContain('./data/rulers.json?h=hash_rulers_1');
    expect(requestedUrls.some((u) => u.includes('arts_culture.json'))).toBe(false);

    // Phase 2: remaining module hydrated lazily with its content hash
    const phase2 = await hydrateRemainingTimelineModules();
    expect(phase2?.isFullyHydrated).toBe(true);
    expect(Object.keys(phase2?.files ?? {}).sort()).toEqual(['data/arts_culture.json', 'data/rulers.json']);
    expect(requestedUrls).toContain('./data/arts_culture.json?h=hash_arts_2');
  });

  it('mounts 100% of disk JSON modules in public/data/sync.manifest.json without drift', () => {
    const dataDir = path.resolve(process.cwd(), 'public/data');
    const manifest = JSON.parse(fs.readFileSync(path.join(dataDir, 'sync.manifest.json'), 'utf8')) as {
      mountedFiles: Array<{ path: string }>;
    };
    const diskFiles = fs
      .readdirSync(dataDir)
      .filter((f) => f.endsWith('.json') && f !== 'sync.manifest.json' && f !== 'modules.index.json')
      .map((f) => `data/${f}`)
      .sort();
    const mountedPaths = manifest.mountedFiles.map((m) => m.path).sort();
    expect(mountedPaths).toEqual(diskFiles);
  });
});
