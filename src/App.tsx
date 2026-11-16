import { useCallback, useEffect, useMemo, useState } from 'react';
import { CardDetailModal } from './components/CardDetailModal';
import { DashboardHeader } from './components/DashboardHeader';
import { EraSummaryModal } from './components/EraSummaryModal';
import { FilterPanel } from './components/FilterPanel';
import { GitTimeline } from './components/GitTimeline';
import { OverlapMapSection } from './components/OverlapMapSection';
import { PeriodSummaryModal } from './components/PeriodSummaryModal';
import { SidebarLegend } from './components/SidebarLegend';
import { TopControlBar } from './components/TopControlBar';
import {
  buildUnifiedTimelineStream,
  computeBranchPresetMap,
  computeTimelineYearBounds,
  doesIntervalBelongToEra,
  extractBranchesFromStore,
  extractRulersFromStore,
  fetchTimelineRepository,
  getDescendantBranchIds,
  getEnrichedEvents,
  getVisibleLanes,
  hasChildBranches,
  intersectsTimeWindow,
  isBranchOrDescendantActive,
  isEventBranchActive,
  resolveEventBranch,
  resolveMacroEras,
} from './engine/timelineEngine';
import type {
  BranchDefinition,
  BranchPresetId,
  CardDensity,
  FocusScope,
  ModalHistoryItem,
  SyncManifest,
  TimelineDataFile,
  YearRangeStep,
} from './types/timeline';

export default function App() {
  const [manifest, setManifest] = useState<SyncManifest | null>(null);
  const [filesMap, setFilesMap] = useState<Record<string, TimelineDataFile>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeBranches, setActiveBranches] = useState<Record<string, boolean>>({});
  const [collapsedParents, setCollapsedParents] = useState<Record<string, boolean>>({});

  const [yearFrom, setYearFrom] = useState(862);
  const [yearTo, setYearTo] = useState(2000);
  const [zoomHistory, setZoomHistory] = useState<YearRangeStep[]>([]);
  const [selectedEra, setSelectedEra] = useState('ALL');
  const [selectedReign, setSelectedReign] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyWithSyncLinks, setOnlyWithSyncLinks] = useState(false);

  const [cardDensity, setCardDensity] = useState<CardDensity>('detailed');
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
  const [focusScope, setFocusScope] = useState<FocusScope>('sync_only');
  const [highlightedJumpId, setHighlightedJumpId] = useState<string | null>(null);

  const [showEndNodes, setShowEndNodes] = useState(true);
  const [showOverlapMatrix] = useState(true);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);
  const [activeEraModalId, setActiveEraModalId] = useState<string | null>(null);
  const [modalHistory, setModalHistory] = useState<ModalHistoryItem[]>([]);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const loadRepositoryData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const repo = await fetchTimelineRepository();
      setManifest(repo.manifest);
      setFilesMap(repo.files);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка загрузки данных';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRepositoryData();
  }, [loadRepositoryData]);

  useEffect(() => {
    if (!highlightedJumpId) return;
    const timer = window.setTimeout(() => setHighlightedJumpId(null), 2600);
    return () => window.clearTimeout(timer);
  }, [highlightedJumpId]);

  const handleCloseAllModals = useCallback(() => {
    setActiveCardId(null);
    setActivePeriodId(null);
    setActiveEraModalId(null);
    setModalHistory([]);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (activeCardId || activePeriodId || activeEraModalId) {
          handleCloseAllModals();
        } else if (focusedEventId) {
          setFocusedEventId(null);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCardId, activePeriodId, activeEraModalId, focusedEventId, handleCloseAllModals]);

  const branches = useMemo(() => {
    if (!manifest) return [];
    return extractBranchesFromStore(manifest, filesMap);
  }, [manifest, filesMap]);

  // Динамическая инициализация состояния веток: дефолтный стартовый пресет «Обзор истории» ('overview')
  useEffect(() => {
    if (branches.length === 0) return;

    setActiveBranches((prev) => {
      if (Object.keys(prev).length === 0) {
        return computeBranchPresetMap(branches, 'overview');
      }
      let changed = false;
      const next = { ...prev };
      const overviewMap = computeBranchPresetMap(branches, 'overview');
      branches.forEach((b) => {
        if (b.isGroup) return;
        if (next[b.id] === undefined) {
          next[b.id] = overviewMap[b.id] ?? false;
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    setCollapsedParents((prev) => {
      let changed = false;
      const next = { ...prev };
      branches.forEach((b) => {
        if (b.defaultCollapsedOnTimeline && next[b.id] === undefined) {
          next[b.id] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [branches]);

  const rulers = useMemo(() => {
    if (!manifest) return [];
    return extractRulersFromStore(manifest, filesMap);
  }, [manifest, filesMap]);

  const enrichedEvents = useMemo(() => {
    if (!manifest) return [];
    return getEnrichedEvents(manifest, filesMap, rulers);
  }, [manifest, filesMap, rulers]);

  const timelineBounds = useMemo(
    () => computeTimelineYearBounds(manifest, rulers, enrichedEvents),
    [manifest, rulers, enrichedEvents],
  );

  // Расширяем дефолтное окно лет, если подключённые модули охватывают более ранние или поздние годы
  useEffect(() => {
    if (!manifest) return;
    setYearFrom((prev) => (prev === 862 ? timelineBounds.minYear : Math.max(timelineBounds.minYear, prev)));
    setYearTo((prev) => (prev === 2000 ? timelineBounds.maxYear : Math.min(timelineBounds.maxYear, prev)));
  }, [manifest, timelineBounds.minYear, timelineBounds.maxYear]);

  // Изоляция устаревших ID при удалении файлов веток или правителей
  useEffect(() => {
    if (!manifest) return;
    if (selectedReign !== 'ALL' && !rulers.some((r) => r.id === selectedReign)) {
      setSelectedReign('ALL');
    }
    if (focusedEventId && !enrichedEvents.some((e) => e.id === focusedEventId)) {
      setFocusedEventId(null);
    }
    if (activeCardId && !enrichedEvents.some((e) => e.id === activeCardId)) {
      setActiveCardId(null);
    }
    if (activePeriodId && !rulers.some((r) => r.id === activePeriodId)) {
      setActivePeriodId(null);
    }
  }, [manifest, rulers, enrichedEvents, selectedReign, focusedEventId, activeCardId, activePeriodId]);

  const totalSyncLinksCount = useMemo(() => {
    const ids = new Set<string>();
    enrichedEvents.forEach((ev) => {
      ev.explicitLinks.forEach((lnk) => ids.add(lnk.id));
    });
    return ids.size;
  }, [enrichedEvents]);

  const visibleLanes = useMemo(
    () => getVisibleLanes(branches, activeBranches, collapsedParents),
    [branches, activeBranches, collapsedParents],
  );

  const { stream, matchingEvents, matchingRulers, focusedEvent, effectiveYearFrom, effectiveYearTo, axisResolution } =
    useMemo(() => {
      if (!manifest) {
        return {
          stream: [],
          matchingEvents: [],
          matchingRulers: [],
          focusedEvent: null,
          effectiveYearFrom: yearFrom,
          effectiveYearTo: yearTo,
          axisResolution: 'year' as const,
        };
      }
      return buildUnifiedTimelineStream(enrichedEvents, rulers, manifest, branches, {
        activeBranches,
        yearFrom,
        yearTo,
        selectedEra,
        selectedReign,
        searchQuery,
        onlyWithSyncLinks,
        focusedEventId,
        focusScope,
        showEndNodes,
        showOverlapMatrix,
      });
    }, [
    manifest,
    enrichedEvents,
    rulers,
    branches,
    activeBranches,
    yearFrom,
    yearTo,
    selectedEra,
    selectedReign,
    searchQuery,
    onlyWithSyncLinks,
    focusedEventId,
    focusScope,
    showEndNodes,
    showOverlapMatrix,
  ]);

  const displayLanes = useMemo(() => {
    if (!focusedEvent) return visibleLanes;
    const laneIds = new Set(visibleLanes.map((l) => l.id));
    const extras: BranchDefinition[] = [];
    matchingEvents.forEach((ev) => {
      const b = resolveEventBranch(ev, branches, collapsedParents);
      if (!laneIds.has(b.id)) {
        laneIds.add(b.id);
        extras.push(b);
      }
    });
    return extras.length > 0 ? [...visibleLanes, ...extras] : visibleLanes;
  }, [focusedEvent, visibleLanes, matchingEvents, branches, collapsedParents]);

  const branchControls = useMemo(() => {
    const byBranchCount: Record<string, number> = {};
    enrichedEvents.forEach((ev) => {
      if (intersectsTimeWindow(ev.startYear, ev.endYear, yearFrom, yearTo)) {
        byBranchCount[ev.task] = (byBranchCount[ev.task] || 0) + 1;
      }
    });

    return branches.map((b) => {
      if (b.id === 'MAIN_RULERS') {
        return { ...b, count: matchingRulers.length };
      }
      const descendants = getDescendantBranchIds(b.id, branches);
      if (descendants.length > 0) {
        const ownCount = b.isGroup ? 0 : (byBranchCount[b.id] || 0);
        const childSum = descendants.reduce((acc, dId) => acc + (byBranchCount[dId] || 0), 0);
        return { ...b, count: ownCount + childSum };
      }
      return { ...b, count: byBranchCount[b.id] || 0 };
    });
  }, [branches, enrichedEvents, matchingRulers.length, yearFrom, yearTo]);

  const resolvedMacroEras = useMemo(
    () => (manifest ? resolveMacroEras(manifest.macroEras) : []),
    [manifest],
  );

  // Текущие объекты модальных окон
  const activeCardObj = useMemo(
    () => (activeCardId ? enrichedEvents.find((e) => e.id === activeCardId) ?? null : null),
    [activeCardId, enrichedEvents],
  );

  const activeRulerObj = useMemo(
    () => (activePeriodId ? rulers.find((r) => r.id === activePeriodId) ?? null : null),
    [activePeriodId, rulers],
  );

  const activeEraObj = useMemo(
    () => (activeEraModalId ? manifest?.macroEras.find((e) => e.id === activeEraModalId) ?? null : null),
    [activeEraModalId, manifest],
  );

  // Стек навигации между модальными окнами («← Назад»)
  const pushCurrentModalToHistory = useCallback(() => {
    if (activeCardObj) {
      setModalHistory((prev) => [
        ...prev.slice(-9),
        { type: 'card', id: activeCardObj.id, label: `${activeCardObj.period} ${activeCardObj.title}` },
      ]);
    } else if (activeRulerObj) {
      setModalHistory((prev) => [
        ...prev.slice(-9),
        { type: 'ruler', id: activeRulerObj.id, label: `${activeRulerObj.shortRuler} (${activeRulerObj.reignPeriod})` },
      ]);
    } else if (activeEraObj) {
      setModalHistory((prev) => [
        ...prev.slice(-9),
        { type: 'era', id: activeEraObj.id, label: activeEraObj.shortTitle || activeEraObj.title },
      ]);
    }
  }, [activeCardObj, activeRulerObj, activeEraObj]);

  const handleOpenCardModal = useCallback(
    (cardId: string) => {
      if (cardId === activeCardId) return;
      if (activeCardId || activePeriodId || activeEraModalId) {
        pushCurrentModalToHistory();
      } else {
        setModalHistory([]);
      }
      setActivePeriodId(null);
      setActiveEraModalId(null);
      setActiveCardId(cardId);
    },
    [activeCardId, activePeriodId, activeEraModalId, pushCurrentModalToHistory],
  );

  const handleOpenPeriodModal = useCallback(
    (rulerId: string) => {
      if (rulerId === activePeriodId) return;
      if (activeCardId || activePeriodId || activeEraModalId) {
        pushCurrentModalToHistory();
      } else {
        setModalHistory([]);
      }
      setActiveCardId(null);
      setActiveEraModalId(null);
      setActivePeriodId(rulerId);
    },
    [activeCardId, activePeriodId, activeEraModalId, pushCurrentModalToHistory],
  );

  const handleOpenEraModal = useCallback(
    (eraId: string) => {
      if (eraId === activeEraModalId) return;
      if (activeCardId || activePeriodId || activeEraModalId) {
        pushCurrentModalToHistory();
      } else {
        setModalHistory([]);
      }
      setActiveCardId(null);
      setActivePeriodId(null);
      setActiveEraModalId(eraId);
    },
    [activeCardId, activePeriodId, activeEraModalId, pushCurrentModalToHistory],
  );

  const handleModalNavigateBack = useCallback(() => {
    if (modalHistory.length === 0) return;
    const last = modalHistory[modalHistory.length - 1];
    setModalHistory((prev) => prev.slice(0, -1));
    if (last.type === 'card') {
      setActivePeriodId(null);
      setActiveEraModalId(null);
      setActiveCardId(last.id);
    } else if (last.type === 'ruler') {
      setActiveCardId(null);
      setActiveEraModalId(null);
      setActivePeriodId(last.id);
    } else if (last.type === 'era') {
      setActiveCardId(null);
      setActivePeriodId(null);
      setActiveEraModalId(last.id);
    }
  }, [modalHistory]);

  function handleRecordZoomStep(fromVal: number, toVal: number) {
    setZoomHistory((prev) => {
      const top = prev[prev.length - 1];
      if (top && top.from === fromVal && top.to === toVal) return prev;
      return [...prev.slice(-19), { from: fromVal, to: toVal }];
    });
  }

  function handleYearRangeChange(fromVal: number, toVal: number, recordHistory = true) {
    let y1 = Number.isFinite(fromVal) ? Math.round(fromVal) : timelineBounds.minYear;
    let y2 = Number.isFinite(toVal) ? Math.round(toVal) : timelineBounds.maxYear;
    y1 = Math.max(timelineBounds.minYear, Math.min(timelineBounds.maxYear, y1));
    y2 = Math.max(timelineBounds.minYear, Math.min(timelineBounds.maxYear, y2));
    if (y1 > y2) {
      [y1, y2] = [y2, y1];
    }
    if (y1 === yearFrom && y2 === yearTo) return;
    if (recordHistory) {
      handleRecordZoomStep(yearFrom, yearTo);
    }
    setYearFrom(y1);
    setYearTo(y2);
  }

  function handleSelectEra(eraId: string) {
    if (eraId === 'ALL') {
      setSelectedEra('ALL');
      setSelectedReign('ALL');
      handleYearRangeChange(timelineBounds.minYear, timelineBounds.maxYear);
      return;
    }
    const targetEra = resolvedMacroEras.find((e) => e.id === eraId);
    const hasEraItems =
      targetEra &&
      (enrichedEvents.some((ev) => doesIntervalBelongToEra(ev.startYear, ev.endYear, ev.eraId, targetEra)) ||
        rulers.some((r) => doesIntervalBelongToEra(r.startYear, r.endYear, r.eraId, targetEra)));

    if (targetEra && targetEra.endYear < timelineBounds.minYear && !hasEraItems) {
      handleOpenEraModal(targetEra.id);
      return;
    }
    setSelectedEra(eraId);
    setSelectedReign('ALL');
    if (targetEra) {
      handleYearRangeChange(
        Math.max(timelineBounds.minYear, targetEra.startYear),
        Math.min(timelineBounds.maxYear, targetEra.endYear),
      );
    } else {
      handleYearRangeChange(timelineBounds.minYear, timelineBounds.maxYear);
    }
  }

  function handleSelectReign(rulerId: string) {
    const normalized = !rulerId || rulerId === 'ALL' ? 'ALL' : rulerId;
    setSelectedReign(normalized);
    if (normalized !== 'ALL') {
      const r = rulers.find((item) => item.id === normalized);
      if (r) handleYearRangeChange(r.startYear, r.endYear);
    } else {
      handleYearRangeChange(timelineBounds.minYear, timelineBounds.maxYear);
    }
  }

  function handleResetFiltersOnly() {
    setSelectedEra('ALL');
    setSelectedReign('ALL');
    setSearchQuery('');
    setOnlyWithSyncLinks(false);
    setFocusedEventId(null);
    setZoomHistory([]);
    setYearFrom(timelineBounds.minYear);
    setYearTo(timelineBounds.maxYear);
  }

  function handleResetAll() {
    handleResetFiltersOnly();
    const nextActive = computeBranchPresetMap(branches, 'overview');
    const nextCollapsed: Record<string, boolean> = {};
    branches.forEach((b) => {
      if (b.defaultCollapsedOnTimeline) {
        nextCollapsed[b.id] = true;
      }
    });
    setActiveBranches(nextActive);
    setCollapsedParents(nextCollapsed);
  }

  function handleToggleFocusEvent(eventId: string) {
    setFocusedEventId((prev) => {
      const next = prev === eventId ? null : eventId;
      if (next) {
        const ev = enrichedEvents.find((e) => e.id === next);
        if (ev) {
          showToast(`Режим фокуса связей: «${ev.title}». Нажмите Esc для возврата.`);
        }
      }
      return next;
    });
  }

  function handleJumpToEvent(targetEventId: string) {
    const target = enrichedEvents.find((e) => e.id === targetEventId);
    if (!target) return;

    const adjustments: string[] = [];

    if (!isEventBranchActive(target, activeBranches)) {
      setActiveBranches((prev) => ({ ...prev, [target.task]: true }));
      adjustments.push('включена ветка');
    }

    if (target.endYear < yearFrom || target.startYear > yearTo) {
      const nextFrom = Math.min(yearFrom, target.startYear);
      const nextTo = Math.max(yearTo, target.endYear);
      handleYearRangeChange(nextFrom, nextTo);
      adjustments.push(`окно расширено до ${nextFrom}–${nextTo}`);
    }

    if (selectedEra !== 'ALL' && target.eraId !== selectedEra) {
      setSelectedEra('ALL');
    }
    if (selectedReign !== 'ALL' && !target.overlappingRulers.some((r) => r.id === selectedReign)) {
      setSelectedReign('ALL');
    }
    if (searchQuery.trim() !== '') {
      setSearchQuery('');
    }

    if (focusedEventId && !matchingEvents.some((e) => e.id === target.id)) {
      setFocusedEventId(null);
      adjustments.push('снят фокус');
    }

    setHighlightedJumpId(target.id);
    if (adjustments.length > 0) {
      showToast(`Переход к «${target.title}» (${adjustments.join(', ')}).`);
    } else {
      showToast(`Переход к событию: «${target.title}».`);
    }

    window.setTimeout(() => {
      const el = document.getElementById(`row-${target.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
  }

  function handleToggleBranch(branchId: string) {
    const target = branches.find((b) => b.id === branchId);
    if (!target) return;

    const descendants = getDescendantBranchIds(branchId, branches);
    if (descendants.length > 0) {
      const currentlyActive = isBranchOrDescendantActive(target, branches, activeBranches);
      const nextEnable = !currentlyActive;
      setActiveBranches((prev) => {
        const next = { ...prev };
        if (!target.isGroup) {
          next[target.id] = nextEnable;
        }
        descendants.forEach((dId) => {
          const d = branches.find((item) => item.id === dId);
          if (d && !d.isGroup) {
            next[dId] = nextEnable;
          }
        });
        return next;
      });
      return;
    }

    setActiveBranches((prev) => ({
      ...prev,
      [branchId]: prev[branchId] === false,
    }));
  }

  function handleToggleBranchCategory(branchIds: string[], enable: boolean) {
    setActiveBranches((prev) => {
      const next = { ...prev };
      branchIds.forEach((id) => {
        const b = branches.find((item) => item.id === id);
        if (b && !b.isGroup) {
          next[id] = enable;
        }
        getDescendantBranchIds(id, branches).forEach((dId) => {
          const d = branches.find((item) => item.id === dId);
          if (d && !d.isGroup) {
            next[dId] = enable;
          }
        });
      });
      return next;
    });
  }

  function handleApplyBranchPreset(presetId: BranchPresetId) {
    setActiveBranches((prev) => ({
      ...prev,
      ...computeBranchPresetMap(branches, presetId),
    }));
  }

  function handleIsolateBranch(branchId: string) {
    const target = branches.find((b) => b.id === branchId);
    const descendants = getDescendantBranchIds(branchId, branches);
    const keepSet = new Set<string>([branchId, ...descendants]);

    const next: Record<string, boolean> = {};
    branches.forEach((b) => {
      if (!b.isGroup) {
        next[b.id] = keepSet.has(b.id);
      }
    });
    setActiveBranches(next);

    if (target?.parentBranchId) {
      setCollapsedParents((prev) => {
        const updated = { ...prev };
        let cur: BranchDefinition | undefined = target;
        while (cur?.parentBranchId) {
          updated[cur.parentBranchId] = false;
          cur = branches.find((item) => item.id === cur!.parentBranchId);
        }
        return updated;
      });
    }
  }

  function handleToggleCollapseParent(parentId: string) {
    if (!hasChildBranches(parentId, branches)) return;
    setCollapsedParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  }

  function handleToggleFilters() {
    setIsFiltersCollapsed((prev) => !prev);
  }

  function handleToggleLegend() {
    setIsLegendCollapsed((prev) => !prev);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050811] text-slate-100 p-6 sm:p-10 max-w-7xl mx-auto space-y-6">
        <div className="h-12 bg-slate-900/80 border border-slate-800 rounded-xl animate-pulse" />
        <div className="h-44 bg-slate-900/60 border border-slate-800 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="hidden lg:block lg:col-span-3 h-96 bg-slate-900/50 border border-slate-800 rounded-2xl animate-pulse" />
          <div className="lg:col-span-9 h-96 bg-slate-900/50 border border-slate-800 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (loadError || !manifest) {
    return (
      <div className="min-h-screen bg-[#050811] text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-6 text-center space-y-4">
          <h2 className="text-lg font-bold text-white">Не удалось загрузить файлы ветвей</h2>
          <p className="text-sm text-slate-300">{loadError || 'Файл синхронизации недоступен.'}</p>
          <button
            type="button"
            onClick={() => void loadRepositoryData()}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
          >
            Повторить загрузку
          </button>
        </div>
      </div>
    );
  }

  const hideSidebar = isLegendCollapsed;

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[70] bg-slate-900 border border-amber-500/50 text-slate-100 px-4 py-3 rounded-xl shadow-2xl font-mono text-xs flex items-center gap-2.5 max-w-md">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <TopControlBar
        branchControls={branchControls}
        activeBranches={activeBranches}
        collapsedParents={collapsedParents}
        onToggleBranch={handleToggleBranch}
        onToggleCategory={handleToggleBranchCategory}
        onApplyPreset={handleApplyBranchPreset}
        onIsolateBranch={handleIsolateBranch}
        onToggleCollapseParent={handleToggleCollapseParent}
        yearFrom={yearFrom}
        yearTo={yearTo}
        minYear={timelineBounds.minYear}
        maxYear={timelineBounds.maxYear}
        onYearRangeChange={handleYearRangeChange}
        cardDensity={cardDensity}
        onChangeCardDensity={setCardDensity}
        isFiltersCollapsed={isFiltersCollapsed}
        isLegendCollapsed={isLegendCollapsed}
        onToggleFilters={handleToggleFilters}
        onToggleLegend={handleToggleLegend}
      />

      <DashboardHeader
        visibleLanesCount={visibleLanes.length}
        matchingRulersCount={matchingRulers.length}
        streamCount={stream.length}
        crossLinksCount={totalSyncLinksCount}
        minYear={timelineBounds.minYear}
        maxYear={timelineBounds.maxYear}
        showEndNodes={showEndNodes}
        onToggleShowEndNodes={() => setShowEndNodes((prev) => !prev)}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 space-y-3">
        {!isFiltersCollapsed && (
          <FilterPanel
            yearFrom={effectiveYearFrom}
            yearTo={effectiveYearTo}
            minYear={timelineBounds.minYear}
            maxYear={timelineBounds.maxYear}
            selectedRulerId={selectedReign === 'ALL' ? '' : selectedReign}
            searchQuery={searchQuery}
            onlySynced={onlyWithSyncLinks}
            rulers={rulers}
            eras={manifest.macroEras}
            onChangeYearFrom={(y) => handleYearRangeChange(y, effectiveYearTo)}
            onChangeYearTo={(y) => handleYearRangeChange(effectiveYearFrom, y)}
            onSelectYearRange={(fromVal, toVal) => {
              setSelectedEra('ALL');
              setSelectedReign('ALL');
              handleYearRangeChange(fromVal, toVal);
            }}
            onChangeRuler={handleSelectReign}
            onChangeSearch={setSearchQuery}
            onToggleOnlySynced={() => setOnlyWithSyncLinks((prev) => !prev)}
            onOpenEraModal={handleOpenEraModal}
            onResetFilters={handleResetFiltersOnly}
          />
        )}

        <OverlapMapSection
          matchingEvents={matchingEvents}
          rulers={rulers}
          branches={branches}
          activeBranches={activeBranches}
          yearFrom={effectiveYearFrom}
          yearTo={effectiveYearTo}
          minYear={timelineBounds.minYear}
          maxYear={timelineBounds.maxYear}
          hoveredEventId={hoveredEventId}
          onHoverEvent={setHoveredEventId}
          onOpenCardModal={handleOpenCardModal}
          onOpenPeriodModal={handleOpenPeriodModal}
          onSelectYearRange={(fromVal, toVal) => {
            setSelectedEra('ALL');
            setSelectedReign('ALL');
            handleYearRangeChange(fromVal, toVal);
          }}
        />
      </div>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5">
        {stream.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center my-8">
            <h3 className="font-serif text-xl font-bold text-white">
              На выбранном отрезке времени активных событий не найдено
            </h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Расширьте диапазон лет, включите дополнительные ветви или сбросьте фильтры.
            </p>
            <button
              type="button"
              onClick={handleResetAll}
              className="mt-5 px-4 py-2 bg-amber-500 text-slate-950 font-semibold text-xs rounded-lg hover:bg-amber-400 transition-colors cursor-pointer"
            >
              Восстановить обзор ({timelineBounds.minYear}–{timelineBounds.maxYear})
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {!hideSidebar && (
              <SidebarLegend
                rulers={rulers}
                matchingEvents={matchingEvents}
                visibleLanes={displayLanes}
                yearFrom={effectiveYearFrom}
                yearTo={effectiveYearTo}
                onSelectYearRange={handleYearRangeChange}
                onHideSidebar={() => setIsLegendCollapsed(true)}
              />
            )}

            <div className={hideSidebar ? 'lg:col-span-12' : 'lg:col-span-9'}>
              <GitTimeline
                stream={stream}
                matchingEvents={matchingEvents}
                matchingRulers={matchingRulers}
                rulers={rulers}
                visibleLanes={displayLanes}
                branches={branches}
                activeBranches={activeBranches}
                collapsedParents={collapsedParents}
                manifest={manifest}
                yearFrom={effectiveYearFrom}
                minYear={timelineBounds.minYear}
                axisResolution={axisResolution}
                hoveredEventId={hoveredEventId}
                cardDensity={cardDensity}
                focusedEvent={focusedEvent}
                focusScope={focusScope}
                onChangeFocusScope={setFocusScope}
                onToggleFocusEvent={handleToggleFocusEvent}
                onToggleCollapseParent={handleToggleCollapseParent}
                onExitFocusMode={() => setFocusedEventId(null)}
                highlightedJumpId={highlightedJumpId}
                onJumpToEvent={handleJumpToEvent}
                onHoverEvent={setHoveredEventId}
                onOpenCardModal={handleOpenCardModal}
                onOpenPeriodModal={handleOpenPeriodModal}
                onOpenEraModal={handleOpenEraModal}
                onSelectYearRange={handleYearRangeChange}
              />
            </div>
          </div>
        )}
      </main>

      <CardDetailModal
        card={activeCardObj}
        enrichedEvents={enrichedEvents}
        matchingEvents={matchingEvents}
        branches={branches}
        eras={manifest.macroEras}
        focusedEventId={focusedEventId}
        modalHistory={modalHistory}
        onClose={handleCloseAllModals}
        onNavigateBack={handleModalNavigateBack}
        onSelectCard={handleOpenCardModal}
        onJumpToTimelineRow={handleJumpToEvent}
        onToggleFocusEvent={handleToggleFocusEvent}
        onFilterByRuler={handleSelectReign}
        onOpenRulerModal={handleOpenPeriodModal}
        onOpenEraModal={handleOpenEraModal}
      />

      <PeriodSummaryModal
        ruler={activeRulerObj}
        enrichedEvents={enrichedEvents}
        branches={branches}
        modalHistory={modalHistory}
        onClose={handleCloseAllModals}
        onNavigateBack={handleModalNavigateBack}
        onSelectCard={handleOpenCardModal}
        onFilterByRuler={handleSelectReign}
      />

      <EraSummaryModal
        era={activeEraObj}
        eras={manifest.macroEras}
        rulers={rulers}
        enrichedEvents={enrichedEvents}
        branches={branches}
        modalHistory={modalHistory}
        onClose={handleCloseAllModals}
        onNavigateBack={handleModalNavigateBack}
        onSelectEra={handleOpenEraModal}
        onSelectRuler={handleOpenPeriodModal}
        onSelectEvent={handleOpenCardModal}
        onFilterByEraRange={(startYear, endYear) => {
          setSelectedEra('ALL');
          setSelectedReign('ALL');
          handleYearRangeChange(startYear, endYear);
        }}
      />
    </div>
  );
}
