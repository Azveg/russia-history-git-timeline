import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ERA_SPHERE_ORDER,
  buildEraJumpEntries,
  buildTimelineChronicleData,
  stepEventId,
} from '../../components/timeline/timelineChronicleModel';
import {
  buildUnifiedTimelineStream,
  computeBranchPresetMap,
  extractBranchesFromStore,
  extractRulersFromStore,
  getEnrichedEvents,
  getVisibleLanes,
  resolveMacroEras,
} from '../timelineEngine';
import type { SyncManifest, TimelineDataFile } from '../../types/timeline';

function loadRealDataset() {
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
  return { manifest, branches, rulers, enrichedEvents, resolvedEras };
}

describe('timelineChronicleModel — chapter grouping, sphere filtering, era jumps & stepping', () => {
  const dataset = loadRealDataset();

  it('groups events into macro-era chapters with consistent 5-sphere totals', () => {
    const windowEvents = dataset.enrichedEvents.filter(
      (ev) => ev.startYear <= 1917 && ev.endYear >= 1700,
    );
    const windowRulers = dataset.rulers.filter(
      (r) => r.startYear <= 1917 && r.endYear >= 1700,
    );

    const allData = buildTimelineChronicleData({
      matchingEvents: windowEvents,
      matchingRulers: windowRulers,
      resolvedEras: dataset.resolvedEras,
      branches: dataset.branches,
      sphereFilter: 'all',
    });

    expect(allData.chapters.length).toBeGreaterThanOrEqual(2);
    expect(allData.totalMatchingEvents).toBe(windowEvents.length);

    const sphereSum = ERA_SPHERE_ORDER.reduce(
      (acc, sphereId) => acc + allData.sphereTotals[sphereId],
      0,
    );
    expect(sphereSum).toBe(windowEvents.length);

    // Every chapter has non-empty events, sorted chronologically, and orderedEventIds matches concatenation
    const flattenedIds = allData.chapters.flatMap((ch) => ch.events.map((e) => e.id));
    expect(allData.orderedEventIds).toEqual(flattenedIds);
    expect(flattenedIds.length).toBe(windowEvents.length);

    for (const chapter of allData.chapters) {
      expect(chapter.events.length).toBeGreaterThan(0);
      for (let i = 1; i < chapter.events.length; i += 1) {
        expect(chapter.events[i].startYear).toBeGreaterThanOrEqual(
          chapter.events[i - 1].startYear,
        );
      }
    }
  });

  it('filters chapters cleanly by each of the 5 historical spheres', () => {
    const windowEvents = dataset.enrichedEvents.filter(
      (ev) => ev.startYear <= 1917 && ev.endYear >= 1700,
    );
    const windowRulers = dataset.rulers.filter(
      (r) => r.startYear <= 1917 && r.endYear >= 1700,
    );

    const baseData = buildTimelineChronicleData({
      matchingEvents: windowEvents,
      matchingRulers: windowRulers,
      resolvedEras: dataset.resolvedEras,
      branches: dataset.branches,
      sphereFilter: 'all',
    });

    for (const sphereId of ERA_SPHERE_ORDER) {
      const filtered = buildTimelineChronicleData({
        matchingEvents: windowEvents,
        matchingRulers: windowRulers,
        resolvedEras: dataset.resolvedEras,
        branches: dataset.branches,
        sphereFilter: sphereId,
      });
      expect(filtered.orderedEventIds.length).toBe(baseData.sphereTotals[sphereId]);
      for (const ch of filtered.chapters) {
        for (const ev of ch.events) {
          expect(filtered.sphereByEventId.get(ev.id)).toBe(sphereId);
        }
      }
    }
  });

  it('builds Era Jump Rail entries with valid DOM anchors for overlapping eras', () => {
    const activeBranches: Record<string, boolean> = {};
    for (const b of dataset.branches) activeBranches[b.id] = true;

    const { stream, matchingEvents } = buildUnifiedTimelineStream(
      dataset.enrichedEvents,
      dataset.rulers,
      dataset.manifest,
      dataset.branches,
      {
        activeBranches,
        yearFrom: 1700,
        yearTo: 1917,
        selectedEra: 'ALL',
        selectedReign: 'ALL',
        searchQuery: '',
        onlyWithSyncLinks: false,
        focusedEventId: null,
        focusScope: 'sync_only',
        showEndNodes: true,
        showOverlapMatrix: false,
      },
    );

    const jumpEntries = buildEraJumpEntries({
      resolvedEras: dataset.resolvedEras,
      stream,
      matchingEvents,
      yearFrom: 1700,
      yearTo: 1917,
    });

    expect(jumpEntries.length).toBeGreaterThanOrEqual(2);
    for (const entry of jumpEntries) {
      expect(entry.era.endYear).toBeGreaterThanOrEqual(1700);
      expect(entry.era.startYear).toBeLessThanOrEqual(1917);
      if (entry.eventCount > 0) {
        expect(entry.firstDomId).not.toBeNull();
        expect(entry.firstStreamIdx).not.toBeNull();
      }
    }
  });

  it('stepEventId navigates cleanly across boundaries and handles empty/null inputs', () => {
    expect(stepEventId([], null, 1)).toBeNull();
    expect(stepEventId([], 'a', -1)).toBeNull();

    const ids = ['e1', 'e2', 'e3'];
    expect(stepEventId(ids, null, 1)).toBe('e1');
    expect(stepEventId(ids, null, -1)).toBe('e3');
    expect(stepEventId(ids, 'e1', -1)).toBeNull();
    expect(stepEventId(ids, 'e1', 1)).toBe('e2');
    expect(stepEventId(ids, 'e2', 1)).toBe('e3');
    expect(stepEventId(ids, 'e2', -1)).toBe('e1');
    expect(stepEventId(ids, 'e3', 1)).toBeNull();
    expect(stepEventId(ids, 'missing', 1)).toBe('e1');
  });

  it('computeBranchPresetMap("none") disables all leaf branches including MAIN_RULERS', () => {
    const noneMap = computeBranchPresetMap(dataset.branches, 'none');
    const leafBranches = dataset.branches.filter((b) => !b.isGroup);
    expect(leafBranches.length).toBeGreaterThanOrEqual(27);
    for (const b of leafBranches) {
      expect(noneMap[b.id]).toBe(false);
    }
    const lanes = getVisibleLanes(dataset.branches, noneMap);
    expect(lanes.map((l) => l.id)).toEqual(['TIME_AXIS']);
  });

  it('keeps ERA_START headings and TIME_AXIS when all branches are disabled without search filters', () => {
    const noneMap = computeBranchPresetMap(dataset.branches, 'none');
    const { stream, matchingEvents, matchingRulers } = buildUnifiedTimelineStream(
      dataset.enrichedEvents,
      dataset.rulers,
      dataset.manifest,
      dataset.branches,
      {
        activeBranches: noneMap,
        yearFrom: 862,
        yearTo: 2000,
        selectedEra: 'ALL',
        selectedReign: 'ALL',
        searchQuery: '',
        onlyWithSyncLinks: false,
        focusedEventId: null,
        focusScope: 'sync_only',
        showEndNodes: true,
        showOverlapMatrix: false,
      },
    );

    expect(matchingEvents.length).toBe(0);
    expect(matchingRulers.length).toBe(0);
    expect(stream.length).toBe(dataset.resolvedEras.length);
    expect(stream.every((row) => row.rowType === 'ERA_START')).toBe(true);

    // Non-matching search query still yields an empty stream instead of showing bare eras
    const searched = buildUnifiedTimelineStream(
      dataset.enrichedEvents,
      dataset.rulers,
      dataset.manifest,
      dataset.branches,
      {
        activeBranches: noneMap,
        yearFrom: 862,
        yearTo: 2000,
        selectedEra: 'ALL',
        selectedReign: 'ALL',
        searchQuery: 'несуществующий_запрос_xyz',
        onlyWithSyncLinks: false,
        focusedEventId: null,
        focusScope: 'sync_only',
        showEndNodes: true,
        showOverlapMatrix: false,
      },
    );
    expect(searched.stream.length).toBe(0);
  });
});
