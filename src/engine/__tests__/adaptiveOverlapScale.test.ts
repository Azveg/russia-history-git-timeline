import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildAdaptiveOverlapScale,
  formatGapDurationLabel,
  formatScanDate,
  getEventJdnBounds,
  gregorianToJdn,
  packIntervalsIntoSubRows,
  parsePreciseDate,
} from '../timelineEngine';
import type { EnrichedEvent, TimelineNode } from '../../types/timeline';

function readJson<T>(relativePath: string): T {
  const fullPath = path.resolve(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8')) as T;
}

function makeEvent(
  id: string,
  startYear: number,
  endYear: number,
  opts?: {
    startDate?: string;
    endDate?: string;
    calendarStyle?: 'julian' | 'gregorian' | 'both';
    task?: string;
    title?: string;
  },
): EnrichedEvent {
  const startPrecision = parsePreciseDate(opts?.startDate, startYear, false, {
    calendarStyle: opts?.calendarStyle,
  });
  const endPrecision = parsePreciseDate(opts?.endDate ?? opts?.startDate, endYear, true, {
    calendarStyle: opts?.calendarStyle,
  });
  const isAtomic = startPrecision.unified.sortKey === endPrecision.unified.sortKey;
  return {
    id,
    sourceFile: 'test.json',
    detailScope: 'core',
    seq: 1,
    task: opts?.task ?? 'WARS',
    region: 'Россия',
    type: 'war',
    startYear,
    endYear,
    activeFrom: startYear,
    activeTo: endYear,
    startDate: opts?.startDate,
    endDate: opts?.endDate,
    calendarStyle: opts?.calendarStyle,
    period: opts?.startDate ?? `${startYear}`,
    title: opts?.title ?? `Событие ${id}`,
    subtitle: 'Описание',
    details: 'Подробности',
    linksTo: [],
    startPrecision,
    activeStartPrecision: startPrecision,
    endPrecision,
    isAtomic,
    duration: Math.max(0, endYear - startYear),
    eraId: 'ERA_TEST',
    eraRoman: 'IX',
    eraTitle: 'Тестовая эпоха',
    overlappingRulers: [],
    ruler: 'Тестовый правитель',
    reignPeriod: `${startYear}–${endYear}`,
    prerequisitesList: [],
    explicitLinks: [],
    retrospectiveLinks: [],
    concurrentEvents: [],
  };
}

function enrichRawNodes(nodes: TimelineNode[]): EnrichedEvent[] {
  return nodes.map((n) => {
    const startYear = n.startYear ?? 1914;
    const endYear = n.endYear ?? startYear;
    return makeEvent(n.id, startYear, endYear, {
      startDate: n.startDate,
      endDate: n.endDate,
      calendarStyle: n.calendarStyle,
      task: n.task,
      title: n.title,
    });
  });
}

describe('adaptiveOverlapScale — адаптивная нелинейная шкала «Карты полос» (ADR-016)', () => {
  it('maintains strict monotonicity and round-trip invertibility in both adaptive and linear modes', () => {
    const events: EnrichedEvent[] = [
      makeEvent('d1', 1914, 1914, { startDate: '1914-08-17', endDate: '1914-08-17', calendarStyle: 'gregorian' }),
      makeEvent('d2', 1914, 1914, { startDate: '1914-08-20', endDate: '1914-08-20', calendarStyle: 'gregorian' }),
      makeEvent('d3', 1914, 1914, { startDate: '1914-08-26', endDate: '1914-08-30', calendarStyle: 'gregorian' }),
      makeEvent('d4', 1916, 1916, { startDate: '1916-06-04', endDate: '1916-09-20', calendarStyle: 'gregorian' }),
      makeEvent('d5', 1918, 1918, { startDate: '1918-11-11', endDate: '1918-11-11', calendarStyle: 'gregorian' }),
    ];

    for (const mode of ['adaptive', 'linear'] as const) {
      const scale = buildAdaptiveOverlapScale(events, 1914, 1918, mode);
      expect(scale.jdnToPct(scale.windowStartJdn)).toBeCloseTo(0, 6);
      expect(scale.jdnToPct(scale.windowEndJdn)).toBeCloseTo(100, 6);

      // Forward mapping must be strictly increasing across dates
      let prevPct = -1;
      for (let j = scale.windowStartJdn; j <= scale.windowEndJdn; j += 15) {
        const pct = scale.jdnToPct(j);
        expect(pct).toBeGreaterThan(prevPct);
        prevPct = pct;
      }

      // Inverse mapping must be monotonically non-decreasing across [0..100]
      let prevJdn = -Infinity;
      for (let p = 0; p <= 100; p += 2) {
        const sample = scale.pctToScanSample(p);
        expect(sample.jdn).toBeGreaterThanOrEqual(prevJdn);
        prevJdn = sample.jdn;
      }

      // Exact round-trip on event anchor dates
      for (const ev of events) {
        const bounds = getEventJdnBounds(ev);
        const pct = scale.jdnToPct(bounds.startJdn);
        const roundTrip = scale.pctToScanSample(pct);
        expect(Math.abs(roundTrip.jdn - bounds.startJdn)).toBeLessThanOrEqual(2);
      }
    }
  });

  it('expands dense day-by-day events to daily resolution and separates consecutive days horizontally', () => {
    const denseAug1914: EnrichedEvent[] = [
      makeEvent('aug-17', 1914, 1914, { startDate: '1914-08-17', calendarStyle: 'gregorian' }),
      makeEvent('aug-18', 1914, 1914, { startDate: '1914-08-18', calendarStyle: 'gregorian' }),
      makeEvent('aug-19', 1914, 1914, { startDate: '1914-08-19', calendarStyle: 'gregorian' }),
      makeEvent('aug-20', 1914, 1914, { startDate: '1914-08-20', calendarStyle: 'gregorian' }),
      makeEvent('aug-21', 1914, 1914, { startDate: '1914-08-21', calendarStyle: 'gregorian' }),
      makeEvent('aug-22', 1914, 1914, { startDate: '1914-08-22', calendarStyle: 'gregorian' }),
      makeEvent('aug-23', 1914, 1914, { startDate: '1914-08-23', calendarStyle: 'gregorian' }),
    ];

    const adaptive = buildAdaptiveOverlapScale(denseAug1914, 1914, 1914, 'adaptive');
    const linear = buildAdaptiveOverlapScale(denseAug1914, 1914, 1914, 'linear');

    expect(adaptive.finestResolution).toBe('day');
    expect(adaptive.ticks.some((t) => t.resolution === 'day')).toBe(true);

    const aug17Jdn = gregorianToJdn(1914, 8, 17);
    const aug23Jdn = gregorianToJdn(1914, 8, 23);

    const adaptiveSpanPct = adaptive.jdnToPct(aug23Jdn) - adaptive.jdnToPct(aug17Jdn);
    const linearSpanPct = linear.jdnToPct(aug23Jdn) - linear.jdnToPct(aug17Jdn);

    // In adaptive mode, the dense 7-day burst gets dramatically more horizontal room than linear (6/365 ≈ 1.6%)
    expect(adaptiveSpanPct).toBeGreaterThan(linearSpanPct * 5);
    expect(adaptiveSpanPct).toBeGreaterThan(25);

    // Every consecutive day has a strictly distinct X coordinate
    for (let d = 17; d < 23; d += 1) {
      const p1 = adaptive.jdnToPct(gregorianToJdn(1914, 8, d));
      const p2 = adaptive.jdnToPct(gregorianToJdn(1914, 8, d + 1));
      expect(p2 - p1).toBeGreaterThan(2);
    }
  });

  it('uses decade-level steps for evenly decade-spaced events without inventing false gaps', () => {
    const decadeEvents: EnrichedEvent[] = [];
    for (let y = 1300; y <= 1400; y += 10) {
      decadeEvents.push(makeEvent(`dec-${y}`, y, y));
    }

    const scale = buildAdaptiveOverlapScale(decadeEvents, 1300, 1400, 'adaptive');
    expect(scale.hasCompressedGaps).toBe(false);
    expect(scale.gapSegments).toHaveLength(0);
    expect(scale.finestResolution).toBe('year');
    expect(scale.ticks.length).toBeGreaterThanOrEqual(5);
    expect(scale.ticks.every((t) => t.resolution === 'year')).toBe(true);
  });

  it('compresses empty multi-year pauses into capped dashed gap inlays while preserving active clusters', () => {
    const events: EnrichedEvent[] = [
      // Cluster 1: 1812
      makeEvent('c1-a', 1812, 1812, { startDate: '1812-06-24', calendarStyle: 'gregorian' }),
      makeEvent('c1-b', 1812, 1812, { startDate: '1812-09-07', calendarStyle: 'gregorian' }),
      makeEvent('c1-c', 1812, 1812, { startDate: '1812-10-24', calendarStyle: 'gregorian' }),
      // 12-year empty pause 1813..1824
      // Cluster 2: 1825
      makeEvent('c2-a', 1825, 1825, { startDate: '1825-12-01', calendarStyle: 'gregorian' }),
      makeEvent('c2-b', 1825, 1825, { startDate: '1825-12-26', calendarStyle: 'gregorian' }),
    ];

    const scale = buildAdaptiveOverlapScale(events, 1812, 1826, 'adaptive');
    expect(scale.hasCompressedGaps).toBe(true);
    expect(scale.gapSegments.length).toBeGreaterThanOrEqual(1);
    expect(scale.gapSegments.length).toBeLessThanOrEqual(6);

    const totalGapPct = scale.gapSegments.reduce((sum, g) => sum + (g.rightPct - g.leftPct), 0);
    expect(totalGapPct).toBeLessThanOrEqual(22.1);

    const mainPause = scale.gapSegments.find((g) => g.durationDays > 365 * 8);
    expect(mainPause).toBeDefined();
    expect(mainPause?.gapLabel).toMatch(/^~\d+\s*(г\.|л\.)$/);
    expect(mainPause?.gapTooltip).toContain('Сжатая пауза');
  });

  it('separates real WW1 August–September 1914 campaign operations onto distinct day-accurate coordinates', () => {
    const ruModule = readJson<{ nodes: TimelineNode[] }>('public/data/campaigns/ww1/russia.json');
    const deModule = readJson<{ nodes: TimelineNode[] }>('public/data/campaigns/ww1/germany.json');
    const enriched = enrichRawNodes([...ruModule.nodes, ...deModule.nodes]);

    const scale = buildAdaptiveOverlapScale(enriched, 1914, 1918, 'adaptive');
    const aug1914Ops = enriched.filter((ev) => ev.startYear === 1914 && ev.startDate);
    expect(aug1914Ops.length).toBeGreaterThanOrEqual(4);

    // Operations starting on different days in 1914 must map to distinct horizontal percentages
    const uniqueLefts = new Set(
      aug1914Ops.map((ev) => Number(scale.jdnToPct(getEventJdnBounds(ev).startJdn).toFixed(2))),
    );
    expect(uniqueLefts.size).toBeGreaterThanOrEqual(4);
    expect(['day', 'month']).toContain(scale.finestResolution);
  });

  it('packs overlapping day-by-day events into compact non-overlapping sub-rows and reuses freed rows', () => {
    const packed = packIntervalsIntoSubRows(
      [
        { id: 'long', leftPct: 10, widthPct: 30 }, // 10..40 -> row 0
        { id: 'short-a', leftPct: 12, widthPct: 6 }, // overlaps long -> row 1
        { id: 'short-b', leftPct: 15, widthPct: 8 }, // overlaps long & short-a -> row 2
        { id: 'short-c', leftPct: 22, widthPct: 6 }, // after short-a (18 + 0.45 <= 22) -> reuses row 1!
        { id: 'after-all', leftPct: 45, widthPct: 10 }, // after long (40 + 0.45 <= 45) -> reuses row 0!
      ],
      0.45,
    );

    expect(packed.rowCount).toBe(3);
    expect(packed.rowById.get('long')).toBe(0);
    expect(packed.rowById.get('short-a')).toBe(1);
    expect(packed.rowById.get('short-b')).toBe(2);
    expect(packed.rowById.get('short-c')).toBe(1);
    expect(packed.rowById.get('after-all')).toBe(0);
  });

  it('formats dual-calendar Julian O.S. notes for 1582–1918 daily scan samples and Russian pause labels', () => {
    const gumbinnen = formatScanDate(gregorianToJdn(1914, 8, 20), 'day');
    expect(gumbinnen.formattedBadge).toBe('20 авг 1914');
    expect(gumbinnen.julianNote).toBe('7 авг ст. ст.');
    expect(gumbinnen.formattedFull).toContain('ст. ст.');

    const postReform = formatScanDate(gregorianToJdn(1918, 11, 11), 'day');
    expect(postReform.formattedBadge).toBe('11 ноя 1918');
    expect(postReform.julianNote).toBeUndefined();

    expect(formatGapDurationLabel(30)).toBe('~30 дн.');
    expect(formatGapDurationLabel(210)).toBe('~7 мес.');
    expect(formatGapDurationLabel(365 * 4)).toBe('~4 г.');
    expect(formatGapDurationLabel(365 * 12)).toBe('~12 л.');
  });
});
