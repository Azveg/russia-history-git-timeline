import type {
  AxisResolution,
  BranchDefinition,
  DateCalendarParts,
  EnrichedEvent,
  ExactJdnWindow,
  RulerPeriod,
  SpanPreset,
} from '../../types/timeline';
import {
  MONTHS_SHORT_RU,
  gregorianToJdn,
  isBiographyNode,
  jdnToGregorian,
  jdnToJulian,
  parsePreciseDate,
} from '../calendar/jdnCalendar';

export type OverlapScaleMode = 'adaptive' | 'linear';

export interface EventJdnBounds {
  startJdn: number;
  endJdn: number;
  isPoint: boolean;
  precision: AxisResolution;
}

export interface AdaptiveScaleSegment {
  id: string;
  kind: 'active' | 'gap';
  startJdn: number;
  endJdn: number;
  leftPct: number;
  rightPct: number;
  durationDays: number;
  anchorCount: number;
  localResolution: AxisResolution;
  daysPerPct: number;
  /** Compact Russian label for compressed pause segments, e.g. "~4 г." or "~7 мес." */
  gapLabel?: string;
  /** Full human-readable tooltip range for compressed pause segments */
  gapTooltip?: string;
  startYear: number;
  endYear: number;
}

export interface AdaptiveScaleTick {
  key: string;
  jdn: number;
  pct: number;
  label: string;
  resolution: AxisResolution;
  isMajor: boolean;
}

export interface AdaptiveScanSample {
  jdn: number;
  year: number;
  month: number;
  day: number;
  resolution: AxisResolution;
  segmentKind: 'active' | 'gap';
  daysPerPct: number;
  formattedBadge: string;
  formattedFull: string;
  julianNote?: string;
}

export interface AdaptiveOverlapScale {
  mode: OverlapScaleMode;
  windowStartJdn: number;
  windowEndJdn: number;
  totalWindowDays: number;
  segments: AdaptiveScaleSegment[];
  gapSegments: AdaptiveScaleSegment[];
  ticks: AdaptiveScaleTick[];
  hasCompressedGaps: boolean;
  finestResolution: AxisResolution;
  jdnToPct: (jdn: number) => number;
  pctToScanSample: (pct: number) => AdaptiveScanSample;
}

export interface PackableInterval {
  id: string;
  leftPct: number;
  widthPct: number;
}

export interface PackedSubRowResult {
  rowById: Map<string, number>;
  rowCount: number;
}

export const MIN_WINDOW_DAYS = 7;
export const MIN_WINDOW_JDN_DELTA = MIN_WINDOW_DAYS - 1;

export interface ResolvedWindowRange {
  yearFrom: number;
  yearTo: number;
  exactDateRange: ExactJdnWindow | null;
}

const MAX_GAP_INLAYS = 6;
const MAX_TOTAL_GAP_PCT = 22;
const MIN_GAP_INLAY_PCT = 2.8;
const MAX_GAP_INLAY_PCT = 5.0;
const MAX_SAMPLED_ANCHORS = 42;

export function daysInGregorianMonth(year: number, month: number): number {
  if (month === 2) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return isLeap ? 29 : 28;
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30;
  }
  return 31;
}

/**
 * Converts unified calendar parts to a strictly monotonic continuous day coordinate (proleptic Gregorian JDN).
 * Using one consistent bijective day grid guarantees smooth interpolation across all centuries (862–2019).
 */
export function datePartsToCoordJdn(parts: DateCalendarParts, isEnd: boolean): number {
  const year = Math.round(parts.year);
  const month = parts.month ?? (isEnd ? 12 : 1);
  const maxDay = daysInGregorianMonth(year, month);
  const day = Math.max(1, Math.min(maxDay, parts.day ?? (isEnd ? maxDay : 1)));
  return gregorianToJdn(year, month, day);
}

export function yearStartJdn(year: number): number {
  return gregorianToJdn(Math.round(year), 1, 1);
}

export function yearEndJdn(year: number): number {
  return gregorianToJdn(Math.round(year), 12, 31);
}

export function jdnToIsoDate(jdn: number): string {
  const g = jdnToGregorian(Math.round(jdn));
  const yyyy = String(Math.max(0, g.year)).padStart(4, '0');
  const mm = String(g.month).padStart(2, '0');
  const dd = String(g.day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function parseIsoDateToJdn(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // ISO format: YYYY-MM-DD (also supports 3-digit historical years like 862-01-01 or 0862-01-01)
  const isoMatch = trimmed.match(/^(\d{3,4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (!Number.isFinite(year) || year <= 0 || month < 1 || month > 12 || day < 1) return null;
    const maxDay = daysInGregorianMonth(year, month);
    if (day > maxDay) return null;
    return gregorianToJdn(year, month, day);
  }

  // Russian format: DD.MM.YYYY
  const ruMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{3,4})$/);
  if (ruMatch) {
    const day = Number(ruMatch[1]);
    const month = Number(ruMatch[2]);
    const year = Number(ruMatch[3]);
    if (!Number.isFinite(year) || year <= 0 || month < 1 || month > 12 || day < 1) return null;
    const maxDay = daysInGregorianMonth(year, month);
    if (day > maxDay) return null;
    return gregorianToJdn(year, month, day);
  }

  return null;
}

export function isFullCalendarYearRange(fromJdn: number, toJdn: number): boolean {
  const startG = jdnToGregorian(Math.round(fromJdn));
  const endG = jdnToGregorian(Math.round(toJdn));
  return startG.month === 1 && startG.day === 1 && endG.month === 12 && endG.day === 31;
}

export function getInclusiveWindowDays(fromJdn: number, toJdn: number): number {
  return Math.max(1, Math.round(toJdn) - Math.round(fromJdn) + 1);
}

export function formatWindowDurationLabel(days: number): string {
  const safeDays = Math.max(1, Math.round(days));
  if (safeDays <= 60) {
    return `${safeDays} дн.`;
  }
  if (safeDays < 330) {
    const months = Math.max(2, Math.round(safeDays / 30.4375));
    return `~${months} мес.`;
  }
  const years = Math.max(1, Math.round(safeDays / 365.25));
  const mod100 = years % 100;
  const mod10 = years % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${years} л.`;
  if (mod10 === 1) return `${years} г.`;
  if (mod10 >= 2 && mod10 <= 4) return `${years} г.`;
  return `${years} л.`;
}

export function formatWindowRangeLabel(
  fromJdn: number,
  toJdn: number,
  isSubYear: boolean,
): { compact: string; full: string; durationLabel: string } {
  const safeFrom = Math.min(Math.round(fromJdn), Math.round(toJdn));
  const safeTo = Math.max(Math.round(fromJdn), Math.round(toJdn));
  const startG = jdnToGregorian(safeFrom);
  const endG = jdnToGregorian(safeTo);
  const days = getInclusiveWindowDays(safeFrom, safeTo);

  if (!isSubYear) {
    const yearSpan = Math.max(1, endG.year - startG.year + 1);
    const compact = startG.year === endG.year ? `${startG.year}` : `${startG.year}–${endG.year}`;
    const full = startG.year === endG.year ? `${startG.year} г.` : `${startG.year}–${endG.year} гг.`;
    return {
      compact,
      full,
      durationLabel: formatWindowDurationLabel(yearSpan * 365.25),
    };
  }

  const m1 = MONTHS_SHORT_RU[Math.max(0, Math.min(11, startG.month - 1))] ?? 'янв';
  const m2 = MONTHS_SHORT_RU[Math.max(0, Math.min(11, endG.month - 1))] ?? 'янв';
  const durationLabel = formatWindowDurationLabel(days);

  if (startG.year === endG.year && startG.month === endG.month) {
    const text =
      startG.day === endG.day
        ? `${startG.day} ${m1} ${startG.year}`
        : `${startG.day}–${endG.day} ${m1} ${startG.year}`;
    return { compact: text, full: text, durationLabel };
  }

  if (startG.year === endG.year) {
    const text = `${startG.day} ${m1} – ${endG.day} ${m2} ${startG.year}`;
    return { compact: text, full: text, durationLabel };
  }

  const text = `${startG.day} ${m1} ${startG.year} – ${endG.day} ${m2} ${endG.year}`;
  return { compact: text, full: text, durationLabel };
}

export function clampExactJdnWindow(
  fromJdn: number,
  toJdn: number,
  minYear: number,
  maxYear: number,
  minDays = MIN_WINDOW_DAYS,
): ExactJdnWindow {
  const globalStart = yearStartJdn(Math.min(minYear, maxYear));
  const globalEnd = yearEndJdn(Math.max(minYear, maxYear));
  const minDelta = Math.max(0, Math.round(minDays) - 1);

  let start = Math.round(Math.min(fromJdn, toJdn));
  let end = Math.round(Math.max(fromJdn, toJdn));

  if (globalEnd - globalStart <= minDelta) {
    return { fromJdn: globalStart, toJdn: globalEnd };
  }

  start = Math.max(globalStart, Math.min(globalEnd, start));
  end = Math.max(globalStart, Math.min(globalEnd, end));

  if (end - start < minDelta) {
    const mid = Math.round((start + end) / 2);
    const halfLeft = Math.floor(minDelta / 2);
    start = mid - halfLeft;
    end = start + minDelta;
    if (start < globalStart) {
      start = globalStart;
      end = Math.min(globalEnd, globalStart + minDelta);
    }
    if (end > globalEnd) {
      end = globalEnd;
      start = Math.max(globalStart, globalEnd - minDelta);
    }
  }

  return { fromJdn: start, toJdn: end };
}

export function normalizeWindowRangeFromJdn(
  fromJdn: number,
  toJdn: number,
  minYear: number,
  maxYear: number,
  minDays = MIN_WINDOW_DAYS,
): ResolvedWindowRange {
  const clamped = clampExactJdnWindow(fromJdn, toJdn, minYear, maxYear, minDays);
  const startG = jdnToGregorian(clamped.fromJdn);
  const endG = jdnToGregorian(clamped.toJdn);
  const fullYearAligned = isFullCalendarYearRange(clamped.fromJdn, clamped.toJdn);
  return {
    yearFrom: startG.year,
    yearTo: endG.year,
    exactDateRange: fullYearAligned ? null : clamped,
  };
}

export function findSmartAnchorJdn(
  events: EnrichedEvent[],
  windowFromJdn: number,
  windowToJdn: number,
  preferredJdn?: number | null,
  branches?: BranchDefinition[],
): number {
  if (
    typeof preferredJdn === 'number' &&
    Number.isFinite(preferredJdn) &&
    preferredJdn >= windowFromJdn &&
    preferredJdn <= windowToJdn
  ) {
    return Math.round(preferredJdn);
  }

  const preciseStarts: number[] = [];
  const anyStarts: number[] = [];

  for (let i = 0; i < events.length; i += 1) {
    const ev = events[i];
    if (isBiographyNode(ev, branches)) continue;
    const bounds = getEventJdnBounds(ev, branches);
    if (bounds.endJdn < windowFromJdn || bounds.startJdn > windowToJdn) continue;
    const clampedStart = Math.max(windowFromJdn, Math.min(windowToJdn, bounds.startJdn));
    if (bounds.precision === 'day' || bounds.precision === 'month') {
      preciseStarts.push(clampedStart);
    } else if (bounds.startJdn >= windowFromJdn && bounds.startJdn <= windowToJdn) {
      anyStarts.push(clampedStart);
    }
  }

  const source = preciseStarts.length > 0 ? preciseStarts : anyStarts;
  if (source.length > 0) {
    source.sort((a, b) => a - b);
    return source[Math.floor(source.length / 2)];
  }

  return Math.round((windowFromJdn + windowToJdn) / 2);
}

export function computeZoomedJdnWindow(
  currentFromJdn: number,
  currentToJdn: number,
  factor: number,
  minYear: number,
  maxYear: number,
  anchorJdn?: number,
): ResolvedWindowRange {
  const safeMin = Math.min(minYear, maxYear);
  const safeMax = Math.max(minYear, maxYear);
  const globalStart = yearStartJdn(safeMin);
  const globalEnd = yearEndJdn(safeMax);
  const globalDays = getInclusiveWindowDays(globalStart, globalEnd);
  const currentDays = Math.max(MIN_WINDOW_DAYS, getInclusiveWindowDays(currentFromJdn, currentToJdn));

  let targetDays: number;
  if (factor < 1) {
    targetDays = Math.max(MIN_WINDOW_DAYS, Math.floor(currentDays * factor));
    if (targetDays === currentDays && currentDays > MIN_WINDOW_DAYS) {
      targetDays = Math.max(MIN_WINDOW_DAYS, currentDays - 1);
    }
  } else {
    targetDays = Math.min(globalDays, Math.max(currentDays + 2, Math.round(currentDays * factor)));
  }

  if (targetDays >= globalDays - 30) {
    return { yearFrom: safeMin, yearTo: safeMax, exactDateRange: null };
  }

  const centerJdn =
    typeof anchorJdn === 'number' && Number.isFinite(anchorJdn)
      ? Math.round(anchorJdn)
      : Math.round((currentFromJdn + currentToJdn) / 2);

  // At 2+ years span, snap cleanly to full calendar years for clean UX
  if (targetDays >= 730) {
    const fullYearSpan = Math.max(1, safeMax - safeMin);
    const targetYearSpan = Math.max(1, Math.min(fullYearSpan, Math.round(targetDays / 365.25) - 1));
    if (targetYearSpan >= fullYearSpan) {
      return { yearFrom: safeMin, yearTo: safeMax, exactDateRange: null };
    }
    const midYear = jdnToGregorian(centerJdn).year;
    const halfLeft = Math.floor(targetYearSpan / 2);
    let nextFrom = midYear - halfLeft;
    let nextTo = nextFrom + targetYearSpan;
    if (nextFrom < safeMin) {
      nextFrom = safeMin;
      nextTo = Math.min(safeMax, safeMin + targetYearSpan);
    }
    if (nextTo > safeMax) {
      nextTo = safeMax;
      nextFrom = Math.max(safeMin, safeMax - targetYearSpan);
    }
    return { yearFrom: nextFrom, yearTo: nextTo, exactDateRange: null };
  }

  const targetDelta = Math.max(MIN_WINDOW_JDN_DELTA, targetDays - 1);
  const halfLeft = Math.floor(targetDelta / 2);
  let nextFrom = centerJdn - halfLeft;
  let nextTo = nextFrom + targetDelta;
  if (nextFrom < globalStart) {
    nextFrom = globalStart;
    nextTo = Math.min(globalEnd, globalStart + targetDelta);
  }
  if (nextTo > globalEnd) {
    nextTo = globalEnd;
    nextFrom = Math.max(globalStart, globalEnd - targetDelta);
  }
  return normalizeWindowRangeFromJdn(nextFrom, nextTo, safeMin, safeMax);
}

export function computeShiftedJdnWindow(
  currentFromJdn: number,
  currentToJdn: number,
  direction: -1 | 1,
  minYear: number,
  maxYear: number,
): ResolvedWindowRange {
  const safeMin = Math.min(minYear, maxYear);
  const safeMax = Math.max(minYear, maxYear);
  const globalStart = yearStartJdn(safeMin);
  const globalEnd = yearEndJdn(safeMax);

  if (isFullCalendarYearRange(currentFromJdn, currentToJdn)) {
    const curFrom = jdnToGregorian(currentFromJdn).year;
    const curTo = jdnToGregorian(currentToJdn).year;
    const yearDelta = Math.max(0, curTo - curFrom);
    if (curFrom <= safeMin && curTo >= safeMax) {
      return { yearFrom: safeMin, yearTo: safeMax, exactDateRange: null };
    }
    const stepYears = Math.max(1, Math.round(Math.max(1, yearDelta) / 2)) * direction;
    let nextFrom = curFrom + stepYears;
    let nextTo = curTo + stepYears;
    if (nextFrom < safeMin) {
      nextFrom = safeMin;
      nextTo = Math.min(safeMax, safeMin + yearDelta);
    }
    if (nextTo > safeMax) {
      nextTo = safeMax;
      nextFrom = Math.max(safeMin, safeMax - yearDelta);
    }
    return { yearFrom: nextFrom, yearTo: nextTo, exactDateRange: null };
  }

  const delta = Math.max(MIN_WINDOW_JDN_DELTA, Math.round(currentToJdn) - Math.round(currentFromJdn));
  const stepDays = Math.max(1, Math.round((delta + 1) / 2)) * direction;
  let nextFrom = Math.round(currentFromJdn) + stepDays;
  let nextTo = Math.round(currentToJdn) + stepDays;
  if (nextFrom < globalStart) {
    nextFrom = globalStart;
    nextTo = Math.min(globalEnd, globalStart + delta);
  }
  if (nextTo > globalEnd) {
    nextTo = globalEnd;
    nextFrom = Math.max(globalStart, globalEnd - delta);
  }
  return normalizeWindowRangeFromJdn(nextFrom, nextTo, safeMin, safeMax);
}

export function computePresetJdnWindow(
  preset: SpanPreset,
  currentFromJdn: number,
  currentToJdn: number,
  minYear: number,
  maxYear: number,
  anchorJdn?: number,
): ResolvedWindowRange {
  const safeMin = Math.min(minYear, maxYear);
  const safeMax = Math.max(minYear, maxYear);
  if (preset === 'all') {
    return { yearFrom: safeMin, yearTo: safeMax, exactDateRange: null };
  }

  const centerJdn =
    typeof anchorJdn === 'number' && Number.isFinite(anchorJdn)
      ? Math.round(anchorJdn)
      : Math.round((currentFromJdn + currentToJdn) / 2);
  const centerYear = Math.max(safeMin, Math.min(safeMax, jdnToGregorian(centerJdn).year));

  if (preset === 100 || preset === 10) {
    const fullYearSpan = Math.max(1, safeMax - safeMin);
    if (preset >= fullYearSpan) {
      return { yearFrom: safeMin, yearTo: safeMax, exactDateRange: null };
    }
    const halfLeft = Math.floor(preset / 2);
    let nextFrom = centerYear - halfLeft;
    let nextTo = nextFrom + preset;
    if (nextFrom < safeMin) {
      nextFrom = safeMin;
      nextTo = Math.min(safeMax, safeMin + preset);
    }
    if (nextTo > safeMax) {
      nextTo = safeMax;
      nextFrom = Math.max(safeMin, safeMax - preset);
    }
    return { yearFrom: nextFrom, yearTo: nextTo, exactDateRange: null };
  }

  if (preset === 1) {
    return { yearFrom: centerYear, yearTo: centerYear, exactDateRange: null };
  }

  const targetDays = preset === 'week' ? MIN_WINDOW_DAYS : 30;
  const targetDelta = targetDays - 1;
  const halfLeft = Math.floor(targetDelta / 2);
  const globalStart = yearStartJdn(safeMin);
  const globalEnd = yearEndJdn(safeMax);
  let nextFrom = centerJdn - halfLeft;
  let nextTo = nextFrom + targetDelta;
  if (nextFrom < globalStart) {
    nextFrom = globalStart;
    nextTo = Math.min(globalEnd, globalStart + targetDelta);
  }
  if (nextTo > globalEnd) {
    nextTo = globalEnd;
    nextFrom = Math.max(globalStart, globalEnd - targetDelta);
  }
  return normalizeWindowRangeFromJdn(nextFrom, nextTo, safeMin, safeMax);
}

export type SubYearEventMatchResult = 'match' | 'omitted_undated' | 'outside';

/**
 * Evaluates whether an event belongs inside a sub-year JDN window [fromJdn..toJdn].
 * - Exact day/month events intersecting [fromJdn..toJdn] -> 'match'
 * - Ongoing multi-year historical processes (wars, diplomatic regimes, reforms) -> 'match'
 * - Single-year undated milestones (year precision only) & undated biographies -> 'omitted_undated'
 *   unless includeUndatedYearEvents is explicitly enabled.
 */
export function doesEventMatchSubYearWindow(
  ev: EnrichedEvent,
  fromJdn: number,
  toJdn: number,
  branches?: BranchDefinition[],
  includeUndatedYearEvents = false,
): SubYearEventMatchResult {
  const bounds = getEventJdnBounds(ev, branches);
  if (bounds.endJdn < fromJdn || bounds.startJdn > toJdn) {
    return 'outside';
  }
  if (bounds.precision === 'day' || bounds.precision === 'month') {
    return 'match';
  }
  const isBio = isBiographyNode(ev, branches);
  if (!isBio && ev.endYear > ev.startYear) {
    return 'match';
  }
  return includeUndatedYearEvents ? 'match' : 'omitted_undated';
}

export function getEventJdnBounds(
  ev: EnrichedEvent,
  branches?: BranchDefinition[],
): EventJdnBounds {
  if (isBiographyNode(ev, branches)) {
    const startYear = typeof ev.activeFrom === 'number' ? ev.activeFrom : ev.startYear;
    const endYear = Math.max(startYear, typeof ev.activeTo === 'number' ? ev.activeTo : ev.endYear);
    const startJdn = yearStartJdn(startYear);
    const endJdn = yearEndJdn(endYear);
    return {
      startJdn,
      endJdn,
      isPoint: false,
      precision: 'year',
    };
  }

  const startParts = ev.startPrecision?.unified ?? {
    year: ev.startYear,
    precision: 'year' as const,
    sortKey: ev.startYear * 10000 + 101,
  };
  const endParts = ev.endPrecision?.unified ?? {
    year: ev.endYear,
    precision: 'year' as const,
    sortKey: ev.endYear * 10000 + 1231,
  };

  const startJdn = datePartsToCoordJdn(startParts, false);
  const rawEndJdn = datePartsToCoordJdn(endParts, true);
  const endJdn = Math.max(startJdn, rawEndJdn);

  const finestPrecision: AxisResolution =
    startParts.precision === 'day' || endParts.precision === 'day'
      ? 'day'
      : startParts.precision === 'month' || endParts.precision === 'month'
        ? 'month'
        : 'year';

  const isPoint =
    ev.isAtomic === true ||
    (finestPrecision === 'day' && endJdn - startJdn <= 1) ||
    (finestPrecision === 'year' && ev.startYear === ev.endYear);

  return {
    startJdn,
    endJdn: isPoint && finestPrecision === 'day' ? startJdn : endJdn,
    isPoint,
    precision: finestPrecision,
  };
}

export function getRulerJdnBounds(ruler: RulerPeriod): { startJdn: number; endJdn: number } {
  const startPrecision = parsePreciseDate(ruler.startDate, ruler.startYear, false, {
    calendarStyle: ruler.calendarStyle,
  });
  const endPrecision = parsePreciseDate(ruler.endDate, ruler.endYear, true, {
    calendarStyle: ruler.calendarStyle,
  });
  const startJdn = datePartsToCoordJdn(startPrecision.unified, false);
  const endJdn = Math.max(startJdn, datePartsToCoordJdn(endPrecision.unified, true));
  return { startJdn, endJdn };
}

export function formatRussianYearDuration(years: number): string {
  const abs = Math.max(1, Math.round(years));
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 14) return `~${abs} л.`;
  if (mod10 === 1) return `~${abs} г.`;
  if (mod10 >= 2 && mod10 <= 4) return `~${abs} г.`;
  return `~${abs} л.`;
}

export function formatGapDurationLabel(durationDays: number): string {
  if (durationDays < 55) {
    return `~${Math.max(1, Math.round(durationDays))} дн.`;
  }
  if (durationDays < 330) {
    const months = Math.max(2, Math.round(durationDays / 30.4375));
    return `~${months} мес.`;
  }
  const years = Math.max(1, Math.round(durationDays / 365.25));
  return formatRussianYearDuration(years);
}

function resolveSegmentLocalResolution(daysPerPct: number): AxisResolution {
  if (daysPerPct <= 8) return 'day';
  if (daysPerPct <= 115) return 'month';
  return 'year';
}

export function formatScanDate(
  jdn: number,
  resolution: AxisResolution,
): {
  year: number;
  month: number;
  day: number;
  formattedBadge: string;
  formattedFull: string;
  julianNote?: string;
} {
  const rounded = Math.round(jdn);
  const g = jdnToGregorian(rounded);
  const monthShort = MONTHS_SHORT_RU[Math.max(0, Math.min(11, g.month - 1))] ?? 'янв';

  let julianNote: string | undefined;
  const isDualEra =
    (g.year > 1582 || (g.year === 1582 && (g.month > 10 || (g.month === 10 && g.day >= 15)))) &&
    (g.year < 1918 || (g.year === 1918 && (g.month < 2 || (g.month === 2 && g.day < 14))));

  if (resolution === 'day') {
    const badge = `${g.day} ${monthShort} ${g.year}`;
    if (isDualEra) {
      const jul = jdnToJulian(rounded);
      const julMonth = MONTHS_SHORT_RU[Math.max(0, Math.min(11, jul.month - 1))] ?? 'янв';
      julianNote =
        jul.year === g.year
          ? `${jul.day} ${julMonth} ст. ст.`
          : `${jul.day} ${julMonth} ${jul.year} ст. ст.`;
    }
    return {
      year: g.year,
      month: g.month,
      day: g.day,
      formattedBadge: badge,
      formattedFull: julianNote ? `${badge} н. ст. (${julianNote})` : `${badge} г.`,
      julianNote,
    };
  }

  if (resolution === 'month') {
    const badge = `${monthShort} ${g.year}`;
    return {
      year: g.year,
      month: g.month,
      day: g.day,
      formattedBadge: badge,
      formattedFull: `${badge} г.`,
    };
  }

  return {
    year: g.year,
    month: g.month,
    day: g.day,
    formattedBadge: `${g.year}`,
    formattedFull: `${g.year} г.`,
  };
}

interface RawSegmentDraft {
  kind: 'active' | 'gap';
  startJdn: number;
  endJdn: number;
  anchorCount: number;
}

function generateTicksForSegments(
  segments: AdaptiveScaleSegment[],
  jdnToPct: (jdn: number) => number,
): AdaptiveScaleTick[] {
  const candidates: Array<{
    jdn: number;
    pct: number;
    label: string;
    shortLabel: string;
    resolution: AxisResolution;
    priority: number;
    year: number;
  }> = [];

  const gapIntervals = segments
    .filter((s) => s.kind === 'gap')
    .map((s) => ({ left: s.leftPct, right: s.rightPct }));

  const isInsideOrNearGap = (pct: number): boolean =>
    gapIntervals.some((g) => pct >= g.left - 1.1 && pct <= g.right + 1.1);

  for (const seg of segments) {
    if (seg.kind !== 'active') continue;
    const widthPct = seg.rightPct - seg.leftPct;
    if (widthPct < 1.8) continue;

    const dpp = seg.daysPerPct;
    const startG = jdnToGregorian(seg.startJdn);
    const endG = jdnToGregorian(seg.endJdn);

    if (seg.localResolution === 'day') {
      // Day-level ticks (1, 3, 5, or 10 days step)
      const dayStep = dpp <= 1.1 ? 1 : dpp <= 2.6 ? 3 : dpp <= 4.5 ? 5 : 10;
      const firstJdn = seg.startJdn;
      for (let j = firstJdn; j <= seg.endJdn; j += dayStep) {
        const g = jdnToGregorian(j);
        const pct = jdnToPct(j);
        if (isInsideOrNearGap(pct)) continue;
        const mShort = MONTHS_SHORT_RU[g.month - 1] ?? 'янв';
        const isMonthStart = g.day === 1;
        const isYearStart = g.month === 1 && g.day === 1;
        candidates.push({
          jdn: j,
          pct,
          label: `${g.day} ${mShort} ${g.year}`,
          shortLabel: `${g.day} ${mShort}`,
          resolution: 'day',
          priority: isYearStart ? 4 : isMonthStart ? 3 : 2,
          year: g.year,
        });
      }
    } else if (seg.localResolution === 'month') {
      // Month-level ticks (1, 2, 3, or 6 months step)
      const monthStep = dpp <= 22 ? 1 : dpp <= 42 ? 2 : dpp <= 75 ? 3 : 6;
      let y = startG.year;
      let m = startG.month;
      // Align month to step grid
      const rem = (m - 1) % monthStep;
      if (rem !== 0) {
        m += monthStep - rem;
        if (m > 12) {
          y += Math.floor((m - 1) / 12);
          m = ((m - 1) % 12) + 1;
        }
      }
      let guard = 0;
      while ((y < endG.year || (y === endG.year && m <= endG.month)) && guard < 400) {
        guard += 1;
        const j = gregorianToJdn(y, m, 1);
        if (j >= seg.startJdn && j <= seg.endJdn) {
          const pct = jdnToPct(j);
          if (!isInsideOrNearGap(pct)) {
            const mShort = MONTHS_SHORT_RU[m - 1] ?? 'янв';
            const isYearStart = m === 1;
            candidates.push({
              jdn: j,
              pct,
              label: isYearStart ? `${y}` : `${mShort} ${y}`,
              shortLabel: isYearStart ? `${y}` : mShort,
              resolution: 'month',
              priority: isYearStart ? 4 : 3,
              year: y,
            });
          }
        }
        m += monthStep;
        if (m > 12) {
          y += Math.floor((m - 1) / 12);
          m = ((m - 1) % 12) + 1;
        }
      }
    } else {
      // Year / multi-year / decade / century ticks
      const yearStep =
        dpp <= 260
          ? 1
          : dpp <= 580
            ? 2
            : dpp <= 1350
              ? 5
              : dpp <= 2800
                ? 10
                : dpp <= 6500
                  ? 25
                  : dpp <= 14000
                    ? 50
                    : 100;
      const firstYear = Math.ceil(startG.year / yearStep) * yearStep;
      for (let y = firstYear; y <= endG.year; y += yearStep) {
        const j = gregorianToJdn(y, 1, 1);
        if (j < seg.startJdn || j > seg.endJdn) continue;
        const pct = jdnToPct(j);
        if (isInsideOrNearGap(pct)) continue;
        candidates.push({
          jdn: j,
          pct,
          label: `${y}`,
          shortLabel: `${y}`,
          resolution: 'year',
          priority: y % 100 === 0 ? 5 : y % 10 === 0 ? 4 : 3,
          year: y,
        });
      }
    }
  }

  // Deduplicate exact JDN candidates and sort chronologically
  candidates.sort((a, b) => a.jdn - b.jdn || b.priority - a.priority);
  const deduped: typeof candidates = [];
  for (const c of candidates) {
    if (deduped.length > 0 && deduped[deduped.length - 1].jdn === c.jdn) continue;
    deduped.push(c);
  }

  // Greedy collision avoidance keeping crisp spacing across the 0..100% strip
  const selected: AdaptiveScaleTick[] = [];
  let lastPct = -100;
  let lastYearShown: number | null = null;

  for (const c of deduped) {
    const minPctBound = c.resolution === 'day' ? 0 : 0.8;
    const maxPctBound = c.resolution === 'day' ? 98.5 : 97.5;
    if (c.pct < minPctBound || c.pct > maxPctBound) continue;
    const needsYearContext = lastYearShown === null || lastYearShown !== c.year;
    const text =
      c.resolution === 'year'
        ? c.label
        : needsYearContext
          ? c.label
          : c.shortLabel;
    const minSpacingPct =
      text.length >= 10 ? 7.6 : text.length >= 7 ? 6.2 : 4.6;

    if (c.pct - lastPct < minSpacingPct) {
      // Allow higher-priority tick (e.g., year boundary) to replace a weak tick if very close
      const prev = selected[selected.length - 1];
      if (prev && c.priority > (prev.isMajor ? 4 : 2) && c.pct - (selected[selected.length - 2]?.pct ?? -100) >= minSpacingPct) {
        selected[selected.length - 1] = {
          key: `tick-${c.jdn}`,
          jdn: c.jdn,
          pct: c.pct,
          label: c.label,
          resolution: c.resolution,
          isMajor: c.priority >= 4,
        };
        lastPct = c.pct;
        lastYearShown = c.year;
      }
      continue;
    }

    selected.push({
      key: `tick-${c.jdn}`,
      jdn: c.jdn,
      pct: c.pct,
      label: text,
      resolution: c.resolution,
      isMajor: c.priority >= 4,
    });
    lastPct = c.pct;
    lastYearShown = c.year;
  }

  return selected;
}

/**
 * Builds a bijective piecewise-linear timeline scale over [yearFrom..yearTo] at JDN day precision.
 * - In 'linear' mode: uniform day-accurate mapping across the whole window.
 * - In 'adaptive' mode: expands dense bursts (up to day-by-day resolution) and compresses silent gaps
 *   into crisp dashed pause inlays capped at MAX_TOTAL_GAP_PCT of total width.
 */
export function buildAdaptiveOverlapScale(
  events: EnrichedEvent[],
  yearFrom: number,
  yearTo: number,
  mode: OverlapScaleMode = 'adaptive',
  branches?: BranchDefinition[],
  exactWindow?: ExactJdnWindow | null,
): AdaptiveOverlapScale {
  const safeFrom = Math.min(yearFrom, yearTo);
  const safeTo = Math.max(safeFrom, yearTo);
  const wStart = exactWindow ? Math.round(Math.min(exactWindow.fromJdn, exactWindow.toJdn)) : yearStartJdn(safeFrom);
  const wEnd = exactWindow
    ? Math.max(wStart + 1, Math.round(Math.max(exactWindow.fromJdn, exactWindow.toJdn)))
    : Math.max(wStart + 1, yearEndJdn(safeTo));
  const totalWindowDays = wEnd - wStart;
  const startYearResolved = jdnToGregorian(wStart).year;
  const endYearResolved = jdnToGregorian(wEnd).year;

  // Build linear fallback / linear mode directly
  const buildSingleLinearScale = (resolvedMode: OverlapScaleMode): AdaptiveOverlapScale => {
    const daysPerPct = totalWindowDays / 100;
    const localResolution = resolveSegmentLocalResolution(daysPerPct);
    const segment: AdaptiveScaleSegment = {
      id: `seg-linear-${wStart}-${wEnd}`,
      kind: 'active',
      startJdn: wStart,
      endJdn: wEnd,
      leftPct: 0,
      rightPct: 100,
      durationDays: totalWindowDays,
      anchorCount: events.length,
      localResolution,
      daysPerPct,
      startYear: startYearResolved,
      endYear: endYearResolved,
    };
    const jdnToPct = (jdn: number): number => {
      const clamped = Math.max(wStart, Math.min(wEnd, jdn));
      return ((clamped - wStart) / totalWindowDays) * 100;
    };
    const pctToScanSample = (pct: number): AdaptiveScanSample => {
      const clampedPct = Math.max(0, Math.min(100, pct));
      const jdn = wStart + (clampedPct / 100) * totalWindowDays;
      const fmt = formatScanDate(jdn, localResolution);
      return {
        jdn: Math.round(jdn),
        ...fmt,
        resolution: localResolution,
        segmentKind: 'active',
        daysPerPct,
      };
    };
    const ticks = generateTicksForSegments([segment], jdnToPct);
    return {
      mode: resolvedMode,
      windowStartJdn: wStart,
      windowEndJdn: wEnd,
      totalWindowDays,
      segments: [segment],
      gapSegments: [],
      ticks,
      hasCompressedGaps: false,
      finestResolution: localResolution,
      jdnToPct,
      pctToScanSample,
    };
  };

  if (mode === 'linear' || events.length === 0) {
    return buildSingleLinearScale(mode);
  }

  // 1. Collect anchor JDNs from visible events inside the window
  const nonBioEvents = events.filter((ev) => !isBiographyNode(ev, branches));
  const anchorSourceEvents = nonBioEvents.length > 0 ? nonBioEvents : events;

  const weightByJdn = new Map<number, number>();
  let hasSubYearEvents = false;
  const addAnchor = (jdn: number, weight: number) => {
    const clamped = Math.max(wStart, Math.min(wEnd, Math.round(jdn)));
    const prev = weightByJdn.get(clamped) ?? 0;
    weightByJdn.set(clamped, Math.min(4, prev + weight));
  };

  for (let i = 0; i < anchorSourceEvents.length; i += 1) {
    const ev = anchorSourceEvents[i];
    const bounds = getEventJdnBounds(ev, branches);
    if (bounds.endJdn < wStart || bounds.startJdn > wEnd) continue;
    if (bounds.precision === 'day' || bounds.precision === 'month') {
      hasSubYearEvents = true;
    }

    if (bounds.startJdn >= wStart && bounds.startJdn <= wEnd) {
      addAnchor(bounds.startJdn, 1);
    }
    const evDuration = bounds.endJdn - bounds.startJdn;
    if (
      !bounds.isPoint &&
      bounds.endJdn > bounds.startJdn &&
      bounds.endJdn >= wStart &&
      bounds.endJdn <= wEnd &&
      evDuration <= totalWindowDays * 0.45
    ) {
      addAnchor(bounds.endJdn, 0.5);
    }
  }

  const allAnchors = Array.from(weightByJdn.keys()).sort((a, b) => a - b);
  if (allAnchors.length < 2) {
    // Only 0 or 1 distinct event point in window: if there's large leading/trailing emptiness, still keep linear simplicity
    return buildSingleLinearScale('adaptive');
  }

  // 2. Compute adaptive gap threshold based on window span & median inter-anchor spacing
  const spacings: number[] = [];
  for (let i = 1; i < allAnchors.length; i += 1) {
    spacings.push(allAnchors[i] - allAnchors[i - 1]);
  }
  const sortedSpacings = [...spacings].sort((a, b) => a - b);
  const medianSpacing = sortedSpacings[Math.floor(sortedSpacings.length / 2)] ?? totalWindowDays;

  if (totalWindowDays <= 14) {
    // On 1–2 week battle windows, render every single calendar day continuously without gap compression
    return buildSingleLinearScale('adaptive');
  }

  let minGapDays: number;
  if (totalWindowDays <= 60) {
    minGapDays = 8;
  } else if (totalWindowDays <= 200) {
    minGapDays = 18;
  } else if (totalWindowDays <= 760) {
    minGapDays = 45;
  } else if (totalWindowDays <= 2200) {
    minGapDays = 100;
  } else if (totalWindowDays <= 11000) {
    minGapDays = Math.round(365.25 * 1.5);
  } else if (totalWindowDays <= 45000) {
    minGapDays = Math.round(365.25 * 4);
  } else {
    minGapDays = Math.round(365.25 * 12);
  }

  const gapThresholdDays = Math.max(
    minGapDays,
    Math.min(totalWindowDays * 0.14, medianSpacing * 2.2),
  );

  // Identify candidate empty pauses (strictly zero event anchors inside)
  const rawGaps: Array<{ leftAnchor: number; rightAnchor: number; durationDays: number }> = [];
  if (allAnchors[0] - wStart >= gapThresholdDays) {
    rawGaps.push({ leftAnchor: wStart, rightAnchor: allAnchors[0], durationDays: allAnchors[0] - wStart });
  }
  for (let i = 1; i < allAnchors.length; i += 1) {
    const diff = allAnchors[i] - allAnchors[i - 1];
    if (diff >= gapThresholdDays) {
      rawGaps.push({
        leftAnchor: allAnchors[i - 1],
        rightAnchor: allAnchors[i],
        durationDays: diff,
      });
    }
  }
  if (wEnd - allAnchors[allAnchors.length - 1] >= gapThresholdDays) {
    rawGaps.push({
      leftAnchor: allAnchors[allAnchors.length - 1],
      rightAnchor: wEnd,
      durationDays: wEnd - allAnchors[allAnchors.length - 1],
    });
  }

  // Keep at most MAX_GAP_INLAYS largest pauses so the axis stays clean and editorial
  rawGaps.sort((a, b) => b.durationDays - a.durationDays);
  const chosenGaps = rawGaps
    .slice(0, MAX_GAP_INLAYS)
    .sort((a, b) => a.leftAnchor - b.leftAnchor);

  const chosenGapStarts = new Set(chosenGaps.map((g) => g.leftAnchor));

  // 3. Build piecewise breakpoints by combining window edges, chosen gap margins, and sampled anchors
  // Downsample anchors inside dense clusters so piecewise segments stay compact (<= ~42 active segments)
  const sampleAnchorsBetween = (fromJdn: number, toJdn: number, budget: number): number[] => {
    const inside = allAnchors.filter((a) => a > fromJdn && a < toJdn);
    if (inside.length <= budget) return inside;
    const sampled: number[] = [];
    for (let k = 0; k < budget; k += 1) {
      const idx = Math.floor((k * inside.length) / budget);
      sampled.push(inside[idx]);
    }
    return sampled;
  };

  const drafts: RawSegmentDraft[] = [];
  const gapPadMax = Math.max(2, Math.min(28, Math.round(totalWindowDays * 0.004)));

  // Build ordered zones separated by chosenGaps
  let cursorJdn = wStart;
  const activeRegionBudget = Math.max(
    8,
    Math.floor(MAX_SAMPLED_ANCHORS / Math.max(1, chosenGaps.length + 1)),
  );

  const pushActiveRegion = (regionStart: number, regionEnd: number) => {
    if (regionEnd <= regionStart) return;
    const interior = sampleAnchorsBetween(regionStart, regionEnd, activeRegionBudget);
    const pts = [regionStart, ...interior, regionEnd];
    for (let i = 0; i < pts.length - 1; i += 1) {
      const s = pts[i];
      const e = pts[i + 1];
      if (e <= s) continue;
      let mass = 0;
      for (const a of allAnchors) {
        if (a > s && a < e) {
          mass += weightByJdn.get(a) ?? 1;
        }
      }
      const startWeight = weightByJdn.get(s) ?? 0;
      const endWeight = weightByJdn.get(e) ?? 0;
      const isUnanchoredEdgeTail =
        (s === wStart && startWeight === 0 && mass === 0) ||
        (e === wEnd && endWeight === 0 && mass === 0);
      if (!isUnanchoredEdgeTail) {
        mass += 0.5 * startWeight + 0.5 * endWeight;
      }
      drafts.push({
        kind: 'active',
        startJdn: s,
        endJdn: e,
        anchorCount: isUnanchoredEdgeTail ? 0 : Math.max(0.5, mass),
      });
    }
  };

  for (const gap of chosenGaps) {
    if (!chosenGapStarts.has(gap.leftAnchor)) continue;
    const isLeading = gap.leftAnchor === wStart;
    const isTrailing = gap.rightAnchor === wEnd;
    const pad = Math.min(gapPadMax, Math.floor(gap.durationDays * 0.08));
    const gapStart = isLeading ? wStart : gap.leftAnchor + pad;
    const gapEnd = isTrailing ? wEnd : gap.rightAnchor - pad;

    if (gapStart > cursorJdn) {
      pushActiveRegion(cursorJdn, gapStart);
    }
    if (gapEnd > gapStart) {
      drafts.push({
        kind: 'gap',
        startJdn: gapStart,
        endJdn: gapEnd,
        anchorCount: 0,
      });
      cursorJdn = gapEnd;
    }
  }
  if (cursorJdn < wEnd) {
    pushActiveRegion(cursorJdn, wEnd);
  }

  if (drafts.length === 0) {
    return buildSingleLinearScale('adaptive');
  }

  // 4. Allocate percentages: gaps get crisp compressed widths (capped <= MAX_TOTAL_GAP_PCT),
  // active segments share the remaining width by density + smooth sqrt time floor.
  const gapCount = drafts.filter((d) => d.kind === 'gap').length;
  const activeDrafts = drafts.filter((d) => d.kind === 'active');

  let perGapPct = 0;
  if (gapCount > 0) {
    const targetGapTotal = Math.min(MAX_TOTAL_GAP_PCT, gapCount * 3.8);
    perGapPct = Math.max(
      MIN_GAP_INLAY_PCT,
      Math.min(MAX_GAP_INLAY_PCT, targetGapTotal / gapCount),
    );
    if (perGapPct * gapCount > MAX_TOTAL_GAP_PCT) {
      perGapPct = MAX_TOTAL_GAP_PCT / gapCount;
    }
  }
  const totalGapPct = perGapPct * gapCount;
  const availableActivePct = Math.max(10, 100 - totalGapPct);

  const avgActiveDays =
    activeDrafts.reduce((sum, d) => sum + (d.endJdn - d.startJdn), 0) /
    Math.max(1, activeDrafts.length);

  const activeWeights = drafts.map((d) => {
    if (d.kind === 'gap') return 0;
    const dur = Math.max(1, d.endJdn - d.startJdn);
    const timeTerm = Math.sqrt(dur / Math.max(1, avgActiveDays));
    return 0.72 * d.anchorCount + 0.28 * timeTerm;
  });
  const totalActiveWeight = activeWeights.reduce((sum, w) => sum + w, 0) || 1;

  // Materialize contiguous AdaptiveScaleSegment[] covering [0, 100]
  const segments: AdaptiveScaleSegment[] = [];
  let runningPct = 0;

  for (let i = 0; i < drafts.length; i += 1) {
    const d = drafts[i];
    const widthPct =
      i === drafts.length - 1
        ? Math.max(0.01, 100 - runningPct)
        : d.kind === 'gap'
          ? perGapPct
          : (activeWeights[i] / totalActiveWeight) * availableActivePct;
    const leftPct = runningPct;
    const rightPct = i === drafts.length - 1 ? 100 : runningPct + widthPct;
    runningPct = rightPct;

    const durationDays = Math.max(1, d.endJdn - d.startJdn);
    const daysPerPct = durationDays / Math.max(0.05, rightPct - leftPct);
    const startG = jdnToGregorian(d.startJdn);
    const endG = jdnToGregorian(d.endJdn);
    const gapLabel = d.kind === 'gap' ? formatGapDurationLabel(durationDays) : undefined;
    const gapTooltip =
      d.kind === 'gap'
        ? `Сжатая пауза без новых событий: ${
            startG.year === endG.year
              ? `${MONTHS_SHORT_RU[startG.month - 1]}–${MONTHS_SHORT_RU[endG.month - 1]} ${startG.year} г.`
              : `${startG.year}–${endG.year} гг.`
          } (${gapLabel})`
        : undefined;

    const rawLocalResolution =
      d.kind === 'gap' ? 'year' : resolveSegmentLocalResolution(daysPerPct);
    const localResolution: AxisResolution =
      !hasSubYearEvents && totalWindowDays > 730 ? 'year' : rawLocalResolution;

    segments.push({
      id: `seg-${d.kind}-${i}-${d.startJdn}`,
      kind: d.kind,
      startJdn: d.startJdn,
      endJdn: d.endJdn,
      leftPct,
      rightPct,
      durationDays,
      anchorCount: Math.round(d.anchorCount),
      localResolution,
      daysPerPct,
      gapLabel,
      gapTooltip,
      startYear: startG.year,
      endYear: endG.year,
    });
  }

  // 5. Bijective O(log S) forward & inverse lookups
  const jdnToPct = (jdn: number): number => {
    if (jdn <= wStart) return 0;
    if (jdn >= wEnd) return 100;
    let lo = 0;
    let hi = segments.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const seg = segments[mid];
      if (jdn < seg.startJdn) {
        hi = mid - 1;
      } else if (jdn > seg.endJdn) {
        lo = mid + 1;
      } else {
        const ratio = (jdn - seg.startJdn) / Math.max(1, seg.endJdn - seg.startJdn);
        return seg.leftPct + ratio * (seg.rightPct - seg.leftPct);
      }
    }
    return 100;
  };

  const pctToScanSample = (pct: number): AdaptiveScanSample => {
    const clampedPct = Math.max(0, Math.min(100, pct));
    let lo = 0;
    let hi = segments.length - 1;
    let matched = segments[segments.length - 1];
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const seg = segments[mid];
      if (clampedPct < seg.leftPct) {
        hi = mid - 1;
      } else if (clampedPct > seg.rightPct) {
        lo = mid + 1;
      } else {
        matched = seg;
        break;
      }
    }
    const segWidth = Math.max(0.0001, matched.rightPct - matched.leftPct);
    const ratio = Math.max(0, Math.min(1, (clampedPct - matched.leftPct) / segWidth));
    const jdn = matched.startJdn + ratio * (matched.endJdn - matched.startJdn);
    const fmt = formatScanDate(jdn, matched.localResolution);
    return {
      jdn: Math.round(jdn),
      ...fmt,
      resolution: matched.localResolution,
      segmentKind: matched.kind,
      daysPerPct: matched.daysPerPct,
    };
  };

  const ticks = generateTicksForSegments(segments, jdnToPct);
  const gapSegments = segments.filter((s) => s.kind === 'gap');
  const activeResolutions = segments
    .filter((s) => s.kind === 'active')
    .map((s) => s.localResolution);
  const finestResolution: AxisResolution = activeResolutions.includes('day')
    ? 'day'
    : activeResolutions.includes('month')
      ? 'month'
      : 'year';

  return {
    mode: 'adaptive',
    windowStartJdn: wStart,
    windowEndJdn: wEnd,
    totalWindowDays,
    segments,
    gapSegments,
    ticks,
    hasCompressedGaps: gapSegments.length > 0,
    finestResolution,
    jdnToPct,
    pctToScanSample,
  };
}

/**
 * Greedily packs horizontal percentage intervals into compact non-overlapping sub-rows.
 * Longer spans are placed first so shorter day-by-day bursts tuck cleanly below them.
 */
export function packIntervalsIntoSubRows(
  items: PackableInterval[],
  minGapPct = 0.45,
): PackedSubRowResult {
  const rowById = new Map<string, number>();
  if (items.length === 0) {
    return { rowById, rowCount: 1 };
  }

  const sorted = [...items].sort(
    (a, b) => a.leftPct - b.leftPct || b.widthPct - a.widthPct || a.id.localeCompare(b.id),
  );
  const rowRightEdges: number[] = [];

  for (let i = 0; i < sorted.length; i += 1) {
    const item = sorted[i];
    const itemRight = item.leftPct + item.widthPct;
    let placedRow = -1;
    for (let r = 0; r < rowRightEdges.length; r += 1) {
      if (rowRightEdges[r] + minGapPct <= item.leftPct) {
        placedRow = r;
        rowRightEdges[r] = itemRight;
        break;
      }
    }
    if (placedRow === -1) {
      placedRow = rowRightEdges.length;
      rowRightEdges.push(itemRight);
    }
    rowById.set(item.id, placedRow);
  }

  return {
    rowById,
    rowCount: Math.max(1, rowRightEdges.length),
  };
}
