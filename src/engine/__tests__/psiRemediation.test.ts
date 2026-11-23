import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findMacroEraForYear, parsePreciseDate, resolveMacroEras } from '../calendar/jdnCalendar';
import { computeDensityBins } from '../analytics/periodAnalytics';
import { formatBibTeXCitation, formatGostCitation } from '../../utils/citation';
import { formatCardToMarkdown } from '../../utils/markdownExport';
import type { EnrichedEvent, MacroEra, RulerPeriod, TimelineNode } from '../../types/timeline';

function readJson<T>(relativePath: string): T {
  const fullPath = path.resolve(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8')) as T;
}

describe('ПСИ Академии наук — регрессионная верификация (ADR-015)', () => {
  it('propagates Julian month-precision dates across month/year boundaries accurately', () => {
    const dec1914End = parsePreciseDate('1914-12', 1914, true, { calendarStyle: 'julian' });
    expect(dec1914End.hasStyleSplit).toBe(true);
    expect(dec1914End.unified.year).toBe(1915);
    expect(dec1914End.unified.month).toBe(1);
    expect(dec1914End.gregorianParts?.year).toBe(1915);
    expect(dec1914End.gregorianParts?.month).toBe(1);
  });

  it('assigns October 1917 (month=10) to pre-Soviet era and November 1917 (month=11) to Soviet era', () => {
    const rawEras: MacroEra[] = [
      { id: 'ERA_9', period: '1894–1917', startYear: 1894, endYear: 1917, title: 'Поздняя империя', thesis: 'Тезис' },
      { id: 'ERA_10', period: '1917–1953', startYear: 1917, endYear: 1953, title: 'Советская эпоха', thesis: 'Тезис' },
    ];
    const resolved = resolveMacroEras(rawEras);
    expect(findMacroEraForYear(1917, resolved, 10)?.id).toBe('ERA_9');
    expect(findMacroEraForYear(1917, resolved, 11)?.id).toBe('ERA_10');
  });

  it('formats citations strictly according to ГОСТ Р 7.0.100–2018 and includes BibTeX in Markdown export', () => {
    const target = {
      kind: 'card' as const,
      id: '1917-october-revolution',
      title: 'Октябрьская революция 1917 года',
      period: '7–8 ноября 1917',
      sectionLabel: 'Реформы и экономика',
    };
    const gost = formatGostCitation(target, new Date('2026-11-22T12:00:00Z'));
    expect(gost).toContain('— Текст : электронный //');
    expect(gost).toContain('862–2019');
    expect(gost).toContain('дата обращения: 22.11.2026');

    const bibtex = formatBibTeXCitation(target, new Date('2026-11-22T12:00:00Z'));
    expect(bibtex).toContain('@misc{');
    expect(bibtex).toContain('2.3.0');

    const dummyEvent = {
      id: '1917-october-revolution',
      title: 'Октябрьская революция 1917 года',
      subtitle: 'Вооружённое восстание в Петрограде',
      details: 'Тестовое описание события.',
      period: '1917',
      startYear: 1917,
      endYear: 1917,
      task: 'REFORMS_ECO',
      region: 'Петроград',
      type: 'Революция',
      keyFigures: ['В. И. Ленин'],
      prerequisites: ['Кризис Временного правительства'],
      outcome: 'Провозглашение советской власти',
      eraId: 'ERA_10',
      duration: 0,
      overlappingRulers: [],
      prerequisitesList: ['Кризис Временного правительства'],
      retrospectiveLinks: [],
      concurrentEvents: [],
      startPrecision: parsePreciseDate('1917-11-07', 1917, false, { calendarStyle: 'both' }),
      endPrecision: parsePreciseDate('1917-11-08', 1917, true, { calendarStyle: 'both' }),
      sources: [
        {
          type: 'primary' as const,
          citation: 'Декреты Советской власти. Т. 1. — М., 1957.',
        },
      ],
      explicitLinks: [],
      inferredLinks: [],
      syncTags: [],
      referenceTags: [],
      subEvents: [],
    } as unknown as EnrichedEvent;

    const md = formatCardToMarkdown({
      card: dummyEvent,
      branch: null,
      parentBranch: null,
      era: null,
      branches: [],
      allEventsById: new Map(),
      now: new Date('2026-11-22T12:00:00Z'),
    });
    expect(md.content).toContain('ГОСТ Р 7.0.100–2018');
    expect(md.content).toContain('```bibtex');
  });

  it('verifies core ПСИ historical data fixes across wars, economics, diplomacy, world, rulers, and WW1', () => {
    const wars = readJson<{ nodes: TimelineNode[] }>('public/data/wars.json').nodes;
    const eco = readJson<{ nodes: TimelineNode[] }>('public/data/economics.json').nodes;
    const diplomacy = readJson<{ nodes: TimelineNode[] }>('public/data/diplomacy.json').nodes;
    const world = readJson<{ nodes: TimelineNode[] }>('public/data/world.json').nodes;
    const rulers = readJson<{ rulers: RulerPeriod[] }>('public/data/rulers.json').rulers;
    const thought = readJson<{ nodes: TimelineNode[] }>('public/data/thought_religion.json').nodes;
    const ww1Ru = readJson<{ nodes: TimelineNode[] }>('public/data/campaigns/ww1/russia.json').nodes;
    const ww1Ot = readJson<{ nodes: TimelineNode[] }>('public/data/campaigns/ww1/ottoman.json').nodes;

    // 1. No corrupted surname "Б. В. Резонансным"
    const afghan = wars.find((n) => n.id === '1979-afghan-war');
    expect(afghan).toBeDefined();
    expect(JSON.stringify(afghan)).toContain('Б. В. Громовым');
    expect(JSON.stringify(afghan)).not.toContain('Резонансным');

    // 2. Non-war political crises relocated from wars.json to economics.json
    for (const movedId of ['1937-great-terror', '1944-deportations', '1962-novocherkassk', '1993-white-house']) {
      expect(wars.some((n) => n.id === movedId)).toBe(false);
      expect(eco.some((n) => n.id === movedId)).toBe(true);
    }

    // 3. Canonical Russian & world milestones added
    for (const id of [
      '1547-ivan4-tsardom-coronation',
      '1917-february-revolution',
      '1917-october-revolution',
      '1922-ussr-formation',
    ]) {
      expect(eco.some((n) => n.id === id)).toBe(true);
    }
    expect(wars.some((n) => n.id === '1945-soviet-japanese-war')).toBe(true);
    const gpw = wars.find((n) => n.id === '1941-ww2');
    expect(gpw?.endDate).toBe('1945-05-09');

    // 4. Jassy & Second/Third Partitions split in diplomacy.json
    const jassy = diplomacy.find((n) => n.id === '1791-jassy-treaty');
    expect(jassy?.startDate).toBe('1792-01-09');
    expect(jassy?.calendarStyle).toBe('both');
    expect(diplomacy.some((n) => n.id === '1793-second-third-partitions-poland')).toBe(true);

    // 5. World deduplication & 1939 global WW2 node
    expect(world.some((n) => n.id === '1701-world-spanish-succ')).toBe(false);
    expect(world.some((n) => n.id === '1870-world-sedan-german-empire')).toBe(false);
    const ww2Global = world.find((n) => n.id === '1939-world-ww2-global');
    expect(ww2Global?.startDate).toBe('1939-09-01');
    expect(ww2Global?.endDate).toBe('1945-09-02');

    // 6. Rulers: Semiboyarshchina + Zemstvo Council 1612-1613 + Nicholas I
    const semiboyar = rulers.find((r) => r.id === 'ruler-semiboyarshchina');
    const zemstvo = rulers.find((r) => r.id === 'ruler-zemstvo-council-1612');
    const nicholas1 = rulers.find((r) => r.id === 'ruler-nicholas-1');
    expect(semiboyar?.endDate).toBe('1612-11-05');
    expect(zemstvo?.startDate).toBe('1612-11-05');
    expect(zemstvo?.endDate).toBe('1613-03-03');
    expect(nicholas1?.startDate).toBe('1825-12-01');

    // 7. Anachronism removed in 1490-non-possessors-third-rome
    const thirdRome = thought.find((n) => n.id === '1490-non-possessors-third-rome');
    expect(thirdRome?.region).not.toContain('Московское царство');

    // 8. WW1 East Prussia outcome & Sarikamish calendar alignment
    const eastPrussia = ww1Ru.find((n) => n.id === 'ww1-ru-east-prussia');
    expect(eastPrussia?.operationProfile?.resultSummary).toContain('Оперативно-стратегическое поражение');

    const ruSarikamish = ww1Ru.find((n) => n.id === 'ww1-ru-sarikamish');
    const otSarikamish = ww1Ot.find((n) => n.id === 'ww1-ot-sarikamish');
    expect(ruSarikamish?.startDate).toBe('1914-12-22');
    expect(ruSarikamish?.endDate).toBe('1915-01-17');
    expect(ruSarikamish?.calendarStyle).toBe('both');
    expect(otSarikamish?.startDate).toBe('1914-12-22');
    expect(otSarikamish?.endDate).toBe('1915-01-17');
    expect(otSarikamish?.calendarStyle).toBe('gregorian');
  });

  it('produces strictly unique contiguous density bins on narrow windows (1914–1918, single-year) and wide ranges', () => {
    const ww1GlobalBins = computeDensityBins([], 1914, 1918, 36);
    expect(ww1GlobalBins.map((b) => `${b.startYear}-${b.endYear}`)).toEqual([
      '1914-1914',
      '1915-1915',
      '1916-1916',
      '1917-1917',
      '1918-1918',
    ]);

    const ww1WindowBins = computeDensityBins([], 1914, 1918, 28);
    expect(new Set(ww1WindowBins.map((b) => b.startYear)).size).toBe(5);
    expect(ww1WindowBins).toHaveLength(5);

    const singleYearBins = computeDensityBins([], 1917, 1917, 28);
    expect(singleYearBins).toHaveLength(1);
    expect(singleYearBins[0]).toMatchObject({ startYear: 1917, endYear: 1917 });

    const wideBins = computeDensityBins([], 862, 2019, 36);
    expect(wideBins).toHaveLength(36);
    expect(wideBins[0].startYear).toBe(862);
    expect(wideBins[wideBins.length - 1].endYear).toBe(2019);
    for (let i = 1; i < wideBins.length; i += 1) {
      expect(wideBins[i].startYear).toBe(wideBins[i - 1].endYear + 1);
      expect(wideBins[i].endYear).toBeGreaterThanOrEqual(wideBins[i].startYear);
    }
  });
});
