import { useCallback, useEffect, useMemo, useState } from 'react';
import { CardDetailModal } from './components/CardDetailModal';
import { DashboardHeader } from './components/DashboardHeader';
import { FilterAndOverlapPanel } from './components/FilterAndOverlapPanel';
import { GitTimeline } from './components/GitTimeline';
import { PeriodSummaryModal } from './components/PeriodSummaryModal';
import { SidebarLegend } from './components/SidebarLegend';
import { TopControlBar } from './components/TopControlBar';
import {
  buildUnifiedTimelineStream,
  extractBranchesFromStore,
  extractRulersFromStore,
  fetchTimelineRepository,
  getEnrichedEvents,
  getVisibleLanes,
  intersectsTimeWindow,
  isEventBranchActive,
  resolveEventBranch,
  UNIFIED_MILITARY_BRANCH,
} from './engine/timelineEngine';
import type {
  BranchDefinition,
  CardDensity,
  FocusScope,
  MilitaryBranchMode,
  SyncManifest,
  TimelineDataFile,
} from './types/timeline';

export default function App() {
  const [manifest, setManifest] = useState<SyncManifest | null>(null);
  const [filesMap, setFilesMap] = useState<Record<string, TimelineDataFile>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [militaryBranchMode, setMilitaryBranchMode] = useState<MilitaryBranchMode>('SPLIT');
  const [activeBranches, setActiveBranches] = useState<Record<string, boolean>>({
    MAIN_RULERS: true,
    SEAS: true,
    PERIPHERY: true,
    INTERNAL_BUFFER: true,
    MILITARY_ALL: true,
    REFORMS_ECO: true,
    WORLD_CONTEXT: true,
    DIPLOMACY_TREATIES: true,
  });

  const [yearFrom, setYearFrom] = useState(1686);
  const [yearTo, setYearTo] = useState(2000);
  const [selectedEra, setSelectedEra] = useState('ALL');
  const [selectedReign, setSelectedReign] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyWithSyncLinks, setOnlyWithSyncLinks] = useState(false);

  const [cardDensity, setCardDensity] = useState<CardDensity>('detailed');
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
  const [focusScope, setFocusScope] = useState<FocusScope>('sync_only');
  const [highlightedJumpId, setHighlightedJumpId] = useState<string | null>(null);

  const [showEndNodes, setShowEndNodes] = useState(true);
  const [showOverlapMatrix, setShowOverlapMatrix] = useState(true);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);
  const [isBranchesOnlyMode, setIsBranchesOnlyMode] = useState(false);

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);
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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (activeCardId || activePeriodId) {
          setActiveCardId(null);
          setActivePeriodId(null);
        } else if (focusedEventId) {
          setFocusedEventId(null);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCardId, activePeriodId, focusedEventId]);

  const branches = useMemo(() => {
    if (!manifest) return [];
    return extractBranchesFromStore(manifest, filesMap);
  }, [manifest, filesMap]);

  const rulers = useMemo(() => {
    if (!manifest) return [];
    return extractRulersFromStore(manifest, filesMap);
  }, [manifest, filesMap]);

  const enrichedEvents = useMemo(() => {
    if (!manifest) return [];
    return getEnrichedEvents(manifest, filesMap, rulers);
  }, [manifest, filesMap, rulers]);

  const visibleLanes = useMemo(
    () => getVisibleLanes(branches, activeBranches, militaryBranchMode),
    [branches, activeBranches, militaryBranchMode],
  );

  const { stream, matchingEvents, matchingRulers, focusedEvent, effectiveYearFrom, effectiveYearTo } = useMemo(() => {
    if (!manifest) {
      return {
        stream: [],
        matchingEvents: [],
        matchingRulers: [],
        focusedEvent: null,
        effectiveYearFrom: yearFrom,
        effectiveYearTo: yearTo,
      };
    }
    return buildUnifiedTimelineStream(enrichedEvents, rulers, manifest, branches, {
      militaryBranchMode,
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
    militaryBranchMode,
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
      const b = resolveEventBranch(ev, branches, militaryBranchMode);
      if (!laneIds.has(b.id)) {
        laneIds.add(b.id);
        extras.push(b);
      }
    });
    return extras.length > 0 ? [...visibleLanes, ...extras] : visibleLanes;
  }, [focusedEvent, visibleLanes, matchingEvents, branches, militaryBranchMode]);

  const syncLinkedCount = useMemo(
    () =>
      enrichedEvents.filter(
        (ev) =>
          ev.explicitLinks.length > 0 &&
          isEventBranchActive(ev, branches, activeBranches, militaryBranchMode) &&
          intersectsTimeWindow(ev.startYear, ev.endYear, yearFrom, yearTo),
      ).length,
    [enrichedEvents, branches, activeBranches, militaryBranchMode, yearFrom, yearTo],
  );

  const branchControls = useMemo(() => {
    const byBranchCount: Record<string, number> = {};
    enrichedEvents.forEach((ev) => {
      if (intersectsTimeWindow(ev.startYear, ev.endYear, yearFrom, yearTo)) {
        byBranchCount[ev.task] = (byBranchCount[ev.task] || 0) + 1;
        const orig = branches.find((b) => b.id === ev.task);
        if (orig?.isMilitary) {
          byBranchCount.MILITARY_ALL = (byBranchCount.MILITARY_ALL || 0) + 1;
        }
      }
    });

    const list: Array<BranchDefinition & { count: number }> = [];
    branches.forEach((b) => {
      if (b.id === 'MAIN_RULERS') {
        list.push({ ...b, count: matchingRulers.length });
      } else if (b.isMilitary) {
        if (militaryBranchMode === 'SPLIT') {
          list.push({ ...b, count: byBranchCount[b.id] || 0 });
        }
      } else {
        list.push({ ...b, count: byBranchCount[b.id] || 0 });
      }
    });

    if (militaryBranchMode === 'UNIFIED' && branches.some((b) => b.isMilitary)) {
      const insertAt = list.length > 0 && list[0].id === 'MAIN_RULERS' ? 1 : 0;
      list.splice(insertAt, 0, {
        ...UNIFIED_MILITARY_BRANCH,
        count: byBranchCount.MILITARY_ALL || 0,
      });
    }

    return list;
  }, [branches, enrichedEvents, matchingRulers.length, militaryBranchMode, yearFrom, yearTo]);

  const eraCounts = useMemo(() => {
    const counts: Record<string, number> = { ERA_1: 0, ERA_2: 0, ERA_3: 0, ERA_4: 0 };
    matchingEvents.forEach((ev) => {
      counts[ev.eraId] = (counts[ev.eraId] || 0) + 1;
    });
    return counts;
  }, [matchingEvents]);

  function handleYearRangeChange(fromVal: number, toVal: number) {
    let y1 = Number.isFinite(fromVal) ? Math.round(fromVal) : 1686;
    let y2 = Number.isFinite(toVal) ? Math.round(toVal) : 2000;
    y1 = Math.max(1686, Math.min(2000, y1));
    y2 = Math.max(1686, Math.min(2000, y2));
    if (y1 > y2) {
      [y1, y2] = [y2, y1];
    }
    setYearFrom(y1);
    setYearTo(y2);
  }

  function handleSelectEra(eraId: string) {
    setSelectedEra(eraId);
    setSelectedReign('ALL');
    if (eraId === 'ERA_1') handleYearRangeChange(1686, 1800);
    else if (eraId === 'ERA_2') handleYearRangeChange(1801, 1917);
    else if (eraId === 'ERA_3') handleYearRangeChange(1917, 1991);
    else if (eraId === 'ERA_4') handleYearRangeChange(1991, 2000);
    else handleYearRangeChange(1686, 2000);
  }

  function handleSelectReign(rulerId: string) {
    setSelectedReign(rulerId);
    if (rulerId !== 'ALL') {
      const r = rulers.find((item) => item.id === rulerId);
      if (r) handleYearRangeChange(r.startYear, r.endYear);
    } else {
      handleYearRangeChange(1686, 2000);
    }
  }

  function handleResetAll() {
    setSelectedEra('ALL');
    setSelectedReign('ALL');
    setSearchQuery('');
    setOnlyWithSyncLinks(false);
    setFocusedEventId(null);
    setYearFrom(1686);
    setYearTo(2000);
    const nextActive: Record<string, boolean> = { MILITARY_ALL: true };
    branches.forEach((b) => {
      nextActive[b.id] = true;
    });
    setActiveBranches(nextActive);
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

    if (!isEventBranchActive(target, branches, activeBranches, militaryBranchMode)) {
      const orig = branches.find((b) => b.id === target.task);
      const branchKey = militaryBranchMode === 'UNIFIED' && orig?.isMilitary ? 'MILITARY_ALL' : target.task;
      setActiveBranches((prev) => ({ ...prev, [branchKey]: true }));
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
      showToast(`Переход к связанному событию: «${target.title}».`);
    }

    window.setTimeout(() => {
      const el = document.getElementById(`row-${target.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
  }

  function handleToggleBranch(branchId: string) {
    setActiveBranches((prev) => ({
      ...prev,
      [branchId]: prev[branchId] === false,
    }));
  }

  function handleToggleFilters() {
    if (isBranchesOnlyMode) {
      setIsBranchesOnlyMode(false);
      setIsFiltersCollapsed(false);
    } else {
      setIsFiltersCollapsed((prev) => !prev);
    }
  }

  function handleToggleLegend() {
    if (isBranchesOnlyMode) {
      setIsBranchesOnlyMode(false);
      setIsLegendCollapsed(false);
    } else {
      setIsLegendCollapsed((prev) => !prev);
    }
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

  const hideSidebar = isBranchesOnlyMode || isLegendCollapsed;
  const hasActiveFilters =
    selectedEra !== 'ALL' ||
    selectedReign !== 'ALL' ||
    searchQuery.trim() !== '' ||
    onlyWithSyncLinks ||
    focusedEventId !== null ||
    yearFrom !== 1686 ||
    yearTo !== 2000;

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
        onToggleBranch={handleToggleBranch}
        yearFrom={yearFrom}
        yearTo={yearTo}
        onYearRangeChange={handleYearRangeChange}
        isFiltersCollapsed={isFiltersCollapsed}
        isLegendCollapsed={isLegendCollapsed}
        isBranchesOnlyMode={isBranchesOnlyMode}
        onToggleFilters={handleToggleFilters}
        onToggleLegend={handleToggleLegend}
        onToggleBranchesOnly={() => setIsBranchesOnlyMode((prev) => !prev)}
      />

      {!isBranchesOnlyMode && (
        <DashboardHeader
          visibleLanesCount={visibleLanes.length}
          matchingRulersCount={matchingRulers.length}
          streamCount={stream.length}
          crossLinksCount={manifest.crossLinks.length}
          branchControls={branchControls}
          activeBranches={activeBranches}
          militaryBranchMode={militaryBranchMode}
          showEndNodes={showEndNodes}
          onToggleBranch={handleToggleBranch}
          onSetMilitaryBranchMode={setMilitaryBranchMode}
          onToggleShowEndNodes={() => setShowEndNodes((prev) => !prev)}
        />
      )}

      {!isBranchesOnlyMode && !isFiltersCollapsed && (
        <FilterAndOverlapPanel
          yearFrom={effectiveYearFrom}
          yearTo={effectiveYearTo}
          onYearRangeChange={handleYearRangeChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedEra={selectedEra}
          onSelectEra={handleSelectEra}
          selectedReign={selectedReign}
          onSelectReign={handleSelectReign}
          onResetAll={handleResetAll}
          hasActiveFilters={hasActiveFilters}
          macroEras={manifest.macroEras}
          eraCounts={eraCounts}
          rulers={rulers}
          matchingRulers={matchingRulers}
          matchingEvents={matchingEvents}
          visibleLanes={displayLanes}
          branches={branches}
          militaryBranchMode={militaryBranchMode}
          showOverlapMatrix={showOverlapMatrix}
          onToggleOverlapMatrix={() => setShowOverlapMatrix((prev) => !prev)}
          onlyWithSyncLinks={onlyWithSyncLinks}
          onToggleOnlyWithSyncLinks={() => setOnlyWithSyncLinks((prev) => !prev)}
          syncLinkedCount={syncLinkedCount}
          onOpenCardModal={setActiveCardId}
          onHoverEvent={setHoveredEventId}
        />
      )}

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6">
        {stream.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center my-8">
            <h3 className="text-lg font-bold text-white">
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
              Восстановить весь график (1686–2000)
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
                militaryBranchMode={militaryBranchMode}
                manifest={manifest}
                yearFrom={effectiveYearFrom}
                hoveredEventId={hoveredEventId}
                cardDensity={cardDensity}
                onChangeCardDensity={setCardDensity}
                focusedEvent={focusedEvent}
                focusScope={focusScope}
                onChangeFocusScope={setFocusScope}
                onToggleFocusEvent={handleToggleFocusEvent}
                onExitFocusMode={() => setFocusedEventId(null)}
                highlightedJumpId={highlightedJumpId}
                onJumpToEvent={handleJumpToEvent}
                onHoverEvent={setHoveredEventId}
                onOpenCardModal={setActiveCardId}
                onOpenPeriodModal={setActivePeriodId}
                onSelectYearRange={handleYearRangeChange}
              />
            </div>
          </div>
        )}
      </main>

      <CardDetailModal
        eventId={activeCardId}
        enrichedEvents={enrichedEvents}
        branches={branches}
        focusedEventId={focusedEventId}
        onToggleFocusEvent={handleToggleFocusEvent}
        onClose={() => setActiveCardId(null)}
        onSelectEvent={setActiveCardId}
        onSelectYearRange={handleYearRangeChange}
      />

      <PeriodSummaryModal
        rulerId={activePeriodId}
        rulers={rulers}
        enrichedEvents={enrichedEvents}
        branches={branches}
        onClose={() => setActivePeriodId(null)}
        onOpenCard={setActiveCardId}
      />
    </div>
  );
}
