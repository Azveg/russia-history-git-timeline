import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Crosshair,
  Crown,
  GitBranch,
  GitCommitHorizontal,
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
import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMacroRegionOption } from '../engine/regionFilter';
import {
  computeBranchSubLaneLayout,
  computeRulerSubLaneLayout,
  findMacroEraForYear,
  formatAxisGutterDate,
  formatCalendarDetailBadge,
  formatEventTitleWithPeriod,
  getDirectChildBranches,
  getEventEffectiveEndYear,
  getEventEffectiveStartYear,
  hasChildBranches,
  isBiographyNode,
  isBranchOrDescendantActive,
  isHistoricalEventNode,
  isMajorCampaignOrConflictNode,
  isScientistBioNode,
  isWriterBioNode,
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
import {
  TimelineStreamRow,
  computeNodeVisualStatusMeta,
} from './timeline/TimelineStreamRow';
import { precomputeTimelineLayout } from './timeline/timelineLayoutPrecompute';

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

const INITIAL_VISIBLE_ROWS = 48;
const LOAD_MORE_ROWS_STEP = 64;

function useIsSmUp(): boolean {
  const [isSmUp, setIsSmUp] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true;
    }
    return window.matchMedia('(min-width: 640px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(min-width: 640px)');
    const onChange = (e: MediaQueryListEvent) => setIsSmUp(e.matches);
    setIsSmUp(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isSmUp;
}

function getStreamRowKey(item: StreamRow, idx: number): string {
  if (item.rowType === 'ERA_START') return `era-${item.era.id}`;
  if (item.rowType === 'TIME_TICK') return `tick-${item.sortKey}-${idx}`;
  if (item.rowType === 'RULER_COMMIT') return `ruler-${item.rulerObj.id}`;
  if (item.rowType === 'RULER_END') return `ruler-end-${item.rulerObj.id}-${idx}`;
  if (item.rowType === 'EVENT_COMMIT') return `commit-${item.eventObj.id}-${idx}`;
  return `end-${item.eventObj.id}-${idx}`;
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
  const isDesktopGraph = useIsSmUp();
  const streamContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const graphHelpRef = useRef<HTMLDivElement | null>(null);
  const hoverClearTimerRef = useRef<number | null>(null);
  const tooltipOpenTimerRef = useRef<number | null>(null);
  const hoverActivateTimerRef = useRef<number | null>(null);
  const localJumpTimerRef = useRef<number | null>(null);
  const pendingScrollDomIdRef = useRef<string | null>(null);

  const [localHoveredEventId, setLocalHoveredEventId] = useState<string | null>(null);
  const [activeStickyRulerId, setActiveStickyRulerId] = useState<string | null>(null);
  const [hoveredCardTooltip, setHoveredCardTooltip] = useState<HoveredCardTooltipState | null>(null);
  const [isGraphHelpOpen, setIsGraphHelpOpen] = useState(false);
  const [pinnedHoverEventId, setPinnedHoverEventId] = useState<string | null>(null);
  const [localJumpDomId, setLocalJumpDomId] = useState<string | null>(null);
  const [visibleRowCount, setVisibleRowCount] = useState<number>(() =>
    Math.min(stream.length, INITIAL_VISIBLE_ROWS),
  );

  // Keep latest callbacks in ref so TimelineStreamRow memoization stays 100% stable
  const propsRef = useRef({
    onHoverEvent,
    onOpenCardModal,
    onOpenPeriodModal,
    onOpenEraModal,
    onSelectYearRange,
    onToggleFocusEvent,
    onRevealBranches,
    onSelectMacroRegion,
    cardDensity,
    streamLength: stream.length,
  });
  propsRef.current = {
    onHoverEvent,
    onOpenCardModal,
    onOpenPeriodModal,
    onOpenEraModal,
    onSelectYearRange,
    onToggleFocusEvent,
    onRevealBranches,
    onSelectMacroRegion,
    cardDensity,
    streamLength: stream.length,
  };

  const cancelScheduledTooltip = useCallback(() => {
    if (tooltipOpenTimerRef.current !== null) {
      window.clearTimeout(tooltipOpenTimerRef.current);
      tooltipOpenTimerRef.current = null;
    }
  }, []);

  const closeCardTooltip = useCallback(() => {
    cancelScheduledTooltip();
    setHoveredCardTooltip(null);
  }, [cancelScheduledTooltip]);

  const cancelScheduledHoverClear = useCallback(() => {
    if (hoverClearTimerRef.current !== null) {
      window.clearTimeout(hoverClearTimerRef.current);
      hoverClearTimerRef.current = null;
    }
    if (hoverActivateTimerRef.current !== null) {
      window.clearTimeout(hoverActivateTimerRef.current);
      hoverActivateTimerRef.current = null;
    }
  }, []);

  const activateHoverEvent = useCallback(
    (eventId: string) => {
      cancelScheduledHoverClear();
      setLocalHoveredEventId((prev) => (prev === eventId ? prev : eventId));
      hoverActivateTimerRef.current = window.setTimeout(() => {
        hoverActivateTimerRef.current = null;
        startTransition(() => {
          propsRef.current.onHoverEvent(eventId);
        });
      }, 140);
    },
    [cancelScheduledHoverClear],
  );

  const scheduleClearHoverEvent = useCallback(() => {
    cancelScheduledHoverClear();
    hoverClearTimerRef.current = window.setTimeout(() => {
      hoverClearTimerRef.current = null;
      setLocalHoveredEventId(null);
      startTransition(() => {
        propsRef.current.onHoverEvent(null);
      });
    }, 220);
  }, [cancelScheduledHoverClear]);

  const handleOpenCardTooltip = useCallback(
    (
      el: HTMLElement,
      ev: EnrichedEvent,
      branchLabel: string,
      branchColor: string,
      dateLabel: string,
    ) => {
      cancelScheduledTooltip();
      const isCompact = propsRef.current.cardDensity === 'compact';
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
      const delayMs = isCompact ? 140 : 350;
      const mode: 'full' | 'supplemental' = isCompact ? 'full' : 'supplemental';

      tooltipOpenTimerRef.current = window.setTimeout(() => {
        tooltipOpenTimerRef.current = null;
        setHoveredCardTooltip({
          ev,
          branchLabel,
          branchColor,
          dateLabel,
          mode,
          rect: {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
          },
        });
      }, delayMs);
    },
    [cancelScheduledTooltip],
  );

  const handleRowOpenCardModal = useCallback(
    (eventId: string) => {
      cancelScheduledHoverClear();
      closeCardTooltip();
      propsRef.current.onOpenCardModal(eventId);
    },
    [cancelScheduledHoverClear, closeCardTooltip],
  );

  const handleRowOpenPeriodModal = useCallback(
    (rulerId: string) => {
      cancelScheduledHoverClear();
      closeCardTooltip();
      propsRef.current.onOpenPeriodModal(rulerId);
    },
    [cancelScheduledHoverClear, closeCardTooltip],
  );

  const handleRowOpenEraModal = useCallback(
    (eraId: string) => {
      cancelScheduledHoverClear();
      propsRef.current.onOpenEraModal(eraId);
    },
    [cancelScheduledHoverClear],
  );

  const handleRowSelectYearRange = useCallback((from: number, to: number) => {
    propsRef.current.onSelectYearRange(from, to);
  }, []);

  const handleRowToggleFocusEvent = useCallback((eventId: string) => {
    propsRef.current.onToggleFocusEvent(eventId);
  }, []);

  const handleRowRevealBranches = useCallback((branchIds: string[]) => {
    propsRef.current.onRevealBranches?.(branchIds);
  }, []);

  const handleRowSelectMacroRegion = useCallback((region: MacroRegionId) => {
    propsRef.current.onSelectMacroRegion?.(region);
  }, []);

  useEffect(() => {
    return () => {
      cancelScheduledHoverClear();
      cancelScheduledTooltip();
      if (localJumpTimerRef.current !== null) {
        window.clearTimeout(localJumpTimerRef.current);
      }
    };
  }, [cancelScheduledHoverClear, cancelScheduledTooltip]);

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
  }, [defaultStickyRulerId, stream.length, cardDensity, closeCardTooltip]);

  useEffect(() => {
    const handleClear = () => closeCardTooltip();
    window.addEventListener('scroll', handleClear, { passive: true });
    window.addEventListener('resize', handleClear, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleClear);
      window.removeEventListener('resize', handleClear);
    };
  }, [closeCardTooltip]);

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

  // O(N) sweep-line precomputation of rails, per-event metadata, ongoing/carry-over wars & jump indices
  const precomputed = useMemo(
    () =>
      precomputeTimelineLayout({
        stream,
        matchingEvents,
        matchingRulers,
        branches,
        activeBranches,
        collapsedParents,
        hasRulersLane,
        rulerLayout,
        subLaneLayout,
        timeSpineX,
        includeSpacers: timeScaleMode === 'proportional',
      }),
    [
      stream,
      matchingEvents,
      matchingRulers,
      branches,
      activeBranches,
      collapsedParents,
      hasRulersLane,
      rulerLayout,
      subLaneLayout,
      timeSpineX,
      timeScaleMode,
    ],
  );

  const {
    rowRailsByIdx,
    spacerRailsByIdx,
    eventMetaById,
    carryOverWarsByEraId,
    ongoingWarsByRulerId,
    rowIndexByEventId,
    eventsWithEndRowInStream,
    rowIndexByDomId,
  } = precomputed;

  const rowIndexByDomIdRef = useRef(rowIndexByDomId);
  rowIndexByDomIdRef.current = rowIndexByDomId;

  // Reset initial visible window when stream changes, ensuring active jump target stays mounted
  const prevStreamRef = useRef<StreamRow[]>(stream);
  useEffect(() => {
    if (prevStreamRef.current === stream) return;
    prevStreamRef.current = stream;

    let minRequired = Math.min(stream.length, INITIAL_VISIBLE_ROWS);
    if (highlightedJumpId) {
      const jumpIdx =
        rowIndexByDomId.get(`row-${highlightedJumpId}`) ??
        rowIndexByDomId.get(highlightedJumpId);
      if (jumpIdx !== undefined) {
        minRequired = Math.max(minRequired, Math.min(stream.length, jumpIdx + 24));
      }
    }
    setVisibleRowCount(minRequired);
  }, [stream, highlightedJumpId, rowIndexByDomId]);

  // Expand rendered slice on demand when an external jump (App.tsx) targets a row beyond visibleRowCount
  useEffect(() => {
    if (!highlightedJumpId) return;
    const domId = rowIndexByDomId.has(`row-${highlightedJumpId}`)
      ? `row-${highlightedJumpId}`
      : rowIndexByDomId.has(highlightedJumpId)
        ? highlightedJumpId
        : null;
    if (!domId) return;

    const targetIdx = rowIndexByDomId.get(domId)!;
    if (targetIdx >= visibleRowCount) {
      pendingScrollDomIdRef.current = domId;
      setVisibleRowCount(Math.min(stream.length, targetIdx + 24));
    }
  }, [highlightedJumpId, rowIndexByDomId, visibleRowCount, stream.length]);

  // Execute deferred smooth scroll once target row has been mounted
  useEffect(() => {
    const domId = pendingScrollDomIdRef.current;
    if (!domId) return;
    const el = document.getElementById(domId);
    if (!el) return;
    pendingScrollDomIdRef.current = null;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [visibleRowCount, stream]);

  // Progressive infinite expansion as user scrolls down (non-blocking via startTransition)
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || visibleRowCount >= stream.length) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          startTransition(() => {
            setVisibleRowCount((prev) =>
              prev >= stream.length ? prev : Math.min(stream.length, prev + LOAD_MORE_ROWS_STEP),
            );
          });
        }
      },
      {
        root: null,
        rootMargin: '1200px 0px',
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleRowCount, stream.length]);

  const triggerScrollToDomRow = useCallback(
    (domId: string, eventId: string) => {
      closeCardTooltip();
      activateHoverEvent(eventId);

      const el = document.getElementById(domId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const targetIdx = rowIndexByDomIdRef.current.get(domId);
        if (targetIdx !== undefined) {
          pendingScrollDomIdRef.current = domId;
          setVisibleRowCount((prev) =>
            Math.max(prev, Math.min(propsRef.current.streamLength, targetIdx + 24)),
          );
        }
      }

      setLocalJumpDomId(domId);
      if (localJumpTimerRef.current !== null) {
        window.clearTimeout(localJumpTimerRef.current);
      }
      localJumpTimerRef.current = window.setTimeout(() => {
        setLocalJumpDomId(null);
        localJumpTimerRef.current = null;
      }, 2200);
    },
    [activateHoverEvent, closeCardTooltip],
  );

  // Observe mounted ruler anchors for sticky context banner
  useEffect(() => {
    const container = streamContainerRef.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;

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
  }, [stream, visibleRowCount, cardDensity]);

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
    return matchingEvents.filter((ev) =>
      ev.overlappingRulers.some((r) => r.id === activeStickyRuler.id),
    ).length;
  }, [activeStickyRuler, matchingEvents]);

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

  const matchingEventById = useMemo(() => {
    const map = new Map<string, EnrichedEvent>();
    for (const ev of matchingEvents) {
      map.set(ev.id, ev);
    }
    return map;
  }, [matchingEvents]);

  const effectiveActiveEventId = pinnedHoverEventId || localHoveredEventId || hoveredEventId;
  const hoveredEvent = effectiveActiveEventId
    ? (matchingEventById.get(effectiveActiveEventId) ?? null)
    : null;
  const hoveredEventMeta = hoveredEvent ? (eventMetaById.get(hoveredEvent.id) ?? null) : null;

  const linkedEventIds = useMemo(() => {
    const set = new Set<string>();
    if (hoveredEvent) {
      hoveredEvent.explicitLinks.forEach((lnk) => {
        set.add(lnk.targetEvent.id);
      });
    } else if (effectiveActiveEventId) {
      (manifest.crossLinks || []).forEach((lnk) => {
        if (lnk.from === effectiveActiveEventId) set.add(lnk.to);
        if (lnk.to === effectiveActiveEventId) set.add(lnk.from);
      });
    }
    return set;
  }, [hoveredEvent, effectiveActiveEventId, manifest.crossLinks]);

  const buildLinkGeometryForEvent = useCallback(
    (sourceEvent: EnrichedEvent | null, requireInStream: boolean) => {
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
          rowDelta:
            sourceRowIdx !== undefined && tRowIdx !== undefined
              ? Math.abs(tRowIdx - sourceRowIdx)
              : null,
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
    },
    [rowIndexByEventId, branches, activeBranches],
  );

  const activeLinkGeometry = useMemo(
    () => buildLinkGeometryForEvent(hoveredEvent, true),
    [buildLinkGeometryForEvent, hoveredEvent],
  );

  const inspectorSourceEvent = hoveredEvent ?? focusedEvent ?? null;
  const inspectorLinkGeometry = useMemo(
    () => buildLinkGeometryForEvent(inspectorSourceEvent, false),
    [buildLinkGeometryForEvent, inspectorSourceEvent],
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

  const effectiveVisibleCount = Math.min(stream.length, Math.max(INITIAL_VISIBLE_ROWS, visibleRowCount));
  const renderedStream = useMemo(
    () => (effectiveVisibleCount < stream.length ? stream.slice(0, effectiveVisibleCount) : stream),
    [stream, effectiveVisibleCount],
  );
  const remainingRowsCount = Math.max(0, stream.length - renderedStream.length);

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

            <div
              ref={graphHelpRef}
              className="relative flex items-center gap-2 shrink-0 text-[11px] font-mono text-slate-400"
            >
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

          {renderedStream.map((item, idx) => {
            const prevItem = idx > 0 ? stream[idx - 1] : null;
            const deltaYears =
              timeScaleMode === 'proportional' && prevItem
                ? Math.max(0, item.year - prevItem.year)
                : 0;
            const spacerHeight =
              deltaYears >= 2 ? Math.min(168, Math.max(22, Math.round(deltaYears * 4.5))) : 0;

            const showSpacerBus =
              spacerHeight > 0 &&
              activeLinkGeometry !== null &&
              activeLinkGeometry.hasSpanOnCanvas &&
              idx - 0.5 >= activeLinkGeometry.minSpanIdx &&
              idx - 0.5 <= activeLinkGeometry.maxSpanIdx;

            const showBusSegment =
              activeLinkGeometry !== null &&
              activeLinkGeometry.hasSpanOnCanvas &&
              idx >= activeLinkGeometry.minSpanIdx &&
              idx <= activeLinkGeometry.maxSpanIdx;
            const busY1 =
              showBusSegment && activeLinkGeometry && idx === activeLinkGeometry.minSpanIdx ? 22 : 0;
            const busY2 =
              showBusSegment && activeLinkGeometry && idx === activeLinkGeometry.maxSpanIdx ? 22 : 420;

            const rowRails = rowRailsByIdx[idx];
            const spacerRails = spacerRailsByIdx[idx];

            // Compute minimal per-row passing rail hover state so untouched rows skip re-rendering
            let hoveredPassingRailId: string | null = null;
            let linkedPassingRailIdsKey = '';
            const hasPassingRails = rowRails.passingByLane.size > 0;
            const dimOtherPassingRails = hasPassingRails && effectiveActiveEventId !== null;

            if (hasPassingRails && effectiveActiveEventId !== null) {
              let linkedHits: string[] | null = null;
              rowRails.passingByLane.forEach((bucket) => {
                for (const rail of bucket.rails) {
                  if (rail.eventId === effectiveActiveEventId) {
                    hoveredPassingRailId = rail.eventId;
                  } else if (linkedEventIds.has(rail.eventId)) {
                    if (!linkedHits) linkedHits = [];
                    linkedHits.push(rail.eventId);
                  }
                }
              });
              if (linkedHits) {
                linkedPassingRailIdsKey = (linkedHits as string[]).join(',');
              }
            }

            let eventMeta = undefined;
            let isSelfHovered = false;
            let isCrossLinked = false;
            let isOverlapping = false;
            let isFocusedTarget = false;
            let focusDistance: number | undefined = undefined;
            let isJumpHighlighted = false;
            let isConnectedToBus = false;
            let showUpArrow = false;
            let showDownArrow = false;
            let hasEndRowInStream = false;
            let hasStartRowInStream = false;
            let auditInfo: AuditCandidateInfo | undefined = undefined;
            let carryOverWars: EnrichedEvent[] | undefined = undefined;
            let ongoingWars: EnrichedEvent[] | undefined = undefined;

            if (item.rowType === 'ERA_START') {
              carryOverWars = carryOverWarsByEraId.get(item.era.id);
            } else if (item.rowType === 'RULER_COMMIT') {
              ongoingWars = ongoingWarsByRulerId.get(item.rulerObj.id);
              isJumpHighlighted = highlightedJumpId === item.rulerObj.id;
            } else if (item.rowType === 'EVENT_COMMIT') {
              const ev = item.eventObj;
              eventMeta = eventMetaById.get(ev.id);
              isSelfHovered = effectiveActiveEventId === ev.id;
              isCrossLinked = effectiveActiveEventId !== null && linkedEventIds.has(ev.id);
              isOverlapping = Boolean(
                hoveredEvent &&
                  hoveredEventMeta &&
                  hoveredEvent.id !== ev.id &&
                  eventMeta &&
                  eventMeta.effStartYear <= hoveredEventMeta.effEndYear &&
                  eventMeta.effEndYear >= hoveredEventMeta.effStartYear,
              );
              isFocusedTarget = focusedEvent?.id === ev.id;
              focusDistance = focusedEvent ? focusDistanceMap?.get(ev.id) : undefined;
              isJumpHighlighted =
                highlightedJumpId === ev.id || localJumpDomId === `row-${ev.id}`;
              hasEndRowInStream = eventsWithEndRowInStream.has(ev.id);
              auditInfo = auditUnlinkedMode ? auditCandidateMap?.get(ev.id) : undefined;
              isConnectedToBus = Boolean(
                activeLinkGeometry &&
                  activeLinkGeometry.hasSpanOnCanvas &&
                  (isSelfHovered || isCrossLinked),
              );
              showUpArrow = Boolean(
                isConnectedToBus &&
                  isSelfHovered &&
                  activeLinkGeometry &&
                  activeLinkGeometry.upItems.length > 0,
              );
              showDownArrow = Boolean(
                isConnectedToBus &&
                  isSelfHovered &&
                  activeLinkGeometry &&
                  activeLinkGeometry.downItems.length > 0,
              );
            } else if (item.rowType === 'EVENT_END') {
              const ev = item.eventObj;
              eventMeta = eventMetaById.get(ev.id);
              isSelfHovered = effectiveActiveEventId === ev.id;
              isJumpHighlighted = localJumpDomId === `row-end-${ev.id}`;
              hasStartRowInStream = rowIndexByEventId.has(ev.id);
            }

            return (
              <TimelineStreamRow
                key={getStreamRowKey(item, idx)}
                item={item}
                idx={idx}
                gutter={gutterMeta[idx]}
                gutterWidthClass={gutterWidthClass}
                isDesktopGraph={isDesktopGraph}
                svgWidth={svgWidth}
                timeSpineX={timeSpineX}
                connectorBusX={connectorBusX}
                hasRulersLane={hasRulersLane}
                rulerLayout={rulerLayout}
                thematicLanes={thematicLanes}
                subLaneLayout={subLaneLayout}
                rowRails={rowRails}
                spacerRails={spacerRails}
                spacerHeight={spacerHeight}
                deltaYears={deltaYears}
                prevYear={prevItem ? prevItem.year : null}
                showSpacerBus={showSpacerBus}
                axisResolution={axisResolution}
                cardDensity={cardDensity}
                selectedMacroRegion={selectedMacroRegion}
                hasFocusedEvent={Boolean(focusedEvent)}
                focusDepth={focusDepth}
                eventMeta={eventMeta}
                carryOverWars={carryOverWars}
                ongoingWars={ongoingWars}
                auditInfo={auditInfo}
                hasEndRowInStream={hasEndRowInStream}
                hasStartRowInStream={hasStartRowInStream}
                isSelfHovered={isSelfHovered}
                isCrossLinked={isCrossLinked}
                isOverlapping={isOverlapping}
                isFocusedTarget={isFocusedTarget}
                focusDistance={focusDistance}
                isJumpHighlighted={isJumpHighlighted}
                isConnectedToBus={isConnectedToBus}
                showBusSegment={showBusSegment}
                busY1={busY1}
                busY2={busY2}
                showUpArrow={showUpArrow}
                showDownArrow={showDownArrow}
                dimOtherPassingRails={dimOtherPassingRails}
                hoveredPassingRailId={hoveredPassingRailId}
                linkedPassingRailIdsKey={linkedPassingRailIdsKey}
                onActivateHoverEvent={activateHoverEvent}
                onScheduleClearHoverEvent={scheduleClearHoverEvent}
                onOpenCardTooltip={handleOpenCardTooltip}
                onCloseCardTooltip={closeCardTooltip}
                onScrollToDomRow={triggerScrollToDomRow}
                onOpenCardModal={handleRowOpenCardModal}
                onOpenPeriodModal={handleRowOpenPeriodModal}
                onOpenEraModal={handleRowOpenEraModal}
                onSelectYearRange={handleRowSelectYearRange}
                onToggleFocusEvent={handleRowToggleFocusEvent}
                onRevealBranches={onRevealBranches ? handleRowRevealBranches : undefined}
                onSelectMacroRegion={onSelectMacroRegion ? handleRowSelectMacroRegion : undefined}
              />
            );
          })}

          {remainingRowsCount > 0 && (
            <div
              ref={loadMoreSentinelRef}
              className="px-4 py-4 bg-slate-950/75 flex flex-wrap items-center justify-center gap-3 text-xs font-sans text-slate-300"
            >
              <button
                type="button"
                onClick={() =>
                  startTransition(() => {
                    setVisibleRowCount((prev) => Math.min(stream.length, prev + LOAD_MORE_ROWS_STEP));
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/60 text-amber-200 font-semibold transition-colors cursor-pointer tabular-nums"
              >
                <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Показать следующие{' '}
                  <span className="font-mono">{Math.min(LOAD_MORE_ROWS_STEP, remainingRowsCount)}</span>{' '}
                  строк (осталось <span className="font-mono">{remainingRowsCount}</span>)
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  startTransition(() => {
                    setVisibleRowCount(stream.length);
                  })
                }
                className="px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Раскрыть всю ленту
              </button>
            </div>
          )}
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
                      setLocalHoveredEventId(null);
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
                  setLocalHoveredEventId(null);
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
