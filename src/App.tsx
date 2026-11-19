import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardHeader } from './components/DashboardHeader';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { EpochSlicePreset } from './components/EraSelectorPopover';
import { FilterPanel } from './components/FilterPanel';
import { GitTimeline } from './components/GitTimeline';
import { HiddenLinksNotice } from './components/HiddenLinksNotice';
import { OverlapMapSection } from './components/OverlapMapSection';
import { TopControlBar } from './components/TopControlBar';
import { lazyWithRetry } from './utils/lazyWithRetry';

const CardDetailModal = lazyWithRetry(() =>
  import('./components/CardDetailModal').then((m) => ({ default: m.CardDetailModal })),
);
const ComparePeriodsModal = lazyWithRetry(() =>
  import('./components/ComparePeriodsModal').then((m) => ({ default: m.ComparePeriodsModal })),
);
const EraSummaryModal = lazyWithRetry(() =>
  import('./components/EraSummaryModal').then((m) => ({ default: m.EraSummaryModal })),
);
const PeriodSummaryModal = lazyWithRetry(() =>
  import('./components/PeriodSummaryModal').then((m) => ({ default: m.PeriodSummaryModal })),
);
const PersonDossierModal = lazyWithRetry(() =>
  import('./components/PersonDossierModal').then((m) => ({ default: m.PersonDossierModal })),
);
const WindowSummaryModal = lazyWithRetry(() =>
  import('./components/WindowSummaryModal').then((m) => ({ default: m.WindowSummaryModal })),
);
import { useTimelineData } from './hooks/useTimelineData';
import {
  parseInitialYearBound,
  parseWindowRangeParam,
  useTimelineUrlSync,
} from './hooks/useTimelineUrlSync';
import {
  doesEventMatchMacroRegion,
  getMacroRegionOption,
  parseMacroRegionParam,
} from './engine/regionFilter';
import {
  buildPersonDossierIndex,
  buildSyncTagIndex,
  buildUnifiedTimelineStream,
  computeBranchPresetMap,
  computeMacroRegionCounts,
  computeTimelineYearBounds,
  doesIntervalBelongToEra,
  extractBranchesFromStore,
  extractRulersFromStore,
  getDescendantBranchIds,
  getEnrichedEvents,
  getEventEffectiveEndYear,
  getEventEffectiveStartYear,
  getLeafBranches,
  getVisibleLanes,
  getWindowLinksVisibilitySummary,
  hasChildBranches,
  intersectsTimeWindow,
  isBranchOrDescendantActive,
  isEventBranchActive,
  resolveEventBranch,
  resolveMacroEras,
  resolvePersonKey,
} from './engine/timelineEngine';
import { preserveViewportScrollAnchor } from './utils/scrollIsolation';
import type {
  BranchDefinition,
  BranchPairFilter,
  BranchPresetId,
  CardDensity,
  ComparisonTarget,
  FocusDepth,
  FocusScope,
  MacroRegionId,
  ModalHistoryItem,
  SyncLinkTypeFilter,
  TimeScaleMode,
  YearRangeStep,
} from './types/timeline';

type ActiveModalState =
  | { type: 'NONE' }
  | { type: 'CARD'; cardId: string }
  | { type: 'REIGN'; rulerId: string }
  | { type: 'ERA'; eraId: string }
  | { type: 'PERSON'; personKey: string }
  | { type: 'WINDOW'; from: number; to: number }
  | { type: 'COMPARE'; pair: { left: ComparisonTarget; right: ComparisonTarget } };

export default function App() {
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);

  const {
    manifest,
    filesMap,
    loading,
    loadError,
    reloadRepository,
    ensureAllModulesLoaded,
  } = useTimelineData({ initialParams });

  const [activeBranches, setActiveBranches] = useState<Record<string, boolean>>({});
  const [collapsedParents, setCollapsedParents] = useState<Record<string, boolean>>({});

  const [yearFrom, setYearFrom] = useState<number>(() => parseInitialYearBound(initialParams, 'from', 862));
  const [yearTo, setYearTo] = useState<number>(() => parseInitialYearBound(initialParams, 'to', 2000));
  const [zoomHistory, setZoomHistory] = useState<YearRangeStep[]>([]);
  const [selectedEra, setSelectedEra] = useState('ALL');
  const [selectedReign, setSelectedReign] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState<string>(() => initialParams.get('search') ?? '');
  const isAuditDebugEnabled = useMemo(
    () => initialParams.get('debug') === 'audit',
    [initialParams],
  );

  const [selectedPersonKey, setSelectedPersonKey] = useState<string | null>(null);
  const [selectedSyncTag, setSelectedSyncTag] = useState<string | null>(null);
  const [selectedMacroRegion, setSelectedMacroRegion] = useState<MacroRegionId>(() =>
    parseMacroRegionParam(initialParams.get('region')),
  );
  const [branchPairFilter, setBranchPairFilter] = useState<BranchPairFilter | null>(null);
  const [auditUnlinkedMode, setAuditUnlinkedMode] = useState(false);
  const [onlyWithSyncLinks, setOnlyWithSyncLinks] = useState(false);
  const [syncLinkTypeFilter, setSyncLinkTypeFilter] = useState<SyncLinkTypeFilter>('all');

  const [cardDensity, setCardDensity] = useState<CardDensity>('detailed');
  const [timeScaleMode, setTimeScaleMode] = useState<TimeScaleMode>(() =>
    initialParams.get('scale') === 'proportional' ? 'proportional' : 'compact',
  );
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
  const [focusScope, setFocusScope] = useState<FocusScope>('sync_only');
  const [focusDepth, setFocusDepth] = useState<FocusDepth>(1);
  const [focusKeepWindow, setFocusKeepWindow] = useState(false);
  const [highlightedJumpId, setHighlightedJumpId] = useState<string | null>(null);

  const [showEndNodes, setShowEndNodes] = useState(true);
  const [showOverlapMatrix] = useState(true);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(true);
  const [forceShowHiddenLinks, setForceShowHiddenLinks] = useState(false);
  const [dismissedHiddenLinks, setDismissedHiddenLinks] = useState(false);

  const [activeModal, setActiveModal] = useState<ActiveModalState>(() => {
    const initialCardId = initialParams.get('card');
    if (initialCardId) return { type: 'CARD', cardId: initialCardId };
    const initialRulerId = initialParams.get('ruler');
    if (initialRulerId) return { type: 'REIGN', rulerId: initialRulerId };
    const initialPersonKey = initialParams.get('person');
    if (initialPersonKey) return { type: 'PERSON', personKey: initialPersonKey };
    const initialEraId = initialParams.get('era');
    if (initialEraId) return { type: 'ERA', eraId: initialEraId };
    const initialWindowRange = parseWindowRangeParam(initialParams.get('window'));
    if (initialWindowRange) {
      return { type: 'WINDOW', from: initialWindowRange.from, to: initialWindowRange.to };
    }
    return { type: 'NONE' };
  });
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

  useEffect(() => {
    if (searchQuery.trim() || selectedPersonKey || activeModal.type !== 'NONE') {
      void ensureAllModulesLoaded();
    }
  }, [searchQuery, selectedPersonKey, activeModal.type, ensureAllModulesLoaded]);

  useEffect(() => {
    if (!highlightedJumpId) return;
    const timer = window.setTimeout(() => setHighlightedJumpId(null), 2600);
    return () => window.clearTimeout(timer);
  }, [highlightedJumpId]);

  const handleCloseAllModals = useCallback(() => {
    setActiveModal({ type: 'NONE' });
    setModalHistory([]);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (activeModal.type !== 'NONE') {
          handleCloseAllModals();
        } else if (focusedEventId) {
          setFocusedEventId(null);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal.type, focusedEventId, handleCloseAllModals]);

  const branches = useMemo(() => {
    if (!manifest) return [];
    return extractBranchesFromStore(manifest, filesMap);
  }, [manifest, filesMap]);

  // Динамическая инициализация состояния веток: учет ?branches= из URL или дефолтный пресет «Обзор истории» ('overview')
  useEffect(() => {
    if (branches.length === 0) return;

    setActiveBranches((prev) => {
      if (Object.keys(prev).length === 0) {
        const overviewMap = computeBranchPresetMap(branches, 'overview');
        const urlBranchesRaw = initialParams.get('branches');
        if (!urlBranchesRaw) return overviewMap;

        const requestedIds = new Set(
          urlBranchesRaw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        );
        const leafBranches = branches.filter((b) => !b.isGroup);
        const hasValidMatch = leafBranches.some((b) => requestedIds.has(b.id));
        if (!hasValidMatch) return overviewMap;

        const customMap: Record<string, boolean> = {};
        leafBranches.forEach((b) => {
          customMap[b.id] = b.isTimeAxis ? true : requestedIds.has(b.id);
        });
        return customMap;
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
  }, [branches, initialParams]);

  // Двусторонняя синхронизация с URLSearchParams (Deep Linking и History API)
  const activeCardId = activeModal.type === 'CARD' ? activeModal.cardId : null;
  const activeRulerModalId = activeModal.type === 'REIGN' ? activeModal.rulerId : null;
  const activePersonModalKey = activeModal.type === 'PERSON' ? activeModal.personKey : null;
  const activeEraModalId = activeModal.type === 'ERA' ? activeModal.eraId : null;
  const activeWindowModalRange = useMemo(
    () =>
      activeModal.type === 'WINDOW'
        ? { from: activeModal.from, to: activeModal.to }
        : null,
    [activeModal],
  );

  const handlePopModalFromUrl = useCallback(
    ({
      cardId,
      rulerId,
      personKey,
      eraId,
      windowRange,
    }: {
      cardId: string | null;
      rulerId: string | null;
      personKey: string | null;
      eraId: string | null;
      windowRange: { from: number; to: number } | null;
    }) => {
      if (cardId) {
        setActiveModal({ type: 'CARD', cardId });
      } else if (rulerId) {
        setActiveModal({ type: 'REIGN', rulerId });
      } else if (personKey) {
        setActiveModal({ type: 'PERSON', personKey });
      } else if (eraId) {
        setActiveModal({ type: 'ERA', eraId });
      } else if (windowRange) {
        setActiveModal({ type: 'WINDOW', from: windowRange.from, to: windowRange.to });
      } else {
        setActiveModal((prev) =>
          prev.type === 'CARD' ||
          prev.type === 'REIGN' ||
          prev.type === 'PERSON' ||
          prev.type === 'ERA' ||
          prev.type === 'WINDOW'
            ? { type: 'NONE' }
            : prev,
        );
      }
    },
    [],
  );

  useTimelineUrlSync({
    yearFrom,
    yearTo,
    searchQuery,
    selectedMacroRegion,
    activeCardId,
    activeRulerModalId,
    activePersonModalKey,
    activeEraModalId,
    activeWindowModalRange,
    activeBranches,
    branches,
    setYearFrom,
    setYearTo,
    setSearchQuery,
    setSelectedMacroRegion,
    setActiveBranches,
    onPopModalFromUrl: handlePopModalFromUrl,
  });

  const rulers = useMemo(() => {
    if (!manifest) return [];
    return extractRulersFromStore(manifest, filesMap);
  }, [manifest, filesMap]);

  const enrichedEvents = useMemo(() => {
    if (!manifest) return [];
    return getEnrichedEvents(manifest, filesMap, rulers);
  }, [manifest, filesMap, rulers]);

  const { dossiers: personDossiers, rawToKey: personRawToKey } = useMemo(
    () => buildPersonDossierIndex(enrichedEvents, rulers),
    [enrichedEvents, rulers],
  );

  const selectedPersonDossier = useMemo(
    () => (selectedPersonKey ? personDossiers.get(selectedPersonKey) ?? null : null),
    [selectedPersonKey, personDossiers],
  );

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
    if (activeModal.type === 'CARD' && !enrichedEvents.some((e) => e.id === activeModal.cardId)) {
      setActiveModal({ type: 'NONE' });
    }
    if (activeModal.type === 'REIGN' && !rulers.some((r) => r.id === activeModal.rulerId)) {
      setActiveModal({ type: 'NONE' });
    }
    if (activeModal.type === 'PERSON' && !personDossiers.has(activeModal.personKey)) {
      setActiveModal({ type: 'NONE' });
    }
    if (
      activeModal.type === 'ERA' &&
      !manifest.macroEras.some((e) => e.id === activeModal.eraId)
    ) {
      setActiveModal({ type: 'NONE' });
    }
    if (selectedPersonKey && !personDossiers.has(selectedPersonKey)) {
      setSelectedPersonKey(null);
    }
  }, [
    manifest,
    rulers,
    enrichedEvents,
    personDossiers,
    selectedReign,
    focusedEventId,
    activeModal,
    selectedPersonKey,
  ]);



  const syncTagOptions = useMemo(
    () => (manifest ? buildSyncTagIndex(enrichedEvents, rulers, manifest.macroEras) : []),
    [manifest, enrichedEvents, rulers],
  );

  const thematicLeafBranches = useMemo(() => getLeafBranches(branches), [branches]);

  const effectiveActiveBranches = useMemo(() => {
    if (!branchPairFilter) return activeBranches;
    const next: Record<string, boolean> = {};
    branches.forEach((b) => {
      if (b.isGroup) return;
      if (b.id === 'MAIN_RULERS') {
        next[b.id] = activeBranches.MAIN_RULERS !== false;
      } else {
        next[b.id] = b.id === branchPairFilter.branchA || b.id === branchPairFilter.branchB;
      }
    });
    return next;
  }, [activeBranches, branchPairFilter, branches]);

  const visibleLanes = useMemo(
    () => getVisibleLanes(branches, effectiveActiveBranches, collapsedParents),
    [branches, effectiveActiveBranches, collapsedParents],
  );

  const {
    stream,
    matchingEvents,
    matchingRulers,
    focusedEvent,
    effectiveYearFrom,
    effectiveYearTo,
    axisResolution,
    auditCandidateMap,
    focusDistanceMap,
    outOfWindowFocusCount,
  } = useMemo(() => {
    if (!manifest) {
      return {
        stream: [],
        matchingEvents: [],
        matchingRulers: [],
        focusedEvent: null,
        effectiveYearFrom: yearFrom,
        effectiveYearTo: yearTo,
        axisResolution: 'year' as const,
        auditCandidateMap: new Map(),
        focusDistanceMap: new Map<string, number>(),
        outOfWindowFocusCount: 0,
      };
    }
    return buildUnifiedTimelineStream(enrichedEvents, rulers, manifest, branches, {
      activeBranches: effectiveActiveBranches,
      yearFrom,
      yearTo,
      selectedEra,
      selectedReign,
      searchQuery,
      selectedPersonKey,
      selectedPersonEventIds: selectedPersonDossier?.eventIds ?? null,
      selectedSyncTag,
      selectedMacroRegion,
      branchPairFilter,
      auditUnlinkedMode: isAuditDebugEnabled && auditUnlinkedMode,
      onlyWithSyncLinks,
      syncLinkTypeFilter,
      focusedEventId,
      focusScope,
      focusDepth,
      focusKeepWindow,
      showEndNodes,
      showOverlapMatrix,
    });
  }, [
    manifest,
    enrichedEvents,
    rulers,
    branches,
    effectiveActiveBranches,
    yearFrom,
    yearTo,
    selectedEra,
    selectedReign,
    searchQuery,
    selectedPersonKey,
    selectedPersonDossier,
    selectedSyncTag,
    selectedMacroRegion,
    branchPairFilter,
    isAuditDebugEnabled,
    auditUnlinkedMode,
    onlyWithSyncLinks,
    syncLinkTypeFilter,
    focusedEventId,
    focusScope,
    focusDepth,
    focusKeepWindow,
    showEndNodes,
    showOverlapMatrix,
  ]);

  const macroRegionCounts = useMemo(() => {
    const inWindow = enrichedEvents.filter((ev) => {
      if (!isEventBranchActive(ev, effectiveActiveBranches)) return false;
      const effStart = getEventEffectiveStartYear(ev, branches);
      const effEnd = getEventEffectiveEndYear(ev, branches);
      return intersectsTimeWindow(effStart, effEnd, effectiveYearFrom, effectiveYearTo);
    });
    return computeMacroRegionCounts(inWindow);
  }, [enrichedEvents, effectiveActiveBranches, branches, effectiveYearFrom, effectiveYearTo]);

  const windowLinksVisibility = useMemo(
    () => getWindowLinksVisibilitySummary(matchingEvents, effectiveActiveBranches, branches),
    [matchingEvents, effectiveActiveBranches, branches],
  );

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
      if (!doesEventMatchMacroRegion(ev, selectedMacroRegion)) return;
      const effStart = getEventEffectiveStartYear(ev, branches);
      const effEnd = getEventEffectiveEndYear(ev, branches);
      if (intersectsTimeWindow(effStart, effEnd, effectiveYearFrom, effectiveYearTo)) {
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
  }, [branches, enrichedEvents, matchingRulers.length, effectiveYearFrom, effectiveYearTo, selectedMacroRegion]);

  const resolvedMacroEras = useMemo(
    () => (manifest ? resolveMacroEras(manifest.macroEras) : []),
    [manifest],
  );

  // Текущие объекты модальных окон, вычисленные из единого ActiveModalState
  const activeCardObj = useMemo(
    () =>
      activeModal.type === 'CARD'
        ? (enrichedEvents.find((e) => e.id === activeModal.cardId) ?? null)
        : null,
    [activeModal, enrichedEvents],
  );

  const activeRulerObj = useMemo(
    () =>
      activeModal.type === 'REIGN'
        ? (rulers.find((r) => r.id === activeModal.rulerId) ?? null)
        : null,
    [activeModal, rulers],
  );

  const activeEraObj = useMemo(
    () =>
      activeModal.type === 'ERA'
        ? (manifest?.macroEras.find((e) => e.id === activeModal.eraId) ?? null)
        : null,
    [activeModal, manifest],
  );

  const activePersonObj = useMemo(
    () =>
      activeModal.type === 'PERSON'
        ? (personDossiers.get(activeModal.personKey) ?? null)
        : null,
    [activeModal, personDossiers],
  );

  const activeWindowRange = useMemo(
    () =>
      activeModal.type === 'WINDOW'
        ? { from: activeModal.from, to: activeModal.to }
        : null,
    [activeModal],
  );

  const activeComparePair = useMemo(
    () => (activeModal.type === 'COMPARE' ? activeModal.pair : null),
    [activeModal],
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
    } else if (activePersonObj) {
      setModalHistory((prev) => [
        ...prev.slice(-9),
        { type: 'person', id: activePersonObj.key, label: activePersonObj.displayName },
      ]);
    } else if (activeWindowRange) {
      setModalHistory((prev) => [
        ...prev.slice(-9),
        {
          type: 'window',
          id: `${activeWindowRange.from}-${activeWindowRange.to}`,
          label: `Окно ${activeWindowRange.from}–${activeWindowRange.to}`,
          windowRange: activeWindowRange,
        },
      ]);
    } else if (activeComparePair) {
      setModalHistory((prev) => [
        ...prev.slice(-9),
        {
          type: 'compare',
          id: 'compare',
          label: 'Сравнение периодов',
          comparePair: activeComparePair,
        },
      ]);
    }
  }, [activeCardObj, activeRulerObj, activeEraObj, activePersonObj, activeWindowRange, activeComparePair]);

  const transitionToModal = useCallback(
    (nextModal: Exclude<ActiveModalState, { type: 'NONE' }>) => {
      if (activeModal.type !== 'NONE') {
        pushCurrentModalToHistory();
      } else {
        setModalHistory([]);
      }
      setActiveModal(nextModal);
    },
    [activeModal.type, pushCurrentModalToHistory],
  );

  const handleOpenCardModal = useCallback(
    (cardId: string) => {
      if (activeModal.type === 'CARD' && activeModal.cardId === cardId) return;
      transitionToModal({ type: 'CARD', cardId });
    },
    [activeModal, transitionToModal],
  );

  const handleOpenPeriodModal = useCallback(
    (rulerId: string) => {
      if (activeModal.type === 'REIGN' && activeModal.rulerId === rulerId) return;
      transitionToModal({ type: 'REIGN', rulerId });
    },
    [activeModal, transitionToModal],
  );

  const handleOpenEraModal = useCallback(
    (eraId: string) => {
      if (activeModal.type === 'ERA' && activeModal.eraId === eraId) return;
      transitionToModal({ type: 'ERA', eraId });
    },
    [activeModal, transitionToModal],
  );

  const handleOpenPersonModal = useCallback(
    (personKeyOrName: string) => {
      const resolvedKey =
        resolvePersonKey(personKeyOrName, personDossiers, personRawToKey) || personKeyOrName;
      if (!personDossiers.has(resolvedKey)) return;
      if (activeModal.type === 'PERSON' && activeModal.personKey === resolvedKey) return;
      transitionToModal({ type: 'PERSON', personKey: resolvedKey });
    },
    [personDossiers, personRawToKey, activeModal, transitionToModal],
  );

  const handleOpenWindowModal = useCallback(
    (fromVal: number, toVal: number) => {
      const from = Math.min(fromVal, toVal);
      const to = Math.max(fromVal, toVal);
      if (activeModal.type === 'WINDOW' && activeModal.from === from && activeModal.to === to) {
        return;
      }
      transitionToModal({ type: 'WINDOW', from, to });
    },
    [activeModal, transitionToModal],
  );

  const handleOpenCompareModal = useCallback(
    (pair: { left: ComparisonTarget; right: ComparisonTarget }) => {
      transitionToModal({ type: 'COMPARE', pair });
    },
    [transitionToModal],
  );

  const handleOpenCompareFromHeader = useCallback(() => {
    const peter = rulers.find((r) => /п[её]тр\s+i\b/i.test(r.shortRuler));
    const alex2 = rulers.find((r) => /александр\s+ii\b/i.test(r.shortRuler));
    if (selectedReign !== 'ALL') {
      const curRuler = rulers.find((r) => r.id === selectedReign);
      const other =
        (peter && peter.id !== selectedReign ? peter : undefined) ??
        rulers.find((r) => r.id !== selectedReign) ??
        curRuler;
      if (curRuler && other) {
        handleOpenCompareModal({
          left: { kind: 'ruler', rulerId: curRuler.id },
          right: { kind: 'ruler', rulerId: other.id },
        });
        return;
      }
    }
    if (peter && alex2) {
      handleOpenCompareModal({
        left: { kind: 'ruler', rulerId: peter.id },
        right: { kind: 'ruler', rulerId: alex2.id },
      });
      return;
    }
    if (rulers.length >= 2) {
      handleOpenCompareModal({
        left: { kind: 'ruler', rulerId: rulers[0].id },
        right: { kind: 'ruler', rulerId: rulers[1].id },
      });
      return;
    }
    handleOpenCompareModal({
      left: { kind: 'window', from: effectiveYearFrom, to: effectiveYearTo },
      right: { kind: 'window', from: timelineBounds.minYear, to: timelineBounds.maxYear },
    });
  }, [
    rulers,
    selectedReign,
    effectiveYearFrom,
    effectiveYearTo,
    timelineBounds.minYear,
    timelineBounds.maxYear,
    handleOpenCompareModal,
  ]);

  const handleCompareWithRuler = useCallback(
    (rulerId: string) => {
      const peter = rulers.find((r) => /п[её]тр\s+i\b/i.test(r.shortRuler));
      const alex2 = rulers.find((r) => /александр\s+ii\b/i.test(r.shortRuler));
      const counterpart =
        (peter && peter.id !== rulerId ? peter : undefined) ??
        (alex2 && alex2.id !== rulerId ? alex2 : undefined) ??
        rulers.find((r) => r.id !== rulerId) ??
        rulers[0];
      if (!counterpart) return;
      handleOpenCompareModal({
        left: { kind: 'ruler', rulerId },
        right: { kind: 'ruler', rulerId: counterpart.id },
      });
    },
    [rulers, handleOpenCompareModal],
  );

  const handleCompareWithEra = useCallback(
    (eraId: string) => {
      const counterpart =
        resolvedMacroEras.find((e) => e.id !== eraId) ?? resolvedMacroEras[0];
      if (!counterpart) return;
      handleOpenCompareModal({
        left: { kind: 'era', eraId },
        right: { kind: 'era', eraId: counterpart.id },
      });
    },
    [resolvedMacroEras, handleOpenCompareModal],
  );

  const handleCompareWithWindow = useCallback(
    (from: number, to: number) => {
      const isNorthernWar = from === 1700 && to === 1721;
      handleOpenCompareModal({
        left: { kind: 'window', from, to },
        right: isNorthernWar
          ? { kind: 'window', from: 1853, to: 1856 }
          : { kind: 'window', from: 1700, to: 1721 },
      });
    },
    [handleOpenCompareModal],
  );

  const handleFilterTimelineByPerson = useCallback(
    (personKey: string) => {
      const dossier = personDossiers.get(personKey);
      if (!dossier) return;
      setFocusedEventId(null);
      setSelectedEra('ALL');
      setSelectedReign('ALL');
      setSearchQuery('');
      setSelectedPersonKey(personKey);
      setYearFrom(timelineBounds.minYear);
      setYearTo(timelineBounds.maxYear);

      setActiveBranches((prev) => {
        const next = { ...prev };
        dossier.events.forEach((ev) => {
          next[ev.task] = true;
        });
        return next;
      });

      setCollapsedParents((prev) => {
        const next = { ...prev };
        dossier.events.forEach((ev) => {
          let cur: BranchDefinition | undefined = branches.find((b) => b.id === ev.task);
          while (cur?.parentBranchId) {
            next[cur.parentBranchId] = false;
            cur = branches.find((item) => item.id === cur!.parentBranchId);
          }
        });
        return next;
      });

      setIsFiltersCollapsed(false);
      showToast(
        `Таймлайн отфильтрован по персоне: ${dossier.displayName} (событий: ${dossier.events.length})`,
      );
    },
    [personDossiers, timelineBounds.minYear, timelineBounds.maxYear, branches, showToast],
  );

  const handleModalNavigateBack = useCallback(() => {
    if (modalHistory.length === 0) return;
    const last = modalHistory[modalHistory.length - 1];
    setModalHistory((prev) => prev.slice(0, -1));
    if (last.type === 'card') {
      setActiveModal({ type: 'CARD', cardId: last.id });
    } else if (last.type === 'ruler') {
      setActiveModal({ type: 'REIGN', rulerId: last.id });
    } else if (last.type === 'era') {
      setActiveModal({ type: 'ERA', eraId: last.id });
    } else if (last.type === 'person') {
      setActiveModal({ type: 'PERSON', personKey: last.id });
    } else if (last.type === 'window' && last.windowRange) {
      setActiveModal({
        type: 'WINDOW',
        from: last.windowRange.from,
        to: last.windowRange.to,
      });
    } else if (last.type === 'compare' && last.comparePair) {
      setActiveModal({ type: 'COMPARE', pair: last.comparePair });
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
    const baseFrom = effectiveYearFrom;
    const baseTo = effectiveYearTo;
    if (y1 === baseFrom && y2 === baseTo && y1 === yearFrom && y2 === yearTo) return;
    if (recordHistory && (y1 !== baseFrom || y2 !== baseTo)) {
      handleRecordZoomStep(baseFrom, baseTo);
    }
    if (focusedEventId && !focusKeepWindow) {
      setFocusKeepWindow(true);
    }
    setYearFrom(y1);
    setYearTo(y2);
  }

  function computeCenteredRange(
    currentFrom: number,
    currentTo: number,
    targetSpan: number,
    minYear: number,
    maxYear: number,
  ): { from: number; to: number } {
    const fullSpan = Math.max(2, maxYear - minYear);
    const clampedSpan = Math.max(2, Math.min(fullSpan, Math.round(targetSpan)));
    if (clampedSpan >= fullSpan) {
      return { from: minYear, to: maxYear };
    }
    const mid = Math.round((currentFrom + currentTo) / 2);
    const halfLeft = Math.floor(clampedSpan / 2);
    let nextFrom = mid - halfLeft;
    let nextTo = nextFrom + clampedSpan;
    if (nextFrom < minYear) {
      nextFrom = minYear;
      nextTo = Math.min(maxYear, minYear + clampedSpan);
    }
    if (nextTo > maxYear) {
      nextTo = maxYear;
      nextFrom = Math.max(minYear, maxYear - clampedSpan);
    }
    return { from: nextFrom, to: nextTo };
  }

  function handleRecordZoomCheckpoint() {
    handleRecordZoomStep(effectiveYearFrom, effectiveYearTo);
  }

  function handleStepBackZoom() {
    if (zoomHistory.length === 0) return;
    const last = zoomHistory[zoomHistory.length - 1];
    preserveViewportScrollAnchor(() => {
      setZoomHistory((prev) => prev.slice(0, -1));
      setSelectedEra('ALL');
      setSelectedReign('ALL');
      if (focusedEventId) {
        setFocusKeepWindow(true);
      }
      setYearFrom(last.from);
      setYearTo(last.to);
    });
  }

  function handleZoomByFactor(factor: number) {
    const currentSpan = Math.max(2, effectiveYearTo - effectiveYearFrom);
    const fullSpan = Math.max(2, timelineBounds.maxYear - timelineBounds.minYear);
    let targetSpan: number;
    if (factor < 1) {
      targetSpan = Math.max(2, Math.floor(currentSpan * factor));
      if (targetSpan === currentSpan && currentSpan > 2) {
        targetSpan = currentSpan - 1;
      }
    } else {
      targetSpan = Math.min(fullSpan, Math.max(currentSpan + 2, Math.round(currentSpan * factor)));
    }
    const next = computeCenteredRange(
      effectiveYearFrom,
      effectiveYearTo,
      targetSpan,
      timelineBounds.minYear,
      timelineBounds.maxYear,
    );
    if (next.from === effectiveYearFrom && next.to === effectiveYearTo) return;
    preserveViewportScrollAnchor(() => {
      setSelectedEra('ALL');
      setSelectedReign('ALL');
      handleYearRangeChange(next.from, next.to, true);
    });
  }

  function handleApplySpanPreset(preset: 'all' | 100 | 10 | 2) {
    const next =
      preset === 'all'
        ? { from: timelineBounds.minYear, to: timelineBounds.maxYear }
        : computeCenteredRange(
            effectiveYearFrom,
            effectiveYearTo,
            preset,
            timelineBounds.minYear,
            timelineBounds.maxYear,
          );
    if (next.from === effectiveYearFrom && next.to === effectiveYearTo) return;
    preserveViewportScrollAnchor(() => {
      setSelectedEra('ALL');
      setSelectedReign('ALL');
      handleYearRangeChange(next.from, next.to, true);
    });
  }

  function handleShiftWindow(direction: -1 | 1) {
    const currentSpan = Math.max(2, effectiveYearTo - effectiveYearFrom);
    const fullSpan = Math.max(2, timelineBounds.maxYear - timelineBounds.minYear);
    if (currentSpan >= fullSpan) return;
    const step = Math.max(1, Math.round(currentSpan / 2)) * direction;
    let nextFrom = effectiveYearFrom + step;
    let nextTo = effectiveYearTo + step;
    if (nextFrom < timelineBounds.minYear) {
      nextFrom = timelineBounds.minYear;
      nextTo = Math.min(timelineBounds.maxYear, timelineBounds.minYear + currentSpan);
    }
    if (nextTo > timelineBounds.maxYear) {
      nextTo = timelineBounds.maxYear;
      nextFrom = Math.max(timelineBounds.minYear, timelineBounds.maxYear - currentSpan);
    }
    if (nextFrom === effectiveYearFrom && nextTo === effectiveYearTo) return;
    preserveViewportScrollAnchor(() => {
      setSelectedEra('ALL');
      setSelectedReign('ALL');
      handleYearRangeChange(nextFrom, nextTo, true);
    });
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
      setSelectedEra('ALL');
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
    setSelectedPersonKey(null);
    setSelectedSyncTag(null);
    setSelectedMacroRegion('all');
    setBranchPairFilter(null);
    setAuditUnlinkedMode(false);
    setOnlyWithSyncLinks(false);
    setSyncLinkTypeFilter('all');
    setFocusedEventId(null);
    setForceShowHiddenLinks(false);
    setDismissedHiddenLinks(false);
    setZoomHistory([]);
    setYearFrom(timelineBounds.minYear);
    setYearTo(timelineBounds.maxYear);
  }

  function handleToggleOnlySynced() {
    setOnlyWithSyncLinks((prev) => {
      const next = !prev;
      if (!next) {
        setSyncLinkTypeFilter('all');
      }
      return next;
    });
  }

  function handleChangeSyncLinkTypeFilter(nextType: SyncLinkTypeFilter) {
    setSyncLinkTypeFilter(nextType);
    if (nextType !== 'all') {
      setOnlyWithSyncLinks(true);
    }
  }

  function handleSelectSyncTag(tag: string | null) {
    setSelectedSyncTag(tag);
    if (!tag) return;
    const option = syncTagOptions.find((o) => o.tag === tag);
    if (option) {
      const hiddenBranches = option.branchIds.filter((id) => activeBranches[id] === false);
      if (hiddenBranches.length > 0) {
        handleRevealBranches(hiddenBranches);
      }
      showToast(`Фильтр по сюжету: «${option.label}» (событий: ${option.eventCount})`);
    }
  }

  function handleChangeBranchPair(pair: BranchPairFilter | null) {
    setBranchPairFilter(pair);
    if (!pair) return;
    handleRevealBranches([pair.branchA, pair.branchB]);
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
      const branch = branches.find((b) => b.id === target.task);
      if (branch?.parentBranchId) {
        setCollapsedParents((prev) => {
          const updated = { ...prev };
          let cur: BranchDefinition | undefined = branch;
          while (cur?.parentBranchId) {
            updated[cur.parentBranchId] = false;
            cur = branches.find((item) => item.id === cur!.parentBranchId);
          }
          return updated;
        });
      }
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

  function handleJumpToRuler(rulerId: string) {
    const target = rulers.find((r) => r.id === rulerId);
    if (!target) return;

    const adjustments: string[] = [];

    if (activeBranches.MAIN_RULERS === false) {
      setActiveBranches((prev) => ({ ...prev, MAIN_RULERS: true }));
      adjustments.push('включена ветка правителей');
    }

    if (target.endYear < effectiveYearFrom || target.startYear > effectiveYearTo) {
      const nextFrom = Math.min(effectiveYearFrom, target.startYear);
      const nextTo = Math.max(effectiveYearTo, target.endYear);
      handleYearRangeChange(nextFrom, nextTo);
      adjustments.push(`окно расширено до ${nextFrom}–${nextTo}`);
    }

    if (selectedEra !== 'ALL' && target.eraId !== selectedEra) {
      setSelectedEra('ALL');
    }
    if (selectedReign !== 'ALL' && selectedReign !== target.id) {
      setSelectedReign('ALL');
    }
    if (searchQuery.trim() !== '') {
      setSearchQuery('');
    }
    if (focusedEventId) {
      setFocusedEventId(null);
      adjustments.push('снят фокус связей');
    }

    setHighlightedJumpId(target.id);
    if (adjustments.length > 0) {
      showToast(`Переход к правлению: «${target.ruler}» (${adjustments.join(', ')}).`);
    } else {
      showToast(`Переход к правлению: «${target.ruler}» (${target.reignPeriod}).`);
    }

    window.setTimeout(() => {
      const el = document.getElementById(target.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
  }

  function handleToggleBranch(branchId: string) {
    const target = branches.find((b) => b.id === branchId);
    if (!target) return;

    preserveViewportScrollAnchor(() => {
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
    });
  }

  function handleRevealBranch(branchId: string) {
    const branch = branches.find((b) => b.id === branchId);
    preserveViewportScrollAnchor(() => {
      setActiveBranches((prev) => ({
        ...prev,
        [branchId]: true,
      }));
      if (branch?.parentBranchId) {
        setCollapsedParents((prev) => {
          const updated = { ...prev };
          let cur: BranchDefinition | undefined = branch;
          while (cur?.parentBranchId) {
            updated[cur.parentBranchId] = false;
            cur = branches.find((item) => item.id === cur!.parentBranchId);
          }
          return updated;
        });
      }
    });
    if (branch) {
      showToast(`Включена ветвь: «${branch.label}».`);
    }
  }

  function handleRevealBranches(branchIds: string[]) {
    if (branchIds.length === 0) return;
    preserveViewportScrollAnchor(() => {
      setActiveBranches((prev) => {
        const next = { ...prev };
        branchIds.forEach((id) => {
          next[id] = true;
        });
        return next;
      });
      setCollapsedParents((prev) => {
        const updated = { ...prev };
        branchIds.forEach((id) => {
          let cur: BranchDefinition | undefined = branches.find((b) => b.id === id);
          while (cur?.parentBranchId) {
            updated[cur.parentBranchId] = false;
            cur = branches.find((item) => item.id === cur!.parentBranchId);
          }
        });
        return updated;
      });
    });
    const labels = branchIds
      .map((id) => branches.find((b) => b.id === id)?.label || id)
      .slice(0, 3)
      .join(', ');
    const suffix = branchIds.length > 3 ? ` и ещё ${branchIds.length - 3}` : '';
    showToast(`Раскрыты связанные ветки (${branchIds.length}): ${labels}${suffix}.`);
  }

  function handleToggleBranchCategory(branchIds: string[], enable: boolean) {
    preserveViewportScrollAnchor(() => {
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
    });
  }

  function handleApplyBranchPreset(presetId: BranchPresetId) {
    preserveViewportScrollAnchor(() => {
      setActiveBranches((prev) => ({
        ...prev,
        ...computeBranchPresetMap(branches, presetId),
      }));
    });
  }

  function handleIsolateBranch(branchId: string) {
    preserveViewportScrollAnchor(() => {
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
    });
  }

  function handleQuickStartHotNode(preset: EpochSlicePreset) {
    setSelectedEra('ALL');
    setSelectedReign('ALL');
    setSearchQuery('');
    setSelectedPersonKey(null);
    setSelectedSyncTag(null);
    setSelectedMacroRegion('all');
    setBranchPairFilter(null);
    setAuditUnlinkedMode(false);
    setFocusedEventId(null);

    if (preset.ensureBranches && preset.ensureBranches.length > 0) {
      setActiveBranches((prev) => {
        const next = { ...prev };
        preset.ensureBranches!.forEach((id) => {
          next[id] = true;
        });
        return next;
      });
      setCollapsedParents((prev) => {
        const updated = { ...prev };
        preset.ensureBranches!.forEach((id) => {
          let cur: BranchDefinition | undefined = branches.find((b) => b.id === id);
          while (cur?.parentBranchId) {
            updated[cur.parentBranchId] = false;
            cur = branches.find((item) => item.id === cur!.parentBranchId);
          }
        });
        return updated;
      });
    }

    handleYearRangeChange(preset.from, preset.to, true);

    if (preset.anchorEventId) {
      const anchorId = preset.anchorEventId;
      setHighlightedJumpId(anchorId);
      showToast(`Поворотный узел: ${preset.label} — подсвечено ключевое событие и связи.`);
      window.setTimeout(() => {
        const el = document.getElementById(`row-${anchorId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 90);
    } else {
      showToast(`Выбран срез: ${preset.label}.`);
    }
  }

  function handleToggleCollapseParent(parentId: string) {
    if (!hasChildBranches(parentId, branches)) return;
    preserveViewportScrollAnchor(() => {
      setCollapsedParents((prev) => ({
        ...prev,
        [parentId]: !prev[parentId],
      }));
    });
  }

  function handleToggleFilters() {
    const willExpand = isFiltersCollapsed;
    if (willExpand) {
      setIsFiltersCollapsed(false);
      window.setTimeout(() => {
        const el = document.getElementById('filter-panel-console');
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top < 54 || rect.top > window.innerHeight * 0.7) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 40);
      return;
    }
    preserveViewportScrollAnchor(() => {
      setIsFiltersCollapsed(true);
    });
  }

  useEffect(() => {
    setDismissedHiddenLinks(false);
  }, [
    effectiveYearFrom,
    effectiveYearTo,
    selectedEra,
    selectedReign,
    searchQuery,
    selectedPersonKey,
    selectedSyncTag,
    selectedMacroRegion,
    branchPairFilter,
    auditUnlinkedMode,
    onlyWithSyncLinks,
    syncLinkTypeFilter,
  ]);

  const activeAdvancedCount =
    (onlyWithSyncLinks || syncLinkTypeFilter !== 'all' ? 1 : 0) +
    (selectedSyncTag ? 1 : 0) +
    (selectedMacroRegion !== 'all' ? 1 : 0) +
    (branchPairFilter ? 1 : 0) +
    (isAuditDebugEnabled && auditUnlinkedMode ? 1 : 0);

  const isWindowNarrowedOrFiltered =
    effectiveYearFrom > timelineBounds.minYear ||
    effectiveYearTo < timelineBounds.maxYear ||
    selectedEra !== 'ALL' ||
    selectedReign !== 'ALL' ||
    searchQuery.trim() !== '' ||
    selectedPersonKey !== null ||
    activeAdvancedCount > 0 ||
    !isFiltersCollapsed;

  const shouldShowHiddenLinksNotice =
    forceShowHiddenLinks || (!dismissedHiddenLinks && isWindowNarrowedOrFiltered);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050811] text-slate-100 p-6 sm:p-10 max-w-7xl mx-auto space-y-6">
        <div className="h-12 bg-slate-900/80 border border-slate-800 rounded-xl animate-pulse" />
        <div className="h-44 bg-slate-900/60 border border-slate-800 rounded-2xl animate-pulse" />
        <div className="h-96 bg-slate-900/50 border border-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (loadError || !manifest) {
    return (
      <div className="min-h-screen bg-[#050811] text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-6 text-center space-y-4">
          <h2 className="text-lg font-bold text-white">Не удалось загрузить данные хронографа</h2>
          <p className="text-sm text-slate-300">{loadError || 'Каталог исторических данных временно недоступен.'}</p>
          <button
            type="button"
            onClick={() => void reloadRepository()}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
          >
            Повторить загрузку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100">
      {toastMessage && (
        <div className="fixed bottom-5 left-5 z-[70] bg-slate-900 border border-amber-500/50 text-slate-100 px-4 py-3 rounded-xl shadow-2xl font-mono text-xs flex items-center gap-2.5 max-w-md">
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
        eras={manifest.macroEras}
        enrichedEventsForEras={enrichedEvents}
        selectedEraId={selectedEra}
        onSelectEra={handleSelectEra}
        onOpenEraModal={handleOpenEraModal}
        rulers={rulers}
        matchingEvents={matchingEvents}
        selectedRulerId={selectedReign === 'ALL' ? '' : selectedReign}
        onJumpToRuler={handleJumpToRuler}
        onFilterByRuler={handleSelectReign}
        onOpenRulerModal={handleOpenPeriodModal}
        selectedMacroRegion={selectedMacroRegion}
        macroRegionCounts={macroRegionCounts}
        onSelectMacroRegion={(region) => {
          preserveViewportScrollAnchor(() => setSelectedMacroRegion(region));
        }}
        yearFrom={effectiveYearFrom}
        yearTo={effectiveYearTo}
        minYear={timelineBounds.minYear}
        maxYear={timelineBounds.maxYear}
        onYearRangeChange={(fromVal, toVal) => {
          setSelectedEra('ALL');
          setSelectedReign('ALL');
          handleYearRangeChange(fromVal, toVal);
        }}
        zoomHistoryCount={zoomHistory.length}
        lastZoomStep={zoomHistory[zoomHistory.length - 1] ?? null}
        onStepBackZoom={handleStepBackZoom}
        onZoomIn={() => handleZoomByFactor(0.5)}
        onZoomOut={() => handleZoomByFactor(2)}
        onShiftWindow={handleShiftWindow}
        cardDensity={cardDensity}
        onChangeCardDensity={(density) =>
          preserveViewportScrollAnchor(() => setCardDensity(density))
        }
        timeScaleMode={timeScaleMode}
        onChangeTimeScaleMode={(mode) =>
          preserveViewportScrollAnchor(() => setTimeScaleMode(mode))
        }
        showEndNodes={showEndNodes}
        onToggleShowEndNodes={() =>
          preserveViewportScrollAnchor(() => setShowEndNodes((prev) => !prev))
        }
        onOpenWindowModal={handleOpenWindowModal}
        onResetTimeFilter={() => handleSelectEra('ALL')}
        isFiltersCollapsed={isFiltersCollapsed}
        activeAdvancedCount={activeAdvancedCount}
        onToggleFilters={handleToggleFilters}
      />

      <DashboardHeader
        visibleLanesCount={visibleLanes.length}
        matchingRulersCount={matchingRulers.length}
        streamCount={stream.length}
        visibleLinksCount={windowLinksVisibility.visibleLinksCount}
        hiddenLinksCount={windowLinksVisibility.hiddenLinksCount}
        onRevealHiddenLinks={() => {
          setDismissedHiddenLinks(false);
          setForceShowHiddenLinks(true);
          window.setTimeout(() => {
            const el = document.getElementById('hidden-links-notice');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 40);
        }}
        minYear={timelineBounds.minYear}
        maxYear={timelineBounds.maxYear}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3.5 space-y-3.5">
        <FilterPanel
          yearFrom={effectiveYearFrom}
          yearTo={effectiveYearTo}
          minYear={timelineBounds.minYear}
          maxYear={timelineBounds.maxYear}
          selectedRulerId={selectedReign === 'ALL' ? '' : selectedReign}
          searchQuery={searchQuery}
          onlySynced={onlyWithSyncLinks}
          syncLinkTypeFilter={syncLinkTypeFilter}
          thematicBranches={thematicLeafBranches}
          syncTagOptions={syncTagOptions}
          selectedSyncTag={selectedSyncTag}
          selectedMacroRegion={selectedMacroRegion}
          macroRegionCounts={macroRegionCounts}
          branchPairFilter={branchPairFilter}
          showAuditTools={isAuditDebugEnabled}
          auditUnlinkedMode={isAuditDebugEnabled && auditUnlinkedMode}
          auditFlaggedCount={
            isAuditDebugEnabled && auditUnlinkedMode ? matchingEvents.length : auditCandidateMap.size
          }
          personDossiers={personDossiers}
          selectedPersonDossier={selectedPersonDossier}
          isAdvancedExpanded={!isFiltersCollapsed}
          onToggleAdvanced={handleToggleFilters}
          onChangeYearFrom={(y) => {
            setSelectedEra('ALL');
            handleYearRangeChange(y, effectiveYearTo);
          }}
          onChangeYearTo={(y) => {
            setSelectedEra('ALL');
            handleYearRangeChange(effectiveYearFrom, y);
          }}
          onSelectYearRange={(fromVal, toVal) => {
            setSelectedEra('ALL');
            setSelectedReign('ALL');
            handleYearRangeChange(fromVal, toVal);
          }}
          onQuickStartHotNode={handleQuickStartHotNode}
          onChangeSearch={setSearchQuery}
          onToggleOnlySynced={handleToggleOnlySynced}
          onChangeSyncLinkTypeFilter={handleChangeSyncLinkTypeFilter}
          onSelectSyncTag={handleSelectSyncTag}
          onSelectMacroRegion={setSelectedMacroRegion}
          onChangeBranchPair={handleChangeBranchPair}
          onToggleAuditUnlinkedMode={() => setAuditUnlinkedMode((prev) => !prev)}
          onOpenCompareModal={handleOpenCompareFromHeader}
          onOpenWindowModal={handleOpenWindowModal}
          onOpenPersonModal={handleOpenPersonModal}
          onClearPersonFilter={() => setSelectedPersonKey(null)}
          onResetFilters={handleResetFiltersOnly}
        />

        <OverlapMapSection
          matchingEvents={matchingEvents}
          rulers={rulers}
          branches={branches}
          activeBranches={effectiveActiveBranches}
          yearFrom={effectiveYearFrom}
          yearTo={effectiveYearTo}
          minYear={timelineBounds.minYear}
          maxYear={timelineBounds.maxYear}
          hoveredEventId={hoveredEventId}
          onHoverEvent={setHoveredEventId}
          onOpenCardModal={handleOpenCardModal}
          onOpenPeriodModal={handleOpenPeriodModal}
          onOpenWindowModal={handleOpenWindowModal}
          onSelectYearRange={(fromVal, toVal, recordHistory = true) => {
            setSelectedEra('ALL');
            setSelectedReign('ALL');
            handleYearRangeChange(fromVal, toVal, recordHistory);
          }}
          zoomHistoryCount={zoomHistory.length}
          lastZoomStep={zoomHistory[zoomHistory.length - 1] ?? null}
          onStepBackZoom={handleStepBackZoom}
          onZoomIn={() => handleZoomByFactor(0.5)}
          onZoomOut={() => handleZoomByFactor(2)}
          onShiftWindow={handleShiftWindow}
          onApplySpanPreset={handleApplySpanPreset}
          onRecordZoomCheckpoint={handleRecordZoomCheckpoint}
        />

        {shouldShowHiddenLinksNotice && (
          <HiddenLinksNotice
            visibility={windowLinksVisibility}
            onRevealBranch={handleRevealBranch}
            onRevealBranches={handleRevealBranches}
            onEnableAllBranches={() => handleApplyBranchPreset('all')}
            onDismiss={() => {
              setForceShowHiddenLinks(false);
              setDismissedHiddenLinks(true);
            }}
          />
        )}
      </div>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-8">
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
          <GitTimeline
            stream={stream}
            matchingEvents={matchingEvents}
            matchingRulers={matchingRulers}
            rulers={rulers}
            visibleLanes={displayLanes}
            branches={branches}
            activeBranches={effectiveActiveBranches}
            collapsedParents={collapsedParents}
            manifest={manifest}
            yearFrom={effectiveYearFrom}
            yearTo={effectiveYearTo}
            minYear={timelineBounds.minYear}
            axisResolution={axisResolution}
            hoveredEventId={hoveredEventId}
            cardDensity={cardDensity}
            timeScaleMode={timeScaleMode}
            selectedMacroRegion={selectedMacroRegion}
            onSelectMacroRegion={(region) => {
              preserveViewportScrollAnchor(() => setSelectedMacroRegion(region));
              if (region === 'all') {
                showToast('Фильтр по макрорегиону сброшен (показаны все регионы)');
              } else {
                showToast(`Фильтр по макрорегиону: «${getMacroRegionOption(region).label}»`);
              }
            }}
            focusedEvent={focusedEvent}
            focusScope={focusScope}
            focusDepth={focusDepth}
            focusKeepWindow={focusKeepWindow}
            outOfWindowFocusCount={outOfWindowFocusCount}
            focusDistanceMap={focusDistanceMap}
            windowRange={{ from: yearFrom, to: yearTo }}
            auditUnlinkedMode={isAuditDebugEnabled && auditUnlinkedMode}
            auditCandidateMap={auditCandidateMap}
            onChangeFocusScope={setFocusScope}
            onChangeFocusDepth={setFocusDepth}
            onToggleFocusKeepWindow={() => setFocusKeepWindow((prev) => !prev)}
            onToggleFocusEvent={handleToggleFocusEvent}
            onToggleCollapseParent={handleToggleCollapseParent}
            onExitFocusMode={() => setFocusedEventId(null)}
            onRevealBranches={handleRevealBranches}
            highlightedJumpId={highlightedJumpId}
            onJumpToEvent={handleJumpToEvent}
            onHoverEvent={setHoveredEventId}
            onOpenCardModal={handleOpenCardModal}
            onOpenPeriodModal={handleOpenPeriodModal}
            onOpenEraModal={handleOpenEraModal}
            onOpenWindowModal={handleOpenWindowModal}
            onSelectYearRange={handleYearRangeChange}
          />
        )}
      </main>

      <ErrorBoundary
        variant="modal"
        resetKey={JSON.stringify(activeModal)}
        onClose={handleCloseAllModals}
      >
        <Suspense
          fallback={
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#050811]/75 backdrop-blur-xs"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/95 px-4 py-2.5 text-xs font-medium text-slate-200 shadow-2xl">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Загрузка аналитического модуля…</span>
              </div>
            </div>
          }
        >
          {activeCardObj && (
            <CardDetailModal
              card={activeCardObj}
              enrichedEvents={enrichedEvents}
              matchingEvents={matchingEvents}
              branches={branches}
              activeBranches={activeBranches}
              eras={manifest.macroEras}
              personDossiers={personDossiers}
              focusedEventId={focusedEventId}
              selectedMacroRegion={selectedMacroRegion}
              modalHistory={modalHistory}
              onClose={handleCloseAllModals}
              onNavigateBack={handleModalNavigateBack}
              onSelectCard={handleOpenCardModal}
              onJumpToTimelineRow={handleJumpToEvent}
              onRevealBranch={handleRevealBranch}
              onToggleFocusEvent={handleToggleFocusEvent}
              onFilterByRuler={handleSelectReign}
              onFilterByMacroRegion={(region) => {
                setSelectedMacroRegion(region);
                handleCloseAllModals();
                if (region === 'all') {
                  showToast('Фильтр по макрорегиону сброшен (показаны все регионы)');
                } else {
                  showToast(`Фильтр по макрорегиону: «${getMacroRegionOption(region).label}»`);
                }
              }}
              onOpenPersonModal={handleOpenPersonModal}
              onFilterByPerson={(personName) => {
                const cleanName = personName.replace(/\s*\([^)]*\)\s*/g, '').trim() || personName;
                setFocusedEventId(null);
                setSelectedEra('ALL');
                setSelectedReign('ALL');
                setYearFrom(timelineBounds.minYear);
                setYearTo(timelineBounds.maxYear);
                setActiveBranches((prev) => ({
                  ...prev,
                  ...computeBranchPresetMap(branches, 'all'),
                }));
                setSearchQuery(cleanName);
                setIsFiltersCollapsed(false);
                showToast(`Поиск по исторической личности: «${cleanName}» (включены все ветки)`);
              }}
              onOpenRulerModal={handleOpenPeriodModal}
              onOpenEraModal={handleOpenEraModal}
            />
          )}

          {activeRulerObj && (
            <PeriodSummaryModal
              ruler={activeRulerObj}
              enrichedEvents={enrichedEvents}
              branches={branches}
              personDossiers={personDossiers}
              modalHistory={modalHistory}
              onClose={handleCloseAllModals}
              onNavigateBack={handleModalNavigateBack}
              onSelectCard={handleOpenCardModal}
              onOpenPersonModal={handleOpenPersonModal}
              onFilterByRuler={handleSelectReign}
              onCompareWithRuler={handleCompareWithRuler}
            />
          )}

          {activePersonObj && (
            <PersonDossierModal
              dossier={activePersonObj}
              branches={branches}
              activeBranches={activeBranches}
              modalHistory={modalHistory}
              onClose={handleCloseAllModals}
              onNavigateBack={handleModalNavigateBack}
              onSelectCard={handleOpenCardModal}
              onOpenRulerModal={handleOpenPeriodModal}
              onFilterTimelineByPerson={handleFilterTimelineByPerson}
            />
          )}

          {activeEraObj && (
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
              onCompareWithEra={handleCompareWithEra}
            />
          )}

          {activeWindowRange && (
            <WindowSummaryModal
              windowRange={activeWindowRange}
              eras={manifest.macroEras}
              rulers={rulers}
              enrichedEvents={enrichedEvents}
              branches={branches}
              activeBranches={activeBranches}
              personDossiers={personDossiers}
              modalHistory={modalHistory}
              onClose={handleCloseAllModals}
              onNavigateBack={handleModalNavigateBack}
              onSelectEra={handleOpenEraModal}
              onSelectRuler={handleOpenPeriodModal}
              onSelectEvent={handleOpenCardModal}
              onOpenPersonModal={handleOpenPersonModal}
              onRevealBranches={handleRevealBranches}
              onCompareWithWindow={handleCompareWithWindow}
            />
          )}

          {activeComparePair && (
            <ComparePeriodsModal
              comparePair={activeComparePair}
              rulers={rulers}
              eras={manifest.macroEras}
              enrichedEvents={enrichedEvents}
              branches={branches}
              personDossiers={personDossiers}
              modalHistory={modalHistory}
              currentWindow={{ from: effectiveYearFrom, to: effectiveYearTo }}
              minYear={timelineBounds.minYear}
              maxYear={timelineBounds.maxYear}
              onUpdatePair={(nextPair) => setActiveModal({ type: 'COMPARE', pair: nextPair })}
              onClose={handleCloseAllModals}
              onNavigateBack={handleModalNavigateBack}
              onSelectCard={handleOpenCardModal}
              onOpenRulerModal={handleOpenPeriodModal}
              onOpenEraModal={handleOpenEraModal}
              onOpenPersonModal={handleOpenPersonModal}
              onSelectYearRange={(fromVal, toVal) => {
                setSelectedEra('ALL');
                setSelectedReign('ALL');
                handleYearRangeChange(fromVal, toVal);
              }}
            />
          )}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
