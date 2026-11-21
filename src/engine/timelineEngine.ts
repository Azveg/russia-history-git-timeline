import type {
  AuditCandidateInfo,
  AxisResolution,
  BranchDefinition,
  CrossLink,
  EnrichedEvent,
  ExplicitLinkInfo,
  FilterState,
  FocusDepth,
  RetrospectiveLinkInfo,
  RulerPeriod,
  StreamRow,
  SyncLinkTypeFilter,
  SyncManifest,
  TimelineDataFile,
} from '../types/timeline';
import {
  computeTimelineYearBounds,
  computeUnlinkedAuditMap,
  doesLinkMatchTypeFilter,
  resolveSyncTagHumanLabel,
} from './analytics/periodAnalytics';
import {
  MONTHS_SHORT_RU,
  detectAxisResolution,
  doesIntervalBelongToEra,
  findMacroEraForYear,
  formatDateForResolution,
  isAtomicEventNode,
  isBiographyNode,
  isLiteraryWorkNode,
  isScienceDiscoveryNode,
  parseEventYears,
  parsePreciseDate,
  resolveMacroEras,
} from './calendar/jdnCalendar';
import {
  RULER_ALT_COLORS,
  computeRulerSubLaneLayout,
  getEventEffectiveEndYear,
  getEventEffectiveStartPrecision,
  getEventEffectiveStartYear,
  intersectsTimeWindow,
  isEventBranchActive,
} from './layout/subLaneLayout';
import { doesRawMatchPersonKey, extractPreliminaryPersonKey } from './nlp/personExtractor';
import { doesEventMatchMacroRegion } from './regionFilter';
import {
  collectBranchesFromDataFile,
  isBranchFile,
  isPlainRecord,
  sanitizeTimelineNode,
} from './repository/timelineRepository';

// ============================================================================
// Фасадный реэкспорт доменных модулей движка хронографа
// ============================================================================
export * from './calendar/jdnCalendar';
export * from './nlp/personExtractor';
export * from './repository/timelineRepository';
export * from './layout/subLaneLayout';
export * from './analytics/periodAnalytics';
export * from './regionFilter';

export function getEnrichedEvents(
  manifest: SyncManifest,
  filesMap: Record<string, TimelineDataFile>,
  rulers: RulerPeriod[],
): EnrichedEvent[] {
  const list: EnrichedEvent[] = [];
  let seq = 0;
  const resolvedEras = resolveMacroEras(manifest.macroEras || []);
  const fileCrossLinks: CrossLink[] = [];
  const inlineCrossLinks: CrossLink[] = [];

  manifest.mountedFiles.forEach((fileMeta) => {
    if (
      !fileMeta.enabled ||
      fileMeta.role === 'trunk' ||
      fileMeta.role === 'rulers_branch' ||
      fileMeta.fileId === 'rulers'
    ) {
      return;
    }
    const fileObj = filesMap[fileMeta.path];
    if (!isBranchFile(fileObj)) return;

    const fallbackBranchId = collectBranchesFromDataFile(fileObj, fileMeta.path).find((b) => !b.isGroup)?.id;

    if (Array.isArray(fileObj.crossLinks)) {
      fileObj.crossLinks.forEach((lnk) => {
        if (isPlainRecord(lnk) && typeof lnk.from === 'string' && typeof lnk.to === 'string') {
          fileCrossLinks.push({
            id: typeof lnk.id === 'string' && lnk.id ? lnk.id : `file-link-${lnk.from}-${lnk.to}`,
            from: lnk.from.trim(),
            to: lnk.to.trim(),
            type: typeof lnk.type === 'string' ? lnk.type : 'sync_context',
            label: typeof lnk.label === 'string' ? lnk.label : 'Связанное событие',
          });
        }
      });
    }

    fileObj.nodes.forEach((rawNode) => {
      const ev = sanitizeTimelineNode(rawNode, fallbackBranchId);
      if (!ev) return;

      if (Array.isArray(ev.linksTo)) {
        ev.linksTo.forEach((lnk, idx) => {
          if (!lnk?.targetId) return;
          const rawType = lnk.type || 'sync_context';
          // Семантика 'consequence': текущий узел (ev) является следствием целевого узла (targetId),
          // поэтому вектор причины направлен targetId -> ev.id.
          // Для 'causes', 'triggers', 'enables' вектор направлен ev.id -> targetId.
          const isConsequenceOfTarget = rawType === 'consequence';
          const normalizedType =
            rawType === 'consequence' || rawType === 'causes' ? 'triggers' : rawType;
          inlineCrossLinks.push({
            id: `inline-${ev.id}-${lnk.targetId}-${idx}`,
            from: isConsequenceOfTarget ? lnk.targetId : ev.id,
            to: isConsequenceOfTarget ? ev.id : lnk.targetId,
            type: normalizedType,
            label: lnk.label || 'Связанное событие',
          });
        });
      }

      const parsed =
        typeof ev.startYear === 'number' && typeof ev.endYear === 'number'
          ? { startYear: ev.startYear, endYear: ev.endYear }
          : parseEventYears(ev.period || '1700', ev.id);

      const startYear = parsed.startYear;
      const endYear = Math.max(startYear, parsed.endYear);
      const startPrecision = parsePreciseDate(ev.startDate, startYear, false, {
        calendarStyle: ev.calendarStyle,
        task: ev.task,
      });
      const endPrecision = parsePreciseDate(ev.endDate, endYear, true, {
        calendarStyle: ev.calendarStyle,
        task: ev.task,
      });
      const duration = endYear - startYear;
      const isAtomic = ev.isAtomic === true || (startYear === endYear && startPrecision.sortKey === endPrecision.sortKey);

      const overlappingRulers = rulers.filter((r) => r.startYear <= endYear && r.endYear >= startYear);

      const eraObj = findMacroEraForYear(startYear, resolvedEras, startPrecision.month);

      list.push({
        ...ev,
        sourceFile: fileMeta.path,
        seq: seq++,
        startYear,
        endYear,
        activeFrom: startYear,
        activeTo: endYear,
        startPrecision,
        activeStartPrecision: startPrecision,
        endPrecision,
        datePrecision: startPrecision.precision,
        isAtomic,
        duration,
        eraId: eraObj?.id || 'ERA_1',
        eraRoman: eraObj?.roman || '',
        eraTitle: eraObj?.displayShortTitle || eraObj?.title || '',
        overlappingRulers,
        ruler: overlappingRulers.map((r) => r.shortRuler).join(' → '),
        reignPeriod:
          overlappingRulers.length > 1
            ? `${overlappingRulers[0].startYear}–${overlappingRulers[overlappingRulers.length - 1].endYear} (${overlappingRulers.length} правл.)`
            : overlappingRulers[0]?.reignPeriod || '',
        prerequisitesList: [],
        concurrentEvents: [],
        explicitLinks: [],
        retrospectiveLinks: [],
      });
    });
  });

  // Вычисляем период активного творчества / научной деятельности (activeFrom–activeTo) для биографий
  const worksByPersonTag = new Map<string, number[]>();
  list.forEach((ev) => {
    if (isLiteraryWorkNode(ev) || isScienceDiscoveryNode(ev)) {
      (ev.syncTags || []).forEach((rawTag) => {
        const tag = rawTag.trim().toLowerCase();
        if (tag.startsWith('person-')) {
          const arr = worksByPersonTag.get(tag) || [];
          arr.push(ev.startYear);
          worksByPersonTag.set(tag, arr);
        }
      });
    }
  });

  list.forEach((ev) => {
    if (!isBiographyNode(ev)) return;

    const minAgeFloor = Math.min(ev.endYear, ev.startYear + 17);
    const defaultMaturity = Math.min(ev.endYear, ev.startYear + 21);
    const milestoneYears: number[] = [];

    (ev.subEvents || []).forEach((se) => {
      if (typeof se.year === 'number' && se.year >= minAgeFloor && se.year <= ev.endYear) {
        milestoneYears.push(se.year);
      } else if (typeof se.year === 'string') {
        const m = se.year.match(/\b(\d{3,4})\b/);
        if (m) {
          const y = Number(m[1]);
          if (y >= minAgeFloor && y <= ev.endYear) milestoneYears.push(y);
        }
      }
    });

    (ev.literaryProfile?.majorWorks || []).forEach((workStr) => {
      const matches = workStr.match(/\b(\d{3,4})\b/g);
      if (matches) {
        matches.forEach((m) => {
          const y = Number(m);
          if (y >= minAgeFloor && y <= ev.endYear) {
            milestoneYears.push(y);
          }
        });
      }
    });

    (ev.syncTags || []).forEach((rawTag) => {
      const tag = rawTag.trim().toLowerCase();
      const linkedYears = worksByPersonTag.get(tag);
      if (linkedYears) {
        linkedYears.forEach((y) => {
          if (y >= minAgeFloor && y <= ev.endYear) {
            milestoneYears.push(y);
          }
        });
      }
    });

    let computedActiveFrom = defaultMaturity;
    if (typeof ev.activeFrom === 'number' && ev.activeFrom > ev.startYear && ev.activeFrom <= ev.endYear) {
      computedActiveFrom = ev.activeFrom;
    } else if (milestoneYears.length > 0) {
      const earliestMilestone = Math.min(...milestoneYears);
      computedActiveFrom =
        earliestMilestone <= ev.startYear + 34
          ? earliestMilestone
          : Math.min(earliestMilestone, defaultMaturity);
    }

    const computedActiveTo =
      typeof ev.activeTo === 'number' && ev.activeTo >= computedActiveFrom && ev.activeTo <= ev.endYear
        ? ev.activeTo
        : ev.endYear;

    ev.activeFrom = computedActiveFrom;
    ev.activeTo = Math.max(computedActiveFrom, computedActiveTo);
    ev.activeStartPrecision = parsePreciseDate(undefined, ev.activeFrom, false);

    const activeOverlappingRulers = rulers.filter(
      (r) => r.startYear <= ev.activeTo && r.endYear >= ev.activeFrom,
    );
    if (activeOverlappingRulers.length > 0) {
      ev.overlappingRulers = activeOverlappingRulers;
      ev.ruler = activeOverlappingRulers.map((r) => r.shortRuler).join(' → ');
      ev.reignPeriod =
        activeOverlappingRulers.length > 1
          ? `${activeOverlappingRulers[0].startYear}–${activeOverlappingRulers[activeOverlappingRulers.length - 1].endYear} (${activeOverlappingRulers.length} правл.)`
          : activeOverlappingRulers[0]?.reignPeriod || '';
    }

    const activeEraObj = findMacroEraForYear(ev.activeFrom, resolvedEras);
    if (activeEraObj) {
      ev.eraId = activeEraObj.id;
      ev.eraRoman = activeEraObj.roman || '';
      ev.eraTitle = activeEraObj.displayShortTitle || activeEraObj.title || '';
    }
  });

  list.sort((a, b) => {
    if (a.startPrecision.sortKey !== b.startPrecision.sortKey) {
      return a.startPrecision.sortKey - b.startPrecision.sortKey;
    }
    return a.seq - b.seq;
  });

  const byId = new Map(list.map((e) => [e.id, e]));

  // Слой 1: явные связи (из sync.manifest.json + локальные crossLinks ветки + inline linksTo у узлов)
  const explicitLinks: CrossLink[] = [];
  const seenLinkSignatures = new Set<string>();
  const explicitPairKeys = new Set<string>();

  const combinedRawLinks = [
    ...(manifest.crossLinks || []),
    ...fileCrossLinks,
    ...inlineCrossLinks,
  ].map((lnk) => {
    const rawType = lnk.type || 'sync_context';
    if (rawType === 'consequence') {
      return {
        ...lnk,
        from: lnk.to,
        to: lnk.from,
        type: 'triggers',
      };
    }
    if (rawType === 'causes') {
      return {
        ...lnk,
        type: 'triggers',
      };
    }
    return lnk;
  });

  // Сначала фиксируем пары, уже связанные направленной причинной связью (triggers/enables),
  // чтобы избыточный недирективный sync_context для той же пары не дублировал карточку в Колонке 1.
  const causalPairKeys = new Set<string>();
  combinedRawLinks.forEach((lnk) => {
    if (!lnk.from || !lnk.to || lnk.from === lnk.to) return;
    if (lnk.type === 'triggers' || lnk.type === 'enables') {
      const pairKey = lnk.from < lnk.to ? `${lnk.from}|${lnk.to}` : `${lnk.to}|${lnk.from}`;
      causalPairKeys.add(pairKey);
    }
  });

  combinedRawLinks.forEach((lnk) => {
    if (!lnk.from || !lnk.to || lnk.from === lnk.to) return;
    const pairKey = lnk.from < lnk.to ? `${lnk.from}|${lnk.to}` : `${lnk.to}|${lnk.from}`;
    if (lnk.type === 'sync_context' && causalPairKeys.has(pairKey)) {
      return;
    }
    const signature =
      lnk.type === 'sync_context'
        ? `${pairKey}|sync_context`
        : `${lnk.from}|${lnk.to}|${lnk.type}`;
    if (seenLinkSignatures.has(signature)) return;
    seenLinkSignatures.add(signature);
    explicitLinks.push(lnk);
    explicitPairKeys.add(pairKey);
  });

  // Слой 2: автоматическая синхронизация событий разных веток по общим тегам кампаний и хронологической близости
  const eventsByTag = new Map<string, EnrichedEvent[]>();
  list.forEach((ev) => {
    const rawTags = [
      ...(ev.syncTags || []),
      ...(ev.campaignId ? [ev.campaignId] : []),
    ];
    const uniqueNormalized = new Set(
      rawTags.map((t) => t.trim().toLowerCase()).filter(Boolean),
    );
    uniqueNormalized.forEach((tag) => {
      const bucket = eventsByTag.get(tag);
      if (bucket) {
        bucket.push(ev);
      } else {
        eventsByTag.set(tag, [ev]);
      }
    });
  });

  const autoSyncByPair = new Map<
    string,
    { from: EnrichedEvent; to: EnrichedEvent; tags: string[] }
  >();

  eventsByTag.forEach((taggedEvents, tag) => {
    if (taggedEvents.length < 2) return;
    for (let i = 0; i < taggedEvents.length; i++) {
      for (let j = i + 1; j < taggedEvents.length; j++) {
        const a = taggedEvents[i];
        const b = taggedEvents[j];
        if (a.task === b.task) continue;

        const pairKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
        if (explicitPairKeys.has(pairKey)) continue;

        // Пересечение интервалов или близость до 3 лет
        const maxStart = Math.max(a.startYear, b.startYear);
        const minEnd = Math.min(a.endYear, b.endYear);
        if (maxStart > minEnd + 3) continue;

        const existingAuto = autoSyncByPair.get(pairKey);
        if (existingAuto) {
          if (!existingAuto.tags.includes(tag)) {
            existingAuto.tags.push(tag);
          }
        } else {
          autoSyncByPair.set(pairKey, { from: a, to: b, tags: [tag] });
        }
      }
    }
  });

  const rulerLabelByTag = new Map<string, string>();
  rulers.forEach((r) => {
    rulerLabelByTag.set(r.id.toLowerCase(), r.shortRuler);
  });
  rulerLabelByTag.set('ruler-ryurik', rulerLabelByTag.get('ruler-rurik') || 'Рюрик');

  const eraLabelByTag = new Map<string, string>();
  resolvedEras.forEach((era) => {
    const rawKey = era.id.toLowerCase();
    eraLabelByTag.set(rawKey, era.displayShortTitle);
    eraLabelByTag.set(rawKey.replace(/_/g, '-'), era.displayShortTitle);
  });

  const resolveHumanTagLabel = (rawTag: string): string => {
    const resolved = resolveSyncTagHumanLabel(rawTag, {
      byId,
      rulerLabelByTag,
      eraLabelByTag,
    });
    return resolved === rawTag ? 'общему историческому сюжету' : resolved;
  };

  const formatHumanTagList = (tags: string[]): string => {
    const resolved = Array.from(new Set(tags.map(resolveHumanTagLabel).filter(Boolean)));
    return resolved.join(', ');
  };

  const autoSyncLinks: Array<CrossLink & { isAutoSync: boolean; syncTag: string; isRetrospective?: boolean }> = [];
  autoSyncByPair.forEach(({ from, to, tags }, pairKey) => {
    const formattedTags = formatHumanTagList(tags);
    autoSyncLinks.push({
      id: `auto-sync-${pairKey}`,
      from: from.id,
      to: to.id,
      type: 'sync_context',
      label:
        tags.length > 1
          ? `Синхронная взаимосвязь по сюжетам: ${formattedTags}`
          : `Синхронная взаимосвязь по сюжету: ${formattedTags}`,
      isAutoSync: true,
      syncTag: tags[0],
      isRetrospective: false,
    });
  });

  // Слой 3: ретроспективные связи (referenceTags и канонические ссылки event-<id>) без ограничения в 3 года
  const retrospectivePairMap = new Map<
    string,
    { from: EnrichedEvent; to: EnrichedEvent; tags: string[] }
  >();

  const registerRetrospectivePair = (referencer: EnrichedEvent, target: EnrichedEvent, tag: string) => {
    if (referencer.id === target.id || referencer.task === target.task) return;
    const pairKey = referencer.id < target.id ? `${referencer.id}|${target.id}` : `${target.id}|${referencer.id}`;
    if (explicitPairKeys.has(pairKey) || autoSyncByPair.has(pairKey)) return;

    // Ориентируем связь от более позднего узла (книга/исследование) к исходному историческому событию
    const fromNode = referencer.startYear >= target.startYear ? referencer : target;
    const toNode = fromNode === referencer ? target : referencer;

    const existing = retrospectivePairMap.get(pairKey);
    if (existing) {
      if (!existing.tags.includes(tag)) {
        existing.tags.push(tag);
      }
    } else {
      retrospectivePairMap.set(pairKey, { from: fromNode, to: toNode, tags: [tag] });
    }
  };

  list.forEach((ev) => {
    // 3a. Каноническая метка вида event-<node.id> в syncTags или referenceTags всегда связывает с целевым узлом
    const allNodeTags = Array.from(
      new Set(
        [
          ...(ev.syncTags || []),
          ...(ev.referenceTags || []),
          ...(ev.campaignId ? [ev.campaignId] : []),
        ]
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ),
    );

    allNodeTags.forEach((tag) => {
      if (tag.startsWith('event-')) {
        const targetId = tag.slice('event-'.length);
        const targetNode = byId.get(targetId);
        if (targetNode) {
          const isExplicitRefTag = (ev.referenceTags || []).some((rt) => rt.trim().toLowerCase() === tag);
          const maxStart = Math.max(ev.startYear, targetNode.startYear);
          const minEnd = Math.min(ev.endYear, targetNode.endYear);
          if (isExplicitRefTag || maxStart > minEnd + 3) {
            registerRetrospectivePair(ev, targetNode, tag);
          }
        }
      }
    });

    // 3b. Теги из referenceTags связываются с первичными носителями этого тега (syncTags / campaignId) на любой дистанции лет
    const refTags = Array.from(
      new Set((ev.referenceTags || []).map((t) => t.trim().toLowerCase()).filter(Boolean)),
    );
    refTags.forEach((tag) => {
      const owners = eventsByTag.get(tag) || [];
      owners.forEach((owner) => {
        registerRetrospectivePair(ev, owner, tag);
      });
    });
  });

  const retrospectiveTagLinks: Array<
    CrossLink & { isAutoSync: boolean; syncTag: string; isRetrospective: boolean }
  > = [];
  retrospectivePairMap.forEach(({ from, to, tags }, pairKey) => {
    const formattedTags = formatHumanTagList(tags);
    retrospectiveTagLinks.push({
      id: `ref-sync-${pairKey}`,
      from: from.id,
      to: to.id,
      type: 'references',
      label:
        tags.length > 1
          ? `Историко-культурная перекличка по темам: ${formattedTags}`
          : `Историко-культурная перекличка: ${formattedTags}`,
      isAutoSync: true,
      syncTag: tags[0],
      isRetrospective: true,
    });
  });

  const RETROSPECTIVE_LINK_TYPES = new Set(['references', 'about_event', 'inspired_by']);

  const allLinks: Array<
    CrossLink & { isAutoSync?: boolean; syncTag?: string; isRetrospective?: boolean }
  > = [...explicitLinks, ...autoSyncLinks, ...retrospectiveTagLinks];

  // O(L) adjacency index so every event inspects only its incident links instead of scanning allLinks (O(N * L))
  const linksByNodeId = new Map<
    string,
    Array<CrossLink & { isAutoSync?: boolean; syncTag?: string; isRetrospective?: boolean }>
  >();
  for (let i = 0; i < allLinks.length; i++) {
    const lnk = allLinks[i];
    let fromBucket = linksByNodeId.get(lnk.from);
    if (!fromBucket) {
      fromBucket = [];
      linksByNodeId.set(lnk.from, fromBucket);
    }
    fromBucket.push(lnk);

    if (lnk.to !== lnk.from) {
      let toBucket = linksByNodeId.get(lnk.to);
      if (!toBucket) {
        toBucket = [];
        linksByNodeId.set(lnk.to, toBucket);
      }
      toBucket.push(lnk);
    }
  }

  // O(N + Y) prefix-sum interval counting for exact concurrentCount on every event
  const totalEvents = list.length;
  let minStartYear = Infinity;
  let maxEndYear = -Infinity;
  for (let i = 0; i < totalEvents; i++) {
    const ev = list[i];
    if (ev.startYear < minStartYear) minStartYear = ev.startYear;
    if (ev.endYear > maxEndYear) maxEndYear = ev.endYear;
  }

  const yearSpan = Number.isFinite(minStartYear) ? maxEndYear - minStartYear + 1 : 0;
  const usePrefixCount = totalEvents > 0 && yearSpan > 0 && yearSpan <= 20000;
  let startsPrefix: Int32Array | null = null;
  let endsPrefix: Int32Array | null = null;

  if (usePrefixCount) {
    startsPrefix = new Int32Array(yearSpan);
    endsPrefix = new Int32Array(yearSpan);
    for (let i = 0; i < totalEvents; i++) {
      const ev = list[i];
      startsPrefix[ev.startYear - minStartYear] += 1;
      endsPrefix[ev.endYear - minStartYear] += 1;
    }
    for (let y = 1; y < yearSpan; y++) {
      startsPrefix[y] += startsPrefix[y - 1];
      endsPrefix[y] += endsPrefix[y - 1];
    }
  }

  // Upper bound in `list` (sorted monotonically by startYear via startPrecision.sortKey)
  const findStartYearUpperBound = (targetYear: number): number => {
    let lo = 0;
    let hi = totalEvents;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (list[mid].startYear <= targetYear) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo;
  };

  for (let i = 0; i < totalEvents; i++) {
    const ev = list[i];

    if (usePrefixCount && startsPrefix && endsPrefix) {
      const endedBefore =
        ev.startYear > minStartYear ? endsPrefix[ev.startYear - minStartYear - 1] : 0;
      const startedUpToEnd = startsPrefix[ev.endYear - minStartYear];
      const startedAfter = totalEvents - startedUpToEnd;
      ev.concurrentCount = Math.max(0, totalEvents - 1 - endedBefore - startedAfter);
    } else {
      let count = 0;
      const upper = findStartYearUpperBound(ev.endYear);
      for (let j = 0; j < upper; j++) {
        const other = list[j];
        if (other.id !== ev.id && other.endYear >= ev.startYear) {
          count += 1;
        }
      }
      ev.concurrentCount = count;
    }

    // Lazily materialize ev.concurrentEvents only when actually accessed (e.g. CardDetailModal or Focus mode)
    Object.defineProperty(ev, 'concurrentEvents', {
      configurable: true,
      enumerable: true,
      get() {
        const upper = findStartYearUpperBound(ev.endYear);
        const concurrent: EnrichedEvent[] = [];
        for (let j = 0; j < upper; j++) {
          const other = list[j];
          if (other.id !== ev.id && other.endYear >= ev.startYear) {
            concurrent.push(other);
          }
        }
        Object.defineProperty(ev, 'concurrentEvents', {
          value: concurrent,
          writable: true,
          enumerable: true,
          configurable: true,
        });
        return concurrent;
      },
      set(val: EnrichedEvent[]) {
        Object.defineProperty(ev, 'concurrentEvents', {
          value: val,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      },
    });

    const links: ExplicitLinkInfo[] = [];
    const retroLinks: RetrospectiveLinkInfo[] = [];
    const seenRetroOtherIds = new Set<string>();
    const incidentLinks = linksByNodeId.get(ev.id);

    if (incidentLinks) {
      const isEvCulturalOrSci =
        isLiteraryWorkNode(ev) || isScienceDiscoveryNode(ev) || isBiographyNode(ev);

      for (let k = 0; k < incidentLinks.length; k++) {
        const lnk = incidentLinks[k];
        let isOutgoing = lnk.from === ev.id;
        const targetId = isOutgoing ? lnk.to : lnk.from;
        const targetEvent = byId.get(targetId);
        if (!targetEvent) continue;

        // Для неперекрывающихся событий в явном хронологическом порядке нормализуем случайную инверсию,
        // но при перекрытии интервалов или в одном году сохраняем авторский вектор причина -> следствие.
        if (lnk.type === 'triggers' || lnk.type === 'enables') {
          const fromEv = lnk.from === ev.id ? ev : targetEvent;
          const toEv = lnk.to === ev.id ? ev : targetEvent;
          const intervalsOverlap = fromEv.startYear <= toEv.endYear && toEv.startYear <= fromEv.endYear;
          if (!intervalsOverlap && fromEv.startPrecision.sortKey > toEv.startPrecision.sortKey) {
            isOutgoing = lnk.to === ev.id;
          }
        }

        const maxStart = Math.max(ev.startYear, targetEvent.startYear);
        const minEnd = Math.min(ev.endYear, targetEvent.endYear);
        const yearGap = maxStart > minEnd ? maxStart - minEnd : 0;
        const isTargetCulturalOrSci =
          isLiteraryWorkNode(targetEvent) ||
          isScienceDiscoveryNode(targetEvent) ||
          isBiographyNode(targetEvent);
        const isRetrospective =
          lnk.isRetrospective === true ||
          RETROSPECTIVE_LINK_TYPES.has(lnk.type) ||
          ((isEvCulturalOrSci || isTargetCulturalOrSci) &&
            yearGap > 3 &&
            lnk.type !== 'triggers' &&
            lnk.type !== 'enables');

        links.push({
          ...lnk,
          otherId: targetId,
          direction: isOutgoing ? 'outgoing' : 'incoming',
          targetEvent,
          isRetrospective,
          yearGap,
        });

        const isCrossDomainCulturalHighlight =
          !isEvCulturalOrSci && isTargetCulturalOrSci;

        if (
          (lnk.isRetrospective === true ||
            RETROSPECTIVE_LINK_TYPES.has(lnk.type) ||
            isCrossDomainCulturalHighlight) &&
          !seenRetroOtherIds.has(targetId)
        ) {
          seenRetroOtherIds.add(targetId);
          retroLinks.push({
            id: lnk.id,
            otherId: targetId,
            direction: targetEvent.startYear >= ev.startYear ? 'depicted_by' : 'depicts',
            label: lnk.label,
            yearGap,
          });
        }
      }
    }

    ev.explicitLinks = links;
    ev.retrospectiveLinks = retroLinks;
    ev.prerequisitesList = resolveEventPrerequisites(ev);
  }

  return list;
}

const CAUSAL_DETAIL_PATTERNS = [
  /^(?:После|Вследствие|В результате|В ответ на|Из-за|На фоне|В условиях|К началу|К середине|К концу|Причиной|Предпосылк)/i,
  /(?:причинами|предпосылками|поводом|толчком|вынудил|потребовало|обострени|кризис|необходимост)/i,
];

export function resolveEventPrerequisites(
  ev: Pick<
    EnrichedEvent,
    | 'prerequisites'
    | 'explicitLinks'
    | 'subEvents'
    | 'details'
    | 'literaryProfile'
    | 'region'
    | 'task'
    | 'type'
    | 'syncTags'
  >,
): string[] {
  if (Array.isArray(ev.prerequisites)) {
    const cleaned = ev.prerequisites.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length > 0) return cleaned;
  } else if (typeof ev.prerequisites === 'string' && ev.prerequisites.trim()) {
    const lines = ev.prerequisites
      .split(/\n+|;\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length > 0) return lines;
  }

  // Умный резервный синтез, если в JSON-файле поле prerequisites не задано явно
  const fallback: string[] = [];

  const incomingCausal = ev.explicitLinks.filter(
    (lnk) =>
      lnk.direction === 'incoming' &&
      (lnk.type === 'triggers' || lnk.type === 'enables' || lnk.type === 'causes'),
  );
  incomingCausal.slice(0, 2).forEach((lnk) => {
    const item = `${lnk.label} (${lnk.targetEvent.title}, ${lnk.targetEvent.period})`;
    if (!fallback.includes(item)) fallback.push(item);
  });

  const sentences = (ev.details || '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  const causalSentence = sentences.find((s) => CAUSAL_DETAIL_PATTERNS.some((re) => re.test(s)));
  if (causalSentence && fallback.length < 2) {
    const normalized = causalSentence.replace(/\.$/, '');
    if (!fallback.some((f) => f.includes(normalized.slice(0, 28)))) {
      fallback.push(normalized);
    }
  }

  const sub0 = ev.subEvents && ev.subEvents.length > 0 ? ev.subEvents[0] : null;
  if (sub0 && fallback.length < 2) {
    const yrStr = sub0.year !== undefined ? String(sub0.year).trim() : '';
    const title = sub0.title.trim();
    const hasYr = yrStr !== '' && title.includes(yrStr);
    const head = !hasYr && yrStr ? `${title} (${yrStr})` : title;
    const text = (sub0.text || sub0.description || '').trim();
    const isBio = isBiographyNode(ev);
    const isWork = isLiteraryWorkNode(ev);
    const prefix = isBio
      ? 'Истоки и становление — '
      : isWork
        ? 'Замысел и истоки — '
        : 'Завязка — ';
    const line = text ? `${prefix}${head}: ${text}` : `${prefix}${head}`;
    if (!fallback.some((f) => f.includes(title))) {
      fallback.push(line);
    }
  }

  if (fallback.length === 0 && ev.literaryProfile?.themes) {
    fallback.push(`Историко-культурный контекст: ${ev.literaryProfile.themes}`);
  } else if (fallback.length === 0 && sentences[0]) {
    fallback.push(sentences[0].replace(/\.$/, ''));
  }

  return fallback.slice(0, 3);
}

export function buildUnifiedTimelineStream(
  enrichedEvents: EnrichedEvent[],
  rulers: RulerPeriod[],
  manifest: SyncManifest,
  branches: BranchDefinition[],
  filters: FilterState,
): {
  stream: StreamRow[];
  matchingEvents: EnrichedEvent[];
  matchingRulers: RulerPeriod[];
  focusedEvent: EnrichedEvent | null;
  focusDistanceMap: Map<string, number>;
  outOfWindowFocusCount: number;
  effectiveYearFrom: number;
  effectiveYearTo: number;
  axisResolution: AxisResolution;
  auditCandidateMap: Map<string, AuditCandidateInfo>;
} {
  const q = filters.searchQuery.trim().toLowerCase();
  const selectedTagNorm = filters.selectedSyncTag?.trim().toLowerCase() || null;
  const linkTypeFilter: SyncLinkTypeFilter = filters.syncLinkTypeFilter || 'all';
  const requireLinkMatch = filters.onlyWithSyncLinks || linkTypeFilter !== 'all';
  const pairFilter =
    filters.branchPairFilter &&
    filters.branchPairFilter.branchA &&
    filters.branchPairFilter.branchB &&
    filters.branchPairFilter.branchA !== filters.branchPairFilter.branchB
      ? filters.branchPairFilter
      : null;

  const focusTarget = filters.focusedEventId
    ? (enrichedEvents.find((ev) => ev.id === filters.focusedEventId) ?? null)
    : null;

  let matchingEvents: EnrichedEvent[] = [];
  let matchingRulers: RulerPeriod[] = [];
  let effectiveYearFrom = filters.yearFrom;
  let effectiveYearTo = filters.yearTo;
  let auditCandidateMap = new Map<string, AuditCandidateInfo>();
  const focusDistanceMap = new Map<string, number>();
  let outOfWindowFocusCount = 0;

  const yearBounds = computeTimelineYearBounds(manifest, rulers, enrichedEvents);

  const rulersFileMeta = manifest.mountedFiles.find(
    (f) => f.role === 'trunk' || f.role === 'rulers_branch' || f.fileId === 'rulers',
  );
  const isRulersFileMounted = rulersFileMeta ? rulersFileMeta.enabled : true;

  const resolvedEras = resolveMacroEras(manifest.macroEras || []);
  const selectedEraObj =
    filters.selectedEra !== 'ALL'
      ? resolvedEras.find((e) => e.id === filters.selectedEra) ?? null
      : null;

  if (focusTarget) {
    const focusDepth: FocusDepth = filters.focusDepth ?? 1;
    const focusKeepWindow = Boolean(filters.focusKeepWindow);
    const byId = new Map(enrichedEvents.map((ev) => [ev.id, ev]));

    focusDistanceMap.set(focusTarget.id, 0);
    let frontier: string[] = [focusTarget.id];

    for (let step = 0; step < focusDepth; step++) {
      const nextFrontier: string[] = [];
      frontier.forEach((evId) => {
        const current = byId.get(evId);
        if (!current) return;
        current.explicitLinks.forEach((lnk) => {
          const targetId = lnk.targetEvent.id;
          if (!focusDistanceMap.has(targetId)) {
            focusDistanceMap.set(targetId, step + 1);
            nextFrontier.push(targetId);
          }
        });
      });
      frontier = nextFrontier;
      if (frontier.length === 0) break;
    }

    if (filters.focusScope === 'sync_and_concurrent') {
      focusTarget.concurrentEvents.forEach((ce) => {
        if (!focusDistanceMap.has(ce.id)) {
          focusDistanceMap.set(ce.id, 1);
        }
      });
    }

    const allFocusEvents = enrichedEvents.filter((ev) => focusDistanceMap.has(ev.id));

    if (focusKeepWindow) {
      effectiveYearFrom = filters.yearFrom;
      effectiveYearTo = filters.yearTo;
      matchingEvents = allFocusEvents.filter((ev) =>
        intersectsTimeWindow(ev.startYear, ev.endYear, effectiveYearFrom, effectiveYearTo),
      );
      outOfWindowFocusCount = Math.max(0, allFocusEvents.length - matchingEvents.length);
    } else {
      matchingEvents = allFocusEvents;
      const minEventYear = matchingEvents.reduce((m, e) => Math.min(m, e.startYear), focusTarget.startYear);
      const maxEventYear = matchingEvents.reduce((m, e) => Math.max(m, e.endYear), focusTarget.endYear);
      effectiveYearFrom = Math.max(yearBounds.minYear, minEventYear);
      effectiveYearTo = Math.min(yearBounds.maxYear, Math.max(effectiveYearFrom + 1, maxEventYear));
    }

    if (filters.auditUnlinkedMode || filters.computeAuditMap) {
      auditCandidateMap = computeUnlinkedAuditMap(matchingEvents);
    }

    const touchedRulerIds = new Set<string>();
    matchingEvents.forEach((ev) => {
      ev.overlappingRulers.forEach((r) => touchedRulerIds.add(r.id));
    });

    matchingRulers = rulers.filter((r) => {
      if (!isRulersFileMounted || filters.activeBranches.MAIN_RULERS === false) return false;
      if (focusKeepWindow && !intersectsTimeWindow(r.startYear, r.endYear, effectiveYearFrom, effectiveYearTo)) {
        return false;
      }
      return touchedRulerIds.has(r.id);
    });
  } else {
    const preAuditEvents = enrichedEvents.filter((ev) => {
      if (pairFilter) {
        if (ev.task !== pairFilter.branchA && ev.task !== pairFilter.branchB) {
          return false;
        }
      } else if (!isEventBranchActive(ev, filters.activeBranches)) {
        return false;
      }

      const effStart = getEventEffectiveStartYear(ev, branches);
      const effEnd = getEventEffectiveEndYear(ev, branches);
      if (!intersectsTimeWindow(effStart, effEnd, filters.yearFrom, filters.yearTo)) return false;
      if (selectedEraObj) {
        if (!doesIntervalBelongToEra(effStart, effEnd, ev.eraId, selectedEraObj)) {
          return false;
        }
      }

      if (selectedTagNorm) {
        const nodeTags = [
          ...(ev.syncTags || []),
          ...(ev.campaignId ? [ev.campaignId] : []),
          ...(ev.referenceTags || []),
        ].map((t) => t.trim().toLowerCase());
        if (!nodeTags.includes(selectedTagNorm)) return false;
      }

      if (filters.selectedMacroRegion && filters.selectedMacroRegion !== 'all') {
        if (!doesEventMatchMacroRegion(ev, filters.selectedMacroRegion)) return false;
      }

      if (requireLinkMatch) {
        if (pairFilter) {
          const partnerBranch =
            ev.task === pairFilter.branchA ? pairFilter.branchB : pairFilter.branchA;
          const hasPairLink = ev.explicitLinks.some(
            (lnk) =>
              lnk.targetEvent.task === partnerBranch &&
              doesLinkMatchTypeFilter(lnk, linkTypeFilter),
          );
          if (!hasPairLink) return false;
        } else {
          const hasMatchingLink = ev.explicitLinks.some((lnk) =>
            doesLinkMatchTypeFilter(lnk, linkTypeFilter),
          );
          if (!hasMatchingLink) return false;
        }
      }

      if (filters.selectedReign !== 'ALL') {
        const matchesRuler = ev.overlappingRulers.some((r) => r.id === filters.selectedReign);
        if (!matchesRuler) return false;
      }
      if (filters.selectedPersonKey) {
        if (filters.selectedPersonEventIds) {
          if (!filters.selectedPersonEventIds.has(ev.id)) return false;
        } else {
          const matchesPerson = Boolean(
            ev.keyFigures?.some((person) => {
              const parsed = extractPreliminaryPersonKey(person);
              if (!parsed) return false;
              return (
                parsed.preliminaryKey === filters.selectedPersonKey ||
                doesRawMatchPersonKey(person, filters.selectedPersonKey!)
              );
            }),
          );
          if (!matchesPerson) return false;
        }
      }
      if (!q) return true;
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.subtitle.toLowerCase().includes(q) ||
        ev.details.toLowerCase().includes(q) ||
        ev.period.toLowerCase().includes(q) ||
        ev.ruler.toLowerCase().includes(q) ||
        ev.region.toLowerCase().includes(q) ||
        ev.type.toLowerCase().includes(q) ||
        ev.prerequisitesList.some((p) => p.toLowerCase().includes(q)) ||
        Boolean(ev.outcome && ev.outcome.toLowerCase().includes(q)) ||
        Boolean(ev.keyFigures?.some((person) => person.toLowerCase().includes(q))) ||
        Boolean(ev.literaryProfile?.genre && ev.literaryProfile.genre.toLowerCase().includes(q)) ||
        Boolean(ev.literaryProfile?.movement && ev.literaryProfile.movement.toLowerCase().includes(q)) ||
        Boolean(ev.literaryProfile?.themes && ev.literaryProfile.themes.toLowerCase().includes(q)) ||
        Boolean(
          ev.literaryProfile?.publicationFate &&
            ev.literaryProfile.publicationFate.toLowerCase().includes(q),
        ) ||
        Boolean(
          ev.literaryProfile?.culturalImpact &&
            ev.literaryProfile.culturalImpact.toLowerCase().includes(q),
        ) ||
        Boolean(ev.literaryProfile?.majorWorks?.some((work) => work.toLowerCase().includes(q))) ||
        Boolean(ev.syncTags?.some((tag) => tag.toLowerCase().includes(q))) ||
        Boolean(ev.referenceTags?.some((tag) => tag.toLowerCase().includes(q))) ||
        Boolean(ev.explicitLinks?.some((lnk) => lnk.label.toLowerCase().includes(q))) ||
        Boolean(
          ev.subEvents?.some(
            (s) =>
              s.title.toLowerCase().includes(q) ||
              s.text.toLowerCase().includes(q) ||
              (s.year !== undefined && String(s.year).toLowerCase().includes(q)),
          ),
        )
      );
    });

    if (filters.auditUnlinkedMode || filters.computeAuditMap) {
      auditCandidateMap = computeUnlinkedAuditMap(preAuditEvents);
    }
    matchingEvents = filters.auditUnlinkedMode
      ? preAuditEvents.filter((ev) => (auditCandidateMap.get(ev.id)?.candidates.length ?? 0) > 0)
      : preAuditEvents;

    matchingRulers = rulers.filter((r) => {
      if (!isRulersFileMounted || filters.activeBranches.MAIN_RULERS === false) return false;
      if (!intersectsTimeWindow(r.startYear, r.endYear, filters.yearFrom, filters.yearTo)) return false;
      if (selectedEraObj) {
        if (!doesIntervalBelongToEra(r.startYear, r.endYear, r.eraId, selectedEraObj)) {
          return false;
        }
      }
      if (filters.selectedReign !== 'ALL' && r.id !== filters.selectedReign) return false;
      if (
        !q &&
        !requireLinkMatch &&
        !filters.selectedPersonKey &&
        !selectedTagNorm &&
        !pairFilter &&
        !filters.auditUnlinkedMode
      ) {
        return true;
      }
      const selfMatch = q !== '' && (r.ruler.toLowerCase().includes(q) || r.reignTitle.toLowerCase().includes(q));
      const hasMatchingEvent = matchingEvents.some((ev) => ev.overlappingRulers.some((or) => or.id === r.id));
      return selfMatch || hasMatchingEvent;
    });
  }

  const axisResolution = detectAxisResolution(effectiveYearFrom, effectiveYearTo);
  const stream: StreamRow[] = [];

  const hasAnySelectableBranchEnabled = branches.some(
    (b) => !b.isGroup && !b.isTimeAxis && filters.activeBranches[b.id] !== false,
  );
  const isBareEraSkeletonMode = !hasAnySelectableBranchEnabled && !focusTarget && !pairFilter;

  resolvedEras.forEach((era) => {
    const matchesSelectedEra = !selectedEraObj || era.id === selectedEraObj.id;
    const hasItemsInEra =
      matchingEvents.some((e) => doesIntervalBelongToEra(e.startYear, e.endYear, e.eraId, era)) ||
      matchingRulers.some((r) => doesIntervalBelongToEra(r.startYear, r.endYear, r.eraId, era));
    if (!hasItemsInEra && !(isBareEraSkeletonMode && matchesSelectedEra)) return;

    const milestoneYear = Math.max(effectiveYearFrom, era.startYear);
    if (milestoneYear >= effectiveYearFrom && milestoneYear <= effectiveYearTo && era.endYear >= effectiveYearFrom) {
      stream.push({
        rowType: 'ERA_START',
        year: milestoneYear,
        sortKey: milestoneYear * 10000 + 50,
        priority: 1,
        era,
      });
    }
  });

  // В узком окне (месяцы / дни) добавляем опорные хронологические метки на центральной оси времени
  if (!focusTarget && (axisResolution === 'month' || axisResolution === 'day')) {
    const stepMonths = axisResolution === 'day' ? 1 : 6;
    for (let y = effectiveYearFrom; y <= effectiveYearTo; y++) {
      for (let m = 1; m <= 12; m += stepMonths) {
        const tickSortKey = y * 10000 + m * 100 + 1;
        const label =
          m === 1
            ? `${y} г. · янв`
            : `${MONTHS_SHORT_RU[m - 1]} ${y}`;
        stream.push({
          rowType: 'TIME_TICK',
          year: y,
          month: m,
          label,
          sortKey: tickSortKey,
          priority: 2,
        });
      }
    }
  }

  const rulerIndexById = new Map(rulers.map((r, i) => [r.id, i]));
  const rulerStreamLayout = computeRulerSubLaneLayout(matchingRulers, true);

  matchingRulers.forEach((rulerObj) => {
    const rIdx = rulerIndexById.get(rulerObj.id) ?? 0;
    const rulerColor =
      rulerStreamLayout.colorByRulerId.get(rulerObj.id) ??
      RULER_ALT_COLORS[rIdx % RULER_ALT_COLORS.length];
    const startParts = parsePreciseDate(rulerObj.startDate, rulerObj.startYear, false, {
      calendarStyle: rulerObj.calendarStyle,
      task: 'MAIN_RULERS',
    });
    const endParts = parsePreciseDate(rulerObj.endDate, rulerObj.endYear, true, {
      calendarStyle: rulerObj.calendarStyle,
      task: 'MAIN_RULERS',
    });

    const startedBeforeWindow = !focusTarget && rulerObj.startYear < effectiveYearFrom;
    const displayYear = startedBeforeWindow ? effectiveYearFrom : rulerObj.startYear;
    const displayParts = startedBeforeWindow
      ? parsePreciseDate(undefined, effectiveYearFrom, false)
      : startParts;

    stream.push({
      rowType: 'RULER_COMMIT',
      year: displayYear,
      sortKey: displayParts.sortKey,
      dateLabel: startedBeforeWindow
        ? `${effectiveYearFrom} г. (с ${rulerObj.startYear})`
        : formatDateForResolution(startParts, axisResolution),
      priority: 4,
      startedBeforeWindow,
      rulerIndex: rIdx,
      rulerColor,
      rulerObj,
    });

    if (filters.showEndNodes && ((focusTarget && !filters.focusKeepWindow) || rulerObj.endYear <= effectiveYearTo)) {
      stream.push({
        rowType: 'RULER_END',
        year: rulerObj.endYear,
        sortKey: endParts.sortKey,
        dateLabel: formatDateForResolution(endParts, axisResolution),
        priority: 3,
        rulerIndex: rIdx,
        rulerColor,
        rulerObj,
      });
    }
  });

  const selectedRulerForClamp =
    !focusTarget && filters.selectedReign !== 'ALL'
      ? rulers.find((r) => r.id === filters.selectedReign) ?? null
      : null;
  const windowEntryFloorYear = selectedRulerForClamp
    ? Math.max(effectiveYearFrom, selectedRulerForClamp.startYear)
    : effectiveYearFrom;

  matchingEvents.forEach((eventObj) => {
    const isBio = isBiographyNode(eventObj, branches);
    const effStartYear = getEventEffectiveStartYear(eventObj, branches);
    const effEndYear = getEventEffectiveEndYear(eventObj, branches);
    const effStartParts = getEventEffectiveStartPrecision(eventObj, branches);

    const isAtomicInView = isAtomicEventNode(
      eventObj,
      effStartParts,
      eventObj.endPrecision,
      axisResolution,
    );
    const startedBeforeWindow =
      (!focusTarget || Boolean(filters.focusKeepWindow)) &&
      !isAtomicInView &&
      effStartYear < windowEntryFloorYear;
    const displayYear = startedBeforeWindow ? windowEntryFloorYear : effStartYear;
    const displayParts = startedBeforeWindow
      ? parsePreciseDate(undefined, windowEntryFloorYear, false)
      : effStartParts;

    const dateLabel = isBio
      ? startedBeforeWindow
        ? `активен с ${effStartYear} г. (жизнь ${eventObj.period})`
        : `активен ${effStartYear}–${effEndYear} (${eventObj.period})`
      : startedBeforeWindow
        ? `${windowEntryFloorYear} г. (с ${effStartYear})`
        : formatDateForResolution(effStartParts, axisResolution);

    stream.push({
      rowType: 'EVENT_COMMIT',
      year: displayYear,
      sortKey: displayParts.sortKey,
      dateLabel,
      priority: isBio ? 5.2 : 5,
      seq: eventObj.seq,
      startedBeforeWindow,
      isAtomicInView,
      eventObj,
    });

    if (
      !isAtomicInView &&
      filters.showEndNodes &&
      ((focusTarget && !filters.focusKeepWindow) || effEndYear <= effectiveYearTo)
    ) {
      stream.push({
        rowType: 'EVENT_END',
        year: effEndYear,
        sortKey: eventObj.endPrecision.sortKey,
        dateLabel: formatDateForResolution(eventObj.endPrecision, axisResolution),
        priority: 6,
        seq: eventObj.seq,
        eventObj,
      });
    }
  });

  stream.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    if (a.priority !== b.priority) return a.priority - b.priority;
    const seqA = 'seq' in a ? a.seq : 0;
    const seqB = 'seq' in b ? b.seq : 0;
    return seqA - seqB;
  });

  return {
    stream,
    matchingEvents,
    matchingRulers,
    focusedEvent: focusTarget,
    focusDistanceMap,
    outOfWindowFocusCount,
    effectiveYearFrom,
    effectiveYearTo,
    axisResolution,
    auditCandidateMap,
  };
}
