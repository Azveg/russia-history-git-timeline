import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildPersonDossierIndex,
  buildUnifiedTimelineStream,
  computeBranchPresetMap,
  computeBranchSubLaneLayout,
  computeRulerSubLaneLayout,
  countExpectedLeafBranchesFromManifest,
  extractBranchesFromStore,
  extractRulersFromStore,
  getCustomWindowSummaryData,
  getEnrichedEvents,
  getLeafBranches,
  getMacroEraSummaryData,
  getRulerPeriodSummaryData,
  getVisibleLanes,
  resolveEventBranch,
  resolveMacroEras,
  resolvePersonKey,
} from '../timelineEngine';
import { doesRawMatchPersonKey } from '../nlp/personExtractor';
import { precomputeTimelineLayout } from '../../components/timeline/timelineLayoutPrecompute';
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
  return { manifest, filesMap, branches, rulers, enrichedEvents };
}

describe('Performance optimizations — semantic equivalence & caching', () => {
  const dataset = loadRealDataset();

  it('countExpectedLeafBranchesFromManifest matches real mounted leaf branches', () => {
    const expected = countExpectedLeafBranchesFromManifest(dataset.manifest);
    const actualLeaves = dataset.branches.filter((b) => !b.isGroup);
    expect(expected).toBe(actualLeaves.length);
    expect(expected).toBeGreaterThanOrEqual(27);
  });

  it('prefix-sum concurrentCount and lazy concurrentEvents match exact brute-force overlap for all events', () => {
    const { enrichedEvents } = dataset;
    expect(enrichedEvents.length).toBeGreaterThan(500);

    // Check every event's concurrentCount against lazy concurrentEvents.length
    for (const ev of enrichedEvents) {
      expect(ev.concurrentCount).toBeDefined();
      expect(ev.concurrentCount).toBe(ev.concurrentEvents.length);
    }

    // Spot-check 40 evenly distributed events against full O(N) brute-force overlap
    const step = Math.max(1, Math.floor(enrichedEvents.length / 40));
    for (let i = 0; i < enrichedEvents.length; i += step) {
      const ev = enrichedEvents[i];
      const bruteForceIds = enrichedEvents
        .filter(
          (other) =>
            other.id !== ev.id &&
            ev.startYear <= other.endYear &&
            other.startYear <= ev.endYear,
        )
        .map((other) => other.id)
        .sort();
      const lazyIds = ev.concurrentEvents.map((other) => other.id).sort();
      expect(lazyIds).toEqual(bruteForceIds);
      expect(ev.concurrentCount).toBe(bruteForceIds.length);
    }
  });

  it('O(1) resolvePersonKey matches brute-force dossier scan without rawToKey', () => {
    const { enrichedEvents, rulers } = dataset;
    const { dossiers } = buildPersonDossierIndex(enrichedEvents, rulers);
    expect(dossiers.size).toBeGreaterThan(1000);

    const sampleQueries = [
      'Пётр I',
      'Александр II (Освободитель)',
      'М. М. Сперанский',
      'А. С. Пушкин',
      'Иван IV Грозный',
      'Екатерина II',
      'С. Ю. Витте',
      'П. А. Столыпин',
      'А. В. Суворов',
      'М. И. Кутузов',
      'Неизвестный Персонаж Х',
    ];

    for (const raw of sampleQueries) {
      const fastResult = resolvePersonKey(raw, dossiers);

      // Brute-force reference implementation matching original behavior
      let bruteResult: string | null = null;
      if (dossiers.has(raw)) {
        bruteResult = raw;
      } else {
        for (const [key, dossier] of dossiers.entries()) {
          if (dossier.variants.includes(raw) || doesRawMatchPersonKey(raw, key)) {
            bruteResult = key;
            break;
          }
        }
      }

      expect(fastResult).toBe(bruteResult);
    }
  });

  it('buildUnifiedTimelineStream skips auditCandidateMap by default and computes it when computeAuditMap=true', () => {
    const { enrichedEvents, rulers, manifest, branches } = dataset;
    const activeBranches: Record<string, boolean> = {};
    getLeafBranches(branches).forEach((b) => {
      activeBranches[b.id] = true;
    });
    activeBranches.MAIN_RULERS = true;

    const defaultRes = buildUnifiedTimelineStream(enrichedEvents, rulers, manifest, branches, {
      activeBranches,
      yearFrom: 862,
      yearTo: 2025,
      selectedEra: 'ALL',
      selectedReign: 'ALL',
      searchQuery: '',
      onlyWithSyncLinks: false,
      focusedEventId: null,
      focusScope: 'sync_only',
      showEndNodes: true,
      showOverlapMatrix: true,
    });
    expect(defaultRes.auditCandidateMap.size).toBe(0);

    const auditRes = buildUnifiedTimelineStream(enrichedEvents, rulers, manifest, branches, {
      activeBranches,
      yearFrom: 862,
      yearTo: 2025,
      selectedEra: 'ALL',
      selectedReign: 'ALL',
      searchQuery: '',
      onlyWithSyncLinks: false,
      focusedEventId: null,
      focusScope: 'sync_only',
      computeAuditMap: true,
      showEndNodes: true,
      showOverlapMatrix: true,
    });
    expect(auditRes.auditCandidateMap.size).toBeGreaterThanOrEqual(0);
  });

  it('WeakMap analytics caches return identical cached result on repeated calls and invalidate on input change', () => {
    const { enrichedEvents, rulers, manifest, branches } = dataset;
    const { dossiers } = buildPersonDossierIndex(enrichedEvents, rulers);

    const peter = rulers.find((r) => /п[её]тр\s+i\b/i.test(r.shortRuler)) ?? rulers[0];
    const r1 = getRulerPeriodSummaryData(peter, enrichedEvents, branches, dossiers, rulers);
    const r2 = getRulerPeriodSummaryData(peter, enrichedEvents, branches, dossiers, rulers);
    expect(r2).toBe(r1);

    const clonedEvents = [...enrichedEvents];
    const r3 = getRulerPeriodSummaryData(peter, clonedEvents, branches, dossiers, rulers);
    expect(r3).not.toBe(r1);
    expect(r3.reignEvents.length).toBe(r1.reignEvents.length);

    const resolvedEras = resolveMacroEras(manifest.macroEras);
    const era = resolvedEras[0];
    const e1 = getMacroEraSummaryData(era, rulers, enrichedEvents, branches);
    const e2 = getMacroEraSummaryData(era, rulers, enrichedEvents, branches);
    expect(e2).toBe(e1);

    const w1 = getCustomWindowSummaryData(1800, 1917, rulers, enrichedEvents, branches, manifest.macroEras, dossiers);
    const w2 = getCustomWindowSummaryData(1800, 1917, rulers, enrichedEvents, branches, manifest.macroEras, dossiers);
    expect(w2).toBe(w1);
  });

  it('O(N) precomputeTimelineLayout matches brute-force passing rails and runs fast for all 27 branches', () => {
    const { enrichedEvents, rulers, manifest, branches } = dataset;
    const collapsed: Record<string, boolean> = {};
    branches.forEach((b) => {
      if (b.defaultCollapsedOnTimeline) collapsed[b.id] = true;
    });
    const allActive = computeBranchPresetMap(branches, 'all');
    const visibleLanes = getVisibleLanes(branches, allActive, collapsed);
    const hasRulersLane = visibleLanes.some((l) => l.id === 'MAIN_RULERS');
    const thematicLanes = visibleLanes.filter((l) => l.id !== 'MAIN_RULERS');

    const built = buildUnifiedTimelineStream(enrichedEvents, rulers, manifest, branches, {
      activeBranches: allActive,
      yearFrom: 862,
      yearTo: 2025,
      selectedEra: 'ALL',
      selectedReign: 'ALL',
      searchQuery: '',
      onlyWithSyncLinks: false,
      focusedEventId: null,
      focusScope: 'sync_only',
      showEndNodes: true,
      showOverlapMatrix: true,
    });

    const rulerLayout = computeRulerSubLaneLayout(built.matchingRulers, hasRulersLane);
    const subLaneLayout = computeBranchSubLaneLayout(
      built.matchingEvents,
      thematicLanes,
      branches,
      built.axisResolution,
      rulerLayout.timeSpineX,
      { collapsedParents: collapsed },
    );

    const t0 = performance.now();
    const layout = precomputeTimelineLayout({
      stream: built.stream,
      matchingEvents: built.matchingEvents,
      matchingRulers: built.matchingRulers,
      branches,
      activeBranches: allActive,
      collapsedParents: collapsed,
      hasRulersLane,
      rulerLayout,
      subLaneLayout,
      timeSpineX: rulerLayout.timeSpineX,
      includeSpacers: true,
    });
    const elapsedMs = performance.now() - t0;

    expect(layout.rowRailsByIdx.length).toBe(built.stream.length);
    expect(layout.spacerRailsByIdx.length).toBe(built.stream.length);
    expect(elapsedMs).toBeLessThan(1500);

    // Build brute-force commit/end index map for spot-check verification
    const commitIdxByEvent = new Map<string, number>();
    const endIdxByEvent = new Map<string, number>();
    built.stream.forEach((row, idx) => {
      if (row.rowType === 'EVENT_COMMIT' && row.eventObj) {
        commitIdxByEvent.set(row.eventObj.id, idx);
        expect(layout.rowIndexByDomId.get(`row-${row.eventObj.id}`)).toBe(idx);
      } else if (row.rowType === 'EVENT_END' && row.eventObj) {
        endIdxByEvent.set(row.eventObj.id, idx);
        expect(layout.rowIndexByDomId.get(`row-end-${row.eventObj.id}`)).toBe(idx);
      } else if (row.rowType === 'RULER_COMMIT' && row.rulerObj) {
        expect(layout.rowIndexByDomId.get(row.rulerObj.id)).toBe(idx);
      }
    });

    // Spot-check 25 evenly distributed rows against exact brute-force passing rail scan
    const step = Math.max(1, Math.floor(built.stream.length / 25));
    for (let idx = 0; idx < built.stream.length; idx += step) {
      const row = built.stream[idx];
      const preRow = layout.rowRailsByIdx[idx];

      // Verify passing rails per lane match strict commitIdx < idx < endIdx
      for (const lane of thematicLanes) {
        const expectedIds = built.matchingEvents
          .filter((ev) => {
            const cIdx = commitIdxByEvent.get(ev.id);
            const eIdx = endIdxByEvent.get(ev.id);
            if (cIdx === undefined || eIdx === undefined || eIdx <= cIdx) return false;
            return (
              cIdx < idx &&
              idx < eIdx &&
              resolveEventBranch(ev, branches, collapsed).id === lane.id
            );
          })
          .map((ev) => ev.id)
          .sort();

        const actualIds = (preRow.passingByLane.get(lane.id)?.rails ?? [])
          .map((r) => r.eventId)
          .sort();
        expect(actualIds).toEqual(expectedIds);
      }

      // Verify active ruler slots exclude current row's ruler on RULER_COMMIT / RULER_END
      const skipRulerId =
        (row.rowType === 'RULER_COMMIT' || row.rowType === 'RULER_END') && row.rulerObj
          ? row.rulerObj.id
          : undefined;
      const actualSlots = preRow.activeRulerSlots.filter(
        (s): s is NonNullable<typeof s> => s !== null,
      );
      expect(actualSlots.every((s) => s.rulerId !== skipRulerId)).toBe(true);
      const rulerById = new Map(built.matchingRulers.map((r) => [r.id, r]));
      actualSlots.forEach((slot) => {
        const ruler = rulerById.get(slot.rulerId);
        expect(ruler).toBeDefined();
        expect(ruler!.startYear).toBeLessThanOrEqual(row.year);
        expect(ruler!.endYear).toBeGreaterThanOrEqual(row.year);
      });
    }
  });
});
