import { classifyEventMacroRegions } from '../../engine/regionFilter';
import {
  getEventEffectiveEndYear,
  getEventEffectiveStartYear,
  getEventHiddenBranchSummaries,
  isBiographyNode,
  isMajorCampaignOrConflictNode,
  parsePreciseDate,
  resolveEventBranch,
} from '../../engine/timelineEngine';
import type {
  BranchDefinition,
  BranchSubLaneLayout,
  EnrichedEvent,
  MacroRegionId,
  RulerPeriod,
  RulerSubLaneLayout,
  StreamRow,
} from '../../types/timeline';

export interface PrecomputedRulerRailSlot {
  slotIdx: number;
  rx: number;
  rulerId: string;
  color: string;
}

export interface PrecomputedPassingRail {
  eventId: string;
  laneId: string;
  x: number;
  color: string;
  slot: number;
  isBioRail: boolean;
}

export interface PrecomputedRowRails {
  activeRulerSlots: Array<PrecomputedRulerRailSlot | null>;
  passingByLane: Map<string, { hasBasePassing: boolean; rails: PrecomputedPassingRail[] }>;
  hasBasePassingAtCommit: boolean;
  hasBaseContinuingAtEnd: boolean;
}

export interface PrecomputedEventMeta {
  branchObj: BranchDefinition;
  origBranchObj: BranchDefinition;
  isBioNode: boolean;
  effStartYear: number;
  effEndYear: number;
  baseX: number;
  commitX: number;
  atomicCommitX: number;
  slot: number;
  hiddenBranchSummaries: ReturnType<typeof getEventHiddenBranchSummaries>;
  hiddenLinksTotal: number;
  eventMacroRegions: MacroRegionId[];
}

export interface TimelinePrecomputedLayout {
  rowRailsByIdx: PrecomputedRowRails[];
  spacerRailsByIdx: Array<PrecomputedRowRails | null>;
  eventMetaById: Map<string, PrecomputedEventMeta>;
  carryOverWarsByEraId: Map<string, EnrichedEvent[]>;
  ongoingWarsByRulerId: Map<string, EnrichedEvent[]>;
  rowIndexByEventId: Map<string, number>;
  eventsWithEndRowInStream: Set<string>;
  rowIndexByDomId: Map<string, number>;
}

interface RulerInterval {
  rulerId: string;
  startKey: number;
  endKey: number;
  color: string;
}

function buildActiveRulerSlotsForSortKey(
  slotIntervals: RulerInterval[][],
  slotCursors: number[],
  railXs: number[],
  sortKey: number,
  skipRulerId?: string,
): Array<PrecomputedRulerRailSlot | null> {
  const result: Array<PrecomputedRulerRailSlot | null> = new Array(railXs.length).fill(null);

  for (let slotIdx = 0; slotIdx < railXs.length; slotIdx++) {
    const intervals = slotIntervals[slotIdx];
    if (!intervals || intervals.length === 0) continue;

    let cursor = slotCursors[slotIdx];
    while (cursor < intervals.length && intervals[cursor].endKey < sortKey) {
      cursor++;
    }
    slotCursors[slotIdx] = cursor;

    // Scan from cursor while intervals could still cover sortKey (typically 0 or 1 step)
    for (let i = cursor; i < intervals.length; i++) {
      const iv = intervals[i];
      if (iv.startKey > sortKey) break;
      if (iv.endKey >= sortKey) {
        if (iv.rulerId !== skipRulerId) {
          result[slotIdx] = {
            slotIdx,
            rx: railXs[slotIdx],
            rulerId: iv.rulerId,
            color: iv.color,
          };
          break;
        }
      }
    }
  }

  return result;
}

function snapshotPassingByLane(
  activeEntries: Set<PrecomputedPassingRail>,
): Map<string, { hasBasePassing: boolean; rails: PrecomputedPassingRail[] }> {
  const map = new Map<string, { hasBasePassing: boolean; rails: PrecomputedPassingRail[] }>();
  if (activeEntries.size === 0) return map;

  activeEntries.forEach((rail) => {
    let bucket = map.get(rail.laneId);
    if (!bucket) {
      bucket = { hasBasePassing: false, rails: [] };
      map.set(rail.laneId, bucket);
    }
    if (rail.slot === 0) {
      bucket.hasBasePassing = true;
    }
    bucket.rails.push(rail);
  });

  return map;
}

export function precomputeTimelineLayout(params: {
  stream: StreamRow[];
  matchingEvents: EnrichedEvent[];
  matchingRulers: RulerPeriod[];
  branches: BranchDefinition[];
  activeBranches: Record<string, boolean>;
  collapsedParents: Record<string, boolean>;
  hasRulersLane: boolean;
  rulerLayout: RulerSubLaneLayout;
  subLaneLayout: BranchSubLaneLayout;
  timeSpineX: number;
  includeSpacers: boolean;
}): TimelinePrecomputedLayout {
  const {
    stream,
    matchingEvents,
    matchingRulers,
    branches,
    activeBranches,
    collapsedParents,
    hasRulersLane,
    rulerLayout,
    subLaneLayout,
    timeSpineX,
    includeSpacers,
  } = params;

  const branchById = new Map<string, BranchDefinition>();
  for (const b of branches) {
    branchById.set(b.id, b);
  }

  // 1. Precompute static per-event metadata once (O(E))
  const eventMetaById = new Map<string, PrecomputedEventMeta>();
  const majorWars: EnrichedEvent[] = [];

  for (const ev of matchingEvents) {
    const branchObj = resolveEventBranch(ev, branches, collapsedParents);
    const origBranchObj = branchById.get(ev.task) || branchObj;
    const isBioNode = isBiographyNode(ev, branches);
    const effStartYear = getEventEffectiveStartYear(ev, branches);
    const effEndYear = getEventEffectiveEndYear(ev, branches);
    const laneInfo = subLaneLayout.branchLayouts.get(branchObj.id);
    const baseX = laneInfo?.baseX ?? timeSpineX + 28;
    const slot = subLaneLayout.slotByEventId.get(ev.id) ?? 0;
    const commitX = laneInfo?.subXs[slot] ?? baseX + slot * 10;
    const hiddenBranchSummaries = getEventHiddenBranchSummaries(ev, activeBranches, branches);
    const hiddenLinksTotal = hiddenBranchSummaries.reduce((sum, b) => sum + b.linkCount, 0);
    const eventMacroRegions = classifyEventMacroRegions(ev);

    eventMetaById.set(ev.id, {
      branchObj,
      origBranchObj,
      isBioNode,
      effStartYear,
      effEndYear,
      baseX,
      commitX,
      atomicCommitX: baseX,
      slot,
      hiddenBranchSummaries,
      hiddenLinksTotal,
      eventMacroRegions,
    });

    if (isMajorCampaignOrConflictNode(ev, branches)) {
      majorWars.push(ev);
    }
  }

  // 2. Index stream positions, DOM jump keys, and sweep-line start/end schedules (O(S))
  const rowIndexByEventId = new Map<string, number>();
  const eventsWithEndRowInStream = new Set<string>();
  const rowIndexByDomId = new Map<string, number>();
  const startAtRow = new Map<number, PrecomputedPassingRail[]>();
  const endAtRow = new Map<number, PrecomputedPassingRail[]>();
  const railByEventId = new Map<string, PrecomputedPassingRail>();
  const carryOverWarsByEraId = new Map<string, EnrichedEvent[]>();
  const ongoingWarsByRulerId = new Map<string, EnrichedEvent[]>();

  for (let idx = 0; idx < stream.length; idx++) {
    const row = stream[idx];
    if (row.rowType === 'ERA_START') {
      const carry = majorWars.filter((ev) => ev.startYear < row.year && ev.endYear > row.year);
      if (carry.length > 0) {
        carryOverWarsByEraId.set(row.era.id, carry);
      }
    } else if (row.rowType === 'RULER_COMMIT') {
      rowIndexByDomId.set(row.rulerObj.id, idx);
      const ongoing = majorWars.filter(
        (ev) => ev.startYear < row.rulerObj.startYear && ev.endYear > row.rulerObj.startYear,
      );
      if (ongoing.length > 0) {
        ongoingWarsByRulerId.set(row.rulerObj.id, ongoing);
      }
    } else if (row.rowType === 'EVENT_COMMIT') {
      const ev = row.eventObj;
      rowIndexByEventId.set(ev.id, idx);
      rowIndexByDomId.set(`row-${ev.id}`, idx);
      rowIndexByDomId.set(ev.id, idx);

      if (!row.isAtomicInView) {
        const meta = eventMetaById.get(ev.id);
        if (meta) {
          const rail: PrecomputedPassingRail = {
            eventId: ev.id,
            laneId: meta.branchObj.id,
            x: meta.commitX,
            color: meta.branchObj.color,
            slot: meta.slot,
            isBioRail: meta.isBioNode,
          };
          railByEventId.set(ev.id, rail);
          const list = startAtRow.get(idx);
          if (list) list.push(rail);
          else startAtRow.set(idx, [rail]);
        }
      }
    } else if (row.rowType === 'EVENT_END') {
      const ev = row.eventObj;
      eventsWithEndRowInStream.add(ev.id);
      rowIndexByDomId.set(`row-end-${ev.id}`, idx);

      const rail = railByEventId.get(ev.id);
      if (rail) {
        const list = endAtRow.get(idx);
        if (list) list.push(rail);
        else endAtRow.set(idx, [rail]);
      }
    }
  }

  // 3. Bucket ruler intervals per slot sorted by startKey for O(S + R) monotonic sweep
  const slotCount = hasRulersLane ? rulerLayout.railXs.length : 0;
  const slotIntervals: RulerInterval[][] = Array.from({ length: slotCount }, () => []);
  if (hasRulersLane) {
    for (const r of matchingRulers) {
      const slotIdx = rulerLayout.slotByRulerId.get(r.id) ?? 0;
      if (slotIdx < 0 || slotIdx >= slotCount) continue;
      const startParts = parsePreciseDate(r.startDate, r.startYear, false, {
        calendarStyle: r.calendarStyle,
        task: 'MAIN_RULERS',
      });
      const endParts = parsePreciseDate(r.endDate, r.endYear, true, {
        calendarStyle: r.calendarStyle,
        task: 'MAIN_RULERS',
      });
      slotIntervals[slotIdx].push({
        rulerId: r.id,
        startKey: startParts.sortKey,
        endKey: endParts.sortKey,
        color: rulerLayout.colorByRulerId.get(r.id) ?? '#f59e0b',
      });
    }
    for (const arr of slotIntervals) {
      arr.sort((a, b) => a.startKey - b.startKey);
    }
  }

  // 4. Sweep-line across stream rows: O(S * activeRails) instead of O(S * L * E * B)
  const rowRailsByIdx: PrecomputedRowRails[] = new Array(stream.length);
  const spacerRailsByIdx: Array<PrecomputedRowRails | null> = new Array(stream.length).fill(null);

  const activePassing = new Set<PrecomputedPassingRail>();
  const rowSlotCursors = new Array(slotCount).fill(0);
  const spacerSlotCursors = new Array(slotCount).fill(0);

  for (let idx = 0; idx < stream.length; idx++) {
    const row = stream[idx];

    // Proportional spacer sits strictly between row (idx - 1) and row (idx),
    // which means all events started at <= idx - 1 and NOT ended at <= idx - 1 are passing!
    if (includeSpacers && idx > 0) {
      const prevRow = stream[idx - 1];
      const deltaYears = Math.max(0, row.year - prevRow.year);
      if (deltaYears >= 2) {
        const midSortKey = Math.floor((prevRow.sortKey + row.sortKey) / 2);
        const spacerRulerSlots = hasRulersLane
          ? buildActiveRulerSlotsForSortKey(
              slotIntervals,
              spacerSlotCursors,
              rulerLayout.railXs,
              midSortKey,
            )
          : [];
        spacerRailsByIdx[idx] = {
          activeRulerSlots: spacerRulerSlots,
          passingByLane: snapshotPassingByLane(activePassing),
          hasBasePassingAtCommit: false,
          hasBaseContinuingAtEnd: false,
        };
      }
    }

    // Remove events that END on this exact row (their passing rail stops BEFORE this row)
    const endingHere = endAtRow.get(idx);
    if (endingHere) {
      for (const r of endingHere) {
        activePassing.delete(r);
      }
    }

    // Snapshot passing rails strictly passing THROUGH this row (commitIdx < idx && idx < endIdx)
    const passingByLane = snapshotPassingByLane(activePassing);

    const skipRulerId =
      row.rowType === 'RULER_COMMIT' || row.rowType === 'RULER_END' ? row.rulerObj.id : undefined;

    const activeRulerSlots = hasRulersLane
      ? buildActiveRulerSlotsForSortKey(
          slotIntervals,
          rowSlotCursors,
          rulerLayout.railXs,
          row.sortKey,
          skipRulerId,
        )
      : [];

    let hasBasePassingAtCommit = false;
    let hasBaseContinuingAtEnd = false;

    if (row.rowType === 'EVENT_COMMIT') {
      const meta = eventMetaById.get(row.eventObj.id);
      if (meta && !row.isAtomicInView && meta.slot > 0) {
        const laneBucket = passingByLane.get(meta.branchObj.id);
        hasBasePassingAtCommit = Boolean(laneBucket?.hasBasePassing);
      }
    } else if (row.rowType === 'EVENT_END') {
      const meta = eventMetaById.get(row.eventObj.id);
      if (meta && meta.slot > 0) {
        const laneBucket = passingByLane.get(meta.branchObj.id);
        hasBaseContinuingAtEnd = Boolean(laneBucket?.hasBasePassing);
      }
    }

    rowRailsByIdx[idx] = {
      activeRulerSlots,
      passingByLane,
      hasBasePassingAtCommit,
      hasBaseContinuingAtEnd,
    };

    // Add events that START on this exact row (they will pass through rows idx + 1 .. endIdx - 1)
    const startingHere = startAtRow.get(idx);
    if (startingHere) {
      for (const r of startingHere) {
        activePassing.add(r);
      }
    }
  }

  return {
    rowRailsByIdx,
    spacerRailsByIdx,
    eventMetaById,
    carryOverWarsByEraId,
    ongoingWarsByRulerId,
    rowIndexByEventId,
    eventsWithEndRowInStream,
    rowIndexByDomId,
  };
}
