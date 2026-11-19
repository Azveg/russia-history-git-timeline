import { describe, expect, it } from 'vitest';
import {
  buildCanonicalDeepLink,
  formatBibTeXCitation,
  formatGostCitation,
} from '../../utils/citation';

describe('citation — GOST R 7.0.5 & BibTeX academic citation formatting', () => {
  const fixedDate = new Date(2026, 10, 19); // 19.11.2026

  it('formats a valid GOST R 7.0.5 citation with canonical deep link and access date', () => {
    const gost = formatGostCitation(
      {
        kind: 'card',
        id: '1775-reform-guberniya',
        title: 'Губернская реформа Екатерины II',
        period: '1775',
        sectionLabel: 'Экономика и реформы',
      },
      fixedDate,
    );

    expect(gost).toContain('Губернская реформа Екатерины II (1775) [Электронный ресурс]');
    expect(gost).toContain('?card=1775-reform-guberniya');
    expect(gost).toContain('дата обращения: 19.11.2026');
  });

  it('escapes special LaTeX characters and transliterates Cyrillic keys in BibTeX output', () => {
    const bib = formatBibTeXCitation(
      {
        kind: 'person',
        id: 'Пётр I',
        title: 'Реформы & флот: 100% модернизация',
        sectionLabel: 'Досье персоны',
      },
      fixedDate,
    );

    expect(bib).toMatch(/^@misc\{atlas_person_pyotr_i,/);
    expect(bib).toContain('Реформы \\& флот: 100\\% модернизация');
    expect(bib).toContain('note         = {Дата обращения: 2026-11-19}');
  });

  it('constructs clean query-parameter deep links without hardcoded .local placeholder', () => {
    const link = buildCanonicalDeepLink('ruler', 'peter-1');
    expect(link).toContain('?ruler=peter-1');
    expect(link).not.toContain('historical-atlas.local');
  });
});
