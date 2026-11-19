import type {
  AxisResolution,
  BranchDefinition,
  CalendarStyle,
  DateCalendarParts,
  MacroEra,
  PreciseDateParts,
  ResolvedMacroEra,
  StreamRow,
  TimelineNode,
} from '../../types/timeline';

export const MONTHS_SHORT_RU = [
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

const MONTHS_GENITIVE_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

const MONTHS_NOMINATIVE_RU = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

function gregorianToJdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yAdj = y + 4800 - a;
  const mAdj = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mAdj + 2) / 5) +
    365 * yAdj +
    Math.floor(yAdj / 4) -
    Math.floor(yAdj / 100) +
    Math.floor(yAdj / 400) -
    32045
  );
}

function julianToJdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yAdj = y + 4800 - a;
  const mAdj = m + 12 * a - 3;
  return d + Math.floor((153 * mAdj + 2) / 5) + 365 * yAdj + Math.floor(yAdj / 4) - 32083;
}

function jdnToGregorian(jdn: number): { year: number; month: number; day: number } {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

function jdnToJulian(jdn: number): { year: number; month: number; day: number } {
  const c = jdn + 32082;
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

function isBeforeGregorianIntro(
  year: number,
  month: number | undefined,
  day: number | undefined,
  explicitStyle?: CalendarStyle,
): boolean {
  if (year < 1582) return true;
  if (year > 1582) return false;
  const m = month ?? 1;
  if (m < 10) return true;
  if (m > 10) return false;
  if (day === undefined) return false;
  return day < (explicitStyle === 'julian' ? 5 : 15);
}

function isModernGregorianEra(
  year: number,
  month: number | undefined,
  day: number | undefined,
  explicitStyle?: CalendarStyle,
): boolean {
  if (year > 1918) return true;
  if (year < 1918) return false;
  const m = month ?? 1;
  if (m > 2) return true;
  if (m < 2) return false;
  if (day !== undefined) {
    return explicitStyle === 'julian' ? day > 1 : day >= 14;
  }
  return explicitStyle === 'gregorian' || explicitStyle === undefined;
}

export function resolveEffectiveCalendarStyle(
  year: number,
  month: number | undefined,
  day: number | undefined,
  explicitStyle?: CalendarStyle,
  taskHint?: string,
): CalendarStyle {
  if (isBeforeGregorianIntro(year, month, day, explicitStyle)) {
    return 'julian';
  }
  if (isModernGregorianEra(year, month, day, explicitStyle)) {
    return 'gregorian';
  }
  if (explicitStyle === 'julian' || explicitStyle === 'gregorian' || explicitStyle === 'both') {
    return explicitStyle;
  }
  if (taskHint === 'WORLD_CONTEXT') return 'gregorian';
  if (taskHint === 'DIPLOMACY_TREATIES') return 'both';
  return 'julian';
}

export function parseEventYears(periodStr: string, _eventId?: string): { startYear: number; endYear: number } {
  const matches = periodStr.match(/\b(\d{3,4})\b/g);
  const nums = (matches || []).map(Number).filter((n) => n >= 100 && n <= 2100);
  if (nums.length === 0) {
    return { startYear: 1700, endYear: 1700 };
  }
  const startYear = nums[0];
  const endYear = nums.length > 1 ? Math.max(...nums) : startYear;
  return { startYear, endYear: Math.max(startYear, endYear) };
}

export function parsePreciseDate(
  rawDate: string | undefined,
  fallbackYear: number,
  isEnd = false,
  options?: { calendarStyle?: CalendarStyle; task?: string },
): PreciseDateParts {
  let year = fallbackYear;
  let month: number | undefined;
  let day: number | undefined;
  let precision: AxisResolution = 'year';

  if (rawDate) {
    const match = rawDate.trim().match(/^(\d{3,4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
    if (match) {
      year = Number(match[1]);
      month = match[2] ? Math.max(1, Math.min(12, Number(match[2]))) : undefined;
      day = match[3] ? Math.max(1, Math.min(31, Number(match[3]))) : undefined;
      precision = day !== undefined ? 'day' : month !== undefined ? 'month' : 'year';
    }
  }

  const origSortMonth = month ?? (isEnd ? 12 : 1);
  const origSortDay = day ?? (isEnd ? 28 : 1);
  const original: DateCalendarParts = {
    year,
    month,
    day,
    precision,
    sortKey: year * 10000 + origSortMonth * 100 + origSortDay,
  };

  if (precision === 'year') {
    const resolvedStyle = resolveEffectiveCalendarStyle(
      year,
      undefined,
      undefined,
      options?.calendarStyle,
      options?.task,
    );
    return {
      ...original,
      calendarStyle: resolvedStyle,
      original,
      unified: original,
      offsetDays: 0,
      hasStyleSplit: false,
    };
  }

  const resolvedStyle = resolveEffectiveCalendarStyle(
    year,
    month,
    day,
    options?.calendarStyle,
    options?.task,
  );

  if (isModernGregorianEra(year, month, day, options?.calendarStyle)) {
    return {
      ...original,
      calendarStyle: 'gregorian',
      original,
      unified: original,
      gregorianParts: original,
      offsetDays: 0,
      hasStyleSplit: false,
    };
  }

  if (isBeforeGregorianIntro(year, month, day, options?.calendarStyle)) {
    return {
      ...original,
      calendarStyle: 'julian',
      original,
      unified: original,
      julianParts: original,
      offsetDays: 0,
      hasStyleSplit: true,
    };
  }

  if (precision === 'day' && month !== undefined && day !== undefined) {
    if (resolvedStyle === 'julian') {
      const jdn = julianToJdn(year, month, day);
      const g = jdnToGregorian(jdn);
      const offsetDays = julianToJdn(year, month, day) - gregorianToJdn(year, month, day);
      const gregorianParts: DateCalendarParts = {
        year: g.year,
        month: g.month,
        day: g.day,
        precision: 'day',
        sortKey: g.year * 10000 + g.month * 100 + g.day,
      };
      return {
        ...gregorianParts,
        calendarStyle: 'julian',
        original,
        unified: gregorianParts,
        julianParts: original,
        gregorianParts,
        offsetDays,
        hasStyleSplit: true,
      };
    }

    const jdn = gregorianToJdn(year, month, day);
    const j = jdnToJulian(jdn);
    const offsetDays = julianToJdn(j.year, j.month, j.day) - gregorianToJdn(j.year, j.month, j.day);
    const julianParts: DateCalendarParts = {
      year: j.year,
      month: j.month,
      day: j.day,
      precision: 'day',
      sortKey: j.year * 10000 + j.month * 100 + j.day,
    };
    return {
      ...original,
      calendarStyle: resolvedStyle,
      original,
      unified: original,
      julianParts,
      gregorianParts: original,
      offsetDays,
      hasStyleSplit: true,
    };
  }

  const refMonth = month ?? 1;
  const offsetDays = julianToJdn(year, refMonth, 15) - gregorianToJdn(year, refMonth, 15);
  const unifiedSortDay =
    resolvedStyle === 'julian' && !isEnd ? Math.min(28, 1 + Math.max(0, offsetDays)) : origSortDay;
  const unified: DateCalendarParts = {
    year,
    month,
    precision: 'month',
    sortKey: year * 10000 + refMonth * 100 + unifiedSortDay,
  };

  return {
    ...unified,
    calendarStyle: resolvedStyle,
    original,
    unified,
    julianParts: resolvedStyle === 'julian' || resolvedStyle === 'both' ? original : undefined,
    gregorianParts: resolvedStyle === 'gregorian' || resolvedStyle === 'both' ? original : undefined,
    offsetDays,
    hasStyleSplit: true,
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

function formatSimplePartsShort(parts: DateCalendarParts, resolution: AxisResolution): string {
  if (resolution === 'day' && parts.day !== undefined && parts.month !== undefined) {
    return `${parts.day} ${MONTHS_SHORT_RU[parts.month - 1]} ${parts.year}`;
  }
  if ((resolution === 'day' || resolution === 'month') && parts.month !== undefined) {
    return `${MONTHS_SHORT_RU[parts.month - 1]} ${parts.year}`;
  }
  return `${parts.year} г.`;
}

function formatDualCompactParts(j: DateCalendarParts, g: DateCalendarParts): string {
  if (j.day !== undefined && g.day !== undefined && j.month !== undefined && g.month !== undefined) {
    if (j.year === g.year && j.month === g.month) {
      return `${j.day} (${g.day}) ${MONTHS_SHORT_RU[j.month - 1]} ${j.year}`;
    }
    if (j.year === g.year) {
      return `${j.day} ${MONTHS_SHORT_RU[j.month - 1]} (${g.day} ${MONTHS_SHORT_RU[g.month - 1]}) ${j.year}`;
    }
    return `${j.day} ${MONTHS_SHORT_RU[j.month - 1]} ${j.year} (${g.day} ${MONTHS_SHORT_RU[g.month - 1]} ${g.year})`;
  }
  return formatSimplePartsShort(g, 'day');
}

function formatDualFullParts(j: DateCalendarParts, g: DateCalendarParts): string {
  if (j.day !== undefined && g.day !== undefined && j.month !== undefined && g.month !== undefined) {
    if (j.year === g.year && j.month === g.month) {
      return `${j.day} (${g.day}) ${MONTHS_GENITIVE_RU[j.month - 1]} ${j.year}`;
    }
    if (j.year === g.year) {
      return `${j.day} ${MONTHS_GENITIVE_RU[j.month - 1]} (${g.day} ${MONTHS_GENITIVE_RU[g.month - 1]}) ${j.year}`;
    }
    return `${j.day} ${MONTHS_GENITIVE_RU[j.month - 1]} ${j.year} (${g.day} ${MONTHS_GENITIVE_RU[g.month - 1]} ${g.year})`;
  }
  return formatSimplePartsShort(g, 'day');
}

export function getCalendarStyleAxisMarker(parts: PreciseDateParts): {
  label: string;
  tone: 'julian' | 'gregorian' | 'both';
} | null {
  if (!parts.hasStyleSplit) return null;
  if (parts.calendarStyle === 'gregorian') {
    return { label: 'н. ст.', tone: 'gregorian' };
  }
  if (parts.calendarStyle === 'both') {
    return { label: 'ст./н. ст.', tone: 'both' };
  }
  return {
    label: parts.offsetDays > 0 ? 'ст. ст. → н. ст.' : 'ст. ст.',
    tone: 'julian',
  };
}

export function formatCalendarDetailBadge(parts: PreciseDateParts): {
  primaryText: string;
  styleLabel: string;
  counterpartText?: string;
  offsetNote?: string;
  tone: 'julian' | 'gregorian' | 'both';
} {
  const { precision, calendarStyle, original, julianParts, gregorianParts, offsetDays, hasStyleSplit } = parts;

  if (precision === 'day' && original.day !== undefined && original.month !== undefined) {
    const origFull = `${original.day} ${MONTHS_GENITIVE_RU[original.month - 1]} ${original.year}`;

    if (!hasStyleSplit) {
      return {
        primaryText: origFull,
        styleLabel: 'н. ст.',
        tone: 'gregorian',
      };
    }

    if (julianParts && !gregorianParts) {
      return {
        primaryText: origFull,
        styleLabel: 'ст. ст. (юлианский календарь)',
        tone: 'julian',
      };
    }

    if (julianParts && gregorianParts && julianParts.day !== undefined && gregorianParts.day !== undefined) {
      const jFull = `${julianParts.day} ${MONTHS_GENITIVE_RU[(julianParts.month ?? 1) - 1]} ${julianParts.year}`;
      const gFull = `${gregorianParts.day} ${MONTHS_GENITIVE_RU[(gregorianParts.month ?? 1) - 1]} ${gregorianParts.year}`;
      if (calendarStyle === 'gregorian') {
        return {
          primaryText: gFull,
          styleLabel: 'новый стиль (григор.)',
          counterpartText: `${jFull} (ст. ст.)`,
          offsetNote: offsetDays > 0 ? `разница ${offsetDays} дн.` : undefined,
          tone: 'gregorian',
        };
      }
      if (calendarStyle === 'both') {
        return {
          primaryText: formatDualFullParts(julianParts, gregorianParts),
          styleLabel: 'ст. ст. (н. ст.)',
          offsetNote: offsetDays > 0 ? `сдвиг ${offsetDays} дн.` : undefined,
          tone: 'both',
        };
      }
      return {
        primaryText: jFull,
        styleLabel: 'старый стиль (юлиан.)',
        counterpartText: `${gFull} (н. ст.)`,
        offsetNote: offsetDays > 0 ? `+${offsetDays} дн. на единой шкале` : undefined,
        tone: 'julian',
      };
    }
  }

  if (precision === 'month' && original.month !== undefined) {
    const mName = MONTHS_NOMINATIVE_RU[original.month - 1];
    const origMonthFull = `${mName} ${original.year}`;
    if (!hasStyleSplit) {
      return {
        primaryText: origMonthFull,
        styleLabel: 'н. ст.',
        tone: 'gregorian',
      };
    }
    if (calendarStyle === 'gregorian') {
      return {
        primaryText: origMonthFull,
        styleLabel: 'новый стиль (григор.)',
        offsetNote: offsetDays > 0 ? `ст. ст. на ${offsetDays} дн. раньше` : undefined,
        tone: 'gregorian',
      };
    }
    if (calendarStyle === 'both') {
      return {
        primaryText: origMonthFull,
        styleLabel: 'ст. ст. / н. ст.',
        offsetNote: offsetDays > 0 ? `разница ${offsetDays} дн.` : undefined,
        tone: 'both',
      };
    }
    return {
      primaryText: origMonthFull,
      styleLabel: 'старый стиль (юлиан.)',
      offsetNote: offsetDays > 0 ? `+${offsetDays} дн. к новому стилю` : undefined,
      tone: 'julian',
    };
  }

  return {
    primaryText: `${original.year} г.`,
    styleLabel: calendarStyle === 'julian' ? 'ст. ст.' : 'н. ст.',
    tone: calendarStyle,
  };
}

export function formatDateForResolution(parts: PreciseDateParts, resolution: AxisResolution): string {
  if (resolution === 'year') {
    return `${parts.unified.year} г.`;
  }
  if (!parts.hasStyleSplit) {
    return formatSimplePartsShort(parts.unified, resolution);
  }
  if (
    resolution === 'day' &&
    parts.precision === 'day' &&
    (parts.calendarStyle === 'julian' || parts.calendarStyle === 'both') &&
    parts.julianParts &&
    parts.gregorianParts
  ) {
    return formatDualCompactParts(parts.julianParts, parts.gregorianParts);
  }
  if (parts.calendarStyle === 'julian' && parts.julianParts) {
    return formatSimplePartsShort(parts.julianParts, resolution);
  }
  return formatSimplePartsShort(parts.unified, resolution);
}

function formatCompactAxisDate(parts: PreciseDateParts, resolution: AxisResolution): string {
  if (resolution === 'day' && parts.unified.day !== undefined && parts.unified.month !== undefined) {
    return `${parts.unified.day} ${MONTHS_SHORT_RU[parts.unified.month - 1]} ${parts.unified.year}`;
  }
  if ((resolution === 'day' || resolution === 'month') && parts.unified.month !== undefined) {
    return `${MONTHS_SHORT_RU[parts.unified.month - 1]} ${parts.unified.year}`;
  }
  return `${parts.unified.year}`;
}

function buildGutterStyleInfo(
  parts: PreciseDateParts,
  resolution: AxisResolution,
): { styleLabel?: string; styleTone?: 'julian' | 'gregorian' | 'both'; detailText: string } {
  const detail = formatCalendarDetailBadge(parts);
  const detailText = detail.counterpartText
    ? `${detail.primaryText} (${detail.styleLabel}) = ${detail.counterpartText}`
    : detail.offsetNote
      ? `${detail.primaryText} (${detail.styleLabel}, ${detail.offsetNote})`
      : `${detail.primaryText}`;

  if (resolution === 'year' || !parts.hasStyleSplit) {
    return { detailText };
  }

  if (parts.calendarStyle === 'gregorian') {
    return {
      styleLabel: 'н. ст.',
      styleTone: 'gregorian',
      detailText,
    };
  }

  if (
    resolution === 'day' &&
    parts.precision === 'day' &&
    parts.julianParts?.day !== undefined &&
    parts.julianParts?.month !== undefined &&
    parts.gregorianParts
  ) {
    return {
      styleLabel: `ст. ${parts.julianParts.day} ${MONTHS_SHORT_RU[parts.julianParts.month - 1]}`,
      styleTone: parts.calendarStyle === 'both' ? 'both' : 'julian',
      detailText,
    };
  }

  return {
    styleLabel: parts.calendarStyle === 'both' ? 'ст./н. ст.' : 'ст. ст.',
    styleTone: parts.calendarStyle === 'both' ? 'both' : 'julian',
    detailText,
  };
}

export function formatAxisGutterDate(
  row: StreamRow,
  resolution: AxisResolution,
): {
  label: string;
  styleLabel?: string;
  styleTone?: 'julian' | 'gregorian' | 'both';
  title: string;
} {
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
      styleLabel: row.year <= 1918 ? 'н. ст.' : undefined,
      styleTone: row.year <= 1918 ? 'gregorian' : undefined,
      title:
        row.year <= 1918
          ? `Опорная отметка единой шкалы (н. ст.): ${row.label}`
          : `Опорная отметка оси времени: ${row.label}`,
    };
  }

  if (row.rowType === 'RULER_COMMIT') {
    if (row.startedBeforeWindow) {
      return {
        label: `с ${row.rulerObj.startYear}`,
        title: `Правление ${row.rulerObj.shortRuler} началось в ${row.rulerObj.startYear} г. (до начала окна)`,
      };
    }
    const parts = parsePreciseDate(row.rulerObj.startDate, row.rulerObj.startYear, false, {
      calendarStyle: row.rulerObj.calendarStyle,
      task: 'MAIN_RULERS',
    });
    const styleInfo = buildGutterStyleInfo(parts, resolution);
    return {
      label: formatCompactAxisDate(parts, resolution),
      styleLabel: styleInfo.styleLabel,
      styleTone: styleInfo.styleTone,
      title: `Начало правления (${row.rulerObj.shortRuler}): ${styleInfo.detailText}`,
    };
  }

  if (row.rowType === 'RULER_END') {
    const parts = parsePreciseDate(row.rulerObj.endDate, row.rulerObj.endYear, true, {
      calendarStyle: row.rulerObj.calendarStyle,
      task: 'MAIN_RULERS',
    });
    const styleInfo = buildGutterStyleInfo(parts, resolution);
    return {
      label: formatCompactAxisDate(parts, resolution),
      styleLabel: styleInfo.styleLabel,
      styleTone: styleInfo.styleTone,
      title: `Завершение правления (${row.rulerObj.shortRuler}): ${styleInfo.detailText}`,
    };
  }

  if (row.rowType === 'EVENT_COMMIT') {
    const isBio = isBiographyNode(row.eventObj);
    if (isBio) {
      if (row.startedBeforeWindow) {
        return {
          label: `акт. с ${row.eventObj.activeFrom}`,
          title: `Творческая/научная активность началась в ${row.eventObj.activeFrom} г. и продолжается в окне (годы жизни: ${row.eventObj.period}) — ${row.eventObj.title}`,
        };
      }
      return {
        label: `с ${row.eventObj.activeFrom}`,
        title: `Начало активной деятельности: ${row.eventObj.activeFrom} г. (годы жизни: ${row.eventObj.period}) — ${row.eventObj.title}`,
      };
    }
    if (row.startedBeforeWindow) {
      return {
        label: `с ${row.eventObj.startYear}`,
        title: `Процесс начался в ${row.eventObj.startYear} г. (продолжается в окне): ${row.eventObj.title}`,
      };
    }
    const parts = row.eventObj.startPrecision;
    const styleInfo = buildGutterStyleInfo(parts, resolution);
    const approxNote =
      parts.precision === 'year' && resolution !== 'year' ? ' (в источнике указан только год)' : '';
    return {
      label: formatCompactAxisDate(parts, resolution),
      styleLabel: styleInfo.styleLabel,
      styleTone: styleInfo.styleTone,
      title: `${row.isAtomicInView ? 'Событие' : 'Начало процесса'}: ${styleInfo.detailText}${approxNote} — ${row.eventObj.title}`,
    };
  }

  const parts = row.eventObj.endPrecision;
  const styleInfo = buildGutterStyleInfo(parts, resolution);
  const approxNote =
    parts.precision === 'year' && resolution !== 'year' ? ' (в источнике указан только год)' : '';
  const isBioEnd = isBiographyNode(row.eventObj);
  const isWar = row.eventObj.task.startsWith('WAR_');
  return {
    label: formatCompactAxisDate(parts, resolution),
    styleLabel: styleInfo.styleLabel,
    styleTone: styleInfo.styleTone,
    title: `${
      isBioEnd
        ? 'Завершение жизненного и творческого пути'
        : isWar
          ? 'Окончание кампании'
          : 'Завершение процесса'
    }: ${styleInfo.detailText}${approxNote} — ${row.eventObj.title}`,
  };
}

export function isAtomicEventNode(
  node: TimelineNode,
  startParts: PreciseDateParts,
  endParts: PreciseDateParts,
  resolution: AxisResolution,
): boolean {
  if (node.isAtomic === true && !isBiographyNode(node)) return true;
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
