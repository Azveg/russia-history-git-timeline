import { describe, expect, it } from 'vitest';
import {
  parseInitialExactDateRange,
  parseInitialYearBound,
} from '../../hooks/useTimelineUrlSync';
import type {
  BranchDefinition,
  EnrichedEvent,
  RulerPeriod,
  SyncManifest,
} from '../../types/timeline';
import {
  MIN_WINDOW_DAYS,
  buildAdaptiveOverlapScale,
  buildUnifiedTimelineStream,
  clampExactJdnWindow,
  computePresetJdnWindow,
  computeShiftedJdnWindow,
  computeZoomedJdnWindow,
  findSmartAnchorJdn,
  formatWindowRangeLabel,
  getInclusiveWindowDays,
  gregorianToJdn,
  jdnToIsoDate,
  normalizeWindowRangeFromJdn,
  parseIsoDateToJdn,
  parsePreciseDate,
  yearEndJdn,
  yearStartJdn,
} from '../timelineEngine';

function makeEvent(params: {
  id: string;
  task: string;
  startYear: number;
  endYear: number;
  startDate?: string;
  endDate?: string;
  title?: string;
  isAtomic?: boolean;
  seq?: number;
  overlappingRulers?: RulerPeriod[];
}): EnrichedEvent {
  const startPrecision = parsePreciseDate(params.startDate, params.startYear, false, {
    calendarStyle: 'gregorian',
  });
  const endPrecision = parsePreciseDate(params.endDate, params.endYear, true, {
    calendarStyle: 'gregorian',
  });
  return {
    id: params.id,
    sourceFile: 'test.json',
    detailScope: 'core',
    seq: params.seq ?? 1,
    task: params.task,
    title: params.title ?? params.id,
    subtitle: '',
    details: '',
    period:
      params.startYear === params.endYear
        ? `${params.startYear}`
        : `${params.startYear}–${params.endYear}`,
    region: 'Россия',
    type: 'Событие',
    startYear: params.startYear,
    endYear: params.endYear,
    activeFrom: params.startYear,
    activeTo: params.endYear,
    startDate: params.startDate,
    endDate: params.endDate,
    startPrecision,
    activeStartPrecision: startPrecision,
    endPrecision,
    datePrecision: startPrecision.precision,
    isAtomic: params.isAtomic ?? params.startDate === params.endDate,
    duration: Math.max(1, params.endYear - params.startYear + 1),
    eraId: 'empire',
    eraRoman: 'IV',
    eraTitle: 'Российская империя',
    overlappingRulers: params.overlappingRulers ?? [],
    ruler: params.overlappingRulers?.[0]?.ruler ?? 'Николай II',
    reignPeriod: params.overlappingRulers?.[0]?.reignPeriod ?? '1894–1917',
    prerequisitesList: [],
    concurrentEvents: [],
    explicitLinks: [],
    retrospectiveLinks: [],
  };
}

const TEST_BRANCHES: BranchDefinition[] = [
  {
    id: 'MAIN_RULERS',
    gitName: 'main',
    label: 'Правления',
    short: 'Правл.',
    description: '',
    color: '#fbbf24',
    badgeClass: '',
    isMilitary: false,
    isTimeAxis: true,
  },
  {
    id: 'WW1_EAST',
    gitName: 'ww1-east',
    label: 'Восточный фронт',
    short: 'Вост.',
    description: '',
    color: '#ef4444',
    badgeClass: '',
    isMilitary: true,
  },
  {
    id: 'WW1_WEST',
    gitName: 'ww1-west',
    label: 'Западный фронт',
    short: 'Зап.',
    description: '',
    color: '#38bdf8',
    badgeClass: '',
    isMilitary: true,
  },
  {
    id: 'ECON',
    gitName: 'econ',
    label: 'Экономика',
    short: 'Экон.',
    description: '',
    color: '#10b981',
    badgeClass: '',
    isMilitary: false,
  },
];

const TEST_RULER: RulerPeriod = {
  id: 'ruler-nicholas-2',
  eraId: 'empire',
  ruler: 'Николай II',
  shortRuler: 'Николай II',
  reignPeriod: '1894–1917',
  startYear: 1894,
  endYear: 1917,
  startDate: '1894-11-01',
  endDate: '1917-03-15',
  calendarStyle: 'gregorian',
  reignTitle: 'Правление Николая II',
  reignThesis: '',
};

const TEST_MANIFEST: SyncManifest = {
  project: 'Test',
  schemaVersion: '2.0',
  timeAxis: {
    minYear: 1914,
    maxYear: 1918,
    resolution: 'day',
    overlapRule: 'inclusive',
  },
  mountedFiles: [
    {
      fileId: 'rulers',
      path: '/data/rulers.json',
      role: 'rulers_branch',
      branchIds: ['MAIN_RULERS'],
      title: 'Правления',
      enabled: true,
    },
  ],
  macroEras: [
    {
      id: 'empire',
      roman: 'IV',
      period: '1721–1917',
      startYear: 1721,
      endYear: 1917,
      title: 'Российская империя',
      thesis: '',
    },
  ],
  crossLinks: [],
};

describe('Sub-year weekly time window (min 7 days)', () => {
  it('enforces a strict 7-day minimum window and normalizes full-year ranges cleanly', () => {
    const aug19 = gregorianToJdn(1914, 8, 19);
    const aug21 = gregorianToJdn(1914, 8, 21);

    const clamped = clampExactJdnWindow(aug19, aug21, 1914, 1918);
    expect(getInclusiveWindowDays(clamped.fromJdn, clamped.toJdn)).toBe(MIN_WINDOW_DAYS);
    expect(clamped.fromJdn).toBeLessThanOrEqual(aug19);
    expect(clamped.toJdn).toBeGreaterThanOrEqual(aug21);

    const fullYear = normalizeWindowRangeFromJdn(
      yearStartJdn(1914),
      yearEndJdn(1914),
      1914,
      1918,
    );
    expect(fullYear).toEqual({ yearFrom: 1914, yearTo: 1914, exactDateRange: null });
  });

  it('zooms continuously by x2 from multi-year campaign down to 7 days and back out to full years', () => {
    let fromJdn = yearStartJdn(1914);
    let toJdn = yearEndJdn(1918);

    // Zoom in repeatedly — must pass 2 years, 1 year, month, and reach exactly 7 days
    let reachedSubYear = false;
    for (let step = 0; step < 12; step += 1) {
      const next = computeZoomedJdnWindow(fromJdn, toJdn, 0.5, 1914, 1918);
      fromJdn = next.exactDateRange ? next.exactDateRange.fromJdn : yearStartJdn(next.yearFrom);
      toJdn = next.exactDateRange ? next.exactDateRange.toJdn : yearEndJdn(next.yearTo);
      if (next.exactDateRange) reachedSubYear = true;
    }

    expect(reachedSubYear).toBe(true);
    expect(getInclusiveWindowDays(fromJdn, toJdn)).toBe(MIN_WINDOW_DAYS);

    // Zoom back out repeatedly — must return to full campaign bounds with exactDateRange === null
    let lastResult = computeZoomedJdnWindow(fromJdn, toJdn, 2, 1914, 1918);
    for (let step = 0; step < 12; step += 1) {
      fromJdn = lastResult.exactDateRange
        ? lastResult.exactDateRange.fromJdn
        : yearStartJdn(lastResult.yearFrom);
      toJdn = lastResult.exactDateRange
        ? lastResult.exactDateRange.toJdn
        : yearEndJdn(lastResult.yearTo);
      lastResult = computeZoomedJdnWindow(fromJdn, toJdn, 2, 1914, 1918);
    }

    expect(lastResult).toEqual({ yearFrom: 1914, yearTo: 1918, exactDateRange: null });
  });

  it('shifts a 7-day window cleanly in days while preserving exact duration', () => {
    const aug17 = gregorianToJdn(1914, 8, 17);
    const aug23 = gregorianToJdn(1914, 8, 23);
    expect(getInclusiveWindowDays(aug17, aug23)).toBe(7);

    const shiftedRight = computeShiftedJdnWindow(aug17, aug23, 1, 1914, 1918);
    expect(shiftedRight.exactDateRange).not.toBeNull();
    expect(
      getInclusiveWindowDays(
        shiftedRight.exactDateRange!.fromJdn,
        shiftedRight.exactDateRange!.toJdn,
      ),
    ).toBe(7);
    expect(shiftedRight.exactDateRange!.fromJdn).toBeGreaterThan(aug17);

    const shiftedLeft = computeShiftedJdnWindow(
      shiftedRight.exactDateRange!.fromJdn,
      shiftedRight.exactDateRange!.toJdn,
      -1,
      1914,
      1918,
    );
    expect(shiftedLeft.exactDateRange).toEqual({ fromJdn: aug17, toJdn: aug23 });
  });

  it('supports week/month/1-year presets with smart anchoring on dated events', () => {
    const gumbinnen = makeEvent({
      id: 'gumbinnen',
      task: 'WW1_EAST',
      startYear: 1914,
      endYear: 1914,
      startDate: '1914-08-20',
      endDate: '1914-08-20',
      title: 'Гумбинненское сражение',
    });
    const anchor = findSmartAnchorJdn(
      [gumbinnen],
      yearStartJdn(1914),
      yearEndJdn(1914),
      null,
      TEST_BRANCHES,
    );
    expect(jdnToIsoDate(anchor)).toBe('1914-08-20');

    const week = computePresetJdnWindow(
      'week',
      yearStartJdn(1914),
      yearEndJdn(1914),
      1914,
      1918,
      anchor,
    );
    expect(week.exactDateRange).not.toBeNull();
    expect(
      getInclusiveWindowDays(week.exactDateRange!.fromJdn, week.exactDateRange!.toJdn),
    ).toBe(7);
    expect(jdnToIsoDate(week.exactDateRange!.fromJdn)).toBe('1914-08-17');
    expect(jdnToIsoDate(week.exactDateRange!.toJdn)).toBe('1914-08-23');

    const month = computePresetJdnWindow(
      'month',
      yearStartJdn(1914),
      yearEndJdn(1914),
      1914,
      1918,
      anchor,
    );
    expect(month.exactDateRange).not.toBeNull();
    expect(
      getInclusiveWindowDays(month.exactDateRange!.fromJdn, month.exactDateRange!.toJdn),
    ).toBe(30);

    const oneYear = computePresetJdnWindow(
      1,
      yearStartJdn(1914),
      yearEndJdn(1918),
      1914,
      1918,
      anchor,
    );
    expect(oneYear).toEqual({ yearFrom: 1914, yearTo: 1914, exactDateRange: null });
  });

  it('round-trips ISO and Russian dates including 3-digit historical years and URL params', () => {
    const jdn862 = parseIsoDateToJdn('0862-01-01');
    expect(jdn862).toBe(gregorianToJdn(862, 1, 1));
    expect(jdnToIsoDate(jdn862!)).toBe('0862-01-01');
    expect(parseIsoDateToJdn('17.08.1914')).toBe(gregorianToJdn(1914, 8, 17));
    expect(parseIsoDateToJdn('1914-02-30')).toBeNull();

    const exactParams = new URLSearchParams('from=1914-08-17&to=1914-08-24');
    expect(parseInitialYearBound(exactParams, 'from', undefined)).toBe(1914);
    expect(parseInitialYearBound(exactParams, 'to', undefined)).toBe(1914);
    expect(parseInitialExactDateRange(exactParams)).toEqual({
      fromJdn: gregorianToJdn(1914, 8, 17),
      toJdn: gregorianToJdn(1914, 8, 24),
    });

    const yearParams = new URLSearchParams('from=1914&to=1918');
    expect(parseInitialYearBound(yearParams, 'from', undefined)).toBe(1914);
    expect(parseInitialExactDateRange(yearParams)).toBeNull();

    const formatted = formatWindowRangeLabel(
      gregorianToJdn(1914, 8, 17),
      gregorianToJdn(1914, 8, 24),
      true,
    );
    expect(formatted.compact).toBe('17–24 авг 1914');
    expect(formatted.durationLabel).toBe('8 дн.');
  });

  it('filters buildUnifiedTimelineStream synchronously for a 1-week battle window and tracks omitted undated year-only events', () => {
    const events: EnrichedEvent[] = [
      makeEvent({
        id: 'ww1-bg',
        task: 'WW1_EAST',
        startYear: 1914,
        endYear: 1918,
        title: 'Первая мировая война (фоновый процесс)',
        isAtomic: false,
        seq: 1,
        overlappingRulers: [TEST_RULER],
      }),
      makeEvent({
        id: 'gumbinnen',
        task: 'WW1_EAST',
        startYear: 1914,
        endYear: 1914,
        startDate: '1914-08-20',
        endDate: '1914-08-20',
        title: 'Гумбинненское сражение',
        isAtomic: true,
        seq: 2,
        overlappingRulers: [TEST_RULER],
      }),
      makeEvent({
        id: 'marne',
        task: 'WW1_WEST',
        startYear: 1914,
        endYear: 1914,
        startDate: '1914-09-05',
        endDate: '1914-09-12',
        title: 'Битва на Марне',
        isAtomic: false,
        seq: 3,
        overlappingRulers: [TEST_RULER],
      }),
      makeEvent({
        id: 'undated-1914',
        task: 'ECON',
        startYear: 1914,
        endYear: 1914,
        title: 'Годовая запись без точного дня',
        isAtomic: true,
        seq: 4,
        overlappingRulers: [TEST_RULER],
      }),
    ];

    const fromJdn = gregorianToJdn(1914, 8, 17);
    const toJdn = gregorianToJdn(1914, 8, 23);

    const baseFilters = {
      activeBranches: { MAIN_RULERS: true, WW1_EAST: true, WW1_WEST: true, ECON: true },
      yearFrom: 1914,
      yearTo: 1914,
      fromJdn,
      toJdn,
      selectedEra: 'ALL',
      selectedReign: 'ALL',
      searchQuery: '',
      onlyWithSyncLinks: false,
      focusedEventId: null,
      focusScope: 'sync_only' as const,
      showEndNodes: true,
      showOverlapMatrix: true,
    };

    const strictResult = buildUnifiedTimelineStream(
      events,
      [TEST_RULER],
      TEST_MANIFEST,
      TEST_BRANCHES,
      { ...baseFilters, includeUndatedYearEvents: false },
    );

    const strictIds = strictResult.matchingEvents.map((e) => e.id);
    expect(strictIds).toContain('gumbinnen');
    expect(strictIds).toContain('ww1-bg');
    expect(strictIds).not.toContain('marne');
    expect(strictIds).not.toContain('undated-1914');
    expect(strictResult.omittedYearOnlyCount).toBe(1);
    expect(strictResult.matchingRulers.map((r) => r.id)).toEqual(['ruler-nicholas-2']);
    expect(strictResult.axisResolution).toBe('day');

    const dayTicks = strictResult.stream.filter((row) => row.rowType === 'TIME_TICK');
    expect(dayTicks.length).toBe(7);
    expect(dayTicks[0].rowType === 'TIME_TICK' && dayTicks[0].label).toBe('17 авг 1914');

    const inclusiveResult = buildUnifiedTimelineStream(
      events,
      [TEST_RULER],
      TEST_MANIFEST,
      TEST_BRANCHES,
      { ...baseFilters, includeUndatedYearEvents: true },
    );
    expect(inclusiveResult.matchingEvents.map((e) => e.id)).toContain('undated-1914');
    expect(inclusiveResult.omittedYearOnlyCount).toBe(0);
  });

  it('builds a continuous daily overlap scale with 1-day ticks for a 1-week window', () => {
    const events: EnrichedEvent[] = [
      makeEvent({
        id: 'stalluponen',
        task: 'WW1_EAST',
        startYear: 1914,
        endYear: 1914,
        startDate: '1914-08-17',
        endDate: '1914-08-17',
      }),
      makeEvent({
        id: 'gumbinnen',
        task: 'WW1_EAST',
        startYear: 1914,
        endYear: 1914,
        startDate: '1914-08-20',
        endDate: '1914-08-20',
      }),
      makeEvent({
        id: 'tannenberg-start',
        task: 'WW1_EAST',
        startYear: 1914,
        endYear: 1914,
        startDate: '1914-08-23',
        endDate: '1914-08-23',
      }),
    ];
    const fromJdn = gregorianToJdn(1914, 8, 17);
    const toJdn = gregorianToJdn(1914, 8, 23);

    const scale = buildAdaptiveOverlapScale(
      events,
      1914,
      1914,
      'adaptive',
      TEST_BRANCHES,
      { fromJdn, toJdn },
    );

    expect(scale.windowStartJdn).toBe(fromJdn);
    expect(scale.windowEndJdn).toBe(toJdn);
    expect(scale.finestResolution).toBe('day');
    expect(scale.hasCompressedGaps).toBe(false);
    expect(scale.ticks.length).toBeGreaterThanOrEqual(5);
    expect(scale.jdnToPct(fromJdn)).toBe(0);
    expect(scale.jdnToPct(toJdn)).toBe(100);
    expect(scale.jdnToPct(gregorianToJdn(1914, 8, 20))).toBeCloseTo(50, 1);
  });
});
