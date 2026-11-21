import {
  ERA_SPHERE_ORDER,
  classifyEventToEraSphere,
  findMacroEraForYear,
} from '../../engine/timelineEngine';
import type {
  BranchDefinition,
  EnrichedEvent,
  EraEventSphereId,
  ResolvedMacroEra,
  RulerPeriod,
  StreamRow,
} from '../../types/timeline';

export type TimelineDisplayMode = 'graph' | 'chronicle';
export type ChronicleSphereFilter = 'all' | EraEventSphereId;

export const CHRONICLE_SPHERE_LABELS: Record<EraEventSphereId, string> = {
  wars: 'Войны',
  reforms: 'Реформы',
  diplomacy: 'Дипломатия',
  world: 'Мир',
  science: 'Наука',
};

export interface ChronicleEraChapter {
  era: ResolvedMacroEra;
  events: EnrichedEvent[];
  rulers: RulerPeriod[];
  sphereCounts: Record<EraEventSphereId, number>;
  totalEventsInEra: number;
}

export interface TimelineChronicleData {
  chapters: ChronicleEraChapter[];
  sphereTotals: Record<EraEventSphereId, number>;
  totalMatchingEvents: number;
  visibleEventsCount: number;
  orderedEventIds: string[];
  sphereByEventId: Map<string, EraEventSphereId>;
}

export interface EraJumpEntry {
  era: ResolvedMacroEra;
  eventCount: number;
  firstStreamIdx: number | null;
  firstDomId: string | null;
}

function createEmptySphereCounts(): Record<EraEventSphereId, number> {
  return {
    wars: 0,
    reforms: 0,
    diplomacy: 0,
    world: 0,
    science: 0,
  };
}

/**
 * Single-pass O(N) grouping of matching timeline events into macro-era chapters
 * classified by the 5 canonical historical spheres.
 */
export function buildTimelineChronicleData({
  matchingEvents,
  matchingRulers,
  resolvedEras,
  branches,
  sphereFilter,
}: {
  matchingEvents: EnrichedEvent[];
  matchingRulers: RulerPeriod[];
  resolvedEras: ResolvedMacroEra[];
  branches: BranchDefinition[];
  sphereFilter: ChronicleSphereFilter;
}): TimelineChronicleData {
  const branchById = new Map(branches.map((b) => [b.id, b]));
  const sphereTotals = createEmptySphereCounts();
  const sphereByEventId = new Map<string, EraEventSphereId>();

  const chapterByEraId = new Map<string, ChronicleEraChapter>();
  for (const era of resolvedEras) {
    chapterByEraId.set(era.id, {
      era,
      events: [],
      rulers: [],
      sphereCounts: createEmptySphereCounts(),
      totalEventsInEra: 0,
    });
  }

  for (const ruler of matchingRulers) {
    const targetEra =
      (ruler.eraId ? resolvedEras.find((e) => e.id === ruler.eraId) : null) ??
      findMacroEraForYear(Math.round((ruler.startYear + ruler.endYear) / 2), resolvedEras) ??
      resolvedEras[0];
    if (targetEra) {
      chapterByEraId.get(targetEra.id)?.rulers.push(ruler);
    }
  }

  const sortedEvents = [...matchingEvents].sort((a, b) => {
    if (a.startYear !== b.startYear) return a.startYear - b.startYear;
    if (a.endYear !== b.endYear) return a.endYear - b.endYear;
    return a.title.localeCompare(b.title, 'ru');
  });

  for (const ev of sortedEvents) {
    const sphere = classifyEventToEraSphere(ev, branchById, branches);
    sphereByEventId.set(ev.id, sphere);
    sphereTotals[sphere] += 1;

    const era =
      findMacroEraForYear(ev.startYear, resolvedEras) ??
      (ev.startYear < (resolvedEras[0]?.startYear ?? 0)
        ? resolvedEras[0]
        : resolvedEras[resolvedEras.length - 1]);

    if (!era) continue;
    const chapter = chapterByEraId.get(era.id);
    if (!chapter) continue;

    chapter.totalEventsInEra += 1;
    chapter.sphereCounts[sphere] += 1;

    if (sphereFilter === 'all' || sphere === sphereFilter) {
      chapter.events.push(ev);
    }
  }

  const chapters: ChronicleEraChapter[] = [];
  const orderedEventIds: string[] = [];
  let visibleEventsCount = 0;

  for (const era of resolvedEras) {
    const chapter = chapterByEraId.get(era.id);
    if (!chapter) continue;
    if (chapter.events.length === 0) continue;
    chapters.push(chapter);
    visibleEventsCount += chapter.events.length;
    for (const ev of chapter.events) {
      orderedEventIds.push(ev.id);
    }
  }

  return {
    chapters,
    sphereTotals,
    totalMatchingEvents: matchingEvents.length,
    visibleEventsCount,
    orderedEventIds,
    sphereByEventId,
  };
}

/**
 * Builds the quick Era Jump Rail entries for all macro-eras overlapping [yearFrom, yearTo],
 * including the first stream row index & DOM anchor for instant jump in Graph mode.
 */
export function buildEraJumpEntries({
  resolvedEras,
  stream,
  matchingEvents,
  yearFrom,
  yearTo,
}: {
  resolvedEras: ResolvedMacroEra[];
  stream: StreamRow[];
  matchingEvents: EnrichedEvent[];
  yearFrom: number;
  yearTo: number;
}): EraJumpEntry[] {
  const countByEraId = new Map<string, number>();
  for (const ev of matchingEvents) {
    const era = findMacroEraForYear(ev.startYear, resolvedEras);
    if (era) {
      countByEraId.set(era.id, (countByEraId.get(era.id) ?? 0) + 1);
    }
  }

  const firstStreamByEraId = new Map<string, { idx: number; domId: string | null }>();
  for (let idx = 0; idx < stream.length; idx += 1) {
    const row = stream[idx];
    if (row.rowType === 'ERA_START') {
      if (!firstStreamByEraId.has(row.era.id)) {
        firstStreamByEraId.set(row.era.id, { idx, domId: `era-${row.era.id}` });
      }
      continue;
    }

    let eraId: string | null = null;
    let domId: string | null = null;
    if (row.rowType === 'RULER_COMMIT') {
      eraId =
        row.rulerObj.eraId ??
        findMacroEraForYear(row.rulerObj.startYear, resolvedEras)?.id ??
        null;
      domId = row.rulerObj.id;
    } else if (row.rowType === 'EVENT_COMMIT') {
      eraId = findMacroEraForYear(row.eventObj.startYear, resolvedEras)?.id ?? null;
      domId = `row-${row.eventObj.id}`;
    }

    if (eraId && !firstStreamByEraId.has(eraId)) {
      firstStreamByEraId.set(eraId, { idx, domId });
    }
  }

  return resolvedEras
    .filter((era) => era.endYear >= yearFrom && era.startYear <= yearTo)
    .map((era) => {
      const firstRow = firstStreamByEraId.get(era.id);
      return {
        era,
        eventCount: countByEraId.get(era.id) ?? 0,
        firstStreamIdx: firstRow?.idx ?? null,
        firstDomId: firstRow?.domId ?? null,
      };
    });
}

/**
 * Pure previous/next stepper over an ordered list of event IDs.
 */
export function stepEventId(
  orderedIds: string[],
  currentId: string | null,
  direction: -1 | 1,
): string | null {
  if (orderedIds.length === 0) return null;
  if (!currentId) {
    return direction > 0 ? orderedIds[0] : orderedIds[orderedIds.length - 1];
  }
  const idx = orderedIds.indexOf(currentId);
  if (idx === -1) {
    return orderedIds[0];
  }
  const nextIdx = idx + direction;
  if (nextIdx < 0 || nextIdx >= orderedIds.length) {
    return null;
  }
  return orderedIds[nextIdx];
}

export { ERA_SPHERE_ORDER };
