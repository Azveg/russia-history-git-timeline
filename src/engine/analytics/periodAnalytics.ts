import type {
  AuditCandidateInfo,
  BranchDefinition,
  ComparisonPatternMatch,
  ComparisonSideSummary,
  ComparisonTarget,
  DensityBin,
  DynamicWindowHotspot,
  EnrichedEvent,
  EraEventSphereId,
  EraEventSphereSummary,
  EraFigureEntry,
  EraFigureGroupId,
  ExplicitLinkInfo,
  HiddenBranchLinkGroup,
  MacroEra,
  OverlapAnalyticsSummary,
  OverlapPeakInterval,
  OverlapYearBucket,
  PeriodComparisonReport,
  PersonDossier,
  ReignBranchPairSummary,
  ReignCrossBranchLink,
  ResolvedMacroEra,
  ResolvedRulerInnerCircleMember,
  ResolvedRulerKeyAction,
  ResolvedRulerRelative,
  RulerBoundaryTick,
  RulerParticipantEntry,
  RulerPeriod,
  SyncLinkTypeFilter,
  SyncManifest,
  SyncTagOption,
  WindowLinksVisibilitySummary,
} from '../../types/timeline';
import {
  detectAxisResolution,
  doesIntervalBelongToEra,
  isHistoricalEventNode,
  isLiteraryWorkNode,
  isScienceDiscoveryNode,
  isScientistBioNode,
  isWriterBioNode,
  resolveMacroEras,
} from '../calendar/jdnCalendar';
import {
  getEventEffectiveEndYear,
  getEventEffectiveStartYear,
  intersectsTimeWindow,
  isEventBranchActive,
  resolveEventBranch,
} from '../layout/subLaneLayout';
import {
  buildPersonDossierIndex,
  cleanPersonDisplay,
  extractPreliminaryPersonKey,
  resolvePersonKey,
} from '../nlp/personExtractor';

const SYNC_TAG_HUMAN_LABELS: Record<string, string> = {
  kulikovo: 'Куликовская битва (1380)',
  napoleonic: 'Наполеоновские войны и 1812 год',
  'northern-war': 'Великая Северная война (1700–1721)',
  smuta: 'Смутное время',
  'topic-silver-age': 'Серебряный век русской культуры',
  ww1: 'Первая мировая война (1914–1918)',
  ww2: 'Великая Отечественная и Вторая мировая война',
  'person-akhmatova-anna': 'А. А. Ахматова',
  'person-alferov': 'Ж. И. Алфёров',
  'person-avvakum-petrov': 'протопоп Аввакум',
  'person-blok-alexander': 'А. А. Блок',
  'person-bulgakov-mikhail': 'М. А. Булгаков',
  'person-bunin-ivan': 'И. А. Бунин',
  'person-chekhov-anton': 'А. П. Чехов',
  'person-derzhavin-gavrila': 'Г. Р. Державин',
  'person-dostoevsky-fyodor': 'Ф. М. Достоевский',
  'person-fet-afanasy': 'А. А. Фет',
  'person-fonvizin-denis': 'Д. И. Фонвизин',
  'person-gogol-nikolay': 'Н. В. Гоголь',
  'person-goncharov-ivan': 'И. А. Гончаров',
  'person-gorky-maxim': 'М. Горький',
  'person-griboedov-aleksandr': 'А. С. Грибоедов',
  'person-kapitsa': 'П. Л. Капица',
  'person-karamzin-nikolay': 'Н. М. Карамзин',
  'person-korolev': 'С. П. Королёв',
  'person-krylov-ivan': 'И. А. Крылов',
  'person-kulibin': 'И. П. Кулибин',
  'person-kurchatov': 'И. В. Курчатов',
  'person-lermontov-mikhail': 'М. Ю. Лермонтов',
  'person-leskov-nikolay': 'Н. С. Лесков',
  'person-lobachevsky': 'Н. И. Лобачевский',
  'person-lomonosov': 'М. В. Ломоносов',
  'person-mayakovsky-vladimir': 'В. В. Маяковский',
  'person-mendeleev': 'Д. И. Менделеев',
  'person-nabokov-vladimir': 'В. В. Набоков',
  'person-nekrasov-nikolay': 'Н. А. Некрасов',
  'person-nestor-chronicler': 'Нестор Летописец',
  'person-ostrovsky-aleksandr': 'А. Н. Островский',
  'person-pasternak-boris': 'Б. Л. Пастернак',
  'person-pavlov': 'И. П. Павлов',
  'person-pirogov': 'Н. И. Пирогов',
  'person-popov': 'А. С. Попов',
  'person-pushkin-alexander': 'А. С. Пушкин',
  'person-sakharov': 'А. Д. Сахаров',
  'person-saltykov-shchedrin-mikhail': 'М. Е. Салтыков-Щедрин',
  'person-sechenov': 'И. М. Сеченов',
  'person-sholokhov-mikhail': 'М. А. Шолохов',
  'person-sofoniy-ryazanets': 'Софоний Рязанец',
  'person-solzhenitsyn-alexander': 'А. И. Солженицын',
  'person-tolstoy-leo': 'Л. Н. Толстой',
  'person-tsiolkovsky': 'К. Э. Циолковский',
  'person-tsvetaeva-marina': 'М. И. Цветаева',
  'person-turgenev-ivan': 'И. С. Тургенев',
  'person-tyutchev-fyodor': 'Ф. И. Тютчев',
  'person-vernadsky': 'В. И. Вернадский',
  'person-yesenin-sergey': 'С. А. Есенин',
  'person-zhukovsky-vasily': 'В. А. Жуковский',
  'reform-assignats': 'выпуск ассигнаций и губернская реформа',
  'reform-chosen-council': 'реформы Избранной рады',
  'reform-church-schism': 'церковная реформа и раскол XVII века',
  'reform-customs-1754': 'отмена внутренних таможен и модернизация середины XVIII века',
  'reform-glinskaya-money': 'денежная реформа Елены Глинской',
  'reform-great-reforms': 'Великие реформы Александра II',
  'reform-industrialization': 'план ГОЭЛРО и советская индустриализация',
  'reform-kankrin-money': 'денежная реформа Е. Ф. Канкрина',
  'reform-kosygin-1965': 'Косыгинская экономическая реформа',
  'reform-market-1990s': 'рыночные реформы 1990-х годов',
  'reform-ministries': 'министерская реформа Александра I',
  'reform-new-trade-statute': 'Новоторговый устав 1667 года',
  'reform-nuclear-project': 'советский Атомный проект',
  'reform-oil-boom': 'освоение Западной Сибири и нефтегазовый бум 1970-х',
  'reform-olga-pogosts': 'налоговая реформа княгини Ольги',
  'reform-oprichnina': 'Опричнина Ивана Грозного',
  'reform-perestroika-eco': 'экономические реформы Перестройки',
  'reform-peter-army': 'военная и флотская реформа Петра I',
  'reform-poll-tax': 'введение подушной подати и Табель о рангах',
  'reform-russkaya-pravda': '«Русская Правда»',
  'reform-rvsn': 'создание РВСН и ракетного щита',
  'reform-sobornoye-ulozhenie': 'Соборное уложение 1649 года',
  'reform-stolypin': 'Столыпинская аграрная реформа и Государственная дума',
  'reform-sudebnik-1497': 'Судебник 1497 года',
  'reform-war-communism': 'политика «военного коммунизма» и НЭП',
  'reform-witte-transsib': 'денежная реформа С. Ю. Витте и строительство Транссиба',
  'treaty-aigun-beijing': 'Айгунский и Пекинский договоры',
  'treaty-belovezha': 'Беловежские соглашения и Будапештский меморандум',
  'treaty-brest-1918': 'Брестский, Рижский и Рапалльский договоры',
  'treaty-byzantium-911': 'русско-византийские договоры 911 и 944 годов',
  'treaty-eternal-peace-1686': '«Вечный мир» 1686 года',
  'treaty-jassy-1791': 'Ясский мир 1791 года и разделы Речи Посполитой',
  'treaty-kuchuk-kainarji': 'Кючук-Кайнарджийский мир и присоединение Крыма',
  'treaty-liubech-1097': 'Любечский и Долобский съезды князей',
  'treaty-molotov-ribbentrop': 'советско-германские пакты 1939 года',
  'treaty-moscow-sovereignty': 'европейская дипломатия Ивана III',
  'treaty-nerchinsk-1689': 'Нерчинский договор 1689 года',
  'treaty-nystad': 'Ништадтский мир 1721 года',
  'treaty-paris-berlin': 'Парижский трактат и Лондонская конвенция',
  'treaty-pereyaslav-andrusovo': 'Переяславская рада и Андрусовское перемирие',
  'treaty-portsmouth-1905': 'Портсмутский мир 1905 года',
  'treaty-salt-abm': 'договоры ОСВ-1 и ПРО 1972 года',
  'treaty-stolbovo-deulino': 'Столбовский, Деулинский и Поляновский договоры',
  'treaty-tilsit': 'Тильзитский, Фридрихсгамский и Бухарестский договоры',
  'treaty-yalta-potsdam': 'Ялтинская и Потсдамская конференции 1945 года',
  'war-crimean': 'Крымская война (1853–1856)',
  'war-great-northern': 'Великая Северная война (1700–1721)',
  'war-kulikovo-1380': 'Куликовская битва (1380)',
  'war-polovtsian-steppe': 'степные походы против половцев',
  'war-rus-byzantine': 'русско-византийские походы и договоры X века',
  'war-rus-jap': 'Русско-японская война (1904–1905)',
  'war-rus-turk-1877': 'Русско-турецкая война (1877–1878)',
  'war-ww2-eastern': 'Великая Отечественная война (1941–1945)',
  'world-austrian-succession': 'Война за австрийское наследство',
  'world-axis-munich': 'подъём стран «Оси» и Мюнхенский сговор',
  'world-constantinople-1453': 'падение Константинополя и автокефалия Русской церкви',
  'world-crusade-1204': 'Четвёртый крестовый поход и натиск на Прибалтику',
  'world-discovery-reformation': 'Великие географические открытия и Реформация',
  'world-entente-1907': 'оформление Антанты и Тройственного союза',
  'world-french-rev': 'война за независимость США и Французская революция',
  'world-german-unification': 'объединение Германии в 1870–1871 годах',
  'world-glorious-rev': '«Славная революция» и Война Аугсбургской лиги',
  'world-great-depression': 'Великая депрессия 1929–1933 годов',
  'world-great-schism-1054': 'Великая схизма 1054 года',
  'world-helsinki-1975': 'Хельсинкские соглашения и эпоха Разрядки',
  'world-nato-1999': 'расширение НАТО и распад социалистического блока',
  'world-spanish-succession': 'Война за испанское наследство',
  'world-spring-of-nations': 'европейские революции 1848–1849 годов («Весна народов»)',
  'world-versailles': 'Версальско-Вашингтонская система',
  'world-vienna-congress': 'Венский конгресс и «Священный союз»',
  'world-warsaw-pact': 'создание ОВД и блоковое противостояние',
  'world-westphalia-1648': 'Тридцатилетняя война и Вестфальский мир',
  'world-yalta-nato': 'начало Холодной войны и создание НАТО',
};

export function resolveSyncTagHumanLabel(
  rawTag: string,
  options?: {
    byId?: Map<string, Pick<EnrichedEvent, 'title'>>;
    rulerLabelByTag?: Map<string, string>;
    eraLabelByTag?: Map<string, string>;
  },
): string {
  const tag = rawTag.trim().toLowerCase();
  if (SYNC_TAG_HUMAN_LABELS[tag]) return SYNC_TAG_HUMAN_LABELS[tag];
  if (tag.startsWith('event-') && options?.byId) {
    const targetNode = options.byId.get(tag.slice('event-'.length));
    if (targetNode) return `«${targetNode.title}»`;
  }
  if (options?.eraLabelByTag?.has(tag)) {
    return `эпоха «${options.eraLabelByTag.get(tag)}»`;
  }
  if (options?.rulerLabelByTag?.has(tag)) {
    return `правление (${options.rulerLabelByTag.get(tag)})`;
  }
  return rawTag;
}

export function computeTimelineYearBounds(
  manifest: SyncManifest | null,
  rulers: RulerPeriod[],
  enrichedEvents: EnrichedEvent[],
): { minYear: number; maxYear: number } {
  const baseMin = typeof manifest?.timeAxis?.minYear === 'number' ? manifest.timeAxis.minYear : 862;
  const baseMax = typeof manifest?.timeAxis?.maxYear === 'number' ? manifest.timeAxis.maxYear : 2000;

  let minYear = baseMin;
  let maxYear = baseMax;

  rulers.forEach((r) => {
    if (r.startYear < minYear) minYear = r.startYear;
    if (r.endYear > maxYear) maxYear = r.endYear;
  });

  enrichedEvents.forEach((ev) => {
    if (ev.startYear < minYear) minYear = ev.startYear;
    if (ev.endYear > maxYear) maxYear = ev.endYear;
  });

  if (maxYear <= minYear) {
    maxYear = minYear + 1;
  }

  return { minYear, maxYear };
}

export function buildSyncTagIndex(
  enrichedEvents: EnrichedEvent[],
  rulers: RulerPeriod[],
  eras: MacroEra[],
): SyncTagOption[] {
  const byId = new Map(enrichedEvents.map((e) => [e.id, e]));
  const rulerLabelByTag = new Map<string, string>();
  rulers.forEach((r) => {
    rulerLabelByTag.set(r.id.toLowerCase(), r.shortRuler);
  });
  rulerLabelByTag.set('ruler-ryurik', rulerLabelByTag.get('ruler-rurik') || 'Рюрик');

  const eraLabelByTag = new Map<string, string>();
  resolveMacroEras(eras).forEach((era) => {
    const rawKey = era.id.toLowerCase();
    eraLabelByTag.set(rawKey, era.displayShortTitle);
    eraLabelByTag.set(rawKey.replace(/_/g, '-'), era.displayShortTitle);
  });

  const buckets = new Map<
    string,
    {
      eventIds: Set<string>;
      branchIds: Set<string>;
    }
  >();

  enrichedEvents.forEach((ev) => {
    const rawTags = [
      ...(ev.syncTags || []),
      ...(ev.campaignId ? [ev.campaignId] : []),
      ...(ev.referenceTags || []),
    ];
    const unique = new Set(rawTags.map((t) => t.trim().toLowerCase()).filter(Boolean));
    unique.forEach((tag) => {
      let bucket = buckets.get(tag);
      if (!bucket) {
        bucket = { eventIds: new Set<string>(), branchIds: new Set<string>() };
        buckets.set(tag, bucket);
      }
      bucket.eventIds.add(ev.id);
      bucket.branchIds.add(ev.task);
    });
  });

  const options: SyncTagOption[] = [];
  buckets.forEach((bucket, tag) => {
    const rawLabel = resolveSyncTagHumanLabel(tag, {
      byId,
      rulerLabelByTag,
      eraLabelByTag,
    });
    const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
    options.push({
      tag,
      label,
      eventCount: bucket.eventIds.size,
      branchIds: Array.from(bucket.branchIds),
    });
  });

  return options.sort((a, b) => {
    if (b.eventCount !== a.eventCount) return b.eventCount - a.eventCount;
    return a.label.localeCompare(b.label, 'ru');
  });
}

export function computeUnlinkedAuditMap(
  events: EnrichedEvent[],
): Map<string, AuditCandidateInfo> {
  const map = new Map<string, AuditCandidateInfo>();

  events.forEach((ev) => {
    const linkedIds = new Set(ev.explicitLinks.map((lnk) => lnk.otherId));
    const candidates: EnrichedEvent[] = [];
    let sameYearCount = 0;

    events.forEach((other) => {
      if (other.id === ev.id || other.task === ev.task) return;
      if (linkedIds.has(other.id)) return;
      if (!intersectsTimeWindow(other.startYear, other.endYear, ev.startYear, ev.endYear)) {
        return;
      }
      candidates.push(other);
      if (other.startYear === ev.startYear) {
        sameYearCount += 1;
      }
    });

    if (candidates.length > 0) {
      candidates.sort((a, b) => {
        const aSame = a.startYear === ev.startYear ? 0 : 1;
        const bSame = b.startYear === ev.startYear ? 0 : 1;
        if (aSame !== bSame) return aSame - bSame;
        if (a.startYear !== b.startYear) return a.startYear - b.startYear;
        return a.title.localeCompare(b.title, 'ru');
      });
      map.set(ev.id, {
        eventId: ev.id,
        candidates,
        sameYearCandidatesCount: sameYearCount,
      });
    }
  });

  return map;
}

export function getEventHiddenBranchSummaries(
  ev: EnrichedEvent,
  activeBranches: Record<string, boolean>,
  branches: BranchDefinition[],
): Array<{
  branchId: string;
  label: string;
  short: string;
  color: string;
  linkCount: number;
}> {
  const branchMap = new Map(branches.map((b) => [b.id, b]));
  const acc = new Map<string, Set<string>>();

  ev.explicitLinks.forEach((lnk) => {
    const targetBranchId = lnk.targetEvent.task;
    if (activeBranches[targetBranchId] !== false) return;
    let set = acc.get(targetBranchId);
    if (!set) {
      set = new Set<string>();
      acc.set(targetBranchId, set);
    }
    set.add(lnk.id);
  });

  if (acc.size === 0) return [];

  return Array.from(acc.entries())
    .map(([branchId, linkIds]) => {
      const b = branchMap.get(branchId);
      return {
        branchId,
        label: b?.label || branchId,
        short: b?.short || b?.label || branchId,
        color: b?.color || '#f59e0b',
        linkCount: linkIds.size,
      };
    })
    .sort((a, b) => b.linkCount - a.linkCount || a.label.localeCompare(b.label, 'ru'));
}

export function classifyExplicitLinkCategory(
  lnk: Pick<ExplicitLinkInfo, 'type' | 'isRetrospective'>,
): Exclude<SyncLinkTypeFilter, 'all'> {
  if (
    lnk.type === 'triggers' ||
    lnk.type === 'enables' ||
    lnk.type === 'causes' ||
    lnk.type === 'consequence'
  ) {
    return 'causal';
  }
  if (
    lnk.isRetrospective === true ||
    lnk.type === 'references' ||
    lnk.type === 'about_event' ||
    lnk.type === 'inspired_by'
  ) {
    return 'retrospective';
  }
  return 'sync';
}

export function doesLinkMatchTypeFilter(
  lnk: Pick<ExplicitLinkInfo, 'type' | 'isRetrospective'>,
  filterType: SyncLinkTypeFilter,
): boolean {
  if (filterType === 'all') return true;
  return classifyExplicitLinkCategory(lnk) === filterType;
}

export function computeDensityBins(
  events: EnrichedEvent[],
  yearFrom: number,
  yearTo: number,
  binCount = 28,
): DensityBin[] {
  const safeFrom = Math.min(yearFrom, yearTo);
  const safeTo = Math.max(safeFrom + 1, yearTo);
  const span = safeTo - safeFrom;
  const count = Math.max(4, Math.min(60, binCount));
  const step = span / count;

  const bins: DensityBin[] = [];
  for (let i = 0; i < count; i++) {
    const startYear = Math.round(safeFrom + i * step);
    const endYear = i === count - 1 ? safeTo : Math.max(startYear, Math.round(safeFrom + (i + 1) * step) - 1);
    let totalCount = 0;
    let commitCount = 0;

    for (let j = 0; j < events.length; j++) {
      const ev = events[j];
      const effStartYear = getEventEffectiveStartYear(ev);
      const effEndYear = getEventEffectiveEndYear(ev);
      if (effStartYear <= endYear && effEndYear >= startYear) {
        totalCount++;
        if (effStartYear >= startYear && effStartYear <= endYear) {
          commitCount++;
        }
      }
    }

    bins.push({
      startYear,
      endYear,
      totalCount,
      commitCount,
    });
  }

  return bins;
}

export function computeOverlapAnalytics(
  matchingEvents: EnrichedEvent[],
  matchingRulers: RulerPeriod[],
  thematicLanesCount: number,
  yearFrom: number,
  yearTo: number,
): OverlapAnalyticsSummary {
  const safeFrom = Math.min(yearFrom, yearTo);
  const safeTo = Math.max(safeFrom + 1, yearTo);

  const countsByYear: Array<{ year: number; count: number }> = [];
  let maxConcurrency = 0;

  for (let y = safeFrom; y <= safeTo; y++) {
    let count = 0;
    for (let i = 0; i < matchingEvents.length; i++) {
      const ev = matchingEvents[i];
      const effStartYear = getEventEffectiveStartYear(ev);
      const effEndYear = getEventEffectiveEndYear(ev);
      if (effStartYear <= y && effEndYear >= y) {
        count++;
      }
    }
    if (count > maxConcurrency) {
      maxConcurrency = count;
    }
    countsByYear.push({ year: y, count });
  }

  const hasMeaningfulPeak = maxConcurrency >= 2;
  const yearBuckets: OverlapYearBucket[] = countsByYear.map((b) => ({
    year: b.year,
    count: b.count,
    isPeak: hasMeaningfulPeak && b.count === maxConcurrency,
  }));

  const peakIntervals: OverlapPeakInterval[] = [];
  let currentPeak: OverlapPeakInterval | null = null;

  yearBuckets.forEach((b) => {
    if (b.isPeak) {
      if (currentPeak && b.year === currentPeak.toYear + 1) {
        currentPeak.toYear = b.year;
      } else {
        if (currentPeak) peakIntervals.push(currentPeak);
        currentPeak = { fromYear: b.year, toYear: b.year, maxCount: maxConcurrency };
      }
    } else if (currentPeak) {
      peakIntervals.push(currentPeak);
      currentPeak = null;
    }
  });
  if (currentPeak) {
    peakIntervals.push(currentPeak);
  }

  let primaryPeak: OverlapPeakInterval | null = null;
  peakIntervals.forEach((interval) => {
    if (!primaryPeak) {
      primaryPeak = interval;
    } else {
      const len = interval.toYear - interval.fromYear;
      const bestLen = primaryPeak.toYear - primaryPeak.fromYear;
      if (len > bestLen) {
        primaryPeak = interval;
      }
    }
  });

  const seenBoundaryYears = new Set<number>();
  const rulerBoundaries: RulerBoundaryTick[] = [];
  matchingRulers.forEach((r) => {
    if (r.startYear > safeFrom && r.startYear < safeTo && !seenBoundaryYears.has(r.startYear)) {
      seenBoundaryYears.add(r.startYear);
      rulerBoundaries.push({
        year: r.startYear,
        rulerId: r.id,
        shortRuler: r.shortRuler,
        reignPeriod: r.reignPeriod,
      });
    }
  });
  rulerBoundaries.sort((a, b) => a.year - b.year);

  const multiReignCount = matchingEvents.filter((ev) => ev.overlappingRulers.length > 1).length;

  return {
    yearFrom: safeFrom,
    yearTo: safeTo,
    maxConcurrency,
    peakIntervals,
    primaryPeak,
    yearBuckets,
    rulerBoundaries,
    multiReignCount,
    totalEventsCount: matchingEvents.length,
    activeLanesCount: thematicLanesCount,
  };
}

export function computeDynamicWindowHotspots(
  enrichedEvents: EnrichedEvent[],
  activeBranches: Record<string, boolean>,
  minYear = 862,
  maxYear = 2000,
  maxHotspots = 4,
): DynamicWindowHotspot[] {
  const branchEvents = enrichedEvents.filter((ev) => isEventBranchActive(ev, activeBranches));
  if (branchEvents.length === 0) return [];

  const yearStats: Array<{
    year: number;
    activeCount: number;
    startCount: number;
    preciseCount: number;
    score: number;
  }> = [];

  for (let y = minYear; y <= maxYear; y++) {
    let activeCount = 0;
    let startCount = 0;
    let preciseCount = 0;

    for (let i = 0; i < branchEvents.length; i++) {
      const ev = branchEvents[i];
      if (ev.startYear <= y && ev.endYear >= y) {
        activeCount++;
        if (ev.startYear === y) {
          startCount++;
        }
        if (
          ev.duration <= 4 ||
          ev.startPrecision.precision !== 'year' ||
          ev.endPrecision.precision !== 'year'
        ) {
          preciseCount++;
        }
      }
    }

    if (activeCount > 0) {
      const score = activeCount * 10 + startCount * 4 + preciseCount * 2;
      yearStats.push({ year: y, activeCount, startCount, preciseCount, score });
    }
  }

  if (yearStats.length === 0) return [];

  const statsByYear = new Map(yearStats.map((s) => [s.year, s]));
  const sortedCandidates = [...yearStats].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.activeCount !== a.activeCount) return b.activeCount - a.activeCount;
    if (b.startCount !== a.startCount) return b.startCount - a.startCount;
    return a.year - b.year;
  });

  const minAnchorGap = 20;
  const pickedAnchors: number[] = [];

  for (let i = 0; i < sortedCandidates.length && pickedAnchors.length < maxHotspots; i++) {
    const candidate = sortedCandidates[i];
    if (pickedAnchors.every((anchor) => Math.abs(anchor - candidate.year) >= minAnchorGap)) {
      pickedAnchors.push(candidate.year);
    }
  }

  if (pickedAnchors.length < maxHotspots) {
    const sharpCandidate = sortedCandidates.find(
      (c) =>
        c.preciseCount >= 2 &&
        pickedAnchors.every((anchor) => Math.abs(anchor - c.year) >= 12),
    );
    if (sharpCandidate) {
      pickedAnchors.push(sharpCandidate.year);
    }
  }

  const rawHotspots: DynamicWindowHotspot[] = [];

  pickedAnchors.forEach((peakYear) => {
    const peakStat = statsByYear.get(peakYear);
    if (!peakStat) return;

    const plateauThreshold = Math.max(1, peakStat.activeCount - 1);
    let plateauFrom = peakYear;
    let plateauTo = peakYear;

    while (
      plateauFrom > minYear &&
      peakYear - plateauFrom < 5 &&
      (statsByYear.get(plateauFrom - 1)?.activeCount ?? 0) >= plateauThreshold
    ) {
      plateauFrom--;
    }
    while (
      plateauTo < maxYear &&
      plateauTo - peakYear < 5 &&
      (statsByYear.get(plateauTo + 1)?.activeCount ?? 0) >= plateauThreshold
    ) {
      plateauTo++;
    }

    const coreEvents = branchEvents.filter((ev) =>
      intersectsTimeWindow(ev.startYear, ev.endYear, plateauFrom, plateauTo),
    );
    const shortCore = coreEvents.filter((ev) => ev.duration <= 10);

    let fromYear = plateauFrom;
    let toYear = plateauTo;

    if (shortCore.length >= 2) {
      const minShortStart = Math.min(...shortCore.map((e) => e.startYear));
      const maxShortEnd = Math.max(...shortCore.map((e) => e.endYear));
      fromYear = Math.max(minYear, plateauFrom - 2, minShortStart);
      toYear = Math.min(maxYear, plateauTo + 2, maxShortEnd);
    } else if (coreEvents.length > 0) {
      const minCoreStart = Math.min(...coreEvents.map((e) => e.startYear));
      const maxCoreEnd = Math.max(...coreEvents.map((e) => e.endYear));
      fromYear = Math.max(minYear, plateauFrom - 2, minCoreStart);
      toYear = Math.min(maxYear, plateauTo + 2, maxCoreEnd);
    }

    if (toYear - fromYear > 14) {
      fromYear = Math.max(minYear, peakYear - 6);
      toYear = Math.min(maxYear, peakYear + 6);
    }

    if (fromYear === toYear) {
      const hasSubYearDetail = coreEvents.some(
        (ev) => ev.startPrecision.precision !== 'year' || ev.endPrecision.precision !== 'year',
      );
      if (!hasSubYearDetail) {
        toYear = Math.min(maxYear, fromYear + 1);
      }
    }

    if (toYear < fromYear) {
      toYear = fromYear;
    }

    const eventsInWindow = branchEvents.filter((ev) =>
      intersectsTimeWindow(ev.startYear, ev.endYear, fromYear, toYear),
    );
    if (eventsInWindow.length === 0) return;

    let windowPeak = 0;
    for (let y = fromYear; y <= toYear; y++) {
      const cnt = statsByYear.get(y)?.activeCount ?? 0;
      if (cnt > windowPeak) windowPeak = cnt;
    }

    const rankedTitles = [...eventsInWindow]
      .sort((a, b) => {
        const aAtPeak = a.startYear <= peakYear && a.endYear >= peakYear ? 1 : 0;
        const bAtPeak = b.startYear <= peakYear && b.endYear >= peakYear ? 1 : 0;
        if (bAtPeak !== aAtPeak) return bAtPeak - aAtPeak;
        if (a.duration !== b.duration) return a.duration - b.duration;
        return a.seq - b.seq;
      })
      .slice(0, 3)
      .map((ev) => ev.title);

    rawHotspots.push({
      id: `${fromYear}-${toYear}`,
      fromYear,
      toYear,
      peakCount: windowPeak,
      eventCount: eventsInWindow.length,
      resolution: detectAxisResolution(fromYear, toYear),
      previewTitles: rankedTitles,
    });
  });

  const deduped: DynamicWindowHotspot[] = [];
  rawHotspots.forEach((candidate) => {
    const overlapsExisting = deduped.some((existing) => {
      const overlapStart = Math.max(existing.fromYear, candidate.fromYear);
      const overlapEnd = Math.min(existing.toYear, candidate.toYear);
      if (overlapEnd < overlapStart) return false;
      const overlapLen = overlapEnd - overlapStart + 1;
      const minLen = Math.min(
        existing.toYear - existing.fromYear + 1,
        candidate.toYear - candidate.fromYear + 1,
      );
      return overlapLen / Math.max(1, minLen) > 0.6;
    });
    if (!overlapsExisting) {
      deduped.push(candidate);
    }
  });

  return deduped.sort((a, b) => a.fromYear - b.fromYear);
}

export const ERA_SPHERE_ORDER: EraEventSphereId[] = [
  'wars',
  'reforms',
  'diplomacy',
  'world',
  'science',
];

export const ERA_SPHERE_META: Record<
  EraEventSphereId,
  { label: string; shortLabel: string; description: string }
> = {
  wars: {
    label: 'Войны и военные кампании',
    shortLabel: 'Войны',
    description: 'Вооружённые конфликты, походы, оборона рубежей и внутренние силовые кризисы',
  },
  reforms: {
    label: 'Реформы, экономика и общество',
    shortLabel: 'Реформы',
    description: 'Государственное управление, право, финансы, сословия и общественные сдвиги',
  },
  diplomacy: {
    label: 'Дипломатия и договоры',
    shortLabel: 'Дипломатия',
    description: 'Мирные договоры, съезды, внешнеполитические союзы и изменение границ',
  },
  world: {
    label: 'Мировой контекст',
    shortLabel: 'Мир',
    description: 'Ключевые синхронные процессы в Европе, Азии и мире, влиявшие на эпоху',
  },
  science: {
    label: 'Наука, технологии и медицина',
    shortLabel: 'Наука',
    description: 'Научные открытия, академии, инженерные прорывы и становление медицины',
  },
};

export function classifyEventToEraSphere(
  ev: Pick<EnrichedEvent, 'task' | 'type'>,
  branchById: Map<string, BranchDefinition>,
  branches?: BranchDefinition[],
): EraEventSphereId | null {
  const task = ev.task || '';
  const branch = branchById.get(task);

  if (
    task.startsWith('WAR_') ||
    task === 'SEAS' ||
    task === 'PERIPHERY' ||
    task === 'INTERNAL_BUFFER' ||
    branch?.isMilitary === true
  ) {
    return 'wars';
  }
  if (task === 'DIPLOMACY_TREATIES') {
    return 'diplomacy';
  }
  if (task.startsWith('WORLD_') || branch?.category === 'world') {
    return 'world';
  }
  if (
    task === 'SCIENCE_DISCOVERIES' ||
    task === 'SCIENCE_ALL' ||
    task === 'MEDICINE_HEALTH' ||
    task === 'MEDICINE_ALL' ||
    isScienceDiscoveryNode(ev, branches)
  ) {
    return 'science';
  }
  return task === 'REFORMS_ECO' ? 'reforms' : null;
}

function normalizeEraFigureKey(rawName: string): string {
  const stripped = rawName
    .replace(/\([^)]*\)/g, ' ')
    .replace(/«[^»]*»/g, ' ')
    .replace(/[.,;:!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
  return stripped;
}

function buildSphereEventsAndSummaries(
  historicalEvents: EnrichedEvent[],
  discoveries: EnrichedEvent[],
  branchById: Map<string, BranchDefinition>,
  branches: BranchDefinition[],
): {
  sphereEvents: EnrichedEvent[];
  sphereSummaries: EraEventSphereSummary[];
} {
  const seen = new Set<string>();
  const sphereEvents: EnrichedEvent[] = [];
  for (const ev of historicalEvents) {
    if (!seen.has(ev.id)) {
      seen.add(ev.id);
      sphereEvents.push(ev);
    }
  }
  for (const disc of discoveries) {
    if (!seen.has(disc.id)) {
      seen.add(disc.id);
      sphereEvents.push(disc);
    }
  }

  const eventsBySphere = new Map<EraEventSphereId, EnrichedEvent[]>();
  for (const sphereId of ERA_SPHERE_ORDER) {
    eventsBySphere.set(sphereId, []);
  }
  for (const ev of sphereEvents) {
    const sphereId = classifyEventToEraSphere(ev, branchById, branches);
    if (sphereId) eventsBySphere.get(sphereId)?.push(ev);
  }

  const sphereSummaries: EraEventSphereSummary[] = ERA_SPHERE_ORDER.map((sphereId) => {
    const meta = ERA_SPHERE_META[sphereId];
    const items = [...(eventsBySphere.get(sphereId) || [])].sort(
      (a, b) => a.startYear - b.startYear || a.endYear - b.endYear,
    );
    const topEvents = [...items]
      .sort((a, b) => {
        if (b.explicitLinks.length !== a.explicitLinks.length) {
          return b.explicitLinks.length - a.explicitLinks.length;
        }
        return a.startYear - b.startYear;
      })
      .slice(0, 4);
    const linkCount = items.reduce((sum, ev) => sum + ev.explicitLinks.length, 0);
    return {
      id: sphereId,
      label: meta.label,
      shortLabel: meta.shortLabel,
      description: meta.description,
      events: items,
      topEvents,
      linkCount,
    };
  });

  return { sphereEvents, sphereSummaries };
}

function buildGroupedFigures(params: {
  idPrefix: string;
  allRulers: RulerPeriod[];
  periodRulers: RulerPeriod[];
  contemporaryStatesmen: EnrichedEvent[];
  contemporaryWriters: EnrichedEvent[];
  contemporaryScientists: EnrichedEvent[];
  contemporaryDoctorsAndArchitects: EnrichedEvent[];
  personDossiers?: Map<string, PersonDossier>;
  extraParticipants?: RulerParticipantEntry[];
}): {
  figures: EraFigureEntry[];
  figuresByGroup: Record<EraFigureGroupId, EraFigureEntry[]>;
} {
  const {
    idPrefix,
    allRulers,
    periodRulers,
    contemporaryStatesmen,
    contemporaryWriters,
    contemporaryScientists,
    contemporaryDoctorsAndArchitects,
    personDossiers,
    extraParticipants = [],
  } = params;

  const rulerByNormName = new Map<string, RulerPeriod>();
  for (const r of allRulers) {
    rulerByNormName.set(normalizeEraFigureKey(r.ruler), r);
    rulerByNormName.set(normalizeEraFigureKey(r.shortRuler), r);
  }

  const periodRulerNormNames = new Set<string>();
  const rulerFigures: EraFigureEntry[] = periodRulers.map((r) => {
    periodRulerNormNames.add(normalizeEraFigureKey(r.ruler));
    periodRulerNormNames.add(normalizeEraFigureKey(r.shortRuler));
    const roleParts = [r.dynastyOrTitle, r.center].filter(Boolean);
    return {
      id: `${idPrefix}-ruler-${r.id}`,
      group: 'rulers',
      name: r.ruler,
      period: r.reignPeriod,
      sortYear: r.startYear,
      roleLabel: roleParts.length > 0 ? roleParts.join(' · ') : 'Правитель периода',
      description: r.reignThesis || r.biography || r.reignTitle,
      metaNote: `${Math.max(1, r.endYear - r.startYear)} л.`,
      targetKind: 'ruler',
      targetId: r.id,
    };
  });

  const politicsSeenNames = new Set<string>(periodRulerNormNames);
  const politicsSeenBioIds = new Set<string>();
  const politicsFigures: EraFigureEntry[] = [];

  for (const st of contemporaryStatesmen) {
    const norm = normalizeEraFigureKey(st.title);
    if (norm) politicsSeenNames.add(norm);
    politicsSeenBioIds.add(st.id);
    politicsFigures.push({
      id: `${idPrefix}-statesman-${st.id}`,
      group: 'politics_military',
      name: st.title,
      period: st.period,
      sortYear: st.activeFrom,
      roleLabel: st.type || 'Государственный деятель',
      description: st.subtitle || st.outcome || st.details.slice(0, 180),
      metaNote: st.region || undefined,
      targetKind: 'event',
      targetId: st.id,
      linkCount: st.explicitLinks.length,
    });
  }

  const hasMatchingSeenName = (norm: string, seen: Set<string>): boolean => {
    if (seen.has(norm)) return true;
    const tokens = norm.split(' ').filter((t) => t.length >= 4);
    const lastToken = tokens[tokens.length - 1];
    if (!lastToken) return false;
    for (const existing of seen) {
      if (existing === norm || existing.endsWith(` ${lastToken}`)) {
        return true;
      }
    }
    return false;
  };

  for (const r of periodRulers) {
    if (!r.innerCircle || r.innerCircle.length === 0) continue;
    for (const member of r.innerCircle) {
      const norm = normalizeEraFigureKey(member.name);
      if (!norm || hasMatchingSeenName(norm, politicsSeenNames)) continue;
      politicsSeenNames.add(norm);

      const linkedRuler = rulerByNormName.get(norm) ?? null;
      const resolvedKey =
        !linkedRuler && personDossiers && personDossiers.size > 0
          ? resolvePersonKey(member.name, personDossiers)
          : null;
      const dossier = resolvedKey && personDossiers ? personDossiers.get(resolvedKey) : null;

      politicsFigures.push({
        id: `${idPrefix}-circle-${r.id}-${norm}`,
        group: 'politics_military',
        name: member.name,
        period: r.reignPeriod,
        sortYear: r.startYear,
        roleLabel: member.role,
        description: member.connection,
        metaNote: `При ${r.shortRuler}`,
        targetKind: linkedRuler ? 'ruler' : resolvedKey ? 'person' : 'none',
        targetId: linkedRuler ? linkedRuler.id : resolvedKey ?? undefined,
        linkCount: dossier ? dossier.events.length : undefined,
      });
    }
  }

  const writerFigures: EraFigureEntry[] = [...contemporaryWriters]
    .sort((a, b) => a.activeFrom - b.activeFrom || a.startYear - b.startYear)
    .map((w) => ({
      id: `${idPrefix}-writer-${w.id}`,
      group: 'writers',
      name: w.title,
      period: w.period,
      sortYear: w.activeFrom,
      roleLabel: w.type || 'Писатель и мыслитель',
      description: w.subtitle || w.outcome || w.details.slice(0, 180),
      metaNote: w.literaryProfile?.movement || undefined,
      targetKind: 'event',
      targetId: w.id,
      linkCount: w.explicitLinks.length,
    }));

  const sciSeenIds = new Set<string>();
  const scientistFigures: EraFigureEntry[] = [];
  for (const ev of [...contemporaryScientists, ...contemporaryDoctorsAndArchitects]) {
    if (sciSeenIds.has(ev.id)) continue;
    sciSeenIds.add(ev.id);
    const defaultRole =
      ev.task === 'DOCTORS_BIO'
        ? 'Врач и учёный-медик'
        : ev.task === 'ARCHITECTS_BIO'
          ? 'Зодчий и архитектор'
          : 'Учёный и инженер';
    scientistFigures.push({
      id: `${idPrefix}-sci-${ev.id}`,
      group: 'scientists',
      name: ev.title,
      period: ev.period,
      sortYear: ev.activeFrom,
      roleLabel: ev.type || defaultRole,
      description: ev.subtitle || ev.outcome || ev.details.slice(0, 180),
      metaNote: ev.region || undefined,
      targetKind: 'event',
      targetId: ev.id,
      linkCount: ev.explicitLinks.length,
    });
  }
  scientistFigures.sort((a, b) => a.sortYear - b.sortYear || a.name.localeCompare(b.name, 'ru'));

  // Include notable window/period participants not already covered in writers/scientists/politics
  if (extraParticipants.length > 0) {
    const allCoveredNames = new Set<string>(politicsSeenNames);
    const allCoveredBioIds = new Set<string>(politicsSeenBioIds);
    for (const w of contemporaryWriters) {
      allCoveredBioIds.add(w.id);
      const n = normalizeEraFigureKey(w.title);
      if (n) allCoveredNames.add(n);
    }
    for (const s of [...contemporaryScientists, ...contemporaryDoctorsAndArchitects]) {
      allCoveredBioIds.add(s.id);
      const n = normalizeEraFigureKey(s.title);
      if (n) allCoveredNames.add(n);
    }

    for (const p of extraParticipants) {
      if (p.bioCardId && allCoveredBioIds.has(p.bioCardId)) continue;
      const norm = normalizeEraFigureKey(p.displayName);
      if (!norm || hasMatchingSeenName(norm, allCoveredNames)) continue;
      allCoveredNames.add(norm);

      const dossier = personDossiers?.get(p.personKey) ?? null;
      const bioSubtitle = dossier?.bioCard?.subtitle?.trim();
      const totalSuffix =
        p.totalEventCount > p.reignEventCount ? ` (всего в базе: ${p.totalEventCount})` : '';
      const periodSpan =
        dossier && dossier.yearRange.min !== dossier.yearRange.max
          ? `${dossier.yearRange.min}–${dossier.yearRange.max}`
          : `${p.firstYearInReign}`;

      politicsFigures.push({
        id: `${idPrefix}-part-${p.personKey}`,
        group: 'politics_military',
        name: p.displayName,
        period: periodSpan,
        sortYear: p.firstYearInReign,
        roleLabel: 'Участник событий периода',
        description:
          bioSubtitle ||
          `Упоминается в ${p.reignEventCount} событиях выбранного отрезка${totalSuffix}. Откройте сквозное досье, чтобы увидеть все вехи участия.`,
        metaNote: `Событий: ${p.reignEventCount}`,
        targetKind: 'person',
        targetId: p.personKey,
        linkCount: p.totalEventCount,
      });
    }
  }

  politicsFigures.sort((a, b) => a.sortYear - b.sortYear || a.name.localeCompare(b.name, 'ru'));

  const figuresByGroup: Record<EraFigureGroupId, EraFigureEntry[]> = {
    rulers: rulerFigures,
    politics_military: politicsFigures,
    writers: writerFigures,
    scientists: scientistFigures,
  };

  const figures: EraFigureEntry[] = [
    ...rulerFigures,
    ...politicsFigures,
    ...writerFigures,
    ...scientistFigures,
  ];

  return { figures, figuresByGroup };
}

export interface MacroEraSummaryData {
  era: ResolvedMacroEra;
  eraRulers: RulerPeriod[];
  eraEvents: EnrichedEvent[];
  eraSphereEvents: EnrichedEvent[];
  sphereSummaries: EraEventSphereSummary[];
  eraFigures: EraFigureEntry[];
  eraFiguresByGroup: Record<EraFigureGroupId, EraFigureEntry[]>;
  contemporaryWriters: EnrichedEvent[];
  contemporaryScientists: EnrichedEvent[];
  worksWrittenInPeriod: EnrichedEvent[];
  literaryWorksInPeriod: EnrichedEvent[];
  discoveriesInPeriod: EnrichedEvent[];
  cultureEventsInPeriod: EnrichedEvent[];
  worksAboutPeriod: EnrichedEvent[];
  carryOverInEvents: EnrichedEvent[];
  carryOverOutEvents: EnrichedEvent[];
  branchBreakdown: Array<{ branch: BranchDefinition; count: number }>;
  centers: string[];
  peakInterval: { label: string; count: number } | null;
  topConnectedEvents: EnrichedEvent[];
  totalDurationYears: number;
  totalSyncLinks: number;
}

const macroEraSummaryCache = new WeakMap<
  EnrichedEvent[],
  Map<
    string,
    {
      era: ResolvedMacroEra;
      rulers: RulerPeriod[];
      branches: BranchDefinition[];
      personDossiers?: Map<string, PersonDossier>;
      result: MacroEraSummaryData;
    }
  >
>();

export function getMacroEraSummaryData(
  era: ResolvedMacroEra,
  rulers: RulerPeriod[],
  enrichedEvents: EnrichedEvent[],
  branches: BranchDefinition[],
  personDossiers?: Map<string, PersonDossier>,
): MacroEraSummaryData {
  let byEraId = macroEraSummaryCache.get(enrichedEvents);
  const cached = byEraId?.get(era.id);
  if (
    cached &&
    cached.era === era &&
    cached.rulers === rulers &&
    cached.branches === branches &&
    cached.personDossiers === personDossiers
  ) {
    return cached.result;
  }

  const branchById = new Map<string, BranchDefinition>(branches.map((b) => [b.id, b]));

  const allBelongingEvents = enrichedEvents.filter((ev) =>
    doesIntervalBelongToEra(
      getEventEffectiveStartYear(ev, branches),
      getEventEffectiveEndYear(ev, branches),
      ev.eraId,
      era,
    ),
  );

  const eraEvents = allBelongingEvents.filter((ev) => isHistoricalEventNode(ev, branches));

  const contemporaryWriters = enrichedEvents.filter(
    (ev) =>
      isWriterBioNode(ev, branches) &&
      intersectsTimeWindow(ev.activeFrom, ev.activeTo, era.startYear, era.endYear),
  );

  const contemporaryScientists = enrichedEvents.filter(
    (ev) =>
      isScientistBioNode(ev, branches) &&
      intersectsTimeWindow(ev.activeFrom, ev.activeTo, era.startYear, era.endYear),
  );

  const contemporaryStatesmen = enrichedEvents.filter(
    (ev) =>
      ev.task === 'STATESMEN_BIO' &&
      intersectsTimeWindow(ev.activeFrom, ev.activeTo, era.startYear, era.endYear),
  );

  const contemporaryDoctorsAndArchitects = enrichedEvents.filter(
    (ev) =>
      (ev.task === 'DOCTORS_BIO' || ev.task === 'ARCHITECTS_BIO') &&
      intersectsTimeWindow(ev.activeFrom, ev.activeTo, era.startYear, era.endYear),
  );

  const worksWrittenInPeriod = enrichedEvents.filter(
    (ev) =>
      isLiteraryWorkNode(ev, branches) &&
      intersectsTimeWindow(ev.startYear, ev.endYear, era.startYear, era.endYear),
  );

  const literaryWorksInPeriod = worksWrittenInPeriod.filter(
    (ev) => ev.task !== 'ARCHITECTURE_WORKS',
  );

  const discoveriesInPeriod = enrichedEvents.filter(
    (ev) =>
      isScienceDiscoveryNode(ev, branches) &&
      intersectsTimeWindow(ev.startYear, ev.endYear, era.startYear, era.endYear),
  );

  const cultureEventsInPeriod = allBelongingEvents
    .filter(
      (ev) =>
        ev.task === 'ARTS_CULTURE' ||
        ev.task === 'ARCHITECTURE_WORKS' ||
        ev.task === 'THOUGHT_RELIGION',
    )
    .sort((a, b) => a.startYear - b.startYear || b.explicitLinks.length - a.explicitLinks.length);

  const eraRulers = rulers.filter((r) =>
    doesIntervalBelongToEra(r.startYear, r.endYear, r.eraId, era),
  );
  const eraRulerIds = new Set<string>(eraRulers.map((r) => r.id));
  const historicalEventIdsInEra = new Set<string>(eraEvents.map((ev) => ev.id));

  const allWorkNodes = enrichedEvents.filter((ev) => isLiteraryWorkNode(ev, branches));
  const worksAboutPeriod: EnrichedEvent[] = [];

  allWorkNodes.forEach((work) => {
    const refTags = work.referenceTags || [];
    const matchingLink = work.explicitLinks.find(
      (link) =>
        historicalEventIdsInEra.has(link.targetEvent.id) &&
        (link.direction === 'outgoing' ||
          link.isRetrospective ||
          link.type === 'about_event' ||
          link.type === 'inspired_by' ||
          link.type === 'references'),
    );

    const hasRulerTag = refTags.some((tag) => eraRulerIds.has(tag));
    const hasEraTag = refTags.includes(era.id);

    if (matchingLink || hasRulerTag || hasEraTag) {
      worksAboutPeriod.push(work);
    }
  });

  const carryOverInEvents = eraEvents.filter((ev) => ev.startYear < era.startYear);
  const carryOverOutEvents = eraEvents.filter((ev) => ev.endYear > era.endYear);

  // Unified pool for the 5 historical spheres (eraEvents + science discoveries, deduplicated)
  const { sphereEvents: eraSphereEvents, sphereSummaries } = buildSphereEventsAndSummaries(
    eraEvents,
    discoveriesInPeriod,
    branchById,
    branches,
  );

  // Build 4 role-explained figure groups: rulers, politics_military, writers, scientists
  const { figures: eraFigures, figuresByGroup: eraFiguresByGroup } = buildGroupedFigures({
    idPrefix: 'era-fig',
    allRulers: rulers,
    periodRulers: eraRulers,
    contemporaryStatesmen,
    contemporaryWriters,
    contemporaryScientists,
    contemporaryDoctorsAndArchitects,
    personDossiers,
  });

  const branchCountMap = new Map<string, number>();
  let totalSyncLinks = 0;

  allBelongingEvents.forEach((ev) => {
    const resolvedBranch = resolveEventBranch(ev, branches);
    branchCountMap.set(resolvedBranch.id, (branchCountMap.get(resolvedBranch.id) || 0) + 1);
    totalSyncLinks += ev.explicitLinks.length;
  });

  const branchBreakdown: Array<{ branch: BranchDefinition; count: number }> = [];
  branches.forEach((b) => {
    if (b.isGroup) return;
    const count = branchCountMap.get(b.id) || 0;
    if (count > 0) {
      branchBreakdown.push({ branch: b, count });
    }
  });

  const centers = Array.from(
    new Set(eraRulers.map((r) => r.center).filter((c): c is string => Boolean(c && c.trim()))),
  );

  const bins = computeDensityBins(allBelongingEvents, era.startYear, era.endYear, 12);
  let bestBin: DensityBin | null = null;
  for (const bin of bins) {
    if (!bestBin || bin.totalCount > bestBin.totalCount) {
      bestBin = bin;
    }
  }
  const peakInterval =
    bestBin && bestBin.totalCount > 0
      ? {
          label:
            bestBin.startYear === bestBin.endYear
              ? `${bestBin.startYear} г.`
              : `${bestBin.startYear}–${bestBin.endYear} гг.`,
          count: bestBin.totalCount,
        }
      : null;

  const topConnectedEvents = [...eraSphereEvents]
    .filter((ev) => ev.explicitLinks.length > 0)
    .sort((a, b) => b.explicitLinks.length - a.explicitLinks.length || a.startYear - b.startYear)
    .slice(0, 6);

  const result: MacroEraSummaryData = {
    era,
    eraRulers,
    eraEvents,
    eraSphereEvents,
    sphereSummaries,
    eraFigures,
    eraFiguresByGroup,
    contemporaryWriters,
    contemporaryScientists,
    worksWrittenInPeriod,
    literaryWorksInPeriod,
    discoveriesInPeriod,
    cultureEventsInPeriod,
    worksAboutPeriod,
    carryOverInEvents,
    carryOverOutEvents,
    branchBreakdown,
    centers,
    peakInterval,
    topConnectedEvents,
    totalDurationYears: Math.max(1, era.endYear - era.startYear),
    totalSyncLinks,
  };

  if (!byEraId) {
    byEraId = new Map();
    macroEraSummaryCache.set(enrichedEvents, byEraId);
  }
  byEraId.set(era.id, { era, rulers, branches, personDossiers, result });
  return result;
}

export interface RulerPeriodSummaryData {
  ruler: RulerPeriod;
  reignEvents: EnrichedEvent[];
  contemporaryWriters: EnrichedEvent[];
  contemporaryScientists: EnrichedEvent[];
  worksWrittenInPeriod: EnrichedEvent[];
  discoveriesInPeriod: EnrichedEvent[];
  worksAboutPeriod: EnrichedEvent[];
  startedInReign: EnrichedEvent[];
  inheritedEvents: EnrichedEvent[];
  carryOverEvents: EnrichedEvent[];
  reignParticipants: RulerParticipantEntry[];
  resolvedInnerCircle: ResolvedRulerInnerCircleMember[];
  resolvedKeyActions: ResolvedRulerKeyAction[];
  resolvedFamily: ResolvedRulerRelative[];
  topConnectedEvents: EnrichedEvent[];
  crossBranchLinks: ReignCrossBranchLink[];
  crossBranchPairs: ReignBranchPairSummary[];
}

function translateCrossLinkRole(linkType: string): { roleLabel: string; isDirectional: boolean } {
  switch (linkType) {
    case 'triggers':
    case 'causes':
      return { roleLabel: 'Прямая причина', isDirectional: true };
    case 'enables':
      return { roleLabel: 'Создаёт предпосылку', isDirectional: true };
    case 'consequence':
      return { roleLabel: 'Следствие', isDirectional: true };
    case 'about_event':
    case 'inspired_by':
    case 'references':
      return { roleLabel: 'Отражение и отсылка', isDirectional: true };
    default:
      return { roleLabel: 'Взаимосвязь в эпохе', isDirectional: false };
  }
}

function getLinkTypePriority(linkType: string): number {
  switch (linkType) {
    case 'triggers':
    case 'causes':
      return 5;
    case 'consequence':
      return 4;
    case 'enables':
      return 3;
    case 'about_event':
    case 'inspired_by':
    case 'references':
      return 2;
    default:
      return 1;
  }
}

function buildCrossBranchSummary(
  overlappingAll: EnrichedEvent[],
  branches?: BranchDefinition[],
): {
  crossBranchLinks: ReignCrossBranchLink[];
  crossBranchPairs: ReignBranchPairSummary[];
} {
  const branchMap = new Map((branches || []).map((b) => [b.id, b]));
  const overlappingNodeIds = new Set(overlappingAll.map((ev) => ev.id));
  const bestEdgeByPair = new Map<
    string,
    {
      edge: ReignCrossBranchLink;
      priority: number;
      isOutgoing: boolean;
    }
  >();

  overlappingAll.forEach((ev) => {
    ev.explicitLinks.forEach((lnk) => {
      const target = lnk.targetEvent;
      if (ev.task === target.task) return;

      const isOutgoing = lnk.direction === 'outgoing';
      const fromEvent = isOutgoing ? ev : target;
      const toEvent = isOutgoing ? target : ev;

      const canonicalEdgeKey = [fromEvent.id, toEvent.id].sort().join('__');
      const linkType = lnk.type || 'sync_context';
      const priority = getLinkTypePriority(linkType);

      const existing = bestEdgeByPair.get(canonicalEdgeKey);
      if (
        existing &&
        (existing.priority > priority ||
          (existing.priority === priority && (existing.isOutgoing || !isOutgoing)))
      ) {
        return;
      }

      const [sortedTaskA, sortedTaskB] = [fromEvent.task, toEvent.task].sort();
      const branchA = branchMap.get(sortedTaskA);
      const branchB = branchMap.get(sortedTaskB);
      const pairKey = `${sortedTaskA}__${sortedTaskB}`;
      const { roleLabel, isDirectional } = translateCrossLinkRole(linkType);
      const isHistoricalCircuit =
        isHistoricalEventNode(fromEvent, branches) && isHistoricalEventNode(toEvent, branches);

      bestEdgeByPair.set(canonicalEdgeKey, {
        priority,
        isOutgoing,
        edge: {
          id: canonicalEdgeKey,
          pairKey,
          branchAId: sortedTaskA,
          branchBId: sortedTaskB,
          branchALabel: branchA?.label || sortedTaskA,
          branchBLabel: branchB?.label || sortedTaskB,
          fromEvent,
          toEvent,
          linkType,
          roleLabel,
          isDirectional,
          description: lnk.label,
          isFromInReign: overlappingNodeIds.has(fromEvent.id),
          isToInReign: overlappingNodeIds.has(toEvent.id),
          isHistoricalCircuit,
        },
      });
    });
  });

  const crossBranchLinks = Array.from(bestEdgeByPair.values())
    .map((v) => v.edge)
    .sort((a, b) => {
      if (a.isHistoricalCircuit !== b.isHistoricalCircuit) {
        return a.isHistoricalCircuit ? -1 : 1;
      }
      const aYear = Math.min(a.fromEvent.startYear, a.toEvent.startYear);
      const bYear = Math.min(b.fromEvent.startYear, b.toEvent.startYear);
      if (aYear !== bYear) return aYear - bYear;
      return a.fromEvent.startYear - b.fromEvent.startYear;
    });

  const pairSummaryAcc = new Map<string, ReignBranchPairSummary>();
  crossBranchLinks.forEach((lnk) => {
    const existing = pairSummaryAcc.get(lnk.pairKey);
    if (existing) {
      existing.count += 1;
    } else {
      const bA = branchMap.get(lnk.branchAId);
      const bB = branchMap.get(lnk.branchBId);
      pairSummaryAcc.set(lnk.pairKey, {
        pairKey: lnk.pairKey,
        branchAId: lnk.branchAId,
        branchBId: lnk.branchBId,
        branchALabel: lnk.branchALabel,
        branchBLabel: lnk.branchBLabel,
        colorA: bA?.color || '#38bdf8',
        colorB: bB?.color || '#10b981',
        count: 1,
        isHistoricalCircuit: lnk.isHistoricalCircuit,
      });
    }
  });

  const crossBranchPairs = Array.from(pairSummaryAcc.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.isHistoricalCircuit !== b.isHistoricalCircuit) {
      return a.isHistoricalCircuit ? -1 : 1;
    }
    return a.branchALabel.localeCompare(b.branchALabel, 'ru');
  });

  return { crossBranchLinks, crossBranchPairs };
}

function buildWindowParticipantsRanking(
  events: EnrichedEvent[],
  excludedRulers: RulerPeriod[],
  dossierMap: Map<string, PersonDossier>,
): RulerParticipantEntry[] {
  const rulerNormKeys = new Set<string>();
  excludedRulers.forEach((ruler) => {
    [ruler.ruler, ruler.shortRuler].forEach((rName) => {
      const k = resolvePersonKey(rName, dossierMap);
      if (k) rulerNormKeys.add(k);
      const p = extractPreliminaryPersonKey(rName);
      if (p) rulerNormKeys.add(p.preliminaryKey);
    });
  });

  const participantAcc = new Map<
    string,
    {
      personKey: string;
      displayName: string;
      reignEventIds: Set<string>;
      firstYearInReign: number;
      branchIds: Set<string>;
      totalEventCount: number;
      bioCardId: string | null;
    }
  >();

  events.forEach((ev) => {
    (ev.keyFigures || []).forEach((rawPerson) => {
      const resolvedKey = resolvePersonKey(rawPerson, dossierMap);
      if (!resolvedKey) return;
      if (rulerNormKeys.has(resolvedKey)) return;
      const dossier = dossierMap.get(resolvedKey);
      const existing = participantAcc.get(resolvedKey);
      if (existing) {
        existing.reignEventIds.add(ev.id);
        existing.firstYearInReign = Math.min(existing.firstYearInReign, ev.startYear);
        existing.branchIds.add(ev.task);
      } else {
        participantAcc.set(resolvedKey, {
          personKey: resolvedKey,
          displayName: dossier?.displayName || cleanPersonDisplay(rawPerson),
          reignEventIds: new Set([ev.id]),
          firstYearInReign: ev.startYear,
          branchIds: new Set([ev.task]),
          totalEventCount: dossier?.events.length ?? 1,
          bioCardId: dossier?.bioCard?.id ?? null,
        });
      }
    });
  });

  return Array.from(participantAcc.values())
    .map((entry) => ({
      personKey: entry.personKey,
      displayName: entry.displayName,
      reignEventCount: entry.reignEventIds.size,
      totalEventCount: entry.totalEventCount,
      firstYearInReign: entry.firstYearInReign,
      branchIds: Array.from(entry.branchIds),
      bioCardId: entry.bioCardId,
    }))
    .sort((a, b) => {
      if (b.reignEventCount !== a.reignEventCount) {
        return b.reignEventCount - a.reignEventCount;
      }
      if (b.totalEventCount !== a.totalEventCount) {
        return b.totalEventCount - a.totalEventCount;
      }
      return a.firstYearInReign - b.firstYearInReign;
    });
}

function normalizeRulerLookupName(value: string): string {
  return value
    .replace(/\([^)]*\)/g, ' ')
    .replace(/ё/gi, 'е')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const rulerSummaryCache = new WeakMap<
  EnrichedEvent[],
  Map<
    string,
    {
      ruler: RulerPeriod;
      branches?: BranchDefinition[];
      personDossiers?: Map<string, PersonDossier>;
      allRulers?: RulerPeriod[];
      result: RulerPeriodSummaryData;
    }
  >
>();

export function getRulerPeriodSummaryData(
  ruler: RulerPeriod,
  enrichedEvents: EnrichedEvent[],
  branches?: BranchDefinition[],
  personDossiers?: Map<string, PersonDossier>,
  allRulers?: RulerPeriod[],
): RulerPeriodSummaryData {
  let byRulerId = rulerSummaryCache.get(enrichedEvents);
  const cached = byRulerId?.get(ruler.id);
  if (
    cached &&
    cached.ruler === ruler &&
    cached.branches === branches &&
    cached.personDossiers === personDossiers &&
    cached.allRulers === allRulers
  ) {
    return cached.result;
  }

  const overlappingAll = enrichedEvents.filter((ev) =>
    ev.overlappingRulers.some((or) => or.id === ruler.id),
  );

  const reignEvents = overlappingAll.filter((ev) => isHistoricalEventNode(ev, branches));
  const contemporaryWriters = overlappingAll.filter((ev) => isWriterBioNode(ev, branches));
  const contemporaryScientists = overlappingAll.filter((ev) => isScientistBioNode(ev, branches));
  const worksWrittenInPeriod = overlappingAll.filter((ev) => isLiteraryWorkNode(ev, branches));
  const discoveriesInPeriod = overlappingAll.filter((ev) => isScienceDiscoveryNode(ev, branches));

  const historicalEventIdsInReign = new Set<string>(reignEvents.map((ev) => ev.id));
  const allWorkNodes = enrichedEvents.filter((ev) => isLiteraryWorkNode(ev, branches));
  const worksAboutPeriod: EnrichedEvent[] = [];

  allWorkNodes.forEach((work) => {
    const refTags = work.referenceTags || [];
    const hasRulerTag = refTags.includes(ruler.id);
    const matchingLink = work.explicitLinks.find(
      (link) =>
        historicalEventIdsInReign.has(link.targetEvent.id) &&
        (link.direction === 'outgoing' ||
          link.isRetrospective ||
          link.type === 'about_event' ||
          link.type === 'inspired_by' ||
          link.type === 'references'),
    );

    if (hasRulerTag || matchingLink) {
      worksAboutPeriod.push(work);
    }
  });

  const startedInReign = reignEvents.filter(
    (ev) => ev.startYear >= ruler.startYear && ev.startYear <= ruler.endYear,
  );
  const inheritedEvents = reignEvents.filter((ev) => ev.startYear < ruler.startYear);
  const carryOverEvents = reignEvents.filter((ev) => ev.endYear > ruler.endYear);

  const rulersCatalog = allRulers && allRulers.length > 0 ? allRulers : [ruler];
  const rulerById = new Map<string, RulerPeriod>(rulersCatalog.map((r) => [r.id, r]));
  const rulerByNormName = new Map<string, RulerPeriod>();
  rulersCatalog.forEach((r) => {
    if (r.id === ruler.id) return;
    const normFull = normalizeRulerLookupName(r.ruler);
    const normShort = normalizeRulerLookupName(r.shortRuler);
    if (normFull && !rulerByNormName.has(normFull)) rulerByNormName.set(normFull, r);
    if (normShort && !rulerByNormName.has(normShort)) rulerByNormName.set(normShort, r);
  });

  const dossierMap = personDossiers ?? buildPersonDossierIndex(enrichedEvents, rulersCatalog).dossiers;
  const reignParticipants = buildWindowParticipantsRanking(reignEvents, [ruler], dossierMap);
  const participantByKey = new Map(reignParticipants.map((p) => [p.personKey, p]));
  const eventById = new Map(enrichedEvents.map((ev) => [ev.id, ev]));

  const currentRulerNormKeys = new Set<string>();
  [ruler.ruler, ruler.shortRuler].forEach((rName) => {
    const k = resolvePersonKey(rName, dossierMap);
    if (k) currentRulerNormKeys.add(k);
  });

  const resolvedInnerCircle: ResolvedRulerInnerCircleMember[] = (ruler.innerCircle || []).map(
    (member) => {
      const matchedRuler = rulerByNormName.get(normalizeRulerLookupName(member.name)) ?? null;
      let candidateKey = resolvePersonKey(member.name, dossierMap);
      let dossier = candidateKey ? dossierMap.get(candidateKey) ?? null : null;
      if (!dossier) {
        const fragments = member.name
          .split(/\s+и\s+|,\s+/)
          .map((part) => part.trim())
          .filter(Boolean);
        for (const fragment of fragments) {
          const fragKey = resolvePersonKey(fragment, dossierMap);
          const fragDossier = fragKey ? dossierMap.get(fragKey) ?? null : null;
          if (fragDossier) {
            candidateKey = fragKey;
            dossier = fragDossier;
            break;
          }
        }
      }
      const participant = candidateKey ? participantByKey.get(candidateKey) ?? null : null;
      return {
        ...member,
        personKey: dossier ? dossier.key : null,
        linkedRulerId: matchedRuler?.id ?? null,
        linkedRulerPeriod: matchedRuler?.reignPeriod ?? null,
        reignEventCount: participant?.reignEventCount ?? 0,
        totalEventCount: dossier?.events.length ?? 0,
      };
    },
  );

  const resolvedKeyActions: ResolvedRulerKeyAction[] = (ruler.keyActions || []).map((action) => ({
    ...action,
    linkedEvent: action.eventId ? (eventById.get(action.eventId) ?? null) : null,
  }));

  const resolvedFamily: ResolvedRulerRelative[] = (ruler.family || []).map((rel, idx) => {
    const linkedRuler =
      rel.rulerId && rel.rulerId !== ruler.id ? (rulerById.get(rel.rulerId) ?? null) : null;

    let resolvedPersonKey: string | null = null;
    let personEventCount = 0;

    if (!linkedRuler) {
      const explicitKey = rel.personKey
        ? resolvePersonKey(rel.personKey, dossierMap) || rel.personKey
        : null;
      const inferredKey = explicitKey || resolvePersonKey(rel.name, dossierMap);
      if (inferredKey && !currentRulerNormKeys.has(inferredKey)) {
        const dossier = dossierMap.get(inferredKey);
        if (dossier) {
          resolvedPersonKey = dossier.key;
          personEventCount = dossier.events.length;
        }
      }
    }

    const targetKind: ResolvedRulerRelative['targetKind'] = linkedRuler
      ? 'ruler'
      : resolvedPersonKey
        ? 'person'
        : 'mini_card';

    return {
      ...rel,
      id: `${ruler.id}-rel-${rel.group}-${idx}`,
      targetKind,
      linkedRuler,
      resolvedPersonKey,
      personEventCount,
    };
  });

  const topConnectedEvents = [...reignEvents]
    .filter((ev) => ev.explicitLinks.length > 0)
    .sort((a, b) => {
      if (b.explicitLinks.length !== a.explicitLinks.length) {
        return b.explicitLinks.length - a.explicitLinks.length;
      }
      const aCross = a.explicitLinks.filter((l) => l.targetEvent.task !== a.task).length;
      const bCross = b.explicitLinks.filter((l) => l.targetEvent.task !== b.task).length;
      if (bCross !== aCross) return bCross - aCross;
      return a.startYear - b.startYear;
    })
    .slice(0, 6);

  const { crossBranchLinks, crossBranchPairs } = buildCrossBranchSummary(overlappingAll, branches);

  const result: RulerPeriodSummaryData = {
    ruler,
    reignEvents,
    contemporaryWriters,
    contemporaryScientists,
    worksWrittenInPeriod,
    discoveriesInPeriod,
    worksAboutPeriod,
    startedInReign,
    inheritedEvents,
    carryOverEvents,
    reignParticipants,
    resolvedInnerCircle,
    resolvedKeyActions,
    resolvedFamily,
    topConnectedEvents,
    crossBranchLinks,
    crossBranchPairs,
  };

  if (!byRulerId) {
    byRulerId = new Map();
    rulerSummaryCache.set(enrichedEvents, byRulerId);
  }
  byRulerId.set(ruler.id, { ruler, branches, personDossiers, allRulers, result });
  return result;
}

export interface CustomWindowSummaryData {
  yearFrom: number;
  yearTo: number;
  totalDurationYears: number;
  overlappingEras: ResolvedMacroEra[];
  overlappingRulers: RulerPeriod[];
  windowEvents: EnrichedEvent[];
  windowSphereEvents: EnrichedEvent[];
  sphereSummaries: EraEventSphereSummary[];
  windowFigures: EraFigureEntry[];
  windowFiguresByGroup: Record<EraFigureGroupId, EraFigureEntry[]>;
  contemporaryWriters: EnrichedEvent[];
  contemporaryScientists: EnrichedEvent[];
  worksWrittenInPeriod: EnrichedEvent[];
  literaryWorksInPeriod: EnrichedEvent[];
  discoveriesInPeriod: EnrichedEvent[];
  cultureEventsInPeriod: EnrichedEvent[];
  worksAboutPeriod: EnrichedEvent[];
  startedInWindow: EnrichedEvent[];
  carryOverInEvents: EnrichedEvent[];
  carryOverOutEvents: EnrichedEvent[];
  branchBreakdown: Array<{ branch: BranchDefinition; count: number; isHiddenOnTimeline: boolean }>;
  hiddenActiveBranches: BranchDefinition[];
  centers: string[];
  peakInterval: { label: string; count: number } | null;
  topConnectedEvents: EnrichedEvent[];
  crossBranchLinks: ReignCrossBranchLink[];
  crossBranchPairs: ReignBranchPairSummary[];
  windowParticipants: RulerParticipantEntry[];
  totalUniqueLinks: number;
}

const customWindowSummaryCache = new WeakMap<
  EnrichedEvent[],
  Map<
    string,
    {
      rulers: RulerPeriod[];
      branches: BranchDefinition[];
      eras: MacroEra[];
      personDossiers?: Map<string, PersonDossier>;
      activeBranches?: Record<string, boolean>;
      result: CustomWindowSummaryData;
    }
  >
>();

export function getCustomWindowSummaryData(
  rawYearFrom: number,
  rawYearTo: number,
  rulers: RulerPeriod[],
  enrichedEvents: EnrichedEvent[],
  branches: BranchDefinition[],
  eras: MacroEra[] = [],
  personDossiers?: Map<string, PersonDossier>,
  activeBranches?: Record<string, boolean>,
): CustomWindowSummaryData {
  const yearFrom = Math.min(rawYearFrom, rawYearTo);
  const yearTo = Math.max(rawYearFrom, rawYearTo);
  const windowCacheKey = `${yearFrom}-${yearTo}`;
  let byWindowKey = customWindowSummaryCache.get(enrichedEvents);
  const cached = byWindowKey?.get(windowCacheKey);
  if (
    cached &&
    cached.rulers === rulers &&
    cached.branches === branches &&
    cached.eras === eras &&
    cached.personDossiers === personDossiers &&
    cached.activeBranches === activeBranches
  ) {
    return cached.result;
  }

  const branchById = new Map<string, BranchDefinition>(branches.map((b) => [b.id, b]));

  const overlappingAll = enrichedEvents.filter((ev) =>
    intersectsTimeWindow(
      getEventEffectiveStartYear(ev, branches),
      getEventEffectiveEndYear(ev, branches),
      yearFrom,
      yearTo,
    ),
  );

  const windowEvents = overlappingAll.filter((ev) => isHistoricalEventNode(ev, branches));
  const contemporaryWriters = overlappingAll.filter((ev) => isWriterBioNode(ev, branches));
  const contemporaryScientists = overlappingAll.filter((ev) => isScientistBioNode(ev, branches));
  const contemporaryStatesmen = overlappingAll.filter((ev) => ev.task === 'STATESMEN_BIO');
  const contemporaryDoctorsAndArchitects = overlappingAll.filter(
    (ev) => ev.task === 'DOCTORS_BIO' || ev.task === 'ARCHITECTS_BIO',
  );
  const worksWrittenInPeriod = overlappingAll.filter((ev) => isLiteraryWorkNode(ev, branches));
  const literaryWorksInPeriod = worksWrittenInPeriod.filter(
    (ev) => ev.task !== 'ARCHITECTURE_WORKS',
  );
  const discoveriesInPeriod = overlappingAll.filter((ev) => isScienceDiscoveryNode(ev, branches));
  const cultureEventsInPeriod = overlappingAll
    .filter(
      (ev) =>
        ev.task === 'ARTS_CULTURE' ||
        ev.task === 'ARCHITECTURE_WORKS' ||
        ev.task === 'THOUGHT_RELIGION',
    )
    .sort((a, b) => a.startYear - b.startYear || b.explicitLinks.length - a.explicitLinks.length);

  const overlappingRulers = rulers.filter((r) =>
    intersectsTimeWindow(r.startYear, r.endYear, yearFrom, yearTo),
  );
  const overlappingEras = resolveMacroEras(eras).filter((era) =>
    intersectsTimeWindow(era.startYear, era.endYear, yearFrom, yearTo),
  );

  const rulerIds = new Set(overlappingRulers.map((r) => r.id));
  const historicalIdsInWindow = new Set(windowEvents.map((ev) => ev.id));
  const allWorkNodes = enrichedEvents.filter((ev) => isLiteraryWorkNode(ev, branches));
  const worksAboutPeriod: EnrichedEvent[] = [];

  allWorkNodes.forEach((work) => {
    const refTags = work.referenceTags || [];
    const hasRulerTag = refTags.some((tag) => rulerIds.has(tag));
    const matchingLink = work.explicitLinks.find(
      (link) =>
        historicalIdsInWindow.has(link.targetEvent.id) &&
        (link.direction === 'outgoing' ||
          link.isRetrospective ||
          link.type === 'about_event' ||
          link.type === 'inspired_by' ||
          link.type === 'references'),
    );

    if (matchingLink || hasRulerTag) {
      worksAboutPeriod.push(work);
    }
  });

  const startedInWindow = windowEvents.filter(
    (ev) => ev.startYear >= yearFrom && ev.startYear <= yearTo,
  );
  const carryOverInEvents = windowEvents.filter((ev) => ev.startYear < yearFrom);
  const carryOverOutEvents = windowEvents.filter((ev) => ev.endYear > yearTo);

  const branchCountMap = new Map<string, number>();
  const uniqueLinkIds = new Set<string>();

  overlappingAll.forEach((ev) => {
    const resolvedBranch = resolveEventBranch(ev, branches);
    branchCountMap.set(resolvedBranch.id, (branchCountMap.get(resolvedBranch.id) || 0) + 1);
    ev.explicitLinks.forEach((lnk) => uniqueLinkIds.add(lnk.id));
  });

  const branchBreakdown: Array<{
    branch: BranchDefinition;
    count: number;
    isHiddenOnTimeline: boolean;
  }> = [];
  const hiddenActiveBranches: BranchDefinition[] = [];

  branches.forEach((b) => {
    if (b.isGroup || b.isTimeAxis) return;
    const count = branchCountMap.get(b.id) || 0;
    if (count > 0) {
      const isHidden = activeBranches ? activeBranches[b.id] === false : false;
      branchBreakdown.push({ branch: b, count, isHiddenOnTimeline: isHidden });
      if (isHidden) {
        hiddenActiveBranches.push(b);
      }
    }
  });

  const centers = Array.from(
    new Set(
      overlappingRulers.map((r) => r.center).filter((c): c is string => Boolean(c && c.trim())),
    ),
  );

  const bins = computeDensityBins(overlappingAll, yearFrom, yearTo, 12);
  let bestBin: DensityBin | null = null;
  for (const bin of bins) {
    if (!bestBin || bin.totalCount > bestBin.totalCount) {
      bestBin = bin;
    }
  }
  const peakInterval =
    bestBin && bestBin.totalCount > 0
      ? {
          label:
            bestBin.startYear === bestBin.endYear
              ? `${bestBin.startYear} г.`
              : `${bestBin.startYear}–${bestBin.endYear} гг.`,
          count: bestBin.totalCount,
        }
      : null;

  const { sphereEvents: windowSphereEvents, sphereSummaries } = buildSphereEventsAndSummaries(
    windowEvents,
    discoveriesInPeriod,
    branchById,
    branches,
  );

  const topConnectedEvents = [...windowSphereEvents]
    .filter((ev) => ev.explicitLinks.length > 0)
    .sort((a, b) => {
      if (b.explicitLinks.length !== a.explicitLinks.length) {
        return b.explicitLinks.length - a.explicitLinks.length;
      }
      const aCross = a.explicitLinks.filter((l) => l.targetEvent.task !== a.task).length;
      const bCross = b.explicitLinks.filter((l) => l.targetEvent.task !== b.task).length;
      if (bCross !== aCross) return bCross - aCross;
      return a.startYear - b.startYear;
    })
    .slice(0, 6);

  const { crossBranchLinks, crossBranchPairs } = buildCrossBranchSummary(overlappingAll, branches);
  const dossierMap =
    personDossiers ?? buildPersonDossierIndex(enrichedEvents, overlappingRulers).dossiers;
  const windowParticipants = buildWindowParticipantsRanking(
    windowEvents,
    overlappingRulers,
    dossierMap,
  );

  const { figures: windowFigures, figuresByGroup: windowFiguresByGroup } = buildGroupedFigures({
    idPrefix: 'win-fig',
    allRulers: rulers,
    periodRulers: overlappingRulers,
    contemporaryStatesmen,
    contemporaryWriters,
    contemporaryScientists,
    contemporaryDoctorsAndArchitects,
    personDossiers: dossierMap,
    extraParticipants: windowParticipants,
  });

  const result: CustomWindowSummaryData = {
    yearFrom,
    yearTo,
    totalDurationYears: Math.max(1, yearTo - yearFrom),
    overlappingEras,
    overlappingRulers,
    windowEvents,
    windowSphereEvents,
    sphereSummaries,
    windowFigures,
    windowFiguresByGroup,
    contemporaryWriters,
    contemporaryScientists,
    worksWrittenInPeriod,
    literaryWorksInPeriod,
    discoveriesInPeriod,
    cultureEventsInPeriod,
    worksAboutPeriod,
    startedInWindow,
    carryOverInEvents,
    carryOverOutEvents,
    branchBreakdown,
    hiddenActiveBranches,
    centers,
    peakInterval,
    topConnectedEvents,
    crossBranchLinks,
    crossBranchPairs,
    windowParticipants,
    totalUniqueLinks: uniqueLinkIds.size,
  };

  if (!byWindowKey) {
    byWindowKey = new Map();
    customWindowSummaryCache.set(enrichedEvents, byWindowKey);
  }
  byWindowKey.set(windowCacheKey, {
    rulers,
    branches,
    eras,
    personDossiers,
    activeBranches,
    result,
  });
  return result;
}

export function getWindowLinksVisibilitySummary(
  matchingEvents: EnrichedEvent[],
  activeBranches: Record<string, boolean>,
  branches: BranchDefinition[],
): WindowLinksVisibilitySummary {
  const branchMap = new Map(branches.map((b) => [b.id, b]));
  const visibleLinkIds = new Set<string>();
  const hiddenLinkIds = new Set<string>();

  const hiddenAcc = new Map<
    string,
    {
      branchId: string;
      branchLabel: string;
      color: string;
      linkIds: Set<string>;
      targetEventIds: Set<string>;
      sampleTitles: string[];
    }
  >();

  matchingEvents.forEach((ev) => {
    ev.explicitLinks.forEach((lnk) => {
      const target = lnk.targetEvent;
      const isTargetBranchHidden = activeBranches[target.task] === false;

      if (isTargetBranchHidden) {
        hiddenLinkIds.add(lnk.id);
        const branchMeta = branchMap.get(target.task);
        const existing = hiddenAcc.get(target.task);
        if (existing) {
          existing.linkIds.add(lnk.id);
          if (!existing.targetEventIds.has(target.id)) {
            existing.targetEventIds.add(target.id);
            if (existing.sampleTitles.length < 3) {
              existing.sampleTitles.push(`${target.period} · ${target.title}`);
            }
          }
        } else {
          hiddenAcc.set(target.task, {
            branchId: target.task,
            branchLabel: branchMeta?.label || target.task,
            color: branchMeta?.color || '#94a3b8',
            linkIds: new Set([lnk.id]),
            targetEventIds: new Set([target.id]),
            sampleTitles: [`${target.period} · ${target.title}`],
          });
        }
      } else {
        visibleLinkIds.add(lnk.id);
      }
    });
  });

  const hiddenGroups: HiddenBranchLinkGroup[] = Array.from(hiddenAcc.values())
    .map((g) => ({
      branchId: g.branchId,
      branchLabel: g.branchLabel,
      color: g.color,
      hiddenLinkCount: g.linkIds.size,
      hiddenEventCount: g.targetEventIds.size,
      sampleTargetTitles: g.sampleTitles,
    }))
    .sort((a, b) => {
      if (b.hiddenLinkCount !== a.hiddenLinkCount) {
        return b.hiddenLinkCount - a.hiddenLinkCount;
      }
      return a.branchLabel.localeCompare(b.branchLabel, 'ru');
    });

  return {
    visibleLinksCount: visibleLinkIds.size,
    totalWindowLinksCount: visibleLinkIds.size + hiddenLinkIds.size,
    hiddenLinksCount: hiddenLinkIds.size,
    hiddenGroups,
  };
}

function buildComparisonSide(
  target: ComparisonTarget,
  rulers: RulerPeriod[],
  enrichedEvents: EnrichedEvent[],
  branches: BranchDefinition[],
  eras: MacroEra[],
  personDossiers?: Map<string, PersonDossier>,
): ComparisonSideSummary | null {
  const resolvedEras = resolveMacroEras(eras);

  let kindLabel = '';
  let title = '';
  let subtitle = '';
  let yearFrom = 862;
  let yearTo = 2000;
  let overlappingAll: EnrichedEvent[] = [];
  let periodRulers: RulerPeriod[] = [];
  let worksAboutPeriodCount = 0;
  let carryOverInCount = 0;
  let carryOverOutCount = 0;
  let startedInPeriodCount = 0;
  let peakInterval: { label: string; count: number } | null = null;
  let topConnectedEvents: EnrichedEvent[] = [];
  let crossBranchPairs: ReignBranchPairSummary[] = [];
  let crossBranchLinksCount = 0;
  let participants: RulerParticipantEntry[] = [];
  let centers: string[] = [];

  if (target.kind === 'ruler') {
    const ruler = rulers.find((r) => r.id === target.rulerId);
    if (!ruler) return null;
    const summary = getRulerPeriodSummaryData(ruler, enrichedEvents, branches, personDossiers);
    kindLabel = 'Правление';
    title = ruler.ruler;
    subtitle = `${ruler.reignPeriod}${ruler.center ? ` · ${ruler.center}` : ''} — ${ruler.reignTitle}`;
    yearFrom = ruler.startYear;
    yearTo = ruler.endYear;
    overlappingAll = enrichedEvents.filter((ev) =>
      ev.overlappingRulers.some((or) => or.id === ruler.id),
    );
    periodRulers = [ruler];
    worksAboutPeriodCount = summary.worksAboutPeriod.length;
    carryOverInCount = summary.inheritedEvents.length;
    carryOverOutCount = summary.carryOverEvents.length;
    startedInPeriodCount = summary.startedInReign.length;
    topConnectedEvents = summary.topConnectedEvents;
    crossBranchPairs = summary.crossBranchPairs;
    crossBranchLinksCount = summary.crossBranchLinks.length;
    participants = summary.reignParticipants;
    centers = ruler.center ? [ruler.center] : [];

    const bins = computeDensityBins(overlappingAll, yearFrom, yearTo, 10);
    let bestBin: DensityBin | null = null;
    for (const bin of bins) {
      if (!bestBin || bin.totalCount > bestBin.totalCount) bestBin = bin;
    }
    if (bestBin && bestBin.totalCount > 0) {
      peakInterval = {
        label:
          bestBin.startYear === bestBin.endYear
            ? `${bestBin.startYear} г.`
            : `${bestBin.startYear}–${bestBin.endYear} гг.`,
        count: bestBin.totalCount,
      };
    }
  } else if (target.kind === 'era') {
    const era = resolvedEras.find((e) => e.id === target.eraId);
    if (!era) return null;
    const summary = getMacroEraSummaryData(era, rulers, enrichedEvents, branches);
    kindLabel = 'Макро-эпоха';
    title = era.displayShortTitle;
    subtitle = `${era.period} — ${era.title}`;
    yearFrom = era.startYear;
    yearTo = era.endYear;
    overlappingAll = enrichedEvents.filter((ev) =>
      doesIntervalBelongToEra(ev.startYear, ev.endYear, ev.eraId, era),
    );
    periodRulers = summary.eraRulers;
    worksAboutPeriodCount = summary.worksAboutPeriod.length;
    carryOverInCount = summary.carryOverInEvents.length;
    carryOverOutCount = summary.carryOverOutEvents.length;
    startedInPeriodCount = summary.eraEvents.filter(
      (ev) => ev.startYear >= era.startYear && ev.startYear <= era.endYear,
    ).length;
    peakInterval = summary.peakInterval;
    topConnectedEvents = summary.topConnectedEvents;
    const crossSummary = buildCrossBranchSummary(overlappingAll, branches);
    crossBranchPairs = crossSummary.crossBranchPairs;
    crossBranchLinksCount = crossSummary.crossBranchLinks.length;
    const dossierMap =
      personDossiers ?? buildPersonDossierIndex(enrichedEvents, periodRulers).dossiers;
    participants = buildWindowParticipantsRanking(summary.eraEvents, periodRulers, dossierMap);
    centers = summary.centers;
  } else {
    const summary = getCustomWindowSummaryData(
      target.from,
      target.to,
      rulers,
      enrichedEvents,
      branches,
      eras,
      personDossiers,
    );
    kindLabel = 'Окно лет';
    title = target.label || `Срез ${summary.yearFrom}–${summary.yearTo} гг.`;
    subtitle =
      summary.overlappingRulers.length > 0
        ? `${summary.yearFrom}–${summary.yearTo} гг. · правлений: ${summary.overlappingRulers.length}`
        : `${summary.yearFrom}–${summary.yearTo} гг.`;
    yearFrom = summary.yearFrom;
    yearTo = summary.yearTo;
    overlappingAll = enrichedEvents.filter((ev) =>
      intersectsTimeWindow(ev.startYear, ev.endYear, yearFrom, yearTo),
    );
    periodRulers = summary.overlappingRulers;
    worksAboutPeriodCount = summary.worksAboutPeriod.length;
    carryOverInCount = summary.carryOverInEvents.length;
    carryOverOutCount = summary.carryOverOutEvents.length;
    startedInPeriodCount = summary.startedInWindow.length;
    peakInterval = summary.peakInterval;
    topConnectedEvents = summary.topConnectedEvents;
    crossBranchPairs = summary.crossBranchPairs;
    crossBranchLinksCount = summary.crossBranchLinks.length;
    participants = summary.windowParticipants;
    centers = summary.centers;
  }

  const historicalEvents = overlappingAll.filter((ev) => isHistoricalEventNode(ev, branches));

  const uniqueLinks = new Map<string, ExplicitLinkInfo>();
  overlappingAll.forEach((ev) => {
    ev.explicitLinks.forEach((lnk) => {
      const canonicalKey =
        lnk.id || [ev.id, lnk.targetEvent.id].sort().join('__') + '|' + lnk.type;
      if (!uniqueLinks.has(canonicalKey)) {
        uniqueLinks.set(canonicalKey, lnk);
      }
    });
  });

  let causalLinksCount = 0;
  let retrospectiveLinksCount = 0;
  let syncLinksCount = 0;
  uniqueLinks.forEach((lnk) => {
    const cat = classifyExplicitLinkCategory(lnk);
    if (cat === 'causal') causalLinksCount += 1;
    else if (cat === 'retrospective') retrospectiveLinksCount += 1;
    else syncLinksCount += 1;
  });

  const branchCountMap = new Map<string, number>();
  overlappingAll.forEach((ev) => {
    const resolvedBranch = resolveEventBranch(ev, branches);
    branchCountMap.set(resolvedBranch.id, (branchCountMap.get(resolvedBranch.id) || 0) + 1);
  });

  const totalNodesCount = overlappingAll.length;
  const branchBreakdown: Array<{ branch: BranchDefinition; count: number; sharePct: number }> = [];
  branches.forEach((b) => {
    if (b.isGroup || b.isTimeAxis) return;
    const count = branchCountMap.get(b.id) || 0;
    if (count > 0) {
      branchBreakdown.push({
        branch: b,
        count,
        sharePct: totalNodesCount > 0 ? Math.round((count / totalNodesCount) * 100) : 0,
      });
    }
  });
  branchBreakdown.sort((a, b) => b.count - a.count);

  const byId = new Map(enrichedEvents.map((e) => [e.id, e]));
  const rulerLabelByTag = new Map<string, string>();
  rulers.forEach((r) => rulerLabelByTag.set(r.id.toLowerCase(), r.shortRuler));
  const eraLabelByTag = new Map<string, string>();
  resolvedEras.forEach((era) => {
    const rawKey = era.id.toLowerCase();
    eraLabelByTag.set(rawKey, era.displayShortTitle);
    eraLabelByTag.set(rawKey.replace(/_/g, '-'), era.displayShortTitle);
  });

  const tagCounts = new Map<string, number>();
  overlappingAll.forEach((ev) => {
    const rawTags = [
      ...(ev.syncTags || []),
      ...(ev.campaignId ? [ev.campaignId] : []),
    ];
    new Set(rawTags.map((t) => t.trim().toLowerCase()).filter(Boolean)).forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  const syncTags = Array.from(tagCounts.entries())
    .map(([tag, count]) => {
      const rawLabel = resolveSyncTagHumanLabel(tag, {
        byId,
        rulerLabelByTag,
        eraLabelByTag,
      });
      return {
        tag,
        label: rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1),
        count,
      };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru'));

  const branchById = new Map(branches.map((b) => [b.id, b]));
  const sideDiscoveries = overlappingAll.filter((ev) => isScienceDiscoveryNode(ev, branches));
  const { sphereSummaries: sideSphereSummaries, sphereEvents } = buildSphereEventsAndSummaries(
    historicalEvents,
    sideDiscoveries,
    branchById,
    branches,
  );
  const sphereCounts: Record<EraEventSphereId, number> = {
    wars: 0,
    reforms: 0,
    diplomacy: 0,
    world: 0,
    science: 0,
  };
  for (const sp of sideSphereSummaries) {
    sphereCounts[sp.id] = sp.events.length;
  }

  return {
    target,
    kindLabel,
    title,
    subtitle,
    yearFrom,
    yearTo,
    durationYears: Math.max(1, yearTo - yearFrom),
    historicalEventsCount: historicalEvents.length,
    totalNodesCount,
    startedInPeriodCount,
    carryOverInCount,
    carryOverOutCount,
    rulersCount: periodRulers.length,
    rulersList: periodRulers,
    centers,
    peakInterval,
    totalUniqueLinks: uniqueLinks.size,
    causalLinksCount,
    retrospectiveLinksCount,
    syncLinksCount,
    crossBranchLinksCount,
    worksAboutPeriodCount,
    branchBreakdown,
    sphereCounts,
    unclassifiedSphereEventsCount: sphereEvents.length - sideSphereSummaries.reduce((sum, sphere) => sum + sphere.events.length, 0),
    crossBranchPairs,
    topConnectedEvents,
    syncTags,
    participants,
  };
}

export function computePeriodComparison(
  leftTarget: ComparisonTarget,
  rightTarget: ComparisonTarget,
  rulers: RulerPeriod[],
  enrichedEvents: EnrichedEvent[],
  branches: BranchDefinition[],
  eras: MacroEra[],
  personDossiers?: Map<string, PersonDossier>,
): PeriodComparisonReport | null {
  const left = buildComparisonSide(leftTarget, rulers, enrichedEvents, branches, eras, personDossiers);
  const right = buildComparisonSide(rightTarget, rulers, enrichedEvents, branches, eras, personDossiers);
  if (!left || !right) return null;

  const rightPairsByKey = new Map(right.crossBranchPairs.map((p) => [p.pairKey, p]));
  const sharedBranchPairs: ComparisonPatternMatch[] = [];
  left.crossBranchPairs.forEach((lp) => {
    const rp = rightPairsByKey.get(lp.pairKey);
    if (rp) {
      sharedBranchPairs.push({
        pairKey: lp.pairKey,
        branchALabel: lp.branchALabel,
        branchBLabel: lp.branchBLabel,
        colorA: lp.colorA,
        colorB: lp.colorB,
        countLeft: lp.count,
        countRight: rp.count,
        isHistoricalCircuit: lp.isHistoricalCircuit,
      });
    }
  });
  sharedBranchPairs.sort(
    (a, b) => b.countLeft + b.countRight - (a.countLeft + a.countRight),
  );

  const rightTagMap = new Map(right.syncTags.map((t) => [t.tag, t]));
  const sharedSyncTags: Array<{ tag: string; label: string; countLeft: number; countRight: number }> = [];
  left.syncTags.forEach((lt) => {
    const rt = rightTagMap.get(lt.tag);
    if (rt) {
      sharedSyncTags.push({
        tag: lt.tag,
        label: lt.label,
        countLeft: lt.count,
        countRight: rt.count,
      });
    }
  });
  sharedSyncTags.sort((a, b) => b.countLeft + b.countRight - (a.countLeft + a.countRight));

  const rightPartMap = new Map(right.participants.map((p) => [p.personKey, p]));
  const sharedParticipants: Array<{
    personKey: string;
    displayName: string;
    countLeft: number;
    countRight: number;
  }> = [];
  left.participants.forEach((lp) => {
    const rp = rightPartMap.get(lp.personKey);
    if (rp) {
      sharedParticipants.push({
        personKey: lp.personKey,
        displayName: lp.displayName,
        countLeft: lp.reignEventCount,
        countRight: rp.reignEventCount,
      });
    }
  });
  sharedParticipants.sort(
    (a, b) => b.countLeft + b.countRight - (a.countLeft + a.countRight),
  );

  return {
    left,
    right,
    sharedBranchPairs,
    sharedSyncTags,
    sharedParticipants,
    deltas: {
      events: left.historicalEventsCount - right.historicalEventsCount,
      links: left.totalUniqueLinks - right.totalUniqueLinks,
      causalLinks: left.causalLinksCount - right.causalLinksCount,
      retrospectiveLinks: left.retrospectiveLinksCount - right.retrospectiveLinksCount,
      durationYears: left.durationYears - right.durationYears,
    },
  };
}
