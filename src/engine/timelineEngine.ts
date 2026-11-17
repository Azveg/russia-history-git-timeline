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
  PersonDossier,
  PreciseDateParts,
  ReignBranchPairSummary,
  ReignCrossBranchLink,
  ResolvedMacroEra,
  RetrospectiveLinkInfo,
  RulerBoundaryTick,
  RulerParticipantEntry,
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
      title: `Завершение правления (${row.rulerObj.shortRuler}): ${formatDateForResolution(parts, resolution)}`,
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
      title: `${row.isAtomicInView ? 'Событие' : 'Начало процесса'}: ${formatDateForResolution(parts, resolution)}${approxNote} — ${row.eventObj.title}`,
    };
  }

  // EVENT_END
  const parts = row.eventObj.endPrecision;
  const approxNote =
    parts.precision === 'year' && resolution !== 'year' ? ' (в источнике указан только год)' : '';
  const isWar = row.eventObj.task.startsWith('WAR_');
  return {
    label: formatCompactAxisDate(parts, resolution),
    title: `${isWar ? 'Окончание кампании' : 'Завершение процесса'}: ${formatDateForResolution(parts, resolution)}${approxNote} — ${row.eventObj.title}`,
  };
}

export function isAtomicEventNode(
  node: TimelineNode,
  startParts: PreciseDateParts,
  endParts: PreciseDateParts,
  resolution: AxisResolution,
): boolean {
  if (node.isAtomic === true || isBiographyNode(node)) return true;
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

export function formatEventTitleWithPeriod(ev: Pick<TimelineNode, 'title' | 'period'>): string {
  const title = (ev.title || '').trim();
  const period = (ev.period || '').trim();
  if (!period) return title;
  if (title.includes(`(${period})`)) {
    return title;
  }
  return `${title} (${period})`;
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
          const cleanTitle = (se.title as string).trim();
          const textVal =
            typeof se.text === 'string' && se.text.trim()
              ? se.text.trim()
              : typeof se.description === 'string'
                ? se.description.trim()
                : '';
          let yearVal: number | string | undefined =
            typeof se.year === 'number' || (typeof se.year === 'string' && se.year.trim().length > 0)
              ? se.year
              : typeof se.dateLabel === 'string' && se.dateLabel.trim().length > 0
                ? se.dateLabel.trim()
                : undefined;

          if (yearVal === undefined) {
            const parenMatch = cleanTitle.match(/\(([^)]*\b\d{3,4}\b[^)]*)\)/);
            if (parenMatch) {
              yearVal = parenMatch[1].trim();
            } else {
              const yearMatch = cleanTitle.match(/\b(\d{3,4})\b/);
              if (yearMatch) {
                yearVal = Number(yearMatch[1]);
              } else if (hasStartYear) {
                yearVal = raw.startYear as number;
              }
            }
          }

          return {
            year: yearVal,
            dateLabel: typeof se.dateLabel === 'string' ? se.dateLabel : undefined,
            title: cleanTitle,
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

  const keyFigures = parseKeyFiguresList(raw.keyFigures);

  const rawLit = isPlainRecord(raw.literaryProfile) ? raw.literaryProfile : null;
  const literaryProfile = rawLit
    ? {
        genre:
          typeof rawLit.genre === 'string' && rawLit.genre.trim().length > 0
            ? rawLit.genre.trim()
            : undefined,
        movement:
          typeof rawLit.movement === 'string' && rawLit.movement.trim().length > 0
            ? rawLit.movement.trim()
            : undefined,
        themes:
          typeof rawLit.themes === 'string' && rawLit.themes.trim().length > 0
            ? rawLit.themes.trim()
            : undefined,
        publicationFate:
          typeof rawLit.publicationFate === 'string' && rawLit.publicationFate.trim().length > 0
            ? rawLit.publicationFate.trim()
            : undefined,
        culturalImpact:
          typeof rawLit.culturalImpact === 'string' && rawLit.culturalImpact.trim().length > 0
            ? rawLit.culturalImpact.trim()
            : undefined,
        majorWorks: Array.isArray(rawLit.majorWorks)
          ? rawLit.majorWorks.filter((w): w is string => typeof w === 'string' && w.trim().length > 0)
          : undefined,
      }
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
    literaryProfile:
      literaryProfile &&
      (literaryProfile.genre ||
        literaryProfile.movement ||
        literaryProfile.themes ||
        literaryProfile.publicationFate ||
        literaryProfile.culturalImpact ||
        (literaryProfile.majorWorks && literaryProfile.majorWorks.length > 0))
        ? literaryProfile
        : undefined,
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
    throw new Error(`Не удалось загрузить каталог хронографа (HTTP ${manifestRes.status})`);
  }
  const rawManifest = (await manifestRes.json()) as Partial<SyncManifest>;
  const manifest: SyncManifest = {
    project: rawManifest.project || 'Исторический хронограф',
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
        description: `Тематическая линия для событий раздела «${node.task}»`,
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
          // Семантика 'consequence': текущий узел (ev) является следствием целевого узла (targetId),
          // поэтому вектор причины направлен targetId -> ev.id.
          // Для 'causes', 'triggers', 'enables' вектор направлен ev.id -> targetId.
          const isConsequenceOfTarget = rawType === 'consequence';
          const normalizedType =
            rawType === 'consequence' || rawType === 'causes' ? 'triggers' : rawType;
          inlineCrossLinks.push({
            id: `inline-${ev.id}-${lnk.targetId}-${idx}`,
            from: isConsequenceOfTarget ? lnk.targetId : ev.id,
            to: isConsequenceOfTarget ? ev.id : lnk.targetId,
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

  // Сначала фиксируем пары, уже связанные направленной причинной связью (triggers/enables),
  // чтобы избыточный недирективный sync_context для той же пары не дублировал карточку в Колонке 1.
  const causalPairKeys = new Set<string>();
  combinedRawLinks.forEach((lnk) => {
    if (!lnk.from || !lnk.to || lnk.from === lnk.to) return;
    if (lnk.type === 'triggers' || lnk.type === 'enables') {
      const pairKey = lnk.from < lnk.to ? `${lnk.from}|${lnk.to}` : `${lnk.to}|${lnk.from}`;
      causalPairKeys.add(pairKey);
    }
  });

  combinedRawLinks.forEach((lnk) => {
    if (!lnk.from || !lnk.to || lnk.from === lnk.to) return;
    const pairKey = lnk.from < lnk.to ? `${lnk.from}|${lnk.to}` : `${lnk.to}|${lnk.from}`;
    if (lnk.type === 'sync_context' && causalPairKeys.has(pairKey)) {
      return;
    }
    const signature =
      lnk.type === 'sync_context'
        ? `${pairKey}|sync_context`
        : `${lnk.from}|${lnk.to}|${lnk.type}`;
    if (seenLinkSignatures.has(signature)) return;
    seenLinkSignatures.add(signature);
    explicitLinks.push(lnk);
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

  const TAG_HUMAN_LABELS: Record<string, string> = {
    kulikovo: 'Куликовская битва (1380)',
    napoleonic: 'Наполеоновские войны и 1812 год',
    'northern-war': 'Великая Северная война (1700–1721)',
    smuta: 'Смутное время',
    'topic-silver-age': 'Серебряный век русской культуры',
    ww1: 'Первая мировая война (1914–1918)',
    ww2: 'Великая Отечественная и Вторая мировая война',
    'person-akhmatova-anna': 'А. А. Ахматова',
    'person-alferov': 'Ж. И. Алфёров',
    'person-avvakum-petrov': 'протопоп Аввакум',
    'person-blok-alexander': 'А. А. Блок',
    'person-bulgakov-mikhail': 'М. А. Булгаков',
    'person-bunin-ivan': 'И. А. Бунин',
    'person-chekhov-anton': 'А. П. Чехов',
    'person-derzhavin-gavrila': 'Г. Р. Державин',
    'person-dostoevsky-fyodor': 'Ф. М. Достоевский',
    'person-fet-afanasy': 'А. А. Фет',
    'person-fonvizin-denis': 'Д. И. Фонвизин',
    'person-gogol-nikolay': 'Н. В. Гоголь',
    'person-goncharov-ivan': 'И. А. Гончаров',
    'person-gorky-maxim': 'М. Горький',
    'person-griboedov-aleksandr': 'А. С. Грибоедов',
    'person-kapitsa': 'П. Л. Капица',
    'person-karamzin-nikolay': 'Н. М. Карамзин',
    'person-korolev': 'С. П. Королёв',
    'person-krylov-ivan': 'И. А. Крылов',
    'person-kulibin': 'И. П. Кулибин',
    'person-kurchatov': 'И. В. Курчатов',
    'person-lermontov-mikhail': 'М. Ю. Лермонтов',
    'person-leskov-nikolay': 'Н. С. Лесков',
    'person-lobachevsky': 'Н. И. Лобачевский',
    'person-lomonosov': 'М. В. Ломоносов',
    'person-mayakovsky-vladimir': 'В. В. Маяковский',
    'person-mendeleev': 'Д. И. Менделеев',
    'person-nabokov-vladimir': 'В. В. Набоков',
    'person-nekrasov-nikolay': 'Н. А. Некрасов',
    'person-nestor-chronicler': 'Нестор Летописец',
    'person-ostrovsky-aleksandr': 'А. Н. Островский',
    'person-pasternak-boris': 'Б. Л. Пастернак',
    'person-pavlov': 'И. П. Павлов',
    'person-pirogov': 'Н. И. Пирогов',
    'person-popov': 'А. С. Попов',
    'person-pushkin-alexander': 'А. С. Пушкин',
    'person-sakharov': 'А. Д. Сахаров',
    'person-saltykov-shchedrin-mikhail': 'М. Е. Салтыков-Щедрин',
    'person-sechenov': 'И. М. Сеченов',
    'person-sholokhov-mikhail': 'М. А. Шолохов',
    'person-sofoniy-ryazanets': 'Софоний Рязанец',
    'person-solzhenitsyn-alexander': 'А. И. Солженицын',
    'person-tolstoy-leo': 'Л. Н. Толстой',
    'person-tsiolkovsky': 'К. Э. Циолковский',
    'person-tsvetaeva-marina': 'М. И. Цветаева',
    'person-turgenev-ivan': 'И. С. Тургенев',
    'person-tyutchev-fyodor': 'Ф. И. Тютчев',
    'person-vernadsky': 'В. И. Вернадский',
    'person-yesenin-sergey': 'С. А. Есенин',
    'person-zhukovsky-vasily': 'В. А. Жуковский',
    'reform-assignats': 'выпуск ассигнаций и губернская реформа',
    'reform-chosen-council': 'реформы Избранной рады',
    'reform-church-schism': 'церковная реформа и раскол XVII века',
    'reform-customs-1754': 'отмена внутренних таможен и модернизация середины XVIII века',
    'reform-glinskaya-money': 'денежная реформа Елены Глинской',
    'reform-great-reforms': 'Великие реформы Александра II',
    'reform-industrialization': 'план ГОЭЛРО и советская индустриализация',
    'reform-kankrin-money': 'денежная реформа Е. Ф. Канкрина',
    'reform-kosygin-1965': 'Косыгинская экономическая реформа',
    'reform-market-1990s': 'рыночные реформы 1990-х годов',
    'reform-ministries': 'министерская реформа Александра I',
    'reform-new-trade-statute': 'Новоторговый устав 1667 года',
    'reform-nuclear-project': 'советский Атомный проект',
    'reform-oil-boom': 'освоение Западной Сибири и нефтегазовый бум 1970-х',
    'reform-olga-pogosts': 'налоговая реформа княгини Ольги',
    'reform-oprichnina': 'Опричнина Ивана Грозного',
    'reform-perestroika-eco': 'экономические реформы Перестройки',
    'reform-peter-army': 'военная и флотская реформа Петра I',
    'reform-poll-tax': 'введение подушной подати и Табель о рангах',
    'reform-russkaya-pravda': '«Русская Правда»',
    'reform-rvsn': 'создание РВСН и ракетного щита',
    'reform-sobornoye-ulozhenie': 'Соборное уложение 1649 года',
    'reform-stolypin': 'Столыпинская аграрная реформа и Государственная дума',
    'reform-sudebnik-1497': 'Судебник 1497 года',
    'reform-war-communism': 'политика «военного коммунизма» и НЭП',
    'reform-witte-transsib': 'денежная реформа С. Ю. Витте и строительство Транссиба',
    'treaty-aigun-beijing': 'Айгунский и Пекинский договоры',
    'treaty-belovezha': 'Беловежские соглашения и Будапештский меморандум',
    'treaty-brest-1918': 'Брестский, Рижский и Рапалльский договоры',
    'treaty-byzantium-911': 'русско-византийские договоры 911 и 944 годов',
    'treaty-eternal-peace-1686': '«Вечный мир» 1686 года',
    'treaty-jassy-1791': 'Ясский мир 1791 года и разделы Речи Посполитой',
    'treaty-kuchuk-kainarji': 'Кючук-Кайнарджийский мир и присоединение Крыма',
    'treaty-liubech-1097': 'Любечский и Долобский съезды князей',
    'treaty-molotov-ribbentrop': 'советско-германские пакты 1939 года',
    'treaty-moscow-sovereignty': 'европейская дипломатия Ивана III',
    'treaty-nerchinsk-1689': 'Нерчинский договор 1689 года',
    'treaty-nystad': 'Ништадтский мир 1721 года',
    'treaty-paris-berlin': 'Парижский трактат и Лондонская конвенция',
    'treaty-pereyaslav-andrusovo': 'Переяславская рада и Андрусовское перемирие',
    'treaty-portsmouth-1905': 'Портсмутский мир 1905 года',
    'treaty-salt-abm': 'договоры ОСВ-1 и ПРО 1972 года',
    'treaty-stolbovo-deulino': 'Столбовский, Деулинский и Поляновский договоры',
    'treaty-tilsit': 'Тильзитский, Фридрихсгамский и Бухарестский договоры',
    'treaty-yalta-potsdam': 'Ялтинская и Потсдамская конференции 1945 года',
    'war-crimean': 'Крымская война (1853–1856)',
    'war-great-northern': 'Великая Северная война (1700–1721)',
    'war-kulikovo-1380': 'Куликовская битва (1380)',
    'war-polovtsian-steppe': 'степные походы против половцев',
    'war-rus-byzantine': 'русско-византийские походы и договоры X века',
    'war-rus-jap': 'Русско-японская война (1904–1905)',
    'war-rus-turk-1877': 'Русско-турецкая война (1877–1878)',
    'war-ww2-eastern': 'Великая Отечественная война (1941–1945)',
    'world-austrian-succession': 'Война за австрийское наследство',
    'world-axis-munich': 'подъём стран «Оси» и Мюнхенский сговор',
    'world-constantinople-1453': 'падение Константинополя и автокефалия Русской церкви',
    'world-crusade-1204': 'Четвёртый крестовый поход и натиск на Прибалтику',
    'world-discovery-reformation': 'Великие географические открытия и Реформация',
    'world-entente-1907': 'оформление Антанты и Тройственного союза',
    'world-french-rev': 'война за независимость США и Французская революция',
    'world-german-unification': 'объединение Германии в 1870–1871 годах',
    'world-glorious-rev': '«Славная революция» и Война Аугсбургской лиги',
    'world-great-depression': 'Великая депрессия 1929–1933 годов',
    'world-great-schism-1054': 'Великая схизма 1054 года',
    'world-helsinki-1975': 'Хельсинкские соглашения и эпоха Разрядки',
    'world-nato-1999': 'расширение НАТО и распад социалистического блока',
    'world-spanish-succession': 'Война за испанское наследство',
    'world-spring-of-nations': 'европейские революции 1848–1849 годов («Весна народов»)',
    'world-versailles': 'Версальско-Вашингтонская система',
    'world-vienna-congress': 'Венский конгресс и «Священный союз»',
    'world-warsaw-pact': 'создание ОВД и блоковое противостояние',
    'world-westphalia-1648': 'Тридцатилетняя война и Вестфальский мир',
    'world-yalta-nato': 'начало Холодной войны и создание НАТО',
  };

  const rulerLabelByTag = new Map<string, string>();
  rulers.forEach((r) => {
    rulerLabelByTag.set(r.id.toLowerCase(), r.shortRuler);
  });
  rulerLabelByTag.set('ruler-ryurik', rulerLabelByTag.get('ruler-rurik') || 'Рюрик');

  const eraLabelByTag = new Map<string, string>();
  resolvedEras.forEach((era) => {
    const rawKey = era.id.toLowerCase();
    eraLabelByTag.set(rawKey, era.displayShortTitle);
    eraLabelByTag.set(rawKey.replace(/_/g, '-'), era.displayShortTitle);
  });

  const resolveHumanTagLabel = (rawTag: string): string => {
    const tag = rawTag.trim().toLowerCase();
    if (TAG_HUMAN_LABELS[tag]) return TAG_HUMAN_LABELS[tag];
    if (tag.startsWith('event-')) {
      const targetNode = byId.get(tag.slice('event-'.length));
      if (targetNode) return `«${targetNode.title}»`;
    }
    if (eraLabelByTag.has(tag)) {
      return `эпоха «${eraLabelByTag.get(tag)}»`;
    }
    if (rulerLabelByTag.has(tag)) {
      return `правление (${rulerLabelByTag.get(tag)})`;
    }
    return 'общему историческому сюжету';
  };

  const formatHumanTagList = (tags: string[]): string => {
    const resolved = Array.from(new Set(tags.map(resolveHumanTagLabel).filter(Boolean)));
    return resolved.join(', ');
  };

  const autoSyncLinks: Array<CrossLink & { isAutoSync: boolean; syncTag: string; isRetrospective?: boolean }> = [];
  autoSyncByPair.forEach(({ from, to, tags }, pairKey) => {
    const formattedTags = formatHumanTagList(tags);
    autoSyncLinks.push({
      id: `auto-sync-${pairKey}`,
      from: from.id,
      to: to.id,
      type: 'sync_context',
      label:
        tags.length > 1
          ? `Синхронная взаимосвязь по сюжетам: ${formattedTags}`
          : `Синхронная взаимосвязь по сюжету: ${formattedTags}`,
      isAutoSync: true,
      syncTag: tags[0],
      isRetrospective: false,
    });
  });

  // Слой 3: ретроспективные связи (referenceTags и канонические ссылки event-<id>) без ограничения в 3 года
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
    // 3a. Каноническая метка вида event-<node.id> в syncTags или referenceTags всегда связывает с целевым узлом
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
    const formattedTags = formatHumanTagList(tags);
    retrospectiveTagLinks.push({
      id: `ref-sync-${pairKey}`,
      from: from.id,
      to: to.id,
      type: 'references',
      label:
        tags.length > 1
          ? `Историко-культурная перекличка по темам: ${formattedTags}`
          : `Историко-культурная перекличка: ${formattedTags}`,
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
          // Для неперекрывающихся событий в явном хронологическом порядке нормализуем случайную инверсию,
          // но при перекрытии интервалов или в одном году сохраняем авторский вектор причина -> следствие.
          if (lnk.type === 'triggers' || lnk.type === 'enables') {
            const fromEv = lnk.from === ev.id ? ev : targetEvent;
            const toEv = lnk.to === ev.id ? ev : targetEvent;
            const intervalsOverlap = fromEv.startYear <= toEv.endYear && toEv.startYear <= fromEv.endYear;
            if (!intervalsOverlap && fromEv.startPrecision.sortKey > toEv.startPrecision.sortKey) {
              isOutgoing = lnk.to === ev.id;
            }
          }

          const maxStart = Math.max(ev.startYear, targetEvent.startYear);
          const minEnd = Math.min(ev.endYear, targetEvent.endYear);
          const yearGap = maxStart > minEnd ? maxStart - minEnd : 0;
          const isEvCulturalOrSci =
            isLiteraryWorkNode(ev) || isScienceDiscoveryNode(ev) || isBiographyNode(ev);
          const isTargetCulturalOrSci =
            isLiteraryWorkNode(targetEvent) ||
            isScienceDiscoveryNode(targetEvent) ||
            isBiographyNode(targetEvent);
          const isRetrospective =
            lnk.isRetrospective === true ||
            RETROSPECTIVE_LINK_TYPES.has(lnk.type) ||
            ((isEvCulturalOrSci || isTargetCulturalOrSci) &&
              yearGap > 3 &&
              lnk.type !== 'triggers' &&
              lnk.type !== 'enables');

          links.push({
            ...lnk,
            otherId: targetId,
            direction: isOutgoing ? 'outgoing' : 'incoming',
            targetEvent,
            isRetrospective,
            yearGap,
          });

          const isCrossDomainCulturalHighlight =
            !isEvCulturalOrSci && isTargetCulturalOrSci;

          if (
            (lnk.isRetrospective === true ||
              RETROSPECTIVE_LINK_TYPES.has(lnk.type) ||
              isCrossDomainCulturalHighlight) &&
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
      const isBio = isBiographyNode(ev, branches);
      const effectiveEnd =
        isBio && filters.selectedReign === 'ALL' && !q && !filters.selectedPersonKey
          ? ev.startYear
          : ev.endYear;
      if (!intersectsTimeWindow(ev.startYear, effectiveEnd, filters.yearFrom, filters.yearTo)) return false;
      if (selectedEraObj) {
        if (!doesIntervalBelongToEra(ev.startYear, effectiveEnd, ev.eraId, selectedEraObj)) {
          return false;
        }
      }
      if (filters.onlyWithSyncLinks && ev.explicitLinks.length === 0) return false;
      if (filters.selectedReign !== 'ALL') {
        const matchesRuler = ev.overlappingRulers.some((r) => r.id === filters.selectedReign);
        if (!matchesRuler) return false;
      }
      if (filters.selectedPersonKey) {
        if (filters.selectedPersonEventIds) {
          if (!filters.selectedPersonEventIds.has(ev.id)) return false;
        } else {
          const matchesPerson = Boolean(
            ev.keyFigures?.some((person) => {
              const parsed = extractPreliminaryPersonKey(person);
              if (!parsed) return false;
              return (
                parsed.preliminaryKey === filters.selectedPersonKey ||
                doesRawMatchPersonKey(person, filters.selectedPersonKey!)
              );
            }),
          );
          if (!matchesPerson) return false;
        }
      }
      if (!q) return true;
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.subtitle.toLowerCase().includes(q) ||
        ev.details.toLowerCase().includes(q) ||
        ev.period.toLowerCase().includes(q) ||
        ev.ruler.toLowerCase().includes(q) ||
        ev.region.toLowerCase().includes(q) ||
        ev.type.toLowerCase().includes(q) ||
        Boolean(ev.outcome && ev.outcome.toLowerCase().includes(q)) ||
        Boolean(ev.keyFigures?.some((person) => person.toLowerCase().includes(q))) ||
        Boolean(ev.literaryProfile?.genre && ev.literaryProfile.genre.toLowerCase().includes(q)) ||
        Boolean(ev.literaryProfile?.movement && ev.literaryProfile.movement.toLowerCase().includes(q)) ||
        Boolean(ev.literaryProfile?.themes && ev.literaryProfile.themes.toLowerCase().includes(q)) ||
        Boolean(
          ev.literaryProfile?.publicationFate &&
            ev.literaryProfile.publicationFate.toLowerCase().includes(q),
        ) ||
        Boolean(
          ev.literaryProfile?.culturalImpact &&
            ev.literaryProfile.culturalImpact.toLowerCase().includes(q),
        ) ||
        Boolean(ev.literaryProfile?.majorWorks?.some((work) => work.toLowerCase().includes(q))) ||
        Boolean(ev.syncTags?.some((tag) => tag.toLowerCase().includes(q))) ||
        Boolean(ev.referenceTags?.some((tag) => tag.toLowerCase().includes(q))) ||
        Boolean(ev.explicitLinks?.some((lnk) => lnk.label.toLowerCase().includes(q))) ||
        Boolean(
          ev.subEvents?.some(
            (s) =>
              s.title.toLowerCase().includes(q) ||
              s.text.toLowerCase().includes(q) ||
              (s.year !== undefined && String(s.year).toLowerCase().includes(q)),
          ),
        )
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
      if (!q && !filters.onlyWithSyncLinks && !filters.selectedPersonKey) return true;
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
    const startedBeforeWindow = !focusTarget && !isAtomicInView && eventObj.startYear < effectiveYearFrom;
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
      const effectiveEndYear = isBiographyNode(ev) ? ev.startYear : ev.endYear;
      if (ev.startYear <= endYear && effectiveEndYear >= startYear) {
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
      const effectiveEndYear = isBiographyNode(ev) ? ev.startYear : ev.endYear;
      if (ev.startYear <= y && effectiveEndYear >= y) {
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

export function isMajorCampaignOrConflictNode(
  ev: Pick<TimelineNode, 'task' | 'type' | 'eventType' | 'syncTags'>,
  branches?: BranchDefinition[],
): boolean {
  if (!isHistoricalEventNode(ev, branches)) return false;
  const task = ev.task || '';
  if (task.startsWith('WAR_')) return true;
  if (branches) {
    const b = branches.find((br) => br.id === task);
    if (b?.isMilitary) return true;
  }
  const typeLower = (ev.type || '').toLowerCase();
  const evTypeLower = (ev.eventType || '').toLowerCase();
  if (
    task === 'WORLD_CONTEXT' &&
    (evTypeLower === 'war' ||
      evTypeLower === 'crisis' ||
      typeLower.includes('войн') ||
      typeLower.includes('конфликт'))
  ) {
    return true;
  }
  return false;
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
  reignParticipants: RulerParticipantEntry[];
  topConnectedEvents: EnrichedEvent[];
  crossBranchLinks: ReignCrossBranchLink[];
  crossBranchPairs: ReignBranchPairSummary[];
}

function translateCrossLinkRole(linkType: string): { roleLabel: string; isDirectional: boolean } {
  switch (linkType) {
    case 'triggers':
    case 'causes':
      return { roleLabel: 'Прямая причина', isDirectional: true };
    case 'enables':
      return { roleLabel: 'Создаёт предпосылку', isDirectional: true };
    case 'consequence':
      return { roleLabel: 'Следствие', isDirectional: true };
    case 'about_event':
    case 'inspired_by':
    case 'references':
      return { roleLabel: 'Отражение и отсылка', isDirectional: true };
    default:
      return { roleLabel: 'Взаимосвязь в эпохе', isDirectional: false };
  }
}

function getLinkTypePriority(linkType: string): number {
  switch (linkType) {
    case 'triggers':
    case 'causes':
      return 5;
    case 'consequence':
      return 4;
    case 'enables':
      return 3;
    case 'about_event':
    case 'inspired_by':
    case 'references':
      return 2;
    default:
      return 1;
  }
}

export function getRulerPeriodSummaryData(
  ruler: RulerPeriod,
  enrichedEvents: EnrichedEvent[],
  branches?: BranchDefinition[],
  personDossiers?: Map<string, PersonDossier>,
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

  const dossierMap = personDossiers ?? buildPersonDossierIndex(enrichedEvents, [ruler]).dossiers;
  const rulerNormKeys = new Set<string>();
  [ruler.ruler, ruler.shortRuler].forEach((rName) => {
    const k = resolvePersonKey(rName, dossierMap);
    if (k) rulerNormKeys.add(k);
    const p = extractPreliminaryPersonKey(rName);
    if (p) rulerNormKeys.add(p.preliminaryKey);
  });

  const participantAcc = new Map<
    string,
    {
      personKey: string;
      displayName: string;
      reignEventIds: Set<string>;
      firstYearInReign: number;
      branchIds: Set<string>;
      totalEventCount: number;
      bioCardId: string | null;
    }
  >();

  reignEvents.forEach((ev) => {
    (ev.keyFigures || []).forEach((rawPerson) => {
      const resolvedKey = resolvePersonKey(rawPerson, dossierMap);
      if (!resolvedKey) return;
      if (rulerNormKeys.has(resolvedKey)) return;
      const dossier = dossierMap.get(resolvedKey);
      const existing = participantAcc.get(resolvedKey);
      if (existing) {
        existing.reignEventIds.add(ev.id);
        existing.firstYearInReign = Math.min(existing.firstYearInReign, ev.startYear);
        existing.branchIds.add(ev.task);
      } else {
        participantAcc.set(resolvedKey, {
          personKey: resolvedKey,
          displayName: dossier?.displayName || cleanPersonDisplay(rawPerson),
          reignEventIds: new Set([ev.id]),
          firstYearInReign: ev.startYear,
          branchIds: new Set([ev.task]),
          totalEventCount: dossier?.events.length ?? 1,
          bioCardId: dossier?.bioCard?.id ?? null,
        });
      }
    });
  });

  const reignParticipants: RulerParticipantEntry[] = Array.from(participantAcc.values())
    .map((entry) => ({
      personKey: entry.personKey,
      displayName: entry.displayName,
      reignEventCount: entry.reignEventIds.size,
      totalEventCount: entry.totalEventCount,
      firstYearInReign: entry.firstYearInReign,
      branchIds: Array.from(entry.branchIds),
      bioCardId: entry.bioCardId,
    }))
    .sort((a, b) => {
      if (b.reignEventCount !== a.reignEventCount) {
        return b.reignEventCount - a.reignEventCount;
      }
      if (b.totalEventCount !== a.totalEventCount) {
        return b.totalEventCount - a.totalEventCount;
      }
      return a.firstYearInReign - b.firstYearInReign;
    });

  // Топ ключевых событий правления по числу связей
  const topConnectedEvents = [...reignEvents]
    .filter((ev) => ev.explicitLinks.length > 0)
    .sort((a, b) => {
      if (b.explicitLinks.length !== a.explicitLinks.length) {
        return b.explicitLinks.length - a.explicitLinks.length;
      }
      const aCross = a.explicitLinks.filter((l) => l.targetEvent.task !== a.task).length;
      const bCross = b.explicitLinks.filter((l) => l.targetEvent.task !== b.task).length;
      if (bCross !== aCross) return bCross - aCross;
      return a.startYear - b.startYear;
    })
    .slice(0, 6);

  // Сводка уникальных межветвевых связок правления (включая выходы за границы правления)
  const branchMap = new Map((branches || []).map((b) => [b.id, b]));
  const overlappingNodeIds = new Set(overlappingAll.map((ev) => ev.id));
  const bestEdgeByPair = new Map<
    string,
    {
      edge: ReignCrossBranchLink;
      priority: number;
      isOutgoing: boolean;
    }
  >();

  overlappingAll.forEach((ev) => {
    ev.explicitLinks.forEach((lnk) => {
      const target = lnk.targetEvent;
      if (ev.task === target.task) return;

      const isOutgoing = lnk.direction === 'outgoing';
      const fromEvent = isOutgoing ? ev : target;
      const toEvent = isOutgoing ? target : ev;

      const canonicalEdgeKey = [fromEvent.id, toEvent.id].sort().join('__');
      const linkType = lnk.type || 'sync_context';
      const priority = getLinkTypePriority(linkType);

      const existing = bestEdgeByPair.get(canonicalEdgeKey);
      if (
        existing &&
        (existing.priority > priority ||
          (existing.priority === priority && (existing.isOutgoing || !isOutgoing)))
      ) {
        return;
      }

      const [sortedTaskA, sortedTaskB] = [fromEvent.task, toEvent.task].sort();
      const branchA = branchMap.get(sortedTaskA);
      const branchB = branchMap.get(sortedTaskB);
      const pairKey = `${sortedTaskA}__${sortedTaskB}`;
      const { roleLabel, isDirectional } = translateCrossLinkRole(linkType);
      const isHistoricalCircuit =
        isHistoricalEventNode(fromEvent, branches) && isHistoricalEventNode(toEvent, branches);

      bestEdgeByPair.set(canonicalEdgeKey, {
        priority,
        isOutgoing,
        edge: {
          id: canonicalEdgeKey,
          pairKey,
          branchAId: sortedTaskA,
          branchBId: sortedTaskB,
          branchALabel: branchA?.label || sortedTaskA,
          branchBLabel: branchB?.label || sortedTaskB,
          fromEvent,
          toEvent,
          linkType,
          roleLabel,
          isDirectional,
          description: lnk.label,
          isFromInReign: overlappingNodeIds.has(fromEvent.id),
          isToInReign: overlappingNodeIds.has(toEvent.id),
          isHistoricalCircuit,
        },
      });
    });
  });

  const crossBranchLinks = Array.from(bestEdgeByPair.values())
    .map((v) => v.edge)
    .sort((a, b) => {
      if (a.isHistoricalCircuit !== b.isHistoricalCircuit) {
        return a.isHistoricalCircuit ? -1 : 1;
      }
      const aYear = Math.min(a.fromEvent.startYear, a.toEvent.startYear);
      const bYear = Math.min(b.fromEvent.startYear, b.toEvent.startYear);
      if (aYear !== bYear) return aYear - bYear;
      return a.fromEvent.startYear - b.fromEvent.startYear;
    });

  const pairSummaryAcc = new Map<string, ReignBranchPairSummary>();
  crossBranchLinks.forEach((lnk) => {
    const existing = pairSummaryAcc.get(lnk.pairKey);
    if (existing) {
      existing.count += 1;
    } else {
      const bA = branchMap.get(lnk.branchAId);
      const bB = branchMap.get(lnk.branchBId);
      pairSummaryAcc.set(lnk.pairKey, {
        pairKey: lnk.pairKey,
        branchAId: lnk.branchAId,
        branchBId: lnk.branchBId,
        branchALabel: lnk.branchALabel,
        branchBLabel: lnk.branchBLabel,
        colorA: bA?.color || '#38bdf8',
        colorB: bB?.color || '#10b981',
        count: 1,
        isHistoricalCircuit: lnk.isHistoricalCircuit,
      });
    }
  });

  const crossBranchPairs = Array.from(pairSummaryAcc.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.isHistoricalCircuit !== b.isHistoricalCircuit) {
      return a.isHistoricalCircuit ? -1 : 1;
    }
    return a.branchALabel.localeCompare(b.branchALabel, 'ru');
  });

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
    reignParticipants,
    topConnectedEvents,
    crossBranchLinks,
    crossBranchPairs,
  };
}

// ============================================================================
// Нормализация персоналий (keyFigures) и построение досье исторических деятелей
// ============================================================================

function splitOutsideParens(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === '(') depth += 1;
    else if (ch === ')' && depth > 0) depth -= 1;

    if (ch === ',' && depth === 0) {
      const trimmed = current.trim();
      if (trimmed) parts.push(trimmed);
      current = '';
    } else {
      current += ch;
    }
  }

  const tail = current.trim();
  if (tail) parts.push(tail);
  return parts;
}

export function parseKeyFiguresList(raw: unknown): string[] | undefined {
  const list: string[] = [];
  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      if (typeof item === 'string' && item.trim().length > 0) {
        list.push(...splitOutsideParens(item));
      }
    });
  } else if (typeof raw === 'string' && raw.trim().length > 0) {
    list.push(...splitOutsideParens(raw));
  }
  return list.length > 0 ? list : undefined;
}

const PERSON_TITLE_PREFIXES = new Set([
  'князь',
  'великий',
  'великая',
  'княгиня',
  'царь',
  'царица',
  'царевич',
  'царевна',
  'император',
  'императрица',
  'король',
  'королева',
  'герцог',
  'принц',
  'граф',
  'графиня',
  'барон',
  'баронесса',
  'боярин',
  'боярыня',
  'дьяк',
  'старец',
  'протопоп',
  'митрополит',
  'патриарх',
  'архиепископ',
  'епископ',
  'кардинал',
  'папа',
  'султан',
  'хан',
  'шах',
  'гетман',
  'атаман',
  'дож',
  'генерал',
  'генерал-фельдмаршал',
  'фельдмаршал',
  'адмирал',
  'вице-адмирал',
  'маршал',
  'канцлер',
  'академик',
  'профессор',
  'доктор',
  'брат',
  'братья',
]);

const NOBILIARY_PARTICLES = new Set(['фон', 'де', 'ла', 'ван', 'дер', 'да']);

const HONORIFIC_SURNAME_NORMALIZATIONS: Record<string, string> = {
  'потемкин-таврический': 'потемкин',
  'румянцев-задунайский': 'румянцев',
  'суворов-рымникский': 'суворов',
  'кутузов-смоленский': 'кутузов',
  'орлов-чесменский': 'орлов',
  'дибич-забалканский': 'дибич',
  'паскевич-эриванский': 'паскевич',
  'скобелев-белый': 'скобелев',
};

const PERSON_ALIAS_OVERRIDES: Record<string, { key: string; preferredDisplay?: string }> = {
  'в. и. ленин': { key: 'person:ленин|в.и.', preferredDisplay: 'В. И. Ленин' },
  'в. и. ульянов': { key: 'person:ленин|в.и.', preferredDisplay: 'В. И. Ленин' },
  'владимир ульянов': { key: 'person:ленин|в.и.', preferredDisplay: 'В. И. Ленин' },
  ленин: { key: 'person:ленин|в.и.', preferredDisplay: 'В. И. Ленин' },
  'и. в. сталин': { key: 'person:сталин|и.в.', preferredDisplay: 'И. В. Сталин' },
  'и. в. джугашвили': { key: 'person:сталин|и.в.', preferredDisplay: 'И. В. Сталин' },
  сталин: { key: 'person:сталин|и.в.', preferredDisplay: 'И. В. Сталин' },
  'м. горький': { key: 'person:горький|м.', preferredDisplay: 'Максим Горький' },
  'максим горький': { key: 'person:горький|м.', preferredDisplay: 'Максим Горький' },
  'а. м. пешков': { key: 'person:горький|м.', preferredDisplay: 'Максим Горький' },
  'м. е. салтыков-щедрин': {
    key: 'person:салтыков-щедрин|м.е.',
    preferredDisplay: 'М. Е. Салтыков-Щедрин',
  },
  'салтыков-щедрин': {
    key: 'person:салтыков-щедрин|м.е.',
    preferredDisplay: 'М. Е. Салтыков-Щедрин',
  },
  щедрин: { key: 'person:салтыков-щедрин|м.е.', preferredDisplay: 'М. Е. Салтыков-Щедрин' },
  'иван грозный': { key: 'monarch:иван iv', preferredDisplay: 'Иван IV Грозный' },
  'иван iv грозный': { key: 'monarch:иван iv', preferredDisplay: 'Иван IV Грозный' },
  'иван iv': { key: 'monarch:иван iv', preferredDisplay: 'Иван IV Грозный' },
  'петр великий': { key: 'monarch:петр i', preferredDisplay: 'Пётр I' },
  'петр i великий': { key: 'monarch:петр i', preferredDisplay: 'Пётр I' },
  'екатерина великая': { key: 'monarch:екатерина ii', preferredDisplay: 'Екатерина II' },
  'владимир всеволодович мономах': {
    key: 'medieval:владимир мономах',
    preferredDisplay: 'Владимир Мономах',
  },
  'владимир мономах': { key: 'medieval:владимир мономах', preferredDisplay: 'Владимир Мономах' },
  'ярослав мудрый': { key: 'medieval:ярослав мудрый', preferredDisplay: 'Ярослав Мудрый' },
  'олег вещий': { key: 'medieval:олег вещий', preferredDisplay: 'Олег Вещий' },
  'игорь рюрикович': { key: 'medieval:игорь рюрикович', preferredDisplay: 'Игорь Рюрикович' },
  'иван калита': { key: 'medieval:иван калита', preferredDisplay: 'Иван Калита' },
  'дмитрий донской': { key: 'medieval:дмитрий донской', preferredDisplay: 'Дмитрий Донской' },
  'александр невский': {
    key: 'medieval:александр невский',
    preferredDisplay: 'Александр Невский',
  },
  'алексей михайлович': {
    key: 'monarch:алексей михайлович',
    preferredDisplay: 'Алексей Михайлович',
  },
  'михаил федорович': { key: 'monarch:михаил федорович', preferredDisplay: 'Михаил Фёдорович' },
  'федор алексеевич': { key: 'monarch:федор алексеевич', preferredDisplay: 'Фёдор Алексеевич' },
  'борис годунов': { key: 'monarch:борис годунов', preferredDisplay: 'Борис Годунов' },
  'иван iii васильевич': { key: 'monarch:иван iii', preferredDisplay: 'Иван III' },
  'иван iii': { key: 'monarch:иван iii', preferredDisplay: 'Иван III' },
  'василий iii': { key: 'monarch:василий iii', preferredDisplay: 'Василий III' },
  'софья алексеевна': { key: 'monarch:софья алексеевна', preferredDisplay: 'Софья Алексеевна' },
  'елизавета петровна': {
    key: 'monarch:елизавета петровна',
    preferredDisplay: 'Елизавета Петровна',
  },
  'анна иоанновна': { key: 'monarch:анна иоанновна', preferredDisplay: 'Анна Иоанновна' },
  'елена васильевна глинская': {
    key: 'monarch:елена глинская',
    preferredDisplay: 'Елена Глинская',
  },
  'елена глинская': { key: 'monarch:елена глинская', preferredDisplay: 'Елена Глинская' },
  'аввакум петров': { key: 'person:аввакум петров', preferredDisplay: 'Протопоп Аввакум' },
  аввакум: { key: 'person:аввакум петров', preferredDisplay: 'Протопоп Аввакум' },
  'нестор летописец': { key: 'person:нестор летописец', preferredDisplay: 'Нестор Летописец' },
  нестор: { key: 'person:нестор летописец', preferredDisplay: 'Нестор Летописец' },
};

function cleanPersonDisplay(raw: string): string {
  return raw.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim() || raw.trim();
}

function normalizeTextForKey(raw: string): string {
  return raw
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[«»"']/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'Е')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

interface PreliminaryPersonParsed {
  preliminaryKey: string;
  surname: string;
  initials: string[];
  isMonarchOrAlias: boolean;
  preferredDisplay?: string;
}

function extractPreliminaryPersonKey(raw: string): PreliminaryPersonParsed | null {
  const cleaned = normalizeTextForKey(raw);
  if (!cleaned) return null;

  const rawTokens = cleaned.split(' ').filter(Boolean);
  while (rawTokens.length > 1 && PERSON_TITLE_PREFIXES.has(rawTokens[0])) {
    rawTokens.shift();
  }
  const strippedPhrase = rawTokens.join(' ').replace(/\s*\.\s*/g, '. ').replace(/\s+/g, ' ').trim();
  const compactInitialPhrase = strippedPhrase
    .replace(/([а-яa-z])\.([а-яa-z])\./gi, '$1. $2.')
    .replace(/\s+/g, ' ')
    .trim();

  const aliasHit =
    PERSON_ALIAS_OVERRIDES[compactInitialPhrase] || PERSON_ALIAS_OVERRIDES[strippedPhrase];
  if (aliasHit) {
    return {
      preliminaryKey: aliasHit.key,
      surname: aliasHit.key,
      initials: [],
      isMonarchOrAlias: true,
      preferredDisplay: aliasHit.preferredDisplay,
    };
  }

  // Римские цифры монархов / правителей / пап («николай ii», «людовик xiv», «фридрих ii великий»)
  const romanIdx = rawTokens.findIndex((t) => /^[ivxlcdm]+$/i.test(t));
  if (romanIdx > 0) {
    const monarchBase = rawTokens.slice(0, romanIdx + 1).join(' ');
    return {
      preliminaryKey: `monarch:${monarchBase}`,
      surname: monarchBase,
      initials: [],
      isMonarchOrAlias: true,
    };
  }

  // Если фраза явно групповая («пересвет и ослябя», «крестовоздвиженской общины» и т.п.)
  if (rawTokens.includes('и') || rawTokens.includes('общины')) {
    return {
      preliminaryKey: `group:${strippedPhrase}`,
      surname: strippedPhrase,
      initials: [],
      isMonarchOrAlias: true,
    };
  }

  // Разделяем токены с точками-инициалами (например, «с.ю.» -> ['с.', 'ю.']) и отфильтровываем дворянские частицы
  const expandedTokens: string[] = [];
  rawTokens.forEach((tok) => {
    if (/^([а-яa-z]\.){2,}$/i.test(tok)) {
      const letters = tok.split('.').filter(Boolean);
      letters.forEach((l) => expandedTokens.push(`${l}.`));
    } else if (!NOBILIARY_PARTICLES.has(tok)) {
      expandedTokens.push(tok);
    }
  });

  if (expandedTokens.length === 0) return null;

  const isInitialToken = (t: string) => /^[а-яa-z]\.$/i.test(t) || /^[а-яa-z]$/i.test(t);

  // Формат «Витте С. Ю.» (фамилия в начале, далее инициалы)
  if (
    expandedTokens.length >= 2 &&
    !isInitialToken(expandedTokens[0]) &&
    expandedTokens.slice(1).every(isInitialToken)
  ) {
    const rawSurname = expandedTokens[0].replace(/\.$/, '');
    const surname = HONORIFIC_SURNAME_NORMALIZATIONS[rawSurname] || rawSurname;
    const initials = expandedTokens.slice(1).map((t) => t.replace(/\.$/, '')[0]);
    return {
      preliminaryKey: `person:${surname}|${initials.join('.')}`,
      surname,
      initials,
      isMonarchOrAlias: false,
    };
  }

  // Формат «С. Ю. Витте» или «Сергей Юльевич Витте» или «Гарри Трумэн» или «Сперанский»
  const lastRaw = expandedTokens[expandedTokens.length - 1].replace(/\.$/, '');
  const surname = HONORIFIC_SURNAME_NORMALIZATIONS[lastRaw] || lastRaw;

  if (expandedTokens.length === 1) {
    return {
      preliminaryKey: `surname:${surname}`,
      surname,
      initials: [],
      isMonarchOrAlias: false,
    };
  }

  const headTokens = expandedTokens.slice(0, -1);
  const initials = headTokens
    .map((t) => t.replace(/\.$/, '')[0])
    .filter((ch): ch is string => Boolean(ch));

  return {
    preliminaryKey: `person:${surname}|${initials.join('.')}`,
    surname,
    initials,
    isMonarchOrAlias: false,
  };
}

function pickBestPersonDisplayName(variants: string[], preferred?: string): string {
  if (preferred) return preferred;
  const cleaned = variants.map(cleanPersonDisplay).filter(Boolean);
  if (cleaned.length === 0) return variants[0] || '';
  return cleaned.sort((a, b) => {
    const aHasHonorific = /-(таврический|задунайский|рымникский|смоленский|чесменский)/i.test(a);
    const bHasHonorific = /-(таврический|задунайский|рымникский|смоленский|чесменский)/i.test(b);
    if (aHasHonorific !== bHasHonorific) return aHasHonorific ? 1 : -1;
    const aHasInitials = /[А-ЯЁA-Z]\.\s*[А-ЯЁA-Z]?\.?/.test(a);
    const bHasInitials = /[А-ЯЁA-Z]\.\s*[А-ЯЁA-Z]?\.?/.test(b);
    if (aHasInitials !== bHasInitials) return aHasInitials ? -1 : 1;
    return a.length - b.length;
  })[0];
}

function doesRawMatchPersonKey(raw: string, canonicalKey: string): boolean {
  const parsed = extractPreliminaryPersonKey(raw);
  if (!parsed) return false;
  if (parsed.preliminaryKey === canonicalKey) return true;
  if (!canonicalKey.startsWith('person:') || parsed.isMonarchOrAlias) return false;
  const [, targetBody] = canonicalKey.split(':');
  const [targetSurname, targetInitStr = ''] = targetBody.split('|');
  if (parsed.surname !== targetSurname) return false;
  if (parsed.initials.length === 0) return true;
  const parsedInitStr = parsed.initials.join('.');
  return targetInitStr.startsWith(parsedInitStr) || parsedInitStr.startsWith(targetInitStr);
}

export function buildPersonDossierIndex(
  enrichedEvents: EnrichedEvent[],
  rulers: RulerPeriod[],
): {
  dossiers: Map<string, PersonDossier>;
  rawToKey: Map<string, string>;
} {
  // Первый проход: собираем статистику инициалов по каждой фамилии, чтобы безопасно склеивать
  // однозначные бесфамильные упоминания («Сперанский» -> «М. М. Сперанский») и разделять тёзок
  const initialsBySurname = new Map<string, Set<string>>();
  const twoInitialsBySurnameFirst = new Map<string, Set<string>>();

  enrichedEvents.forEach((ev) => {
    (ev.keyFigures || []).forEach((raw) => {
      const parsed = extractPreliminaryPersonKey(raw);
      if (!parsed || parsed.isMonarchOrAlias || parsed.initials.length === 0) return;
      const initKey = parsed.initials.join('.');
      if (!initialsBySurname.has(parsed.surname)) {
        initialsBySurname.set(parsed.surname, new Set());
      }
      initialsBySurname.get(parsed.surname)!.add(initKey);

      if (parsed.initials.length >= 2) {
        const prefixKey = `${parsed.surname}|${parsed.initials[0]}`;
        if (!twoInitialsBySurnameFirst.has(prefixKey)) {
          twoInitialsBySurnameFirst.set(prefixKey, new Set());
        }
        twoInitialsBySurnameFirst.get(prefixKey)!.add(initKey);
      }
    });
  });

  // Карта свёртывания одноинициаловых вариантов («Сергей Витте» -> «С. Ю. Витте», если «с.*» уникален)
  const rawToKey = new Map<string, string>();
  const resolveCanonical = (raw: string): { key: string; preferred?: string } | null => {
    const parsed = extractPreliminaryPersonKey(raw);
    if (!parsed) return null;
    if (parsed.isMonarchOrAlias) {
      return { key: parsed.preliminaryKey, preferred: parsed.preferredDisplay };
    }

    const allForSurname = initialsBySurname.get(parsed.surname);
    if (parsed.initials.length === 0) {
      if (allForSurname && allForSurname.size === 1) {
        const onlyInit = Array.from(allForSurname)[0];
        return { key: `person:${parsed.surname}|${onlyInit}` };
      }
      return { key: `surname:${parsed.surname}` };
    }

    if (parsed.initials.length === 1) {
      const prefixKey = `${parsed.surname}|${parsed.initials[0]}`;
      const twoInitMatches = twoInitialsBySurnameFirst.get(prefixKey);
      if (twoInitMatches && twoInitMatches.size === 1) {
        const onlyTwoInit = Array.from(twoInitMatches)[0];
        return { key: `person:${parsed.surname}|${onlyTwoInit}` };
      }
    }

    return { key: `person:${parsed.surname}|${parsed.initials.join('.')}` };
  };

  interface Accumulator {
    variants: Set<string>;
    preferred?: string;
    eventsMap: Map<string, EnrichedEvent>;
    bioCard: EnrichedEvent | null;
  }

  const acc = new Map<string, Accumulator>();

  enrichedEvents.forEach((ev) => {
    const isBio = isBiographyNode(ev);
    (ev.keyFigures || []).forEach((raw, idx) => {
      const res = resolveCanonical(raw);
      if (!res) return;
      rawToKey.set(raw, res.key);

      let entry = acc.get(res.key);
      if (!entry) {
        entry = {
          variants: new Set<string>(),
          preferred: res.preferred,
          eventsMap: new Map<string, EnrichedEvent>(),
          bioCard: null,
        };
        acc.set(res.key, entry);
      }
      entry.variants.add(raw);
      entry.eventsMap.set(ev.id, ev);

      if (isBio && idx === 0 && !entry.bioCard) {
        entry.bioCard = ev;
      }
    });
  });

  const rulerById = new Map(rulers.map((r) => [r.id, r]));
  const dossiers = new Map<string, PersonDossier>();

  acc.forEach((entry, key) => {
    const events = Array.from(entry.eventsMap.values()).sort((a, b) => {
      if (a.startYear !== b.startYear) return a.startYear - b.startYear;
      return a.endYear - b.endYear;
    });
    const eventIds = new Set(events.map((e) => e.id));
    const variants = Array.from(entry.variants);
    const displayName = pickBestPersonDisplayName(variants, entry.preferred);

    const touchedRulerIds = new Set<string>();
    const branchCounts: Record<string, number> = {};
    let minYear = Infinity;
    let maxYear = -Infinity;

    events.forEach((ev) => {
      minYear = Math.min(minYear, ev.startYear);
      maxYear = Math.max(maxYear, ev.endYear);
      branchCounts[ev.task] = (branchCounts[ev.task] || 0) + 1;
      ev.overlappingRulers.forEach((r) => touchedRulerIds.add(r.id));
    });

    const personRulers = Array.from(touchedRulerIds)
      .map((id) => rulerById.get(id))
      .filter((r): r is RulerPeriod => Boolean(r))
      .sort((a, b) => a.startYear - b.startYear);

    dossiers.set(key, {
      key,
      displayName,
      variants,
      events,
      eventIds,
      bioCard: entry.bioCard,
      rulers: personRulers,
      yearRange: {
        min: Number.isFinite(minYear) ? minYear : 862,
        max: Number.isFinite(maxYear) ? maxYear : 2000,
      },
      branchCounts,
    });
  });

  return { dossiers, rawToKey };
}

export function resolvePersonKey(
  rawName: string,
  dossiers: Map<string, PersonDossier>,
  rawToKey?: Map<string, string>,
): string | null {
  if (dossiers.has(rawName)) return rawName;
  if (rawToKey && rawToKey.has(rawName)) {
    return rawToKey.get(rawName) ?? null;
  }
  const prelim = extractPreliminaryPersonKey(rawName);
  if (prelim && dossiers.has(prelim.preliminaryKey)) {
    return prelim.preliminaryKey;
  }
  for (const [key, dossier] of dossiers.entries()) {
    if (
      dossier.variants.includes(rawName) ||
      doesRawMatchPersonKey(rawName, key)
    ) {
      return key;
    }
  }
  return null;
}

export function searchPersonDossiers(
  query: string,
  dossiers: Map<string, PersonDossier>,
  limit = 6,
): PersonDossier[] {
  const q = query.trim().toLowerCase().replace(/ё/g, 'е');
  if (q.length < 2) return [];

  const matches: Array<{ dossier: PersonDossier; score: number }> = [];
  dossiers.forEach((dossier) => {
    const dispNorm = dossier.displayName.toLowerCase().replace(/ё/g, 'е');
    const variantsNorm = dossier.variants.map((v) => v.toLowerCase().replace(/ё/g, 'е'));

    let score = 0;
    if (dispNorm.startsWith(q)) score += 30;
    else if (dispNorm.includes(q)) score += 20;
    else if (variantsNorm.some((v) => v.includes(q))) score += 15;
    else if (dossier.key.includes(q)) score += 10;

    if (score > 0) {
      score += Math.min(dossier.events.length, 15);
      if (dossier.bioCard) score += 4;
      matches.push({ dossier, score });
    }
  });

  return matches
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.dossier.events.length - a.dossier.events.length;
    })
    .slice(0, limit)
    .map((m) => m.dossier);
}







