import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTimelineModuleIndex } from '../../../scripts/buildTimelineModuleIndex';
import {
  clearTimelineRepositoryCache,
  fetchTimelineRepository,
} from '../../engine/repository/timelineRepository';
import {
  buildPersonDossierIndex,
  computePeriodComparison,
  extractBranchesFromStore,
  extractRulersFromStore,
  findMacroEraForYear,
  getCustomWindowSummaryData,
  getEnrichedEvents,
  getMacroEraSummaryData,
  getRulerPeriodSummaryData,
  resolveMacroEras,
} from '../../engine/timelineEngine';
import {
  formatCardToMarkdown,
  formatComparisonReportToMarkdown,
  formatEraDossierToMarkdown,
  formatPersonDossierToMarkdown,
  formatRulerDossierToMarkdown,
  formatWindowDossierToMarkdown,
  sanitizeMarkdownFilename,
} from '../markdownExport';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

function createPublicFetchMock() {
  const index = buildTimelineModuleIndex(PUBLIC_DIR);

  const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
    const rawUrl = typeof input === 'string' ? input : input.toString();
    const cleaned = rawUrl.split('?')[0].replace(/^\.\//, '').replace(/^\/+/, '');

    if (cleaned === 'data/modules.index.json') {
      return new Response(JSON.stringify(index), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const fullPath = path.join(PUBLIC_DIR, cleaned);
    if (!fs.existsSync(fullPath)) {
      return new Response('Not found', { status: 404 });
    }
    const body = fs.readFileSync(fullPath, 'utf8');
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  return { mockFetch };
}

afterEach(() => {
  clearTimelineRepositoryCache();
  vi.unstubAllGlobals();
});

describe('markdownExport — filename sanitization and full Markdown serialization', () => {
  it('sanitizes Russian and mixed filenames into safe ASCII .md names', () => {
    expect(sanitizeMarkdownFilename('1914-ww1-Первая мировая война')).toBe(
      '1914-ww1-pervaya-mirovaya-voyna.md',
    );
    expect(sanitizeMarkdownFilename('  Пётр I / Северная война: 1700–1721.md  ')).toBe(
      'pyotr-i-severnaya-voyna-1700-1721.md',
    );
    expect(sanitizeMarkdownFilename('***')).toBe('historical-atlas-export.md');
  });

  it('exports full event card, ruler, era, window, person, and comparison dossiers to clean Markdown', async () => {
    const { mockFetch } = createPublicFetchMock();
    vi.stubGlobal('fetch', mockFetch);

    const snap = await fetchTimelineRepository({
      progressive: false,
      target: { campaignId: 'ww1' },
    });
    const branches = extractBranchesFromStore(snap.manifest, snap.files);
    const rulers = extractRulersFromStore(snap.manifest, snap.files);
    const enriched = getEnrichedEvents(snap.manifest, snap.files, rulers);
    const { dossiers } = buildPersonDossierIndex(enriched, rulers);
    const resolvedEras = resolveMacroEras(snap.manifest.macroEras);
    const branchById = new Map(branches.map((b) => [b.id, b]));
    const eventById = new Map(enriched.map((ev) => [ev.id, ev]));
    const fixedDate = new Date('2026-11-22T12:00:00Z');

    // 1. Global WWI event card (outcomesByScope + subEvents + links + sources + citation)
    const ww1Card = enriched.find((e) => e.id === '1914-ww1')!;
    const ww1Branch = branchById.get(ww1Card.task) ?? null;
    const ww1Parent = ww1Branch?.parentBranchId ? branchById.get(ww1Branch.parentBranchId) ?? null : null;
    const ww1Md = formatCardToMarkdown({
      card: ww1Card,
      branch: ww1Branch,
      parentBranch: ww1Parent,
      era: findMacroEraForYear(ww1Card.startYear, resolvedEras),
      branches,
      allEventsById: eventById,
      now: fixedDate,
    });
    expect(ww1Md.filename).toMatch(/^1914-ww1-.*\.md$/);
    expect(ww1Md.content).toContain(`# ${ww1Card.title}`);
    expect(ww1Md.content).toContain('## Паспорт');
    expect(ww1Md.content).toContain('## Ключевые этапы и вехи');
    expect(ww1Md.content).toContain('### Для России');
    expect(ww1Md.content).toContain('### Для мира');
    expect(ww1Md.content).toContain('## Источники и библиография');
    expect(ww1Md.content).toContain('?card=1914-ww1');

    // 2. Campaign operation card (operationProfile)
    const marneCard = enriched.find((e) => e.id === 'ww1-fr-marne')!;
    const marneMd = formatCardToMarkdown({
      card: marneCard,
      branch: branchById.get(marneCard.task) ?? null,
      branches,
      allEventsById: eventById,
      now: fixedDate,
    });
    expect(marneMd.content).toContain('## Операционный паспорт');
    expect(marneMd.content).toContain('### Стороны и командование');

    // 3. Ruler dossier
    const peterRuler = rulers.find((r) => r.id === 'peter1') ?? rulers[0];
    const rulerSummary = getRulerPeriodSummaryData(peterRuler, enriched, branches, dossiers, rulers);
    const rulerMd = formatRulerDossierToMarkdown(rulerSummary, branches, fixedDate);
    expect(rulerMd.filename).toMatch(/^ruler-.*\.md$/);
    expect(rulerMd.content).toContain(`# ${peterRuler.ruler}`);
    expect(rulerMd.content).toContain('## Паспорт правления');
    expect(rulerMd.content).toContain(`?ruler=${peterRuler.id}`);

    // 4. Macro-era dossier
    const eraSummary = getMacroEraSummaryData(resolvedEras[0], rulers, enriched, branches, dossiers);
    const eraMd = formatEraDossierToMarkdown(eraSummary, branches, {
      includeCampaignDetails: false,
      now: fixedDate,
    });
    expect(eraMd.filename).toMatch(/^era-.*\.md$/);
    expect(eraMd.content).toContain(`# ${resolvedEras[0].title}`);
    expect(eraMd.content).toContain('## Сводка макро-периода');
    expect(eraMd.content).toContain('## События по сферам');
    expect(eraMd.content).toContain(`?era=${resolvedEras[0].id}`);

    // 5. Custom window dossier
    const windowSummary = getCustomWindowSummaryData(
      1914,
      1918,
      rulers,
      enriched,
      branches,
      snap.manifest.macroEras,
      dossiers,
    );
    const windowMd = formatWindowDossierToMarkdown(windowSummary, branches, {
      includeCampaignDetails: true,
      now: fixedDate,
    });
    expect(windowMd.filename).toBe('window-1914-1918.md');
    expect(windowMd.content).toContain('# Сводный срез периода 1914–1918 гг.');
    expect(windowMd.content).toContain('с учётом детальных операций загруженных кампаний');
    expect(windowMd.content).toContain('?window=1914-1918');

    // 6. Person dossier
    const firstDossier = Array.from(dossiers.values())[0];
    const personMd = formatPersonDossierToMarkdown(firstDossier, branches, fixedDate);
    expect(personMd.filename).toMatch(/^person-.*\.md$/);
    expect(personMd.content).toContain(`# ${firstDossier.displayName}`);
    expect(personMd.content).toContain('## Паспорт деятеля');
    expect(personMd.content).toContain(`?person=${encodeURIComponent(firstDossier.key)}`);

    // 7. Comparison report
    const comparison = computePeriodComparison(
      { kind: 'window', from: 1700, to: 1725 },
      { kind: 'window', from: 1914, to: 1918 },
      rulers,
      enriched,
      branches,
      snap.manifest.macroEras,
      dossiers,
    );
    expect(comparison).not.toBeNull();
    const compareMd = formatComparisonReportToMarkdown(comparison!);
    expect(compareMd.filename).toBe('compare-1700-1725-vs-1914-1918.md');
    expect(compareMd.content).toContain('## Сводные показатели');
    expect(compareMd.content).toContain('## Сравнение по 5 сферам событий');
  });
});
