import { describe, expect, it } from 'vitest';
import {
  detectAxisResolution,
  doesIntervalBelongToEra,
  findMacroEraForYear,
  formatAxisGutterDate,
  parseEventYears,
  parsePreciseDate,
  resolveMacroEras,
} from '../calendar/jdnCalendar';
import type { MacroEra } from '../../types/timeline';

describe('jdnCalendar — Julian/Gregorian historical date engine', () => {
  it('converts 18th-century Julian dates with +11 day Gregorian offset (Poltava 1709-06-27 O.S. -> 1709-07-08 N.S.)', () => {
    const parsed = parsePreciseDate('1709-06-27', 1709, false, { calendarStyle: 'julian' });
    expect(parsed.hasStyleSplit).toBe(true);
    expect(parsed.offsetDays).toBe(11);
    expect(parsed.julianParts).toMatchObject({ year: 1709, month: 6, day: 27 });
    expect(parsed.gregorianParts).toMatchObject({ year: 1709, month: 7, day: 8 });
    expect(parsed.unified).toMatchObject({ year: 1709, month: 7, day: 8 });
  });

  it('converts 19th-century Julian dates with +12 day offset (Emancipation Manifesto 1861-02-19 O.S. -> 1861-03-03 N.S.)', () => {
    const parsed = parsePreciseDate('1861-02-19', 1861, false, { calendarStyle: 'julian' });
    expect(parsed.hasStyleSplit).toBe(true);
    expect(parsed.offsetDays).toBe(12);
    expect(parsed.gregorianParts).toMatchObject({ year: 1861, month: 3, day: 3 });
  });

  it('converts early 20th-century Julian dates with +13 day offset (October 1917-10-25 O.S. -> 1917-11-07 N.S.)', () => {
    const parsed = parsePreciseDate('1917-10-25', 1917, false, { calendarStyle: 'julian' });
    expect(parsed.hasStyleSplit).toBe(true);
    expect(parsed.offsetDays).toBe(13);
    expect(parsed.gregorianParts).toMatchObject({ year: 1917, month: 11, day: 7 });
  });

  it('converts explicit Julian dates in February 1918 (+13 days) instead of treating them as modern Gregorian', () => {
    const parsed = parsePreciseDate('1918-02-02', 1918, false, { calendarStyle: 'julian' });
    expect(parsed.hasStyleSplit).toBe(true);
    expect(parsed.offsetDays).toBe(13);
    expect(parsed.julianParts).toMatchObject({ year: 1918, month: 2, day: 2 });
    expect(parsed.gregorianParts).toMatchObject({ year: 1918, month: 2, day: 15 });
    expect(parsed.unified).toMatchObject({ year: 1918, month: 2, day: 15 });
  });

  it('keeps pre-1582 dates purely Julian without proleptic Gregorian conversion', () => {
    const parsed = parsePreciseDate('1380-09-08', 1380, false, { calendarStyle: 'julian' });
    expect(parsed.calendarStyle).toBe('julian');
    expect(parsed.offsetDays).toBe(0);
    expect(parsed.julianParts).toMatchObject({ year: 1380, month: 9, day: 8 });
    expect(parsed.gregorianParts).toBeUndefined();
    expect(parsed.unified).toMatchObject({ year: 1380, month: 9, day: 8 });
  });

  it('never labels pre-1582 TIME_TICK rows as Gregorian (н. ст.)', () => {
    const pre1582 = formatAxisGutterDate(
      { rowType: 'TIME_TICK', year: 1380, month: 9, label: 'сен 1380', sortKey: 13800901, priority: 0 },
      'month',
    );
    expect(pre1582.styleLabel).toBe('ст. ст.');
    expect(pre1582.styleTone).toBe('julian');

    const dualEra = formatAxisGutterDate(
      { rowType: 'TIME_TICK', year: 1812, month: 6, label: 'июн 1812', sortKey: 18120601, priority: 0 },
      'month',
    );
    expect(dualEra.styleLabel).toBe('н. ст.');
    expect(dualEra.styleTone).toBe('gregorian');

    const modern = formatAxisGutterDate(
      { rowType: 'TIME_TICK', year: 1945, month: 5, label: 'май 1945', sortKey: 19450501, priority: 0 },
      'month',
    );
    expect(modern.styleLabel).toBeUndefined();
  });

  it('keeps post-1918 reform dates purely Gregorian without style split', () => {
    const parsed = parsePreciseDate('1945-05-09', 1945, false, { calendarStyle: 'gregorian' });
    expect(parsed.hasStyleSplit).toBe(false);
    expect(parsed.offsetDays).toBe(0);
    expect(parsed.unified).toMatchObject({ year: 1945, month: 5, day: 9 });
  });

  it('parses period strings and selects adaptive axis resolution correctly', () => {
    expect(parseEventYears('1700–1721')).toEqual({ startYear: 1700, endYear: 1721 });
    expect(parseEventYears('1812')).toEqual({ startYear: 1812, endYear: 1812 });
    expect(detectAxisResolution(862, 2000)).toBe('year');
    expect(detectAxisResolution(1800, 1810)).toBe('month');
    expect(detectAxisResolution(1917, 1918)).toBe('day');
  });

  it('resolves macro eras and matches intervals deterministically', () => {
    const rawEras: MacroEra[] = [
      { id: 'ERA_1', period: 'до 1223', startYear: 862, endYear: 1223, title: 'Древняя Русь', thesis: 'Тезис 1' },
      { id: 'ERA_2', period: '1223–1480', startYear: 1223, endYear: 1480, title: 'Ордынский период', thesis: 'Тезис 2' },
    ];
    const resolved = resolveMacroEras(rawEras);
    expect(findMacroEraForYear(988, resolved)?.id).toBe('ERA_1');
    expect(findMacroEraForYear(1380, resolved)?.id).toBe('ERA_2');
    expect(doesIntervalBelongToEra(1200, 1240, 'ERA_2', resolved[1])).toBe(true);
    expect(doesIntervalBelongToEra(900, 950, 'ERA_1', resolved[1])).toBe(false);
  });

  it('defaults WORLD_* sub-branches to gregorian calendar style after 1582', () => {
    const parsedScience = parsePreciseDate('1687-07-05', 1687, false, { task: 'WORLD_SCIENCE' });
    expect(parsedScience.calendarStyle).toBe('gregorian');
    expect(parsedScience.unified).toMatchObject({ year: 1687, month: 7, day: 5 });

    const parsedMedicine = parsePreciseDate('1796-05-14', 1796, false, { task: 'WORLD_MEDICINE' });
    expect(parsedMedicine.calendarStyle).toBe('gregorian');
  });
});
