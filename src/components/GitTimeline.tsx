import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Crosshair,
  Crown,
  Eye,
  Flag,
  GitBranch,
  GitCommitHorizontal,
  GitCompare,
  GitMerge,
  HelpCircle,
  Link2,
  Lock,
  LockOpen,
  MapPin,
  Pin,
  X,
  Zap,
} from 'lucide-react';
import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react';
import { classifyEventMacroRegions, getMacroRegionOption } from '../engine/regionFilter';
import {
  computeBranchSubLaneLayout,
  computeRulerSubLaneLayout,
  findMacroEraForYear,
  formatAxisGutterDate,
  formatCalendarDetailBadge,
  formatEventTitleWithPeriod,
  getCalendarStyleAxisMarker,
  getDirectChildBranches,
  getEventEffectiveEndYear,
  getEventEffectiveStartYear,
  getEventHiddenBranchSummaries,
  hasChildBranches,
  isBiographyNode,
  isBranchOrDescendantActive,
  isHistoricalEventNode,
  isMajorCampaignOrConflictNode,
  isScientistBioNode,
  isWriterBioNode,
  parsePreciseDate,
  resolveEventBranch,
  resolveMacroEra,
  resolveMacroEras,
} from '../engine/timelineEngine';
import type {
  AuditCandidateInfo,
  AxisResolution,
  BranchDefinition,
  CardDensity,
  EnrichedEvent,
  FocusDepth,
  FocusScope,
  MacroRegionId,
  ResolvedMacroEra,
  RulerPeriod,
  StreamRow,
  SyncManifest,
  TimeScaleMode,
} from '../types/timeline';

interface GitTimelineProps {
  stream: StreamRow[];
  matchingEvents: EnrichedEvent[];
  matchingRulers: RulerPeriod[];
  rulers: RulerPeriod[];
  visibleLanes: BranchDefinition[];
  branches: BranchDefinition[];
  activeBranches: Record<string, boolean>;
  collapsedParents: Record<string, boolean>;
  manifest: SyncManifest;
  yearFrom: number;
  yearTo?: number;
  minYear?: number;
  axisResolution: AxisResolution;
  hoveredEventId: string | null;
  cardDensity: CardDensity;
  timeScaleMode?: TimeScaleMode;
  selectedMacroRegion?: MacroRegionId;
  onSelectMacroRegion?: (region: MacroRegionId) => void;
  focusedEvent: EnrichedEvent | null;
  focusScope: FocusScope;
  focusDepth?: FocusDepth;
  focusKeepWindow?: boolean;
  outOfWindowFocusCount?: number;
  focusDistanceMap?: Map<string, number>;
  windowRange?: { from: number; to: number };
  auditUnlinkedMode?: boolean;
  auditCandidateMap?: Map<string, AuditCandidateInfo>;
  onChangeFocusScope: (scope: FocusScope) => void;
  onChangeFocusDepth?: (depth: FocusDepth) => void;
  onToggleFocusKeepWindow?: () => void;
  onToggleFocusEvent: (eventId: string) => void;
  onToggleCollapseParent: (parentId: string) => void;
  onExitFocusMode: () => void;
  onRevealBranches?: (branchIds: string[]) => void;
  highlightedJumpId: string | null;
  onJumpToEvent: (targetEventId: string) => void;
  onHoverEvent: (eventId: string | null) => void;
  onOpenCardModal: (eventId: string) => void;
  onOpenPeriodModal: (rulerId: string) => void;
  onOpenEraModal: (eraId: string) => void;
  onOpenWindowModal?: (from: number, to: number) => void;
  onSelectYearRange: (from: number, to: number) => void;
}

interface HoveredCardTooltipState {
  ev: EnrichedEvent;
  branchLabel: string;
  branchColor: string;
  dateLabel: string;
  mode: 'full' | 'supplemental';
  rect: { top: number; bottom: number; left: number; width: number };
}

const RESOLUTION_LABELS: Record<AxisResolution, string> = {
  year: 'Годы',
  month: 'Месяцы (окно ≤ 12 л.)',
  day: 'Дни и точные даты (окно ≤ 2 л.)',
};

type NodeVisualKind = 'milestone' | 'process' | 'biography';

interface NodeVisualStatusMeta {
  kind: NodeVisualKind;
  symbol: '◆' | '●' | '◈';
  kindLabel: string;
  shortKindLabel: string;
  durationLabel: string;
  compactDurationLabel: string;
  spanRangeLabel: string;
  trackStartPct: number;
  trackWidthPct: number;
  secondaryTrackLabel?: string;
}

function formatDurationYearsRu(years: number): string {
  const n = Math.max(1, Math.round(years));
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 19) return `${n} лет`;
  if (mod10 === 1) return `${n} год`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} года`;
  return `${n} лет`;
}

function computeNodeVisualStatusMeta(
  ev: EnrichedEvent,
  isBioNode: boolean,
  isAtomicInView: boolean,
  effStartYear: number,
  effEndYear: number,
): NodeVisualStatusMeta {
  if (isBioNode) {
    const lifeYears = Math.max(1, ev.endYear - ev.startYear);
    const activeYears = Math.max(1, effEndYear - effStartYear);
    const rawStartPct = Math.round(((effStartYear - ev.startYear) / lifeYears) * 100);
    const trackStartPct = Math.max(0, Math.min(82, rawStartPct));
    const rawWidthPct = Math.round((activeYears / lifeYears) * 100);
    const trackWidthPct = Math.max(16, Math.min(100 - trackStartPct, rawWidthPct));
    return {
      kind: 'biography',
      symbol: '◈',
      kindLabel: 'Биография',
      shortKindLabel: 'биогр.',
      durationLabel: `жизнь ${lifeYears} л. · пик ${activeYears} л.`,
      compactDurationLabel: `акт. ${activeYears} л.`,
      spanRangeLabel: `${ev.startYear}–${ev.endYear} (акт. ${effStartYear}–${effEndYear})`,
      trackStartPct,
      trackWidthPct,
      secondaryTrackLabel: `${ev.startYear}–${ev.endYear}`,
    };
  }

  const rawSpanYears = Math.max(0, ev.endYear - ev.startYear);
  if (!isAtomicInView || rawSpanYears > 1) {
    const spanYears = Math.max(1, rawSpanYears);
    const trackWidthPct = Math.max(
      20,
      Math.min(100, Math.round(Math.sqrt(spanYears / 45) * 100)),
    );
    return {
      kind: 'process',
      symbol: '●',
      kindLabel: 'Процесс',
      shortKindLabel: 'процесс',
      durationLabel: `${ev.startYear}–${ev.endYear} · ${formatDurationYearsRu(spanYears)}`,
      compactDurationLabel: `${spanYears} л.`,
      spanRangeLabel: `${ev.startYear}–${ev.endYear}`,
      trackStartPct: 0,
      trackWidthPct,
    };
  }

  return {
    kind: 'milestone',
    symbol: '◆',
    kindLabel: 'Веха',
    shortKindLabel: 'веха',
    durationLabel: rawSpanYears === 1 ? `${ev.startYear}–${ev.endYear} · 1 год` : 'Точечное событие (≤ 1 года)',
    compactDurationLabel: 'веха',
    spanRangeLabel: `${ev.startYear}`,
    trackStartPct: 0,
    trackWidthPct: 0,
  };
}

export const GitTimeline = memo(function GitTimeline({
  stream,
  matchingEvents,
  matchingRulers,
  rulers,
  visibleLanes,
  branches,
  activeBranches,
  collapsedParents,
  manifest,
  yearFrom,
  yearTo,
  minYear = 862,
  axisResolution,
  hoveredEventId,
  cardDensity,
  timeScaleMode = 'compact',
  selectedMacroRegion = 'all',
  onSelectMacroRegion,
  focusedEvent,
  focusScope,
  focusDepth = 1,
  focusKeepWindow = false,
  outOfWindowFocusCount = 0,
  focusDistanceMap,
  windowRange,
  auditUnlinkedMode = false,
  auditCandidateMap,
  onChangeFocusScope,
  onChangeFocusDepth,
  onToggleFocusKeepWindow,
  onToggleFocusEvent,
  onToggleCollapseParent,
  onExitFocusMode,
  onRevealBranches,
  highlightedJumpId,
  onJumpToEvent,
  onHoverEvent,
  onOpenCardModal,
  onOpenPeriodModal,
  onOpenEraModal,
  onOpenWindowModal,
  onSelectYearRange,
}: GitTimelineProps) {
  const streamContainerRef = useRef<HTMLDivElement | null>(null);
  const graphHelpRef = useRef<HTMLDivElement | null>(null);
  const hoverClearTimerRef = useRef<number | null>(null);
  const tooltipOpenTimerRef = useRef<number | null>(null);
  const hoverActivateTimerRef = useRef<number | null>(null);
  const [localHoveredEventId, setLocalHoveredEventId] = useState<string | null>(null);
  const [activeStickyRulerId, setActiveStickyRulerId] = useState<string | null>(null);
  const [hoveredCardTooltip, setHoveredCardTooltip] = useState<HoveredCardTooltipState | null>(null);
  const [isGraphHelpOpen, setIsGraphHelpOpen] = useState(false);
  const [pinnedHoverEventId, setPinnedHoverEventId] = useState<string | null>(null);
  const [localJumpDomId, setLocalJumpDomId] = useState<string | null>(null);
  const localJumpTimerRef = useRef<number | null>(null);

  const cancelScheduledTooltip = () => {
    if (tooltipOpenTimerRef.current !== null) {
      window.clearTimeout(tooltipOpenTimerRef.current);
      tooltipOpenTimerRef.current = null;
    }
  };

  const closeCardTooltip = () => {
    cancelScheduledTooltip();
    setHoveredCardTooltip(null);
  };

  const triggerScrollToDomRow = (domId: string, eventId: string) => {
    const el = document.getElementById(domId);
    if (!el) return;
    closeCardTooltip();
    activateHoverEvent(eventId);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setLocalJumpDomId(domId);
    if (localJumpTimerRef.current !== null) {
      window.clearTimeout(localJumpTimerRef.current);
    }
    localJumpTimerRef.current = window.setTimeout(() => {
      setLocalJumpDomId(null);
      localJumpTimerRef.current = null;
    }, 2200);
  };

  const cancelScheduledHoverClear = () => {
    if (hoverClearTimerRef.current !== null) {
      window.clearTimeout(hoverClearTimerRef.current);
      hoverClearTimerRef.current = null;
    }
    if (hoverActivateTimerRef.current !== null) {
      window.clearTimeout(hoverActivateTimerRef.current);
      hoverActivateTimerRef.current = null;
    }
  };

  const activateHoverEvent = (eventId: string) => {
    cancelScheduledHoverClear();
    setLocalHoveredEventId((prev) => (prev === eventId ? prev : eventId));
    hoverActivateTimerRef.current = window.setTimeout(() => {
      onHoverEvent(eventId);
      hoverActivateTimerRef.current = null;
    }, 85);
  };

  const scheduleClearHoverEvent = () => {
    cancelScheduledHoverClear();
    hoverClearTimerRef.current = window.setTimeout(() => {
      setLocalHoveredEventId(null);
      onHoverEvent(null);
      hoverClearTimerRef.current = null;
    }, 220);
  };

  useEffect(() => {
    return () => {
      cancelScheduledHoverClear();
      cancelScheduledTooltip();
      if (localJumpTimerRef.current !== null) {
        window.clearTimeout(localJumpTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!pinnedHoverEventId) return;
    if (!matchingEvents.some((e) => e.id === pinnedHoverEventId)) {
      setPinnedHoverEventId(null);
    }
  }, [matchingEvents, pinnedHoverEventId]);

  useEffect(() => {
    if (!isGraphHelpOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (graphHelpRef.current && !graphHelpRef.current.contains(e.target as Node)) {
        setIsGraphHelpOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsGraphHelpOpen(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isGraphHelpOpen]);

  const defaultStickyRulerId = useMemo(() => {
    if (matchingRulers.length > 0) return matchingRulers[0].id;
    if (matchingEvents.length > 0 && matchingEvents[0].overlappingRulers.length > 0) {
      return matchingEvents[0].overlappingRulers[0].id;
    }
    return rulers[0]?.id ?? null;
  }, [matchingRulers, matchingEvents, rulers]);

  useEffect(() => {
    setActiveStickyRulerId(defaultStickyRulerId);
    closeCardTooltip();
  }, [defaultStickyRulerId, stream.length, cardDensity]);

  useEffect(() => {
    const handleClear = () => closeCardTooltip();
    window.addEventListener('scroll', handleClear, { passive: true });
    window.addEventListener('resize', handleClear, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleClear);
      window.removeEventListener('resize', handleClear);
    };
  }, []);

  useEffect(() => {
    const container = streamContainerRef.current;
    if (!container) return;

    const visibleMap = new Map<Element, { rId: string; top: number }>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const rId = entry.target.getAttribute('data-ruler-context');
          if (!rId) return;
          if (entry.isIntersecting) {
            visibleMap.set(entry.target, {
              rId,
              top: entry.boundingClientRect.top,
            });
          } else {
            visibleMap.delete(entry.target);
          }
        });

        if (visibleMap.size > 0) {
          let matchedId: string | null = null;
          let bestDist = Number.POSITIVE_INFINITY;
          visibleMap.forEach((meta) => {
            const dist = Math.abs(meta.top - 132);
            if (dist < bestDist) {
              bestDist = dist;
              matchedId = meta.rId;
            }
          });
          if (matchedId) {
            const nextId = matchedId;
            setActiveStickyRulerId((prev) => (prev === nextId ? prev : nextId));
          }
        }
      },
      {
        root: null,
        rootMargin: '-115px 0px -65% 0px',
        threshold: 0,
      },
    );

    const anchors = container.querySelectorAll('[data-ruler-context]');
    anchors.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [stream, cardDensity]);

  const activeStickyRuler = useMemo(
    () => rulers.find((r) => r.id === (activeStickyRulerId || defaultStickyRulerId)) ?? null,
    [rulers, activeStickyRulerId, defaultStickyRulerId],
  );

  const resolvedEras = useMemo(() => resolveMacroEras(manifest.macroEras), [manifest.macroEras]);

  const activeStickyEra: ResolvedMacroEra | null = useMemo(() => {
    if (!activeStickyRuler) return null;
    const byId = resolvedEras.find((e) => e.id === activeStickyRuler.eraId);
    if (byId) return byId;
    const midYear = Math.round((activeStickyRuler.startYear + activeStickyRuler.endYear) / 2);
    return findMacroEraForYear(midYear, resolvedEras) ?? null;
  }, [activeStickyRuler, resolvedEras]);

  const activeStickyRulerEventCount = useMemo(() => {
    if (!activeStickyRuler) return 0;
    return matchingEvents.filter((ev) => ev.overlappingRulers.some((r) => r.id === activeStickyRuler.id)).length;
  }, [activeStickyRuler, matchingEvents]);

  // Трёхзонная геометрия графа: [Правители (динамические рельсы)] | [Центральная ось времени] | [Тематические ветки]
  const hasRulersLane = visibleLanes.some((l) => l.id === 'MAIN_RULERS');
  const thematicLanes = useMemo(
    () => visibleLanes.filter((l) => l.id !== 'MAIN_RULERS' && l.id !== 'TIME_AXIS'),
    [visibleLanes],
  );

  const rulerLayout = useMemo(
    () => computeRulerSubLaneLayout(matchingRulers, hasRulersLane),
    [matchingRulers, hasRulersLane],
  );

  const timeSpineX = rulerLayout.timeSpineX;

  const subLaneLayout = useMemo(
    () =>
      computeBranchSubLaneLayout(
        matchingEvents,
        thematicLanes,
        branches,
        axisResolution,
        timeSpineX,
        { collapsedParents },
      ),
    [matchingEvents, thematicLanes, branches, axisResolution, timeSpineX, collapsedParents],
  );

  const svgWidth = subLaneLayout.totalSvgWidth;

  const eventStreamBounds = useMemo(() => {
    const byId = new Map<string, { commitIdx: number; endIdx: number; ev: EnrichedEvent }>();
    stream.forEach((row, rowIdx) => {
      if (row.rowType === 'EVENT_COMMIT' && !row.isAtomicInView) {
        byId.set(row.eventObj.id, {
          commitIdx: rowIdx,
          endIdx: Number.POSITIVE_INFINITY,
          ev: row.eventObj,
        });
      } else if (row.rowType === 'EVENT_END') {
        const entry = byId.get(row.eventObj.id);
        if (entry) {
          entry.endIdx = rowIdx;
        }
      }
    });
    return Array.from(byId.values());
  }, [stream]);

  const getEventX = (ev: EnrichedEvent, isAtomic = false) => {
    const branchObj = resolveEventBranch(ev, branches, collapsedParents);
    const laneInfo = subLaneLayout.branchLayouts.get(branchObj.id);
    const baseX = laneInfo?.baseX ?? timeSpineX + 28;
    if (isAtomic) return baseX;
    const slot = subLaneLayout.slotByEventId.get(ev.id) ?? 0;
    return laneInfo?.subXs[slot] ?? baseX + slot * 10;
  };

  const expandedCollapsibleParents = useMemo(
    () =>
      branches.filter((p) => {
        if (!hasChildBranches(p.id, branches) || collapsedParents[p.id]) return false;
        const activeChildren = getDirectChildBranches(p.id, branches).filter((child) =>
          isBranchOrDescendantActive(child, branches, activeBranches),
        );
        return activeChildren.length >= 2;
      }),
    [branches, activeBranches, collapsedParents],
  );

  const rulerSortBounds = useMemo(() => {
    const map = new Map<string, { startKey: number; endKey: number }>();
    matchingRulers.forEach((r) => {
      const startParts = parsePreciseDate(r.startDate, r.startYear, false, {
        calendarStyle: r.calendarStyle,
        task: 'MAIN_RULERS',
      });
      const endParts = parsePreciseDate(r.endDate, r.endYear, true, {
        calendarStyle: r.calendarStyle,
        task: 'MAIN_RULERS',
      });
      map.set(r.id, { startKey: startParts.sortKey, endKey: endParts.sortKey });
    });
    return map;
  }, [matchingRulers]);

  const alreadyRunningEvents = useMemo(
    () =>
      !focusedEvent
        ? matchingEvents.filter(
            (ev) => ev.startYear < yearFrom && isHistoricalEventNode(ev, branches),
          )
        : [],
    [focusedEvent, matchingEvents, yearFrom, branches],
  );

  const alreadyRunningGroups = useMemo(() => {
    if (alreadyRunningEvents.length === 0) return [];
    const wars: EnrichedEvent[] = [];
    const economy: EnrichedEvent[] = [];
    const diplomacyAndWorld: EnrichedEvent[] = [];

    alreadyRunningEvents.forEach((ev) => {
      if (isMajorCampaignOrConflictNode(ev, branches)) {
        wars.push(ev);
      } else if (
        ev.task.includes('ECO') ||
        ev.task.includes('REFORM') ||
        ev.eventType === 'economy' ||
        ev.eventType === 'reform'
      ) {
        economy.push(ev);
      } else {
        diplomacyAndWorld.push(ev);
      }
    });

    return [
      { id: 'wars', label: 'Войны и конфликты', items: wars },
      { id: 'eco', label: 'Экономика и реформы', items: economy },
      { id: 'world', label: 'Дипломатия и мир', items: diplomacyAndWorld },
    ].filter((g) => g.items.length > 0);
  }, [alreadyRunningEvents, branches]);

  const contemporaryBioGroups = useMemo(() => {
    if (focusedEvent) return [];
    const writers = matchingEvents.filter((ev) => isWriterBioNode(ev, branches));
    const scientists = matchingEvents.filter((ev) => isScientistBioNode(ev, branches));
    return [
      {
        id: 'writers',
        label: 'Писатели и летописцы',
        color: '#e879f9',
        items: writers,
      },
      {
        id: 'scientists',
        label: 'Учёные и изобретатели',
        color: '#2dd4bf',
        items: scientists,
      },
    ].filter((g) => g.items.length > 0);
  }, [focusedEvent, matchingEvents, branches]);

  const totalContemporaryBios = useMemo(
    () => contemporaryBioGroups.reduce((sum, g) => sum + g.items.length, 0),
    [contemporaryBioGroups],
  );

  const gutterWidthClass =
    axisResolution === 'day'
      ? 'hidden sm:flex sm:w-[116px]'
      : axisResolution === 'month'
        ? 'hidden sm:flex sm:w-[96px]'
        : 'hidden sm:flex sm:w-[68px]';

  const gutterMeta = useMemo(() => {
    let prevLabel = '';
    return stream.map((item) => {
      const info = formatAxisGutterDate(item, axisResolution);
      const isDuplicate = info.label === prevLabel && item.rowType !== 'ERA_START';
      prevLabel = info.label;
      return { ...info, isDuplicate };
    });
  }, [stream, axisResolution]);

  const rowIndexByEventId = useMemo(() => {
    const map = new Map<string, number>();
    stream.forEach((row, idx) => {
      if (row.rowType === 'EVENT_COMMIT') {
        map.set(row.eventObj.id, idx);
      }
    });
    return map;
  }, [stream]);

  const eventsWithEndRowInStream = useMemo(() => {
    const set = new Set<string>();
    stream.forEach((row) => {
      if (row.rowType === 'EVENT_END') {
        set.add(row.eventObj.id);
      }
    });
    return set;
  }, [stream]);

  const effectiveActiveEventId = pinnedHoverEventId || localHoveredEventId || hoveredEventId;
  const hoveredEvent = effectiveActiveEventId
    ? (matchingEvents.find((e) => e.id === effectiveActiveEventId) ?? null)
    : null;
  const linkedEventIds = new Set<string>();
  if (hoveredEvent) {
    hoveredEvent.explicitLinks.forEach((lnk) => {
      linkedEventIds.add(lnk.targetEvent.id);
    });
  } else if (effectiveActiveEventId) {
    (manifest.crossLinks || []).forEach((lnk) => {
      if (lnk.from === effectiveActiveEventId) linkedEventIds.add(lnk.to);
      if (lnk.to === effectiveActiveEventId) linkedEventIds.add(lnk.from);
    });
  }

  const buildLinkGeometryForEvent = (sourceEvent: EnrichedEvent | null, requireInStream: boolean) => {
    if (!sourceEvent) return null;
    const sourceRowIdx = rowIndexByEventId.get(sourceEvent.id);
    if (requireInStream && sourceRowIdx === undefined) return null;

    let minSpanIdx = sourceRowIdx ?? Number.POSITIVE_INFINITY;
    let maxSpanIdx = sourceRowIdx ?? -1;
    const seenTargetIds = new Set<string>();
    const items: Array<{
      targetEvent: EnrichedEvent;
      branchLabel: string;
      branchShort: string;
      branchColor: string;
      targetRowIdx: number | undefined;
      directionOnStream: 'up' | 'down' | 'same' | 'off_stream';
      yearDelta: number;
      rowDelta: number | null;
      linkLabel: string;
      isHiddenBranch: boolean;
    }> = [];

    const branchMap = new Map(branches.map((b) => [b.id, b]));

    sourceEvent.explicitLinks.forEach((lnk) => {
      const t = lnk.targetEvent;
      if (seenTargetIds.has(t.id)) return;
      seenTargetIds.add(t.id);

      const tRowIdx = rowIndexByEventId.get(t.id);
      if (tRowIdx !== undefined) {
        if (tRowIdx < minSpanIdx) minSpanIdx = tRowIdx;
        if (tRowIdx > maxSpanIdx) maxSpanIdx = tRowIdx;
      }

      const tb = branchMap.get(t.task);
      const directionOnStream =
        tRowIdx === undefined
          ? 'off_stream'
          : sourceRowIdx === undefined
            ? 'down'
            : tRowIdx < sourceRowIdx
              ? 'up'
              : tRowIdx > sourceRowIdx
                ? 'down'
                : 'same';

      items.push({
        targetEvent: t,
        branchLabel: tb?.label || t.task,
        branchShort: tb?.short || tb?.label || t.task,
        branchColor: tb?.color || '#34d399',
        targetRowIdx: tRowIdx,
        directionOnStream,
        yearDelta: t.startYear - sourceEvent.startYear,
        rowDelta: sourceRowIdx !== undefined && tRowIdx !== undefined ? Math.abs(tRowIdx - sourceRowIdx) : null,
        linkLabel: lnk.label,
        isHiddenBranch: activeBranches[t.task] === false,
      });
    });

    if (items.length === 0) return null;

    items.sort((a, b) => {
      if (a.targetRowIdx !== undefined && b.targetRowIdx !== undefined) {
        return a.targetRowIdx - b.targetRowIdx;
      }
      if (a.targetRowIdx !== undefined) return -1;
      if (b.targetRowIdx !== undefined) return 1;
      return a.targetEvent.startYear - b.targetEvent.startYear;
    });

    return {
      sourceEvent,
      sourceRowIdx: sourceRowIdx ?? -1,
      minSpanIdx,
      maxSpanIdx,
      hasSpanOnCanvas: sourceRowIdx !== undefined && minSpanIdx < maxSpanIdx,
      upItems: items.filter((i) => i.directionOnStream === 'up'),
      downItems: items.filter((i) => i.directionOnStream === 'down' || i.directionOnStream === 'same'),
      offStreamItems: items.filter((i) => i.directionOnStream === 'off_stream'),
      totalCount: items.length,
    };
  };

  const activeLinkGeometry = useMemo(
    () => buildLinkGeometryForEvent(hoveredEvent, true),
    [hoveredEvent, rowIndexByEventId, branches, activeBranches],
  );

  const inspectorSourceEvent = hoveredEvent ?? focusedEvent ?? null;
  const inspectorLinkGeometry = useMemo(
    () => buildLinkGeometryForEvent(inspectorSourceEvent, false),
    [inspectorSourceEvent, rowIndexByEventId, branches, activeBranches],
  );

  const linkedEventsInWindowCount = useMemo(
    () => matchingEvents.filter((ev) => ev.explicitLinks.length > 0).length,
    [matchingEvents],
  );

  const topLinkedEventsInWindow = useMemo(() => {
    const branchMap = new Map(branches.map((b) => [b.id, b]));
    return matchingEvents
      .filter((ev) => ev.explicitLinks.length > 0)
      .slice()
      .sort((a, b) => {
        const aInStream = rowIndexByEventId.has(a.id) ? 0 : 1;
        const bInStream = rowIndexByEventId.has(b.id) ? 0 : 1;
        if (aInStream !== bInStream) return aInStream - bInStream;
        if (b.explicitLinks.length !== a.explicitLinks.length) {
          return b.explicitLinks.length - a.explicitLinks.length;
        }
        return a.startYear - b.startYear;
      })
      .slice(0, 5)
      .map((ev) => {
        const br = branchMap.get(ev.task);
        return {
          ev,
          branchLabel: br?.label || ev.task,
          branchColor: br?.color || '#34d399',
          inStream: rowIndexByEventId.has(ev.id),
        };
      });
  }, [matchingEvents, branches, rowIndexByEventId]);

  const effectiveSliceEndYear = yearTo ?? windowRange?.to ?? yearFrom;

  const connectorBusX = timeSpineX + 9;

  function renderRailsForRow(
    rowIdx: number,
    sortKey: number,
    options?: {
      skipRulerId?: string;
    },
  ) {
    const showVerticalBusSegment =
      activeLinkGeometry !== null &&
      activeLinkGeometry.hasSpanOnCanvas &&
      rowIdx >= activeLinkGeometry.minSpanIdx &&
      rowIdx <= activeLinkGeometry.maxSpanIdx;

    return (
      <>
        {hasRulersLane && (
          <g>
            {rulerLayout.railXs.map((rx, slotIdx) => {
              const activeInSlot = matchingRulers.find((r) => {
                if (r.id === options?.skipRulerId) return false;
                if ((rulerLayout.slotByRulerId.get(r.id) ?? 0) !== slotIdx) return false;
                const b = rulerSortBounds.get(r.id);
                return b ? b.startKey <= sortKey && b.endKey >= sortKey : false;
              });

              if (activeInSlot) {
                const slotColor = rulerLayout.colorByRulerId.get(activeInSlot.id) ?? '#f59e0b';
                return (
                  <line
                    key={`ruler-rail-${slotIdx}`}
                    x1={rx}
                    y1={0}
                    x2={rx}
                    y2={420}
                    stroke={slotColor}
                    strokeWidth={3}
                    strokeOpacity={0.65}
                  />
                );
              }

              return (
                <line
                  key={`ruler-rail-${slotIdx}`}
                  x1={rx}
                  y1={0}
                  x2={rx}
                  y2={420}
                  stroke="#f59e0b"
                  strokeWidth={1.1}
                  strokeOpacity={0.14}
                  strokeDasharray="3 4"
                />
              );
            })}
          </g>
        )}

        {/* Центральный ствол времени (time/main) */}
        <line
          x1={timeSpineX}
          y1={0}
          x2={timeSpineX}
          y2={420}
          stroke="#cbd5e1"
          strokeWidth={3.2}
          strokeOpacity={0.85}
        />

        {/* Вертикальная шина связей вдоль оси при наведении на карточку */}
        {showVerticalBusSegment && activeLinkGeometry && (
          <line
            x1={connectorBusX}
            y1={rowIdx === activeLinkGeometry.minSpanIdx ? 22 : 0}
            x2={connectorBusX}
            y2={rowIdx === activeLinkGeometry.maxSpanIdx ? 22 : 420}
            stroke="#10b981"
            strokeWidth={2.2}
            strokeDasharray="4 3"
            strokeOpacity={0.9}
          />
        )}

        {/* Тематические ветки и их динамические под-нити справа от оси времени */}
        {thematicLanes.map((lane) => {
          const laneInfo = subLaneLayout.branchLayouts.get(lane.id);
          const baseX = laneInfo?.baseX ?? timeSpineX + 28;

          const passingEvents = eventStreamBounds.filter(
            (entry) =>
              resolveEventBranch(entry.ev, branches, collapsedParents).id === lane.id &&
              entry.commitIdx < rowIdx &&
              rowIdx < entry.endIdx,
          );

          const hasBasePassing = passingEvents.some(
            (entry) => (subLaneLayout.slotByEventId.get(entry.ev.id) ?? 0) === 0,
          );

          return (
            <g key={lane.id}>
              {!hasBasePassing && (
                <line
                  x1={baseX}
                  y1={0}
                  x2={baseX}
                  y2={420}
                  stroke={lane.color}
                  strokeWidth={1.3}
                  strokeOpacity={0.22}
                  strokeDasharray="4 4"
                />
              )}

              {passingEvents.map((entry) => {
                const slot = subLaneLayout.slotByEventId.get(entry.ev.id) ?? 0;
                const x = laneInfo?.subXs[slot] ?? baseX + slot * 10;
                const isBioRail = isBiographyNode(entry.ev, branches);
                const isSelfHovered = effectiveActiveEventId === entry.ev.id;
                const isLinkedHovered =
                  effectiveActiveEventId !== null && linkedEventIds.has(entry.ev.id);
                const isDimmed =
                  effectiveActiveEventId !== null && !isSelfHovered && !isLinkedHovered;

                return (
                  <g key={`rail-${entry.ev.id}`}>
                    {(isSelfHovered || isLinkedHovered) && (
                      <line
                        x1={x}
                        y1={0}
                        x2={x}
                        y2={420}
                        stroke={isLinkedHovered && !isSelfHovered ? '#34d399' : lane.color}
                        strokeWidth={6.5}
                        strokeOpacity={0.28}
                      />
                    )}
                    <line
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={420}
                      stroke={isLinkedHovered && !isSelfHovered ? '#34d399' : lane.color}
                      strokeWidth={
                        isSelfHovered
                          ? 3.6
                          : isLinkedHovered
                            ? 3.2
                            : isBioRail
                              ? 2.1
                              : 2.6
                      }
                      strokeDasharray={isBioRail && !isSelfHovered && !isLinkedHovered ? '6 3' : undefined}
                      strokeOpacity={
                        isSelfHovered || isLinkedHovered
                          ? 1
                          : isDimmed
                            ? 0.28
                            : isBioRail
                              ? 0.5
                              : 0.65
                      }
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </>
    );
  }

  const mobileSpineWidth = 36;
  const mobileSpineX = 16;
  const mobileConnectorBusX = 27;

  function renderMobileSpineCell(
    rowIdx: number,
    options: {
      kind: 'era' | 'tick' | 'ruler_start' | 'ruler_end' | 'event_commit' | 'event_end';
      color?: string;
      isAtomic?: boolean;
      isBioNode?: boolean;
      isCompact?: boolean;
      isSelfHovered?: boolean;
      isConnectedToBus?: boolean;
      startedBeforeWindow?: boolean;
    },
  ) {
    const showVerticalBusSegment =
      activeLinkGeometry !== null &&
      activeLinkGeometry.hasSpanOnCanvas &&
      rowIdx >= activeLinkGeometry.minSpanIdx &&
      rowIdx <= activeLinkGeometry.maxSpanIdx;
    const nodeColor = options.color ?? '#f59e0b';
    const commitY = options.kind === 'event_commit' ? (options.isCompact ? 22 : 28) : 22;

    return (
      <div className="sm:hidden w-[36px] shrink-0 relative select-none overflow-hidden">
        <svg className="w-full h-full absolute inset-0" width={mobileSpineWidth} height="100%">
          {/* Компактный центральный ствол времени */}
          <line
            x1={mobileSpineX}
            y1={0}
            x2={mobileSpineX}
            y2={420}
            stroke="#cbd5e1"
            strokeWidth={2.6}
            strokeOpacity={0.78}
          />

          {/* Шина активных связей при наведении / фокусе */}
          {showVerticalBusSegment && activeLinkGeometry && (
            <line
              x1={mobileConnectorBusX}
              y1={rowIdx === activeLinkGeometry.minSpanIdx ? 22 : 0}
              x2={mobileConnectorBusX}
              y2={rowIdx === activeLinkGeometry.maxSpanIdx ? 22 : 420}
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="4 3"
              strokeOpacity={0.9}
            />
          )}

          {options.kind === 'era' && (
            <>
              <line
                x1={mobileSpineX + 8}
                y1={36}
                x2={mobileSpineWidth}
                y2={36}
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                strokeOpacity={0.7}
              />
              <circle cx={mobileSpineX} cy={36} r={9} fill="#050811" stroke="#cbd5e1" strokeWidth={2.6} />
              <circle cx={mobileSpineX} cy={36} r={4} fill="#f59e0b" />
            </>
          )}

          {options.kind === 'tick' && (
            <>
              <line
                x1={mobileSpineX + 4}
                y1={14}
                x2={mobileSpineWidth}
                y2={14}
                stroke="#475569"
                strokeWidth={1}
                strokeDasharray="2 3"
                strokeOpacity={0.55}
              />
              <circle cx={mobileSpineX} cy={14} r={3.2} fill="#050811" stroke="#94a3b8" strokeWidth={1.8} />
            </>
          )}

          {options.kind === 'ruler_start' && (
            <>
              <line
                x1={mobileSpineX - 7}
                y1={options.startedBeforeWindow ? 0 : 28}
                x2={mobileSpineX - 7}
                y2={420}
                stroke={nodeColor}
                strokeWidth={2.4}
                strokeOpacity={0.6}
              />
              <line
                x1={mobileSpineX + 6}
                y1={28}
                x2={mobileSpineWidth}
                y2={28}
                stroke={nodeColor}
                strokeWidth={1.4}
                strokeDasharray="3 3"
                strokeOpacity={0.55}
              />
              <circle cx={mobileSpineX} cy={28} r={5.5} fill="#050811" stroke={nodeColor} strokeWidth={2.6} />
              <circle cx={mobileSpineX} cy={28} r={2.2} fill={nodeColor} />
            </>
          )}

          {options.kind === 'ruler_end' && (
            <>
              <line
                x1={mobileSpineX - 7}
                y1={0}
                x2={mobileSpineX - 7}
                y2={22}
                stroke={nodeColor}
                strokeWidth={2.4}
                strokeOpacity={0.6}
              />
              <rect
                x={mobileSpineX - 4}
                y={18}
                width={8}
                height={8}
                rx={2}
                fill="#050811"
                stroke={nodeColor}
                strokeWidth={2.2}
              />
            </>
          )}

          {options.kind === 'event_commit' && (
            <>
              {options.isConnectedToBus && (
                <g>
                  <line
                    x1={mobileSpineX}
                    y1={commitY}
                    x2={mobileConnectorBusX}
                    y2={commitY}
                    stroke="#10b981"
                    strokeWidth={1.8}
                  />
                  <circle
                    cx={mobileConnectorBusX}
                    cy={commitY}
                    r={3.2}
                    fill={options.isSelfHovered ? '#10b981' : '#050811'}
                    stroke="#10b981"
                    strokeWidth={1.8}
                  />
                </g>
              )}

              {!options.isAtomic && (
                <line
                  x1={mobileSpineX + 5}
                  y1={options.startedBeforeWindow ? 0 : commitY}
                  x2={mobileSpineX + 5}
                  y2={420}
                  stroke={nodeColor}
                  strokeWidth={options.isSelfHovered ? 2.6 : 1.8}
                  strokeDasharray={options.isBioNode ? '4 2' : undefined}
                  strokeOpacity={options.isSelfHovered ? 0.95 : 0.45}
                />
              )}

              <line
                x1={mobileSpineX + 6}
                y1={commitY}
                x2={mobileSpineWidth}
                y2={commitY}
                stroke={nodeColor}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                strokeOpacity={options.isSelfHovered ? 1 : 0.6}
              />

              {options.isAtomic || options.isBioNode ? (
                <g>
                  <polygon
                    points={`${mobileSpineX},${commitY - 6.5} ${mobileSpineX + 6.5},${commitY} ${mobileSpineX},${commitY + 6.5} ${mobileSpineX - 6.5},${commitY}`}
                    fill="#050811"
                    stroke={nodeColor}
                    strokeWidth={2.3}
                  />
                  <circle cx={mobileSpineX} cy={commitY} r={1.8} fill={nodeColor} />
                </g>
              ) : (
                <>
                  <circle cx={mobileSpineX} cy={commitY} r={8.5} fill={nodeColor} fillOpacity={0.22} />
                  <circle
                    cx={mobileSpineX}
                    cy={commitY}
                    r={5}
                    fill="#050811"
                    stroke={nodeColor}
                    strokeWidth={2.5}
                  />
                  <circle cx={mobileSpineX} cy={commitY} r={2} fill={nodeColor} />
                </>
              )}
            </>
          )}

          {options.kind === 'event_end' && (
            <>
              <line
                x1={mobileSpineX + 5}
                y1={22}
                x2={mobileSpineWidth}
                y2={22}
                stroke={nodeColor}
                strokeWidth={1.3}
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <rect
                x={mobileSpineX - 4.5}
                y={17.5}
                width={9}
                height={9}
                rx={2}
                fill="#050811"
                stroke={nodeColor}
                strokeWidth={2.3}
              />
            </>
          )}
        </svg>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full xl:grid xl:grid-cols-[minmax(0,1fr)_316px] xl:gap-5 xl:items-start">
      <div className="min-w-0">
      <div className="sticky top-[var(--top-bar-height,49px)] z-30 bg-[#050811]/95 backdrop-blur-md border border-slate-800/90 rounded-t-2xl shadow-md">
        <div className="px-3 sm:px-5 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar min-w-0">
            {visibleLanes.map((lane, laneIdx) => {
              const isTimeAxis = lane.id === 'TIME_AXIS';
              const subCount =
                lane.id === 'MAIN_RULERS'
                  ? rulerLayout.laneCount
                  : (subLaneLayout.branchLayouts.get(lane.id)?.subLaneCount ?? 1);
              const isCollapsedParentLane =
                hasChildBranches(lane.id, branches) && Boolean(collapsedParents[lane.id]);

              if (isCollapsedParentLane) {
                const activeChildCount = getDirectChildBranches(lane.id, branches).filter((child) =>
                  isBranchOrDescendantActive(child, branches, activeBranches),
                ).length;

                return (
                  <button
                    key={lane.id}
                    type="button"
                    onClick={() => onToggleCollapseParent(lane.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/50 text-xs font-sans text-amber-100 shrink-0 cursor-pointer transition-colors"
                    title={`${lane.label}: свёрнуто веток (${activeChildCount}). Нажмите, чтобы развернуть в отдельные линии.`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lane.color }} />
                    <span className="font-semibold">{lane.label}</span>
                    {subCount > 1 && (
                      <span className="font-mono text-amber-300 font-bold tabular-nums">×{subCount}</span>
                    )}
                    <GitBranch className="w-3 h-3 text-amber-300 ml-0.5 shrink-0" />
                    <span className="text-amber-300 font-semibold">Развернуть ({activeChildCount})</span>
                  </button>
                );
              }

              return (
                <div
                  key={lane.id}
                  className={`inline-flex items-center gap-1.5 text-xs font-sans shrink-0 whitespace-nowrap ${
                    isTimeAxis ? 'text-white font-semibold' : 'text-slate-300'
                  }`}
                  title={
                    subCount > 1
                      ? `${lane.label}: до ${subCount} параллельных линий в окне`
                      : lane.label
                  }
                >
                  {laneIdx > 0 && (
                    <span aria-hidden="true" className="text-slate-600 mr-0.5">
                      ·
                    </span>
                  )}
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lane.color }} />
                  <span>{lane.label}</span>
                  {subCount > 1 && (
                    <span className="font-mono text-amber-300 font-bold tabular-nums">×{subCount}</span>
                  )}
                </div>
              );
            })}

            {expandedCollapsibleParents.map((parent) => {
              const activeChildCount = getDirectChildBranches(parent.id, branches).filter((child) =>
                isBranchOrDescendantActive(child, branches, activeBranches),
              ).length;
              return (
                <button
                  key={`collapse-${parent.id}`}
                  type="button"
                  onClick={() => onToggleCollapseParent(parent.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 hover:border-amber-400/50 text-xs font-sans text-slate-300 hover:text-amber-200 shrink-0 cursor-pointer transition-colors whitespace-nowrap"
                  title={`Свернуть ${activeChildCount} веток группы «${parent.label}» в одну линию`}
                >
                  <GitMerge className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Свернуть «{parent.label}» ({activeChildCount} → 1)</span>
                </button>
              );
            })}
          </div>

          <div ref={graphHelpRef} className="relative flex items-center gap-2 shrink-0 text-[11px] font-mono text-slate-400">
            {selectedMacroRegion !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/50 text-amber-200 font-semibold">
                <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                <span>{getMacroRegionOption(selectedMacroRegion).shortLabel}</span>
                {onSelectMacroRegion && (
                  <button
                    type="button"
                    onClick={() => onSelectMacroRegion('all')}
                    aria-label="Сбросить фильтр по макрорегиону"
                    title="Сбросить фильтр по макрорегиону"
                    className="ml-0.5 text-amber-300 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            )}
            <span className="hidden md:inline text-slate-300">
              Масштаб оси: <strong className="text-sky-300 font-semibold">{RESOLUTION_LABELS[axisResolution]}</strong>
            </span>
            {timeScaleMode === 'proportional' && (
              <>
                <span aria-hidden="true" className="hidden lg:inline text-slate-400">
                  ·
                </span>
                <span
                  className="hidden lg:inline text-amber-300 font-semibold"
                  title="Включена пропорциональная шкала времени: вертикальные промежутки отражают дистанцию в годах между событиями"
                >
                  шкала: по годам
                </span>
              </>
            )}
            {axisResolution !== 'year' && yearFrom <= 1918 && (yearTo === undefined || yearTo >= 1582) && (
              <>
                <span aria-hidden="true" className="hidden lg:inline text-slate-400">
                  ·
                </span>
                <span
                  className="hidden lg:inline text-amber-300/90 tabular-nums"
                  title="В 1582–1918 годах события старого (юлианского) стиля сдвинуты на единую григорианскую шкалу (+10…+13 дн.) для точного сопоставления с Европой"
                >
                  единая шкала: н. ст.
                </span>
              </>
            )}
            <span aria-hidden="true" className="hidden md:inline text-slate-400">
              ·
            </span>
            <span className="hidden sm:inline text-amber-300/90 font-semibold">Клик — паспорт события</span>
            <button
              type="button"
              onClick={() => setIsGraphHelpOpen((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-sans inline-flex items-center gap-1 transition-colors cursor-pointer ${
                isGraphHelpOpen
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 font-bold'
                  : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:border-slate-500 hover:text-white'
              }`}
              title="Памятка: как читать линии, события и связи хронографа"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Как читать схему</span>
            </button>

            {isGraphHelpOpen && (
              <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-[106px] sm:top-full sm:mt-2 max-w-md sm:max-w-none sm:w-96 mx-auto sm:mx-0 bg-[#090e1c] border border-slate-700/90 rounded-2xl shadow-2xl p-3.5 z-50 text-left space-y-2.5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white">Обозначения на хронографе</span>
                  <button
                    type="button"
                    onClick={() => setIsGraphHelpOpen(false)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                    aria-label="Закрыть памятку"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-[11px] font-sans text-slate-300 space-y-2 leading-snug">
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-1 bg-slate-300 rounded shrink-0" />
                    <span>
                      <strong className="text-white">Ось времени (центр)</strong> — главный хронологический ствол (годы → месяцы → дни).
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-1 bg-amber-400 rounded shrink-0" />
                    <span>
                      <strong className="text-white">Сплошная линия</strong> — длительность правления или исторического процесса (параллельные центры власти и одновременные войны идут по соседним нитям).
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rotate-45 border-2 border-sky-400 bg-slate-950 shrink-0 ml-0.5 mr-1" />
                    <span>
                      <strong className="text-white">Ромб на ветке</strong> — точечное историческое событие, публикация книги, открытие или биография.
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-2 rounded border border-emerald-400 bg-emerald-950/60 shrink-0" />
                    <span>
                      <strong className="text-emerald-300">Изумрудный контур</strong> — причинно-следственная или культурная связь при наведении.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {activeStickyRuler && (
          <div className="px-3 sm:px-5 py-1.5 border-t border-slate-800/80 bg-slate-950/90 flex items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex items-center gap-2 min-w-0 truncate">
              {activeStickyEra && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenEraModal(activeStickyEra.id)}
                    title={`Открыть карточку периода «${activeStickyEra.displayShortTitle}» (${activeStickyEra.period})`}
                    className="text-amber-400 hover:text-amber-200 underline decoration-amber-400/40 underline-offset-2 font-bold shrink-0 cursor-pointer truncate max-w-[200px]"
                  >
                    {activeStickyEra.displayShortTitle}
                  </button>
                  <span aria-hidden="true" className="text-slate-400 shrink-0">
                    ·
                  </span>
                </>
              )}
              <span className="inline-flex items-center gap-1 text-white font-bold truncate">
                <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">{activeStickyRuler.shortRuler}</span>
              </span>
              <span className="text-amber-300/90 tabular-nums shrink-0">{activeStickyRuler.reignPeriod}</span>
              <span className="hidden sm:inline text-slate-400 truncate">· {activeStickyRuler.reignTitle}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline text-slate-400 tabular-nums">
                {activeStickyRulerEventCount} соб.
              </span>
              {!focusedEvent && (
                <button
                  type="button"
                  onClick={() => onSelectYearRange(activeStickyRuler.startYear, activeStickyRuler.endYear)}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors cursor-pointer"
                  title="Отфильтровать временное окно по годам этого правителя"
                >
                  Окно
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenPeriodModal(activeStickyRuler.id)}
                className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 font-semibold transition-colors cursor-pointer"
              >
                Сводка →
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        ref={streamContainerRef}
        className="border-x border-b border-slate-800/90 rounded-b-2xl bg-slate-950/40 divide-y divide-slate-800/50 overflow-hidden"
      >
        {focusedEvent && (
          <div className="bg-emerald-950/35 border-b border-emerald-500/40 px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="inline-flex items-center gap-1.5 text-emerald-300 font-bold">
                  <Crosshair className="w-3.5 h-3.5" />
                  Режим фокуса связей
                </span>
                <span aria-hidden="true" className="text-slate-400">
                  ·
                </span>
                <span className="text-slate-300 tabular-nums">
                  Прямых: {focusedEvent.explicitLinks.length}
                  {focusDepth > 1 && focusDistanceMap
                    ? ` · в цепочке (${focusDepth} ш.): ${Math.max(0, focusDistanceMap.size - 1)}`
                    : ''}
                  {' · '}параллельных: {focusedEvent.concurrentCount ?? focusedEvent.concurrentEvents.length}
                </span>
                {focusKeepWindow && outOfWindowFocusCount > 0 && (
                  <>
                    <span aria-hidden="true" className="text-slate-400">
                      ·
                    </span>
                    <span className="text-amber-300 font-semibold tabular-nums">
                      за окном: {outOfWindowFocusCount}
                    </span>
                  </>
                )}
              </div>
              <div className="text-sm font-bold text-white truncate">
                {focusedEvent.period} — {focusedEvent.title}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {onChangeFocusDepth && (
                <div
                  className="inline-flex items-center rounded-lg bg-slate-950 border border-emerald-500/35 p-0.5 text-[11px] font-mono"
                  role="group"
                  aria-label="Глубина цепочки фокуса"
                >
                  {([1, 2, 3] as FocusDepth[]).map((depth) => (
                    <button
                      key={depth}
                      type="button"
                      onClick={() => onChangeFocusDepth(depth)}
                      className={`px-2 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                        focusDepth === depth
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                      title={`Развернуть граф связей на ${depth} ${depth === 1 ? 'шаг' : 'шага'}`}
                    >
                      {depth} {depth === 1 ? 'шаг' : 'шага'}
                    </button>
                  ))}
                </div>
              )}

              <div className="inline-flex items-center rounded-lg bg-slate-950 border border-emerald-500/35 p-0.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => onChangeFocusScope('sync_only')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    focusScope === 'sync_only'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Только связи ({focusedEvent.explicitLinks.length})
                </button>
                <button
                  type="button"
                  onClick={() => onChangeFocusScope('sync_and_concurrent')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    focusScope === 'sync_and_concurrent'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Связи и параллельные ({focusedEvent.concurrentCount ?? focusedEvent.concurrentEvents.length})
                </button>
              </div>

              {onToggleFocusKeepWindow && (
                <button
                  type="button"
                  onClick={onToggleFocusKeepWindow}
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                    focusKeepWindow
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 hover:bg-amber-500/25'
                      : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
                  }`}
                  title={
                    focusKeepWindow
                      ? 'Текущее окно лет зафиксировано (масштаб оси сохранён). Нажмите, чтобы раскрыть все годы цепочки.'
                      : 'Удерживать текущее окно лет и детализацию оси, отсекая дальние ретроспективные отсылки.'
                  }
                >
                  {focusKeepWindow ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        Окно: {windowRange ? `${windowRange.from}–${windowRange.to}` : 'удержано'}
                      </span>
                    </>
                  ) : (
                    <>
                      <LockOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Удерживать окно</span>
                    </>
                  )}
                </button>
              )}

              {focusKeepWindow && outOfWindowFocusCount > 0 && onToggleFocusKeepWindow && (
                <button
                  type="button"
                  onClick={onToggleFocusKeepWindow}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-mono font-bold transition-colors cursor-pointer whitespace-nowrap"
                  title="Снять удержание окна, чтобы увидеть дальние связи вне выбранного интервала"
                >
                  Раскрыть все годы
                </button>
              )}

              <button
                type="button"
                onClick={onExitFocusMode}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-mono font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                title="Выйти из режима фокуса и вернуться к общему графику (Esc)"
              >
                <X className="w-3.5 h-3.5" />
                <span>Выйти (Esc)</span>
              </button>
            </div>
          </div>
        )}

        {yearFrom > minYear && alreadyRunningGroups.length > 0 && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 space-y-2 font-sans">
            <div className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="tabular-nums">
                Сквозные процессы, начавшиеся до <span className="font-mono">{yearFrom}</span> г. и продолжающиеся в окне (
                <span className="font-mono">{alreadyRunningEvents.length}</span>):
              </span>
            </div>
            <div className="space-y-1.5">
              {alreadyRunningGroups.map((group) => (
                <div key={group.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
                  <span className="text-xs font-bold text-amber-300/90 shrink-0">
                    {group.label}:
                  </span>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-amber-100">
                    {group.items.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => onOpenCardModal(e.id)}
                        className="underline decoration-amber-400/50 hover:text-white cursor-pointer text-left"
                      >
                        {formatEventTitleWithPeriod(e)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {contemporaryBioGroups.length > 0 && (
          <div className="bg-fuchsia-950/20 border-b border-fuchsia-500/25 px-4 py-2.5 space-y-2 font-sans">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-fuchsia-200">
                <span className="w-2 h-2 rounded-full bg-fuchsia-400 shrink-0" />
                <span className="tabular-nums">
                  Деятели эпохи (активны в окне: <span className="font-mono">{totalContemporaryBios}</span>):
                </span>
              </div>
              <span className="text-xs text-slate-400 hidden sm:inline">
                показаны по периоду зрелой творческой и научной активности (клик — биография и труды)
              </span>
            </div>
            <div className="space-y-1.5">
              {contemporaryBioGroups.map((group) => (
                <div key={group.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 shrink-0 mr-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                    <span>
                      {group.label} (<span className="font-mono tabular-nums">{group.items.length}</span>):
                    </span>
                  </span>
                  {group.items.map((bio) => {
                    const isHoveredBio = effectiveActiveEventId === bio.id;
                    return (
                      <button
                        key={bio.id}
                        type="button"
                        onClick={() => onOpenCardModal(bio.id)}
                        onMouseEnter={() => activateHoverEvent(bio.id)}
                        onMouseLeave={() => scheduleClearHoverEvent()}
                        title={`${bio.title} — годы жизни: ${bio.period}, активный период: ${bio.activeFrom}–${bio.activeTo} гг. Клик для паспорта деятеля`}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-sans transition-colors cursor-pointer whitespace-nowrap ${
                          isHoveredBio
                            ? 'bg-fuchsia-500/25 border-fuchsia-400 text-white shadow-sm'
                            : 'bg-slate-900/85 hover:bg-slate-800 border-slate-700/80 text-slate-200 hover:border-fuchsia-400/50'
                        }`}
                      >
                        <span className="font-semibold text-white">{bio.title}</span>
                        <span className="font-mono text-[11px] text-amber-300/95 tabular-nums">
                          {bio.activeFrom}–{bio.activeTo}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 tabular-nums hidden md:inline">
                          ({bio.period})
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {stream.map((item, idx) => {
          const prevItem = idx > 0 ? stream[idx - 1] : null;
          const deltaYears =
            timeScaleMode === 'proportional' && prevItem
              ? Math.max(0, item.year - prevItem.year)
              : 0;
          const spacerHeight =
            deltaYears >= 2 ? Math.min(168, Math.max(22, Math.round(deltaYears * 4.5))) : 0;
          const midSortKey = prevItem
            ? Math.floor((prevItem.sortKey + item.sortKey) / 2)
            : item.sortKey;
          const showSpacerBus =
            activeLinkGeometry !== null &&
            activeLinkGeometry.hasSpanOnCanvas &&
            idx - 0.5 >= activeLinkGeometry.minSpanIdx &&
            idx - 0.5 <= activeLinkGeometry.maxSpanIdx;

          const spacerEl =
            spacerHeight > 0 && prevItem ? (
              <div
                aria-hidden="true"
                className="relative flex items-stretch bg-slate-950/35 select-none"
                style={{ height: `${spacerHeight}px` }}
              >
                <div
                  className={`${gutterWidthClass} shrink-0 border-r border-slate-800/40 bg-slate-950/30 px-2 sm:px-2.5 items-center justify-end font-mono text-[10px] text-slate-500 tabular-nums whitespace-nowrap`}
                >
                  {deltaYears >= 3 ? `+${deltaYears} л.` : ''}
                </div>

                <div className="sm:hidden w-[36px] shrink-0 relative overflow-hidden">
                  <svg className="w-full h-full absolute inset-0" width={mobileSpineWidth} height="100%">
                    <line
                      x1={mobileSpineX}
                      y1={0}
                      x2={mobileSpineX}
                      y2={420}
                      stroke="#cbd5e1"
                      strokeWidth={2.6}
                      strokeOpacity={0.78}
                    />
                    {showSpacerBus && (
                      <line
                        x1={mobileConnectorBusX}
                        y1={0}
                        x2={mobileConnectorBusX}
                        y2={420}
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                        strokeOpacity={0.9}
                      />
                    )}
                  </svg>
                </div>

                <div
                  className="hidden sm:block shrink-0 relative overflow-hidden"
                  style={{ width: `${svgWidth}px` }}
                >
                  <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                    {renderRailsForRow(idx - 0.5, midSortKey)}
                  </svg>
                </div>

                <div className="flex-1 min-w-0 flex items-center gap-2 pr-3 sm:pr-6">
                  <div className="h-px flex-1 border-t border-dashed border-slate-800/80" />
                  {deltaYears >= 3 && (
                    <span className="font-mono text-[10px] text-slate-500 tabular-nums whitespace-nowrap">
                      ↕ {formatDurationYearsRu(deltaYears)} ({prevItem.year}–{item.year})
                    </span>
                  )}
                  <div className="h-px w-8 border-t border-dashed border-slate-800/80" />
                </div>
              </div>
            ) : null;

          const rowEl = (() => {
          const gutter = gutterMeta[idx];

          if (item.rowType === 'ERA_START') {
            const resolvedEra = resolveMacroEra(item.era);
            const carryOverWars = matchingEvents.filter(
              (ev) =>
                ev.startYear < item.year &&
                ev.endYear > item.year &&
                isMajorCampaignOrConflictNode(ev, branches),
            );

            return (
              <div
                key={`era-${resolvedEra.id}`}
                className="timeline-row-cv relative flex items-stretch bg-gradient-to-r from-slate-900/95 via-slate-900/70 to-slate-950 border-y border-amber-500/30"
              >
                <div
                  title={gutter.title}
                  className={`${gutterWidthClass} shrink-0 border-r border-slate-800/70 bg-slate-950/60 px-2 sm:px-2.5 pt-[27px] pb-2 items-start justify-end font-mono text-[11px] font-bold text-amber-300 tabular-nums whitespace-nowrap select-none`}
                >
                  {gutter.label}
                </div>

                {renderMobileSpineCell(idx, { kind: 'era' })}

                <div className="hidden sm:block shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                  <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                    {renderRailsForRow(idx, item.sortKey)}
                    <line
                      x1={timeSpineX + 8}
                      y1={36}
                      x2={svgWidth}
                      y2={36}
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      strokeOpacity={0.7}
                    />
                    <circle cx={timeSpineX} cy={36} r={10} fill="#050811" stroke="#cbd5e1" strokeWidth={3} />
                    <circle cx={timeSpineX} cy={36} r={4.5} fill="#f59e0b" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0 overflow-hidden py-4 pr-3 sm:pr-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black tabular-nums">
                        {resolvedEra.displayShortTitle} · {resolvedEra.period}
                      </span>
                      <span className="text-slate-400">Макро-период на оси времени</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenEraModal(resolvedEra.id)}
                      className="px-2.5 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                    >
                      Карточка периода →
                    </button>
                  </div>
                  <h2 className="font-serif text-lg sm:text-2xl font-bold tracking-tight text-white mt-1.5 [text-wrap:balance]">
                    {resolvedEra.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">{resolvedEra.thesis}</p>
                  {carryOverWars.length > 0 && (
                    <div className="mt-2 text-[11px] font-mono text-sky-300">
                      Военные кампании, переходящие через рубеж периода:{' '}
                      {carryOverWars.map((w) => formatEventTitleWithPeriod(w)).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (item.rowType === 'TIME_TICK') {
            return (
              <div
                key={`tick-${item.sortKey}-${idx}`}
                className="relative flex items-stretch bg-slate-950/75"
              >
                <div
                  title={gutter.title}
                  className={`${gutterWidthClass} shrink-0 border-r border-slate-800/50 bg-slate-950/40 px-2 sm:px-2.5 py-1 flex-col items-end justify-center font-mono text-[10px] leading-tight tabular-nums whitespace-nowrap select-none ${
                    gutter.isDuplicate ? 'text-slate-400/75' : 'text-slate-300'
                  }`}
                >
                  <span>{gutter.label}</span>
                  {gutter.styleLabel && (
                    <span className="text-[9px] text-sky-400/80 font-normal">{gutter.styleLabel}</span>
                  )}
                </div>

                {renderMobileSpineCell(idx, { kind: 'tick' })}

                <div className="hidden sm:block shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                  <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                    {renderRailsForRow(idx, item.sortKey)}
                    <line
                      x1={timeSpineX + 4}
                      y1={14}
                      x2={svgWidth}
                      y2={14}
                      stroke="#475569"
                      strokeWidth={1}
                      strokeDasharray="2 3"
                      strokeOpacity={0.55}
                    />
                    <circle cx={timeSpineX} cy={14} r={3.5} fill="#050811" stroke="#94a3b8" strokeWidth={2} />
                  </svg>
                </div>

                <div className="flex-1 min-w-0 overflow-hidden py-1.5 sm:py-1 pr-3 sm:pr-6 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-sans text-slate-400">
                  <span className="font-mono font-bold text-slate-200 tabular-nums">{item.label}</span>
                  {gutter.styleLabel && (
                    <span className="sm:hidden font-mono text-[10px] text-sky-400/85">{gutter.styleLabel}</span>
                  )}
                  <span aria-hidden="true" className="text-slate-400">
                    ·
                  </span>
                  <span className="text-slate-400">хронологический рубеж</span>
                </div>
              </div>
            );
          }

          if (item.rowType === 'RULER_COMMIT') {
            const r = item.rulerObj;
            const rSlot = rulerLayout.slotByRulerId.get(r.id) ?? 0;
            const rx = rulerLayout.railXs[rSlot] ?? 16;
            const rColor = rulerLayout.colorByRulerId.get(r.id) ?? item.rulerColor;
            const ongoingWarsAtAccession = matchingEvents.filter(
              (ev) =>
                ev.startYear < r.startYear &&
                ev.endYear > r.startYear &&
                isMajorCampaignOrConflictNode(ev, branches),
            );

            const isJumpedRuler = highlightedJumpId === r.id;

            return (
              <div
                key={`ruler-${r.id}`}
                id={r.id}
                data-ruler-context={r.id}
                className={`relative flex items-stretch transition-colors group ${
                  isJumpedRuler
                    ? 'bg-amber-500/20 ring-2 ring-inset ring-amber-400'
                    : 'bg-slate-900/70 hover:bg-slate-900/95'
                }`}
              >
                <div
                  title={gutter.title}
                  className={`${gutterWidthClass} shrink-0 border-r border-slate-800/60 bg-slate-950/40 px-2 sm:px-2.5 pt-[24px] pb-2 flex-col items-end justify-start font-mono text-[11px] leading-tight font-semibold tabular-nums whitespace-nowrap select-none transition-colors ${
                    gutter.isDuplicate
                      ? 'text-amber-300/75 group-hover:text-amber-200'
                      : 'text-amber-200 group-hover:text-amber-100'
                  }`}
                >
                  <span>{gutter.label}</span>
                  {gutter.styleLabel && (
                    <span
                      className={`text-[9px] font-normal mt-0.5 ${
                        gutter.styleTone === 'gregorian' ? 'text-sky-300/80' : 'text-amber-300/75'
                      }`}
                    >
                      {gutter.styleLabel}
                    </span>
                  )}
                </div>

                {renderMobileSpineCell(idx, {
                  kind: 'ruler_start',
                  color: rColor,
                  startedBeforeWindow: item.startedBeforeWindow,
                })}

                <div className="hidden sm:block shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                  <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                    {renderRailsForRow(idx, item.sortKey, { skipRulerId: r.id })}

                    {hasRulersLane && (
                      <>
                        {/* Ветка правления: ответвление (branch) от центральной оси времени влево к rx и продолжение вниз */}
                        {!item.startedBeforeWindow && (
                          <path
                            d={`M ${timeSpineX} 16 C ${timeSpineX - 10} 18, ${rx} 20, ${rx} 36`}
                            fill="none"
                            stroke={rColor}
                            strokeWidth={2.6}
                            strokeOpacity={0.65}
                          />
                        )}
                        <line
                          x1={rx}
                          y1={item.startedBeforeWindow ? 0 : 34}
                          x2={rx}
                          y2={420}
                          stroke={rColor}
                          strokeWidth={3}
                          strokeOpacity={0.65}
                        />
                        <line
                          x1={timeSpineX + 6}
                          y1={28}
                          x2={svgWidth}
                          y2={28}
                          stroke={rColor}
                          strokeWidth={1.4}
                          strokeDasharray="3 3"
                          strokeOpacity={0.48}
                        />
                        <circle cx={timeSpineX} cy={16} r={4} fill="#050811" stroke="#cbd5e1" strokeWidth={2} />
                        <circle
                          cx={rx}
                          cy={34}
                          r={6.5}
                          fill="#050811"
                          stroke={rColor}
                          strokeWidth={3}
                        />
                        <circle cx={rx} cy={34} r={2.5} fill={rColor} />
                      </>
                    )}
                  </svg>
                </div>

                <div className="flex-1 min-w-0 overflow-hidden py-3.5 pr-2.5 sm:pr-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                      <span
                        className="inline-flex items-center gap-1.5 font-mono text-xs font-black tabular-nums shrink-0"
                        style={{ color: rColor }}
                      >
                        <Crown className="w-3.5 h-3.5" />
                        {item.dateLabel}
                      </span>
                      {axisResolution !== 'year' &&
                        !item.startedBeforeWindow &&
                        (() => {
                          const marker = getCalendarStyleAxisMarker(
                            parsePreciseDate(r.startDate, r.startYear, false, {
                              calendarStyle: r.calendarStyle,
                              task: 'MAIN_RULERS',
                            }),
                          );
                          return marker ? (
                            <span
                              className={`text-[10px] font-mono shrink-0 ${
                                marker.tone === 'gregorian' ? 'text-sky-300/85' : 'text-amber-300/85'
                              }`}
                            >
                              {marker.label}
                            </span>
                          ) : null;
                        })()}
                      {r.center && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/90 border border-slate-700/80 text-xs font-sans font-semibold text-slate-300 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: rColor }} />
                          <span>{r.center}</span>
                        </span>
                      )}
                      <span aria-hidden="true" className="text-slate-400 hidden sm:inline">
                        ·
                      </span>
                      <span className="font-serif text-base sm:text-lg font-bold text-white tracking-tight">
                        {r.ruler}
                      </span>
                      <span aria-hidden="true" className="text-slate-400">
                        ·
                      </span>
                      <span className="text-xs font-sans text-slate-400">
                        правление{' '}
                        <span className="font-mono tabular-nums text-slate-300">{r.reignPeriod}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {!focusedEvent && (
                        <button
                          type="button"
                          onClick={() => onSelectYearRange(r.startYear, r.endYear)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-sans font-semibold transition-colors cursor-pointer whitespace-nowrap"
                          title="Отфильтровать таймлайн строго по годам этого правления"
                        >
                          Фокус: <span className="font-mono tabular-nums">{r.startYear}–{r.endYear}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenPeriodModal(r.id)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-sans font-semibold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Все события при правителе →
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mt-1">{r.reignThesis}</p>

                  {ongoingWarsAtAccession.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-sans text-amber-200/90">
                      <span>Смена правителя в ходе военных кампаний:</span>
                      {ongoingWarsAtAccession.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => onOpenCardModal(w.id)}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-white hover:border-amber-400 cursor-pointer text-xs"
                        >
                          {formatEventTitleWithPeriod(w)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (item.rowType === 'RULER_END') {
            const r = item.rulerObj;
            const rSlot = rulerLayout.slotByRulerId.get(r.id) ?? 0;
            const rx = rulerLayout.railXs[rSlot] ?? 16;
            const rColor = rulerLayout.colorByRulerId.get(r.id) ?? item.rulerColor;
            const mergeY = 22;

            return (
              <div
                key={`ruler-end-${r.id}-${idx}`}
                role="button"
                tabIndex={0}
                aria-label={`Завершение правления: ${r.ruler} (${r.reignPeriod})`}
                onClick={() => onOpenPeriodModal(r.id)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenPeriodModal(r.id);
                  }
                }}
                className="timeline-row-cv relative flex items-stretch bg-slate-950/55 hover:bg-slate-900/45 focus-visible:outline-2 focus-visible:outline-amber-400 transition-colors cursor-pointer group"
              >
                <div
                  title={gutter.title}
                  className={`${gutterWidthClass} shrink-0 border-r border-slate-800/50 bg-slate-950/30 px-2 sm:px-2.5 py-2 flex-col items-end justify-center font-mono text-[10px] leading-tight tabular-nums whitespace-nowrap select-none transition-colors ${
                    gutter.isDuplicate
                      ? 'text-slate-400/75 group-hover:text-slate-200'
                      : 'text-slate-300 group-hover:text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden="true" className="text-[9px] text-slate-400 group-hover:text-slate-200">
                      ↵
                    </span>
                    <span>{gutter.label}</span>
                  </span>
                  {gutter.styleLabel && (
                    <span
                      className={`text-[9px] font-normal ${
                        gutter.styleTone === 'gregorian' ? 'text-sky-300/75' : 'text-amber-300/75'
                      }`}
                    >
                      {gutter.styleLabel}
                    </span>
                  )}
                </div>

                {renderMobileSpineCell(idx, { kind: 'ruler_end', color: rColor })}

                <div className="hidden sm:block shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                  <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                    {renderRailsForRow(idx, item.sortKey, { skipRulerId: r.id })}

                    {hasRulersLane && (
                      <>
                        {/* Линия правления приходит сверху до mergeY и сливается обратно в timeSpineX */}
                        <line
                          x1={rx}
                          y1={0}
                          x2={rx}
                          y2={mergeY - 6}
                          stroke={rColor}
                          strokeWidth={3}
                          strokeOpacity={0.65}
                        />
                        <path
                          d={`M ${rx} ${mergeY - 6} C ${rx} ${mergeY + 6}, ${timeSpineX - 10} ${mergeY + 2}, ${timeSpineX} ${mergeY + 6}`}
                          fill="none"
                          stroke={rColor}
                          strokeWidth={2.4}
                          strokeOpacity={0.65}
                        />
                        <circle cx={timeSpineX} cy={mergeY + 6} r={4} fill="#050811" stroke="#cbd5e1" strokeWidth={2} />
                        <rect
                          x={rx - 4}
                          y={mergeY - 10}
                          width={8}
                          height={8}
                          rx={2}
                          fill="#050811"
                          stroke={rColor}
                          strokeWidth={2.2}
                        />
                      </>
                    )}
                  </svg>
                </div>

                <div className="flex-1 min-w-0 overflow-hidden py-2 pr-2.5 sm:pr-6">
                  <div className="w-full max-w-[760px] min-w-0 overflow-hidden rounded-lg bg-slate-900/40 border border-slate-800/70 group-hover:border-slate-700 px-3 sm:px-3.5 min-h-[36px] py-1.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-2 gap-y-1 text-xs font-sans">
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-0.5 min-w-0 flex-1 overflow-hidden">
                      <GitMerge className="w-3.5 h-3.5 shrink-0" style={{ color: rColor }} />
                      <span className="font-mono font-bold text-slate-200 tabular-nums shrink-0">
                        {item.dateLabel}
                      </span>
                      {gutter.styleLabel && (
                        <span
                          className={`sm:hidden font-mono text-[10px] shrink-0 ${
                            gutter.styleTone === 'gregorian' ? 'text-sky-300/80' : 'text-amber-300/80'
                          }`}
                        >
                          {gutter.styleLabel}
                        </span>
                      )}
                      {r.center && (
                        <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-xs text-slate-300 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: rColor }} />
                          <span>{r.center}</span>
                        </span>
                      )}
                      <span className="text-slate-400 shrink-0 hidden sm:inline">Завершение правления:</span>
                      <span className="font-semibold text-slate-200 group-hover:text-white line-clamp-2 sm:truncate min-w-0">
                        {r.shortRuler}{' '}
                        <span className="font-mono text-slate-300 tabular-nums">({r.reignPeriod})</span>
                      </span>
                    </div>
                    <span className="text-xs font-sans text-slate-400 shrink-0 tabular-nums ml-auto sm:ml-0">
                      ~<span className="font-mono">{Math.max(1, r.endYear - r.startYear)}</span> л. у власти
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          if (item.rowType === 'EVENT_COMMIT') {
            const ev = item.eventObj;
            const branchObj = resolveEventBranch(ev, branches, collapsedParents);
            const origBranchObj = branches.find((b) => b.id === ev.task) || branchObj;
            const isAtomic = item.isAtomicInView;
            const laneInfo = subLaneLayout.branchLayouts.get(branchObj.id);
            const baseX = laneInfo?.baseX ?? timeSpineX + 28;
            const slot = isAtomic ? 0 : (subLaneLayout.slotByEventId.get(ev.id) ?? 0);
            const commitX = getEventX(ev, isAtomic);
            const hasBasePassingAtRow =
              slot > 0 &&
              eventStreamBounds.some(
                (entry) =>
                  entry.ev.id !== ev.id &&
                  resolveEventBranch(entry.ev, branches, collapsedParents).id === branchObj.id &&
                  (subLaneLayout.slotByEventId.get(entry.ev.id) ?? 0) === 0 &&
                  entry.commitIdx < idx &&
                  idx < entry.endIdx,
              );
            const forkOriginX = hasBasePassingAtRow ? baseX : timeSpineX;
            const isCompact = cardDensity === 'compact';
            const commitY = isCompact ? 22 : 34;
            const isBioNode = isBiographyNode(ev, branches);
            const effStartYear = getEventEffectiveStartYear(ev, branches);
            const effEndYear = getEventEffectiveEndYear(ev, branches);
            const hasMultipleRulers = ev.overlappingRulers.length > 1;
            const bioPeriodBadge = item.startedBeforeWindow
              ? `акт. с ${effStartYear} (${ev.period})`
              : `акт. ${effStartYear}–${effEndYear} (${ev.period})`;
            const dateSummary = isBioNode
              ? bioPeriodBadge
              : axisResolution === 'year'
                ? ev.period
                : `${item.dateLabel} (${ev.period})`;

            const isCrossLinked = effectiveActiveEventId !== null && linkedEventIds.has(ev.id);
            const isOverlapping =
              hoveredEvent !== null &&
              hoveredEvent.id !== ev.id &&
              effStartYear <= getEventEffectiveEndYear(hoveredEvent, branches) &&
              effEndYear >= getEventEffectiveStartYear(hoveredEvent, branches);
            const isSelfHovered = effectiveActiveEventId === ev.id;
            const isFocusedTarget = focusedEvent?.id === ev.id;
            const focusDistance = focusedEvent ? focusDistanceMap?.get(ev.id) : undefined;
            const isJumpHighlighted =
              highlightedJumpId === ev.id || localJumpDomId === `row-${ev.id}`;
            const hasEndRowInStream = eventsWithEndRowInStream.has(ev.id);
            const nodeStatus = computeNodeVisualStatusMeta(
              ev,
              isBioNode,
              isAtomic,
              effStartYear,
              effEndYear,
            );

            const hiddenBranchSummaries = getEventHiddenBranchSummaries(ev, activeBranches, branches);
            const hiddenLinksTotal = hiddenBranchSummaries.reduce((sum, b) => sum + b.linkCount, 0);
            const auditInfo = auditUnlinkedMode ? auditCandidateMap?.get(ev.id) : undefined;
            const eventMacroRegions = classifyEventMacroRegions(ev);
            const primaryMacroRegionId =
              selectedMacroRegion !== 'all' && eventMacroRegions.includes(selectedMacroRegion)
                ? selectedMacroRegion
                : eventMacroRegions[0];
            const primaryMacroRegionOpt = getMacroRegionOption(primaryMacroRegionId);
            const isMacroRegionActive = selectedMacroRegion === primaryMacroRegionId;

            let cardHighlightClass =
              'border-slate-800/90 group-hover:border-slate-600 bg-slate-900/75 group-hover:bg-slate-900';
            if (isJumpHighlighted) {
              cardHighlightClass = 'jump-target-highlighted';
            } else if (isFocusedTarget) {
              cardHighlightClass = 'border-emerald-400/80 bg-emerald-950/25 shadow-lg';
            } else if (isCrossLinked) {
              cardHighlightClass = 'crosslink-highlighted';
            } else if (isOverlapping || isSelfHovered) {
              cardHighlightClass = 'overlap-highlighted';
            }

            const openCardTooltip = (el: HTMLElement) => {
              cancelScheduledTooltip();
              const hasExtraDetails = Boolean(
                ev.details && ev.details !== ev.subtitle && !ev.outcome && ev.prerequisitesList.length === 0,
              );
              const hasSupplementalContent =
                ev.prerequisitesList.length > 0 || Boolean(ev.outcome) || hasExtraDetails;

              if (!isCompact && !hasSupplementalContent) {
                setHoveredCardTooltip(null);
                return;
              }

              const rect = el.getBoundingClientRect();
              const delayMs = isCompact ? 120 : 350;
              const mode: 'full' | 'supplemental' = isCompact ? 'full' : 'supplemental';

              tooltipOpenTimerRef.current = window.setTimeout(() => {
                tooltipOpenTimerRef.current = null;
                setHoveredCardTooltip({
                  ev,
                  branchLabel: origBranchObj.label,
                  branchColor: origBranchObj.color,
                  dateLabel: dateSummary,
                  mode,
                  rect: {
                    top: rect.top,
                    bottom: rect.bottom,
                    left: rect.left,
                    width: rect.width,
                  },
                });
              }, delayMs);
            };

            const isConnectedToBus =
              activeLinkGeometry !== null &&
              activeLinkGeometry.hasSpanOnCanvas &&
              (isSelfHovered || isCrossLinked);

            return (
              <div
                key={`commit-${ev.id}-${idx}`}
                id={`row-${ev.id}`}
                role="button"
                tabIndex={0}
                aria-label={`${ev.title} (${ev.period})`}
                data-ruler-context={ev.overlappingRulers[0]?.id ?? ''}
                onClick={() => {
                  closeCardTooltip();
                  onOpenCardModal(ev.id);
                }}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    closeCardTooltip();
                    onOpenCardModal(ev.id);
                  }
                }}
                onMouseEnter={() => activateHoverEvent(ev.id)}
                onMouseLeave={() => {
                  scheduleClearHoverEvent();
                  closeCardTooltip();
                }}
                className="timeline-row-cv commit-row relative flex items-stretch hover:bg-slate-900/40 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/80"
              >
                <div
                  title={gutter.title}
                  className={`${gutterWidthClass} shrink-0 border-r border-slate-800/60 bg-slate-950/35 px-2 sm:px-2.5 ${
                    isCompact ? 'py-1 flex-col items-end justify-center' : 'pt-[25px] pb-2 flex-col items-end justify-start'
                  } font-mono text-[11px] leading-tight font-semibold tabular-nums whitespace-nowrap select-none transition-colors ${
                    isSelfHovered || isFocusedTarget
                      ? 'text-white'
                      : gutter.isDuplicate
                        ? 'text-slate-400/80 group-hover:text-slate-200'
                        : 'text-slate-200 group-hover:text-white'
                  }`}
                >
                  <span>{gutter.label}</span>
                  {gutter.styleLabel && (
                    <span
                      className={`text-[9px] font-normal ${
                        gutter.styleTone === 'gregorian' ? 'text-sky-300/80' : 'text-amber-300/80'
                      }`}
                    >
                      {gutter.styleLabel}
                    </span>
                  )}
                </div>

                {renderMobileSpineCell(idx, {
                  kind: 'event_commit',
                  color: branchObj.color,
                  isAtomic,
                  isBioNode,
                  isCompact,
                  isSelfHovered,
                  isConnectedToBus,
                  startedBeforeWindow: item.startedBeforeWindow,
                })}

                <div className="hidden sm:block shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                  <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                    {renderRailsForRow(idx, item.sortKey)}

                    {/* Горизонтальный отвод в вертикальную шину связей при наведении */}
                    {isConnectedToBus && (
                      <g>
                        <path
                          d={`M ${connectorBusX} ${commitY} C ${(connectorBusX + commitX) / 2} ${commitY}, ${(connectorBusX + commitX) / 2} ${commitY}, ${commitX} ${commitY}`}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth={2}
                          strokeOpacity={0.95}
                        />
                        <circle
                          cx={connectorBusX}
                          cy={commitY}
                          r={3.5}
                          fill={isSelfHovered ? '#10b981' : '#050811'}
                          stroke="#10b981"
                          strokeWidth={2}
                        />
                        {isSelfHovered && activeLinkGeometry.upItems.length > 0 && (
                          <polygon
                            points={`${connectorBusX},${Math.max(4, commitY - 14)} ${connectorBusX - 3.5},${Math.max(9, commitY - 9)} ${connectorBusX + 3.5},${Math.max(9, commitY - 9)}`}
                            fill="#34d399"
                          />
                        )}
                        {isSelfHovered && activeLinkGeometry.downItems.length > 0 && (
                          <polygon
                            points={`${connectorBusX},${commitY + 14} ${connectorBusX - 3.5},${commitY + 9} ${connectorBusX + 3.5},${commitY + 9}`}
                            fill="#34d399"
                          />
                        )}
                      </g>
                    )}

                    {/* Длительный процесс или нить творческой активности: собственная нить от commitY (или сверху, если начался до окна) */}
                    {!isAtomic && (
                      <>
                        {!item.startedBeforeWindow ? (
                          <>
                            <path
                              d={`M ${forkOriginX} 10 C ${forkOriginX + 10} 10, ${commitX} 16, ${commitX} ${commitY}`}
                              fill="none"
                              stroke={branchObj.color}
                              strokeWidth={isSelfHovered ? 3 : isBioNode ? 1.8 : 2}
                              strokeDasharray={isBioNode && !isSelfHovered ? '4 2' : undefined}
                              strokeOpacity={isSelfHovered ? 1 : isBioNode ? 0.5 : 0.65}
                            />
                            <circle
                              cx={forkOriginX}
                              cy={10}
                              r={3.2}
                              fill="#050811"
                              stroke={hasBasePassingAtRow ? branchObj.color : '#cbd5e1'}
                              strokeWidth={2}
                            />
                          </>
                        ) : (
                          <line
                            x1={commitX}
                            y1={0}
                            x2={commitX}
                            y2={commitY}
                            stroke={branchObj.color}
                            strokeWidth={isSelfHovered ? 3.6 : isBioNode ? 2.1 : 2.6}
                            strokeDasharray={isBioNode && !isSelfHovered ? '6 3' : undefined}
                            strokeOpacity={isSelfHovered ? 1 : isBioNode ? 0.5 : 0.65}
                          />
                        )}
                        <line
                          x1={commitX}
                          y1={commitY}
                          x2={commitX}
                          y2={420}
                          stroke={branchObj.color}
                          strokeWidth={isSelfHovered ? 3.6 : isBioNode ? 2.1 : 2.6}
                          strokeDasharray={isBioNode && !isSelfHovered ? '6 3' : undefined}
                          strokeOpacity={isSelfHovered ? 1 : isBioNode ? 0.5 : 0.65}
                        />
                      </>
                    )}

                    {/* Для атомарных событий: точечный вынос прямо от оси времени к коммиту без fork-merge рельсы */}
                    {isAtomic && (
                      <>
                        <line
                          x1={timeSpineX + 4}
                          y1={commitY}
                          x2={commitX - 6}
                          y2={commitY}
                          stroke={branchObj.color}
                          strokeWidth={1.6}
                          strokeDasharray="2 2"
                          strokeOpacity={isSelfHovered ? 1 : 0.55}
                        />
                        <circle cx={timeSpineX} cy={commitY} r={3.2} fill="#cbd5e1" />
                      </>
                    )}

                    <line
                      x1={commitX + 7}
                      y1={commitY}
                      x2={svgWidth}
                      y2={commitY}
                      stroke={branchObj.color}
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      strokeOpacity={isSelfHovered ? 1 : 0.52}
                    />

                    {isAtomic || isBioNode ? (
                      <g className="commit-node-ring">
                        <polygon
                          points={`${commitX},${commitY - 7} ${commitX + 7},${commitY} ${commitX},${commitY + 7} ${commitX - 7},${commitY}`}
                          fill="#050811"
                          stroke={branchObj.color}
                          strokeWidth={2.5}
                        />
                        <circle cx={commitX} cy={commitY} r={2} fill={branchObj.color} />
                      </g>
                    ) : (
                      <>
                        <circle
                          className="commit-node-ring"
                          cx={commitX}
                          cy={commitY}
                          r={isCompact ? 7.5 : 9.5}
                          fill={branchObj.color}
                          fillOpacity={0.22}
                        />
                        <circle
                          cx={commitX}
                          cy={commitY}
                          r={isCompact ? 4.5 : 5.5}
                          fill="#050811"
                          stroke={branchObj.color}
                          strokeWidth={isCompact ? 2.5 : 3}
                        />
                        <circle cx={commitX} cy={commitY} r={isCompact ? 1.8 : 2.2} fill={branchObj.color} />
                      </>
                    )}
                  </svg>
                </div>

                {isCompact ? (
                  <div className="flex-1 min-w-0 overflow-hidden py-1 pr-2.5 sm:pr-6">
                    <div
                      onMouseEnter={(e) => openCardTooltip(e.currentTarget)}
                      onMouseLeave={closeCardTooltip}
                      style={
                        nodeStatus.kind === 'process'
                          ? { borderLeftWidth: '3px', borderLeftColor: branchObj.color }
                          : nodeStatus.kind === 'biography'
                            ? {
                                borderLeftWidth: '3px',
                                borderLeftStyle: 'dashed',
                                borderLeftColor: branchObj.color,
                              }
                            : undefined
                      }
                      className={`w-full max-w-[760px] min-w-0 overflow-hidden rounded-lg border px-2.5 sm:px-3 min-h-[38px] py-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2.5 transition-all ${cardHighlightClass}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1 overflow-hidden">
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 shrink-0">
                          <span className="font-mono text-xs font-extrabold text-slate-200 group-hover:text-white tabular-nums shrink-0">
                            {isBioNode
                              ? bioPeriodBadge
                              : axisResolution === 'year'
                                ? ev.period
                                : item.dateLabel}
                          </span>
                          {axisResolution !== 'year' &&
                            !isBioNode &&
                            !item.startedBeforeWindow &&
                            (() => {
                              const marker = getCalendarStyleAxisMarker(ev.startPrecision);
                              return marker ? (
                                <span
                                  className={`font-mono text-[10px] shrink-0 ${
                                    marker.tone === 'gregorian' ? 'text-sky-300/85' : 'text-amber-300/85'
                                  }`}
                                  title={gutter.title}
                                >
                                  {marker.label}
                                </span>
                              ) : null;
                            })()}
                          <span
                            className="inline-flex items-center gap-1 font-sans text-xs text-slate-400 shrink-0 tabular-nums"
                            title={`${nodeStatus.kindLabel}: ${nodeStatus.durationLabel}`}
                          >
                            <span style={{ color: branchObj.color }}>{nodeStatus.symbol}</span>
                            <span className="font-mono text-[11px]">{nodeStatus.compactDurationLabel}</span>
                            {nodeStatus.kind !== 'milestone' && (
                              <span className="hidden sm:inline-block w-6 h-1 rounded-full bg-slate-800 overflow-hidden relative align-middle">
                                <span
                                  className="block h-full rounded-full opacity-80"
                                  style={{
                                    marginLeft: `${nodeStatus.trackStartPct}%`,
                                    width: `${nodeStatus.trackWidthPct}%`,
                                    backgroundColor: branchObj.color,
                                  }}
                                />
                              </span>
                            )}
                          </span>
                          <span className="sm:hidden inline-flex items-center gap-1 text-xs font-sans text-slate-300 min-w-0">
                            <span aria-hidden="true" className="text-slate-400">
                              ·
                            </span>
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: origBranchObj.color }}
                            />
                            <span className="truncate max-w-[140px]">
                              {origBranchObj.short || origBranchObj.label}
                            </span>
                          </span>
                        </div>
                        <span aria-hidden="true" className="hidden sm:inline text-slate-400 shrink-0">
                          ·
                        </span>
                        <span className="text-[13px] sm:text-sm font-bold text-white group-hover:text-amber-200 leading-snug line-clamp-2 sm:truncate min-w-0">
                          {ev.title}
                        </span>
                        <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-sans text-slate-300 shrink-0 max-w-[175px]">
                          <span aria-hidden="true" className="text-slate-400">
                            ·
                          </span>
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: origBranchObj.color }}
                          />
                          <span className="truncate">{origBranchObj.label}</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectMacroRegion?.(
                              isMacroRegionActive ? 'all' : primaryMacroRegionId,
                            );
                          }}
                          title={`${primaryMacroRegionOpt.label}${ev.region ? ` (${ev.region})` : ''} — нажмите для фильтрации по макрорегиону`}
                          className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-mono shrink-0 transition-colors cursor-pointer ${
                            isMacroRegionActive
                              ? 'bg-amber-500/20 border-amber-400/70 text-amber-200 font-semibold'
                              : 'bg-slate-950/75 border-slate-800 text-slate-300 hover:border-amber-400/50 hover:text-amber-200'
                          }`}
                        >
                          <MapPin className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          <span>{primaryMacroRegionOpt.shortLabel}</span>
                        </button>
                        {hasMultipleRulers && !isBioNode && (
                          <span className="hidden lg:inline text-xs font-sans text-slate-300 shrink-0 tabular-nums">
                            · <span className="font-mono">{ev.overlappingRulers.length}</span> правл.
                          </span>
                        )}
                        {ev.explicitLinks.length > 0 && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-mono text-emerald-300 shrink-0 tabular-nums">
                            · <Link2 className="w-3 h-3" /> {ev.explicitLinks.length}
                          </span>
                        )}
                        {focusedEvent && focusDepth > 1 && focusDistance !== undefined && focusDistance >= 1 && (
                          <span className="hidden sm:inline text-xs font-sans text-emerald-300 shrink-0 tabular-nums">
                            · <span className="font-mono">{focusDistance}</span> шаг
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-2 shrink-0 text-xs font-sans pt-0.5 sm:pt-0">
                        <div className="sm:hidden flex items-center gap-2 text-xs font-sans text-slate-400 min-w-0">
                          {ev.explicitLinks.length > 0 && (
                            <span className="inline-flex items-center gap-1 font-mono text-emerald-300 tabular-nums">
                              <Link2 className="w-3 h-3" /> {ev.explicitLinks.length}
                            </span>
                          )}
                          {ev.ruler && (
                            <span className="truncate max-w-[130px] text-slate-300">{ev.ruler}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-auto sm:ml-0">
                        {hasEndRowInStream && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerScrollToDomRow(`row-end-${ev.id}`, ev.id);
                            }}
                            className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg border border-slate-700/80 bg-slate-950/70 hover:border-amber-400/60 hover:text-amber-200 text-slate-300 transition-colors cursor-pointer font-mono text-xs tabular-nums"
                            title={`Быстрый переход к строке завершения (${effEndYear} г.)`}
                          >
                            <ArrowDown className="w-3 h-3 text-amber-400" />
                            <span>{effEndYear}</span>
                          </button>
                        )}
                        {hiddenLinksTotal > 0 && onRevealBranches && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRevealBranches(hiddenBranchSummaries.map((b) => b.branchId));
                            }}
                            className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 font-sans text-xs transition-colors cursor-pointer whitespace-nowrap tabular-nums"
                            title={`Скрытых связей: ${hiddenLinksTotal} (${hiddenBranchSummaries.map((b) => b.label).join(', ')}). Нажмите, чтобы раскрыть ветки.`}
                          >
                            <Eye className="w-3 h-3 text-amber-400" />
                            <span>
                              <span className="font-mono">+{hiddenLinksTotal}</span>:{' '}
                              {hiddenBranchSummaries.slice(0, 2).map((b) => b.label).join(' · ')}
                            </span>
                          </button>
                        )}
                        {auditInfo && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-amber-300 font-mono text-xs font-semibold tabular-nums">
                            <GitCompare className="w-3 h-3" /> {auditInfo.candidates.length}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFocusEvent(ev.id);
                          }}
                          className={`px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-lg border font-sans text-xs transition-colors cursor-pointer whitespace-nowrap ${
                            isFocusedTarget
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                              : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300'
                          }`}
                          title="Изолировать связи этого события"
                        >
                          {isFocusedTarget ? 'В фокусе' : 'Фокус'}
                        </button>
                        <span className="text-amber-400 font-sans text-xs font-semibold whitespace-nowrap">
                          Паспорт →
                        </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0 overflow-hidden py-2 pr-2.5 sm:pr-6">
                    <div
                      onMouseEnter={(e) => openCardTooltip(e.currentTarget)}
                      onMouseLeave={closeCardTooltip}
                      style={
                        nodeStatus.kind === 'process'
                          ? { borderLeftWidth: '3px', borderLeftColor: branchObj.color }
                          : nodeStatus.kind === 'biography'
                            ? {
                                borderLeftWidth: '3px',
                                borderLeftStyle: 'dashed',
                                borderLeftColor: branchObj.color,
                              }
                            : undefined
                      }
                      className={`w-full max-w-[760px] min-w-0 overflow-hidden rounded-xl border px-3 sm:px-3.5 py-2.5 transition-all flex flex-col justify-between gap-2 ${cardHighlightClass}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2.5 min-w-0 min-h-[20px]">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1 overflow-hidden">
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 shrink-0">
                            <span className="font-mono text-xs font-extrabold text-slate-200 group-hover:text-white tabular-nums shrink-0">
                              {isBioNode
                                ? bioPeriodBadge
                                : axisResolution === 'year'
                                  ? ev.period
                                  : item.dateLabel}
                            </span>
                            {axisResolution !== 'year' &&
                              !isBioNode &&
                              !item.startedBeforeWindow &&
                              (() => {
                                const marker = getCalendarStyleAxisMarker(ev.startPrecision);
                                return marker ? (
                                  <span
                                    className={`font-mono text-[10px] shrink-0 whitespace-nowrap ${
                                      marker.tone === 'gregorian' ? 'text-sky-300/85' : 'text-amber-300/85'
                                    }`}
                                    title={gutter.title}
                                  >
                                    {marker.label}
                                  </span>
                                ) : null;
                              })()}
                            <span className="sm:hidden inline-flex items-center gap-1.5 text-xs font-sans text-slate-300 min-w-0">
                              <span aria-hidden="true" className="text-slate-400">
                                ·
                              </span>
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: origBranchObj.color }}
                              />
                              <span className="truncate max-w-[155px]">
                                {origBranchObj.short || origBranchObj.label}
                              </span>
                            </span>
                          </div>
                          <span aria-hidden="true" className="hidden sm:inline text-slate-400 shrink-0">
                            ·
                          </span>
                          <h4 className="text-[15px] leading-snug font-bold text-white group-hover:text-amber-200 transition-colors line-clamp-2 sm:truncate min-w-0">
                            {ev.title}
                          </h4>
                          {!isAtomic && !isBioNode && item.startedBeforeWindow && (
                            <span className="hidden lg:inline text-xs font-sans text-amber-300 shrink-0 whitespace-nowrap">
                              · с <span className="font-mono tabular-nums">{ev.startYear}</span> г.
                            </span>
                          )}
                          {focusedEvent && focusDepth > 1 && focusDistance !== undefined && focusDistance >= 1 && (
                            <span className="hidden sm:inline text-xs font-sans text-emerald-300 shrink-0 whitespace-nowrap tabular-nums">
                              · <span className="font-mono">{focusDistance}</span> шаг
                            </span>
                          )}
                        </div>

                        <div className="hidden sm:flex items-center gap-1.5 text-xs font-sans text-slate-400 shrink-0 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1.5 text-xs text-slate-300 tabular-nums"
                            title={`${nodeStatus.kindLabel}: ${nodeStatus.durationLabel}`}
                          >
                            <span style={{ color: branchObj.color }}>{nodeStatus.symbol}</span>
                            <span>
                              {nodeStatus.kind === 'milestone'
                                ? 'Веха'
                                : nodeStatus.kind === 'biography'
                                  ? `Биогр. · ${nodeStatus.compactDurationLabel}`
                                  : `Процесс · ${formatDurationYearsRu(Math.max(1, ev.endYear - ev.startYear))}`}
                            </span>
                            {nodeStatus.kind !== 'milestone' && (
                              <span
                                aria-hidden="true"
                                className="w-10 h-1.5 rounded-full bg-slate-800/95 border border-slate-700/70 overflow-hidden inline-block align-middle"
                              >
                                <span
                                  className="block h-full rounded-full opacity-80"
                                  style={{
                                    marginLeft: `${nodeStatus.trackStartPct}%`,
                                    width: `${nodeStatus.trackWidthPct}%`,
                                    backgroundColor: branchObj.color,
                                  }}
                                />
                              </span>
                            )}
                          </span>
                          <span aria-hidden="true" className="text-slate-400">
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1.5 max-w-[180px] font-semibold text-slate-300">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: origBranchObj.color }}
                            />
                            <span className="truncate">{origBranchObj.label}</span>
                          </span>
                          <span aria-hidden="true" className="text-slate-400">
                            ·
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectMacroRegion?.(
                                isMacroRegionActive ? 'all' : primaryMacroRegionId,
                              );
                            }}
                            title={`${primaryMacroRegionOpt.label}${ev.region ? ` (${ev.region})` : ''} — нажмите для фильтрации ленты по макрорегиону`}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-mono transition-colors cursor-pointer ${
                              isMacroRegionActive
                                ? 'bg-amber-500/20 border-amber-400/70 text-amber-200 font-semibold'
                                : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-amber-400/55 hover:text-amber-200'
                            }`}
                          >
                            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>{primaryMacroRegionOpt.shortLabel}</span>
                            {ev.region &&
                              ev.region.toLowerCase() !== primaryMacroRegionOpt.shortLabel.toLowerCase() && (
                                <span className="text-slate-400 max-w-[105px] truncate hidden lg:inline">
                                  · {ev.region}
                                </span>
                              )}
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-[18px] min-h-[36px] overflow-hidden line-clamp-2">
                        {ev.subtitle}
                      </p>

                      {hiddenLinksTotal > 0 && (
                        <div className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-sans">
                          <div className="flex items-center gap-1.5 text-amber-200/95 min-w-0">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate tabular-nums">
                              Скрыто связей:{' '}
                              <strong className="font-mono">{hiddenLinksTotal}</strong> (
                              {hiddenBranchSummaries.slice(0, 3).map((b) => b.label).join(' · ')}
                              {hiddenBranchSummaries.length > 3 ? ` +${hiddenBranchSummaries.length - 3}` : ''})
                            </span>
                          </div>
                          {onRevealBranches && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRevealBranches(hiddenBranchSummaries.map((b) => b.branchId));
                              }}
                              className="px-2.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 text-amber-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                            >
                              Раскрыть ветки →
                            </button>
                          )}
                        </div>
                      )}

                      {auditInfo && (
                        <div className="rounded-lg bg-slate-800/55 px-2.5 py-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-sans">
                          <span className="inline-flex items-center gap-1 text-amber-300 font-semibold shrink-0 tabular-nums">
                            <GitCompare className="w-3 h-3" />
                            <span>
                              Без связи: <span className="font-mono">{auditInfo.candidates.length}</span>
                              {auditInfo.sameYearCandidatesCount > 0
                                ? ` (в том же году: ${auditInfo.sameYearCandidatesCount})`
                                : ''}
                            </span>
                          </span>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-300 min-w-0">
                            {auditInfo.candidates.slice(0, 2).map((cand) => (
                              <button
                                key={cand.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenCardModal(cand.id);
                                }}
                                className="underline decoration-slate-600 hover:text-amber-200 truncate max-w-[230px] cursor-pointer text-left"
                              >
                                <span className="font-mono tabular-nums">{cand.period}</span> {cand.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-1.5 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs font-sans text-slate-400 min-w-0 min-h-[26px]">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0 flex-1">
                          <span
                            className="sm:hidden inline-flex items-center gap-1 text-xs text-slate-300 shrink-0 tabular-nums"
                            title={`${nodeStatus.kindLabel}: ${nodeStatus.durationLabel}`}
                          >
                            <span style={{ color: branchObj.color }}>{nodeStatus.symbol}</span>
                            <span className="font-mono text-[11px]">{nodeStatus.compactDurationLabel}</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectMacroRegion?.(
                                isMacroRegionActive ? 'all' : primaryMacroRegionId,
                              );
                            }}
                            title={`${primaryMacroRegionOpt.label}${ev.region ? ` (${ev.region})` : ''} — нажмите для фильтрации по макрорегиону`}
                            className={`sm:hidden inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-mono shrink-0 transition-colors cursor-pointer ${
                              isMacroRegionActive
                                ? 'bg-amber-500/20 border-amber-400/70 text-amber-200 font-semibold'
                                : 'bg-slate-950/75 border-slate-800 text-slate-300 hover:border-amber-400/50 hover:text-amber-200'
                            }`}
                          >
                            <MapPin className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                            <span>{primaryMacroRegionOpt.shortLabel}</span>
                          </button>
                          {ev.ruler && (
                            <span
                              className={`inline-flex items-center gap-1 min-w-0 truncate ${
                                hasMultipleRulers && !isBiographyNode(ev, branches)
                                  ? 'text-slate-200 font-semibold'
                                  : 'text-slate-300'
                              }`}
                            >
                              <Crown className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">
                                {isBiographyNode(ev, branches)
                                  ? `Эпоха: ${ev.overlappingRulers[0]?.shortRuler}${
                                      ev.overlappingRulers.length > 1
                                        ? ` — ${ev.overlappingRulers[ev.overlappingRulers.length - 1]?.shortRuler}`
                                        : ''
                                    }`
                                  : hasMultipleRulers
                                    ? `${ev.overlappingRulers.length} правл.`
                                    : ev.ruler}
                              </span>
                            </span>
                          )}

                          {ev.explicitLinks.length > 0 && (
                            <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-300 font-semibold shrink-0 tabular-nums">
                              <Link2 className="w-3 h-3 shrink-0" />
                              <span>{ev.explicitLinks.length}</span>
                            </span>
                          )}

                          {(ev.concurrentCount ?? ev.concurrentEvents.length) > 0 && (
                            <span className="hidden md:inline font-mono text-xs text-slate-300 shrink-0 tabular-nums">
                              ∥ {ev.concurrentCount ?? ev.concurrentEvents.length}
                            </span>
                          )}

                          {ev.subEvents && ev.subEvents.length > 0 && (
                            <span className="hidden md:inline font-mono text-xs text-slate-300 shrink-0 tabular-nums">
                              ↳ {ev.subEvents.length}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 font-sans text-xs whitespace-nowrap ml-auto sm:ml-0">
                          {hasEndRowInStream && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerScrollToDomRow(`row-end-${ev.id}`, ev.id);
                              }}
                              className="px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-lg border border-slate-700/80 bg-slate-950/70 hover:border-amber-400/60 hover:text-amber-200 text-slate-300 inline-flex items-center gap-1 transition-colors cursor-pointer tabular-nums"
                              title={`Прокрутить ленту к точке завершения (${effEndYear} г.)`}
                            >
                              <ArrowDown className="w-3 h-3 text-amber-400" />
                              <span className="hidden sm:inline">К концу</span>
                              <span className="font-mono">({effEndYear})</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFocusEvent(ev.id);
                            }}
                            className={`px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-lg border inline-flex items-center gap-1 transition-colors cursor-pointer ${
                              isFocusedTarget
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                                : 'bg-slate-950/70 border-slate-700/80 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300'
                            }`}
                            title="Изолировать событие, его прямые связи и параллельные процессы"
                          >
                            <Crosshair className="w-3 h-3" />
                            <span>{isFocusedTarget ? 'В фокусе' : 'Фокус'}</span>
                          </button>

                          <span className="px-1.5 py-1 sm:p-0 text-amber-400 font-semibold group-hover:underline inline-flex items-center gap-1">
                            <GitCommitHorizontal className="w-3.5 h-3.5" />
                            <span>Паспорт →</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // EVENT_END: точка завершения и обратное слияние (merge) под-нити обратно в ветку или ось времени
          const ev = item.eventObj;
          const branchObj = resolveEventBranch(ev, branches, collapsedParents);
          const laneInfo = subLaneLayout.branchLayouts.get(branchObj.id);
          const baseX = laneInfo?.baseX ?? timeSpineX + 28;
          const slot = subLaneLayout.slotByEventId.get(ev.id) ?? 0;
          const commitX = getEventX(ev, false);
          const hasBaseContinuingAfter =
            slot > 0 &&
            eventStreamBounds.some(
              (entry) =>
                entry.ev.id !== ev.id &&
                resolveEventBranch(entry.ev, branches, collapsedParents).id === branchObj.id &&
                (subLaneLayout.slotByEventId.get(entry.ev.id) ?? 0) === 0 &&
                entry.commitIdx < idx &&
                idx < entry.endIdx,
            );
          const mergeTargetX = hasBaseContinuingAfter ? baseX : timeSpineX;
          const isEndSelfHovered = effectiveActiveEventId === ev.id;
          const isEndJumpHighlighted = localJumpDomId === `row-end-${ev.id}`;
          const hasStartRowInStream = rowIndexByEventId.has(ev.id);
          const effStartYearForEnd = getEventEffectiveStartYear(ev, branches);
          const mergeY = 22;

          return (
            <div
              key={`end-${ev.id}-${idx}`}
              id={`row-end-${ev.id}`}
              role="button"
              tabIndex={0}
              aria-label={`Окончание: ${ev.title} (${item.dateLabel})`}
              onClick={() => onOpenCardModal(ev.id)}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenCardModal(ev.id);
                }
              }}
              onMouseEnter={() => activateHoverEvent(ev.id)}
              onMouseLeave={() => scheduleClearHoverEvent()}
              className="timeline-row-cv relative flex items-stretch hover:bg-slate-900/40 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/80"
            >
              <div
                title={gutter.title}
                className={`${gutterWidthClass} shrink-0 border-r border-slate-800/50 bg-slate-950/25 px-2 sm:px-2.5 py-2 flex-col items-end justify-center font-mono text-[10px] leading-tight tabular-nums whitespace-nowrap select-none transition-colors ${
                  isEndSelfHovered
                    ? 'text-slate-100'
                    : gutter.isDuplicate
                      ? 'text-slate-400/75 group-hover:text-slate-200'
                      : 'text-slate-300 group-hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden="true" className="text-[9px] text-slate-400 group-hover:text-slate-200">
                    ↵
                  </span>
                  <span>{gutter.label}</span>
                </span>
                {gutter.styleLabel && (
                  <span
                    className={`text-[9px] font-normal ${
                      gutter.styleTone === 'gregorian' ? 'text-sky-300/80' : 'text-amber-300/80'
                    }`}
                  >
                    {gutter.styleLabel}
                  </span>
                )}
              </div>

              {renderMobileSpineCell(idx, { kind: 'event_end', color: branchObj.color })}

              <div className="hidden sm:block shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                  {renderRailsForRow(idx, item.sortKey)}
                  <line
                    x1={commitX}
                    y1={0}
                    x2={commitX}
                    y2={mergeY - 4}
                    stroke={branchObj.color}
                    strokeWidth={isEndSelfHovered ? 3.6 : 2.6}
                    strokeOpacity={isEndSelfHovered ? 1 : 0.65}
                  />
                  <path
                    d={`M ${commitX} ${mergeY - 4} C ${commitX} ${mergeY + 10}, ${mergeTargetX + 12} ${mergeY + 4}, ${mergeTargetX} ${mergeY + 10}`}
                    fill="none"
                    stroke={branchObj.color}
                    strokeWidth={isEndSelfHovered ? 2.6 : 1.9}
                    strokeDasharray="3 2"
                    strokeOpacity={isEndSelfHovered ? 1 : 0.65}
                  />
                  <circle
                    cx={mergeTargetX}
                    cy={mergeY + 10}
                    r={3.2}
                    fill="#050811"
                    stroke={hasBaseContinuingAfter ? branchObj.color : '#cbd5e1'}
                    strokeWidth={2}
                  />
                  <rect
                    x={commitX - 4.5}
                    y={mergeY - 8.5}
                    width={9}
                    height={9}
                    rx={2}
                    fill="#050811"
                    stroke={branchObj.color}
                    strokeWidth={2.5}
                  />
                </svg>
              </div>

              <div className="flex-1 min-w-0 overflow-hidden py-2 pr-2.5 sm:pr-6">
                <div
                  className={`w-full max-w-[760px] min-w-0 overflow-hidden rounded-lg border px-3 sm:px-3.5 min-h-[36px] py-1.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-2 gap-y-1.5 text-xs transition-all ${
                    isEndJumpHighlighted
                      ? 'jump-target-highlighted'
                      : 'bg-slate-900/40 border-slate-800/70 group-hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-0.5 min-w-0 flex-1 overflow-hidden">
                    <Flag className="w-3.5 h-3.5 shrink-0" style={{ color: branchObj.color }} />
                    <span className="font-mono font-bold text-slate-200 tabular-nums shrink-0">
                      {item.dateLabel}
                    </span>
                    {axisResolution !== 'year' &&
                      (() => {
                        const marker = getCalendarStyleAxisMarker(ev.endPrecision);
                        return marker ? (
                          <span
                            className={`font-mono text-[10px] shrink-0 whitespace-nowrap ${
                              marker.tone === 'gregorian' ? 'text-sky-300/80' : 'text-amber-300/80'
                            }`}
                          >
                            {marker.label}
                          </span>
                        ) : null;
                      })()}
                    <span className="text-slate-400 font-sans text-xs shrink-0 hidden sm:inline">
                      {isBiographyNode(ev, branches)
                        ? 'Завершение жизненного и творческого пути:'
                        : branchObj.isMilitary || ev.task.startsWith('WAR_')
                          ? 'Окончание кампании:'
                          : 'Завершение процесса:'}
                    </span>
                    <span className="font-semibold text-slate-200 group-hover:text-white line-clamp-2 sm:truncate min-w-0">
                      {formatEventTitleWithPeriod(ev)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-sans text-xs tabular-nums whitespace-nowrap ml-auto sm:ml-0">
                    <span className="text-slate-400 hidden sm:inline">
                      {ev.overlappingRulers.length > 1
                        ? `Правлений: ${ev.overlappingRulers.length}`
                        : ev.duration > 0
                          ? formatDurationYearsRu(ev.duration)
                          : 'Завершение'}
                    </span>
                    {hasStartRowInStream && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerScrollToDomRow(`row-${ev.id}`, ev.id);
                        }}
                        className="px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-lg border border-slate-700/80 bg-slate-950/70 hover:border-amber-400/60 hover:text-amber-200 text-slate-300 inline-flex items-center gap-1 transition-colors cursor-pointer"
                        title={`Вернуться к началу процесса (${effStartYearForEnd} г.)`}
                      >
                        <ArrowUp className="w-3 h-3 text-amber-400" />
                        <span className="hidden md:inline">К началу</span>
                        <span className="font-mono">({effStartYearForEnd})</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
          })();

          return spacerEl ? (
            <Fragment key={`prop-wrap-${idx}-${item.rowType}-${item.sortKey}`}>
              {spacerEl}
              {rowEl}
            </Fragment>
          ) : (
            rowEl
          );
        })}
      </div>
      </div>

      {/* Липкий правый инспектор среза и быстрых связей на широких экранах (xl) */}
      <aside
        aria-label="Инспектор среза и быстрых связей"
        onMouseEnter={() => cancelScheduledHoverClear()}
        onMouseLeave={() => {
          if (hoveredEvent && pinnedHoverEventId !== hoveredEvent.id) {
            scheduleClearHoverEvent();
          }
        }}
        className="hidden xl:flex xl:flex-col xl:gap-3.5 xl:sticky xl:top-[calc(var(--top-bar-height,49px)+0.875rem)] xl:max-h-[calc(100vh-var(--top-bar-height,49px)-1.75rem)] xl:overflow-y-auto no-scrollbar"
      >
        <section className="rounded-2xl border border-slate-800/90 bg-[#080e1c]/90 backdrop-blur-md p-3.5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-sans font-semibold text-slate-400">
              Срез хронографа
            </span>
            {onOpenWindowModal ? (
              <button
                type="button"
                onClick={() => onOpenWindowModal(yearFrom, effectiveSliceEndYear)}
                className="font-mono text-xs font-bold text-amber-300 hover:text-amber-200 tabular-nums transition-colors cursor-pointer"
                title="Открыть обзор выбранного окна времени"
              >
                {yearFrom}–{effectiveSliceEndYear} →
              </button>
            ) : (
              <span className="font-mono text-xs font-bold text-amber-300 tabular-nums">
                {yearFrom}–{effectiveSliceEndYear}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-sans">
            <div className="rounded-xl bg-slate-900/75 px-2.5 py-2">
              <div className="text-slate-400">Событий в окне</div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="font-mono text-sm font-bold text-white tabular-nums">
                  {matchingEvents.length}
                </span>
                <span className="text-slate-400 tabular-nums">
                  · {thematicLanes.length} вет.
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/75 px-2.5 py-2">
              <div className="text-slate-400">Узлов со связями</div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="font-mono text-sm font-bold text-emerald-300 tabular-nums">
                  {linkedEventsInWindowCount}
                </span>
                <span className="text-slate-400 tabular-nums">в срезе</span>
              </div>
            </div>
          </div>

          {activeStickyRuler && (
            <div className="pt-2.5 border-t border-slate-800/75 space-y-2">
              {activeStickyEra && (
                <button
                  type="button"
                  onClick={() => onOpenEraModal(activeStickyEra.id)}
                  className="text-xs font-sans font-semibold text-amber-300/90 hover:text-amber-200 underline decoration-amber-400/35 underline-offset-2 text-left block truncate w-full cursor-pointer"
                  title={`Открыть карточку эпохи «${activeStickyEra.displayShortTitle}» (${activeStickyEra.period})`}
                >
                  {activeStickyEra.displayShortTitle} · {activeStickyEra.period}
                </button>
              )}

              <div className="space-y-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-serif text-base font-bold text-white leading-tight truncate">
                      {activeStickyRuler.shortRuler}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-amber-300 tabular-nums shrink-0 pt-0.5">
                    {activeStickyRuler.reignPeriod}
                  </span>
                </div>
                <p className="text-xs font-sans text-slate-300 leading-snug line-clamp-2">
                  {activeStickyRuler.reignTitle}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5 text-xs font-sans">
                <span className="text-slate-400 tabular-nums">
                  <span className="font-mono text-slate-200">{activeStickyRulerEventCount}</span> соб. в окне
                </span>
                <div className="flex items-center gap-1.5">
                  {!focusedEvent && (
                    <button
                      type="button"
                      onClick={() => onSelectYearRange(activeStickyRuler.startYear, activeStickyRuler.endYear)}
                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 transition-colors cursor-pointer"
                      title="Сузить окно до лет этого правления"
                    >
                      Окно
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenPeriodModal(activeStickyRuler.id)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 font-semibold transition-colors cursor-pointer"
                  >
                    Сводка →
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {inspectorSourceEvent ? (
          <section className="rounded-2xl border border-emerald-500/40 bg-[#0b1325]/95 backdrop-blur-md shadow-xl overflow-hidden flex flex-col">
            <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-start justify-between gap-2 font-sans">
              <div className="min-w-0">
                <div className="text-xs text-emerald-300 font-bold flex items-center gap-1.5 tabular-nums">
                  <Link2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {pinnedHoverEventId === inspectorSourceEvent.id
                      ? 'Закреплённые связи'
                      : focusedEvent?.id === inspectorSourceEvent.id && !hoveredEvent
                        ? 'Связи в фокусе'
                        : 'Быстрый обзор связей'}
                    {inspectorLinkGeometry ? (
                      <> (<span className="font-mono">{inspectorLinkGeometry.totalCount}</span>)</>
                    ) : null}
                  </span>
                </div>
                <div className="text-xs font-bold text-white leading-snug mt-1">
                  <span className="font-mono tabular-nums text-slate-200">{inspectorSourceEvent.period}</span> —{' '}
                  {inspectorSourceEvent.title}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setPinnedHoverEventId((prev) =>
                      prev === inspectorSourceEvent.id ? null : inspectorSourceEvent.id,
                    )
                  }
                  className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                    pinnedHoverEventId === inspectorSourceEvent.id
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                      : 'bg-slate-950/80 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title="Закрепить инспектор связей при перемещении мыши"
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
                {(hoveredEvent || pinnedHoverEventId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPinnedHoverEventId(null);
                      cancelScheduledHoverClear();
                      onHoverEvent(null);
                    }}
                    aria-label="Снять фиксацию события"
                    className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {inspectorLinkGeometry ? (
              <div className="p-2.5 space-y-2.5 text-xs font-sans">
                {inspectorLinkGeometry.upItems.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-slate-400 px-1 flex items-center gap-1">
                      <ArrowUp className="w-3 h-3 text-emerald-400" />
                      <span>
                        Выше на ленте (<span className="font-mono tabular-nums">{inspectorLinkGeometry.upItems.length}</span>)
                      </span>
                    </div>
                    {inspectorLinkGeometry.upItems.map((lnk) => (
                      <button
                        key={lnk.targetEvent.id}
                        type="button"
                        onClick={() => onJumpToEvent(lnk.targetEvent.id)}
                        className="w-full text-left px-2.5 py-2 rounded-lg bg-slate-950/75 hover:bg-emerald-950/45 border border-slate-800 hover:border-emerald-500/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-300 min-w-0">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: lnk.branchColor }}
                            />
                            <span className="truncate">
                              <span className="font-mono tabular-nums">↑ {lnk.targetEvent.period}</span> · {lnk.branchLabel}
                            </span>
                          </span>
                          <span className="font-mono text-xs text-emerald-300 shrink-0 tabular-nums">
                            {lnk.rowDelta !== null ? `${lnk.rowDelta} стр.` : ''}
                            {lnk.yearDelta !== 0 ? `${lnk.rowDelta !== null ? ' · ' : ''}${lnk.yearDelta} л.` : ''}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-white truncate mt-0.5">
                          {lnk.targetEvent.title}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {inspectorLinkGeometry.downItems.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-slate-400 px-1 flex items-center gap-1">
                      <ArrowDown className="w-3 h-3 text-emerald-400" />
                      <span>
                        Ниже на ленте (<span className="font-mono tabular-nums">{inspectorLinkGeometry.downItems.length}</span>)
                      </span>
                    </div>
                    {inspectorLinkGeometry.downItems.map((lnk) => (
                      <button
                        key={lnk.targetEvent.id}
                        type="button"
                        onClick={() => onJumpToEvent(lnk.targetEvent.id)}
                        className="w-full text-left px-2.5 py-2 rounded-lg bg-slate-950/75 hover:bg-emerald-950/45 border border-slate-800 hover:border-emerald-500/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-300 min-w-0">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: lnk.branchColor }}
                            />
                            <span className="truncate">
                              <span className="font-mono tabular-nums">↓ {lnk.targetEvent.period}</span> · {lnk.branchLabel}
                            </span>
                          </span>
                          <span className="font-mono text-xs text-emerald-300 shrink-0 tabular-nums">
                            {lnk.rowDelta !== null ? `${lnk.rowDelta} стр.` : ''}
                            {lnk.yearDelta !== 0 ? `${lnk.rowDelta !== null ? ' · ' : ''}+${Math.abs(lnk.yearDelta)} л.` : ''}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-white truncate mt-0.5">
                          {lnk.targetEvent.title}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {inspectorLinkGeometry.offStreamItems.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-amber-300/90 px-1">
                      Вне окна или в скрытых ветках (<span className="font-mono tabular-nums">{inspectorLinkGeometry.offStreamItems.length}</span>)
                    </div>
                    {inspectorLinkGeometry.offStreamItems.map((lnk) => (
                      <button
                        key={lnk.targetEvent.id}
                        type="button"
                        onClick={() => onJumpToEvent(lnk.targetEvent.id)}
                        className="w-full text-left px-2.5 py-2 rounded-lg bg-slate-950/75 hover:bg-amber-950/35 border border-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-300 min-w-0">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: lnk.branchColor }}
                            />
                            <span className="truncate">
                              <span className="font-mono tabular-nums">{lnk.targetEvent.period}</span> · {lnk.branchLabel}
                            </span>
                          </span>
                          <span className="text-xs font-semibold text-amber-300 shrink-0">
                            {lnk.isHiddenBranch ? 'Раскрыть →' : 'Перейти →'}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-white truncate mt-0.5">
                          {lnk.targetEvent.title}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 text-xs font-sans text-slate-400 space-y-2">
                <p className="leading-relaxed">
                  Прямых перекрёстных связей у этого события в текущем манифесте не отмечено.
                </p>
              </div>
            )}

            <div className="px-3.5 py-2 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-2 text-xs font-sans">
              <button
                type="button"
                onClick={() => onToggleFocusEvent(inspectorSourceEvent.id)}
                className={`px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 transition-colors cursor-pointer ${
                  focusedEvent?.id === inspectorSourceEvent.id
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                    : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300'
                }`}
              >
                <Crosshair className="w-3 h-3" />
                <span>{focusedEvent?.id === inspectorSourceEvent.id ? 'В фокусе' : 'Фокус'}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenCardModal(inspectorSourceEvent.id)}
                className="text-amber-300 hover:text-amber-200 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <GitCommitHorizontal className="w-3.5 h-3.5" />
                <span>Паспорт →</span>
              </button>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-800/90 bg-[#080e1c]/90 backdrop-blur-md p-3.5 space-y-2.5 shadow-lg font-sans">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Поворотные узлы среза</span>
              </span>
              <span className="text-xs text-slate-400">по связям</span>
            </div>

            {topLinkedEventsInWindow.length > 0 ? (
              <div className="space-y-1.5">
                {topLinkedEventsInWindow.map(({ ev, branchLabel, branchColor }) => (
                  <div
                    key={ev.id}
                    className="rounded-xl bg-slate-900/75 hover:bg-slate-900 border border-slate-800/80 hover:border-emerald-500/40 p-2.5 transition-colors space-y-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setPinnedHoverEventId(ev.id);
                        onJumpToEvent(ev.id);
                      }}
                      className="w-full text-left cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-slate-300 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: branchColor }}
                          />
                          <span className="font-mono font-bold text-slate-200 tabular-nums shrink-0">
                            {ev.period}
                          </span>
                          <span className="truncate text-slate-400">{branchLabel}</span>
                        </span>
                        <span className="font-mono text-xs font-semibold text-emerald-300 shrink-0 tabular-nums inline-flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          {ev.explicitLinks.length}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-white group-hover:text-amber-200 leading-snug line-clamp-2">
                        {ev.title}
                      </div>
                    </button>

                    <div className="flex items-center justify-between gap-2 pt-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => onToggleFocusEvent(ev.id)}
                        className="text-slate-300 hover:text-emerald-300 inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>В фокус</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenCardModal(ev.id)}
                        className="text-amber-300 hover:text-amber-200 font-semibold cursor-pointer"
                      >
                        Паспорт →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 leading-relaxed">
                Наведите на любую карточку хронографа, чтобы увидеть её прямые связи и перейти к связанным событиям.
              </p>
            )}
          </section>
        )}
      </aside>

      {hoveredCardTooltip && (
        <div
          role="tooltip"
          style={{
            left: Math.max(
              12,
              Math.min(
                hoveredCardTooltip.rect.left,
                (typeof window !== 'undefined' ? window.innerWidth : 1280) -
                  Math.min(
                    hoveredCardTooltip.mode === 'supplemental' ? 400 : 440,
                    (typeof window !== 'undefined' ? window.innerWidth : 1280) - 24,
                  ) -
                  12,
              ),
            ),
            width: Math.min(
              hoveredCardTooltip.mode === 'supplemental' ? 400 : 440,
              (typeof window !== 'undefined' ? window.innerWidth : 1280) - 24,
            ),
            ...(typeof window !== 'undefined' &&
            hoveredCardTooltip.rect.bottom +
              (hoveredCardTooltip.mode === 'supplemental' ? 170 : 240) >
              window.innerHeight &&
            hoveredCardTooltip.rect.top > (hoveredCardTooltip.mode === 'supplemental' ? 170 : 240)
              ? { bottom: window.innerHeight - hoveredCardTooltip.rect.top + 8 }
              : { top: hoveredCardTooltip.rect.bottom + 8 }),
          }}
          className="fixed z-50 pointer-events-none rounded-xl border border-slate-700/95 bg-[#080e1d]/98 backdrop-blur-md shadow-2xl p-3 text-left"
        >
          {hoveredCardTooltip.mode === 'full' ? (
            <>
              <div className="flex items-center justify-between gap-2 text-xs font-sans">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: hoveredCardTooltip.branchColor }}
                  />
                  <span className="font-semibold text-slate-300 truncate">{hoveredCardTooltip.branchLabel}</span>
                </div>
                <span className="font-mono font-extrabold text-slate-200 tabular-nums shrink-0">
                  {hoveredCardTooltip.dateLabel}
                </span>
              </div>

              <div className="mt-1.5 text-sm font-bold text-white leading-snug">
                {hoveredCardTooltip.ev.title}
              </div>

              {(() => {
                const tEv = hoveredCardTooltip.ev;
                const tBio = isBiographyNode(tEv, branches);
                const tEffStart = getEventEffectiveStartYear(tEv, branches);
                const tEffEnd = getEventEffectiveEndYear(tEv, branches);
                const tStatus = computeNodeVisualStatusMeta(
                  tEv,
                  tBio,
                  tEv.isAtomic,
                  tEffStart,
                  tEffEnd,
                );
                return (
                  <div className="mt-1 flex items-center gap-2 text-xs font-sans text-slate-300 tabular-nums">
                    <span style={{ color: hoveredCardTooltip.branchColor }}>{tStatus.symbol}</span>
                    <span className="font-semibold text-slate-200">{tStatus.kindLabel}:</span>
                    <span>{tStatus.durationLabel}</span>
                    {tStatus.kind !== 'milestone' && (
                      <span className="w-12 h-1.5 rounded-full bg-slate-800 border border-slate-700 overflow-hidden inline-block">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            marginLeft: `${tStatus.trackStartPct}%`,
                            width: `${tStatus.trackWidthPct}%`,
                            backgroundColor: hoveredCardTooltip.branchColor,
                          }}
                        />
                      </span>
                    )}
                  </div>
                );
              })()}

              {hoveredCardTooltip.ev.startPrecision.precision !== 'year' &&
                (() => {
                  const cal = formatCalendarDetailBadge(hoveredCardTooltip.ev.startPrecision);
                  return (
                    <div className="mt-1 text-xs font-sans tabular-nums text-slate-300 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span className={`font-mono ${cal.tone === 'gregorian' ? 'text-sky-300' : 'text-amber-300'}`}>
                        {cal.primaryText}
                      </span>
                      <span className="text-slate-400">· {cal.styleLabel}</span>
                      {cal.counterpartText && (
                        <span className="font-mono text-slate-300">/ {cal.counterpartText}</span>
                      )}
                      {cal.offsetNote && <span className="text-slate-400">({cal.offsetNote})</span>}
                    </div>
                  );
                })()}

              <p className="mt-1 text-xs text-slate-200 leading-relaxed">
                {hoveredCardTooltip.ev.subtitle}
              </p>

              {hoveredCardTooltip.ev.prerequisitesList.length > 0 && (
                <div className="mt-2 rounded-lg bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-1.5 text-xs font-sans text-indigo-100 leading-snug line-clamp-2">
                  <span className="font-semibold text-indigo-300">Предпосылки: </span>
                  {hoveredCardTooltip.ev.prerequisitesList[0]}
                </div>
              )}

              {hoveredCardTooltip.ev.outcome && (
                <div className="mt-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 px-2.5 py-1.5 text-xs font-sans text-amber-100 leading-snug line-clamp-2">
                  <span className="font-semibold text-amber-300">Итог: </span>
                  {hoveredCardTooltip.ev.outcome}
                </div>
              )}

              {hoveredCardTooltip.ev.details &&
                hoveredCardTooltip.ev.details !== hoveredCardTooltip.ev.subtitle &&
                !hoveredCardTooltip.ev.outcome &&
                hoveredCardTooltip.ev.prerequisitesList.length === 0 && (
                  <p className="mt-1.5 text-xs font-sans text-slate-400 leading-relaxed line-clamp-3">
                    {hoveredCardTooltip.ev.details}
                  </p>
                )}

              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs font-sans text-slate-400">
                <span className="truncate">
                  {hoveredCardTooltip.ev.ruler
                    ? `Правитель: ${hoveredCardTooltip.ev.ruler}`
                    : hoveredCardTooltip.branchLabel}
                </span>
                <span className="text-amber-300 shrink-0 tabular-nums">
                  {hoveredCardTooltip.ev.explicitLinks.length > 0
                    ? `Связей: ${hoveredCardTooltip.ev.explicitLinks.length} · Клик — паспорт`
                    : 'Клик — паспорт события'}
                </span>
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              {hoveredCardTooltip.ev.prerequisitesList.length > 0 && (
                <div className="rounded-lg bg-indigo-500/10 px-2.5 py-1.5 text-xs font-sans text-indigo-100 leading-snug line-clamp-3">
                  <span className="font-semibold text-indigo-300">Предпосылки: </span>
                  {hoveredCardTooltip.ev.prerequisitesList[0]}
                </div>
              )}

              {hoveredCardTooltip.ev.outcome && (
                <div className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs font-sans text-amber-100 leading-snug line-clamp-3">
                  <span className="font-semibold text-amber-300">Итог: </span>
                  {hoveredCardTooltip.ev.outcome}
                </div>
              )}

              {hoveredCardTooltip.ev.details &&
                hoveredCardTooltip.ev.details !== hoveredCardTooltip.ev.subtitle &&
                !hoveredCardTooltip.ev.outcome &&
                hoveredCardTooltip.ev.prerequisitesList.length === 0 && (
                  <p className="text-xs font-sans text-slate-300 leading-relaxed line-clamp-3 px-0.5">
                    {hoveredCardTooltip.ev.details}
                  </p>
                )}

              <div className="pt-1 flex items-center justify-between gap-2 text-xs font-sans text-slate-400">
                <span>Скрытый контекст карточки</span>
                <span className="text-amber-300 font-semibold shrink-0">Клик — паспорт события</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Плавающая панель быстрого перехода по дальним вертикальным связям (на < xl, на xl её заменяет липкий инспектор справа) */}
      {activeLinkGeometry && (
        <aside
          aria-label="Навигация по связанным событиям"
          onMouseEnter={() => cancelScheduledHoverClear()}
          onMouseLeave={() => {
            if (pinnedHoverEventId !== activeLinkGeometry.sourceEvent.id) {
              scheduleClearHoverEvent();
            }
          }}
          className="xl:hidden fixed bottom-4 sm:bottom-5 left-3 right-3 sm:left-auto sm:right-5 z-40 max-w-md sm:max-w-none sm:w-[376px] mx-auto sm:mx-0 max-h-[58vh] flex flex-col rounded-2xl border border-emerald-500/45 bg-[#0b1325]/98 backdrop-blur-md shadow-2xl overflow-hidden"
        >
          <div className="px-3.5 py-2.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2 font-sans">
            <div className="min-w-0">
              <div className="text-xs text-emerald-300 font-bold flex items-center gap-1.5 tabular-nums">
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Переход по связям (<span className="font-mono">{activeLinkGeometry.totalCount}</span>)
                </span>
              </div>
              <div className="text-xs font-bold text-white truncate mt-0.5">
                <span className="font-mono tabular-nums">{activeLinkGeometry.sourceEvent.period}</span> —{' '}
                {activeLinkGeometry.sourceEvent.title}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setPinnedHoverEventId((prev) =>
                    prev === activeLinkGeometry.sourceEvent.id
                      ? null
                      : activeLinkGeometry.sourceEvent.id,
                  )
                }
                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                  pinnedHoverEventId === activeLinkGeometry.sourceEvent.id
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                    : 'bg-slate-950/80 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Закрепить панель перехода при перемещении мыши"
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setPinnedHoverEventId(null);
                  cancelScheduledHoverClear();
                  onHoverEvent(null);
                }}
                aria-label="Скрыть панель перехода"
                className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-2.5 overflow-y-auto space-y-2.5 text-xs font-sans">
            {activeLinkGeometry.upItems.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-slate-400 px-1 flex items-center gap-1">
                  <ArrowUp className="w-3 h-3 text-emerald-400" />
                  <span>
                    Выше на ленте (<span className="font-mono tabular-nums">{activeLinkGeometry.upItems.length}</span>)
                  </span>
                </div>
                {activeLinkGeometry.upItems.map((lnk) => (
                  <button
                    key={lnk.targetEvent.id}
                    type="button"
                    onClick={() => onJumpToEvent(lnk.targetEvent.id)}
                    className="w-full text-left px-2.5 py-2 rounded-lg bg-slate-950/75 hover:bg-emerald-950/45 border border-slate-800 hover:border-emerald-500/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-300 min-w-0">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: lnk.branchColor }}
                        />
                        <span className="truncate">
                          <span className="font-mono tabular-nums">↑ {lnk.targetEvent.period}</span> · {lnk.branchLabel}
                        </span>
                      </span>
                      <span className="font-mono text-xs text-emerald-300 shrink-0 tabular-nums">
                        {lnk.rowDelta} стр.{lnk.yearDelta !== 0 ? ` · ${lnk.yearDelta} л.` : ''}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white truncate mt-0.5">
                      {lnk.targetEvent.title}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {activeLinkGeometry.downItems.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-slate-400 px-1 flex items-center gap-1">
                  <ArrowDown className="w-3 h-3 text-emerald-400" />
                  <span>
                    Ниже на ленте (<span className="font-mono tabular-nums">{activeLinkGeometry.downItems.length}</span>)
                  </span>
                </div>
                {activeLinkGeometry.downItems.map((lnk) => (
                  <button
                    key={lnk.targetEvent.id}
                    type="button"
                    onClick={() => onJumpToEvent(lnk.targetEvent.id)}
                    className="w-full text-left px-2.5 py-2 rounded-lg bg-slate-950/75 hover:bg-emerald-950/45 border border-slate-800 hover:border-emerald-500/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-300 min-w-0">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: lnk.branchColor }}
                        />
                        <span className="truncate">
                          <span className="font-mono tabular-nums">↓ {lnk.targetEvent.period}</span> · {lnk.branchLabel}
                        </span>
                      </span>
                      <span className="font-mono text-xs text-emerald-300 shrink-0 tabular-nums">
                        {lnk.rowDelta} стр.{lnk.yearDelta !== 0 ? ` · +${Math.abs(lnk.yearDelta)} л.` : ''}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white truncate mt-0.5">
                      {lnk.targetEvent.title}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {activeLinkGeometry.offStreamItems.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-amber-300/90 px-1">
                  Вне окна или в скрытых ветках (<span className="font-mono tabular-nums">{activeLinkGeometry.offStreamItems.length}</span>)
                </div>
                {activeLinkGeometry.offStreamItems.map((lnk) => (
                  <button
                    key={lnk.targetEvent.id}
                    type="button"
                    onClick={() => onJumpToEvent(lnk.targetEvent.id)}
                    className="w-full text-left px-2.5 py-2 rounded-lg bg-slate-950/75 hover:bg-amber-950/35 border border-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-300 min-w-0">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: lnk.branchColor }}
                        />
                        <span className="truncate">
                          <span className="font-mono tabular-nums">{lnk.targetEvent.period}</span> · {lnk.branchLabel}
                        </span>
                      </span>
                      <span className="text-xs font-semibold text-amber-300 shrink-0">
                        {lnk.isHiddenBranch ? 'Раскрыть →' : 'Перейти →'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white truncate mt-0.5">
                      {lnk.targetEvent.title}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
});
