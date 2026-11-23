import {
  ArrowUpRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Crown,
  Flame,
  GitBranch,
  Layers,
  Link2,
  Minus,
  Pin,
  Plus,
  SlidersHorizontal,
  Undo2,
  X,
} from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MIN_WINDOW_DAYS,
  buildAdaptiveOverlapScale,
  computeDensityBins,
  computeZoomedJdnWindow,
  formatWindowDurationLabel,
  formatWindowRangeLabel,
  getEventJdnBounds,
  getInclusiveWindowDays,
  getLeafBranches,
  getRulerJdnBounds,
  isBiographyNode,
  jdnToIsoDate,
  packIntervalsIntoSubRows,
  parseIsoDateToJdn,
  yearEndJdn,
  yearStartJdn,
  type AdaptiveScanSample,
  type EventJdnBounds,
  type OverlapScaleMode,
} from '../engine/timelineEngine';
import type {
  BranchDefinition,
  EnrichedEvent,
  ExactJdnWindow,
  RulerPeriod,
  SpanPreset,
  YearRangeStep,
} from '../types/timeline';

interface OverlapMapSectionProps {
  matchingEvents: EnrichedEvent[];
  rulers: RulerPeriod[];
  branches: BranchDefinition[];
  activeBranches: Record<string, boolean>;
  yearFrom: number;
  yearTo: number;
  exactDateRange?: ExactJdnWindow | null;
  omittedYearOnlyCount?: number;
  includeUndatedYearEvents?: boolean;
  onToggleIncludeUndatedYearEvents?: () => void;
  minYear: number;
  maxYear: number;
  hoveredEventId: string | null;
  onHoverEvent: (id: string | null) => void;
  onOpenCardModal: (id: string) => void;
  onOpenPeriodModal: (rulerId: string) => void;
  onOpenWindowModal?: (from: number, to: number) => void;
  onSelectYearRange: (from: number, to: number, recordHistory?: boolean) => void;
  onSelectExactDateRange?: (fromJdn: number, toJdn: number, recordHistory?: boolean) => void;
  zoomHistoryCount: number;
  lastZoomStep: YearRangeStep | null;
  isExpanded: boolean;
  onStepBackZoom: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onShiftWindow: (direction: -1 | 1) => void;
  onApplySpanPreset: (preset: SpanPreset, preferredAnchorJdn?: number) => void;
  onRecordZoomCheckpoint: () => void;
}

const RULER_BAR_COLORS = ['#fbbf24', '#38bdf8', '#c084fc', '#34d399', '#f472b6', '#fb923c'];

interface ScanCursorState {
  sample: AdaptiveScanSample;
  pct: number;
  clientX: number;
  clientY: number;
}

interface DragBrushState {
  startPct: number;
  currentPct: number;
}

const POPOVER_WIDTH = 344;
const POPOVER_MAX_HEIGHT = 360;

export const OverlapMapSection = memo(function OverlapMapSection({
  matchingEvents,
  rulers,
  branches,
  activeBranches,
  yearFrom,
  yearTo,
  exactDateRange = null,
  omittedYearOnlyCount = 0,
  includeUndatedYearEvents = false,
  onToggleIncludeUndatedYearEvents,
  minYear,
  maxYear,
  hoveredEventId,
  onHoverEvent,
  onOpenCardModal,
  onOpenPeriodModal,
  onOpenWindowModal,
  onSelectYearRange,
  onSelectExactDateRange,
  zoomHistoryCount,
  lastZoomStep,
  isExpanded,
  onStepBackZoom,
  onZoomIn,
  onZoomOut,
  onShiftWindow,
  onApplySpanPreset,
  onRecordZoomCheckpoint,
}: OverlapMapSectionProps) {
  const [scaleMode, setScaleMode] = useState<OverlapScaleMode>('adaptive');
  const [cursorState, setCursorState] = useState<ScanCursorState | null>(null);
  const [pinnedState, setPinnedState] = useState<ScanCursorState | null>(null);
  const [dragBrush, setDragBrush] = useState<DragBrushState | null>(null);
  const [viewportTick, setViewportTick] = useState(0);
  const scrubberTrackRef = useRef<HTMLDivElement | null>(null);
  const scaleTrackRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lastWheelCheckpointRef = useRef<number>(0);
  const suppressNextStageClickRef = useRef(false);

  const globalStartJdn = yearStartJdn(minYear);
  const globalEndJdn = yearEndJdn(maxYear);
  const globalDays = getInclusiveWindowDays(globalStartJdn, globalEndJdn);
  const activeFromJdn = exactDateRange ? exactDateRange.fromJdn : yearStartJdn(yearFrom);
  const activeToJdn = exactDateRange ? exactDateRange.toJdn : yearEndJdn(yearTo);
  const windowDays = getInclusiveWindowDays(activeFromJdn, activeToJdn);

  const [fromDateInput, setFromDateInput] = useState(() => jdnToIsoDate(activeFromJdn));
  const [toDateInput, setToDateInput] = useState(() => jdnToIsoDate(activeToJdn));

  useEffect(() => {
    setFromDateInput(jdnToIsoDate(activeFromJdn));
    setToDateInput(jdnToIsoDate(activeToJdn));
  }, [activeFromJdn, activeToJdn]);

  const span = Math.max(1, yearTo - yearFrom);
  const globalSpan = Math.max(1, maxYear - minYear);
  const rulersActive = activeBranches.MAIN_RULERS !== false;
  const shiftStepLabel = exactDateRange
    ? formatWindowDurationLabel(Math.max(1, Math.round(windowDays / 2)))
    : `${Math.max(1, Math.round(span / 2))} л.`;

  const canZoomIn = windowDays > MIN_WINDOW_DAYS;
  const canZoomOut = windowDays < globalDays - 1;
  const canShiftLeft = activeFromJdn > globalStartJdn;
  const canShiftRight = activeToJdn < globalEndJdn;

  const isFullPeriodActive = !exactDateRange && yearFrom <= minYear && yearTo >= maxYear;
  const isCenturyActive = !isFullPeriodActive && !exactDateRange && span >= 80 && span <= 120;
  const isDecadeActive = !exactDateRange && span >= 8 && span <= 12;
  const isOneYearActive = !exactDateRange && yearFrom === yearTo;
  const isMonthActive = Boolean(exactDateRange) && windowDays >= 20 && windowDays <= 45;
  const isWeekActive = Boolean(exactDateRange) && windowDays <= 14;

  const visibleRulers = useMemo(
    () =>
      rulers.filter((r) => {
        if (r.endYear < yearFrom || r.startYear > yearTo) return false;
        if (exactDateRange) {
          const b = getRulerJdnBounds(r);
          return b.endJdn >= exactDateRange.fromJdn && b.startJdn <= exactDateRange.toJdn;
        }
        return true;
      }),
    [rulers, yearFrom, yearTo, exactDateRange],
  );

  const visibleEventBranches = useMemo(
    () => getLeafBranches(branches).filter((b) => !b.isTimeAxis && activeBranches[b.id]),
    [branches, activeBranches],
  );

  // Глобальная гистограмма плотности на весь диапазон 862–2000 для интерактивного скраббера
  const globalDensityBins = useMemo(
    () => computeDensityBins(matchingEvents, minYear, maxYear, 36),
    [matchingEvents, minYear, maxYear],
  );

  const maxGlobalCount = useMemo(
    () => Math.max(1, ...globalDensityBins.map((b) => b.totalCount)),
    [globalDensityBins],
  );

  // Локальная гистограмма плотности для выбранного окна (вычисляется только при раскрытой карте)
  const densityBins = useMemo(
    () => (isExpanded ? computeDensityBins(matchingEvents, yearFrom, yearTo, 28) : []),
    [isExpanded, matchingEvents, yearFrom, yearTo],
  );

  const maxBinCount = useMemo(
    () => Math.max(1, ...densityBins.map((b) => b.totalCount)),
    [densityBins],
  );

  const peakBin = useMemo(() => {
    let best = densityBins[0] ?? null;
    for (const bin of densityBins) {
      if (!best || bin.totalCount > best.totalCount) {
        best = bin;
      }
    }
    return best;
  }, [densityBins]);

  const hoveredEvent = useMemo(
    () => (hoveredEventId ? matchingEvents.find((e) => e.id === hoveredEventId) ?? null : null),
    [hoveredEventId, matchingEvents],
  );

  const linkedIds = useMemo(() => {
    const s = new Set<string>();
    if (!hoveredEvent) return s;
    hoveredEvent.explicitLinks.forEach((l) => s.add(l.otherId));
    return s;
  }, [hoveredEvent]);

  const visibleBranchIdSet = useMemo(
    () => new Set(visibleEventBranches.map((b) => b.id)),
    [visibleEventBranches],
  );

  const visibleBranchEvents = useMemo(() => {
    const filtered = matchingEvents.filter((e) => visibleBranchIdSet.has(e.task));
    return filtered.length > 0 ? filtered : matchingEvents;
  }, [matchingEvents, visibleBranchIdSet]);

  const adaptiveScale = useMemo(
    () =>
      buildAdaptiveOverlapScale(
        visibleBranchEvents,
        yearFrom,
        yearTo,
        scaleMode,
        branches,
        exactDateRange,
      ),
    [visibleBranchEvents, yearFrom, yearTo, scaleMode, branches, exactDateRange],
  );

  const eventJdnMap = useMemo(() => {
    const map = new Map<string, EventJdnBounds>();
    for (let i = 0; i < matchingEvents.length; i += 1) {
      const ev = matchingEvents[i];
      map.set(ev.id, getEventJdnBounds(ev, branches));
    }
    return map;
  }, [matchingEvents, branches]);

  const rulerJdnMap = useMemo(() => {
    const map = new Map<string, { startJdn: number; endJdn: number }>();
    for (let i = 0; i < visibleRulers.length; i += 1) {
      const r = visibleRulers[i];
      map.set(r.id, getRulerJdnBounds(r));
    }
    return map;
  }, [visibleRulers]);

  const hoveredEventBounds = useMemo(() => {
    if (!hoveredEvent) return null;
    return eventJdnMap.get(hoveredEvent.id) ?? getEventJdnBounds(hoveredEvent, branches);
  }, [hoveredEvent, eventJdnMap, branches]);

  const resolutionSummary =
    adaptiveScale.finestResolution === 'day'
      ? 'до дней'
      : adaptiveScale.finestResolution === 'month'
        ? 'до месяцев'
        : 'по годам';

  const windowFormatted = useMemo(
    () => formatWindowRangeLabel(activeFromJdn, activeToJdn, Boolean(exactDateRange)),
    [activeFromJdn, activeToJdn, exactDateRange],
  );
  const windowRangeLabel = windowFormatted.full;
  const windowRangeCompact = windowFormatted.compact;
  const windowDurationLabel = windowFormatted.durationLabel;
  const lastStepCompactLabel = lastZoomStep
    ? lastZoomStep.exactDateRange
      ? formatWindowRangeLabel(
          lastZoomStep.exactDateRange.fromJdn,
          lastZoomStep.exactDateRange.toJdn,
          true,
        ).compact
      : lastZoomStep.from === lastZoomStep.to
        ? `${lastZoomStep.from}`
        : `${lastZoomStep.from}–${lastZoomStep.to}`
    : null;

  const toGlobalPct = (year: number) => {
    const clamped = Math.max(minYear, Math.min(maxYear, year));
    return ((clamped - minYear) / globalSpan) * 100;
  };

  const toGlobalJdnPct = (jdn: number) => {
    const clamped = Math.max(globalStartJdn, Math.min(globalEndJdn, jdn));
    return ((clamped - globalStartJdn) / Math.max(1, globalEndJdn - globalStartJdn)) * 100;
  };

  const scrubberLeftPct = exactDateRange ? toGlobalJdnPct(activeFromJdn) : toGlobalPct(yearFrom);
  const scrubberRightPct = exactDateRange ? toGlobalJdnPct(activeToJdn) : toGlobalPct(yearTo);
  const scrubberWidthPct = Math.max(1.5, scrubberRightPct - scrubberLeftPct);
  const clampedScrubberLeftPct = Math.min(scrubberLeftPct, Math.max(0, 100 - scrubberWidthPct));

  const globalCenturyTicks = [900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000].filter(
    (y) => y >= minYear && y <= maxYear,
  );

  const isPinned = pinnedState !== null;

  const activeScan = useMemo(() => {
    const raw = pinnedState ?? cursorState;
    if (!raw) return null;
    const pct = isPinned ? adaptiveScale.jdnToPct(raw.sample.jdn) : raw.pct;
    const sample = isPinned ? adaptiveScale.pctToScanSample(pct) : raw.sample;
    return {
      sample,
      pct,
      clientX: raw.clientX,
      clientY: raw.clientY,
    };
  }, [pinnedState, cursorState, isPinned, adaptiveScale]);

  const activeScanSample = activeScan?.sample ?? null;
  const activeScanJdn = activeScanSample?.jdn ?? null;
  const pointHitDays = activeScanSample
    ? Math.min(730, Math.max(0, Math.round(activeScanSample.daysPerPct * 0.65)))
    : 0;

  useEffect(() => {
    if (!isExpanded) {
      setCursorState(null);
      setPinnedState(null);
    }
  }, [isExpanded]);

  useEffect(() => {
    if (
      pinnedState &&
      (pinnedState.sample.jdn < adaptiveScale.windowStartJdn ||
        pinnedState.sample.jdn > adaptiveScale.windowEndJdn)
    ) {
      setPinnedState(null);
    }
  }, [pinnedState, adaptiveScale.windowStartJdn, adaptiveScale.windowEndJdn]);

  useEffect(() => {
    if (!pinnedState) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPinnedState(null);
      }
    };
    const handleReposition = () => {
      setViewportTick((t) => t + 1);
    };
    const scrollEl = scrollContainerRef.current;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    scrollEl?.addEventListener('scroll', handleReposition);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
      scrollEl?.removeEventListener('scroll', handleReposition);
    };
  }, [pinnedState]);

  const packedRulerLayout = useMemo(() => {
    const items = visibleRulers.map((r) => {
      const bounds = rulerJdnMap.get(r.id) ?? getRulerJdnBounds(r);
      const rawLeft = adaptiveScale.jdnToPct(bounds.startJdn);
      const rawRight = adaptiveScale.jdnToPct(bounds.endJdn);
      const widthPct = Math.max(1.2, rawRight - rawLeft);
      const leftPct = Math.min(rawLeft, Math.max(0, 100 - widthPct));
      return {
        ruler: r,
        bounds,
        leftPct,
        widthPct,
      };
    });
    const packed = packIntervalsIntoSubRows(
      items.map((item) => ({ id: item.ruler.id, leftPct: item.leftPct, widthPct: item.widthPct })),
      0.35,
    );
    const rowHeight = 24;
    const rowGap = 3;
    const pad = 4;
    const trackHeight =
      packed.rowCount === 1
        ? 36
        : packed.rowCount * rowHeight + (packed.rowCount - 1) * rowGap + pad * 2;
    return {
      items,
      rowById: packed.rowById,
      rowCount: packed.rowCount,
      rowHeight,
      rowGap,
      pad,
      trackHeight,
    };
  }, [visibleRulers, rulerJdnMap, adaptiveScale]);

  const branchLayouts = useMemo(() => {
    const eventsByBranch = new Map<string, EnrichedEvent[]>();
    for (let i = 0; i < matchingEvents.length; i += 1) {
      const ev = matchingEvents[i];
      const list = eventsByBranch.get(ev.task);
      if (list) {
        list.push(ev);
      } else {
        eventsByBranch.set(ev.task, [ev]);
      }
    }

    return visibleEventBranches.map((branch) => {
      const branchEvents = eventsByBranch.get(branch.id) ?? [];
      const parentBranch = branch.parentBranchId
        ? branches.find((b) => b.id === branch.parentBranchId) ?? null
        : null;

      const items = branchEvents.map((ev) => {
        const bounds = eventJdnMap.get(ev.id) ?? getEventJdnBounds(ev, branches);
        const rawLeft = adaptiveScale.jdnToPct(bounds.startJdn);
        const rawRight = adaptiveScale.jdnToPct(bounds.endJdn);
        const rawSpan = Math.max(0, rawRight - rawLeft);
        const minWidth = bounds.isPoint
          ? bounds.precision === 'day'
            ? 1.15
            : 1.0
          : 1.25;
        const widthPct = Math.max(minWidth, rawSpan);
        const leftPct = Math.min(rawLeft, Math.max(0, 100 - widthPct));
        return {
          ev,
          bounds,
          leftPct,
          widthPct,
        };
      });

      const packed = packIntervalsIntoSubRows(
        items.map((item) => ({ id: item.ev.id, leftPct: item.leftPct, widthPct: item.widthPct })),
        0.45,
      );
      const rowHeight = packed.rowCount === 1 ? 24 : 20;
      const rowGap = 3;
      const pad = 4;
      const trackHeight =
        packed.rowCount === 1
          ? 32
          : packed.rowCount * rowHeight + (packed.rowCount - 1) * rowGap + pad * 2;

      return {
        branch,
        parentBranch,
        items,
        rowById: packed.rowById,
        rowCount: packed.rowCount,
        rowHeight,
        rowGap,
        pad,
        trackHeight,
      };
    });
  }, [matchingEvents, visibleEventBranches, branches, eventJdnMap, adaptiveScale]);

  const scanSlice = useMemo(() => {
    if (!activeScanSample || activeScanJdn === null) return null;

    const matchingRulers = rulersActive
      ? visibleRulers.filter((r) => {
          const b = rulerJdnMap.get(r.id);
          if (!b) return r.startYear <= activeScanSample.year && r.endYear >= activeScanSample.year;
          return b.startJdn <= activeScanJdn && b.endJdn >= activeScanJdn;
        })
      : [];

    const branchGroups: Array<{ branch: BranchDefinition; events: EnrichedEvent[] }> = [];
    let totalEvents = 0;

    for (const layout of branchLayouts) {
      const hits: Array<{ ev: EnrichedEvent; dist: number; startJdn: number }> = [];
      for (const item of layout.items) {
        const { ev, bounds } = item;
        if (bounds.startJdn <= activeScanJdn && bounds.endJdn >= activeScanJdn) {
          hits.push({ ev, dist: 0, startJdn: bounds.startJdn });
        } else if (bounds.isPoint) {
          const dist = Math.min(
            Math.abs(bounds.startJdn - activeScanJdn),
            Math.abs(bounds.endJdn - activeScanJdn),
          );
          if (dist <= pointHitDays) {
            hits.push({ ev, dist, startJdn: bounds.startJdn });
          }
        }
      }
      if (hits.length > 0) {
        hits.sort((a, b) => a.dist - b.dist || a.startJdn - b.startJdn);
        const events = hits.map((h) => h.ev);
        branchGroups.push({ branch: layout.branch, events });
        totalEvents += events.length;
      }
    }

    return {
      sample: activeScanSample,
      rulers: matchingRulers,
      branchGroups,
      totalEvents,
    };
  }, [activeScanSample, activeScanJdn, rulersActive, visibleRulers, rulerJdnMap, branchLayouts, pointHitDays]);

  const popoverCoords = useMemo(() => {
    if (!activeScan || typeof window === 'undefined') return null;

    let anchorX = activeScan.clientX;
    if (isPinned && scaleTrackRef.current) {
      const rect = scaleTrackRef.current.getBoundingClientRect();
      anchorX = rect.left + (activeScan.pct / 100) * rect.width;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const safeWidth = Math.min(POPOVER_WIDTH, vw - 24);
    const gap = 16;

    const fitsRight = anchorX + gap + safeWidth <= vw - 12;
    const rawLeft = fitsRight ? anchorX + gap : anchorX - gap - safeWidth;
    const left = Math.max(12, Math.min(rawLeft, vw - safeWidth - 12));

    const rawTop = activeScan.clientY - 36;
    const top = Math.max(12, Math.min(rawTop, vh - POPOVER_MAX_HEIGHT - 12));

    return { left, top, width: safeWidth };
  }, [activeScan, isPinned, viewportTick]);

  const computeScanFromClientX = (
    clientX: number,
  ): { sample: AdaptiveScanSample; pct: number } | null => {
    const track = scaleTrackRef.current;
    if (!track) return null;
    const rect = track.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || rect.width <= 0) {
      return null;
    }
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const sample = adaptiveScale.pctToScanSample(pct);
    return { sample, pct };
  };

  const handleStageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragBrush) return;
    const scan = computeScanFromClientX(e.clientX);
    if (!scan) {
      setCursorState(null);
      return;
    }
    setCursorState({ sample: scan.sample, pct: scan.pct, clientX: e.clientX, clientY: e.clientY });
  };

  const handleStageMouseLeave = () => {
    setCursorState(null);
  };

  const handleStageBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (suppressNextStageClickRef.current) {
      suppressNextStageClickRef.current = false;
      return;
    }
    const scan = computeScanFromClientX(e.clientX);
    if (!scan) return;
    if (pinnedState !== null) {
      setPinnedState(null);
      setCursorState({ sample: scan.sample, pct: scan.pct, clientX: e.clientX, clientY: e.clientY });
    } else {
      setPinnedState({ sample: scan.sample, pct: scan.pct, clientX: e.clientX, clientY: e.clientY });
    }
  };

  const beginDragBrushSelection = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !onSelectExactDateRange) return;
    const track = scaleTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0 || e.clientX < rect.left || e.clientX > rect.right) return;

    const startClientX = e.clientX;
    const startPct = Math.max(0, Math.min(100, ((startClientX - rect.left) / rect.width) * 100));
    let activeDrag = false;
    let latestPct = startPct;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = Math.abs(moveEvent.clientX - startClientX);
      if (!activeDrag && dx < 6) return;
      if (!activeDrag) {
        activeDrag = true;
        setCursorState(null);
      }
      latestPct = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      setDragBrush({ startPct, currentPct: latestPct });
    };

    const cleanup = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
    };

    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') {
        activeDrag = false;
        setDragBrush(null);
        cleanup();
      }
    };

    const onMouseUp = () => {
      cleanup();
      if (!activeDrag) return;
      suppressNextStageClickRef.current = true;
      setDragBrush(null);
      const minPct = Math.min(startPct, latestPct);
      const maxPct = Math.max(startPct, latestPct);
      if (maxPct - minPct < 0.4) return;
      const fromSample = adaptiveScale.pctToScanSample(minPct);
      const toSample = adaptiveScale.pctToScanSample(maxPct);
      setPinnedState(null);
      onSelectExactDateRange(fromSample.jdn, toSample.jdn, true);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);
  };

  const dragBrushPreview = useMemo(() => {
    if (!dragBrush) return null;
    const leftPct = Math.min(dragBrush.startPct, dragBrush.currentPct);
    const rightPct = Math.max(dragBrush.startPct, dragBrush.currentPct);
    const fromSample = adaptiveScale.pctToScanSample(leftPct);
    const toSample = adaptiveScale.pctToScanSample(rightPct);
    const rawDays = getInclusiveWindowDays(fromSample.jdn, toSample.jdn);
    const clampedDays = Math.max(MIN_WINDOW_DAYS, rawDays);
    const fmt = formatWindowRangeLabel(fromSample.jdn, toSample.jdn, true);
    return {
      leftPct,
      widthPct: Math.max(0.5, rightPct - leftPct),
      label:
        rawDays < MIN_WINDOW_DAYS
          ? `${fmt.compact} (мин. ${MIN_WINDOW_DAYS} дн.)`
          : `${fmt.compact} · ${formatWindowDurationLabel(clampedDays)}`,
    };
  }, [dragBrush, adaptiveScale]);

  const applyExactDateInputs = (nextFromRaw: string, nextToRaw: string) => {
    if (!onSelectExactDateRange) return;
    const parsedFrom = parseIsoDateToJdn(nextFromRaw);
    const parsedTo = parseIsoDateToJdn(nextToRaw);
    if (parsedFrom === null || parsedTo === null) {
      setFromDateInput(jdnToIsoDate(activeFromJdn));
      setToDateInput(jdnToIsoDate(activeToJdn));
      return;
    }
    const low = Math.min(parsedFrom, parsedTo);
    const high = Math.max(parsedFrom, parsedTo);
    onSelectExactDateRange(low, high, true);
  };

  const dragRafRef = useRef<number | null>(null);
  const wheelRafRef = useRef<number | null>(null);
  const lastEmittedJdnRef = useRef<{ fromJdn: number; toJdn: number }>({
    fromJdn: activeFromJdn,
    toJdn: activeToJdn,
  });

  useEffect(() => {
    lastEmittedJdnRef.current = { fromJdn: activeFromJdn, toJdn: activeToJdn };
  }, [activeFromJdn, activeToJdn]);

  useEffect(() => {
    return () => {
      if (dragRafRef.current !== null) {
        window.cancelAnimationFrame(dragRafRef.current);
      }
      if (wheelRafRef.current !== null) {
        window.cancelAnimationFrame(wheelRafRef.current);
      }
    };
  }, []);

  const selectBinYearRange = (startYear: number, endYear: number) => {
    const nextFrom = Math.max(minYear, Math.min(maxYear, Math.round(startYear)));
    const nextTo = Math.max(nextFrom, Math.min(maxYear, Math.round(endYear)));
    onSelectYearRange(nextFrom, nextTo, true);
  };

  useEffect(() => {
    const track = scrubberTrackRef.current;
    const scaleTrack = scaleTrackRef.current;
    if (!track && !scaleTrack) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.altKey && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const now = Date.now();
      if (now - lastWheelCheckpointRef.current > 450) {
        onRecordZoomCheckpoint();
        lastWheelCheckpointRef.current = now;
      }

      const factor = e.deltaY < 0 ? 0.7 : 1.4;
      const base = lastEmittedJdnRef.current;
      const next = computeZoomedJdnWindow(base.fromJdn, base.toJdn, factor, minYear, maxYear);
      const nextFromJdn = next.exactDateRange ? next.exactDateRange.fromJdn : yearStartJdn(next.yearFrom);
      const nextToJdn = next.exactDateRange ? next.exactDateRange.toJdn : yearEndJdn(next.yearTo);

      if (nextFromJdn === base.fromJdn && nextToJdn === base.toJdn) {
        return;
      }

      lastEmittedJdnRef.current = { fromJdn: nextFromJdn, toJdn: nextToJdn };
      if (wheelRafRef.current !== null) {
        window.cancelAnimationFrame(wheelRafRef.current);
      }
      wheelRafRef.current = window.requestAnimationFrame(() => {
        wheelRafRef.current = null;
        if (next.exactDateRange && onSelectExactDateRange) {
          onSelectExactDateRange(next.exactDateRange.fromJdn, next.exactDateRange.toJdn, false);
        } else {
          onSelectYearRange(next.yearFrom, next.yearTo, false);
        }
      });
    };

    track?.addEventListener('wheel', handleWheel, { passive: false });
    scaleTrack?.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      track?.removeEventListener('wheel', handleWheel);
      scaleTrack?.removeEventListener('wheel', handleWheel);
    };
  }, [
    activeFromJdn,
    activeToJdn,
    minYear,
    maxYear,
    isExpanded,
    onRecordZoomCheckpoint,
    onSelectYearRange,
    onSelectExactDateRange,
  ]);

  const handleTrackMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    mode: 'move' | 'left' | 'right',
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const track = scrubberTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const startX = e.clientX;
    const initFromJdn = activeFromJdn;
    const initToJdn = activeToJdn;
    const initDeltaJdn = Math.max(MIN_WINDOW_DAYS - 1, initToJdn - initFromJdn);
    const totalGlobalDelta = Math.max(1, globalEndJdn - globalStartJdn);
    const preserveExactSubYear = Boolean(exactDateRange) && mode === 'move';
    const initFromYear = yearFrom;
    const initToYear = yearTo;
    const currentWidthYears = Math.max(1, initToYear - initFromYear);

    onRecordZoomCheckpoint();

    let pendingJdn: { fromJdn: number; toJdn: number; exact: boolean; fromYear: number; toYear: number } | null =
      null;

    const flushPendingRange = () => {
      dragRafRef.current = null;
      if (!pendingJdn) return;
      const next = pendingJdn;
      pendingJdn = null;
      if (
        next.fromJdn === lastEmittedJdnRef.current.fromJdn &&
        next.toJdn === lastEmittedJdnRef.current.toJdn
      ) {
        return;
      }
      lastEmittedJdnRef.current = { fromJdn: next.fromJdn, toJdn: next.toJdn };
      if (next.exact && onSelectExactDateRange) {
        onSelectExactDateRange(next.fromJdn, next.toJdn, false);
      } else {
        onSelectYearRange(next.fromYear, next.toYear, false);
      }
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      if (preserveExactSubYear) {
        const deltaDays = Math.round((dx / Math.max(1, rect.width)) * totalGlobalDelta);
        let nextFromJdn = initFromJdn + deltaDays;
        let nextToJdn = initToJdn + deltaDays;
        if (nextFromJdn < globalStartJdn) {
          nextFromJdn = globalStartJdn;
          nextToJdn = Math.min(globalEndJdn, globalStartJdn + initDeltaJdn);
        }
        if (nextToJdn > globalEndJdn) {
          nextToJdn = globalEndJdn;
          nextFromJdn = Math.max(globalStartJdn, globalEndJdn - initDeltaJdn);
        }
        pendingJdn = {
          fromJdn: nextFromJdn,
          toJdn: nextToJdn,
          exact: true,
          fromYear: yearFrom,
          toYear: yearTo,
        };
      } else {
        const deltaYears = Math.round((dx / Math.max(1, rect.width)) * globalSpan);
        let nextFrom = initFromYear;
        let nextTo = initToYear;

        if (mode === 'move') {
          nextFrom = initFromYear + deltaYears;
          nextTo = initToYear + deltaYears;
          if (nextFrom < minYear) {
            nextFrom = minYear;
            nextTo = Math.min(maxYear, minYear + currentWidthYears);
          }
          if (nextTo > maxYear) {
            nextTo = maxYear;
            nextFrom = Math.max(minYear, maxYear - currentWidthYears);
          }
        } else if (mode === 'left') {
          nextFrom = Math.max(minYear, Math.min(initToYear, initFromYear + deltaYears));
          nextTo = initToYear;
        } else if (mode === 'right') {
          nextFrom = initFromYear;
          nextTo = Math.min(maxYear, Math.max(initFromYear, initToYear + deltaYears));
        }

        pendingJdn = {
          fromJdn: yearStartJdn(nextFrom),
          toJdn: yearEndJdn(nextTo),
          exact: false,
          fromYear: nextFrom,
          toYear: nextTo,
        };
      }

      if (dragRafRef.current === null) {
        dragRafRef.current = window.requestAnimationFrame(flushPendingRange);
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (dragRafRef.current !== null) {
        window.cancelAnimationFrame(dragRafRef.current);
        flushPendingRange();
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <section
      aria-label="Интерактивный скраббер времени и карта наложения процессов"
      className="rounded-2xl bg-slate-900/65 border border-slate-800/80 overflow-hidden"
    >
      {/* Компактный интерактивный скраббер окна времени (Time Brush) — виден всегда */}
      <div
        className={`px-3 sm:px-4 py-2 bg-slate-950/75 ${
          isExpanded ? 'space-y-2 border-b border-slate-800/80' : 'space-y-1.5'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono font-bold text-amber-300">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Шкала времени ({minYear}–{maxYear})</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400 hidden xl:inline tabular-nums">
              — перетаскивайте рамку, выделяйте интервал на шкале или Alt/Ctrl + колесо (окно: {windowDurationLabel})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              <strong className="text-slate-200 font-semibold">{windowRangeLabel}</strong> · {matchingEvents.length} соб.
            </span>
            {isExpanded && onOpenWindowModal && (
              <button
                type="button"
                onClick={() => onOpenWindowModal(yearFrom, yearTo)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-amber-200 text-[11px] font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap"
                title={`Открыть сводное досье для выбранного отрезка ${windowRangeLabel}`}
              >
                <BarChart3 className="w-3 h-3 text-amber-400" />
                <span>Досье окна</span>
              </button>
            )}
          </div>
        </div>

        {/* Полная панель управления масштабом, шагом окна и пресетами охвата — только при раскрытой карте */}
        {isExpanded && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Кнопка возврата на предыдущий шаг масштаба */}
              <button
                type="button"
                onClick={onStepBackZoom}
                disabled={zoomHistoryCount === 0}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  zoomHistoryCount > 0
                    ? 'bg-slate-900 hover:bg-slate-800 border-amber-500/45 text-amber-200 cursor-pointer'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-400/65 cursor-not-allowed'
                }`}
                title={
                  lastStepCompactLabel
                    ? `Вернуться к предыдущему масштабу: ${lastStepCompactLabel} (шагов в стеке: ${zoomHistoryCount})`
                    : 'История изменения масштаба пуста'
                }
              >
                <Undo2 className="w-3.5 h-3.5 shrink-0" />
                <span>Назад</span>
                {zoomHistoryCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold tabular-nums">
                    {lastStepCompactLabel ?? zoomHistoryCount}
                  </span>
                )}
              </button>

              {/* Кнопки приближения и отдаления ×2 вокруг центра текущего окна */}
              <div
                className="inline-flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px] font-mono shrink-0"
                role="group"
                aria-label="Приближение и отдаление масштаба"
              >
                <button
                  type="button"
                  onClick={onZoomOut}
                  disabled={!canZoomOut}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                    canZoomOut
                      ? 'text-slate-200 hover:bg-slate-800 hover:text-white cursor-pointer'
                      : 'text-slate-400/65 cursor-not-allowed'
                  }`}
                  title={
                    canZoomOut
                      ? `Отдалить временное окно в 2 раза (сейчас: ${windowDurationLabel})`
                      : `Открыт весь доступный период (${minYear}–${maxYear} гг.)`
                  }
                >
                  <Minus className="w-3.5 h-3.5 shrink-0" />
                  <span>Отдалить ×2</span>
                </button>

                <span className="w-px h-4 bg-slate-800 mx-0.5" aria-hidden="true" />

                <button
                  type="button"
                  onClick={onZoomIn}
                  disabled={!canZoomIn}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                    canZoomIn
                      ? 'text-amber-300 hover:bg-slate-800 hover:text-amber-200 font-semibold cursor-pointer'
                      : 'text-slate-400/65 cursor-not-allowed'
                  }`}
                  title={
                    canZoomIn
                      ? `Приблизить временное окно в 2 раза (вплоть до 7 дней)`
                      : 'Достигнуто максимальное приближение (1 неделя / 7 дней)'
                  }
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>Приблизить ×2</span>
                </button>
              </div>

              {/* Шаговый сдвиг окна влево / вправо */}
              <div
                className="inline-flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px] font-mono shrink-0"
                role="group"
                aria-label="Сдвиг временного окна"
              >
                <button
                  type="button"
                  onClick={() => onShiftWindow(-1)}
                  disabled={!canShiftLeft}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                    canShiftLeft
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer'
                      : 'text-slate-400/65 cursor-not-allowed'
                  }`}
                  title={
                    canShiftLeft
                      ? `Сдвинуть окно раньше на ${shiftStepLabel}`
                      : `Достигнуто начало хронологии (${minYear} г.)`
                  }
                >
                  <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                  <span>Ранее</span>
                </button>

                <span className="w-px h-4 bg-slate-800 mx-0.5" aria-hidden="true" />

                <button
                  type="button"
                  onClick={() => onShiftWindow(1)}
                  disabled={!canShiftRight}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                    canShiftRight
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer'
                      : 'text-slate-400/65 cursor-not-allowed'
                  }`}
                  title={
                    canShiftRight
                      ? `Сдвинуть окно позже на ${shiftStepLabel}`
                      : `Достигнут конец хронологии (${maxYear} г.)`
                  }
                >
                  <span>Позже</span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            </div>

            {/* Быстрые зум-переключатели масштаба (вплоть до 1 недели / 7 дней) */}
            <div
              className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px] font-mono"
              role="group"
              aria-label="Быстрые переключатели масштаба"
            >
              <span className="px-1.5 py-0.5 text-[10px] text-slate-400 hidden sm:inline">Охват:</span>
              <button
                type="button"
                onClick={() => onApplySpanPreset('all')}
                className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  isFullPeriodActive
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title={`Показать весь исторический период (${minYear}–${maxYear} гг.)`}
              >
                Весь период
              </button>
              {globalSpan >= 100 && (
                <button
                  type="button"
                  onClick={() => onApplySpanPreset(100, pinnedState?.sample.jdn)}
                  className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    isCenturyActive
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  title="Масштаб в 100 лет вокруг центра окна"
                >
                  100 л.
                </button>
              )}
              {globalSpan >= 10 && (
                <button
                  type="button"
                  onClick={() => onApplySpanPreset(10, pinnedState?.sample.jdn)}
                  className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    isDecadeActive
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  title="Масштаб в 10 лет (помесячная детализация оси)"
                >
                  10 л.
                </button>
              )}
              <button
                type="button"
                onClick={() => onApplySpanPreset(1, pinnedState?.sample.jdn)}
                className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  isOneYearActive
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title="Окно в 1 календарный год вокруг активных событий"
              >
                1 год
              </button>
              <button
                type="button"
                onClick={() => onApplySpanPreset('month', pinnedState?.sample.jdn)}
                className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  isMonthActive
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title="Узкое окно в 30 дней вокруг зафиксированной даты или ближайших событий с точными датами"
              >
                Месяц
              </button>
              <button
                type="button"
                onClick={() => onApplySpanPreset('week', pinnedState?.sample.jdn)}
                className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  isWeekActive
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title="Минимальное окно в 1 неделю (7 дней) для детального разбора сражений и кризисов по дням"
              >
                Неделя
              </button>
            </div>
          </div>
        )}

        {/* Интерактивная дорожка Time Brush с гистограммой */}
        <div
          ref={scrubberTrackRef}
          className={`relative ${isExpanded ? 'h-12' : 'h-10'} rounded-xl bg-slate-900/95 border border-slate-800 select-none overflow-hidden`}
        >
          {/* Фоновая глобальная гистограмма плотности */}
          <div className="absolute inset-x-0 bottom-4 top-1.5 flex items-end gap-[2px] px-1">
            {globalDensityBins.map((bin) => {
              const heightPct =
                bin.totalCount === 0 ? 6 : Math.max(14, Math.round((bin.totalCount / maxGlobalCount) * 100));
              const inWindow = bin.endYear >= yearFrom && bin.startYear <= yearTo;
              const rangeLabel =
                bin.startYear === bin.endYear
                  ? `${bin.startYear} г.`
                  : `${bin.startYear}–${bin.endYear} гг.`;
              return (
                <button
                  key={`global-bin-${bin.startYear}-${bin.endYear}`}
                  type="button"
                  onClick={() => selectBinYearRange(bin.startYear, bin.endYear)}
                  title={`${rangeLabel}: событий — ${bin.totalCount}. Клик для фокуса`}
                  className="flex-1 h-full flex items-end cursor-pointer group/gbin"
                >
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t transition-colors ${
                      inWindow
                        ? 'bg-amber-400/75 group-hover/gbin:bg-amber-300'
                        : 'bg-slate-700/45 group-hover/gbin:bg-slate-500/70'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Подписи веков внизу дорожки */}
          <div className="absolute inset-x-0 bottom-0 h-4 bg-slate-950/90 border-t border-slate-800/80 pointer-events-none">
            {globalCenturyTicks.map((tick) => (
              <span
                key={tick}
                style={{ left: `${toGlobalPct(tick)}%` }}
                className="absolute top-0.5 -translate-x-1/2 text-[9px] font-mono text-slate-300 tabular-nums"
              >
                {tick}
              </span>
            ))}
          </div>

          {/* Затемнение областей вне выбранного окна */}
          <div
            style={{ width: `${clampedScrubberLeftPct}%` }}
            className="absolute inset-y-0 left-0 bg-slate-950/65 pointer-events-none"
          />
          <div
            style={{ width: `${Math.max(0, 100 - (clampedScrubberLeftPct + scrubberWidthPct))}%` }}
            className="absolute inset-y-0 right-0 bg-slate-950/65 pointer-events-none"
          />

          {/* Перетаскиваемое окно скраббера */}
          <div
            style={{
              left: `${clampedScrubberLeftPct}%`,
              width: `${scrubberWidthPct}%`,
            }}
            onMouseDown={(e) => handleTrackMouseDown(e, 'move')}
            title={`Перетащите окно времени влево или вправо (${windowRangeLabel})`}
            className="absolute inset-y-0 border-2 border-amber-400 bg-amber-400/10 cursor-grab active:cursor-grabbing flex items-center justify-between"
          >
            {/* Левый ползунок */}
            <div
              onMouseDown={(e) => handleTrackMouseDown(e, 'left')}
              title={`Изменить начало окна (${windowRangeLabel})`}
              className="w-2.5 h-full bg-amber-400/90 hover:bg-amber-300 cursor-ew-resize flex items-center justify-center"
            >
              <span className="w-0.5 h-4 bg-slate-950 rounded-full" />
            </div>

            {/* Правый ползунок */}
            <div
              onMouseDown={(e) => handleTrackMouseDown(e, 'right')}
              title={`Изменить конец окна (${windowRangeLabel})`}
              className="w-2.5 h-full bg-amber-400/90 hover:bg-amber-300 cursor-ew-resize flex items-center justify-center"
            >
              <span className="w-0.5 h-4 bg-slate-950 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 sm:px-5 pb-4 pt-3 space-y-4">
          {/* Гистограмма исторической плотности выбранного окна (клик по столбцу = зум) */}
          <div className="rounded-xl bg-slate-950/80 border border-slate-800/80 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-200 font-semibold">
                  Концентрация исторических процессов в окне {windowRangeLabel} (клик по интервалу — фокус):
                </span>
              </div>
              <div className="flex items-center gap-3">
                {peakBin && peakBin.totalCount > 0 && (
                  <button
                    type="button"
                    onClick={() => selectBinYearRange(peakBin.startYear, peakBin.endYear)}
                    className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 cursor-pointer"
                    title="Перейти к самому насыщенному интервалу времени"
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      Пик эпохи:{' '}
                      {peakBin.startYear === peakBin.endYear
                        ? `${peakBin.startYear}`
                        : `${peakBin.startYear}–${peakBin.endYear}`}{' '}
                      ({peakBin.totalCount} соб.)
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="h-12 flex items-end gap-1 pt-1">
              {densityBins.map((bin) => {
                const heightPct =
                  bin.totalCount === 0 ? 6 : Math.max(14, Math.round((bin.totalCount / maxBinCount) * 100));
                const isPeak = peakBin?.startYear === bin.startYear && peakBin?.endYear === bin.endYear && bin.totalCount > 0;
                const hasHovered =
                  hoveredEvent !== null &&
                  hoveredEvent.startYear <= bin.endYear &&
                  hoveredEvent.endYear >= bin.startYear;
                const rangeLabel =
                  bin.startYear === bin.endYear
                    ? `${bin.startYear} г.`
                    : `${bin.startYear}–${bin.endYear} гг.`;

                return (
                  <button
                    key={`bin-${bin.startYear}-${bin.endYear}`}
                    type="button"
                    onClick={() => selectBinYearRange(bin.startYear, bin.endYear)}
                    title={`${rangeLabel}: активных событий — ${bin.totalCount}, новых событий — ${bin.commitCount}. Клик для фокуса`}
                    className="group flex-1 h-full flex flex-col justify-end items-stretch cursor-pointer focus:outline-none"
                  >
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t transition-all ${
                        hasHovered
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                          : isPeak
                            ? 'bg-amber-400 group-hover:bg-amber-300'
                            : bin.totalCount > 0
                              ? 'bg-sky-500/55 group-hover:bg-amber-400/80'
                              : 'bg-slate-800/60 group-hover:bg-slate-700'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Панель режима шкалы и точного ввода дат (до дня / недели) */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex flex-wrap items-center gap-2.5">
              <div
                className="inline-flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5 shrink-0"
                role="group"
                aria-label="Режим шкалы карты полос"
              >
                <button
                  type="button"
                  onClick={() => setScaleMode('adaptive')}
                  aria-pressed={scaleMode === 'adaptive'}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    scaleMode === 'adaptive'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  title="Адаптивная шкала подстраивает шаг под плотность событий (десятилетия, месяцы, дни) и сжимает пустые паузы"
                >
                  Адаптивная
                </button>
                <button
                  type="button"
                  onClick={() => setScaleMode('linear')}
                  aria-pressed={scaleMode === 'linear'}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    scaleMode === 'linear'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  title="Равномерная линейная шкала с точной суточной привязкой дат"
                >
                  Линейная
                </button>
              </div>

              <span className="text-slate-400 tabular-nums">
                {scaleMode === 'adaptive' ? (
                  <>
                    Шаг: <strong className="text-slate-200 font-semibold">{resolutionSummary}</strong>
                    {adaptiveScale.hasCompressedGaps && (
                      <>
                        {' · '}пауз:{' '}
                        <strong className="text-amber-300/90 font-semibold">
                          {adaptiveScale.gapSegments.length}
                        </strong>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    Линейно · <strong className="text-slate-200 font-semibold">{resolutionSummary}</strong>
                  </>
                )}
              </span>
            </div>

            {/* Компактный ввод точных дат «С / По» (мин. 7 дней) */}
            {onSelectExactDateRange && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-400">Даты:</span>
                <input
                  type="date"
                  aria-label="Дата начала окна"
                  min={jdnToIsoDate(globalStartJdn)}
                  max={jdnToIsoDate(globalEndJdn)}
                  value={fromDateInput}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setFromDateInput(nextVal);
                    if (/^\d{4}-\d{2}-\d{2}$/.test(nextVal)) {
                      applyExactDateInputs(nextVal, toDateInput);
                    }
                  }}
                  onBlur={() => applyExactDateInputs(fromDateInput, toDateInput)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      applyExactDateInputs(fromDateInput, toDateInput);
                    }
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-md px-1.5 py-0.5 text-[11px] font-mono text-amber-200 tabular-nums focus:outline-none focus:border-amber-500"
                />
                <span className="text-slate-500">—</span>
                <input
                  type="date"
                  aria-label="Дата окончания окна"
                  min={jdnToIsoDate(globalStartJdn)}
                  max={jdnToIsoDate(globalEndJdn)}
                  value={toDateInput}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setToDateInput(nextVal);
                    if (/^\d{4}-\d{2}-\d{2}$/.test(nextVal)) {
                      applyExactDateInputs(fromDateInput, nextVal);
                    }
                  }}
                  onBlur={() => applyExactDateInputs(fromDateInput, toDateInput)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      applyExactDateInputs(fromDateInput, toDateInput);
                    }
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-md px-1.5 py-0.5 text-[11px] font-mono text-amber-200 tabular-nums focus:outline-none focus:border-amber-500"
                />
                {exactDateRange && (
                  <button
                    type="button"
                    onClick={() => onSelectYearRange(yearFrom, yearTo, true)}
                    className="px-2 py-0.5 rounded-md border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title={`Вернуть полные календарные годы (${yearFrom === yearTo ? `${yearFrom} г.` : `${yearFrom}–${yearTo} гг.`})`}
                  >
                    К годам
                  </button>
                )}
              </div>
            )}
          </div>

          {exactDateRange && (omittedYearOnlyCount > 0 || includeUndatedYearEvents) && onToggleIncludeUndatedYearEvents && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-950/75 border border-slate-800/75 text-[11px] font-mono text-slate-400">
              <span className="tabular-nums">
                {includeUndatedYearEvents
                  ? 'В узком окне показаны также годовые записи без точной даты дня/месяца.'
                  : `Показаны события с точными датами и идущие фоновые процессы · скрыто годовых записей без точного дня: ${omittedYearOnlyCount}`}
              </span>
              <button
                type="button"
                onClick={onToggleIncludeUndatedYearEvents}
                className="text-amber-300 hover:text-amber-200 underline underline-offset-2 cursor-pointer shrink-0"
              >
                {includeUndatedYearEvents ? 'Скрыть годовые без дня' : 'Показать'}
              </button>
            </div>
          )}

          <div ref={scrollContainerRef} className="overflow-x-auto pb-1">
            <div
              onMouseMove={handleStageMouseMove}
              onMouseLeave={handleStageMouseLeave}
              onMouseDown={(e) => {
                if (e.shiftKey) {
                  beginDragBrushSelection(e);
                }
              }}
              onClick={handleStageBackgroundClick}
              className={`relative min-w-[680px] ${dragBrush ? 'select-none' : ''}`}
            >
              <div className="space-y-2.5">
                {/* Адаптивная или линейная шкала с врезками сжатых пауз и выделением мышью (Drag-to-Zoom) */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-40 shrink-0 text-[11px] font-mono text-slate-400 uppercase tracking-wider truncate"
                    title={`${scaleMode === 'adaptive' ? 'Адаптивная шкала' : 'Линейная шкала'}: ${windowRangeLabel}`}
                  >
                    {scaleMode === 'adaptive' ? 'Шкала' : 'Линейно'} ({windowRangeCompact})
                  </div>
                  <div
                    ref={scaleTrackRef}
                    onMouseDown={beginDragBrushSelection}
                    title="Протяните мышью по шкале, чтобы приблизить выбранный интервал (мин. 7 дней), или кликните для фиксации даты"
                    className="relative flex-1 h-7 bg-slate-950/90 rounded-lg border border-slate-800/80 overflow-hidden cursor-crosshair select-none"
                  >
                    {/* Тонкие пунктирные врезки сжатых пустых пауз */}
                    {adaptiveScale.gapSegments.map((gap) => (
                      <button
                        key={gap.id}
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectExactDateRange && gap.durationDays < 360) {
                            onSelectExactDateRange(gap.startJdn, gap.endJdn, true);
                          } else {
                            selectBinYearRange(gap.startYear, gap.endYear);
                          }
                        }}
                        title={`${gap.gapTooltip}. Клик — приблизить интервал`}
                        style={{
                          left: `${gap.leftPct}%`,
                          width: `${Math.max(1.2, gap.rightPct - gap.leftPct)}%`,
                        }}
                        className="absolute inset-y-0 z-10 border-x border-dashed border-amber-500/45 bg-slate-900/90 hover:bg-slate-800/95 transition-colors flex items-center justify-center overflow-hidden cursor-pointer group/gap"
                      >
                        <span className="px-0.5 text-[9px] font-mono text-amber-300/85 group-hover/gap:text-amber-200 tabular-nums truncate">
                          {gap.gapLabel}
                        </span>
                      </button>
                    ))}

                    {/* Адаптивные метки (дни / месяцы / годы / десятилетия) */}
                    {adaptiveScale.ticks.map((tick) => (
                      <div
                        key={tick.key}
                        style={{ left: `${tick.pct}%` }}
                        className={`absolute top-0 bottom-0 border-l pointer-events-none flex items-center ${
                          tick.isMajor ? 'border-slate-600/80' : 'border-slate-700/55'
                        }`}
                      >
                        <span
                          className={`pl-1 text-[10px] font-mono tabular-nums whitespace-nowrap ${
                            tick.isMajor ? 'text-slate-200 font-semibold' : 'text-slate-400'
                          }`}
                        >
                          {tick.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Лента правителей с точной JDN-позицией и подстроками при наложении */}
                {rulersActive && (
                  <div
                    className={`flex gap-3 ${
                      packedRulerLayout.rowCount > 1 ? 'items-start' : 'items-center'
                    }`}
                  >
                    <div
                      className={`w-40 shrink-0 flex items-center gap-2 text-xs font-mono text-amber-300 font-semibold ${
                        packedRulerLayout.rowCount > 1 ? 'pt-2' : ''
                      }`}
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">Правления</span>
                    </div>
                    <div
                      style={{ height: `${packedRulerLayout.trackHeight}px` }}
                      className="relative flex-1 bg-slate-950/90 rounded-lg border border-slate-800/90 overflow-hidden cursor-crosshair"
                    >
                      {adaptiveScale.gapSegments.map((gap) => (
                        <div
                          key={`ruler-gap-${gap.id}`}
                          style={{
                            left: `${gap.leftPct}%`,
                            width: `${Math.max(1.2, gap.rightPct - gap.leftPct)}%`,
                          }}
                          className="absolute inset-y-0 border-x border-dashed border-slate-700/60 bg-slate-900/45 pointer-events-none"
                        />
                      ))}
                      {adaptiveScale.ticks.map((tick) => (
                        <div
                          key={`ruler-${tick.key}`}
                          style={{ left: `${tick.pct}%` }}
                          className="absolute top-0 bottom-0 border-l border-slate-800/50 pointer-events-none"
                        />
                      ))}
                      {packedRulerLayout.items.map(({ ruler: r, bounds, leftPct, widthPct }, idx) => {
                        const rowIdx = packedRulerLayout.rowById.get(r.id) ?? 0;
                        const topPx =
                          packedRulerLayout.rowCount === 1
                            ? 4
                            : packedRulerLayout.pad +
                              rowIdx * (packedRulerLayout.rowHeight + packedRulerLayout.rowGap);
                        const heightPx =
                          packedRulerLayout.rowCount === 1 ? 28 : packedRulerLayout.rowHeight;
                        const color = RULER_BAR_COLORS[idx % RULER_BAR_COLORS.length];
                        const isOverlappingHovered =
                          hoveredEventBounds !== null &&
                          bounds.endJdn >= hoveredEventBounds.startJdn &&
                          bounds.startJdn <= hoveredEventBounds.endJdn;
                        const isAtScanDate =
                          activeScanJdn !== null &&
                          bounds.startJdn <= activeScanJdn &&
                          bounds.endJdn >= activeScanJdn;

                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenPeriodModal(r.id);
                            }}
                            title={`${r.ruler} (${r.reignPeriod})${r.center ? ` [${r.center}]` : ''} — клик для сводки правления`}
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              top: `${topPx}px`,
                              height: `${heightPx}px`,
                              backgroundColor: isOverlappingHovered
                                ? `${color}44`
                                : isAtScanDate
                                  ? `${color}38`
                                  : `${color}24`,
                              borderColor: color,
                            }}
                            className={`absolute rounded border text-left px-1.5 overflow-hidden transition-all hover:z-20 hover:brightness-125 cursor-pointer flex items-center ${
                              isOverlappingHovered
                                ? 'ring-1 ring-amber-300 z-10'
                                : isAtScanDate
                                  ? 'ring-1 ring-amber-400/60 z-10'
                                  : ''
                            }`}
                          >
                            <span className="block text-[10px] font-mono font-bold text-white truncate">
                              {r.shortRuler} ({r.reignPeriod})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Полосы по каждой активной ветке событий с компактными подстроками */}
                {branchLayouts.map((layout) => {
                  const {
                    branch,
                    parentBranch,
                    items,
                    rowById,
                    rowCount,
                    rowHeight,
                    rowGap,
                    pad,
                    trackHeight,
                  } = layout;
                  const needsScrollCap = trackHeight > 168;

                  return (
                    <div
                      key={branch.id}
                      className={`flex gap-3 ${rowCount > 1 ? 'items-start' : 'items-center'}`}
                    >
                      <div
                        className={`w-40 shrink-0 flex items-center justify-between gap-1.5 text-xs font-mono text-slate-300 ${
                          rowCount > 1 ? 'pt-1.5' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: branch.color }}
                          />
                          {parentBranch && (
                            <span title={`Ветка внутри группы «${parentBranch.label}»`}>
                              <GitBranch className="w-3 h-3 text-slate-400 shrink-0" />
                            </span>
                          )}
                          <span
                            className="truncate font-semibold"
                            title={
                              rowCount > 1
                                ? `${branch.label} · параллельных подстрок: ${rowCount}`
                                : branch.label
                            }
                          >
                            {branch.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                          {items.length}
                        </span>
                      </div>

                      <div
                        className={`relative flex-1 bg-slate-950/90 rounded-lg border border-slate-800/90 cursor-crosshair ${
                          needsScrollCap ? 'max-h-[168px] overflow-y-auto overflow-x-hidden' : 'overflow-hidden'
                        }`}
                      >
                        <div style={{ height: `${trackHeight}px` }} className="relative w-full">
                          {/* Вертикальные пунктирные швы сжатых пауз */}
                          {adaptiveScale.gapSegments.map((gap) => (
                            <div
                              key={`${branch.id}-gap-${gap.id}`}
                              style={{
                                left: `${gap.leftPct}%`,
                                width: `${Math.max(1.2, gap.rightPct - gap.leftPct)}%`,
                              }}
                              className="absolute inset-y-0 border-x border-dashed border-slate-700/55 bg-slate-900/45 pointer-events-none"
                            />
                          ))}

                          {/* Вертикальная сетка адаптивных меток */}
                          {adaptiveScale.ticks.map((tick) => (
                            <div
                              key={`${branch.id}-${tick.key}`}
                              style={{ left: `${tick.pct}%` }}
                              className="absolute top-0 bottom-0 border-l border-slate-800/50 pointer-events-none"
                            />
                          ))}

                          {items.map(({ ev, bounds, leftPct, widthPct }) => {
                            const isBio = isBiographyNode(ev, branches);
                            const rowIdx = rowById.get(ev.id) ?? 0;
                            const topPx = pad + rowIdx * (rowHeight + rowGap);
                            const isHovered = hoveredEventId === ev.id;
                            const isLinked = linkedIds.has(ev.id);
                            const isConcurrent =
                              hoveredEvent !== null &&
                              hoveredEventBounds !== null &&
                              hoveredEvent.id !== ev.id &&
                              bounds.startJdn <= hoveredEventBounds.endJdn &&
                              bounds.endJdn >= hoveredEventBounds.startJdn;
                            const isAtScanDate =
                              activeScanJdn !== null &&
                              ((bounds.startJdn <= activeScanJdn && bounds.endJdn >= activeScanJdn) ||
                                (bounds.isPoint &&
                                  Math.min(
                                    Math.abs(bounds.startJdn - activeScanJdn),
                                    Math.abs(bounds.endJdn - activeScanJdn),
                                  ) <= pointHitDays));

                            return (
                              <button
                                key={ev.id}
                                type="button"
                                onMouseEnter={() => onHoverEvent(ev.id)}
                                onMouseLeave={() => onHoverEvent(null)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenCardModal(ev.id);
                                }}
                                title={
                                  isBio
                                    ? `${ev.title} (годы жизни: ${ev.period}, активен: ${ev.activeFrom}–${ev.activeTo}) · связей: ${ev.explicitLinks.length}`
                                    : `${ev.period}: ${ev.title} (правлений: ${ev.overlappingRulers.length}, связей: ${ev.explicitLinks.length})`
                                }
                                style={{
                                  left: `${leftPct}%`,
                                  width: `${widthPct}%`,
                                  top: `${topPx}px`,
                                  height: `${rowHeight}px`,
                                  backgroundColor: isHovered
                                    ? branch.color
                                    : isLinked
                                      ? '#10b981'
                                      : isAtScanDate
                                        ? `${branch.color}80`
                                        : `${branch.color}36`,
                                  borderColor: isHovered
                                    ? branch.color
                                    : isLinked
                                      ? '#34d399'
                                      : `${branch.color}a6`,
                                }}
                                className={`absolute rounded border text-left px-1 overflow-hidden transition-all cursor-pointer hover:z-20 flex items-center ${
                                  isHovered
                                    ? 'z-30 ring-2 ring-white'
                                    : isLinked
                                      ? 'z-20 ring-2 ring-emerald-300'
                                      : isConcurrent
                                        ? 'z-10 ring-1 ring-amber-300/70'
                                        : isAtScanDate
                                          ? 'z-10 ring-1 ring-amber-300/85'
                                          : ''
                                }`}
                              >
                                {widthPct > 4.2 && (
                                  <span className="block text-[10px] font-mono font-semibold text-white truncate">
                                    {ev.title}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Выделение области мышью (Drag-to-Zoom) поверх всех дорожек */}
              {dragBrushPreview && (
                <div
                  aria-hidden="true"
                  style={{ left: 'calc(10rem + 0.75rem)', right: 0 }}
                  className="pointer-events-none absolute inset-y-0 z-40"
                >
                  <div
                    style={{
                      left: `${dragBrushPreview.leftPct}%`,
                      width: `${dragBrushPreview.widthPct}%`,
                    }}
                    className="absolute inset-y-0 bg-amber-400/18 border-x border-amber-400"
                  >
                    <div className="absolute top-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-mono font-bold tabular-nums whitespace-nowrap shadow-md">
                      {dragBrushPreview.label}
                    </div>
                  </div>
                </div>
              )}

              {/* Вертикальный сканлайн-курсор синхронизации поверх всех дорожек */}
              {!dragBrushPreview && activeScan && activeScanSample && (
                <div
                  aria-hidden="true"
                  style={{ left: 'calc(10rem + 0.75rem)', right: 0 }}
                  className="pointer-events-none absolute inset-y-0 z-30"
                >
                  {(() => {
                    const scanPct = activeScan.pct;
                    const badgeAlignClass =
                      scanPct < 14
                        ? 'translate-x-0.5'
                        : scanPct > 86
                          ? '-translate-x-full -ml-0.5'
                          : '-translate-x-1/2';
                    return (
                      <div style={{ left: `${scanPct}%` }} className="absolute inset-y-0 w-0">
                        <div
                          className={`absolute top-0.5 ${badgeAlignClass} inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums shadow-md whitespace-nowrap ${
                            isPinned
                              ? 'bg-amber-300 text-slate-950 ring-1 ring-white/80'
                              : 'bg-amber-400 text-slate-950'
                          }`}
                        >
                          {isPinned && <Pin className="w-2.5 h-2.5 shrink-0" />}
                          <span>{activeScanSample.formattedBadge}</span>
                        </div>
                        <div
                          className={`absolute top-7 bottom-0 -translate-x-1/2 ${
                            isPinned
                              ? 'w-0.5 bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.7)]'
                              : 'w-px bg-amber-400/90 shadow-[0_0_8px_rgba(251,191,36,0.55)]'
                          }`}
                        />
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Плавающий поповер синхронного среза выбранной даты */}
          {scanSlice && popoverCoords && typeof document !== 'undefined' &&
            createPortal(
              <div
                role={isPinned ? 'dialog' : 'status'}
                aria-modal={isPinned ? 'false' : undefined}
                aria-label={`Срез процессов: ${scanSlice.sample.formattedFull}`}
                onClick={(e) => e.stopPropagation()}
                style={{
                  left: `${popoverCoords.left}px`,
                  top: `${popoverCoords.top}px`,
                  width: `${popoverCoords.width}px`,
                  maxHeight: `${POPOVER_MAX_HEIGHT}px`,
                  zIndex: 55,
                }}
                className={`fixed flex flex-col rounded-xl bg-slate-950/95 backdrop-blur-md border shadow-2xl overflow-hidden ${
                  isPinned
                    ? 'pointer-events-auto border-amber-400/65'
                    : 'pointer-events-none border-slate-700/90'
                }`}
              >
                <div className="px-3 py-2 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <Crosshair className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-xs font-sans font-bold text-amber-300 tabular-nums">
                        <span className="font-mono">{scanSlice.sample.formattedFull}</span>
                      </span>
                      <span className="text-xs font-mono text-slate-400 tabular-nums">
                        {scanSlice.totalEvents} соб. · {scanSlice.rulers.length} правл.
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs font-sans text-slate-400">
                      {isPinned ? (
                        <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                          <Pin className="w-3 h-3" />
                          <span>Зафиксирован · кликните по пункту для открытия</span>
                        </span>
                      ) : scanSlice.sample.segmentKind === 'gap' ? (
                        <span>Сжатая пауза без новых событий · клик фиксирует дату</span>
                      ) : (
                        <span>Клик по фону дорожки фиксирует дату</span>
                      )}
                    </div>
                  </div>

                  {isPinned && (
                    <div className="flex items-center gap-1 shrink-0">
                      {onSelectExactDateRange && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectExactDateRange(
                              scanSlice.sample.jdn - 3,
                              scanSlice.sample.jdn + 3,
                              true,
                            );
                            setPinnedState(null);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono text-amber-200 hover:text-slate-950 hover:bg-amber-400 border border-amber-500/45 transition-colors cursor-pointer shrink-0"
                          title={`Приблизить окно до 1 недели вокруг ${scanSlice.sample.formattedBadge} (±3 дн.)`}
                        >
                          <span>Неделя</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPinnedState(null)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-sans text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/80 transition-colors cursor-pointer shrink-0"
                        title="Снять фиксацию даты (Esc)"
                      >
                        <X className="w-3 h-3" />
                        <span>Открепить</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-2.5 overflow-y-auto space-y-2.5 text-xs font-sans">
                  {scanSlice.rulers.length === 0 && scanSlice.branchGroups.length === 0 ? (
                    <p className="py-2 text-center text-xs font-sans text-slate-400">
                      На дату <span className="font-mono tabular-nums">{scanSlice.sample.formattedBadge}</span> нет активных событий по выбранным фильтрам
                    </p>
                  ) : (
                    <>
                      {scanSlice.rulers.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-sans font-semibold text-amber-300/90">
                            <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Правление</span>
                          </div>
                          <div className="space-y-1">
                            {scanSlice.rulers.map((r) => (
                              <button
                                key={`slice-ruler-${r.id}`}
                                type="button"
                                onClick={() => onOpenPeriodModal(r.id)}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-900/85 hover:bg-slate-800 border border-slate-800/90 hover:border-amber-400/50 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-slate-100 truncate">
                                    {r.ruler}
                                  </div>
                                  <div className="text-xs font-sans text-slate-400 truncate">
                                    <span className="font-mono tabular-nums">{r.reignPeriod}</span>
                                    {r.center ? ` · ${r.center}` : ''}
                                  </div>
                                </div>
                                {isPinned && (
                                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {scanSlice.branchGroups.map(({ branch, events }) => (
                        <div key={`slice-branch-${branch.id}`} className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-xs font-sans font-semibold text-slate-300">
                            <span className="inline-flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: branch.color }}
                              />
                              <span className="truncate">{branch.label}</span>
                            </span>
                            <span className="font-mono text-slate-400 tabular-nums shrink-0">{events.length}</span>
                          </div>
                          <div className="space-y-1">
                            {events.map((ev) => {
                              const evBounds = eventJdnMap.get(ev.id);
                              const isPoint = evBounds?.isPoint ?? ev.startYear === ev.endYear;
                              const isEvHovered = hoveredEventId === ev.id;
                              return (
                                <button
                                  key={`slice-ev-${ev.id}`}
                                  type="button"
                                  onMouseEnter={() => onHoverEvent(ev.id)}
                                  onMouseLeave={() => onHoverEvent(null)}
                                  onClick={() => onOpenCardModal(ev.id)}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition-colors flex items-start justify-between gap-2 cursor-pointer ${
                                    isEvHovered
                                      ? 'bg-slate-800 border-amber-400/70'
                                      : 'bg-slate-900/75 hover:bg-slate-800 border-slate-800/80 hover:border-slate-600'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 text-xs font-sans text-slate-400">
                                      <span className="font-mono text-amber-300/95 font-semibold tabular-nums">{ev.period}</span>
                                      {isPoint && (
                                        <span className="text-slate-400">· точечное</span>
                                      )}
                                    </div>
                                    <div className="text-xs font-medium text-slate-100 leading-snug line-clamp-2">
                                      {ev.title}
                                    </div>
                                  </div>
                                  {isPinned && (
                                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>,
              document.body,
            )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/70">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Протяните по шкале (или Shift + перетаскивание) для приближения до недели · клик — фиксация даты</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <Link2 className="w-3.5 h-3.5" />
                <span>Зелёное свечение = причинно-следственная или культурная связь</span>
              </span>
            </div>
            {hoveredEvent ? (
              <span className="text-amber-300 font-semibold">
                Фокус: {hoveredEvent.period} — {hoveredEvent.title} (правлений:{' '}
                {hoveredEvent.overlappingRulers.length}, связей: {hoveredEvent.explicitLinks.length})
              </span>
            ) : isPinned && activeScanSample ? (
              <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold tabular-nums">
                <Pin className="w-3.5 h-3.5" />
                <span>Зафиксирован срез: {activeScanSample.formattedFull}</span>
              </span>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
});
