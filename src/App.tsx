import { Suspense, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DashboardHeader } from './components/DashboardHeader';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { EpochSlicePreset } from './components/EraSelectorPopover';
import { FilterPanel } from './components/FilterPanel';
import { GitTimeline } from './components/GitTimeline';
import { HiddenLinksNotice } from './components/HiddenLinksNotice';
import { CampaignModeBar } from './components/timeline/CampaignModeBar';
import { TopControlBar } from './components/TopControlBar';
import { lazyWithRetry } from './utils/lazyWithRetry';

const loadCardDetailModal = () =>
  import('./components/CardDetailModal').then((m) => ({ default: m.CardDetailModal }));
const loadComparePeriodsModal = () =>
  import('./components/ComparePeriodsModal').then((m) => ({ default: m.ComparePeriodsModal }));
const loadEraSummaryModal = () =>
  import('./components/EraSummaryModal').then((m) => ({ default: m.EraSummaryModal }));
const loadPeriodSummaryModal = () =>
  import('./components/PeriodSummaryModal').then((m) => ({ default: m.PeriodSummaryModal }));
const loadPersonDossierModal = () =>
  import('./components/PersonDossierModal').then((m) => ({ default: m.PersonDossierModal }));
const loadWindowSummaryModal = () =>
  import('./components/WindowSummaryModal').then((m) => ({ default: m.WindowSummaryModal }));
const loadCampaignCausalTracerModal = () =>
  import('./components/CampaignCausalTracerModal').then((m) => ({
    default: m.CampaignCausalTracerModal,
  }));
const loadCampaignCatalogModal = () =>
  import('./components/CampaignCatalogModal').then((m) => ({
    default: m.CampaignCatalogModal,
  }));
const loadCommandPaletteModal = () =>
  import('./components/CommandPaletteModal').then((m) => ({
    default: m.CommandPaletteModal,
  }));
const loadOverlapMapSection = () =>
  import('./components/OverlapMapSection').then((m) => ({
    default: m.OverlapMapSection,
  }));

const CardDetailModal = lazyWithRetry(loadCardDetailModal);
const ComparePeriodsModal = lazyWithRetry(loadComparePeriodsModal);
const EraSummaryModal = lazyWithRetry(loadEraSummaryModal);
const PeriodSummaryModal = lazyWithRetry(loadPeriodSummaryModal);
const PersonDossierModal = lazyWithRetry(loadPersonDossierModal);
const WindowSummaryModal = lazyWithRetry(loadWindowSummaryModal);
const CampaignCausalTracerModal = lazyWithRetry(loadCampaignCausalTracerModal);
const CampaignCatalogModal = lazyWithRetry(loadCampaignCatalogModal);
const CommandPaletteModal = lazyWithRetry(loadCommandPaletteModal);
const OverlapMapSection = lazyWithRetry(loadOverlapMapSection);

import {
  parseBranchSelection,
  resolveBranchSelection,
  updateBranchSelection,
  type BranchSelection,
} from './engine/layout/branchSelection';
import { useTimelineData } from './hooks/useTimelineData';
import {
  parseInitialYearBound,
  parseWindowRangeParam,
  resolveUrlYearRange,
  useTimelineUrlSync,
} from './hooks/useTimelineUrlSync';
import {
  doesEventMatchMacroRegion,
  getMacroRegionOption,
  parseMacroRegionParam,
} from './engine/regionFilter';
import {
  buildCampaignBranchMask,
  buildCommandSearchIndex,
  buildPersonDossierIndex,
  buildSyncTagIndex,
  buildUnifiedTimelineStream,
  collapseAllParentBranches,
  computeMacroRegionCounts,
  computeTimelineYearBounds,
  countExpectedLeafBranchesFromManifest,
  createCampaignReturnSnapshot,
  doesIntervalBelongToEra,
  extractBranchesFromStore,
  extractRulersFromStore,
  filterEventsForAnalyticsScope,
  findCampaignPackById,
  findCampaignPackForEvent,
  getCampaignBranches,
  getCampaignEntryFilterDefaults,
  getCoreBranches,
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
  resolveCampaignNavigationBounds,
  resolveEventBranch,
  resolveMacroEras,
  resolvePersonKey,
  type CampaignReturnSnapshot,
  type CommandSearchItem,
} from './engine/timelineEngine';
import { preserveViewportScrollAnchor } from './utils/scrollIsolation';
import type {
  BranchDefinition,
  BranchPairFilter,
  BranchPresetId,
  CardDensity,
  CausalChainMode,
  CausalChainResult,
  ComparisonTarget,
  FocusDepth,
  FocusScope,
  MacroRegionId,
  ModalHistoryItem,
  PersonDossier,
  SyncLinkTypeFilter,
  SyncTagOption,
  TimeScaleMode,
  TracedChainFilter,
  YearRangeStep,
} from './types/timeline';

const EMPTY_PERSON_DOSSIERS = new Map<string, PersonDossier>();
const EMPTY_PERSON_RAW_TO_KEY = new Map<string, string>();
const EMPTY_SYNC_TAG_OPTIONS: SyncTagOption[] = [];

type ActiveModalState =
  | { type: 'NONE' }
  | { type: 'CARD'; cardId: string }
  | { type: 'REIGN'; rulerId: string }
  | { type: 'ERA'; eraId: string }
  | { type: 'PERSON'; personKey: string }
  | { type: 'WINDOW'; from: number; to: number }
  | { type: 'COMPARE'; pair: { left: ComparisonTarget; right: ComparisonTarget } }
  | { type: 'TRACER'; eventId: string }
  | { type: 'CAMPAIGNS' };

function mergeMissingCollapsedParents(
  prev: Record<string, boolean>,
  branches: BranchDefinition[],
  collapseAllByDefault = false,
): Record<string, boolean> {
  if (branches.length === 0) return prev;
  const shouldCollapseBranch = (b: BranchDefinition) =>
    Boolean(b.defaultCollapsedOnTimeline) ||
    (collapseAllByDefault && hasChildBranches(b.id, branches));

  let hasMissing = false;
  for (let i = 0; i < branches.length; i += 1) {
    const b = branches[i];
    if (shouldCollapseBranch(b) && prev[b.id] === undefined) {
      hasMissing = true;
      break;
    }
  }
  if (!hasMissing) return prev;

  const next: Record<string, boolean> = { ...prev };
  for (let i = 0; i < branches.length; i += 1) {
    const b = branches[i];
    if (shouldCollapseBranch(b) && next[b.id] === undefined) {
      next[b.id] = true;
    }
  }
  return next;
}

export default function App() {
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);

  const {
    manifest,
    filesMap,
    campaignPacks,
    loadedCampaignIds,
    failedCampaignIds,
    loadingCampaignId,
    loading,
    loadError,
    isFullyHydrated,
    isHydrating,
    isRetrying,
    partialLoadWarning,
    reloadRepository,
    ensureAllModulesLoaded,
    loadCampaignPack,
  } = useTimelineData({ initialParams });

  const [isPersonIndexReady, setIsPersonIndexReady] = useState<boolean>(() =>
    Boolean(
      initialParams.get('card') ||
        initialParams.get('ruler') ||
        initialParams.get('person') ||
        initialParams.get('window') ||
        initialParams.get('search'),
    ),
  );
  const hasInitializedBranchesRef = useRef(false);

  const [branchSelection, setBranchSelection] = useState(() => parseBranchSelection(initialParams.get('branches')));
  const [collapsedParents, setCollapsedParents] = useState<Record<string, boolean>>({});

  const [requestedYearFrom, setYearFrom] = useState(() => parseInitialYearBound(initialParams, 'from', undefined));
  const [requestedYearTo, setYearTo] = useState(() => parseInitialYearBound(initialParams, 'to', undefined));
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(() => {
    const raw = initialParams.get('campaign')?.trim();
    return raw ? raw : null;
  });
  const [campaignEnabledBranchIds, setCampaignEnabledBranchIds] = useState<string[] | null>(null);
  const [includeAtlasContext, setIncludeAtlasContext] = useState(false);
  const [tracedChainFilter, setTracedChainFilter] = useState<TracedChainFilter | null>(null);
  const campaignReturnSnapshotRef = useRef<CampaignReturnSnapshot | null>(null);
  const hasAppliedInitialCampaignWindowRef = useRef(false);
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
  const restoreBranchSelection = useCallback((value: string | null) => {
    const selection = parseBranchSelection(value);
    if (selection.preset === 'none' && !Object.values(selection.overrides).some(Boolean)) {
      setFocusedEventId(null);
      setBranchPairFilter(null);
    }
    setBranchSelection(selection);
  }, []);
  const [highlightedJumpId, setHighlightedJumpId] = useState<string | null>(null);

  const [showEndNodes, setShowEndNodes] = useState(true);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(true);
  const [isOverlapMapExpanded, setIsOverlapMapExpanded] = useState(false);
  const showOverlapMatrix = !isFiltersCollapsed;
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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const manifestReady = manifest !== null;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  // Глобальный шорткат Ctrl+K / ⌘K для быстрого поиска по всему атласу
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (
      manifestReady &&
      (searchQuery.trim() || selectedPersonKey || activeModal.type !== 'NONE' || isCommandPaletteOpen)
    ) {
      void ensureAllModulesLoaded({ priority: true });
    }
  }, [
    manifestReady,
    searchQuery,
    selectedPersonKey,
    activeModal.type,
    isCommandPaletteOpen,
    ensureAllModulesLoaded,
  ]);

  // Фоновая предзагрузка чанков модальных окон во время простоя браузера (после завершения фоновой гидратации веток)
  useEffect(() => {
    if (loading || loadError || !manifest || !isFullyHydrated) return;
    let cancelled = false;
    const loaders = [
      loadCardDetailModal,
      loadPeriodSummaryModal,
      loadPersonDossierModal,
      loadEraSummaryModal,
      loadWindowSummaryModal,
      loadComparePeriodsModal,
      loadCampaignCatalogModal,
      loadCommandPaletteModal,
      loadOverlapMapSection,
    ];
    const timers: number[] = [];
    const idleIds: number[] = [];
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const scheduleStep = (index: number) => {
      if (cancelled || index >= loaders.length) return;
      const run = () => {
        if (cancelled) return;
        void loaders[index]().catch(() => {
          // Ошибка фонового prefetch не критична: lazyWithRetry подгрузит чанк по клику
        });
        const nextTimer = window.setTimeout(() => scheduleStep(index + 1), 180);
        timers.push(nextTimer);
      };
      if (typeof win.requestIdleCallback === 'function') {
        const id = win.requestIdleCallback(run, { timeout: 2500 });
        idleIds.push(id);
      } else {
        const id = window.setTimeout(run, 350 + index * 220);
        timers.push(id);
      }
    };

    const initialDelay = window.setTimeout(() => scheduleStep(0), 600);
    timers.push(initialDelay);

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      if (typeof win.cancelIdleCallback === 'function') {
        idleIds.forEach((id) => win.cancelIdleCallback!(id));
      }
    };
  }, [loading, loadError, manifest, isFullyHydrated]);

  // Отложенная сборка индекса персон после первого рендера ленты
  useEffect(() => {
    if (loading || !manifest || isPersonIndexReady) return;
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const trigger = () => {
      startTransition(() => {
        setIsPersonIndexReady(true);
      });
    };
    if (typeof win.requestIdleCallback === 'function') {
      const id = win.requestIdleCallback(trigger, { timeout: 900 });
      return () => win.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(trigger, 160);
    return () => window.clearTimeout(timer);
  }, [loading, manifest, isPersonIndexReady]);

  const handleRequestAllBranches = useCallback(() => {
    void ensureAllModulesLoaded({ priority: true });
  }, [ensureAllModulesLoaded]);

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
      if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('[aria-modal="true"]')) {
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

  const expectedTotalBranches = useMemo(
    () => countExpectedLeafBranchesFromManifest(manifest),
    [manifest],
  );

  // Синхронное разрешение состояния веток и свёрнутых групп:
  // гарантирует отсутствие промежуточного рендера с пустой картой activeBranches или неинициализированными ветками Phase 2
  const resolvedActiveBranches = useMemo(
    () => resolveBranchSelection(branches, branchSelection),
    [branches, branchSelection],
  );

  const setActiveBranches = useCallback((update: (mask: Record<string, boolean>) => Record<string, boolean>) => {
    setBranchSelection((previous) => updateBranchSelection(branches, previous, update));
  }, [branches]);

  const isAllBranchesPresetActive =
    branchSelection.preset === 'all' && Object.keys(branchSelection.overrides).length === 0;

  const resolvedCollapsedParents = useMemo(
    () => mergeMissingCollapsedParents(collapsedParents, branches, isAllBranchesPresetActive),
    [collapsedParents, branches, isAllBranchesPresetActive],
  );

  // Динамическая синхронизация состояния веток в React-state при первичном монтировании и фоновой догрузке Phase 2
  useEffect(() => {
    if (branches.length === 0) return;

    const applyBranchSync = () => {
      setCollapsedParents((prev) =>
        mergeMissingCollapsedParents(prev, branches, isAllBranchesPresetActive),
      );
    };

    if (!hasInitializedBranchesRef.current) {
      hasInitializedBranchesRef.current = true;
      applyBranchSync();
    } else {
      startTransition(applyBranchSync);
    }
  }, [branches, isAllBranchesPresetActive]);

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

  const handlePopCampaignFromUrl = useCallback((campaignId: string | null) => {
    const normalized = campaignId?.trim() || null;
    setActiveCampaignId(normalized);
    setCampaignEnabledBranchIds(null);
    setIncludeAtlasContext(false);
    setTracedChainFilter(null);
  }, []);

  useTimelineUrlSync({
    yearFrom: requestedYearFrom,
    yearTo: requestedYearTo,
    searchQuery,
    selectedMacroRegion,
    activeCampaignId,
    activeCardId,
    activeRulerModalId,
    activePersonModalKey,
    activeEraModalId,
    activeWindowModalRange,
    branchSelection,
    setYearFrom,
    setYearTo,
    setSearchQuery,
    setSelectedMacroRegion,
    restoreBranchSelection,
    onPopCampaignFromUrl: handlePopCampaignFromUrl,
    onPopModalFromUrl: handlePopModalFromUrl,
  });

  const rulersMetaPath = useMemo(() => {
    if (!manifest) return null;
    const rulersMeta = manifest.mountedFiles.find(
      (m) => m.role === 'trunk' || m.role === 'rulers_branch' || m.fileId === 'rulers',
    );
    return rulersMeta && rulersMeta.enabled ? rulersMeta.path : null;
  }, [manifest]);

  const rulersFile = rulersMetaPath ? filesMap[rulersMetaPath] : undefined;

  const rulers = useMemo(() => {
    if (!manifest || !rulersMetaPath || !rulersFile) return [];
    return extractRulersFromStore(manifest, { [rulersMetaPath]: rulersFile });
  }, [manifest, rulersMetaPath, rulersFile]);

  const enrichedEvents = useMemo(() => {
    if (!manifest) return [];
    return getEnrichedEvents(manifest, filesMap, rulers);
  }, [manifest, filesMap, rulers]);

  const coreEnrichedEvents = useMemo(
    () => filterEventsForAnalyticsScope(enrichedEvents, { includeCampaignDetails: false }),
    [enrichedEvents],
  );

  const activeCampaignPack = useMemo(
    () => findCampaignPackById(campaignPacks, activeCampaignId),
    [campaignPacks, activeCampaignId],
  );

  const activeCampaignBranches = useMemo(
    () => (activeCampaignPack ? getCampaignBranches(branches, activeCampaignPack.id) : []),
    [branches, activeCampaignPack],
  );

  const coreBranches = useMemo(() => getCoreBranches(branches), [branches]);

  useEffect(() => {
    if (!manifestReady || !activeCampaignId) return;
    if (
      !loadedCampaignIds.includes(activeCampaignId) &&
      !failedCampaignIds.includes(activeCampaignId) &&
      loadingCampaignId !== activeCampaignId
    ) {
      void loadCampaignPack(activeCampaignId);
    }
  }, [
    manifestReady,
    activeCampaignId,
    loadedCampaignIds,
    failedCampaignIds,
    loadingCampaignId,
    loadCampaignPack,
  ]);

  useEffect(() => {
    if (!activeCampaignPack || hasAppliedInitialCampaignWindowRef.current) return;
    hasAppliedInitialCampaignWindowRef.current = true;
    if (requestedYearFrom === undefined && requestedYearTo === undefined) {
      setYearFrom(activeCampaignPack.yearFrom);
      setYearTo(activeCampaignPack.yearTo);
    }
  }, [activeCampaignPack, requestedYearFrom, requestedYearTo]);

  const shouldComputePersonIndex =
    isPersonIndexReady ||
    activeModal.type !== 'NONE' ||
    isCommandPaletteOpen ||
    searchQuery.trim().length >= 2 ||
    selectedPersonKey !== null;

  const { dossiers: personDossiers, rawToKey: personRawToKey } = useMemo(() => {
    if (!shouldComputePersonIndex || enrichedEvents.length === 0) {
      return { dossiers: EMPTY_PERSON_DOSSIERS, rawToKey: EMPTY_PERSON_RAW_TO_KEY };
    }
    return buildPersonDossierIndex(enrichedEvents, rulers);
  }, [shouldComputePersonIndex, enrichedEvents, rulers]);

  const selectedPersonDossier = useMemo(
    () => (selectedPersonKey ? personDossiers.get(selectedPersonKey) ?? null : null),
    [selectedPersonKey, personDossiers],
  );

  const timelineBounds = useMemo(
    () => computeTimelineYearBounds(manifest, rulers, enrichedEvents),
    [manifest, rulers, enrichedEvents],
  );

  const effectiveNavBounds = useMemo(
    () => resolveCampaignNavigationBounds(activeCampaignPack, timelineBounds),
    [activeCampaignPack, timelineBounds],
  );

  const { from: yearFrom, to: yearTo } = resolveUrlYearRange(
    requestedYearFrom, requestedYearTo, timelineBounds, isFullyHydrated,
  );

  // Изоляция устаревших ID при удалении файлов веток или правителей (только после завершения гидратации)
  useEffect(() => {
    if (!manifest || !isFullyHydrated) return;
    if (selectedReign !== 'ALL' && !rulers.some((r) => r.id === selectedReign)) {
      setSelectedReign('ALL');
    }
    if (focusedEventId && !enrichedEvents.some((e) => e.id === focusedEventId)) {
      setFocusedEventId(null);
    }
    if (activeModal.type === 'CARD' && !enrichedEvents.some((e) => e.id === activeModal.cardId)) {
      setActiveModal({ type: 'NONE' });
    }
    if (
      activeModal.type === 'TRACER' &&
      !enrichedEvents.some((e) => e.id === activeModal.eventId)
    ) {
      setActiveModal({ type: 'NONE' });
    }
    if (activeModal.type === 'REIGN' && !rulers.some((r) => r.id === activeModal.rulerId)) {
      setActiveModal({ type: 'NONE' });
    }
    if (
      shouldComputePersonIndex &&
      activeModal.type === 'PERSON' &&
      !personDossiers.has(activeModal.personKey)
    ) {
      setActiveModal({ type: 'NONE' });
    }
    if (
      activeModal.type === 'ERA' &&
      !manifest.macroEras.some((e) => e.id === activeModal.eraId)
    ) {
      setActiveModal({ type: 'NONE' });
    }
    if (shouldComputePersonIndex && selectedPersonKey && !personDossiers.has(selectedPersonKey)) {
      setSelectedPersonKey(null);
    }
  }, [
    manifest,
    isFullyHydrated,
    shouldComputePersonIndex,
    rulers,
    enrichedEvents,
    personDossiers,
    selectedReign,
    focusedEventId,
    activeModal,
    selectedPersonKey,
  ]);

  const syncTagOptions = useMemo(
    () =>
      manifest && (!isFiltersCollapsed || selectedSyncTag !== null)
        ? buildSyncTagIndex(enrichedEvents, rulers, manifest.macroEras)
        : EMPTY_SYNC_TAG_OPTIONS,
    [manifest, isFiltersCollapsed, selectedSyncTag, enrichedEvents, rulers],
  );

  const thematicLeafBranches = useMemo(
    () => getLeafBranches(activeCampaignPack ? [...coreBranches, ...activeCampaignBranches] : coreBranches),
    [coreBranches, activeCampaignBranches, activeCampaignPack],
  );

  const effectiveActiveBranches = useMemo(() => {
    if (activeCampaignPack) {
      return buildCampaignBranchMask(branches, activeCampaignPack, {
        enabledBranchIds: campaignEnabledBranchIds,
        includeRulers: true,
        includeAtlasContext,
      });
    }
    if (!branchPairFilter) return resolvedActiveBranches;
    const next: Record<string, boolean> = {};
    branches.forEach((b) => {
      if (b.isGroup) return;
      if (b.id === 'MAIN_RULERS') {
        next[b.id] = resolvedActiveBranches.MAIN_RULERS !== false;
      } else {
        next[b.id] = b.id === branchPairFilter.branchA || b.id === branchPairFilter.branchB;
      }
    });
    return next;
  }, [
    activeCampaignPack,
    campaignEnabledBranchIds,
    includeAtlasContext,
    resolvedActiveBranches,
    branchPairFilter,
    branches,
  ]);

  const visibleLanes = useMemo(
    () => getVisibleLanes(branches, effectiveActiveBranches, resolvedCollapsedParents),
    [branches, effectiveActiveBranches, resolvedCollapsedParents],
  );

  const overlapLanesCount = useMemo(() => {
    const eventLeaves = getLeafBranches(branches).filter(
      (b) => !b.isTimeAxis && effectiveActiveBranches[b.id],
    ).length;
    const rulersActive = effectiveActiveBranches.MAIN_RULERS !== false ? 1 : 0;
    return eventLeaves + rulersActive;
  }, [branches, effectiveActiveBranches]);

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
      computeAuditMap: isAuditDebugEnabled,
      onlyWithSyncLinks,
      syncLinkTypeFilter,
      focusedEventId,
      focusScope,
      focusDepth,
      focusKeepWindow,
      tracedChainEventIds: tracedChainFilter?.eventIds ?? null,
      tracedChainRootId: tracedChainFilter?.rootEventId ?? null,
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
    tracedChainFilter,
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
    if (!focusedEvent && !tracedChainFilter) return visibleLanes;
    const laneIds = new Set(visibleLanes.map((l) => l.id));
    const extras: BranchDefinition[] = [];
    matchingEvents.forEach((ev) => {
      const b = resolveEventBranch(ev, branches, resolvedCollapsedParents);
      if (!laneIds.has(b.id)) {
        laneIds.add(b.id);
        extras.push(b);
      }
    });
    return extras.length > 0 ? [...visibleLanes, ...extras] : visibleLanes;
  }, [focusedEvent, tracedChainFilter, visibleLanes, matchingEvents, branches, resolvedCollapsedParents]);

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
    () => activeModal.type === 'WINDOW'
      ? resolveUrlYearRange(activeModal.from, activeModal.to, timelineBounds, isFullyHydrated)
      : null,
    [activeModal, timelineBounds, isFullyHydrated],
  );

  const activeComparePair = useMemo(
    () => (activeModal.type === 'COMPARE' ? activeModal.pair : null),
    [activeModal],
  );

  const activeTracerEvent = useMemo(
    () =>
      activeModal.type === 'TRACER'
        ? (enrichedEvents.find((e) => e.id === activeModal.eventId) ?? null)
        : null,
    [activeModal, enrichedEvents],
  );

  // Реф актуального состояния модальных окон для стабильных коллбеков (чтобы открытие/закрытие модалок не перерисовывало ленту)
  const modalStateRef = useRef({
    activeModal,
    activeCardObj,
    activeRulerObj,
    activeEraObj,
    activePersonObj,
    activeWindowRange,
    activeComparePair,
    activeTracerEvent,
    personDossiers,
    personRawToKey,
    enrichedEvents,
    rulers,
    isPersonIndexReady,
  });
  modalStateRef.current = {
    activeModal,
    activeCardObj,
    activeRulerObj,
    activeEraObj,
    activePersonObj,
    activeWindowRange,
    activeComparePair,
    activeTracerEvent,
    personDossiers,
    personRawToKey,
    enrichedEvents,
    rulers,
    isPersonIndexReady,
  };

  // Стек навигации между модальными окнами («← Назад»)
  const pushCurrentModalToHistory = useCallback(() => {
    const {
      activeCardObj: curCard,
      activeRulerObj: curRuler,
      activeEraObj: curEra,
      activePersonObj: curPerson,
      activeWindowRange: curWindow,
      activeComparePair: curCompare,
    } = modalStateRef.current;

    if (curCard) {
      setModalHistory((prev) => [
        ...prev.slice(-9),
        { type: 'card', id: curCard.id, label: `${curCard.period} ${curCard.title}` },
      ]);
    } else if (curRuler) {
      setModalHistory((prev) => [
        ...prev.slice(-9),
        { type: 'ruler', id: curRuler.id, label: `${curRuler.shortRuler} (${curRuler.reignPeriod})` },
      ]);
    } else if (curEra) {
      setModalHistory((prev) => [
        ...prev.slice(-9),
        { type: 'era', id: curEra.id, label: curEra.shortTitle || curEra.title },
      ]);
    } else if (curPerson) {
      setModalHistory((prev) => [
        ...prev.slice(-9),
        { type: 'person', id: curPerson.key, label: curPerson.displayName },
      ]);
    } else if (curWindow) {
      setModalHistory((prev) => [
        ...prev.slice(-9),
        {
          type: 'window',
          id: `${curWindow.from}-${curWindow.to}`,
          label: `Окно ${curWindow.from}–${curWindow.to}`,
          windowRange: curWindow,
        },
      ]);
    } else if (curCompare) {
      setModalHistory((prev) => [
        ...prev.slice(-9),
        {
          type: 'compare',
          id: 'compare',
          label: 'Сравнение периодов',
          comparePair: curCompare,
        },
      ]);
    } else if (modalStateRef.current.activeTracerEvent) {
      const curTraced = modalStateRef.current.activeTracerEvent;
      setModalHistory((prev) => [
        ...prev.slice(-9),
        {
          type: 'tracer',
          id: curTraced.id,
          label: `Цепочка: ${curTraced.title}`,
        },
      ]);
    } else if (modalStateRef.current.activeModal.type === 'CAMPAIGNS') {
      setModalHistory((prev) => [
        ...prev.slice(-9),
        {
          type: 'campaigns',
          id: 'campaigns',
          label: 'Режим кампаний',
        },
      ]);
    }
  }, []);

  const transitionToModal = useCallback(
    (nextModal: Exclude<ActiveModalState, { type: 'NONE' }>) => {
      if (modalStateRef.current.activeModal.type !== 'NONE') {
        pushCurrentModalToHistory();
      } else {
        setModalHistory([]);
      }
      setActiveModal(nextModal);
    },
    [pushCurrentModalToHistory],
  );

  const handleOpenCardModal = useCallback(
    (cardId: string) => {
      const cur = modalStateRef.current.activeModal;
      if (cur.type === 'CARD' && cur.cardId === cardId) return;
      transitionToModal({ type: 'CARD', cardId });
    },
    [transitionToModal],
  );

  const handleOpenCampaignCatalogModal = useCallback(() => {
    const cur = modalStateRef.current.activeModal;
    if (cur.type === 'CAMPAIGNS') return;
    transitionToModal({ type: 'CAMPAIGNS' });
  }, [transitionToModal]);

  const handleOpenCausalTracer = useCallback(
    (eventId: string) => {
      void ensureAllModulesLoaded({ priority: true });
      const cur = modalStateRef.current.activeModal;
      if (cur.type === 'TRACER' && cur.eventId === eventId) return;
      transitionToModal({ type: 'TRACER', eventId });
    },
    [ensureAllModulesLoaded, transitionToModal],
  );

  const handleOpenPeriodModal = useCallback(
    (rulerId: string) => {
      const cur = modalStateRef.current.activeModal;
      if (cur.type === 'REIGN' && cur.rulerId === rulerId) return;
      transitionToModal({ type: 'REIGN', rulerId });
    },
    [transitionToModal],
  );

  const handleOpenEraModal = useCallback(
    (eraId: string) => {
      const cur = modalStateRef.current.activeModal;
      if (cur.type === 'ERA' && cur.eraId === eraId) return;
      transitionToModal({ type: 'ERA', eraId });
    },
    [transitionToModal],
  );

  const handleOpenPersonModal = useCallback(
    (personKeyOrName: string) => {
      const state = modalStateRef.current;
      let dossiers = state.personDossiers;
      let rawToKey = state.personRawToKey;
      if (dossiers.size === 0 && state.enrichedEvents.length > 0) {
        const built = buildPersonDossierIndex(state.enrichedEvents, state.rulers);
        dossiers = built.dossiers;
        rawToKey = built.rawToKey;
        if (!state.isPersonIndexReady) {
          setIsPersonIndexReady(true);
        }
      }
      const resolvedKey =
        resolvePersonKey(personKeyOrName, dossiers, rawToKey) || personKeyOrName;
      if (!dossiers.has(resolvedKey)) return;
      if (state.activeModal.type === 'PERSON' && state.activeModal.personKey === resolvedKey) return;
      transitionToModal({ type: 'PERSON', personKey: resolvedKey });
    },
    [transitionToModal],
  );

  const commandSearchIndex = useMemo(() => {
    if (!isCommandPaletteOpen) return null;
    return buildCommandSearchIndex({
      eras: resolvedMacroEras,
      rulers,
      events: enrichedEvents,
      personDossiers,
      campaignPacks,
      branches,
    });
  }, [
    isCommandPaletteOpen,
    resolvedMacroEras,
    rulers,
    enrichedEvents,
    personDossiers,
    campaignPacks,
    branches,
  ]);

  const handleSelectCommandItem = (item: CommandSearchItem) => {
    switch (item.category) {
      case 'eras':
        handleOpenEraModal(item.targetId);
        break;
      case 'rulers':
        handleOpenPeriodModal(item.targetId);
        break;
      case 'events':
        handleOpenCardModal(item.targetId);
        break;
      case 'people':
        handleOpenPersonModal(item.targetId);
        break;
      case 'campaigns':
        handleOpenCampaign(item.targetId);
        break;
    }
  };

  const handleOpenWindowModal = useCallback(
    (fromVal: number, toVal: number) => {
      const from = Math.min(fromVal, toVal);
      const to = Math.max(fromVal, toVal);
      const cur = modalStateRef.current.activeModal;
      if (cur.type === 'WINDOW' && cur.from === from && cur.to === to) {
        return;
      }
      transitionToModal({ type: 'WINDOW', from, to });
    },
    [transitionToModal],
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
      setYearFrom(effectiveNavBounds.minYear);
      setYearTo(effectiveNavBounds.maxYear);

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
    [personDossiers, effectiveNavBounds.minYear, effectiveNavBounds.maxYear, branches, showToast, setActiveBranches],
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
    } else if (last.type === 'tracer') {
      setActiveModal({ type: 'TRACER', eventId: last.id });
    } else if (last.type === 'campaigns') {
      setActiveModal({ type: 'CAMPAIGNS' });
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
    const fullSpan = Math.max(2, effectiveNavBounds.maxYear - effectiveNavBounds.minYear);
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
      effectiveNavBounds.minYear,
      effectiveNavBounds.maxYear,
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
        ? { from: effectiveNavBounds.minYear, to: effectiveNavBounds.maxYear }
        : computeCenteredRange(
            effectiveYearFrom,
            effectiveYearTo,
            preset,
            effectiveNavBounds.minYear,
            effectiveNavBounds.maxYear,
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
    const fullSpan = Math.max(2, effectiveNavBounds.maxYear - effectiveNavBounds.minYear);
    if (currentSpan >= fullSpan) return;
    const step = Math.max(1, Math.round(currentSpan / 2)) * direction;
    let nextFrom = effectiveYearFrom + step;
    let nextTo = effectiveYearTo + step;
    if (nextFrom < effectiveNavBounds.minYear) {
      nextFrom = effectiveNavBounds.minYear;
      nextTo = Math.min(effectiveNavBounds.maxYear, effectiveNavBounds.minYear + currentSpan);
    }
    if (nextTo > effectiveNavBounds.maxYear) {
      nextTo = effectiveNavBounds.maxYear;
      nextFrom = Math.max(effectiveNavBounds.minYear, effectiveNavBounds.maxYear - currentSpan);
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
    setTracedChainFilter(null);
    setForceShowHiddenLinks(false);
    setDismissedHiddenLinks(false);
    setZoomHistory([]);
    if (activeCampaignPack) {
      setYearFrom(activeCampaignPack.yearFrom);
      setYearTo(activeCampaignPack.yearTo);
    } else {
      setYearFrom(undefined);
      setYearTo(undefined);
    }
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
      const hiddenBranches = option.branchIds.filter((id) => resolvedActiveBranches[id] === false);
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

  function handleOpenCampaign(campaignId: string) {
    const pack = findCampaignPackById(campaignPacks, campaignId);
    if (!pack) return;
    if (!activeCampaignId) {
      campaignReturnSnapshotRef.current = createCampaignReturnSnapshot({
        yearFrom: requestedYearFrom,
        yearTo: requestedYearTo,
        branchSelection,
        collapsedParents,
        selectedEra,
        selectedReign,
        searchQuery,
        selectedPersonKey,
        selectedSyncTag,
        selectedMacroRegion,
        branchPairFilter,
        onlyWithSyncLinks,
        syncLinkTypeFilter,
        auditUnlinkedMode,
      });
    }
    const defaults = getCampaignEntryFilterDefaults(pack);
    hasAppliedInitialCampaignWindowRef.current = true;
    handleCloseAllModals();
    setActiveCampaignId(pack.id);
    setCampaignEnabledBranchIds(null);
    setIncludeAtlasContext(false);
    setTracedChainFilter(null);
    setSelectedEra(defaults.selectedEra);
    setSelectedReign(defaults.selectedReign);
    setSearchQuery(defaults.searchQuery);
    setSelectedPersonKey(defaults.selectedPersonKey);
    setSelectedSyncTag(defaults.selectedSyncTag);
    setSelectedMacroRegion(defaults.selectedMacroRegion);
    setBranchPairFilter(defaults.branchPairFilter);
    setOnlyWithSyncLinks(defaults.onlyWithSyncLinks);
    setSyncLinkTypeFilter(defaults.syncLinkTypeFilter);
    setAuditUnlinkedMode(defaults.auditUnlinkedMode);
    setFocusedEventId(null);
    setZoomHistory([]);
    setYearFrom(defaults.yearFrom);
    setYearTo(defaults.yearTo);
    void loadCampaignPack(pack.id);
    void ensureAllModulesLoaded({ priority: false });
    showToast(`Режим кампании: «${pack.title}» (${pack.yearFrom}–${pack.yearTo}).`);
  }

  function handleExitCampaign() {
    const snap = campaignReturnSnapshotRef.current;
    campaignReturnSnapshotRef.current = null;
    setActiveCampaignId(null);
    setCampaignEnabledBranchIds(null);
    setIncludeAtlasContext(false);
    setTracedChainFilter(null);
    setFocusedEventId(null);
    setIsOverlapMapExpanded(false);
    setZoomHistory([]);
    if (snap) {
      setYearFrom(snap.yearFrom);
      setYearTo(snap.yearTo);
      setBranchSelection(snap.branchSelection);
      setCollapsedParents(snap.collapsedParents);
      setSelectedEra(snap.selectedEra);
      setSelectedReign(snap.selectedReign);
      setSearchQuery(snap.searchQuery);
      setSelectedPersonKey(snap.selectedPersonKey);
      setSelectedSyncTag(snap.selectedSyncTag);
      setSelectedMacroRegion(snap.selectedMacroRegion);
      setBranchPairFilter(snap.branchPairFilter);
      setOnlyWithSyncLinks(snap.onlyWithSyncLinks);
      setSyncLinkTypeFilter(snap.syncLinkTypeFilter);
      setAuditUnlinkedMode(snap.auditUnlinkedMode);
    } else {
      setYearFrom(undefined);
      setYearTo(undefined);
      setSelectedEra('ALL');
      setSelectedReign('ALL');
      setSearchQuery('');
      setSelectedPersonKey(null);
      setSelectedSyncTag(null);
      setSelectedMacroRegion('all');
      setBranchPairFilter(null);
      setOnlyWithSyncLinks(false);
      setSyncLinkTypeFilter('all');
      setAuditUnlinkedMode(false);
    }
    showToast('Возврат к общему атласу.');
  }

  function handleToggleAtlasContext() {
    setIncludeAtlasContext((prev) => {
      const next = !prev;
      if (next) {
        void ensureAllModulesLoaded({ priority: true });
        showToast('Контекст атласа включён: дипломатия, экономика, кризисы и обзор войн.');
      } else {
        showToast('Контекст атласа скрыт: на ленте только ветки кампании.');
      }
      return next;
    });
  }

  function handleOpenCampaignTracer() {
    if (!activeCampaignPack) return;
    const defaultRoot =
      (focusedEventId && enrichedEvents.some((e) => e.id === focusedEventId) ? focusedEventId : null) ||
      matchingEvents.find((e) => e.campaignPackId === activeCampaignPack.id)?.id ||
      enrichedEvents.find((e) => e.campaignPackId === activeCampaignPack.id)?.id ||
      activeCampaignPack.parentEventId;
    if (defaultRoot) {
      handleOpenCausalTracer(defaultRoot);
    }
  }

  function handleApplyTracedChain(result: CausalChainResult, mode: CausalChainMode) {
    setFocusedEventId(null);
    setTracedChainFilter({
      rootEventId: result.root.id,
      rootTitle: result.root.title,
      eventIds: new Set(result.allEventIds),
      distanceMap: new Map(result.distanceMap),
      mode,
    });
    setHighlightedJumpId(result.root.id);
    showToast(
      `На ленте выделена цепочка «${result.root.title}» (${result.stats.totalNodes} звеньев, ${result.stats.yearFrom}–${result.stats.yearTo} гг.).`,
    );
  }

  function handleClearTracedChain() {
    setTracedChainFilter(null);
    showToast('Изоляция цепочки снята.');
  }

  function handleToggleCampaignBranch(branchId: string) {
    if (!activeCampaignPack) return;
    const allIds = activeCampaignPack.branchIds;
    setCampaignEnabledBranchIds((prev) => {
      const current = prev && prev.length > 0 ? prev : allIds;
      const isEnabled = current.includes(branchId);
      if (isEnabled) {
        if (current.length <= 1) return current;
        return current.filter((id) => id !== branchId);
      }
      const next = [...current, branchId];
      return next.length >= allIds.length ? null : next;
    });
  }

  function handleEnableAllCampaignBranches() {
    setCampaignEnabledBranchIds(null);
  }

  function handleResetAll() {
    campaignReturnSnapshotRef.current = null;
    setActiveCampaignId(null);
    setCampaignEnabledBranchIds(null);
    setIncludeAtlasContext(false);
    setTracedChainFilter(null);
    setIsOverlapMapExpanded(false);
    handleResetFiltersOnly();
    const nextCollapsed: Record<string, boolean> = {};
    branches.forEach((b) => {
      if (b.defaultCollapsedOnTimeline) {
        nextCollapsed[b.id] = true;
      }
    });
    setBranchSelection({ preset: 'overview', overrides: {} });
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

    if (target.campaignPackId && activeCampaignId !== target.campaignPackId) {
      handleOpenCampaign(target.campaignPackId);
      setHighlightedJumpId(target.id);
      return;
    }

    if (activeCampaignPack && !target.campaignPackId && !includeAtlasContext) {
      setIncludeAtlasContext(true);
      adjustments.push('включён контекст атласа');
    } else if (!isEventBranchActive(target, effectiveActiveBranches)) {
      if (activeCampaignPack && target.campaignPackId === activeCampaignPack.id) {
        setCampaignEnabledBranchIds((prev) => {
          if (!prev) return null;
          if (prev.includes(target.task)) return prev;
          const next = [...prev, target.task];
          return next.length >= activeCampaignPack.branchIds.length ? null : next;
        });
      } else {
        setActiveBranches((prev) => ({
          ...prev,
          [target.task]: true,
        }));
      }
      const branch = branches.find((b) => b.id === target.task);
      if (branch?.parentBranchId) {
        setCollapsedParents((prev) => {
          const updated = { ...mergeMissingCollapsedParents(prev, branches) };
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

    if (tracedChainFilter && !tracedChainFilter.eventIds.has(target.id)) {
      setTracedChainFilter(null);
      adjustments.push('снята изоляция цепочки');
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
    if (searchQuery.trim() !== '') setSearchQuery('');
    if (!matchingEvents.some((event) => event.id === target.id)) {
      setBranchPairFilter(null);
      setSelectedPersonKey(null);
      setSelectedSyncTag(null);
      setAuditUnlinkedMode(false);
      setOnlyWithSyncLinks(false);
      if (!doesEventMatchMacroRegion(target, selectedMacroRegion)) setSelectedMacroRegion('all');
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
  }

  function handleJumpToRuler(rulerId: string) {
    const target = rulers.find((r) => r.id === rulerId);
    if (!target) return;

    const adjustments: string[] = [];

    if (resolvedActiveBranches.MAIN_RULERS === false) {
      setActiveBranches((prev) => ({
        ...prev,
        MAIN_RULERS: true,
      }));
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
        const currentlyActive = isBranchOrDescendantActive(target, branches, resolvedActiveBranches);
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

      setActiveBranches((prev) => {
        const base = prev;
        return {
          ...base,
          [branchId]: base[branchId] === false,
        };
      });
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
      setActiveBranches((prev) => ({
        ...prev,
        ...Object.fromEntries(branchIds.map((id) => [id, enable])),
      }));
    });
  }

  function handleApplyBranchPreset(presetId: BranchPresetId) {
    if (presetId !== 'overview' && presetId !== 'none' && !isFullyHydrated) {
      void ensureAllModulesLoaded({ priority: true });
    }
    preserveViewportScrollAnchor(() => {
      if (presetId === 'none') {
        setFocusedEventId(null);
        setBranchPairFilter(null);
      }
      if (presetId === 'all') {
        setCollapsedParents(collapseAllParentBranches(branches));
      }
      setBranchSelection({ preset: presetId, overrides: {} });
    });
  }

  function handleIsolateBranch(branchId: string) {
    preserveViewportScrollAnchor(() => {
      const target = branches.find((b) => b.id === branchId);
      const descendants = getDescendantBranchIds(branchId, branches);
      const keepSet = new Set<string>([branchId, ...descendants]);

      setBranchSelection({
        preset: 'none',
        overrides: Object.fromEntries([...keepSet].map((id) => [id, true])),
      });

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
      setCollapsedParents((prev) => {
        const base = mergeMissingCollapsedParents(prev, branches);
        return {
          ...base,
          [parentId]: !base[parentId],
        };
      });
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
      setIsOverlapMapExpanded(false);
    });
  }

  function handleToggleOverlapMap() {
    preserveViewportScrollAnchor(() => {
      setIsOverlapMapExpanded((prev) => !prev);
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
    (!activeCampaignPack && selectedSyncTag ? 1 : 0) +
    (!activeCampaignPack && selectedMacroRegion !== 'all' ? 1 : 0) +
    (!activeCampaignPack && branchPairFilter ? 1 : 0) +
    (isAuditDebugEnabled && auditUnlinkedMode ? 1 : 0);

  const isWindowNarrowedOrFiltered =
    effectiveYearFrom !== effectiveNavBounds.minYear ||
    effectiveYearTo !== effectiveNavBounds.maxYear ||
    (!activeCampaignPack && (selectedEra !== 'ALL' || selectedReign !== 'ALL')) ||
    searchQuery.trim() !== '' ||
    selectedPersonKey !== null ||
    activeAdvancedCount > 0 ||
    !isFiltersCollapsed;

  const shouldShowHiddenLinksNotice =
    forceShowHiddenLinks || (!dismissedHiddenLinks && isWindowNarrowedOrFiltered);

  // Стабильные обёртки обработчиков для React.memo дочерних панелей и ленты (исключают лишний рендер ленты при открытии/закрытии модалок)
  const actionsRef = useRef({
    handleToggleBranch,
    handleToggleBranchCategory,
    handleApplyBranchPreset,
    handleIsolateBranch,
    handleToggleCollapseParent,
    handleSelectEra,
    handleJumpToRuler,
    handleSelectReign,
    handleYearRangeChange,
    handleStepBackZoom,
    handleZoomByFactor,
    handleShiftWindow,
    handleToggleFilters,
    handleToggleOverlapMap,
    handleQuickStartHotNode,
    handleToggleOnlySynced,
    handleChangeSyncLinkTypeFilter,
    handleSelectSyncTag,
    handleChangeBranchPair,
    handleResetFiltersOnly,
    handleApplySpanPreset,
    handleRecordZoomCheckpoint,
    handleToggleFocusEvent,
    handleRevealBranches,
    handleJumpToEvent,
    handleOpenCampaign,
    handleExitCampaign,
    activeCampaignPack,
    effectiveYearFrom,
    effectiveYearTo,
  });
  actionsRef.current = {
    handleToggleBranch,
    handleToggleBranchCategory,
    handleApplyBranchPreset,
    handleIsolateBranch,
    handleToggleCollapseParent,
    handleSelectEra,
    handleJumpToRuler,
    handleSelectReign,
    handleYearRangeChange,
    handleStepBackZoom,
    handleZoomByFactor,
    handleShiftWindow,
    handleToggleFilters,
    handleToggleOverlapMap,
    handleQuickStartHotNode,
    handleToggleOnlySynced,
    handleChangeSyncLinkTypeFilter,
    handleSelectSyncTag,
    handleChangeBranchPair,
    handleResetFiltersOnly,
    handleApplySpanPreset,
    handleRecordZoomCheckpoint,
    handleToggleFocusEvent,
    handleRevealBranches,
    handleJumpToEvent,
    handleOpenCampaign,
    handleExitCampaign,
    activeCampaignPack,
    effectiveYearFrom,
    effectiveYearTo,
  };

  const stableToggleBranch = useCallback((id: string) => actionsRef.current.handleToggleBranch(id), []);
  const stableToggleBranchCategory = useCallback(
    (ids: string[], enable: boolean) => actionsRef.current.handleToggleBranchCategory(ids, enable),
    [],
  );
  const stableApplyBranchPreset = useCallback(
    (presetId: BranchPresetId) => actionsRef.current.handleApplyBranchPreset(presetId),
    [],
  );
  const stableIsolateBranch = useCallback((id: string) => actionsRef.current.handleIsolateBranch(id), []);
  const stableToggleCollapseParent = useCallback(
    (id: string) => actionsRef.current.handleToggleCollapseParent(id),
    [],
  );
  const stableSelectEra = useCallback((id: string) => actionsRef.current.handleSelectEra(id), []);
  const stableJumpToRuler = useCallback((id: string) => actionsRef.current.handleJumpToRuler(id), []);
  const stableSelectReign = useCallback((id: string) => actionsRef.current.handleSelectReign(id), []);
  const stableSelectMacroRegionTop = useCallback((region: MacroRegionId) => {
    preserveViewportScrollAnchor(() => setSelectedMacroRegion(region));
  }, []);
  const stableSelectMacroRegionTimeline = useCallback(
    (region: MacroRegionId) => {
      preserveViewportScrollAnchor(() => setSelectedMacroRegion(region));
      if (region === 'all') {
        showToast('Фильтр по макрорегиону сброшен (показаны все регионы)');
      } else {
        showToast(`Фильтр по макрорегиону: «${getMacroRegionOption(region).label}»`);
      }
    },
    [showToast],
  );
  const stableYearRangeChange = useCallback(
    (fromVal: number, toVal: number, recordHistory = true) =>
      actionsRef.current.handleYearRangeChange(fromVal, toVal, recordHistory),
    [],
  );
  const stableSelectYearRangeResettingEra = useCallback(
    (fromVal: number, toVal: number, recordHistory = true) => {
      setSelectedEra('ALL');
      setSelectedReign('ALL');
      actionsRef.current.handleYearRangeChange(fromVal, toVal, recordHistory);
    },
    [],
  );
  const stableStepBackZoom = useCallback(() => actionsRef.current.handleStepBackZoom(), []);
  const stableZoomIn = useCallback(() => actionsRef.current.handleZoomByFactor(0.5), []);
  const stableZoomOut = useCallback(() => actionsRef.current.handleZoomByFactor(2), []);
  const stableShiftWindow = useCallback((dir: -1 | 1) => actionsRef.current.handleShiftWindow(dir), []);
  const stableChangeCardDensity = useCallback((density: CardDensity) => {
    preserveViewportScrollAnchor(() => setCardDensity(density));
  }, []);
  const stableChangeTimeScaleMode = useCallback((mode: TimeScaleMode) => {
    preserveViewportScrollAnchor(() => setTimeScaleMode(mode));
  }, []);
  const stableToggleShowEndNodes = useCallback(() => {
    preserveViewportScrollAnchor(() => setShowEndNodes((prev) => !prev));
  }, []);
  const stableResetTimeFilter = useCallback(() => {
    const activePack = actionsRef.current.activeCampaignPack;
    if (activePack) {
      setSelectedEra('ALL');
      setSelectedReign('ALL');
      actionsRef.current.handleYearRangeChange(activePack.yearFrom, activePack.yearTo);
      return;
    }
    actionsRef.current.handleSelectEra('ALL');
  }, []);
  const stableToggleFilters = useCallback(() => actionsRef.current.handleToggleFilters(), []);
  const stableToggleOverlapMap = useCallback(() => actionsRef.current.handleToggleOverlapMap(), []);
  const stableRevealHiddenLinks = useCallback(() => {
    setDismissedHiddenLinks(false);
    setForceShowHiddenLinks(true);
    window.setTimeout(() => {
      const el = document.getElementById('hidden-links-notice');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 40);
  }, []);
  const stableChangeYearFrom = useCallback((y: number) => {
    setSelectedEra('ALL');
    actionsRef.current.handleYearRangeChange(y, actionsRef.current.effectiveYearTo);
  }, []);
  const stableChangeYearTo = useCallback((y: number) => {
    setSelectedEra('ALL');
    actionsRef.current.handleYearRangeChange(actionsRef.current.effectiveYearFrom, y);
  }, []);
  const stableQuickStartHotNode = useCallback(
    (preset: EpochSlicePreset) => actionsRef.current.handleQuickStartHotNode(preset),
    [],
  );
  const stableToggleOnlySynced = useCallback(() => actionsRef.current.handleToggleOnlySynced(), []);
  const stableChangeSyncLinkTypeFilter = useCallback(
    (nextType: SyncLinkTypeFilter) => actionsRef.current.handleChangeSyncLinkTypeFilter(nextType),
    [],
  );
  const stableSelectSyncTag = useCallback(
    (tag: string | null) => actionsRef.current.handleSelectSyncTag(tag),
    [],
  );
  const stableChangeBranchPair = useCallback(
    (pair: BranchPairFilter | null) => actionsRef.current.handleChangeBranchPair(pair),
    [],
  );
  const stableToggleAuditUnlinkedMode = useCallback(() => {
    setAuditUnlinkedMode((prev) => !prev);
  }, []);
  const stableClearPersonFilter = useCallback(() => setSelectedPersonKey(null), []);
  const stableResetFiltersOnly = useCallback(() => actionsRef.current.handleResetFiltersOnly(), []);
  const stableApplySpanPreset = useCallback(
    (preset: 'all' | 100 | 10 | 2) => actionsRef.current.handleApplySpanPreset(preset),
    [],
  );
  const stableRecordZoomCheckpoint = useCallback(
    () => actionsRef.current.handleRecordZoomCheckpoint(),
    [],
  );
  const stableToggleFocusKeepWindow = useCallback(() => {
    setFocusKeepWindow((prev) => !prev);
  }, []);
  const stableToggleFocusEvent = useCallback(
    (id: string) => actionsRef.current.handleToggleFocusEvent(id),
    [],
  );
  const stableExitFocusMode = useCallback(() => setFocusedEventId(null), []);
  const stableRevealBranches = useCallback(
    (ids: string[]) => actionsRef.current.handleRevealBranches(ids),
    [],
  );
  const stableJumpToEvent = useCallback((id: string) => actionsRef.current.handleJumpToEvent(id), []);
  const stableOpenCampaign = useCallback((id: string) => actionsRef.current.handleOpenCampaign(id), []);
  const stableExitCampaign = useCallback(() => actionsRef.current.handleExitCampaign(), []);

  const memoizedWindowRange = useMemo(
    () => ({ from: yearFrom, to: yearTo }),
    [yearFrom, yearTo],
  );
  const lastZoomStep = zoomHistory[zoomHistory.length - 1] ?? null;

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
          <p role="alert" className="text-sm text-slate-300">{loadError || 'Каталог исторических данных временно недоступен.'}</p>
          <button
            type="button"
            disabled={isRetrying}
            onClick={() => void reloadRepository()}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-60"
          >
            {isRetrying ? 'Загрузка…' : 'Повторить загрузку'}
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
        activeBranches={resolvedActiveBranches}
        collapsedParents={resolvedCollapsedParents}
        expectedTotalBranches={expectedTotalBranches}
        isHydratingBranches={isHydrating}
        onRequestAllBranches={handleRequestAllBranches}
        onToggleBranch={stableToggleBranch}
        onToggleCategory={stableToggleBranchCategory}
        onApplyPreset={stableApplyBranchPreset}
        onIsolateBranch={stableIsolateBranch}
        onToggleCollapseParent={stableToggleCollapseParent}
        eras={manifest.macroEras}
        enrichedEventsForEras={coreEnrichedEvents}
        selectedEraId={selectedEra}
        onSelectEra={stableSelectEra}
        onOpenEraModal={handleOpenEraModal}
        rulers={rulers}
        matchingEvents={matchingEvents}
        selectedRulerId={selectedReign === 'ALL' ? '' : selectedReign}
        onJumpToRuler={stableJumpToRuler}
        onFilterByRuler={stableSelectReign}
        onOpenRulerModal={handleOpenPeriodModal}
        selectedMacroRegion={selectedMacroRegion}
        macroRegionCounts={macroRegionCounts}
        onSelectMacroRegion={stableSelectMacroRegionTop}
        yearFrom={effectiveYearFrom}
        yearTo={effectiveYearTo}
        minYear={effectiveNavBounds.minYear}
        maxYear={effectiveNavBounds.maxYear}
        onYearRangeChange={stableSelectYearRangeResettingEra}
        zoomHistoryCount={zoomHistory.length}
        lastZoomStep={lastZoomStep}
        onStepBackZoom={stableStepBackZoom}
        onZoomIn={stableZoomIn}
        onZoomOut={stableZoomOut}
        onShiftWindow={stableShiftWindow}
        cardDensity={cardDensity}
        onChangeCardDensity={stableChangeCardDensity}
        timeScaleMode={timeScaleMode}
        onChangeTimeScaleMode={stableChangeTimeScaleMode}
        showEndNodes={showEndNodes}
        onToggleShowEndNodes={stableToggleShowEndNodes}
        onOpenWindowModal={handleOpenWindowModal}
        onResetTimeFilter={stableResetTimeFilter}
        isFiltersCollapsed={isFiltersCollapsed}
        activeAdvancedCount={activeAdvancedCount}
        onToggleFilters={stableToggleFilters}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        isCampaignMode={Boolean(activeCampaignPack)}
      />

      {partialLoadWarning && (
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm text-amber-200 sm:px-6 lg:px-8">
          <p role="status">{partialLoadWarning}</p>
          <button
            type="button"
            disabled={isRetrying}
            onClick={() => void reloadRepository()}
            className="font-semibold underline underline-offset-2 hover:text-amber-100 disabled:opacity-60"
          >
            {isRetrying ? 'Загрузка…' : 'Повторить загрузку'}
          </button>
        </div>
      )}

      <DashboardHeader
        visibleLanesCount={visibleLanes.length}
        matchingRulersCount={matchingRulers.length}
        streamCount={stream.length}
        visibleLinksCount={windowLinksVisibility.visibleLinksCount}
        hiddenLinksCount={windowLinksVisibility.hiddenLinksCount}
        onRevealHiddenLinks={stableRevealHiddenLinks}
        minYear={timelineBounds.minYear}
        maxYear={timelineBounds.maxYear}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3.5 space-y-3.5">
        {activeCampaignPack && (
          <CampaignModeBar
            pack={activeCampaignPack}
            campaignBranches={activeCampaignBranches}
            activeBranches={effectiveActiveBranches}
            isLoading={loadingCampaignId === activeCampaignPack.id}
            includeAtlasContext={includeAtlasContext}
            tracedChainFilter={tracedChainFilter}
            onToggleCampaignBranch={handleToggleCampaignBranch}
            onEnableAllCampaignBranches={handleEnableAllCampaignBranches}
            onToggleAtlasContext={handleToggleAtlasContext}
            onOpenAnchorCard={handleOpenCardModal}
            onOpenCausalTracer={handleOpenCampaignTracer}
            onReopenTracedChain={
              tracedChainFilter
                ? () => handleOpenCausalTracer(tracedChainFilter.rootEventId)
                : undefined
            }
            onClearTracedChain={handleClearTracedChain}
            onExitCampaign={stableExitCampaign}
          />
        )}

        {!activeCampaignPack && tracedChainFilter && (
          <section
            aria-label="Активный фильтр цепочки связей"
            className="rounded-2xl border border-emerald-500/40 bg-[#0b1325]/95 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono shadow-lg"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
              <span className="text-emerald-300 font-semibold uppercase tracking-wider">
                Изолирована цепочка:
              </span>
              <span className="text-white font-semibold truncate">
                {tracedChainFilter.rootTitle}
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="text-slate-300 tabular-nums">
                звеньев: {tracedChainFilter.eventIds.size}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenCausalTracer(tracedChainFilter.rootEventId)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                Открыть схему
              </button>
              <button
                type="button"
                onClick={handleClearTracedChain}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                Сбросить цепочку
              </button>
            </div>
          </section>
        )}

        <FilterPanel
          yearFrom={effectiveYearFrom}
          yearTo={effectiveYearTo}
          minYear={effectiveNavBounds.minYear}
          maxYear={effectiveNavBounds.maxYear}
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
          isCampaignMode={Boolean(activeCampaignPack)}
          activeCampaignTitle={activeCampaignPack?.title ?? null}
          campaignPacksCount={campaignPacks.length}
          onOpenCampaignCatalogModal={handleOpenCampaignCatalogModal}
          isOverlapMapExpanded={isOverlapMapExpanded}
          overlapLanesCount={overlapLanesCount}
          onToggleOverlapMap={stableToggleOverlapMap}
          isAdvancedExpanded={!isFiltersCollapsed}
          onToggleAdvanced={stableToggleFilters}
          onChangeYearFrom={stableChangeYearFrom}
          onChangeYearTo={stableChangeYearTo}
          onSelectYearRange={stableSelectYearRangeResettingEra}
          onQuickStartHotNode={stableQuickStartHotNode}
          onChangeSearch={setSearchQuery}
          onToggleOnlySynced={stableToggleOnlySynced}
          onChangeSyncLinkTypeFilter={stableChangeSyncLinkTypeFilter}
          onSelectSyncTag={stableSelectSyncTag}
          onSelectMacroRegion={setSelectedMacroRegion}
          onChangeBranchPair={stableChangeBranchPair}
          onToggleAuditUnlinkedMode={stableToggleAuditUnlinkedMode}
          onOpenCompareModal={handleOpenCompareFromHeader}
          onOpenWindowModal={handleOpenWindowModal}
          onOpenPersonModal={handleOpenPersonModal}
          onClearPersonFilter={stableClearPersonFilter}
          onResetFilters={stableResetFiltersOnly}
        />

        {showOverlapMatrix && (
          <Suspense
            fallback={
              <div className="rounded-2xl border border-slate-800/80 bg-[#0b1325]/60 px-4 py-6 text-center text-xs font-mono text-slate-400">
                Загрузка синхронной карты полос…
              </div>
            }
          >
            <OverlapMapSection
              matchingEvents={matchingEvents}
              rulers={rulers}
              branches={branches}
              activeBranches={effectiveActiveBranches}
              yearFrom={effectiveYearFrom}
              yearTo={effectiveYearTo}
              minYear={effectiveNavBounds.minYear}
              maxYear={effectiveNavBounds.maxYear}
              hoveredEventId={hoveredEventId}
              onHoverEvent={setHoveredEventId}
              onOpenCardModal={handleOpenCardModal}
              onOpenPeriodModal={handleOpenPeriodModal}
              onOpenWindowModal={handleOpenWindowModal}
              onSelectYearRange={stableSelectYearRangeResettingEra}
              zoomHistoryCount={zoomHistory.length}
              lastZoomStep={lastZoomStep}
              isExpanded={isOverlapMapExpanded}
              onStepBackZoom={stableStepBackZoom}
              onZoomIn={stableZoomIn}
              onZoomOut={stableZoomOut}
              onShiftWindow={stableShiftWindow}
              onApplySpanPreset={stableApplySpanPreset}
              onRecordZoomCheckpoint={stableRecordZoomCheckpoint}
            />
          </Suspense>
        )}

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
        {isHydrating && searchQuery.trim() && (
          <p role="status" className="text-sm text-slate-300">
            Поиск по загруженным веткам. Результаты обновятся после догрузки данных.
          </p>
        )}
        {stream.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center my-8">
            <h3 className="font-serif text-xl font-bold text-white">
              {searchQuery.trim() && !isFullyHydrated
                ? 'В загруженных ветках ничего не найдено'
                : 'На выбранном отрезке времени активных событий не найдено'}
            </h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Расширьте диапазон лет, включите дополнительные ветви или сбросьте фильтры.
            </p>
            <button
              type="button"
              onClick={activeCampaignPack ? handleResetFiltersOnly : handleResetAll}
              className="mt-5 px-4 py-2 bg-amber-500 text-slate-950 font-semibold text-xs rounded-lg hover:bg-amber-400 transition-colors cursor-pointer"
            >
              {activeCampaignPack
                ? `Сбросить фильтры кампании (${effectiveNavBounds.minYear}–${effectiveNavBounds.maxYear})`
                : `Восстановить обзор (${timelineBounds.minYear}–${timelineBounds.maxYear})`}
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
            collapsedParents={resolvedCollapsedParents}
            manifest={manifest}
            yearFrom={effectiveYearFrom}
            yearTo={effectiveYearTo}
            minYear={timelineBounds.minYear}
            axisResolution={axisResolution}
            hoveredEventId={hoveredEventId}
            cardDensity={cardDensity}
            timeScaleMode={timeScaleMode}
            selectedMacroRegion={selectedMacroRegion}
            onSelectMacroRegion={stableSelectMacroRegionTimeline}
            focusedEvent={focusedEvent}
            focusScope={focusScope}
            focusDepth={focusDepth}
            focusKeepWindow={focusKeepWindow}
            outOfWindowFocusCount={outOfWindowFocusCount}
            focusDistanceMap={focusDistanceMap}
            windowRange={memoizedWindowRange}
            auditUnlinkedMode={isAuditDebugEnabled && auditUnlinkedMode}
            auditCandidateMap={auditCandidateMap}
            onChangeFocusScope={setFocusScope}
            onChangeFocusDepth={setFocusDepth}
            onToggleFocusKeepWindow={stableToggleFocusKeepWindow}
            onToggleFocusEvent={stableToggleFocusEvent}
            onToggleCollapseParent={stableToggleCollapseParent}
            onExitFocusMode={stableExitFocusMode}
            onRevealBranches={stableRevealBranches}
            highlightedJumpId={highlightedJumpId}
            onJumpToEvent={stableJumpToEvent}
            onHoverEvent={setHoveredEventId}
            onOpenCardModal={handleOpenCardModal}
            onOpenPeriodModal={handleOpenPeriodModal}
            onOpenEraModal={handleOpenEraModal}
            onOpenWindowModal={handleOpenWindowModal}
            onOpenPersonModal={handleOpenPersonModal}
            onSelectYearRange={stableYearRangeChange}
            campaignPacks={campaignPacks}
            activeCampaignId={activeCampaignId}
            onOpenCampaign={stableOpenCampaign}
            onOpenCausalTracer={handleOpenCausalTracer}
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
              activeBranches={resolvedActiveBranches}
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
                setYearFrom(effectiveNavBounds.minYear);
                setYearTo(effectiveNavBounds.maxYear);
                if (!activeCampaignPack) {
                  handleApplyBranchPreset('all');
                }
                setSearchQuery(cleanName);
                setIsFiltersCollapsed(false);
                showToast(
                  activeCampaignPack
                    ? `Поиск по участнику в кампании: «${cleanName}»`
                    : `Поиск по исторической личности: «${cleanName}» (включены все ветки)`,
                );
              }}
              onOpenRulerModal={handleOpenPeriodModal}
              onOpenEraModal={handleOpenEraModal}
              linkedCampaignPack={findCampaignPackForEvent(campaignPacks, activeCardObj.id)}
              onOpenCampaign={stableOpenCampaign}
              onOpenCausalTracer={handleOpenCausalTracer}
            />
          )}

          {activeModal.type === 'CAMPAIGNS' && (
            <CampaignCatalogModal
              campaignPacks={campaignPacks}
              activeCampaignId={activeCampaignId}
              loadedCampaignIds={loadedCampaignIds}
              loadingCampaignId={loadingCampaignId}
              modalHistory={modalHistory}
              onClose={handleCloseAllModals}
              onNavigateBack={handleModalNavigateBack}
              onOpenCampaign={stableOpenCampaign}
              onExitCampaign={stableExitCampaign}
            />
          )}

          {activeTracerEvent && (
            <CampaignCausalTracerModal
              rootEventId={activeTracerEvent.id}
              enrichedEvents={enrichedEvents}
              branches={branches}
              activeCampaignId={activeCampaignId}
              activeCampaignTitle={activeCampaignPack?.title ?? null}
              modalHistory={modalHistory}
              onClose={handleCloseAllModals}
              onNavigateBack={handleModalNavigateBack}
              onOpenCard={handleOpenCardModal}
              onJumpToTimelineRow={handleJumpToEvent}
              onApplyTracedChain={handleApplyTracedChain}
            />
          )}

          {activeRulerObj && (
            <PeriodSummaryModal
              ruler={activeRulerObj}
              rulers={rulers}
              enrichedEvents={coreEnrichedEvents}
              branches={branches}
              personDossiers={personDossiers}
              modalHistory={modalHistory}
              onClose={handleCloseAllModals}
              onNavigateBack={handleModalNavigateBack}
              onSelectCard={handleOpenCardModal}
              onOpenRulerModal={handleOpenPeriodModal}
              onOpenPersonModal={handleOpenPersonModal}
              onFilterByRuler={handleSelectReign}
              onCompareWithRuler={handleCompareWithRuler}
            />
          )}

          {activePersonObj && (
            <PersonDossierModal
              dossier={activePersonObj}
              branches={branches}
              activeBranches={resolvedActiveBranches}
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
              personDossiers={personDossiers}
              modalHistory={modalHistory}
              onClose={handleCloseAllModals}
              onNavigateBack={handleModalNavigateBack}
              onSelectEra={handleOpenEraModal}
              onSelectRuler={handleOpenPeriodModal}
              onSelectEvent={handleOpenCardModal}
              onOpenPersonModal={handleOpenPersonModal}
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
              activeBranches={effectiveActiveBranches}
              activeCampaignId={activeCampaignId}
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
              onFocusSubWindow={(fromVal, toVal) => {
                setSelectedEra('ALL');
                setSelectedReign('ALL');
                handleYearRangeChange(fromVal, toVal);
              }}
            />
          )}

          {activeComparePair && (
            <ComparePeriodsModal
              comparePair={activeComparePair}
              rulers={rulers}
              eras={manifest.macroEras}
              enrichedEvents={coreEnrichedEvents}
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

          {isCommandPaletteOpen && commandSearchIndex && (
            <CommandPaletteModal
              index={commandSearchIndex}
              onClose={() => setIsCommandPaletteOpen(false)}
              onSelectItem={handleSelectCommandItem}
            />
          )}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
