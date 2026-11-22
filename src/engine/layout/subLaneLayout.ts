import type {
  AxisResolution,
  BranchCategoryKey,
  BranchDefinition,
  BranchLaneLayout,
  BranchPresetId,
  BranchSubLaneLayout,
  EnrichedEvent,
  PreciseDateParts,
  RulerPeriod,
  RulerSpanSegment,
  RulerSubLaneLayout,
} from '../../types/timeline';
import { isAtomicEventNode, isBiographyNode, parsePreciseDate } from '../calendar/jdnCalendar';

export const TIME_AXIS_BRANCH: BranchDefinition = {
  id: 'TIME_AXIS',
  gitName: 'time/main',
  label: 'Ось времени (центр)',
  short: 'time/main',
  description: 'Центральный ствол хронологии (годы, месяцы, дни), от которого ответвляются правления и процессы',
  color: '#cbd5e1',
  badgeClass: 'bg-slate-500/15 text-slate-200 border-slate-500/40',
  isMilitary: false,
  alwaysTrunk: true,
  isTimeAxis: true,
};

export const RULER_ALT_COLORS = [
  '#f59e0b',
  '#fcd34d',
  '#fb923c',
  '#38bdf8',
  '#a78bfa',
  '#34d399',
  '#f43f5e',
] as const;

export function resolveRulerColor(ruler: RulerPeriod, slot: number): string {
  const centerLower = (ruler.center || '').toLowerCase();
  if (centerLower.includes('тушино')) return '#f43f5e';
  if (centerLower.includes('чернигов')) return '#f43f5e';
  if (centerLower.includes('киев')) return '#fb923c';
  if (centerLower === 'новгород') return '#38bdf8';
  if (centerLower.includes('галич')) return '#a78bfa';
  if (centerLower.includes('твер')) return '#34d399';
  return slot % 2 === 0 ? '#f59e0b' : '#fcd34d';
}

export function getDescendantBranchIds(
  parentId: string,
  branches: BranchDefinition[],
): string[] {
  const result: string[] = [];
  const queue = [parentId];
  const visited = new Set<string>([parentId]);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    branches.forEach((b) => {
      if (b.parentBranchId === currentId && !visited.has(b.id)) {
        visited.add(b.id);
        result.push(b.id);
        queue.push(b.id);
      }
    });
  }

  return result;
}

export function getDirectChildBranches<T extends BranchDefinition>(
  parentId: string,
  branches: T[],
): T[] {
  return branches.filter((b) => b.parentBranchId === parentId);
}

export function hasChildBranches(
  branchId: string,
  branches: BranchDefinition[],
): boolean {
  return branches.some((b) => b.parentBranchId === branchId);
}

export function getLeafBranches(branches: BranchDefinition[]): BranchDefinition[] {
  return branches.filter((b) => !b.isGroup && !hasChildBranches(b.id, branches) && b.id !== 'MAIN_RULERS');
}

export function collapseAllParentBranches(
  branches: BranchDefinition[],
): Record<string, boolean> {
  const collapsed: Record<string, boolean> = {};
  branches.forEach((b) => {
    if (hasChildBranches(b.id, branches)) {
      collapsed[b.id] = true;
    }
  });
  return collapsed;
}

function getBranchAncestorChain(
  branchId: string,
  byId: Map<string, BranchDefinition>,
): BranchDefinition[] {
  const chain: BranchDefinition[] = [];
  const visited = new Set<string>();
  let current = byId.get(branchId);

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    chain.push(current);
    current = current.parentBranchId ? byId.get(current.parentBranchId) : undefined;
  }

  return chain;
}

export function isBranchOrDescendantActive(
  branch: BranchDefinition,
  branches: BranchDefinition[],
  activeBranches: Record<string, boolean>,
): boolean {
  const descendants = getDescendantBranchIds(branch.id, branches);
  if (descendants.length === 0) {
    return activeBranches[branch.id] !== false;
  }

  const byId = new Map(branches.map((b) => [b.id, b]));
  const ownActive = !branch.isGroup && activeBranches[branch.id] !== false;
  if (ownActive) return true;

  return descendants.some((id) => {
    const desc = byId.get(id);
    return Boolean(desc && !desc.isGroup && activeBranches[desc.id] !== false);
  });
}

export function resolveEffectiveBranch(
  branchId: string,
  branches: BranchDefinition[],
  collapsedParents: Record<string, boolean> = {},
): BranchDefinition {
  const byId = new Map(branches.map((b) => [b.id, b]));
  const chain = getBranchAncestorChain(branchId, byId);
  if (chain.length === 0) {
    return branches.find((b) => b.id !== 'MAIN_RULERS' && !b.isGroup) || TIME_AXIS_BRANCH;
  }

  for (let i = chain.length - 1; i >= 1; i--) {
    if (collapsedParents[chain[i].id]) {
      return chain[i];
    }
  }

  return chain[0];
}

export function getVisibleLanes(
  branches: BranchDefinition[],
  activeBranches: Record<string, boolean>,
  collapsedParents: Record<string, boolean> = {},
): BranchDefinition[] {
  const list: BranchDefinition[] = [];
  const rulersBranch = branches.find((b) => b.id === 'MAIN_RULERS');
  if (rulersBranch && activeBranches.MAIN_RULERS !== false) {
    list.push(rulersBranch);
  }

  list.push(TIME_AXIS_BRANCH);

  const byId = new Map(branches.map((b) => [b.id, b]));

  branches.forEach((b) => {
    if (b.id === 'MAIN_RULERS') return;

    const chain = getBranchAncestorChain(b.id, byId);
    const hasCollapsedAncestor = chain.slice(1).some((anc) => Boolean(collapsedParents[anc.id]));
    if (hasCollapsedAncestor) return;

    const isParentWithChildren = hasChildBranches(b.id, branches);
    if (isParentWithChildren && collapsedParents[b.id]) {
      if (isBranchOrDescendantActive(b, branches, activeBranches)) {
        list.push(b);
      }
      return;
    }

    if (b.isGroup) return;

    if (activeBranches[b.id] !== false) {
      list.push(b);
    }
  });

  return list;
}

export function resolveEventBranch(
  ev: EnrichedEvent,
  branches: BranchDefinition[],
  collapsedParents: Record<string, boolean> = {},
): BranchDefinition {
  return resolveEffectiveBranch(ev.task, branches, collapsedParents);
}

export function isEventBranchActive(
  ev: EnrichedEvent,
  activeBranches: Record<string, boolean>,
): boolean {
  return activeBranches[ev.task] !== false;
}

export function intersectsTimeWindow(startYear: number, endYear: number, yearFrom: number, yearTo: number): boolean {
  return startYear <= yearTo && endYear >= yearFrom;
}

export function getEventEffectiveStartYear(
  ev: Pick<EnrichedEvent, 'startYear' | 'activeFrom' | 'task' | 'type' | 'syncTags'>,
  branches?: BranchDefinition[],
): number {
  if (isBiographyNode(ev, branches) && typeof ev.activeFrom === 'number') {
    return ev.activeFrom;
  }
  return ev.startYear;
}

export function getEventEffectiveEndYear(
  ev: Pick<EnrichedEvent, 'endYear' | 'activeTo' | 'task' | 'type' | 'syncTags'>,
  branches?: BranchDefinition[],
): number {
  if (isBiographyNode(ev, branches) && typeof ev.activeTo === 'number') {
    return ev.activeTo;
  }
  return ev.endYear;
}

export function getEventEffectiveStartPrecision(
  ev: EnrichedEvent,
  branches?: BranchDefinition[],
): PreciseDateParts {
  if (isBiographyNode(ev, branches) && ev.activeStartPrecision) {
    return ev.activeStartPrecision;
  }
  return ev.startPrecision;
}

export function getEventRulerSegments(ev: EnrichedEvent): RulerSpanSegment[] {
  if (ev.overlappingRulers.length === 0) return [];
  const raw = ev.overlappingRulers.map((ruler) => {
    const overlapStart = Math.max(ev.startYear, ruler.startYear);
    const overlapEnd = Math.min(ev.endYear, ruler.endYear);
    const years = Math.max(1, overlapEnd - overlapStart);
    return { ruler, overlapStart, overlapEnd, years };
  });
  const totalYears = raw.reduce((acc, item) => acc + item.years, 0) || 1;
  return raw.map((item) => ({
    ...item,
    pct: (item.years / totalYears) * 100,
  }));
}

export const DEFAULT_MAX_TIMELINE_SVG_WIDTH = 360;

export function computeBranchSubLaneLayout(
  matchingEvents: EnrichedEvent[],
  thematicLanes: BranchDefinition[],
  branches: BranchDefinition[],
  axisResolution: AxisResolution,
  timeSpineX: number,
  options?: {
    firstThematicOffset?: number;
    laneGap?: number;
    subStep?: number;
    collapsedParents?: Record<string, boolean>;
    maxSvgWidth?: number;
    maxSubLanesPerBranch?: number;
  },
): BranchSubLaneLayout {
  const laneCount = thematicLanes.length;
  const collapsedParents = options?.collapsedParents ?? {};
  const maxSvgWidth = options?.maxSvgWidth ?? DEFAULT_MAX_TIMELINE_SVG_WIDTH;

  // Адаптивный выбор плотности графа по числу видимых тематических полос
  const tierFirstOffset = laneCount >= 10 ? 20 : laneCount >= 6 ? 24 : 28;
  const tierLaneGap = laneCount >= 10 ? 12 : laneCount >= 6 ? 16 : 22;
  const tierSubStep = laneCount >= 10 ? 6 : laneCount >= 6 ? 7 : 10;
  const tierMaxSubLanes = laneCount >= 10 ? 1 : laneCount >= 6 ? 2 : 4;

  let firstThematicOffset = options?.firstThematicOffset ?? tierFirstOffset;
  let laneGap = options?.laneGap ?? tierLaneGap;
  let subStep = options?.subStep ?? tierSubStep;
  let rightPad = laneCount >= 10 ? 14 : 20;
  let effectiveMaxSubLanes = Math.max(
    1,
    options?.maxSubLanesPerBranch ?? tierMaxSubLanes,
  );

  // Предварительная группировка неатомарных событий по видимым полосам (O(E log E))
  const eventsByLaneId = new Map<string, EnrichedEvent[]>();
  matchingEvents.forEach((ev) => {
    const effStart = getEventEffectiveStartPrecision(ev, branches);
    if (isAtomicEventNode(ev, effStart, ev.endPrecision, axisResolution)) return;
    const resolvedId = resolveEventBranch(ev, branches, collapsedParents).id;
    let bucket = eventsByLaneId.get(resolvedId);
    if (!bucket) {
      bucket = [];
      eventsByLaneId.set(resolvedId, bucket);
    }
    bucket.push(ev);
  });

  eventsByLaneId.forEach((bucket) => {
    bucket.sort((a, b) => {
      const aStart = getEventEffectiveStartPrecision(a, branches).sortKey;
      const bStart = getEventEffectiveStartPrecision(b, branches).sortKey;
      if (aStart !== bStart) {
        return aStart - bStart;
      }
      if (a.endPrecision.sortKey !== b.endPrecision.sortKey) {
        return a.endPrecision.sortKey - b.endPrecision.sortKey;
      }
      return a.seq - b.seq;
    });
  });

  const assignSlotsWithCap = (maxSubLanes: number) => {
    const slots = new Map<string, number>();
    const counts = new Map<string, number>();

    thematicLanes.forEach((lane) => {
      const laneNonAtomicEvents = eventsByLaneId.get(lane.id) ?? [];
      const slotEndKeys: number[] = [];

      laneNonAtomicEvents.forEach((ev) => {
        const effStartKey = getEventEffectiveStartPrecision(ev, branches).sortKey;
        let assigned = -1;
        for (let s = 0; s < slotEndKeys.length; s++) {
          if (slotEndKeys[s] < effStartKey) {
            assigned = s;
            break;
          }
        }
        if (assigned === -1) {
          if (slotEndKeys.length < maxSubLanes) {
            assigned = slotEndKeys.length;
            slotEndKeys.push(ev.endPrecision.sortKey);
          } else {
            // Все разрешённые под-линии заняты — переиспользуем ту, которая завершается раньше остальных
            let earliestIdx = 0;
            for (let s = 1; s < slotEndKeys.length; s++) {
              if (slotEndKeys[s] < slotEndKeys[earliestIdx]) {
                earliestIdx = s;
              }
            }
            assigned = earliestIdx;
            slotEndKeys[assigned] = Math.max(slotEndKeys[assigned], ev.endPrecision.sortKey);
          }
        } else {
          slotEndKeys[assigned] = ev.endPrecision.sortKey;
        }
        slots.set(ev.id, assigned);
      });

      counts.set(lane.id, Math.max(1, slotEndKeys.length));
    });

    return { slots, counts };
  };

  const computeTotalWidth = (
    counts: Map<string, number>,
    offset: number,
    gap: number,
    step: number,
    pad: number,
  ): number => {
    if (laneCount === 0) return Math.max(112, timeSpineX + 30);
    let extraSubWidth = 0;
    thematicLanes.forEach((lane) => {
      const count = counts.get(lane.id) ?? 1;
      extraSubWidth += (count - 1) * step;
    });
    return Math.max(
      112,
      timeSpineX + offset + extraSubWidth + Math.max(0, laneCount - 1) * gap + pad,
    );
  };

  let assignedResult = assignSlotsWithCap(effectiveMaxSubLanes);
  let estimatedWidth = computeTotalWidth(
    assignedResult.counts,
    firstThematicOffset,
    laneGap,
    subStep,
    rightPad,
  );

  // Контроль бюджета ширины SVG-графа, чтобы колонка карточек событий никогда не сжималась за край экрана
  if (Number.isFinite(maxSvgWidth) && laneCount > 0 && estimatedWidth > maxSvgWidth) {
    if (effectiveMaxSubLanes > 2) {
      effectiveMaxSubLanes = 2;
      subStep = Math.min(subStep, 7);
      laneGap = Math.min(laneGap, 16);
      assignedResult = assignSlotsWithCap(effectiveMaxSubLanes);
      estimatedWidth = computeTotalWidth(
        assignedResult.counts,
        firstThematicOffset,
        laneGap,
        subStep,
        rightPad,
      );
    }

    if (estimatedWidth > maxSvgWidth && effectiveMaxSubLanes > 1) {
      effectiveMaxSubLanes = 1;
      subStep = Math.min(subStep, 6);
      laneGap = Math.min(laneGap, 12);
      assignedResult = assignSlotsWithCap(effectiveMaxSubLanes);
      estimatedWidth = computeTotalWidth(
        assignedResult.counts,
        firstThematicOffset,
        laneGap,
        subStep,
        rightPad,
      );
    }

    if (estimatedWidth > maxSvgWidth) {
      firstThematicOffset = Math.min(firstThematicOffset, 16);
      rightPad = Math.min(rightPad, 12);
      if (laneCount > 1) {
        const availableForGaps = Math.max(
          0,
          maxSvgWidth - timeSpineX - firstThematicOffset - rightPad,
        );
        laneGap = Math.max(6, Math.floor(availableForGaps / (laneCount - 1)));
      }
    }
  }

  const slotByEventId = assignedResult.slots;
  const branchLayouts = new Map<string, BranchLaneLayout>();
  let cursorX = timeSpineX + firstThematicOffset;

  thematicLanes.forEach((lane) => {
    const subLaneCount = assignedResult.counts.get(lane.id) ?? 1;
    const baseX = cursorX;
    const subXs = Array.from({ length: subLaneCount }, (_, idx) => baseX + idx * subStep);

    branchLayouts.set(lane.id, {
      branchId: lane.id,
      baseX,
      subLaneCount,
      subXs,
    });

    cursorX = baseX + (subLaneCount - 1) * subStep + laneGap;
  });

  const totalSvgWidth = Math.max(
    112,
    laneCount > 0 ? cursorX - laneGap + rightPad : timeSpineX + 30,
  );

  return {
    slotByEventId,
    branchLayouts,
    totalSvgWidth,
  };
}

export function computeRulerSubLaneLayout(
  matchingRulers: RulerPeriod[],
  hasRulersLane: boolean,
): RulerSubLaneLayout {
  const slotByRulerId = new Map<string, number>();
  const colorByRulerId = new Map<string, string>();

  if (!hasRulersLane) {
    return {
      slotByRulerId,
      colorByRulerId,
      laneCount: 0,
      railXs: [],
      timeSpineX: 22,
    };
  }

  const ordered = matchingRulers
    .map((r, idx) => ({
      ruler: r,
      idx,
      startKey: parsePreciseDate(r.startDate, r.startYear, false, {
        calendarStyle: r.calendarStyle,
        task: 'MAIN_RULERS',
      }).sortKey,
      endKey: parsePreciseDate(r.endDate, r.endYear, true, {
        calendarStyle: r.calendarStyle,
        task: 'MAIN_RULERS',
      }).sortKey,
    }))
    .sort((a, b) => {
      if (a.startKey !== b.startKey) return a.startKey - b.startKey;
      if (a.endKey !== b.endKey) return a.endKey - b.endKey;
      return a.idx - b.idx;
    });

  const slotEndKeys: number[] = [];

  ordered.forEach(({ ruler, startKey, endKey }) => {
    let assigned = -1;
    for (let s = 0; s < slotEndKeys.length; s++) {
      if (slotEndKeys[s] < startKey) {
        assigned = s;
        break;
      }
    }
    if (assigned === -1) {
      assigned = slotEndKeys.length;
      slotEndKeys.push(endKey);
    } else {
      slotEndKeys[assigned] = endKey;
    }
    slotByRulerId.set(ruler.id, assigned);
    colorByRulerId.set(ruler.id, resolveRulerColor(ruler, assigned));
  });

  const laneCount = Math.max(2, slotEndKeys.length);
  const leftPad = 16;
  const railStep = 13;
  const railXs = Array.from({ length: laneCount }, (_, idx) => leftPad + idx * railStep);
  const timeSpineX = leftPad + (laneCount - 1) * railStep + 24;

  return {
    slotByRulerId,
    colorByRulerId,
    laneCount,
    railXs,
    timeSpineX,
  };
}

const CATEGORY_META: Record<BranchCategoryKey, { label: string; order: number }> = {
  rulers: { label: 'Правители и правления', order: 1 },
  military: { label: 'Военные кампании', order: 2 },
  economy: { label: 'Экономика и реформы', order: 3 },
  world: { label: 'Мировой контекст', order: 4 },
  other: { label: 'Тематические ветки', order: 5 },
};

export function resolveBranchCategory(branch: BranchDefinition): {
  key: BranchCategoryKey;
  label: string;
  order: number;
} {
  if (branch.category && CATEGORY_META[branch.category]) {
    return { key: branch.category, ...CATEGORY_META[branch.category] };
  }
  if (branch.id === 'MAIN_RULERS') {
    return { key: 'rulers', ...CATEGORY_META.rulers };
  }
  if (branch.isMilitary) {
    return { key: 'military', ...CATEGORY_META.military };
  }
  if (
    branch.id.includes('ECO') ||
    branch.id.includes('REFORM') ||
    branch.sourceFile?.includes('economics')
  ) {
    return { key: 'economy', ...CATEGORY_META.economy };
  }
  if (branch.id.includes('WORLD') || branch.sourceFile?.includes('world')) {
    return { key: 'world', ...CATEGORY_META.world };
  }
  return { key: 'other', ...CATEGORY_META.other };
}

export interface BranchCategoryGroup<T extends BranchDefinition> {
  key: BranchCategoryKey;
  label: string;
  order: number;
  items: T[];
}

export function groupBranchesByCategory<T extends BranchDefinition>(
  branches: T[],
): BranchCategoryGroup<T>[] {
  const map = new Map<BranchCategoryKey, BranchCategoryGroup<T>>();
  branches.forEach((b) => {
    const meta = resolveBranchCategory(b);
    const existing = map.get(meta.key);
    if (existing) {
      existing.items.push(b);
    } else {
      map.set(meta.key, {
        key: meta.key,
        label: meta.label,
        order: meta.order,
        items: [b],
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.order - b.order);
}

export function computeBranchPresetMap(
  branches: Array<BranchDefinition>,
  presetId: BranchPresetId,
): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  branches.forEach((b) => {
    if (b.isGroup) return;
    if (b.detailScope === 'campaign') {
      next[b.id] = false;
      return;
    }
    const cat = resolveBranchCategory(b).key;
    if (presetId === 'all') {
      next[b.id] = true;
    } else if (presetId === 'none') {
      next[b.id] = false;
    } else if (presetId === 'overview') {
      next[b.id] =
        b.id === 'MAIN_RULERS' ||
        b.id === 'WAR_CONTINENTAL' ||
        b.id === 'REFORMS_ECO' ||
        b.id === 'DIPLOMACY_TREATIES';
    } else if (presetId === 'rulers_wars') {
      next[b.id] = cat === 'rulers' || cat === 'military' || b.id === 'DIPLOMACY_TREATIES';
    } else if (presetId === 'culture_science') {
      next[b.id] =
        b.id === 'MAIN_RULERS' ||
        b.id === 'WRITERS_BIO' ||
        b.id === 'WRITERS_WORKS' ||
        b.id === 'SCIENTISTS_BIO' ||
        b.id === 'SCIENCE_DISCOVERIES';
    } else if (presetId === 'eco_world') {
      next[b.id] = cat === 'economy' || cat === 'world' || b.id === 'MAIN_RULERS';
    } else if (presetId === 'rulers_only') {
      next[b.id] = cat === 'rulers';
    }
  });
  return next;
}
