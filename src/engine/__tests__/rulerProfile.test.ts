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
        label: 'Реформы',
        color: '#f59e0b',
        badgeClass: 'bg-amber-500/20 text-amber-200',
      },
      {
        id: 'DIPLOMACY',
        label: 'Дипломатия',
        color: '#38bdf8',
        badgeClass: 'bg-sky-500/20 text-sky-200',
      },
    ];

    const rulers = loadRulersJson();
    const alex2 = rulers.find((r) => r.id === 'ruler-alexander-2')!;

    const manifest: SyncManifest = {
      schemaVersion: '1.0',
      atlasTitle: 'Test Atlas',
      defaultAxisStartYear: 1850,
      defaultAxisEndYear: 1890,
      macroEras: [
        {
          id: 'EMPIRE',
          label: 'Российская империя',
          startYear: 1721,
          endYear: 1917,
        },
      ],
      mountedFiles: [
        {
          id: 'reforms',
          file: 'data/reforms.json',
          role: 'branch',
          enabled: true,
        },
        {
          id: 'diplomacy',
          file: 'data/diplomacy.json',
          role: 'branch',
          enabled: true,
        },
      ],
    };

    const filesMap: Record<string, TimelineDataFile> = {
      'data/reforms.json': {
        branch: branches[0],
        events: [
          {
            id: '1861-reform-emancipation',
            task: 'REFORMS',
            period: '1861',
            startYear: 1861,
            endYear: 1861,
            title: 'Отмена крепостного права',
            subtitle: 'Манифест 19 февраля 1861 года',
            details: 'Крестьянская реформа Александра II.',
            keyFigures: ['Александр II', 'Николай Алексеевич Милютин'],
          },
        ],
      },
      'data/diplomacy.json': {
        branch: branches[1],
        events: [
          {
            id: '1878-san-stefano-berlin',
            task: 'DIPLOMACY',
            period: '1878',
            startYear: 1878,
            endYear: 1878,
            title: 'Берлинский конгресс',
            subtitle: 'Пересмотр Сан-Стефанского мира',
            details: 'Дипломатический конгресс под председательством Отто фон Бисмарка.',
            keyFigures: ['Александр Михайлович Горчаков', 'Отто фон Бисмарк'],
          },
        ],
      },
    };

    const enrichedEvents = getEnrichedEvents(manifest, filesMap, [alex2]);
    const { dossiers } = buildPersonDossierIndex(enrichedEvents, [alex2]);
    const summary = getRulerPeriodSummaryData(alex2, enrichedEvents, branches, dossiers);

    const resolvedBismarck = summary.resolvedInnerCircle.find((m) => m.name.includes('Бисмарк'));
    expect(resolvedBismarck).toBeDefined();
    expect(resolvedBismarck?.personKey).not.toBeNull();
    expect(resolvedBismarck?.totalEventCount).toBeGreaterThanOrEqual(1);

    const emancipationAction = summary.resolvedKeyActions.find(
      (a) => a.eventId === '1861-reform-emancipation',
    );
    expect(emancipationAction?.linkedEvent?.id).toBe('1861-reform-emancipation');
  });
});
