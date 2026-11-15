import type {
  AxisResolution,
  BranchCategoryKey,
  BranchDefinition,
  BranchFile,
  BranchLaneLayout,
  BranchPresetId,
  BranchSubLaneLayout,
  DynamicWindowHotspot,
  EnrichedEvent,
  ExplicitLinkInfo,
  FilterState,
  MacroEra,
  OverlapAnalyticsSummary,
  OverlapPeakInterval,
  OverlapYearBucket,
  PreciseDateParts,
  ResolvedMacroEra,
  RulerBoundaryTick,
  RulerPeriod,
  RulerSpanSegment,
  RulersFile,
  StreamRow,
  SyncManifest,
  TimelineDataFile,
  TimelineNode,
} from '../types/timeline';

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
};

export const RULER_ALT_COLORS = ['#f59e0b', '#fcd34d'] as const;

const MONTHS_SHORT_RU = [
  'янв',
  'фев',
  'мар',
  'апр',
  'май',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

const CUSTOM_EVENT_YEARS: Record<string, [number, number]> = {
  '1746-chukchi': [1746, 1776],
  '1776-world-usa-france': [1776, 1789],
  '1813-foreign-campaigns': [1813, 1815],
  '1918-basmachi': [1918, 1934],
  '1920s-north-caucasus': [1922, 1936],
  '1934-xinjiang': [1934, 1937],
  '1944-upa-forest-brothers': [1944, 1956],
  '1973-reform-oil-boom': [1970, 1986],
  '1975-world-helsinki': [1975, 1989],
};

export function parseEventYears(periodStr: string, eventId?: string): { startYear: number; endYear: number } {
  if (eventId && CUSTOM_EVENT_YEARS[eventId]) {
    return { startYear: CUSTOM_EVENT_YEARS[eventId][0], endYear: CUSTOM_EVENT_YEARS[eventId][1] };
  }
  const matches = periodStr.match(/\b(16\d\d|17\d\d|18\d\d|19\d\d|20\d\d)\b/g);
  if (!matches || matches.length === 0) {
    return { startYear: 1700, endYear: 1700 };
  }
  const nums = matches.map(Number);
  const startYear = nums[0];
  const endYear = nums.length > 1 ? Math.max(...nums) : startYear;
  return { startYear, endYear: Math.max(startYear, endYear) };
}

export function parsePreciseDate(rawDate: string | undefined, fallbackYear: number, isEnd = false): PreciseDateParts {
  if (rawDate) {
    const match = rawDate.trim().match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
    if (match) {
      const year = Number(match[1]);
      const month = match[2] ? Math.max(1, Math.min(12, Number(match[2]))) : undefined;
      const day = match[3] ? Math.max(1, Math.min(31, Number(match[3]))) : undefined;
      const precision: AxisResolution = day !== undefined ? 'day' : month !== undefined ? 'month' : 'year';
      const sortMonth = month ?? (isEnd ? 12 : 1);
      const sortDay = day ?? (isEnd ? 28 : 1);
      return {
        year,
        month,
        day,
        precision,
        sortKey: year * 10000 + sortMonth * 100 + sortDay,
      };
    }
  }

  return {
    year: fallbackYear,
    precision: 'year',
    sortKey: fallbackYear * 10000 + (isEnd ? 1228 : 101),
  };
}

export function detectAxisResolution(yearFrom: number, yearTo: number): AxisResolution {
  const span = Math.max(0, yearTo - yearFrom);
  if (span <= 2) return 'day';
  if (span <= 12) return 'month';
  return 'year';
}

export function resolveMacroEra(era: MacroEra): ResolvedMacroEra {
  const parsed = parseEventYears(era.period || '1686–2000');
  const startYear = typeof era.startYear === 'number' ? era.startYear : parsed.startYear;
  const endYear = typeof era.endYear === 'number' ? era.endYear : parsed.endYear;

  let displayShortTitle = (era.shortTitle || '').trim();
  if (!displayShortTitle) {
    const colonIdx = era.title.indexOf(':');
    if (colonIdx > 0 && colonIdx <= 48) {
      displayShortTitle = era.title.slice(0, colonIdx).trim();
    } else if (era.title.length <= 44) {
      displayShortTitle = era.title;
    } else if (era.roman) {
      displayShortTitle = `Период ${era.roman}`;
    } else {
      displayShortTitle = era.period;
    }
  }

  return {
    ...era,
    startYear,
    endYear: Math.max(startYear, endYear),
    displayShortTitle,
  };
}

export function resolveMacroEras(macroEras: MacroEra[]): ResolvedMacroEra[] {
  return macroEras.map(resolveMacroEra).sort((a, b) => a.startYear - b.startYear);
}

export function findMacroEraForYear(year: number, eras: ResolvedMacroEra[]): ResolvedMacroEra | undefined {
  if (eras.length === 0) return undefined;
  const exact = eras.find((e) => year >= e.startYear && year <= e.endYear);
  if (exact) return exact;
  if (year < eras[0].startYear) return eras[0];
  for (let i = eras.length - 1; i >= 0; i--) {
    if (year >= eras[i].startYear) return eras[i];
  }
  return eras[eras.length - 1];
}

export function formatDateForResolution(parts: PreciseDateParts, resolution: AxisResolution): string {
  if (resolution === 'day' && parts.day !== undefined && parts.month !== undefined) {
    return `${parts.day} ${MONTHS_SHORT_RU[parts.month - 1]} ${parts.year}`;
  }
  if ((resolution === 'day' || resolution === 'month') && parts.month !== undefined) {
    return `${MONTHS_SHORT_RU[parts.month - 1]} ${parts.year}`;
  }
  return `${parts.year} г.`;
}

export function isAtomicEventNode(
  node: TimelineNode,
  startParts: PreciseDateParts,
  endParts: PreciseDateParts,
  resolution: AxisResolution,
): boolean {
  if (node.isAtomic === true) return true;
  if (endParts.year > startParts.year) return false;
  if (resolution === 'year') return true;
  const startMonth = startParts.month ?? 1;
  const endMonth = endParts.month ?? startMonth;
  if (endMonth - startMonth >= 2) return false;
  if (resolution === 'day' && startParts.day !== undefined && endParts.day !== undefined) {
    return endParts.sortKey - startParts.sortKey < 7;
  }
  return true;
}

export function getGitHash(idStr: string): string {
  let hash = 2166136261;
  for (let i = 0; i < idStr.length; i++) {
    hash ^= idStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(7, '0').slice(0, 7);
}

export function isRulersFile(file: TimelineDataFile | undefined): file is RulersFile {
  return Boolean(file && 'rulers' in file && Array.isArray(file.rulers));
}

export function isBranchFile(file: TimelineDataFile | undefined): file is BranchFile {
  return Boolean(file && 'nodes' in file && Array.isArray(file.nodes));
}

export async function fetchTimelineRepository(): Promise<{
  manifest: SyncManifest;
  files: Record<string, TimelineDataFile>;
}> {
  const manifestRes = await fetch('./data/sync.manifest.json', { cache: 'no-store' });
  if (!manifestRes.ok) {
    throw new Error(`Не удалось загрузить файл синхронизации (HTTP ${manifestRes.status})`);
  }
  const manifest = (await manifestRes.json()) as SyncManifest;
  const files: Record<string, TimelineDataFile> = {};

  await Promise.allSettled(
    manifest.mountedFiles.map(async (meta) => {
      const cleanPath = meta.path.replace(/^\.?\//, '');
      const res = await fetch(`./${cleanPath}`, { cache: 'no-store' });
      if (res.ok) {
        files[meta.path] = (await res.json()) as TimelineDataFile;
      }
    }),
  );

  return { manifest, files };
}

export function extractBranchesFromStore(
  manifest: SyncManifest,
  filesMap: Record<string, TimelineDataFile>,
): BranchDefinition[] {
  const result: BranchDefinition[] = [];
  manifest.mountedFiles.forEach((meta) => {
    if (!meta.enabled) return;
    const fileData = filesMap[meta.path];
    if (!fileData) return;
    if ('branch' in fileData && fileData.branch) {
      result.push({ ...fileData.branch, sourceFile: fileData.branch.sourceFile || meta.path });
    } else if ('branches' in fileData && Array.isArray(fileData.branches)) {
      fileData.branches.forEach((b) => {
        result.push({ ...b, sourceFile: b.sourceFile || meta.path });
      });
    }
  });
  return result;
}

export function extractRulersFromStore(
  manifest: SyncManifest,
  filesMap: Record<string, TimelineDataFile>,
): RulerPeriod[] {
  const rulersMeta = manifest.mountedFiles.find(
    (m) => m.role === 'trunk' || m.role === 'rulers_branch' || m.fileId === 'rulers',
  );
  if (!rulersMeta) return [];
  const fileData = filesMap[rulersMeta.path];
  if (isRulersFile(fileData)) {
    return fileData.rulers;
  }
  return [];
}

export function getEnrichedEvents(
  manifest: SyncManifest,
  filesMap: Record<string, TimelineDataFile>,
  rulers: RulerPeriod[],
): EnrichedEvent[] {
  const list: EnrichedEvent[] = [];
  let seq = 0;
  const resolvedEras = resolveMacroEras(manifest.macroEras || []);

  manifest.mountedFiles.forEach((fileMeta) => {
    if (
      !fileMeta.enabled ||
      fileMeta.role === 'trunk' ||
      fileMeta.role === 'rulers_branch' ||
      fileMeta.fileId === 'rulers'
    ) {
      return;
    }
    const fileObj = filesMap[fileMeta.path];
    if (!isBranchFile(fileObj)) return;

    fileObj.nodes.forEach((ev) => {
      const parsed =
        typeof ev.startYear === 'number' && typeof ev.endYear === 'number'
          ? { startYear: ev.startYear, endYear: ev.endYear }
          : parseEventYears(ev.period || '1700', ev.id);

      const startYear = parsed.startYear;
      const endYear = Math.max(startYear, parsed.endYear);
      const startPrecision = parsePreciseDate(ev.startDate, startYear, false);
      const endPrecision = parsePreciseDate(ev.endDate, endYear, true);
      const duration = endYear - startYear;
      const isAtomic = ev.isAtomic === true || (startYear === endYear && startPrecision.sortKey === endPrecision.sortKey);

      const overlappingRulers = rulers.filter((r) => r.startYear <= endYear && r.endYear >= startYear);
      if (overlappingRulers.length === 0 && rulers.length > 0) {
        overlappingRulers.push(rulers[0]);
      }

      const eraObj = findMacroEraForYear(startYear, resolvedEras);

      list.push({
        ...ev,
        sourceFile: fileMeta.path,
        seq: seq++,
        startYear,
        endYear,
        startPrecision,
        endPrecision,
        isAtomic,
        duration,
        eraId: eraObj?.id || 'ERA_1',
        eraRoman: eraObj?.roman || '',
        eraTitle: eraObj?.displayShortTitle || eraObj?.title || '',
        overlappingRulers,
        ruler: overlappingRulers.map((r) => r.shortRuler).join(' → '),
        reignPeriod:
          overlappingRulers.length > 1
            ? `${overlappingRulers[0].startYear}–${overlappingRulers[overlappingRulers.length - 1].endYear} (${overlappingRulers.length} правл.)`
            : overlappingRulers[0]?.reignPeriod || '',
        concurrentEvents: [],
        explicitLinks: [],
      });
    });
  });

  list.sort((a, b) => {
    if (a.startPrecision.sortKey !== b.startPrecision.sortKey) {
      return a.startPrecision.sortKey - b.startPrecision.sortKey;
    }
    return a.seq - b.seq;
  });

  const byId = new Map(list.map((e) => [e.id, e]));
  const crossLinks = manifest.crossLinks || [];

  list.forEach((ev) => {
    ev.concurrentEvents = list.filter(
      (other) => other.id !== ev.id && other.startYear <= ev.endYear && other.endYear >= ev.startYear,
    );

    const links: ExplicitLinkInfo[] = [];
    crossLinks.forEach((lnk) => {
      if (lnk.from === ev.id || lnk.to === ev.id) {
        const isOutgoing = lnk.from === ev.id;
        const targetId = isOutgoing ? lnk.to : lnk.from;
        const targetEvent = byId.get(targetId);
        if (targetEvent) {
          links.push({
            ...lnk,
            direction: isOutgoing ? 'outgoing' : 'incoming',
            targetEvent,
          });
        }
      }
    });
    ev.explicitLinks = links;
  });

  return list;
}

export function getVisibleLanes(
  branches: BranchDefinition[],
  activeBranches: Record<string, boolean>,
): BranchDefinition[] {
  const list: BranchDefinition[] = [];
  const rulersBranch = branches.find((b) => b.id === 'MAIN_RULERS');
  if (rulersBranch && activeBranches.MAIN_RULERS !== false) {
    list.push(rulersBranch);
  }

  // Центральная ось времени (time/main) всегда отделяет зону правителей слева от тематических веток справа
  list.push(TIME_AXIS_BRANCH);

  branches.forEach((b) => {
    if (b.id === 'MAIN_RULERS') return;
    if (activeBranches[b.id] !== false) {
      list.push(b);
    }
  });

  return list;
}

export function resolveEventBranch(
  ev: EnrichedEvent,
  branches: BranchDefinition[],
): BranchDefinition {
  return branches.find((b) => b.id === ev.task) || branches[0] || TIME_AXIS_BRANCH;
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

export function buildUnifiedTimelineStream(
  enrichedEvents: EnrichedEvent[],
  rulers: RulerPeriod[],
  manifest: SyncManifest,
  branches: BranchDefinition[],
  filters: FilterState,
): {
  stream: StreamRow[];
  matchingEvents: EnrichedEvent[];
  matchingRulers: RulerPeriod[];
  focusedEvent: EnrichedEvent | null;
  effectiveYearFrom: number;
  effectiveYearTo: number;
  axisResolution: AxisResolution;
} {
  const q = filters.searchQuery.trim().toLowerCase();
  const focusTarget = filters.focusedEventId
    ? (enrichedEvents.find((ev) => ev.id === filters.focusedEventId) ?? null)
    : null;

  let matchingEvents: EnrichedEvent[] = [];
  let matchingRulers: RulerPeriod[] = [];
  let effectiveYearFrom = filters.yearFrom;
  let effectiveYearTo = filters.yearTo;

  const rulersFileMeta = manifest.mountedFiles.find(
    (f) => f.role === 'trunk' || f.role === 'rulers_branch' || f.fileId === 'rulers',
  );
  const isRulersFileMounted = rulersFileMeta ? rulersFileMeta.enabled : true;

  const resolvedEras = resolveMacroEras(manifest.macroEras || []);
  const selectedEraObj =
    filters.selectedEra !== 'ALL'
      ? resolvedEras.find((e) => e.id === filters.selectedEra) ?? null
      : null;

  if (focusTarget) {
    const allowedIds = new Set<string>([focusTarget.id]);
    focusTarget.explicitLinks.forEach((lnk) => {
      allowedIds.add(lnk.targetEvent.id);
    });
    if (filters.focusScope === 'sync_and_concurrent') {
      focusTarget.concurrentEvents.forEach((ce) => {
        allowedIds.add(ce.id);
      });
    }

    matchingEvents = enrichedEvents.filter((ev) => allowedIds.has(ev.id));

    const touchedRulerIds = new Set<string>();
    matchingEvents.forEach((ev) => {
      ev.overlappingRulers.forEach((r) => touchedRulerIds.add(r.id));
    });

    matchingRulers = rulers.filter((r) => {
      if (!isRulersFileMounted || filters.activeBranches.MAIN_RULERS === false) return false;
      return touchedRulerIds.has(r.id);
    });

    const minEventYear = matchingEvents.reduce((m, e) => Math.min(m, e.startYear), focusTarget.startYear);
    const maxEventYear = matchingEvents.reduce((m, e) => Math.max(m, e.endYear), focusTarget.endYear);
    effectiveYearFrom = Math.max(1686, minEventYear);
    effectiveYearTo = Math.min(2000, Math.max(effectiveYearFrom + 1, maxEventYear));
  } else {
    matchingEvents = enrichedEvents.filter((ev) => {
      if (!isEventBranchActive(ev, filters.activeBranches)) return false;
      if (!intersectsTimeWindow(ev.startYear, ev.endYear, filters.yearFrom, filters.yearTo)) return false;
      if (selectedEraObj) {
        const inEra =
          ev.eraId === selectedEraObj.id ||
          intersectsTimeWindow(ev.startYear, ev.endYear, selectedEraObj.startYear, selectedEraObj.endYear);
        if (!inEra) return false;
      }
      if (filters.onlyWithSyncLinks && ev.explicitLinks.length === 0) return false;
      if (filters.selectedReign !== 'ALL') {
        const matchesRuler = ev.overlappingRulers.some((r) => r.id === filters.selectedReign);
        if (!matchesRuler) return false;
      }
      if (!q) return true;
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.subtitle.toLowerCase().includes(q) ||
        ev.details.toLowerCase().includes(q) ||
        ev.period.toLowerCase().includes(q) ||
        ev.ruler.toLowerCase().includes(q) ||
        ev.region.toLowerCase().includes(q) ||
        Boolean(ev.subEvents?.some((s) => s.title.toLowerCase().includes(q) || s.text.toLowerCase().includes(q)))
      );
    });

    matchingRulers = rulers.filter((r) => {
      if (!isRulersFileMounted || filters.activeBranches.MAIN_RULERS === false) return false;
      if (!intersectsTimeWindow(r.startYear, r.endYear, filters.yearFrom, filters.yearTo)) return false;
      if (selectedEraObj) {
        const inEra =
          r.eraId === selectedEraObj.id ||
          intersectsTimeWindow(r.startYear, r.endYear, selectedEraObj.startYear, selectedEraObj.endYear);
        if (!inEra) return false;
      }
      if (filters.selectedReign !== 'ALL' && r.id !== filters.selectedReign) return false;
      if (!q && !filters.onlyWithSyncLinks) return true;
      const selfMatch = q !== '' && (r.ruler.toLowerCase().includes(q) || r.reignTitle.toLowerCase().includes(q));
      const hasMatchingEvent = matchingEvents.some((ev) => ev.overlappingRulers.some((or) => or.id === r.id));
      return selfMatch || hasMatchingEvent;
    });
  }

  const axisResolution = detectAxisResolution(effectiveYearFrom, effectiveYearTo);
  const stream: StreamRow[] = [];

  resolvedEras.forEach((era) => {
    const y = era.startYear;
    const hasItemsInEra =
      matchingEvents.some(
        (e) => e.eraId === era.id || intersectsTimeWindow(e.startYear, e.endYear, era.startYear, era.endYear),
      ) ||
      matchingRulers.some(
        (r) => r.eraId === era.id || intersectsTimeWindow(r.startYear, r.endYear, era.startYear, era.endYear),
      );
    if (hasItemsInEra && y >= effectiveYearFrom && y <= effectiveYearTo) {
      stream.push({
        rowType: 'ERA_START',
        year: y,
        sortKey: y * 10000 + 100,
        priority: 1,
        era,
      });
    }
  });

  // В узком окне (месяцы / дни) добавляем опорные хронологические метки на центральной оси времени
  if (!focusTarget && (axisResolution === 'month' || axisResolution === 'day')) {
    const stepMonths = axisResolution === 'day' ? 1 : 6;
    for (let y = effectiveYearFrom; y <= effectiveYearTo; y++) {
      for (let m = 1; m <= 12; m += stepMonths) {
        const tickSortKey = y * 10000 + m * 100 + 1;
        const label =
          m === 1
            ? `${y} г. · янв`
            : `${MONTHS_SHORT_RU[m - 1]} ${y}`;
        stream.push({
          rowType: 'TIME_TICK',
          year: y,
          month: m,
          label,
          sortKey: tickSortKey,
          priority: 2,
        });
      }
    }
  }

  const rulerIndexById = new Map(rulers.map((r, i) => [r.id, i]));

  matchingRulers.forEach((rulerObj) => {
    const rIdx = rulerIndexById.get(rulerObj.id) ?? 0;
    const rulerColor = RULER_ALT_COLORS[rIdx % RULER_ALT_COLORS.length];
    const startParts = parsePreciseDate(rulerObj.startDate, rulerObj.startYear, false);
    const endParts = parsePreciseDate(rulerObj.endDate, rulerObj.endYear, true);

    const startedBeforeWindow = !focusTarget && rulerObj.startYear < effectiveYearFrom;
    const displayYear = startedBeforeWindow ? effectiveYearFrom : rulerObj.startYear;
    const displayParts = startedBeforeWindow
      ? parsePreciseDate(undefined, effectiveYearFrom, false)
      : startParts;

    stream.push({
      rowType: 'RULER_COMMIT',
      year: displayYear,
      sortKey: displayParts.sortKey,
      dateLabel: startedBeforeWindow
        ? `${effectiveYearFrom} г. (с ${rulerObj.startYear})`
        : formatDateForResolution(startParts, axisResolution),
      priority: 4,
      startedBeforeWindow,
      rulerIndex: rIdx,
      rulerColor,
      rulerObj,
    });

    if (filters.showEndNodes && (focusTarget || rulerObj.endYear <= effectiveYearTo)) {
      stream.push({
        rowType: 'RULER_END',
        year: rulerObj.endYear,
        sortKey: endParts.sortKey,
        dateLabel: formatDateForResolution(endParts, axisResolution),
        priority: 3,
        rulerIndex: rIdx,
        rulerColor,
        rulerObj,
      });
    }
  });

  matchingEvents.forEach((eventObj) => {
    const isAtomicInView = isAtomicEventNode(
      eventObj,
      eventObj.startPrecision,
      eventObj.endPrecision,
      axisResolution,
    );
    const startedBeforeWindow = !focusTarget && eventObj.startYear < effectiveYearFrom;
    const displayYear = startedBeforeWindow ? effectiveYearFrom : eventObj.startYear;
    const displayParts = startedBeforeWindow
      ? parsePreciseDate(undefined, effectiveYearFrom, false)
      : eventObj.startPrecision;

    stream.push({
      rowType: 'EVENT_COMMIT',
      year: displayYear,
      sortKey: displayParts.sortKey,
      dateLabel: startedBeforeWindow
        ? `${effectiveYearFrom} г. (с ${eventObj.startYear})`
        : formatDateForResolution(eventObj.startPrecision, axisResolution),
      priority: 5,
      seq: eventObj.seq,
      startedBeforeWindow,
      isAtomicInView,
      eventObj,
    });

    if (
      !isAtomicInView &&
      filters.showEndNodes &&
      (focusTarget || eventObj.endYear <= effectiveYearTo)
    ) {
      stream.push({
        rowType: 'EVENT_END',
        year: eventObj.endYear,
        sortKey: eventObj.endPrecision.sortKey,
        dateLabel: formatDateForResolution(eventObj.endPrecision, axisResolution),
        priority: 6,
        seq: eventObj.seq,
        eventObj,
      });
    }
  });

  stream.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    if (a.priority !== b.priority) return a.priority - b.priority;
    const seqA = 'seq' in a ? a.seq : 0;
    const seqB = 'seq' in b ? b.seq : 0;
    return seqA - seqB;
  });

  return {
    stream,
    matchingEvents,
    matchingRulers,
    focusedEvent: focusTarget,
    effectiveYearFrom,
    effectiveYearTo,
    axisResolution,
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
    const cat = resolveBranchCategory(b).key;
    if (presetId === 'all') {
      next[b.id] = true;
    } else if (presetId === 'rulers_wars') {
      next[b.id] = cat === 'rulers' || cat === 'military';
    } else if (presetId === 'eco_world') {
      next[b.id] = cat === 'economy' || cat === 'world';
    } else if (presetId === 'rulers_only') {
      next[b.id] = cat === 'rulers';
    }
  });
  return next;
}

export function computeOverlapAnalytics(
  matchingEvents: EnrichedEvent[],
  matchingRulers: RulerPeriod[],
  thematicLanesCount: number,
  yearFrom: number,
  yearTo: number,
): OverlapAnalyticsSummary {
  const safeFrom = Math.min(yearFrom, yearTo);
  const safeTo = Math.max(safeFrom + 1, yearTo);

  const countsByYear: Array<{ year: number; count: number }> = [];
  let maxConcurrency = 0;

  for (let y = safeFrom; y <= safeTo; y++) {
    let count = 0;
    for (let i = 0; i < matchingEvents.length; i++) {
      const ev = matchingEvents[i];
      if (ev.startYear <= y && ev.endYear >= y) {
        count++;
      }
    }
    if (count > maxConcurrency) {
      maxConcurrency = count;
    }
    countsByYear.push({ year: y, count });
  }

  const hasMeaningfulPeak = maxConcurrency >= 2;
  const yearBuckets: OverlapYearBucket[] = countsByYear.map((b) => ({
    year: b.year,
    count: b.count,
    isPeak: hasMeaningfulPeak && b.count === maxConcurrency,
  }));

  const peakIntervals: OverlapPeakInterval[] = [];
  let currentPeak: OverlapPeakInterval | null = null;

  yearBuckets.forEach((b) => {
    if (b.isPeak) {
      if (currentPeak && b.year === currentPeak.toYear + 1) {
        currentPeak.toYear = b.year;
      } else {
        if (currentPeak) peakIntervals.push(currentPeak);
        currentPeak = { fromYear: b.year, toYear: b.year, maxCount: maxConcurrency };
      }
    } else if (currentPeak) {
      peakIntervals.push(currentPeak);
      currentPeak = null;
    }
  });
  if (currentPeak) {
    peakIntervals.push(currentPeak);
  }

  let primaryPeak: OverlapPeakInterval | null = null;
  peakIntervals.forEach((interval) => {
    if (!primaryPeak) {
      primaryPeak = interval;
    } else {
      const len = interval.toYear - interval.fromYear;
      const bestLen = primaryPeak.toYear - primaryPeak.fromYear;
      if (len > bestLen) {
        primaryPeak = interval;
      }
    }
  });

  const seenBoundaryYears = new Set<number>();
  const rulerBoundaries: RulerBoundaryTick[] = [];
  matchingRulers.forEach((r) => {
    if (r.startYear > safeFrom && r.startYear < safeTo && !seenBoundaryYears.has(r.startYear)) {
      seenBoundaryYears.add(r.startYear);
      rulerBoundaries.push({
        year: r.startYear,
        rulerId: r.id,
        shortRuler: r.shortRuler,
        reignPeriod: r.reignPeriod,
      });
    }
  });
  rulerBoundaries.sort((a, b) => a.year - b.year);

  const multiReignCount = matchingEvents.filter((ev) => ev.overlappingRulers.length > 1).length;

  return {
    yearFrom: safeFrom,
    yearTo: safeTo,
    maxConcurrency,
    peakIntervals,
    primaryPeak,
    yearBuckets,
    rulerBoundaries,
    multiReignCount,
    totalEventsCount: matchingEvents.length,
    activeLanesCount: thematicLanesCount,
  };
}

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
  },
): BranchSubLaneLayout {
  const firstThematicX = timeSpineX + (options?.firstThematicOffset ?? 28);
  const laneGap = options?.laneGap ?? 22;
  const subStep = options?.subStep ?? 10;

  const slotByEventId = new Map<string, number>();
  const branchLayouts = new Map<string, BranchLaneLayout>();

  let cursorX = firstThematicX;

  thematicLanes.forEach((lane) => {
    const laneNonAtomicEvents = matchingEvents
      .filter(
        (ev) =>
          resolveEventBranch(ev, branches).id === lane.id &&
          !isAtomicEventNode(ev, ev.startPrecision, ev.endPrecision, axisResolution),
      )
      .sort((a, b) => {
        if (a.startPrecision.sortKey !== b.startPrecision.sortKey) {
          return a.startPrecision.sortKey - b.startPrecision.sortKey;
        }
        if (a.endPrecision.sortKey !== b.endPrecision.sortKey) {
          return a.endPrecision.sortKey - b.endPrecision.sortKey;
        }
        return a.seq - b.seq;
      });

    const slotEndKeys: number[] = [];

    laneNonAtomicEvents.forEach((ev) => {
      let assigned = -1;
      for (let s = 0; s < slotEndKeys.length; s++) {
        if (slotEndKeys[s] < ev.startPrecision.sortKey) {
          assigned = s;
          break;
        }
      }
      if (assigned === -1) {
        assigned = slotEndKeys.length;
        slotEndKeys.push(ev.endPrecision.sortKey);
      } else {
        slotEndKeys[assigned] = ev.endPrecision.sortKey;
      }
      slotByEventId.set(ev.id, assigned);
    });

    const subLaneCount = Math.max(1, slotEndKeys.length);
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
    thematicLanes.length > 0 ? cursorX - laneGap + 20 : timeSpineX + 30,
  );

  return {
    slotByEventId,
    branchLayouts,
    totalSvgWidth,
  };
}

export function computeDynamicWindowHotspots(
  enrichedEvents: EnrichedEvent[],
  activeBranches: Record<string, boolean>,
  minYear = 1686,
  maxYear = 2000,
  maxHotspots = 4,
): DynamicWindowHotspot[] {
  const branchEvents = enrichedEvents.filter((ev) => isEventBranchActive(ev, activeBranches));
  if (branchEvents.length === 0) return [];

  const yearStats: Array<{
    year: number;
    activeCount: number;
    startCount: number;
    preciseCount: number;
    score: number;
  }> = [];

  for (let y = minYear; y <= maxYear; y++) {
    let activeCount = 0;
    let startCount = 0;
    let preciseCount = 0;

    for (let i = 0; i < branchEvents.length; i++) {
      const ev = branchEvents[i];
      if (ev.startYear <= y && ev.endYear >= y) {
        activeCount++;
        if (ev.startYear === y) {
          startCount++;
        }
        if (
          ev.duration <= 4 ||
          ev.startPrecision.precision !== 'year' ||
          ev.endPrecision.precision !== 'year'
        ) {
          preciseCount++;
        }
      }
    }

    if (activeCount > 0) {
      const score = activeCount * 10 + startCount * 4 + preciseCount * 2;
      yearStats.push({ year: y, activeCount, startCount, preciseCount, score });
    }
  }

  if (yearStats.length === 0) return [];

  const statsByYear = new Map(yearStats.map((s) => [s.year, s]));
  const sortedCandidates = [...yearStats].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.activeCount !== a.activeCount) return b.activeCount - a.activeCount;
    if (b.startCount !== a.startCount) return b.startCount - a.startCount;
    return a.year - b.year;
  });

  const minAnchorGap = 20;
  const pickedAnchors: number[] = [];

  for (let i = 0; i < sortedCandidates.length && pickedAnchors.length < maxHotspots; i++) {
    const candidate = sortedCandidates[i];
    if (pickedAnchors.every((anchor) => Math.abs(anchor - candidate.year) >= minAnchorGap)) {
      pickedAnchors.push(candidate.year);
    }
  }

  // Если остался слот, подхватываем плотное короткое окно (≤ 3 лет) с высокой концентрацией событий
  if (pickedAnchors.length < maxHotspots) {
    const sharpCandidate = sortedCandidates.find(
      (c) =>
        c.preciseCount >= 2 &&
        pickedAnchors.every((anchor) => Math.abs(anchor - c.year) >= 12),
    );
    if (sharpCandidate) {
      pickedAnchors.push(sharpCandidate.year);
    }
  }

  const rawHotspots: DynamicWindowHotspot[] = [];

  pickedAnchors.forEach((peakYear) => {
    const peakStat = statsByYear.get(peakYear);
    if (!peakStat) return;

    const plateauThreshold = Math.max(1, peakStat.activeCount - 1);
    let plateauFrom = peakYear;
    let plateauTo = peakYear;

    while (
      plateauFrom > minYear &&
      peakYear - plateauFrom < 5 &&
      (statsByYear.get(plateauFrom - 1)?.activeCount ?? 0) >= plateauThreshold
    ) {
      plateauFrom--;
    }
    while (
      plateauTo < maxYear &&
      plateauTo - peakYear < 5 &&
      (statsByYear.get(plateauTo + 1)?.activeCount ?? 0) >= plateauThreshold
    ) {
      plateauTo++;
    }

    const coreEvents = branchEvents.filter((ev) =>
      intersectsTimeWindow(ev.startYear, ev.endYear, plateauFrom, plateauTo),
    );
    const shortCore = coreEvents.filter((ev) => ev.duration <= 10);

    let fromYear = plateauFrom;
    let toYear = plateauTo;

    if (shortCore.length >= 2) {
      const minShortStart = Math.min(...shortCore.map((e) => e.startYear));
      const maxShortEnd = Math.max(...shortCore.map((e) => e.endYear));
      fromYear = Math.max(minYear, plateauFrom - 2, minShortStart);
      toYear = Math.min(maxYear, plateauTo + 2, maxShortEnd);
    } else if (coreEvents.length > 0) {
      const minCoreStart = Math.min(...coreEvents.map((e) => e.startYear));
      const maxCoreEnd = Math.max(...coreEvents.map((e) => e.endYear));
      fromYear = Math.max(minYear, plateauFrom - 2, minCoreStart);
      toYear = Math.min(maxYear, plateauTo + 2, maxCoreEnd);
    }

    if (toYear - fromYear > 14) {
      fromYear = Math.max(minYear, peakYear - 6);
      toYear = Math.min(maxYear, peakYear + 6);
    }

    if (fromYear === toYear) {
      const hasSubYearDetail = coreEvents.some(
        (ev) => ev.startPrecision.precision !== 'year' || ev.endPrecision.precision !== 'year',
      );
      if (!hasSubYearDetail) {
        toYear = Math.min(maxYear, fromYear + 1);
      }
    }

    if (toYear < fromYear) {
      toYear = fromYear;
    }

    const eventsInWindow = branchEvents.filter((ev) =>
      intersectsTimeWindow(ev.startYear, ev.endYear, fromYear, toYear),
    );
    if (eventsInWindow.length === 0) return;

    let windowPeak = 0;
    for (let y = fromYear; y <= toYear; y++) {
      const cnt = statsByYear.get(y)?.activeCount ?? 0;
      if (cnt > windowPeak) windowPeak = cnt;
    }

    const rankedTitles = [...eventsInWindow]
      .sort((a, b) => {
        const aAtPeak = a.startYear <= peakYear && a.endYear >= peakYear ? 1 : 0;
        const bAtPeak = b.startYear <= peakYear && b.endYear >= peakYear ? 1 : 0;
        if (bAtPeak !== aAtPeak) return bAtPeak - aAtPeak;
        if (a.duration !== b.duration) return a.duration - b.duration;
        return a.seq - b.seq;
      })
      .slice(0, 3)
      .map((ev) => ev.title);

    rawHotspots.push({
      id: `${fromYear}-${toYear}`,
      fromYear,
      toYear,
      peakCount: windowPeak,
      eventCount: eventsInWindow.length,
      resolution: detectAxisResolution(fromYear, toYear),
      previewTitles: rankedTitles,
    });
  });

  // Дедупликация сильно перекрывающихся вычисленных окон и сортировка по хронологии
  const deduped: DynamicWindowHotspot[] = [];
  rawHotspots.forEach((candidate) => {
    const overlapsExisting = deduped.some((existing) => {
      const overlapStart = Math.max(existing.fromYear, candidate.fromYear);
      const overlapEnd = Math.min(existing.toYear, candidate.toYear);
      if (overlapEnd < overlapStart) return false;
      const overlapLen = overlapEnd - overlapStart + 1;
      const minLen = Math.min(
        existing.toYear - existing.fromYear + 1,
        candidate.toYear - candidate.fromYear + 1,
      );
      return overlapLen / Math.max(1, minLen) > 0.6;
    });
    if (!overlapsExisting) {
      deduped.push(candidate);
    }
  });

  return deduped.sort((a, b) => a.fromYear - b.fromYear);
}

export interface MacroEraSummaryData {
  era: ResolvedMacroEra;
  rulers: Array<{ ruler: RulerPeriod; eventCount: number }>;
  events: EnrichedEvent[];
  branchTags: Array<{ branch: BranchDefinition; count: number }>;
  typeTags: Array<{ type: string; count: number }>;
  carryOverBeforeIds: Set<string>;
  carryOverAfterIds: Set<string>;
}

export function getMacroEraSummaryData(
  era: ResolvedMacroEra,
  rulers: RulerPeriod[],
  enrichedEvents: EnrichedEvent[],
  branches: BranchDefinition[],
): MacroEraSummaryData {
  const events = enrichedEvents.filter(
    (ev) =>
      ev.eraId === era.id || intersectsTimeWindow(ev.startYear, ev.endYear, era.startYear, era.endYear),
  );

  const eraRulersRaw = rulers.filter(
    (r) => r.eraId === era.id || intersectsTimeWindow(r.startYear, r.endYear, era.startYear, era.endYear),
  );

  const rulersWithCounts = eraRulersRaw.map((ruler) => ({
    ruler,
    eventCount: events.filter((ev) => ev.overlappingRulers.some((or) => or.id === ruler.id)).length,
  }));

  const branchCountMap = new Map<string, number>();
  const typeCountMap = new Map<string, number>();
  const carryOverBeforeIds = new Set<string>();
  const carryOverAfterIds = new Set<string>();

  events.forEach((ev) => {
    const resolvedBranch = resolveEventBranch(ev, branches);
    branchCountMap.set(resolvedBranch.id, (branchCountMap.get(resolvedBranch.id) || 0) + 1);

    const typeLabel = (ev.type || 'Событие').trim();
    typeCountMap.set(typeLabel, (typeCountMap.get(typeLabel) || 0) + 1);

    if (ev.startYear < era.startYear) {
      carryOverBeforeIds.add(ev.id);
    }
    if (ev.endYear > era.endYear) {
      carryOverAfterIds.add(ev.id);
    }
  });

  const branchTags: Array<{ branch: BranchDefinition; count: number }> = [];
  branches.forEach((b) => {
    const count = branchCountMap.get(b.id) || 0;
    if (count > 0) {
      branchTags.push({ branch: b, count });
    }
  });

  const typeTags = Array.from(typeCountMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.type.localeCompare(b.type, 'ru')));

  return {
    era,
    rulers: rulersWithCounts,
    events,
    branchTags,
    typeTags,
    carryOverBeforeIds,
    carryOverAfterIds,
  };
}





