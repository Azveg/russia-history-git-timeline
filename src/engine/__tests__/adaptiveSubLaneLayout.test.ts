import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAX_TIMELINE_SVG_WIDTH,
  buildUnifiedTimelineStream,
  collapseAllParentBranches,
  computeBranchPresetMap,
  computeBranchSubLaneLayout,
  computeRulerSubLaneLayout,
  extractBranchesFromStore,
  extractRulersFromStore,
  getVisibleLanes,
  hasChildBranches,
  getEnrichedEvents,
} from '../timelineEngine';
import type { SyncManifest, TimelineDataFile } from '../../types/timeline';

function loadRealDataset() {
  const publicDir = resolve(process.cwd(), 'public');
  const manifest = JSON.parse(
    readFileSync(resolve(publicDir, 'data/sync.manifest.json'), 'utf8'),
  ) as SyncManifest;

  const filesMap: Record<string, TimelineDataFile> = {};
  for (const fileMeta of manifest.mountedFiles) {
    if (!fileMeta.enabled) continue;
    const rel = fileMeta.path.replace(/^\/+/, '');
    filesMap[fileMeta.path] = JSON.parse(
      readFileSync(resolve(publicDir, rel), 'utf8'),
    ) as TimelineDataFile;
  }

  const branches = extractBranchesFromStore(manifest, filesMap);
  const rulers = extractRulersFromStore(manifest, filesMap);
  const enrichedEvents = getEnrichedEvents(manifest, filesMap, rulers);
  return { manifest, filesMap, branches, rulers, enrichedEvents };
}

describe('Adaptive sub-lane compression & all-branches layout budget', () => {
  const dataset = loadRealDataset();

  it('collapseAllParentBranches collapses every parent branch with children and leaves leaf branches untouched', () => {
    const collapsed = collapseAllParentBranches(dataset.branches);
    const parentBranches = dataset.branches.filter((b) => hasChildBranches(b.id, dataset.branches));
    expect(parentBranches.length).toBeGreaterThan(0);

    for (const parent of parentBranches) {
      expect(collapsed[parent.id]).toBe(true);
    }

    const leafBranches = dataset.branches.filter((b) => !hasChildBranches(b.id, dataset.branches));
    for (const leaf of leafBranches) {
      expect(collapsed[leaf.id]).toBeUndefined();
    }
  });

  it('keeps totalSvgWidth within budget and preserves all events when "all" preset is active with collapsed groups', () => {
    const { manifest, branches, rulers, enrichedEvents } = dataset;
    const allActive = computeBranchPresetMap(branches, 'all');
    const collapsed = collapseAllParentBranches(branches);
    const visibleLanes = getVisibleLanes(branches, allActive, collapsed);
    const hasRulersLane = visibleLanes.some((l) => l.id === 'MAIN_RULERS');
    const thematicLanes = visibleLanes.filter((l) => l.id !== 'MAIN_RULERS' && l.id !== 'TIME_AXIS');

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
      showOverlapMatrix: false,
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

    // Every single matching event must still appear as an EVENT_COMMIT row
    const commitRowCount = built.stream.filter((r) => r.rowType === 'EVENT_COMMIT').length;
    expect(commitRowCount).toBe(built.matchingEvents.length);
    expect(built.matchingEvents.length).toBeGreaterThan(200);

    // Graph column must stay strictly inside the width budget so event cards never clip off-screen
    expect(subLaneLayout.totalSvgWidth).toBeLessThanOrEqual(DEFAULT_MAX_TIMELINE_SVG_WIDTH);

    for (const lane of thematicLanes) {
      const info = subLaneLayout.branchLayouts.get(lane.id);
      expect(info).toBeDefined();
      expect(info!.subLaneCount).toBeGreaterThanOrEqual(1);
      expect(info!.subLaneCount).toBeLessThanOrEqual(2);
      expect(info!.subXs.length).toBe(info!.subLaneCount);
    }

    // Every assigned slot must index cleanly into subXs
    subLaneLayout.slotByEventId.forEach((slot) => {
      expect(slot).toBeGreaterThanOrEqual(0);
      expect(slot).toBeLessThan(2);
    });
  });

  it('enforces maxSvgWidth budget and 1 rail per branch even when ALL parent groups are expanded under "all" preset', () => {
    const { manifest, branches, rulers, enrichedEvents } = dataset;
    const allActive = computeBranchPresetMap(branches, 'all');
    const noCollapsed: Record<string, boolean> = {};
    const visibleLanes = getVisibleLanes(branches, allActive, noCollapsed);
    const hasRulersLane = visibleLanes.some((l) => l.id === 'MAIN_RULERS');
    const thematicLanes = visibleLanes.filter((l) => l.id !== 'MAIN_RULERS' && l.id !== 'TIME_AXIS');

    expect(thematicLanes.length).toBeGreaterThanOrEqual(15);

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
      showOverlapMatrix: false,
    });

    const rulerLayout = computeRulerSubLaneLayout(built.matchingRulers, hasRulersLane);
    const subLaneLayout = computeBranchSubLaneLayout(
      built.matchingEvents,
      thematicLanes,
      branches,
      built.axisResolution,
      rulerLayout.timeSpineX,
      { collapsedParents: noCollapsed },
    );

    expect(subLaneLayout.totalSvgWidth).toBeLessThanOrEqual(DEFAULT_MAX_TIMELINE_SVG_WIDTH);

    let prevBaseX = rulerLayout.timeSpineX;
    for (const lane of thematicLanes) {
      const info = subLaneLayout.branchLayouts.get(lane.id);
      expect(info).toBeDefined();
      expect(info!.subLaneCount).toBe(1);
      expect(info!.baseX).toBeGreaterThan(prevBaseX);
      prevBaseX = info!.baseX;
    }

    subLaneLayout.slotByEventId.forEach((slot) => {
      expect(slot).toBe(0);
    });
  });

  it('retains multi-rail separation when only a few overview branches are active', () => {
    const { manifest, branches, rulers, enrichedEvents } = dataset;
    const overviewActive = computeBranchPresetMap(branches, 'overview');
    const visibleLanes = getVisibleLanes(branches, overviewActive, {});
    const hasRulersLane = visibleLanes.some((l) => l.id === 'MAIN_RULERS');
    const thematicLanes = visibleLanes.filter((l) => l.id !== 'MAIN_RULERS' && l.id !== 'TIME_AXIS');

    const built = buildUnifiedTimelineStream(enrichedEvents, rulers, manifest, branches, {
      activeBranches: overviewActive,
      yearFrom: 862,
      yearTo: 2025,
      selectedEra: 'ALL',
      selectedReign: 'ALL',
      searchQuery: '',
      onlyWithSyncLinks: false,
      focusedEventId: null,
      focusScope: 'sync_only',
      showEndNodes: true,
      showOverlapMatrix: false,
    });

    const rulerLayout = computeRulerSubLaneLayout(built.matchingRulers, hasRulersLane);
    const subLaneLayout = computeBranchSubLaneLayout(
      built.matchingEvents,
      thematicLanes,
      branches,
      built.axisResolution,
      rulerLayout.timeSpineX,
      { collapsedParents: {} },
    );

    expect(subLaneLayout.totalSvgWidth).toBeLessThanOrEqual(DEFAULT_MAX_TIMELINE_SVG_WIDTH);
    const maxSubCount = Math.max(
      ...thematicLanes.map((l) => subLaneLayout.branchLayouts.get(l.id)?.subLaneCount ?? 1),
    );
    expect(maxSubCount).toBeGreaterThanOrEqual(2);
    expect(maxSubCount).toBeLessThanOrEqual(4);
  });
});
