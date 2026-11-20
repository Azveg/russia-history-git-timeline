import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildPersonDossierIndex } from '../nlp/personExtractor';
import { getRulerPeriodSummaryData } from '../analytics/periodAnalytics';
import { sanitizeRulerPeriod } from '../repository/timelineRepository';
import { getEnrichedEvents } from '../timelineEngine';
import type {
  BranchDefinition,
  RulerPeriod,
  SyncManifest,
  TimelineDataFile,
} from '../../types/timeline';

const VALID_RELATION_TYPES = new Set(['ally', 'opponent', 'diplomacy', 'family', 'military']);

function loadRulersJson(): RulerPeriod[] {
  const filePath = path.resolve(process.cwd(), 'public/data/rulers.json');
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { rulers?: RulerPeriod[] };
  return Array.isArray(raw) ? raw : (raw.rulers ?? []);
}

describe('Ruler biographical profiles & PeriodSummary analytics', () => {
  it('ensures all 77 rulers in public/data/rulers.json have structured biography, keyActions, innerCircle, and legacy', () => {
    const rulers = loadRulersJson();
    expect(rulers).toHaveLength(77);

    for (const ruler of rulers) {
      const sanitized = sanitizeRulerPeriod(ruler);
      expect(sanitized, `sanitizeRulerPeriod failed for ${ruler.id}`).not.toBeNull();
      expect(sanitized?.lifeYears?.trim().length, `missing lifeYears for ${ruler.id}`).toBeGreaterThan(2);
      expect(
        sanitized?.dynastyOrTitle?.trim().length,
        `missing dynastyOrTitle for ${ruler.id}`,
      ).toBeGreaterThan(3);
      expect(sanitized?.biography?.trim().length, `missing biography for ${ruler.id}`).toBeGreaterThan(40);
      expect(sanitized?.legacy?.trim().length, `missing legacy for ${ruler.id}`).toBeGreaterThan(20);
      expect(sanitized?.keyActions?.length ?? 0, `missing keyActions for ${ruler.id}`).toBeGreaterThanOrEqual(2);
      expect(sanitized?.innerCircle?.length ?? 0, `missing innerCircle for ${ruler.id}`).toBeGreaterThanOrEqual(2);

      for (const member of sanitized?.innerCircle ?? []) {
        expect(VALID_RELATION_TYPES.has(member.relationType)).toBe(true);
        expect(member.role.trim().length).toBeGreaterThan(2);
        expect(member.connection.trim().length).toBeGreaterThan(15);
      }
    }
  });

  it('explains Otto von Bismarck and key reformers in Alexander II innerCircle', () => {
    const rulers = loadRulersJson();
    const alex2 = rulers.find((r) => r.id === 'ruler-alexander-2');
    expect(alex2).toBeDefined();
    expect(alex2?.lifeYears).toContain('1818');
    expect(alex2?.lifeYears).toContain('1881');

    const bismarck = alex2?.innerCircle?.find((m) => m.name.includes('Бисмарк'));
    expect(bismarck).toBeDefined();
    expect(bismarck?.relationType).toBe('diplomacy');
    expect(bismarck?.connection.toLowerCase()).toContain('пос');

    const milyutin = alex2?.innerCircle?.find((m) => m.name.includes('Милютин'));
    expect(milyutin).toBeDefined();
  });

  it('sanitizes malformed keyActions and normalizes invalid innerCircle relationTypes safely', () => {
    const cleaned = sanitizeRulerPeriod({
      id: 'ruler-test',
      eraId: 'empire',
      ruler: 'Тестовый правитель',
      shortRuler: 'Тест',
      reignPeriod: '1855–1881',
      startYear: 1855,
      endYear: 1881,
      reignTitle: 'Тестовое правление',
      reignThesis: 'Тезис',
      lifeYears: '1818–1881',
      dynastyOrTitle: 'Романовы',
      biography: 'Краткая биография.',
      legacy: 'Историческое наследие.',
      keyActions: [
        {
          year: '1861',
          title: 'Отмена крепостного права',
          summary: 'Освобождение крестьян.',
          eventId: '1861-reform-emancipation',
        },
        {
          year: '1864',
          title: '',
          summary: 'Битая запись без заголовка должна быть отброшена',
        },
      ],
      innerCircle: [
        {
          name: 'Отто фон Бисмарк',
          relationType: 'diplomacy',
          role: 'Посол Пруссии',
          connection: 'Работал послом в Петербурге.',
        },
        {
          name: 'Фигура без описания связи',
          relationType: 'ally',
          role: 'Роль',
          connection: '',
        },
        {
          name: 'Фигура с неизвестным типом',
          relationType: 'unknown_role',
          role: 'Советник',
          connection: 'Тип отношения должен нормализоваться к ally.',
        },
      ],
    });

    expect(cleaned).not.toBeNull();
    expect(cleaned?.keyActions).toHaveLength(1);
    expect(cleaned?.keyActions?.[0].eventId).toBe('1861-reform-emancipation');
    expect(cleaned?.innerCircle).toHaveLength(2);
    expect(cleaned?.innerCircle?.[0].name).toBe('Отто фон Бисмарк');
    expect(cleaned?.innerCircle?.[1].relationType).toBe('ally');
  });

  it('resolves innerCircle members against personDossiers and keyActions against enrichedEvents', () => {
    const branches: BranchDefinition[] = [
      {
        id: 'REFORMS',
        gitName: 'reforms',
        label: 'Реформы',
        short: 'Реф',
        description: 'Внутренние реформы и преобразования',
        color: '#f59e0b',
        badgeClass: 'bg-amber-500/20 text-amber-200',
        isMilitary: false,
      },
      {
        id: 'DIPLOMACY',
        gitName: 'diplomacy',
        label: 'Дипломатия',
        short: 'Дип',
        description: 'Внешняя политика и дипломатические договоры',
        color: '#38bdf8',
        badgeClass: 'bg-sky-500/20 text-sky-200',
        isMilitary: false,
      },
    ];

    const rulers = loadRulersJson();
    const alex2 = rulers.find((r) => r.id === 'ruler-alexander-2')!;

    const manifest: SyncManifest = {
      project: 'test-atlas',
      schemaVersion: '1.0',
      timeAxis: {
        minYear: 1850,
        maxYear: 1890,
        resolution: 'year',
        overlapRule: 'inclusive',
      },
      macroEras: [
        {
          id: 'EMPIRE',
          period: '1721–1917',
          startYear: 1721,
          endYear: 1917,
          title: 'Российская империя',
          thesis: 'Имперский период истории России.',
        },
      ],
      mountedFiles: [
        {
          fileId: 'reforms',
          path: 'data/reforms.json',
          role: 'thematic_branch',
          branchIds: ['REFORMS'],
          title: 'Реформы',
          enabled: true,
        },
        {
          fileId: 'diplomacy',
          path: 'data/diplomacy.json',
          role: 'thematic_branch',
          branchIds: ['DIPLOMACY'],
          title: 'Дипломатия',
          enabled: true,
        },
      ],
      crossLinks: [],
    };

    const filesMap: Record<string, TimelineDataFile> = {
      'data/reforms.json': {
        fileId: 'reforms',
        path: 'data/reforms.json',
        branch: branches[0],
        nodes: [
          {
            id: '1861-reform-emancipation',
            task: 'REFORMS',
            period: '1861',
            startYear: 1861,
            endYear: 1861,
            title: 'Отмена крепостного права',
            subtitle: 'Манифест 19 февраля 1861 года',
            details: 'Крестьянская реформа Александра II.',
            region: 'Российская империя',
            type: 'reform',
            keyFigures: ['Александр II', 'Николай Алексеевич Милютин'],
          },
        ],
      },
      'data/diplomacy.json': {
        fileId: 'diplomacy',
        path: 'data/diplomacy.json',
        branch: branches[1],
        nodes: [
          {
            id: '1878-san-stefano-berlin',
            task: 'DIPLOMACY',
            period: '1878',
            startYear: 1878,
            endYear: 1878,
            title: 'Берлинский конгресс',
            subtitle: 'Пересмотр Сан-Стефанского мира',
            details: 'Дипломатический конгресс под председательством Отто фон Бисмарка.',
            region: 'Европа',
            type: 'diplomacy',
            keyFigures: ['Александр Михайлович Горчаков', 'Отто фон Бисмарк'],
          },
        ],
      },
    };

    const enrichedEvents = getEnrichedEvents(manifest, filesMap, rulers);
    const { dossiers } = buildPersonDossierIndex(enrichedEvents, rulers);
    const summary = getRulerPeriodSummaryData(alex2, enrichedEvents, branches, dossiers, rulers);

    const resolvedBismarck = summary.resolvedInnerCircle.find((m) => m.name.includes('Бисмарк'));
    expect(resolvedBismarck).toBeDefined();
    expect(resolvedBismarck?.personKey).not.toBeNull();
    expect(resolvedBismarck?.totalEventCount).toBeGreaterThanOrEqual(1);

    const emancipationAction = summary.resolvedKeyActions.find(
      (a) => a.eventId === '1861-reform-emancipation',
    );
    expect(emancipationAction?.linkedEvent?.id).toBe('1861-reform-emancipation');

    // Kinship resolution checks for Alexander II
    const father = summary.resolvedFamily.find((r) => r.group === 'parent' && r.rulerId === 'ruler-nicholas-1');
    expect(father?.targetKind).toBe('ruler');
    expect(father?.linkedRuler?.id).toBe('ruler-nicholas-1');

    const uncleAlex1 = summary.resolvedFamily.find((r) => r.group === 'uncle_aunt' && r.rulerId === 'ruler-alexander-1');
    expect(uncleAlex1?.targetKind).toBe('ruler');
    expect(uncleAlex1?.linkedRuler?.id).toBe('ruler-alexander-1');

    const sonAlex3 = summary.resolvedFamily.find((r) => r.group === 'child' && r.rulerId === 'ruler-alexander-3');
    expect(sonAlex3?.targetKind).toBe('ruler');
    expect(sonAlex3?.linkedRuler?.id).toBe('ruler-alexander-3');

    const miniCardRelative = summary.resolvedFamily.find((r) => r.targetKind === 'mini_card');
    expect(miniCardRelative).toBeDefined();
    expect(miniCardRelative?.note?.length).toBeGreaterThan(15);
  });

  it('validates structured family kinship links across all 60 dynastic rulers with zero broken or self-referencing rulerIds', () => {
    const rulers = loadRulersJson();
    const rulerIds = new Set(rulers.map((r) => r.id));
    const validGroups = new Set(['parent', 'uncle_aunt', 'spouse', 'sibling', 'child']);

    const withFamily = rulers.filter((r) => Array.isArray(r.family) && r.family.length > 0);
    expect(withFamily.length).toBeGreaterThanOrEqual(60);

    for (const ruler of withFamily) {
      const sanitized = sanitizeRulerPeriod(ruler);
      expect(sanitized?.family?.length).toBe(ruler.family?.length);

      for (const rel of ruler.family ?? []) {
        expect(validGroups.has(rel.group), `invalid group for ${ruler.id}`).toBe(true);
        expect(rel.name.trim().length).toBeGreaterThan(1);
        expect(rel.relation.trim().length).toBeGreaterThan(1);
        if (rel.rulerId) {
          expect(rel.rulerId, `self-link in ${ruler.id}`).not.toBe(ruler.id);
          expect(rulerIds.has(rel.rulerId), `missing target ruler ${rel.rulerId} from ${ruler.id}`).toBe(true);
        }
      }
    }

    // Verify sanitization drops malformed kinship records and strips self-links
    const cleaned = sanitizeRulerPeriod({
      id: 'ruler-sample',
      eraId: 'ERA_1',
      ruler: 'Тестовый князь',
      shortRuler: 'Тест',
      reignPeriod: '1200–1220',
      startYear: 1200,
      endYear: 1220,
      reignTitle: 'Тест',
      reignThesis: 'Тезис',
      family: [
        { name: 'Отец', relation: 'Отец', group: 'parent', rulerId: 'ruler-sample', lifeYears: '1170–1205' },
        { name: 'Битая группа', relation: 'Дядя', group: 'invalid_group' },
        { name: '', relation: 'Сын', group: 'child' },
      ],
    });
    expect(cleaned?.family).toHaveLength(1);
    expect(cleaned?.family?.[0].rulerId).toBeUndefined();
  });
});
