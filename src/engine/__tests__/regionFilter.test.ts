import { describe, expect, it } from 'vitest';
import {
  classifyEventMacroRegions,
  computeMacroRegionCounts,
  doesEventMatchMacroRegion,
  getMacroRegionOption,
  parseMacroRegionParam,
} from '../regionFilter';

describe('regionFilter — geographic macro-region facet classifier', () => {
  it('classifies Russian historical regions deterministically', () => {
    expect(
      classifyEventMacroRegions({ region: 'Москва / Владимирская Русь', task: 'INTERNAL_BUFFER' }),
    ).toContain('rus_center');

    expect(
      classifyEventMacroRegions({ region: 'Санкт-Петербург / Балтика', task: 'WEST_EXPANSION' }),
    ).toContain('rus_north_west');

    expect(
      classifyEventMacroRegions({ region: 'Крым / Причерноморье / Кавказ', task: 'SOUTH_EXPANSION' }),
    ).toContain('rus_south_caucasus');

    expect(
      classifyEventMacroRegions({ region: 'Поволжье / Казань / Средняя Азия', task: 'EAST_STEPPE' }),
    ).toContain('rus_volga_ural');

    expect(
      classifyEventMacroRegions({ region: 'Сибирь / Дальний Восток / Порт-Артур', task: 'EAST_STEPPE' }),
    ).toContain('rus_siberia_fareast');
  });

  it('classifies world regions (Europe, East/South Asia, Middle East, Americas)', () => {
    expect(
      classifyEventMacroRegions({ region: 'Франция / Германия / Европа', task: 'WORLD_GEOPOLITICS' }),
    ).toContain('europe');

    expect(
      classifyEventMacroRegions({ region: 'Китай / Япония / Индия', task: 'WORLD_GEOPOLITICS' }),
    ).toContain('asia_east');

    expect(
      classifyEventMacroRegions({ region: 'Османская империя / Иран', task: 'WORLD_GEOPOLITICS' }),
    ).toContain('middle_east_africa');

    expect(
      classifyEventMacroRegions({ region: 'США / Латинская Америка', task: 'WORLD_ECONOMY' }),
    ).toContain('americas_global');

    expect(
      classifyEventMacroRegions({ region: 'Падуя / Базель', task: 'WORLD_MEDICINE' }),
    ).toEqual(['europe']);
  });

  it('distinguishes London from the Don and matches Cyrillic inflections', () => {
    expect(classifyEventMacroRegions({ region: 'Париж / Лондон / Санкт-Петербург', task: 'DIPLOMACY_TREATIES' }))
      .toEqual(['rus_north_west', 'europe']);
    expect(classifyEventMacroRegions({ region: 'Дон / Средняя Азия', task: 'SEAS' }))
      .toEqual(['rus_south_caucasus', 'rus_volga_ural']);
    expect(classifyEventMacroRegions({ region: 'Тульская губерния / Дальний Восток / Москва', task: 'DOCTORS_BIO' }))
      .toEqual(['rus_siberia_fareast', 'rus_center']);
    expect(classifyEventMacroRegions({ region: 'Место не установлено', task: 'WORLD_CONTEXT' })).toEqual(['unknown']);
  });

  it('computes facet counts and supports matching against "all"', () => {
    const sample = [
      { region: 'Москва', task: 'REFORMS_ECO' },
      { region: 'Китай', task: 'WORLD_CONTEXT' },
      { region: 'Крым / Османская империя', task: 'SOUTH_EXPANSION' },
    ];
    const counts = computeMacroRegionCounts(sample);
    expect(counts.all).toBe(3);
    expect(counts.rus_center).toBe(1);
    expect(counts.asia_east).toBe(1);
    expect(counts.rus_south_caucasus).toBe(1);
    expect(counts.middle_east_africa).toBe(1);
    expect(doesEventMatchMacroRegion(sample[1], 'all')).toBe(true);
    expect(doesEventMatchMacroRegion(sample[1], 'asia_east')).toBe(true);
    expect(doesEventMatchMacroRegion(sample[1], 'europe')).toBe(false);
  });

  it('resolves macro-region options and URL parameters safely', () => {
    expect(getMacroRegionOption('asia_east').shortLabel).toBe('Вост. и Юж. Азия');
    expect(parseMacroRegionParam('europe')).toBe('europe');
    expect(parseMacroRegionParam('invalid_region')).toBe('all');
    expect(parseMacroRegionParam(null)).toBe('all');
  });
});

