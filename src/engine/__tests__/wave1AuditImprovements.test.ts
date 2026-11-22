import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTimelineChronicleData } from '../../components/timeline/timelineChronicleModel';
import {
  buildCommandSearchIndex,
  buildPersonDossierIndex,
  computeEraAnalyticalProfile,
  extractBranchesFromStore,
  extractRulersFromStore,
  getEnrichedEvents,
  resolveMacroEras,
  searchCommandIndex,
} from '../timelineEngine';
import type {
  CampaignPackRegistryEntry,
  SyncManifest,
  TimelineDataFile,
} from '../../types/timeline';

function loadFullCoreDataset() {
  const dataDir = path.resolve(process.cwd(), 'public/data');
  const manifest = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'sync.manifest.json'), 'utf8'),
  ) as SyncManifest;

  const filesMap: Record<string, TimelineDataFile> = {};
  for (const meta of manifest.mountedFiles) {
    if (meta.enabled === false) continue;
    const rel = meta.path.replace(/^data\//, '');
    filesMap[meta.path] = JSON.parse(
      fs.readFileSync(path.join(dataDir, rel), 'utf8'),
    ) as TimelineDataFile;
  }

  const branches = extractBranchesFromStore(manifest, filesMap);
  const rulers = extractRulersFromStore(manifest, filesMap);
  const enrichedEvents = getEnrichedEvents(manifest, filesMap, rulers);
  const resolvedEras = resolveMacroEras(manifest.macroEras);
  const { dossiers: personDossiers } = buildPersonDossierIndex(enrichedEvents, rulers);

  const campaignPacks: CampaignPackRegistryEntry[] = [
    {
      id: 'ww1',
      title: 'Первая мировая война: театры и кампании',
      shortTitle: 'Первая мировая',
      description: 'Восточный, Западный и Кавказский фронты 1914–1918 годов',
      yearFrom: 1914,
      yearTo: 1918,
      filePaths: [],
      branchIds: ['WW1_EASTERN_FRONT', 'WW1_WESTERN_FRONT'],
      eventCount: 31,
      branches: [],
    },
  ];

  return {
    manifest,
    branches,
    rulers,
    enrichedEvents,
    resolvedEras,
    personDossiers,
    campaignPacks,
  };
}

describe('Wave 1 Deep Audit Improvements (ADR-014)', () => {
  const dataset = loadFullCoreDataset();

  it('Command Search indexes all 5 categories and ranks exact year, ё/е, and title matches accurately', () => {
    const index = buildCommandSearchIndex({
      eras: dataset.resolvedEras,
      rulers: dataset.rulers,
      events: dataset.enrichedEvents,
      personDossiers: dataset.personDossiers,
      campaignPacks: dataset.campaignPacks,
      branches: dataset.branches,
    });

    expect(index.byCategory.eras.length).toBe(dataset.resolvedEras.length);
    expect(index.byCategory.rulers.length).toBe(dataset.rulers.length);
    expect(index.byCategory.events.length).toBe(dataset.enrichedEvents.length);
    expect(index.byCategory.people.length).toBeGreaterThan(100);
    expect(index.byCategory.campaigns.length).toBe(dataset.campaignPacks.length);

    // Empty query returns grouped preview across key categories
    const initialGroups = searchCommandIndex(index, '');
    expect(initialGroups.length).toBeGreaterThanOrEqual(3);

    // Year query finds 1812 Patriotic War
    const yearGroups = searchCommandIndex(index, '1812');
    const eventGroup = yearGroups.find((g) => g.category === 'events');
    expect(eventGroup).toBeDefined();
    expect(eventGroup!.items.some((i) => i.targetId === '1812-patriotic-war')).toBe(true);

    // Cyrillic ё/е normalization finds Пётр I when typing "петр"
    const rulerGroups = searchCommandIndex(index, 'петр i', { categoryFilter: 'rulers' });
    expect(rulerGroups).toHaveLength(1);
    expect(rulerGroups[0].items.some((i) => /п[её]тр\s+i/i.test(i.title))).toBe(true);

    // Category filter isolates results strictly to that category
    const peopleOnly = searchCommandIndex(index, 'пушкин', { categoryFilter: 'people' });
    expect(peopleOnly).toHaveLength(1);
    expect(peopleOnly[0].category).toBe('people');
    expect(peopleOnly[0].items.length).toBeGreaterThan(0);
  });

  it('computeEraAnalyticalProfile builds intensity buckets, causal turning points, and guided route with WeakMap caching', () => {
    const imperialEra = dataset.resolvedEras.find((e) => e.startYear >= 1700 && e.endYear <= 1920)
      ?? dataset.resolvedEras[0];
    const eraEvents = dataset.enrichedEvents.filter(
      (ev) => ev.endYear >= imperialEra.startYear && ev.startYear <= imperialEra.endYear,
    );

    const profileA = computeEraAnalyticalProfile(
      eraEvents,
      imperialEra.startYear,
      imperialEra.endYear,
      dataset.branches,
    );
    const profileB = computeEraAnalyticalProfile(
      eraEvents,
      imperialEra.startYear,
      imperialEra.endYear,
      dataset.branches,
    );

    // WeakMap returns identical cached reference for identical inputs
    expect(profileB).toBe(profileA);
    expect(profileA.buckets.length).toBeGreaterThanOrEqual(4);
    expect(profileA.buckets.length).toBeLessThanOrEqual(10);
    expect(profileA.turningPoints.length).toBeGreaterThan(0);
    expect(profileA.turningPoints.length).toBeLessThanOrEqual(6);

    // Turning points sorted descending by centrality score
    for (let i = 1; i < profileA.turningPoints.length; i += 1) {
      expect(profileA.turningPoints[i - 1].centralityScore).toBeGreaterThanOrEqual(
        profileA.turningPoints[i].centralityScore,
      );
    }

    // Guided route is chronological and bounded
    expect(profileA.guidedRouteEvents.length).toBeGreaterThanOrEqual(4);
    expect(profileA.guidedRouteEvents.length).toBeLessThanOrEqual(14);
    for (let i = 1; i < profileA.guidedRouteEvents.length; i += 1) {
      expect(profileA.guidedRouteEvents[i].startYear).toBeGreaterThanOrEqual(
        profileA.guidedRouteEvents[i - 1].startYear,
      );
    }
  });

  it('eliminates all orphan core events, fills all missing keyFigures, and provides >= 25 outcomesByScope nodes', () => {
    const orphans = dataset.enrichedEvents.filter((ev) => ev.explicitLinks.length === 0);
    expect(orphans.map((e) => e.id)).toEqual([]);

    const missingKeyFigures = dataset.enrichedEvents.filter(
      (ev) => !Array.isArray(ev.keyFigures) || ev.keyFigures.length === 0,
    );
    expect(missingKeyFigures.map((e) => e.id)).toEqual([]);

    const withOutcomesByScope = dataset.enrichedEvents.filter(
      (ev) => Boolean(ev.outcomesByScope?.russia && ev.outcomesByScope?.world),
    );
    expect(withOutcomesByScope.length).toBeGreaterThanOrEqual(25);
  });

  it('aligns Chronicle chapter assignment 100% with enriched event eraId across the entire corpus', () => {
    const chronicle = buildTimelineChronicleData({
      matchingEvents: dataset.enrichedEvents,
      matchingRulers: dataset.rulers,
      resolvedEras: dataset.resolvedEras,
      branches: dataset.branches,
      sphereFilter: 'all',
    });

    const resolvedEraIds = new Set(dataset.resolvedEras.map((e) => e.id));
    const mismatches: string[] = [];

    for (const chapter of chronicle.chapters) {
      for (const ev of chapter.events) {
        if (ev.eraId && resolvedEraIds.has(ev.eraId) && ev.eraId !== chapter.era.id) {
          mismatches.push(`${ev.id}: card=${ev.eraId} vs chapter=${chapter.era.id}`);
        }
      }
    }

    expect(mismatches).toEqual([]);
  });
});
