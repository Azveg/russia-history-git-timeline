import type {
  AxisResolution,
  BranchCategoryKey,
  BranchDefinition,
  BranchFile,
  BranchLaneLayout,
  BranchPresetId,
  BranchSubLaneLayout,
  CrossLink,
  DensityBin,
  DynamicWindowHotspot,
  EnrichedEvent,
  ExplicitLinkInfo,
  FilterState,
  MacroEra,
  ModulesIndexFile,
  MountedFileMeta,
  OverlapAnalyticsSummary,
  OverlapPeakInterval,
  OverlapYearBucket,
  PreciseDateParts,
  ResolvedMacroEra,
  RetrospectiveLinkInfo,
  RulerBoundaryTick,
  RulerPeriod,
  RulerSpanSegment,
  RulerSubLaneLayout,
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
  const matches = periodStr.match(/\b(\d{3,4})\b/g);
  const nums = (matches || []).map(Number).filter((n) => n >= 100 && n <= 2100);
  if (nums.length === 0) {
    return { startYear: 1700, endYear: 1700 };
  }
  const startYear = nums[0];
  const endYear = nums.length > 1 ? Math.max(...nums) : startYear;
  return { startYear, endYear: Math.max(startYear, endYear) };
}

export function parsePreciseDate(rawDate: string | undefined, fallbackYear: number, isEnd = false): PreciseDateParts {
  if (rawDate) {
    const match = rawDate.trim().match(/^(\d{3,4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
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

export function resolveMacroEra(era: MacroEra, idx = 0): ResolvedMacroEra {
  const parsed = parseEventYears(era.period || '862–2000');
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
    index: idx + 1,
  };
}

export function resolveMacroEras(macroEras: MacroEra[]): ResolvedMacroEra[] {
  const sorted = [...macroEras].sort((a, b) => {
    const aStart = typeof a.startYear === 'number' ? a.startYear : parseEventYears(a.period || '862').startYear;
    const bStart = typeof b.startYear === 'number' ? b.startYear : parseEventYears(b.period || '862').startYear;
    return aStart - bStart;
  });
  return sorted.map((era, idx) => resolveMacroEra(era, idx));
}

export function findMacroEraForYear(
  year: number,
  eras: ResolvedMacroEra[],
  month?: number,
): ResolvedMacroEra | undefined {
  if (eras.length === 0) return undefined;
  const matches = eras.filter((e) => year >= e.startYear && year <= e.endYear);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    if (month !== undefined && month <= 6) {
      return matches[0];
    }
    if (year === 1917 && month !== undefined && month <= 9) {
      return matches[0];
    }
    return matches[matches.length - 1];
  }
  if (year < eras[0].startYear) return eras[0];
  for (let i = eras.length - 1; i >= 0; i--) {
    if (year >= eras[i].startYear) return eras[i];
  }
  return eras[eras.length - 1];
}

export function doesIntervalBelongToEra(
  itemStart: number,
  itemEnd: number,
  itemEraId: string,
  era: ResolvedMacroEra,
): boolean {
  if (itemEnd > itemStart) {
    return Math.min(itemEnd, era.endYear) - Math.max(itemStart, era.startYear) > 0;
  }
  if (itemStart > era.startYear && itemStart < era.endYear) {
    return true;
  }
  if (itemStart === era.startYear || itemStart === era.endYear) {
    return itemEraId === era.id;
  }
  return false;
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

function formatCompactAxisDate(parts: PreciseDateParts, resolution: AxisResolution): string {
  if (resolution === 'day' && parts.day !== undefined && parts.month !== undefined) {
    return `${parts.day} ${MONTHS_SHORT_RU[parts.month - 1]} ${parts.year}`;
  }
  if ((resolution === 'day' || resolution === 'month') && parts.month !== undefined) {
    return `${MONTHS_SHORT_RU[parts.month - 1]} ${parts.year}`;
  }
  return `${parts.year}`;
}

export function formatAxisGutterDate(
  row: StreamRow,
  resolution: AxisResolution,
): { label: string; title: string } {
  if (row.rowType === 'ERA_START') {
    const resolved = resolveMacroEra(row.era);
    return {
      label: `${row.year}`,
      title: `Рубеж периода: ${resolved.displayShortTitle} (${resolved.period})`,
    };
  }

  if (row.rowType === 'TIME_TICK') {
    const mIdx = Math.max(0, Math.min(11, (row.month ?? 1) - 1));
    return {
      label: `${MONTHS_SHORT_RU[mIdx]} ${row.year}`,
      title: `Опорная отметка оси времени: ${row.label}`,
    };
  }

  if (row.rowType === 'RULER_COMMIT') {
    if (row.startedBeforeWindow) {
      return {
        label: `с ${row.rulerObj.startYear}`,
        title: `Правление ${row.rulerObj.shortRuler} началось в ${row.rulerObj.startYear} г. (до начала окна)`,
      };
    }
    const parts = parsePreciseDate(row.rulerObj.startDate, row.rulerObj.startYear, false);
    return {
      label: formatCompactAxisDate(parts, resolution),
      title: `Начало правления (${row.rulerObj.shortRuler}): ${formatDateForResolution(parts, resolution)}`,
    };
  }

  if (row.rowType === 'RULER_END') {
    const parts = parsePreciseDate(row.rulerObj.endDate, row.rulerObj.endYear, true);
    return {
      label: formatCompactAxisDate(parts, resolution),
      title: `Слияние ветки правления (${row.rulerObj.shortRuler}): ${formatDateForResolution(parts, resolution)}`,
    };
  }

  if (row.rowType === 'EVENT_COMMIT') {
    if (row.startedBeforeWindow) {
      return {
        label: `с ${row.eventObj.startYear}`,
        title: `Процесс начался в ${row.eventObj.startYear} г. (продолжается в окне): ${row.eventObj.title}`,
      };
    }
    const parts = row.eventObj.startPrecision;
    const approxNote =
      parts.precision === 'year' && resolution !== 'year' ? ' (в источнике указан только год)' : '';
    return {
      label: formatCompactAxisDate(parts, resolution),
      title: `${row.isAtomicInView ? 'Событие' : 'Ответвление'}: ${formatDateForResolution(parts, resolution)}${approxNote} — ${row.eventObj.title}`,
    };
  }

  // EVENT_END
  const parts = row.eventObj.endPrecision;
  const approxNote =
    parts.precision === 'year' && resolution !== 'year' ? ' (в источнике указан только год)' : '';
  return {
    label: formatCompactAxisDate(parts, resolution),
    title: `Слияние процесса: ${formatDateForResolution(parts, resolution)}${approxNote} — ${row.eventObj.title}`,
  };
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

const FALLBACK_BRANCH_COLORS = [
  '#38bdf8',
  '#34d399',
  '#a78bfa',
  '#fb923c',
  '#f472b6',
  '#2dd4bf',
  '#60a5fa',
  '#facc15',
] as const;

function pickFallbackBranchColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_BRANCH_COLORS[hash % FALLBACK_BRANCH_COLORS.length];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function sanitizeBranchDefinition(raw: unknown, fallbackPath: string): BranchDefinition | null {
  if (!isPlainRecord(raw)) return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  if (!id) return null;

  const rawLabel = typeof raw.label === 'string' ? raw.label.trim() : '';
  const rawShort = typeof raw.short === 'string' ? raw.short.trim() : '';
  const label = rawLabel || rawShort || id;
  const short = rawShort || id.toLowerCase();
  const gitName =
    typeof raw.gitName === 'string' && raw.gitName.trim()
      ? raw.gitName.trim()
      : `branch/${short.toLowerCase().replace(/\s+/g, '-')}`;
  const description = typeof raw.description === 'string' ? raw.description.trim() : '';
  const color =
    typeof raw.color === 'string' && raw.color.trim()
      ? raw.color.trim()
      : pickFallbackBranchColor(id);
  const badgeClass =
    typeof raw.badgeClass === 'string' && raw.badgeClass.trim()
      ? raw.badgeClass.trim()
      : 'bg-slate-500/15 text-slate-300 border-slate-500/40';
  const parentBranchId =
    typeof raw.parentBranchId === 'string' && raw.parentBranchId.trim() && raw.parentBranchId.trim() !== id
      ? raw.parentBranchId.trim()
      : undefined;

  const validCategory =
    raw.category === 'rulers' ||
    raw.category === 'military' ||
    raw.category === 'economy' ||
    raw.category === 'world' ||
    raw.category === 'other'
      ? raw.category
      : undefined;

  return {
    id,
    gitName,
    label,
    short,
    category: validCategory,
    sourceFile: typeof raw.sourceFile === 'string' && raw.sourceFile.trim() ? raw.sourceFile.trim() : fallbackPath,
    description,
    color,
    badgeClass,
    isMilitary: Boolean(raw.isMilitary),
    alwaysTrunk: raw.alwaysTrunk === true ? true : undefined,
    parentBranchId,
    isGroup: raw.isGroup === true ? true : undefined,
    defaultEnabled: raw.defaultEnabled === false ? false : raw.defaultEnabled === true ? true : undefined,
    defaultCollapsedOnTimeline: raw.defaultCollapsedOnTimeline === true ? true : undefined,
  };
}

function sanitizeTimelineNode(raw: unknown, fallbackTask?: string): TimelineNode | null {
  if (!isPlainRecord(raw)) return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const rawTask = typeof raw.task === 'string' ? raw.task.trim() : '';
  const task = rawTask || fallbackTask || '';

  const hasPeriod = typeof raw.period === 'string' && raw.period.trim().length > 0;
  const hasStartYear = typeof raw.startYear === 'number' && Number.isFinite(raw.startYear);

  if (!id || !title || !task || (!hasPeriod && !hasStartYear)) {
    return null;
  }

  const period = hasPeriod
    ? (raw.period as string).trim()
    : typeof raw.endYear === 'number' && Number.isFinite(raw.endYear) && raw.endYear !== raw.startYear
      ? `${raw.startYear}–${raw.endYear}`
      : `${raw.startYear}`;

  const subEvents = Array.isArray(raw.subEvents)
    ? raw.subEvents
        .filter((se): se is Record<string, unknown> => isPlainRecord(se) && typeof se.title === 'string')
        .map((se) => {
          const textVal =
            typeof se.text === 'string' && se.text.trim()
              ? se.text.trim()
              : typeof se.description === 'string'
                ? se.description.trim()
                : '';
          const yearVal =
            typeof se.year === 'number' || typeof se.year === 'string'
              ? se.year
              : typeof se.dateLabel === 'string'
                ? se.dateLabel
                : undefined;
          return {
            year: yearVal,
            dateLabel: typeof se.dateLabel === 'string' ? se.dateLabel : undefined,
            title: (se.title as string).trim(),
            text: textVal,
            description: typeof se.description === 'string' ? se.description : undefined,
          };
        })
    : undefined;

  const linksTo = Array.isArray(raw.linksTo)
    ? raw.linksTo
        .filter(
          (lnk): lnk is Record<string, unknown> =>
            isPlainRecord(lnk) && typeof lnk.targetId === 'string' && lnk.targetId.trim().length > 0,
        )
        .map((lnk) => ({
          targetId: (lnk.targetId as string).trim(),
          type: typeof lnk.type === 'string' ? lnk.type : 'sync_context',
          label: typeof lnk.label === 'string' ? lnk.label : 'Связанное событие',
        }))
    : undefined;

  const syncTags = Array.isArray(raw.syncTags)
    ? raw.syncTags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : undefined;

  const referenceTags = Array.isArray(raw.referenceTags)
    ? raw.referenceTags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : undefined;

  const outcome =
    typeof raw.outcome === 'string' && raw.outcome.trim().length > 0 ? raw.outcome.trim() : undefined;

  const keyFigures = Array.isArray(raw.keyFigures)
    ? raw.keyFigures.filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
    : typeof raw.keyFigures === 'string' && raw.keyFigures.trim().length > 0
      ? raw.keyFigures
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

  return {
    id,
    startYear: hasStartYear ? (raw.startYear as number) : undefined,
    endYear: typeof raw.endYear === 'number' && Number.isFinite(raw.endYear) ? raw.endYear : undefined,
    startDate: typeof raw.startDate === 'string' ? raw.startDate.trim() : undefined,
    endDate: typeof raw.endDate === 'string' ? raw.endDate.trim() : undefined,
    isAtomic: raw.isAtomic === true ? true : undefined,
    period,
    title,
    subtitle: typeof raw.subtitle === 'string' ? raw.subtitle : '',
    details: typeof raw.details === 'string' ? raw.details : '',
    outcome,
    keyFigures,
    eventType: typeof raw.eventType === 'string' ? raw.eventType : undefined,
    task,
    region: typeof raw.region === 'string' ? raw.region : '',
    type: typeof raw.type === 'string' ? raw.type : 'Событие',
    subEvents,
    linksTo,
    campaignId: typeof raw.campaignId === 'string' && raw.campaignId.trim() ? raw.campaignId.trim() : undefined,
    syncTags,
    referenceTags,
  };
}

function sanitizeRulerPeriod(raw: unknown): RulerPeriod | null {
  if (!isPlainRecord(raw)) return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const startYear = typeof raw.startYear === 'number' && Number.isFinite(raw.startYear) ? raw.startYear : null;
  const endYear = typeof raw.endYear === 'number' && Number.isFinite(raw.endYear) ? raw.endYear : null;
  if (!id || startYear === null || endYear === null) return null;

  const ruler = typeof raw.ruler === 'string' && raw.ruler.trim() ? raw.ruler.trim() : id;
  const shortRuler =
    typeof raw.shortRuler === 'string' && raw.shortRuler.trim() ? raw.shortRuler.trim() : ruler;

  return {
    id,
    eraId: typeof raw.eraId === 'string' && raw.eraId.trim() ? raw.eraId.trim() : 'ERA_1',
    center: typeof raw.center === 'string' && raw.center.trim() ? raw.center.trim() : undefined,
    ruler,
    shortRuler,
    reignPeriod:
      typeof raw.reignPeriod === 'string' && raw.reignPeriod.trim()
        ? raw.reignPeriod.trim()
        : `${startYear}–${Math.max(startYear, endYear)}`,
    startYear,
    endYear: Math.max(startYear, endYear),
    startDate: typeof raw.startDate === 'string' ? raw.startDate.trim() : undefined,
    endDate: typeof raw.endDate === 'string' ? raw.endDate.trim() : undefined,
    reignTitle: typeof raw.reignTitle === 'string' ? raw.reignTitle : ruler,
    reignThesis: typeof raw.reignThesis === 'string' ? raw.reignThesis : '',
  };
}

export function isRulersFile(file: TimelineDataFile | undefined): file is RulersFile {
  return Boolean(file && isPlainRecord(file) && 'rulers' in file && Array.isArray(file.rulers));
}

export function isBranchFile(file: TimelineDataFile | undefined): file is BranchFile {
  return Boolean(file && isPlainRecord(file) && 'nodes' in file && Array.isArray(file.nodes));
}

function normalizeDataPath(rawPath: string): string {
  return rawPath.trim().replace(/^\.?\//, '');
}

function collectBranchesFromDataFile(fileData: TimelineDataFile, fallbackPath: string): BranchDefinition[] {
  const result: BranchDefinition[] = [];
  if (!isPlainRecord(fileData)) return result;
  const pathHint = typeof fileData.path === 'string' && fileData.path.trim() ? fileData.path : fallbackPath;

  if ('branch' in fileData && fileData.branch) {
    const parsed = sanitizeBranchDefinition(fileData.branch, pathHint);
    if (parsed) result.push(parsed);
  }
  if ('branches' in fileData && Array.isArray(fileData.branches)) {
    fileData.branches.forEach((b) => {
      const parsed = sanitizeBranchDefinition(b, pathHint);
      if (parsed) result.push(parsed);
    });
  }
  return result;
}

export async function fetchTimelineRepository(): Promise<{
  manifest: SyncManifest;
  files: Record<string, TimelineDataFile>;
}> {
  const manifestRes = await fetch('./data/sync.manifest.json', { cache: 'no-store' });
  if (!manifestRes.ok) {
    throw new Error(`Не удалось загрузить файл синхронизации (HTTP ${manifestRes.status})`);
  }
  const rawManifest = (await manifestRes.json()) as Partial<SyncManifest>;
  const manifest: SyncManifest = {
    project: rawManifest.project || 'Git-таймлайн',
    schemaVersion: rawManifest.schemaVersion || '2.0.0',
    timeAxis: rawManifest.timeAxis || {
      minYear: 862,
      maxYear: 2000,
      resolution: 'adaptive_year_month_day',
      overlapRule: 'inclusive_interval',
    },
    mountedFiles: Array.isArray(rawManifest.mountedFiles) ? rawManifest.mountedFiles : [],
    macroEras: Array.isArray(rawManifest.macroEras) ? rawManifest.macroEras : [],
    crossLinks: Array.isArray(rawManifest.crossLinks) ? rawManifest.crossLinks : [],
  };

  // Автообнаружение JSON-модулей из /public/data/ (через Vite modules.index.json с фоллбеком на manifest)
  let hasDiscoveredIndex = false;
  let discoveredPaths: string[] = [];
  try {
    const indexRes = await fetch('./data/modules.index.json', { cache: 'no-store' });
    const ct = indexRes.headers.get('content-type') || '';
    if (indexRes.ok && !ct.includes('text/html')) {
      const idxData = (await indexRes.json()) as ModulesIndexFile;
      if (Array.isArray(idxData?.files)) {
        hasDiscoveredIndex = true;
        discoveredPaths = idxData.files.map(normalizeDataPath).filter(Boolean);
      }
    }
  } catch {
    // Фоллбек на явный список из sync.manifest.json
  }

  const manifestMetaByNormPath = new Map<string, MountedFileMeta>();
  manifest.mountedFiles.forEach((meta) => {
    if (meta?.path) {
      manifestMetaByNormPath.set(normalizeDataPath(meta.path), meta);
    }
  });

  const discoveredSet = new Set(discoveredPaths);
  const orderedCandidatePaths: string[] = [];
  const seenPaths = new Set<string>();

  if (hasDiscoveredIndex) {
    // modules.index.json — источник истины на диске: удалённые из папки файлы не запрашиваются (без Vite HTML-фоллбека)
    manifest.mountedFiles.forEach((meta) => {
      if (!meta?.path) return;
      const norm = normalizeDataPath(meta.path);
      if (norm && discoveredSet.has(norm) && !seenPaths.has(norm)) {
        seenPaths.add(norm);
        orderedCandidatePaths.push(norm);
      }
    });

    discoveredPaths.forEach((norm) => {
      if (norm && !seenPaths.has(norm)) {
        seenPaths.add(norm);
        orderedCandidatePaths.push(norm);
      }
    });
  } else {
    manifest.mountedFiles.forEach((meta) => {
      if (!meta?.path) return;
      const norm = normalizeDataPath(meta.path);
      if (norm && !seenPaths.has(norm)) {
        seenPaths.add(norm);
        orderedCandidatePaths.push(norm);
      }
    });
  }

  const files: Record<string, TimelineDataFile> = {};
  const resolvedMountedFiles: MountedFileMeta[] = [];

  const fetchedEntries = await Promise.all(
    orderedCandidatePaths.map(async (normPath) => {
      try {
        const res = await fetch(`./${normPath}`, { cache: 'no-store' });
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || ct.includes('text/html')) {
          return { normPath, data: null as TimelineDataFile | null };
        }
        const parsed = (await res.json()) as unknown;
        if (!isPlainRecord(parsed) || (!Array.isArray(parsed.nodes) && !Array.isArray(parsed.rulers))) {
          return { normPath, data: null as TimelineDataFile | null };
        }
        return { normPath, data: parsed as unknown as TimelineDataFile };
      } catch {
        // Полная изоляция: битый или недоступный JSON-файл пропускается без сбоев
        return { normPath, data: null as TimelineDataFile | null };
      }
    }),
  );

  fetchedEntries.forEach(({ normPath, data }) => {
    if (!data) return;
    const existingMeta = manifestMetaByNormPath.get(normPath);
    const storeKey = existingMeta?.path || (typeof data.path === 'string' && data.path.trim()) || normPath;
    files[storeKey] = data;

    const declaredBranches = collectBranchesFromDataFile(data, storeKey);
    const branchIds = declaredBranches.map((b) => b.id);
    const inferredRole: MountedFileMeta['role'] = isRulersFile(data)
      ? 'rulers_branch'
      : declaredBranches.some((b) => b.isMilitary)
        ? 'military_branches'
        : 'thematic_branch';

    const isFileEnabled =
      data.enabled === false
        ? false
        : existingMeta
          ? existingMeta.enabled !== false
          : true;

    resolvedMountedFiles.push({
      fileId: existingMeta?.fileId || (typeof data.fileId === 'string' && data.fileId) || normPath,
      path: storeKey,
      role: existingMeta?.role || inferredRole,
      branchIds: existingMeta?.branchIds?.length ? existingMeta.branchIds : branchIds,
      title: existingMeta?.title || declaredBranches[0]?.label || storeKey,
      enabled: isFileEnabled,
    });
  });

  return {
    manifest: {
      ...manifest,
      mountedFiles: resolvedMountedFiles,
    },
    files,
  };
}

export function extractBranchesFromStore(
  manifest: SyncManifest,
  filesMap: Record<string, TimelineDataFile>,
): BranchDefinition[] {
  const result: BranchDefinition[] = [];
  const seenIds = new Set<string>();

  manifest.mountedFiles.forEach((meta) => {
    if (!meta.enabled) return;
    const fileData = filesMap[meta.path];
    if (!fileData) return;

    collectBranchesFromDataFile(fileData, meta.path).forEach((branch) => {
      if (!seenIds.has(branch.id)) {
        seenIds.add(branch.id);
        result.push(branch);
      }
    });
  });

  // Автоматически синтезируем тематическую дорожку для событий-сирот, если ветка в файле не была объявлена или удалена
  manifest.mountedFiles.forEach((meta) => {
    if (
      !meta.enabled ||
      meta.role === 'trunk' ||
      meta.role === 'rulers_branch' ||
      meta.fileId === 'rulers'
    ) {
      return;
    }
    const fileData = filesMap[meta.path];
    if (!isBranchFile(fileData)) return;

    const fallbackBranchId = collectBranchesFromDataFile(fileData, meta.path).find((b) => !b.isGroup)?.id;

    fileData.nodes.forEach((rawNode) => {
      const node = sanitizeTimelineNode(rawNode, fallbackBranchId);
      if (!node || seenIds.has(node.task)) return;

      seenIds.add(node.task);
      result.push({
        id: node.task,
        gitName: `theme/${node.task.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}`,
        label: node.task,
        short: node.task.toLowerCase(),
        category: 'other',
        sourceFile: meta.path,
        description: `Автоматически созданная ветка для узлов с task="${node.task}"`,
        color: pickFallbackBranchColor(node.task),
        badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
        isMilitary: false,
      });
    });
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
  if (!rulersMeta || !rulersMeta.enabled) return [];
  const fileData = filesMap[rulersMeta.path];
  if (!isRulersFile(fileData)) return [];

  return fileData.rulers
    .map((raw) => sanitizeRulerPeriod(raw))
    .filter((r): r is RulerPeriod => r !== null);
}

export function getEnrichedEvents(
  manifest: SyncManifest,
  filesMap: Record<string, TimelineDataFile>,
  rulers: RulerPeriod[],
): EnrichedEvent[] {
  const list: EnrichedEvent[] = [];
  let seq = 0;
  const resolvedEras = resolveMacroEras(manifest.macroEras || []);
  const fileCrossLinks: CrossLink[] = [];
  const inlineCrossLinks: CrossLink[] = [];

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

    const fallbackBranchId = collectBranchesFromDataFile(fileObj, fileMeta.path).find((b) => !b.isGroup)?.id;

    if (Array.isArray(fileObj.crossLinks)) {
      fileObj.crossLinks.forEach((lnk) => {
        if (isPlainRecord(lnk) && typeof lnk.from === 'string' && typeof lnk.to === 'string') {
          fileCrossLinks.push({
            id: typeof lnk.id === 'string' && lnk.id ? lnk.id : `file-link-${lnk.from}-${lnk.to}`,
            from: lnk.from.trim(),
            to: lnk.to.trim(),
            type: typeof lnk.type === 'string' ? lnk.type : 'sync_context',
            label: typeof lnk.label === 'string' ? lnk.label : 'Связанное событие',
          });
        }
      });
    }

    fileObj.nodes.forEach((rawNode) => {
      const ev = sanitizeTimelineNode(rawNode, fallbackBranchId);
      if (!ev) return;

      if (Array.isArray(ev.linksTo)) {
        ev.linksTo.forEach((lnk, idx) => {
          if (!lnk?.targetId) return;
          const rawType = lnk.type || 'sync_context';
          const normalizedType =
            rawType === 'consequence' ? 'triggers' : rawType === 'causes' ? 'triggers' : rawType;
          inlineCrossLinks.push({
            id: `inline-${ev.id}-${lnk.targetId}-${idx}`,
            from: ev.id,
            to: lnk.targetId,
            type: normalizedType,
            label: lnk.label || 'Связанное событие',
          });
        });
      }

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

      const eraObj = findMacroEraForYear(startYear, resolvedEras, startPrecision.month);

      list.push({
        ...ev,
        sourceFile: fileMeta.path,
        seq: seq++,
        startYear,
        endYear,
        startPrecision,
        endPrecision,
        datePrecision: startPrecision.precision,
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
        retrospectiveLinks: [],
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

  // Слой 1: явные связи (из sync.manifest.json + локальные crossLinks ветки + inline linksTo у узлов)
  const explicitLinks: CrossLink[] = [];
  const seenLinkSignatures = new Set<string>();
  const explicitPairKeys = new Set<string>();

  const combinedRawLinks = [
    ...(manifest.crossLinks || []),
    ...fileCrossLinks,
    ...inlineCrossLinks,
  ];

  combinedRawLinks.forEach((lnk) => {
    if (!lnk.from || !lnk.to || lnk.from === lnk.to) return;
    const signature = `${lnk.from}|${lnk.to}|${lnk.type}`;
    if (seenLinkSignatures.has(signature)) return;
    seenLinkSignatures.add(signature);
    explicitLinks.push(lnk);

    const pairKey = lnk.from < lnk.to ? `${lnk.from}|${lnk.to}` : `${lnk.to}|${lnk.from}`;
    explicitPairKeys.add(pairKey);
  });

  // Слой 2: автоматическая синхронизация событий разных веток по общим тегам кампаний и хронологической близости
  const eventsByTag = new Map<string, EnrichedEvent[]>();
  list.forEach((ev) => {
    const rawTags = [
      ...(ev.syncTags || []),
      ...(ev.campaignId ? [ev.campaignId] : []),
    ];
    const uniqueNormalized = new Set(
      rawTags.map((t) => t.trim().toLowerCase()).filter(Boolean),
    );
    uniqueNormalized.forEach((tag) => {
      const bucket = eventsByTag.get(tag);
      if (bucket) {
        bucket.push(ev);
      } else {
        eventsByTag.set(tag, [ev]);
      }
    });
  });

  const autoSyncByPair = new Map<
    string,
    { from: EnrichedEvent; to: EnrichedEvent; tags: string[] }
  >();

  eventsByTag.forEach((taggedEvents, tag) => {
    if (taggedEvents.length < 2) return;
    for (let i = 0; i < taggedEvents.length; i++) {
      for (let j = i + 1; j < taggedEvents.length; j++) {
        const a = taggedEvents[i];
        const b = taggedEvents[j];
        if (a.task === b.task) continue;

        const pairKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
        if (explicitPairKeys.has(pairKey)) continue;

        // Пересечение интервалов или близость до 3 лет
        const maxStart = Math.max(a.startYear, b.startYear);
        const minEnd = Math.min(a.endYear, b.endYear);
        if (maxStart > minEnd + 3) continue;

        const existingAuto = autoSyncByPair.get(pairKey);
        if (existingAuto) {
          if (!existingAuto.tags.includes(tag)) {
            existingAuto.tags.push(tag);
          }
        } else {
          autoSyncByPair.set(pairKey, { from: a, to: b, tags: [tag] });
        }
      }
    }
  });

  const autoSyncLinks: Array<CrossLink & { isAutoSync: boolean; syncTag: string; isRetrospective?: boolean }> = [];
  autoSyncByPair.forEach(({ from, to, tags }, pairKey) => {
    const formattedTags = tags.map((t) => `#${t}`).join(', ');
    autoSyncLinks.push({
      id: `auto-sync-${pairKey}`,
      from: from.id,
      to: to.id,
      type: 'sync_context',
      label: `Авто-синхронизация по общему тегу кампании (${formattedTags})`,
      isAutoSync: true,
      syncTag: tags[0],
      isRetrospective: false,
    });
  });

  // Слой 3: внеоконные и ретроспективные связи (referenceTags и канонические теги event-<id>) без ограничения в 3 года
  const retrospectivePairMap = new Map<
    string,
    { from: EnrichedEvent; to: EnrichedEvent; tags: string[] }
  >();

  const registerRetrospectivePair = (referencer: EnrichedEvent, target: EnrichedEvent, tag: string) => {
    if (referencer.id === target.id || referencer.task === target.task) return;
    const pairKey = referencer.id < target.id ? `${referencer.id}|${target.id}` : `${target.id}|${referencer.id}`;
    if (explicitPairKeys.has(pairKey) || autoSyncByPair.has(pairKey)) return;

    // Ориентируем связь от более позднего узла (книга/исследование) к исходному историческому событию
    const fromNode = referencer.startYear >= target.startYear ? referencer : target;
    const toNode = fromNode === referencer ? target : referencer;

    const existing = retrospectivePairMap.get(pairKey);
    if (existing) {
      if (!existing.tags.includes(tag)) {
        existing.tags.push(tag);
      }
    } else {
      retrospectivePairMap.set(pairKey, { from: fromNode, to: toNode, tags: [tag] });
    }
  };

  list.forEach((ev) => {
    // 3a. Канонический тег вида event-<node.id> в syncTags или referenceTags всегда связывает с целевым узлом
    const allNodeTags = Array.from(
      new Set(
        [
          ...(ev.syncTags || []),
          ...(ev.referenceTags || []),
          ...(ev.campaignId ? [ev.campaignId] : []),
        ]
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ),
    );

    allNodeTags.forEach((tag) => {
      if (tag.startsWith('event-')) {
        const targetId = tag.slice('event-'.length);
        const targetNode = byId.get(targetId);
        if (targetNode) {
          const isExplicitRefTag = (ev.referenceTags || []).some((rt) => rt.trim().toLowerCase() === tag);
          const maxStart = Math.max(ev.startYear, targetNode.startYear);
          const minEnd = Math.min(ev.endYear, targetNode.endYear);
          if (isExplicitRefTag || maxStart > minEnd + 3) {
            registerRetrospectivePair(ev, targetNode, tag);
          }
        }
      }
    });

    // 3b. Теги из referenceTags связываются с первичными носителями этого тега (syncTags / campaignId) на любой дистанции лет
    const refTags = Array.from(
      new Set((ev.referenceTags || []).map((t) => t.trim().toLowerCase()).filter(Boolean)),
    );
    refTags.forEach((tag) => {
      const owners = eventsByTag.get(tag) || [];
      owners.forEach((owner) => {
        registerRetrospectivePair(ev, owner, tag);
      });
    });
  });

  const retrospectiveTagLinks: Array<
    CrossLink & { isAutoSync: boolean; syncTag: string; isRetrospective: boolean }
  > = [];
  retrospectivePairMap.forEach(({ from, to, tags }, pairKey) => {
    const formattedTags = tags.map((t) => `#${t}`).join(', ');
    retrospectiveTagLinks.push({
      id: `ref-sync-${pairKey}`,
      from: from.id,
      to: to.id,
      type: 'references',
      label: `Внеоконная отсылка по тегу (${formattedTags})`,
      isAutoSync: true,
      syncTag: tags[0],
      isRetrospective: true,
    });
  });

  const RETROSPECTIVE_LINK_TYPES = new Set(['references', 'about_event', 'inspired_by']);

  const allLinks: Array<
    CrossLink & { isAutoSync?: boolean; syncTag?: string; isRetrospective?: boolean }
  > = [...explicitLinks, ...autoSyncLinks, ...retrospectiveTagLinks];

  list.forEach((ev) => {
    ev.concurrentEvents = list.filter(
      (other) => other.id !== ev.id && other.startYear <= ev.endYear && other.endYear >= ev.startYear,
    );

    const links: ExplicitLinkInfo[] = [];
    const retroLinks: RetrospectiveLinkInfo[] = [];
    const seenRetroOtherIds = new Set<string>();

    allLinks.forEach((lnk) => {
      if (lnk.from === ev.id || lnk.to === ev.id) {
        let isOutgoing = lnk.from === ev.id;
        const targetId = isOutgoing ? lnk.to : lnk.from;
        const targetEvent = byId.get(targetId);
        if (targetEvent) {
          // Если причинная связь (triggers/enables) записана от более позднего события к более раннему, нормализуем направление по хронологии
          if (lnk.type === 'triggers' || lnk.type === 'enables') {
            if (isOutgoing && ev.startYear > targetEvent.startYear) {
              isOutgoing = false;
            } else if (!isOutgoing && targetEvent.startYear > ev.startYear) {
              isOutgoing = true;
            }
          }

          const maxStart = Math.max(ev.startYear, targetEvent.startYear);
          const minEnd = Math.min(ev.endYear, targetEvent.endYear);
          const yearGap = maxStart > minEnd ? maxStart - minEnd : 0;
          const isRetrospective =
            lnk.isRetrospective === true ||
            RETROSPECTIVE_LINK_TYPES.has(lnk.type) ||
            (yearGap > 3 && lnk.type !== 'triggers' && lnk.type !== 'enables');

          links.push({
            ...lnk,
            otherId: targetId,
            direction: isOutgoing ? 'outgoing' : 'incoming',
            targetEvent,
            isRetrospective,
            yearGap,
          });

          if (
            (isRetrospective ||
              isLiteraryWorkNode(targetEvent) ||
              isScienceDiscoveryNode(targetEvent) ||
              isBiographyNode(targetEvent)) &&
            !seenRetroOtherIds.has(targetId)
          ) {
            seenRetroOtherIds.add(targetId);
            retroLinks.push({
              id: lnk.id,
              otherId: targetId,
              direction: targetEvent.startYear >= ev.startYear ? 'depicted_by' : 'depicts',
              label: lnk.label,
              yearGap,
            });
          }
        }
      }
    });
    ev.explicitLinks = links;
    ev.retrospectiveLinks = retroLinks;
  });

  return list;
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

  // Находим самого верхнего свернутого родителя в цепочке предков
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

  // Центральная ось времени (time/main) всегда отделяет зону правителей слева от тематических веток справа
  list.push(TIME_AXIS_BRANCH);

  const byId = new Map(branches.map((b) => [b.id, b]));

  branches.forEach((b) => {
    if (b.id === 'MAIN_RULERS') return;

    // Если любой строгий предок свернут на таймлайне, дочерняя ветка сливается в него и не занимает отдельную дорожку
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

export function computeTimelineYearBounds(
  manifest: SyncManifest | null,
  rulers: RulerPeriod[],
  enrichedEvents: EnrichedEvent[],
): { minYear: number; maxYear: number } {
  const baseMin = typeof manifest?.timeAxis?.minYear === 'number' ? manifest.timeAxis.minYear : 862;
  const baseMax = typeof manifest?.timeAxis?.maxYear === 'number' ? manifest.timeAxis.maxYear : 2000;

  let minYear = baseMin;
  let maxYear = baseMax;

  rulers.forEach((r) => {
    if (r.startYear < minYear) minYear = r.startYear;
    if (r.endYear > maxYear) maxYear = r.endYear;
  });

  enrichedEvents.forEach((ev) => {
    if (ev.startYear < minYear) minYear = ev.startYear;
    if (ev.endYear > maxYear) maxYear = ev.endYear;
  });

  if (maxYear <= minYear) {
    maxYear = minYear + 1;
  }

  return { minYear, maxYear };
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

  const yearBounds = computeTimelineYearBounds(manifest, rulers, enrichedEvents);

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
    effectiveYearFrom = Math.max(yearBounds.minYear, minEventYear);
    effectiveYearTo = Math.min(yearBounds.maxYear, Math.max(effectiveYearFrom + 1, maxEventYear));
  } else {
    matchingEvents = enrichedEvents.filter((ev) => {
      if (!isEventBranchActive(ev, filters.activeBranches)) return false;
      if (!intersectsTimeWindow(ev.startYear, ev.endYear, filters.yearFrom, filters.yearTo)) return false;
      if (selectedEraObj) {
        if (!doesIntervalBelongToEra(ev.startYear, ev.endYear, ev.eraId, selectedEraObj)) {
          return false;
        }
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
        if (!doesIntervalBelongToEra(r.startYear, r.endYear, r.eraId, selectedEraObj)) {
          return false;
        }
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
    const hasItemsInEra =
      matchingEvents.some((e) => doesIntervalBelongToEra(e.startYear, e.endYear, e.eraId, era)) ||
      matchingRulers.some((r) => doesIntervalBelongToEra(r.startYear, r.endYear, r.eraId, era));
    if (!hasItemsInEra) return;

    const milestoneYear = Math.max(effectiveYearFrom, era.startYear);
    if (milestoneYear >= effectiveYearFrom && milestoneYear <= effectiveYearTo && era.endYear >= effectiveYearFrom) {
      stream.push({
        rowType: 'ERA_START',
        year: milestoneYear,
        sortKey: milestoneYear * 10000 + 50,
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
  const rulerStreamLayout = computeRulerSubLaneLayout(matchingRulers, true);

  matchingRulers.forEach((rulerObj) => {
    const rIdx = rulerIndexById.get(rulerObj.id) ?? 0;
    const rulerColor =
      rulerStreamLayout.colorByRulerId.get(rulerObj.id) ??
      RULER_ALT_COLORS[rIdx % RULER_ALT_COLORS.length];
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
    if (b.isGroup) return;
    const cat = resolveBranchCategory(b).key;
    if (presetId === 'all') {
      next[b.id] = true;
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

export function computeDensityBins(
  events: EnrichedEvent[],
  yearFrom: number,
  yearTo: number,
  binCount = 28,
): DensityBin[] {
  const safeFrom = Math.min(yearFrom, yearTo);
  const safeTo = Math.max(safeFrom + 1, yearTo);
  const span = safeTo - safeFrom;
  const count = Math.max(4, Math.min(60, binCount));
  const step = span / count;

  const bins: DensityBin[] = [];
  for (let i = 0; i < count; i++) {
    const startYear = Math.round(safeFrom + i * step);
    const endYear = i === count - 1 ? safeTo : Math.max(startYear, Math.round(safeFrom + (i + 1) * step) - 1);
    let totalCount = 0;
    let commitCount = 0;

    for (let j = 0; j < events.length; j++) {
      const ev = events[j];
      if (ev.startYear <= endYear && ev.endYear >= startYear) {
        totalCount++;
        if (ev.startYear >= startYear && ev.startYear <= endYear) {
          commitCount++;
        }
      }
    }

    bins.push({
      startYear,
      endYear,
      totalCount,
      commitCount,
    });
  }

  return bins;
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
    collapsedParents?: Record<string, boolean>;
  },
): BranchSubLaneLayout {
  const firstThematicX = timeSpineX + (options?.firstThematicOffset ?? 28);
  const laneGap = options?.laneGap ?? 22;
  const subStep = options?.subStep ?? 10;
  const collapsedParents = options?.collapsedParents ?? {};

  const slotByEventId = new Map<string, number>();
  const branchLayouts = new Map<string, BranchLaneLayout>();

  let cursorX = firstThematicX;

  thematicLanes.forEach((lane) => {
    const laneNonAtomicEvents = matchingEvents
      .filter(
        (ev) =>
          resolveEventBranch(ev, branches, collapsedParents).id === lane.id &&
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
      startKey: parsePreciseDate(r.startDate, r.startYear, false).sortKey,
      endKey: parsePreciseDate(r.endDate, r.endYear, true).sortKey,
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

export function computeDynamicWindowHotspots(
  enrichedEvents: EnrichedEvent[],
  activeBranches: Record<string, boolean>,
  minYear = 862,
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

export function isWriterBioNode(
  ev: Pick<TimelineNode, 'task' | 'type' | 'syncTags'>,
  branches?: BranchDefinition[],
): boolean {
  const task = ev.task || '';
  if (task === 'WRITERS_BIO') return true;
  if (branches) {
    const b = branches.find((br) => br.id === task);
    if (b && b.gitName.endsWith('/writers')) return true;
  }
  return false;
}

export function isScientistBioNode(
  ev: Pick<TimelineNode, 'task' | 'type' | 'syncTags'>,
  branches?: BranchDefinition[],
): boolean {
  const task = ev.task || '';
  if (task === 'SCIENTISTS_BIO') return true;
  if (branches) {
    const b = branches.find((br) => br.id === task);
    if (b && b.gitName.endsWith('/scientists')) return true;
  }
  return false;
}

export function isBiographyNode(
  ev: Pick<TimelineNode, 'task' | 'type' | 'syncTags'>,
  branches?: BranchDefinition[],
): boolean {
  if (isWriterBioNode(ev, branches) || isScientistBioNode(ev, branches)) return true;
  const task = ev.task || '';
  if (
    task.endsWith('_BIO') ||
    task.startsWith('PEOPLE_') ||
    task.startsWith('PERSONS_')
  ) {
    return true;
  }
  if (branches) {
    const b = branches.find((br) => br.id === task);
    if (b && b.gitName.includes('/bio')) {
      return true;
    }
  }
  return false;
}

export function isLiteraryWorkNode(
  ev: Pick<TimelineNode, 'task' | 'type'>,
  branches?: BranchDefinition[],
): boolean {
  const task = ev.task || '';
  if (
    task === 'WRITERS_WORKS' ||
    task === 'LITERATURE_BOOKS' ||
    task.endsWith('_WORKS') ||
    task.endsWith('_BOOKS')
  ) {
    return true;
  }
  if (branches) {
    const b = branches.find((br) => br.id === task);
    if (b && (b.gitName.endsWith('/books') || b.gitName.endsWith('/works'))) {
      return true;
    }
  }
  return false;
}

export function isScienceDiscoveryNode(
  ev: Pick<TimelineNode, 'task' | 'type'>,
  branches?: BranchDefinition[],
): boolean {
  const task = ev.task || '';
  if (task === 'SCIENCE_DISCOVERIES' || task.endsWith('_DISCOVERIES')) {
    return true;
  }
  if (branches) {
    const b = branches.find((br) => br.id === task);
    if (b && b.gitName.endsWith('/discoveries')) {
      return true;
    }
  }
  return false;
}

export function isHistoricalEventNode(
  ev: Pick<TimelineNode, 'task' | 'type' | 'syncTags'>,
  branches?: BranchDefinition[],
): boolean {
  return (
    !isBiographyNode(ev, branches) &&
    !isLiteraryWorkNode(ev, branches) &&
    !isScienceDiscoveryNode(ev, branches)
  );
}

export interface MacroEraSummaryData {
  era: ResolvedMacroEra;
  eraRulers: RulerPeriod[];
  eraEvents: EnrichedEvent[];
  contemporaryWriters: EnrichedEvent[];
  contemporaryScientists: EnrichedEvent[];
  worksWrittenInPeriod: EnrichedEvent[];
  discoveriesInPeriod: EnrichedEvent[];
  worksAboutPeriod: EnrichedEvent[];
  carryOverInEvents: EnrichedEvent[];
  carryOverOutEvents: EnrichedEvent[];
  branchBreakdown: Array<{ branch: BranchDefinition; count: number }>;
  centers: string[];
  peakInterval: { label: string; count: number } | null;
  topConnectedEvents: EnrichedEvent[];
  totalDurationYears: number;
  totalSyncLinks: number;
}

export function getMacroEraSummaryData(
  era: ResolvedMacroEra,
  rulers: RulerPeriod[],
  enrichedEvents: EnrichedEvent[],
  branches: BranchDefinition[],
): MacroEraSummaryData {
  const allBelongingEvents = enrichedEvents.filter((ev) =>
    doesIntervalBelongToEra(ev.startYear, ev.endYear, ev.eraId, era),
  );

  const eraEvents = allBelongingEvents.filter((ev) => isHistoricalEventNode(ev, branches));

  const contemporaryWriters = enrichedEvents.filter(
    (ev) =>
      isWriterBioNode(ev, branches) &&
      intersectsTimeWindow(ev.startYear, ev.endYear, era.startYear, era.endYear),
  );

  const contemporaryScientists = enrichedEvents.filter(
    (ev) =>
      isScientistBioNode(ev, branches) &&
      intersectsTimeWindow(ev.startYear, ev.endYear, era.startYear, era.endYear),
  );

  const worksWrittenInPeriod = enrichedEvents.filter(
    (ev) =>
      isLiteraryWorkNode(ev, branches) &&
      intersectsTimeWindow(ev.startYear, ev.endYear, era.startYear, era.endYear),
  );

  const discoveriesInPeriod = enrichedEvents.filter(
    (ev) =>
      isScienceDiscoveryNode(ev, branches) &&
      intersectsTimeWindow(ev.startYear, ev.endYear, era.startYear, era.endYear),
  );

  const eraRulers = rulers.filter((r) =>
    doesIntervalBelongToEra(r.startYear, r.endYear, r.eraId, era),
  );
  const eraRulerIds = new Set<string>(eraRulers.map((r) => r.id));
  const historicalEventIdsInEra = new Set<string>(eraEvents.map((ev) => ev.id));

  const allWorkNodes = enrichedEvents.filter((ev) => isLiteraryWorkNode(ev, branches));
  const worksAboutPeriod: EnrichedEvent[] = [];

  allWorkNodes.forEach((work) => {
    const refTags = work.referenceTags || [];
    const matchingLink = work.explicitLinks.find(
      (link) =>
        historicalEventIdsInEra.has(link.targetEvent.id) &&
        (link.direction === 'outgoing' ||
          link.isRetrospective ||
          link.type === 'about_event' ||
          link.type === 'inspired_by' ||
          link.type === 'references'),
    );

    const hasRulerTag = refTags.some((tag) => eraRulerIds.has(tag));
    const hasEraTag = refTags.includes(era.id);

    if (matchingLink || hasRulerTag || hasEraTag) {
      worksAboutPeriod.push(work);
    }
  });

  const carryOverInEvents = eraEvents.filter((ev) => ev.startYear < era.startYear);
  const carryOverOutEvents = eraEvents.filter((ev) => ev.endYear > era.endYear);

  const branchCountMap = new Map<string, number>();
  let totalSyncLinks = 0;

  allBelongingEvents.forEach((ev) => {
    const resolvedBranch = resolveEventBranch(ev, branches);
    branchCountMap.set(resolvedBranch.id, (branchCountMap.get(resolvedBranch.id) || 0) + 1);
    totalSyncLinks += ev.explicitLinks.length;
  });

  const branchBreakdown: Array<{ branch: BranchDefinition; count: number }> = [];
  branches.forEach((b) => {
    if (b.isGroup) return;
    const count = branchCountMap.get(b.id) || 0;
    if (count > 0) {
      branchBreakdown.push({ branch: b, count });
    }
  });

  const centers = Array.from(
    new Set(eraRulers.map((r) => r.center).filter((c): c is string => Boolean(c && c.trim()))),
  );

  const bins = computeDensityBins(allBelongingEvents, era.startYear, era.endYear, 12);
  let bestBin: DensityBin | null = null;
  for (const bin of bins) {
    if (!bestBin || bin.totalCount > bestBin.totalCount) {
      bestBin = bin;
    }
  }
  const peakInterval =
    bestBin && bestBin.totalCount > 0
      ? {
          label:
            bestBin.startYear === bestBin.endYear
              ? `${bestBin.startYear} г.`
              : `${bestBin.startYear}–${bestBin.endYear} гг.`,
          count: bestBin.totalCount,
        }
      : null;

  const topConnectedEvents = [...eraEvents]
    .filter((ev) => ev.explicitLinks.length > 0)
    .sort((a, b) => b.explicitLinks.length - a.explicitLinks.length)
    .slice(0, 6);

  return {
    era,
    eraRulers,
    eraEvents,
    contemporaryWriters,
    contemporaryScientists,
    worksWrittenInPeriod,
    discoveriesInPeriod,
    worksAboutPeriod,
    carryOverInEvents,
    carryOverOutEvents,
    branchBreakdown,
    centers,
    peakInterval,
    topConnectedEvents,
    totalDurationYears: Math.max(1, era.endYear - era.startYear),
    totalSyncLinks,
  };
}

export interface RulerPeriodSummaryData {
  ruler: RulerPeriod;
  reignEvents: EnrichedEvent[];
  contemporaryWriters: EnrichedEvent[];
  contemporaryScientists: EnrichedEvent[];
  worksWrittenInPeriod: EnrichedEvent[];
  discoveriesInPeriod: EnrichedEvent[];
  worksAboutPeriod: EnrichedEvent[];
  startedInReign: EnrichedEvent[];
  inheritedEvents: EnrichedEvent[];
  carryOverEvents: EnrichedEvent[];
}

export function getRulerPeriodSummaryData(
  ruler: RulerPeriod,
  enrichedEvents: EnrichedEvent[],
  branches?: BranchDefinition[],
): RulerPeriodSummaryData {
  const overlappingAll = enrichedEvents.filter((ev) =>
    ev.overlappingRulers.some((or) => or.id === ruler.id),
  );

  const reignEvents = overlappingAll.filter((ev) => isHistoricalEventNode(ev, branches));
  const contemporaryWriters = overlappingAll.filter((ev) => isWriterBioNode(ev, branches));
  const contemporaryScientists = overlappingAll.filter((ev) => isScientistBioNode(ev, branches));
  const worksWrittenInPeriod = overlappingAll.filter((ev) => isLiteraryWorkNode(ev, branches));
  const discoveriesInPeriod = overlappingAll.filter((ev) => isScienceDiscoveryNode(ev, branches));

  const historicalEventIdsInReign = new Set<string>(reignEvents.map((ev) => ev.id));
  const allWorkNodes = enrichedEvents.filter((ev) => isLiteraryWorkNode(ev, branches));
  const worksAboutPeriod: EnrichedEvent[] = [];

  allWorkNodes.forEach((work) => {
    const refTags = work.referenceTags || [];
    const hasRulerTag = refTags.includes(ruler.id);
    const matchingLink = work.explicitLinks.find(
      (link) =>
        historicalEventIdsInReign.has(link.targetEvent.id) &&
        (link.direction === 'outgoing' ||
          link.isRetrospective ||
          link.type === 'about_event' ||
          link.type === 'inspired_by' ||
          link.type === 'references'),
    );

    if (hasRulerTag || matchingLink) {
      worksAboutPeriod.push(work);
    }
  });

  const startedInReign = reignEvents.filter(
    (ev) => ev.startYear >= ruler.startYear && ev.startYear <= ruler.endYear,
  );
  const inheritedEvents = reignEvents.filter((ev) => ev.startYear < ruler.startYear);
  const carryOverEvents = reignEvents.filter((ev) => ev.endYear > ruler.endYear);

  return {
    ruler,
    reignEvents,
    contemporaryWriters,
    contemporaryScientists,
    worksWrittenInPeriod,
    discoveriesInPeriod,
    worksAboutPeriod,
    startedInReign,
    inheritedEvents,
    carryOverEvents,
  };
}






