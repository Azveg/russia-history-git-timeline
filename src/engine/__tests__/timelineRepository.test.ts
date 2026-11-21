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

const manifestPath = 'data/sync.manifest.json';
const indexPath = 'data/modules.index.json';
const artsPath = 'data/arts_culture.json';
const readDataFile = (file: string) => fs.readFileSync(path.resolve('public', file), 'utf8');
const realManifest = JSON.parse(readDataFile(manifestPath)) as {
  mountedFiles: Array<{ path: string; enabled: boolean }>;
};
const modulePaths = realManifest.mountedFiles.map(({ path }) => path);

function mockDataRequests(
  override: (file: string) => Response | Promise<Response> | undefined = () => undefined,
) {
  const fetchData = vi.fn(async (input: RequestInfo | URL, _options?: RequestInit) => {
    const file = String(input).replace(/^\.\//, '').split('?')[0];
    const response = override(file);
    if (response) return response;
    if (file === indexPath) {
      return Response.json({ files: modulePaths, fileHashes: { [artsPath]: 'hash-arts' } });
    }
    return new Response(readDataFile(file), { headers: { 'content-type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchData);
  return fetchData;
}

describe('timelineRepository — cache busting, sanitization, progressive loader & manifest parity', () => {
  afterEach(() => {
    clearTimelineRepositoryCache();
    vi.unstubAllGlobals();
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
    expect(phase1.missingModulePaths).toEqual([artsPath]);
    expect(phase1.failedModulePaths).toEqual([]);
    expect(Object.keys(phase1.files)).toEqual(['data/rulers.json']);
    expect(requestedUrls).toContain('./data/rulers.json?h=hash_rulers_1');
    expect(requestedUrls.some((u) => u.includes('arts_culture.json'))).toBe(false);

    // Phase 2: remaining module hydrated lazily with its content hash
    const phase2 = await hydrateRemainingTimelineModules();
    expect(phase2?.isFullyHydrated).toBe(true);
    expect(Object.keys(phase2?.files ?? {}).sort()).toEqual(['data/arts_culture.json', 'data/rulers.json']);
    expect(requestedUrls).toContain('./data/arts_culture.json?h=hash_arts_2');
  });

  it.each([
    { progressive: true, failAll: false },
    { progressive: false, failAll: false },
    { progressive: true, failAll: true },
    { progressive: false, failAll: true },
  ])('recovers from HTTP failures (progressive: $progressive, all modules: $failAll)', async ({ progressive, failAll }) => {
    const unavailable = failAll ? modulePaths : [artsPath];
    let online = false;
    const fetchData = mockDataRequests((file) =>
      !online && unavailable.includes(file) ? new Response(null, { status: 503 }) : undefined,
    );

    const initial = await fetchTimelineRepository({ progressive });
    const partial = progressive ? await hydrateRemainingTimelineModules() : initial;

    expect(partial?.isFullyHydrated).toBe(false);
    expect(partial?.missingModulePaths).toEqual(unavailable);
    expect(partial?.failedModulePaths).toEqual(unavailable);
    expect(Object.keys(partial?.files ?? {})).toHaveLength(modulePaths.length - unavailable.length);

    online = true;
    fetchData.mockClear();
    const [first, second] = await Promise.all([
      hydrateRemainingTimelineModules({ priority: true }),
      fetchTimelineRepository({ progressive: false }),
    ]);

    expect(first).toBe(second);
    expect(first?.isFullyHydrated).toBe(true);
    expect(first?.missingModulePaths).toEqual([]);
    expect(first?.failedModulePaths).toEqual([]);
    expect(Object.keys(first?.files ?? {})).toHaveLength(modulePaths.length);
    expect(fetchData).toHaveBeenCalledTimes(unavailable.length);
    expect(fetchData).toHaveBeenCalledWith('./data/arts_culture.json?h=hash-arts', { cache: 'reload' });
  });

  it.each([
    ['HTML', () => new Response('<p>Unavailable</p>', { headers: { 'content-type': 'text/html' } })],
    ['invalid JSON', () => new Response('{', { headers: { 'content-type': 'application/json' } })],
    ['wrong module shape', () => Response.json({ rulers: [] })],
  ] as const)('reports %s in place of a thematic file as a missed module', async (_case, badResponse) => {
    mockDataRequests((file) => file === artsPath ? badResponse() : undefined);
    const result = await fetchTimelineRepository({ progressive: false });
    expect(result.isFullyHydrated).toBe(false);
    expect(result.failedModulePaths).toEqual([artsPath]);
    expect(result.files[artsPath]).toBeUndefined();
  });

  it('waits for full data when a complete request joins a progressive initial request', async () => {
    const fetchData = mockDataRequests();
    const [partial, full] = await Promise.all([
      fetchTimelineRepository({ progressive: true }),
      fetchTimelineRepository({ progressive: false }),
    ]);
    expect(Object.keys(partial.files)).toHaveLength(4);
    expect(full.isFullyHydrated).toBe(true);
    expect(Object.keys(full.files)).toHaveLength(modulePaths.length);
    expect(fetchData).toHaveBeenCalledTimes(modulePaths.length + 2);
  });

  it('loads enabled manifest modules missing from the index and skips explicitly disabled modules', async () => {
    const disabledPath = 'data/wars.json';
    const fetchData = mockDataRequests((file) => {
      if (file === indexPath) return Response.json({ files: modulePaths.filter((path) => path !== artsPath) });
      if (file === manifestPath) {
        return Response.json({
          ...realManifest,
          mountedFiles: realManifest.mountedFiles.map((meta) =>
            meta.path === disabledPath ? { ...meta, enabled: false } : meta,
          ),
        });
      }
    });

    const result = await fetchTimelineRepository();
    expect(result.isFullyHydrated).toBe(true);
    expect(result.files[artsPath]).toBeDefined();
    expect(result.manifest.mountedFiles.find((meta) => meta.path === disabledPath)?.enabled).toBe(false);
    expect(fetchData.mock.calls.some(([url]) => String(url).startsWith('./data/wars.json?'))).toBe(false);
  });

  it('keeps the refreshed cache after an older hydration request finishes', async () => {
    let finishOldRequest: (response: Response) => void = () => undefined;
    const oldResponse = new Promise<Response>((resolve) => { finishOldRequest = resolve; });
    let holdArts = true;
    mockDataRequests((file) => file === artsPath && holdArts ? oldResponse : undefined);
    await fetchTimelineRepository({ progressive: true });
    const oldHydration = hydrateRemainingTimelineModules({ priority: true });
    holdArts = false;
    const fresh = await fetchTimelineRepository({ forceRefresh: true });
    finishOldRequest(new Response(null, { status: 503 }));

    expect((await oldHydration)?.failedModulePaths).toEqual([artsPath]);
    expect(fresh.isFullyHydrated).toBe(true);
    expect(await fetchTimelineRepository()).toBe(fresh);
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
