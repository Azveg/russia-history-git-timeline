import { useDossierTabs } from '../hooks/useDossierTabs';
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Crown,
  Feather,
  Flame,
  FlaskConical,
  GitCompareArrows,
  Globe,
  Handshake,
  Landmark,
  Layers,
  Link2,
  MapPin,
  ScrollText,
  Search,
  Shield,
  Swords,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { DossierModalHeader } from './DossierModalHeader';
import { EraAnalyticalProfileSection } from './EraAnalyticalProfileSection';
import { downloadMarkdownFile, formatEraDossierToMarkdown } from '../utils/markdownExport';
import {
  ERA_SPHERE_META,
  ERA_SPHERE_ORDER,
  classifyEventToEraSphere,
  countCampaignEventsInRange,
  filterEventsForAnalyticsScope,
  formatEventTitleWithPeriod,
  getMacroEraSummaryData,
  resolveMacroEra,
  resolveMacroEras,
} from '../engine/timelineEngine';
import type {
  BranchDefinition,
  EnrichedEvent,
  EraEventSphereId,
  EraFigureEntry,
  EraFigureGroupId,
  MacroEra,
  ModalHistoryItem,
  PersonDossier,
  RulerPeriod,
} from '../types/timeline';

interface EraSummaryModalProps {
  era: MacroEra | null;
  eras: MacroEra[];
  rulers: RulerPeriod[];
  enrichedEvents: EnrichedEvent[];
  branches: BranchDefinition[];
  personDossiers?: Map<string, PersonDossier>;
  modalHistory?: ModalHistoryItem[];
  onClose: () => void;
  onNavigateBack?: () => void;
  onSelectEra: (eraId: string) => void;
  onSelectRuler: (rulerId: string) => void;
  onSelectEvent: (eventId: string) => void;
  onOpenPersonModal?: (personKey: string) => void;
  onFilterByEraRange: (startYear: number, endYear: number) => void;
  onCompareWithEra?: (eraId: string) => void;
}

type EraModalTabId = 'overview' | 'people' | 'events' | 'culture';
type EraPeopleGroupFilter = 'all' | EraFigureGroupId;
type EraEventsSphereFilter = 'all' | EraEventSphereId;
type EraEventBoundaryFilter = 'all' | 'inside' | 'carryIn' | 'carryOut';
type EraEventsSortMode = 'impact' | 'chronological';
type CultureSectionKey = 'discoveries' | 'literature' | 'culture' | 'retrospective';

const FIGURE_GROUP_ORDER: EraFigureGroupId[] = [
  'rulers',
  'politics_military',
  'writers',
  'scientists',
];

const FIGURE_GROUP_META: Record<
  EraFigureGroupId,
  {
    label: string;
    shortLabel: string;
    accentText: string;
    activeButton: string;
  }
> = {
  rulers: {
    label: 'Правители эпохи',
    shortLabel: 'Правители',
    accentText: 'text-amber-300',
    activeButton: 'bg-amber-500 text-slate-950 font-bold',
  },
  politics_military: {
    label: 'Политика, реформы и армия',
    shortLabel: 'Политика и армия',
    accentText: 'text-sky-300',
    activeButton: 'bg-sky-400 text-slate-950 font-bold',
  },
  writers: {
    label: 'Писатели, летописцы и мыслители',
    shortLabel: 'Писатели',
    accentText: 'text-orange-300',
    activeButton: 'bg-orange-400 text-slate-950 font-bold',
  },
  scientists: {
    label: 'Учёные, врачи и зодчие',
    shortLabel: 'Учёные',
    accentText: 'text-emerald-300',
    activeButton: 'bg-emerald-400 text-slate-950 font-bold',
  },
};

const SPHERE_STYLE_META: Record<
  EraEventSphereId,
  {
    accentText: string;
    barClass: string;
    activeButton: string;
    tileHover: string;
  }
> = {
  wars: {
    accentText: 'text-rose-300',
    barClass: 'bg-rose-400/80',
    activeButton: 'bg-rose-400 text-slate-950 font-bold',
    tileHover: 'hover:border-rose-400/50',
  },
  reforms: {
    accentText: 'text-amber-300',
    barClass: 'bg-amber-400/80',
    activeButton: 'bg-amber-500 text-slate-950 font-bold',
    tileHover: 'hover:border-amber-400/50',
  },
  diplomacy: {
    accentText: 'text-sky-300',
    barClass: 'bg-sky-400/80',
    activeButton: 'bg-sky-400 text-slate-950 font-bold',
    tileHover: 'hover:border-sky-400/50',
  },
  world: {
    accentText: 'text-indigo-300',
    barClass: 'bg-indigo-400/80',
    activeButton: 'bg-indigo-400 text-slate-950 font-bold',
    tileHover: 'hover:border-indigo-400/50',
  },
  science: {
    accentText: 'text-emerald-300',
    barClass: 'bg-emerald-400/80',
    activeButton: 'bg-emerald-400 text-slate-950 font-bold',
    tileHover: 'hover:border-emerald-400/50',
  },
};

function renderSphereIcon(sphereId: EraEventSphereId, className = 'w-3.5 h-3.5 shrink-0') {
  switch (sphereId) {
    case 'wars':
      return <Swords className={className} />;
    case 'reforms':
      return <Landmark className={className} />;
    case 'diplomacy':
      return <Handshake className={className} />;
    case 'world':
      return <Globe className={className} />;
    case 'science':
      return <FlaskConical className={className} />;
  }
}

function renderFigureGroupIcon(groupId: EraFigureGroupId, className = 'w-3.5 h-3.5 shrink-0') {
  switch (groupId) {
    case 'rulers':
      return <Crown className={className} />;
    case 'politics_military':
      return <Shield className={className} />;
    case 'writers':
      return <Feather className={className} />;
    case 'scientists':
      return <FlaskConical className={className} />;
  }
}

function getShareWidthClass(sharePct: number): string {
  if (sharePct <= 0) return 'w-0';
  if (sharePct < 8) return 'w-[6%]';
  if (sharePct < 15) return 'w-1/12';
  if (sharePct < 22) return 'w-1/6';
  if (sharePct < 30) return 'w-1/4';
  if (sharePct < 38) return 'w-1/3';
  if (sharePct < 46) return 'w-5/12';
  if (sharePct < 55) return 'w-1/2';
  if (sharePct < 63) return 'w-7/12';
  if (sharePct < 72) return 'w-2/3';
  if (sharePct < 80) return 'w-3/4';
  if (sharePct < 90) return 'w-5/6';
  if (sharePct < 96) return 'w-11/12';
  return 'w-full';
}

interface CollapsibleSectionProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  accentTextClass: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  count,
  icon,
  accentTextClass,
  isOpen,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="rounded-xl bg-slate-900/55 border border-slate-800/90 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-800/45 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/70"
      >
        <span
          className={`text-xs font-mono uppercase tracking-wider font-semibold inline-flex items-center gap-2 min-w-0 ${accentTextClass}`}
        >
          <span className="shrink-0">{icon}</span>
          <span className="truncate">{title}</span>
          <span className="text-slate-400 tabular-nums shrink-0">({count})</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-400 whitespace-nowrap shrink-0">
          <span>{isOpen ? 'Свернуть' : 'Раскрыть'}</span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      </button>
      {isOpen && <div className="px-4 pb-4 pt-1 border-t border-slate-800/70">{children}</div>}
    </div>
  );
}

export function EraSummaryModal({
  era,
  eras,
  rulers,
  enrichedEvents,
  branches,
  personDossiers,
  modalHistory = [],
  onClose,
  onNavigateBack,
  onSelectEra,
  onSelectRuler,
  onSelectEvent,
  onOpenPersonModal,
  onFilterByEraRange,
  onCompareWithEra,
}: EraSummaryModalProps) {
  const [activeTab, setActiveTab] = useState<EraModalTabId>('overview');
  const { handleTabKeyDown, tabProps, panelProps } = useDossierTabs(activeTab);
  const [includeCampaignDetails, setIncludeCampaignDetails] = useState(false);

  // Tab 1: Обзор — раскрытие переходящих событий при длинных списках
  const [expandCarryIn, setExpandCarryIn] = useState(false);
  const [expandCarryOut, setExpandCarryOut] = useState(false);

  // Tab 2: Лица
  const [peopleGroup, setPeopleGroup] = useState<EraPeopleGroupFilter>('all');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [visiblePeopleCount, setVisiblePeopleCount] = useState(12);

  // Tab 3: События
  const [activeSphere, setActiveSphere] = useState<EraEventsSphereFilter>('all');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [boundaryFilter, setBoundaryFilter] = useState<EraEventBoundaryFilter>('all');
  const [eventsSortMode, setEventsSortMode] = useState<EraEventsSortMode>('impact');
  const [eventsSearch, setEventsSearch] = useState('');
  const [visibleEventsCount, setVisibleEventsCount] = useState(12);

  // Tab 4: Культура и наука
  const [openCultureSections, setOpenCultureSections] = useState<Record<CultureSectionKey, boolean>>({
    discoveries: false,
    literature: false,
    culture: false,
    retrospective: false,
  });
  const [cultureLimitBySection, setCultureLimitBySection] = useState<Record<CultureSectionKey, number>>({
    discoveries: 12,
    literature: 12,
    culture: 12,
    retrospective: 12,
  });

  const bodyRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);

  const dialogRef = useModalFocusTrap<HTMLDivElement>(onClose);

  const resolvedEras = useMemo(() => resolveMacroEras(eras), [eras]);
  const branchById = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

  const resolvedEraForScope = useMemo(() => {
    if (!era) return null;
    return (
      resolvedEras.find((e) => e.id === era.id) ??
      resolveMacroEra(era, eras.findIndex((e) => e.id === era.id))
    );
  }, [era, resolvedEras, eras]);

  const loadedCampaignCount = useMemo(() => {
    if (!resolvedEraForScope) return 0;
    return countCampaignEventsInRange(
      enrichedEvents,
      branches,
      resolvedEraForScope.startYear,
      resolvedEraForScope.endYear,
    );
  }, [resolvedEraForScope, enrichedEvents, branches]);

  const scopedEvents = useMemo(
    () => filterEventsForAnalyticsScope(enrichedEvents, { includeCampaignDetails }),
    [enrichedEvents, includeCampaignDetails],
  );

  const summary = useMemo(() => {
    if (!resolvedEraForScope) return null;
    return getMacroEraSummaryData(resolvedEraForScope, rulers, scopedEvents, branches, personDossiers);
  }, [resolvedEraForScope, rulers, scopedEvents, branches, personDossiers]);

  // Reset modal state cleanly when switching era
  useEffect(() => {
    setActiveTab('overview');
    setIncludeCampaignDetails(false);
    setExpandCarryIn(false);
    setExpandCarryOut(false);
    setPeopleGroup('all');
    setPeopleSearch('');
    setVisiblePeopleCount(12);
    setActiveSphere('all');
    setSelectedBranchId('all');
    setBoundaryFilter('all');
    setEventsSortMode('impact');
    setEventsSearch('');
    setVisibleEventsCount(12);

    const nextOpen: Record<CultureSectionKey, boolean> = {
      discoveries: false,
      literature: false,
      culture: false,
      retrospective: false,
    };
    if (summary) {
      if (summary.discoveriesInPeriod.length > 0) {
        nextOpen.discoveries = true;
      } else if (summary.literaryWorksInPeriod.length > 0) {
        nextOpen.literature = true;
      } else if (summary.cultureEventsInPeriod.length > 0) {
        nextOpen.culture = true;
      } else if (summary.worksAboutPeriod.length > 0) {
        nextOpen.retrospective = true;
      }
    }
    setOpenCultureSections(nextOpen);
    setCultureLimitBySection({
      discoveries: 12,
      literature: 12,
      culture: 12,
      retrospective: 12,
    });
    bodyRef.current?.scrollTo({ top: 0 });
  }, [era?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToTabsIfNeeded = () => {
    const body = bodyRef.current;
    const tabsEl = tabBarRef.current;
    if (!body || !tabsEl) return;
    const targetTop = Math.max(0, tabsEl.offsetTop - 8);
    if (body.scrollTop > targetTop) {
      body.scrollTo({ top: targetTop });
    }
  };

  const handleTabChange = (nextTab: EraModalTabId) => {
    setActiveTab(nextTab);
    scrollToTabsIfNeeded();
  };

  const handleJumpToSphere = (sphereId: EraEventSphereId) => {
    setActiveSphere(sphereId);
    setSelectedBranchId('all');
    setBoundaryFilter('all');
    setEventsSearch('');
    setVisibleEventsCount(12);
    setActiveTab('events');
    scrollToTabsIfNeeded();
  };

  const handleJumpToPeopleGroup = (groupId: EraPeopleGroupFilter) => {
    setPeopleGroup(groupId);
    setPeopleSearch('');
    setVisiblePeopleCount(12);
    setActiveTab('people');
    scrollToTabsIfNeeded();
  };

  // Tab 2 memos: filtered figures
  const filteredPeople = useMemo(() => {
    if (!summary) return [];
    const base =
      peopleGroup === 'all' ? summary.eraFigures : summary.eraFiguresByGroup[peopleGroup] || [];
    const q = peopleSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter((fig) => {
      const hay = `${fig.name} ${fig.roleLabel} ${fig.description} ${fig.period} ${fig.metaNote ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [summary, peopleGroup, peopleSearch]);

  // Tab 3 memos: sphere-scoped events & branches
  const sphereScopedEvents = useMemo(() => {
    if (!summary) return [];
    if (activeSphere === 'all') return summary.eraSphereEvents;
    return summary.sphereSummaries.find((s) => s.id === activeSphere)?.events ?? [];
  }, [summary, activeSphere]);

  const availableBranchesForSphere = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ev of sphereScopedEvents) {
      counts.set(ev.task, (counts.get(ev.task) ?? 0) + 1);
    }
    const items: Array<{ id: string; label: string; count: number }> = [];
    counts.forEach((count, branchId) => {
      const b = branchById.get(branchId);
      items.push({ id: branchId, label: b?.label ?? branchId, count });
    });
    return items.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru'));
  }, [sphereScopedEvents, branchById]);

  const effectiveSelectedBranchId = useMemo(() => {
    if (selectedBranchId === 'all') return 'all';
    return availableBranchesForSphere.some((b) => b.id === selectedBranchId)
      ? selectedBranchId
      : 'all';
  }, [selectedBranchId, availableBranchesForSphere]);

  const filteredEvents = useMemo(() => {
    if (!summary) return [];
    const { startYear, endYear } = summary.era;
    const q = eventsSearch.trim().toLowerCase();
    const list = sphereScopedEvents.filter((ev) => {
      if (effectiveSelectedBranchId !== 'all' && ev.task !== effectiveSelectedBranchId) {
        return false;
      }
      if (boundaryFilter === 'inside' && (ev.startYear < startYear || ev.endYear > endYear)) {
        return false;
      }
      if (boundaryFilter === 'carryIn' && ev.startYear >= startYear) {
        return false;
      }
      if (boundaryFilter === 'carryOut' && ev.endYear <= endYear) {
        return false;
      }
      if (q) {
        const branchLabel = branchById.get(ev.task)?.label ?? ev.task;
        const hay =
          `${ev.title} ${ev.subtitle ?? ''} ${ev.outcome ?? ''} ${ev.period} ${branchLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (eventsSortMode === 'impact') {
      return [...list].sort((a, b) => {
        if (b.explicitLinks.length !== a.explicitLinks.length) {
          return b.explicitLinks.length - a.explicitLinks.length;
        }
        return a.startYear - b.startYear || a.endYear - b.endYear;
      });
    }
    return [...list].sort((a, b) => a.startYear - b.startYear || a.endYear - b.endYear);
  }, [
    summary,
    sphereScopedEvents,
    effectiveSelectedBranchId,
    boundaryFilter,
    eventsSearch,
    eventsSortMode,
    branchById,
  ]);

  if (!era || !summary) return null;

  const {
    era: resolvedEra,
    eraRulers,
    eraSphereEvents,
    sphereSummaries,
    eraFigures,
    eraFiguresByGroup,
    literaryWorksInPeriod,
    discoveriesInPeriod,
    cultureEventsInPeriod,
    worksAboutPeriod,
    carryOverInEvents,
    carryOverOutEvents,
    centers,
    peakInterval,
    topConnectedEvents,
    totalDurationYears,
    totalSyncLinks,
  } = summary;

  const currentIdx = resolvedEras.findIndex((e) => e.id === resolvedEra.id);
  const prevEra = currentIdx > 0 ? resolvedEras[currentIdx - 1] : null;
  const nextEra =
    currentIdx >= 0 && currentIdx < resolvedEras.length - 1 ? resolvedEras[currentIdx + 1] : null;
  const lastHistoryItem = modalHistory.length > 0 ? modalHistory[modalHistory.length - 1] : null;

  const cultureTotalCount =
    discoveriesInPeriod.length +
    literaryWorksInPeriod.length +
    cultureEventsInPeriod.length +
    worksAboutPeriod.length;

  const totalSphereEventsCount = Math.max(1, eraSphereEvents.length);

  const canOpenFigure = (fig: EraFigureEntry): boolean => {
    if (fig.targetKind === 'ruler' && fig.targetId) return true;
    if (fig.targetKind === 'event' && fig.targetId) return true;
    if (fig.targetKind === 'person' && fig.targetId && Boolean(onOpenPersonModal)) return true;
    return false;
  };

  const handleOpenFigure = (fig: EraFigureEntry) => {
    if (fig.targetKind === 'ruler' && fig.targetId) {
      onSelectRuler(fig.targetId);
      return;
    }
    if (fig.targetKind === 'event' && fig.targetId) {
      onSelectEvent(fig.targetId);
      return;
    }
    if (fig.targetKind === 'person' && fig.targetId && onOpenPersonModal) {
      onOpenPersonModal(fig.targetId);
    }
  };

  const getFigureActionLabel = (fig: EraFigureEntry): string | null => {
    if (fig.targetKind === 'ruler' && fig.targetId) return 'Правитель';
    if (fig.targetKind === 'event' && fig.targetId) return 'Биография';
    if (fig.targetKind === 'person' && fig.targetId && onOpenPersonModal) return 'Досье';
    return null;
  };

  const renderFigureRow = (fig: EraFigureEntry) => {
    const clickable = canOpenFigure(fig);
    const groupMeta = FIGURE_GROUP_META[fig.group];
    const actionLabel = getFigureActionLabel(fig);

    const content = (
      <div className="space-y-1 min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
            <span
              className={`font-serif text-sm sm:text-[15px] font-bold text-white ${
                clickable ? 'group-hover:text-amber-200 transition-colors' : ''
              }`}
            >
              {fig.name}
            </span>
            <span aria-hidden="true" className="text-slate-600 text-xs">
              ·
            </span>
            <span className={`text-xs font-mono ${groupMeta.accentText}`}>{fig.roleLabel}</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 shrink-0 tabular-nums">
            <span>{fig.period}</span>
            {fig.metaNote && (
              <>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-slate-500">{fig.metaNote}</span>
              </>
            )}
            {typeof fig.linkCount === 'number' && fig.linkCount > 0 && (
              <>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-emerald-300/90">связей: {fig.linkCount}</span>
              </>
            )}
            {actionLabel && (
              <span className="inline-flex items-center gap-1 text-amber-300/90 group-hover:text-amber-200 ml-1">
                <span>{actionLabel}</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {fig.description && (
          <p className="text-xs text-slate-300/90 leading-relaxed max-w-3xl line-clamp-2">
            {fig.description}
          </p>
        )}
      </div>
    );

    if (!clickable) {
      return (
        <div key={fig.id} className="py-3 px-1">
          {content}
        </div>
      );
    }

    return (
      <button
        key={fig.id}
        type="button"
        onClick={() => handleOpenFigure(fig)}
        className="group w-full text-left py-3 px-2 -mx-2 rounded-lg hover:bg-slate-800/45 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
      >
        {content}
      </button>
    );
  };

  const selectClass =
    'h-8 px-2.5 pr-7 rounded-lg bg-slate-950/90 border border-slate-700/80 hover:border-slate-600 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400/60 cursor-pointer max-w-full';

  const tabs: Array<{ id: EraModalTabId; label: string; count?: number; icon: React.ReactNode }> = [
    {
      id: 'overview',
      label: 'Обзор',
      icon: <ScrollText className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'people',
      label: 'Лица',
      count: eraFigures.length,
      icon: <Users className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'events',
      label: 'События',
      count: eraSphereEvents.length,
      icon: <Layers className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'culture',
      label: 'Культура и наука',
      count: cultureTotalCount,
      icon: <BookOpen className="w-3.5 h-3.5 shrink-0" />,
    },
  ];

  const hasActiveEventFilters =
    activeSphere !== 'all' ||
    effectiveSelectedBranchId !== 'all' ||
    boundaryFilter !== 'all' ||
    eventsSearch.trim().length > 0;

  const displayedEvents = filteredEvents.slice(0, visibleEventsCount);
  const displayedPeople = filteredPeople.slice(0, visiblePeopleCount);
  const showGroupedOverviewInPeople = peopleGroup === 'all' && peopleSearch.trim().length === 0;

  const visibleCarryIn = expandCarryIn ? carryOverInEvents : carryOverInEvents.slice(0, 6);
  const visibleCarryOut = expandCarryOut ? carryOverOutEvents : carryOverOutEvents.slice(0, 6);
  const previewRulers = eraRulers.slice(0, 6);

  const toggleCultureSection = (key: CultureSectionKey) => {
    setOpenCultureSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandCultureLimit = (key: CultureSectionKey, step: number) => {
    setCultureLimitBySection((prev) => ({ ...prev, [key]: prev[key] + step }));
  };

  const renderCultureList = (
    items: EnrichedEvent[],
    sectionKey: CultureSectionKey,
    accentClass: string,
    periodPrefix?: string,
  ) => {
    const limit = cultureLimitBySection[sectionKey];
    const visible = items.slice(0, limit);
    const remaining = items.length - visible.length;

    return (
      <div className="space-y-2 pt-1">
        <div className="divide-y divide-slate-800/75">
          {visible.map((item) => {
            const branch = branchById.get(item.task);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectEvent(item.id)}
                className="group w-full text-left py-2.5 px-2 -mx-2 rounded-lg hover:bg-slate-800/45 transition-colors cursor-pointer space-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                  <span className="inline-flex flex-wrap items-center gap-1.5 min-w-0">
                    <span className={`font-semibold tabular-nums ${accentClass}`}>
                      {periodPrefix ? `${periodPrefix} ${item.period}` : item.period}
                    </span>
                    {branch && (
                      <>
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                        <span className="text-slate-400 truncate">{branch.label}</span>
                      </>
                    )}
                  </span>
                  {item.explicitLinks.length > 0 && (
                    <span className="text-emerald-300/90 tabular-nums shrink-0">
                      связей: {item.explicitLinks.length}
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-white group-hover:text-amber-200 transition-colors">
                  {item.title}
                </div>
                {item.subtitle && (
                  <p className="text-xs text-slate-400 line-clamp-2 max-w-3xl">{item.subtitle}</p>
                )}
              </button>
            );
          })}
        </div>

        {remaining > 0 && (
          <div className="pt-1 flex flex-wrap items-center gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={() => expandCultureLimit(sectionKey, 12)}
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              Показать ещё {Math.min(12, remaining)} (осталось {remaining})
            </button>
            <button
              type="button"
              onClick={() => expandCultureLimit(sectionKey, remaining)}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Показать все ({items.length})
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="era-modal-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl max-h-[92vh] rounded-2xl bg-[#0b1325] border border-amber-500/40 shadow-2xl flex flex-col overflow-hidden">
        {/* Шапка досье макро-периода */}
        <DossierModalHeader
          lastHistoryItem={lastHistoryItem}
          onNavigateBack={onNavigateBack}
          onExportMarkdown={() => {
            const { filename, content } = formatEraDossierToMarkdown(summary, branches, {
              includeCampaignDetails,
            });
            downloadMarkdownFile(filename, content);
          }}
          exportMarkdownTitle="Скачать досье макро-периода в Markdown (.md)"
          exportMarkdownAriaLabel="Скачать досье макро-периода в формате Markdown"
          onClose={onClose}
          closeAriaLabel="Закрыть досье макро-периода"
          context={
            <>
              <ScrollText className="w-4 h-4 text-amber-400 shrink-0" />
              <span
                className="font-mono text-xs sm:text-sm font-bold text-amber-300 truncate tabular-nums"
                title={`${resolvedEra.displayShortTitle} · ${resolvedEra.period} · Досье макро-периода`}
              >
                {resolvedEra.displayShortTitle} · {resolvedEra.period}
              </span>
              <span aria-hidden="true" className="text-slate-500 hidden sm:inline shrink-0">
                ·
              </span>
              <span className="font-mono text-xs text-slate-400 hidden sm:inline shrink-0">
                Досье макро-периода
              </span>
            </>
          }
          actions={
            <>
              {loadedCampaignCount > 0 && (
                <button
                  type="button"
                  aria-pressed={includeCampaignDetails}
                  onClick={() => setIncludeCampaignDetails((prev) => !prev)}
                  className={`h-8 px-2.5 rounded-lg border text-xs font-mono inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 ${
                    includeCampaignDetails
                      ? 'bg-amber-500/20 border-amber-400/60 text-amber-100 font-semibold'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                  title="Включить или исключить детальные события загруженных военных кампаний из сводки эпохи"
                >
                  <Swords className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Детали кампаний (+{loadedCampaignCount})</span>
                </button>
              )}
              {onCompareWithEra && (
                <button
                  type="button"
                  onClick={() => onCompareWithEra(resolvedEra.id)}
                  className="h-8 px-3 rounded-lg border border-sky-500/40 bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 text-xs font-mono font-semibold inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                  title="Сравнить эту макро-эпоху с другой эпохой или правлением"
                >
                  <GitCompareArrows className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Сравнить с…</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onFilterByEraRange(resolvedEra.startYear, resolvedEra.endYear);
                  onClose();
                }}
                className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold inline-flex items-center transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                Сфокусировать окно ({resolvedEra.startYear}–{resolvedEra.endYear})
              </button>
            </>
          }
        />

        {/* Прокручиваемое тело досье */}
        <div ref={bodyRef} className="px-5 sm:px-6 pt-5 pb-6 overflow-y-auto flex-1 space-y-5">
          {/* Название, нейтральная характеристика и политические центры */}
          <div className="space-y-2.5">
            <h3
              id="era-modal-title"
              className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight text-balance"
            >
              {resolvedEra.title}
            </h3>

            <p className="text-sm sm:text-[15px] text-slate-300 leading-relaxed max-w-3xl">
              {resolvedEra.thesis}
            </p>

            {centers.length > 0 && (
              <div className="pt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-slate-400">
                <span className="inline-flex items-center gap-1.5 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Политические центры:</span>
                </span>
                <span className="text-amber-200/95 font-medium">
                  {centers.join(' · ')}
                </span>
              </div>
            )}
          </div>

          {/* 4 сводных плашки статистики */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3">
              <div className="text-slate-400">Длительность</div>
              <div className="text-lg font-extrabold text-amber-300 mt-0.5 tabular-nums">
                {totalDurationYears} л.
              </div>
              <div className="text-[11px] text-slate-500 tabular-nums">{resolvedEra.period}</div>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3">
              <div className="text-slate-400">Правлений в эпохе</div>
              <div className="text-lg font-extrabold text-white mt-0.5 tabular-nums">
                {eraRulers.length}
              </div>
              <div className="text-[11px] text-slate-500">правлений и государей</div>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3">
              <div className="text-slate-400">Событий и лиц эпохи</div>
              <div className="text-lg font-extrabold text-sky-300 mt-0.5 tabular-nums">
                {eraSphereEvents.length} соб. · {eraFigures.length} лиц
              </div>
              <div className="text-[11px] text-slate-500 tabular-nums">
                книг: {literaryWorksInPeriod.length} · открытий: {discoveriesInPeriod.length}
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3">
              <div className="text-slate-400">Пик активности</div>
              <div className="text-lg font-extrabold text-emerald-300 mt-0.5 tabular-nums">
                {peakInterval ? peakInterval.label : '—'}
              </div>
              <div className="text-[11px] text-slate-500 tabular-nums">
                {peakInterval
                  ? `${peakInterval.count} одновременных · связей: ${totalSyncLinks}`
                  : `связей: ${totalSyncLinks}`}
              </div>
            </div>
          </div>

          {/* Липкая полоса 4 вкладок */}
          <div
            ref={tabBarRef}
            role="tablist"
            onKeyDown={handleTabKeyDown}
            aria-label="Разделы досье периода"
            className="sticky top-0 z-10 -mx-5 sm:-mx-6 px-5 sm:px-6 bg-[#0b1325]/95 backdrop-blur-sm border-b border-slate-800/90 flex items-center gap-1 overflow-x-auto"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  {...tabProps(tab.id)}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-3.5 py-2.5 text-xs font-mono inline-flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/70 ${
                    isActive
                      ? 'border-amber-400 text-amber-200 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && (
                    <span
                      className={`tabular-nums text-[11px] ${
                        isActive ? 'text-amber-300/90' : 'text-slate-500'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ВКЛАДКА 1: ОБЗОР */}
          {tabs.filter((tab) => tab.id !== activeTab).map(({ id }) => (
            <div key={id} {...panelProps(id)} />
          ))}
          {activeTab === 'overview' && (
            <div {...panelProps('overview')} className="space-y-6">
              {/* Компактная структура эпохи по 5 сферам */}
              <section className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 inline-flex items-center gap-2 font-semibold">
                    <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Основные сферы событий эпохи</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleTabChange('events')}
                    className="text-xs font-mono text-amber-300 hover:text-amber-200 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Все события ({eraSphereEvents.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {sphereSummaries.map((sphere) => {
                    const styleMeta = SPHERE_STYLE_META[sphere.id];
                    const sharePct = Math.round((sphere.events.length / totalSphereEventsCount) * 100);
                    const hasItems = sphere.events.length > 0;
                    return (
                      <button
                        key={sphere.id}
                        type="button"
                        disabled={!hasItems}
                        onClick={() => handleJumpToSphere(sphere.id)}
                        className={`text-left rounded-xl bg-slate-900/75 border border-slate-800/90 p-3 space-y-2 transition-colors ${
                          hasItems
                            ? `${styleMeta.tileHover} hover:bg-slate-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70`
                            : 'opacity-50 cursor-default'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-mono">
                          <span className={`inline-flex items-center gap-1.5 font-semibold ${styleMeta.accentText}`}>
                            {renderSphereIcon(sphere.id, 'w-3.5 h-3.5 shrink-0')}
                            <span>{sphere.shortLabel}</span>
                          </span>
                          <span className="text-slate-500 tabular-nums text-[11px]">
                            {sharePct}%
                          </span>
                        </div>

                        <div className="text-lg font-mono font-bold text-white tabular-nums leading-none">
                          {sphere.events.length}
                        </div>

                        <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${styleMeta.barClass} ${getShareWidthClass(sharePct)}`}
                          />
                        </div>

                        <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                          связей: {sphere.linkCount}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Интерактивный пульс интенсивности, развилки и пошаговый маршрут по эпохе */}
              <EraAnalyticalProfileSection
                events={eraSphereEvents}
                yearFrom={resolvedEra.startYear}
                yearTo={resolvedEra.endYear}
                branches={branches}
                periodLabel={`${resolvedEra.displayShortTitle} (${resolvedEra.period})`}
                onSelectEvent={onSelectEvent}
                onFocusSubWindow={(from, to) => {
                  onFilterByEraRange(from, to);
                  onClose();
                }}
              />

              {/* Окна переходящих событий на границах эпохи */}
              {(carryOverInEvents.length > 0 || carryOverOutEvents.length > 0) && (
                <section className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {carryOverInEvents.length > 0 && (
                    <div className="rounded-xl bg-sky-950/20 border border-sky-500/30 p-4 space-y-2.5">
                      <div className="text-xs font-mono text-sky-300 font-semibold">
                        Начались ранее и перешли в этот период ({carryOverInEvents.length})
                      </div>
                      <div className="divide-y divide-sky-500/15">
                        {visibleCarryIn.map((ev) => (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => onSelectEvent(ev.id)}
                            className="group w-full text-left py-2 text-xs font-mono text-sky-100/95 hover:text-white flex items-baseline justify-between gap-2 cursor-pointer transition-colors"
                          >
                            <span className="group-hover:underline">
                              {formatEventTitleWithPeriod(ev)}
                            </span>
                            <ArrowRight className="w-3 h-3 text-sky-400/70 group-hover:text-sky-300 shrink-0" />
                          </button>
                        ))}
                      </div>
                      {carryOverInEvents.length > 6 && (
                        <button
                          type="button"
                          onClick={() => setExpandCarryIn((prev) => !prev)}
                          className="text-[11px] font-mono text-sky-300 hover:text-sky-200 cursor-pointer"
                        >
                          {expandCarryIn
                            ? 'Свернуть список'
                            : `Показать все (${carryOverInEvents.length})`}
                        </button>
                      )}
                    </div>
                  )}

                  {carryOverOutEvents.length > 0 && (
                    <div className="rounded-xl bg-amber-950/20 border border-amber-500/30 p-4 space-y-2.5">
                      <div className="text-xs font-mono text-amber-300 font-semibold">
                        Продолжились в следующем макро-периоде ({carryOverOutEvents.length})
                      </div>
                      <div className="divide-y divide-amber-500/15">
                        {visibleCarryOut.map((ev) => (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => onSelectEvent(ev.id)}
                            className="group w-full text-left py-2 text-xs font-mono text-amber-100/95 hover:text-white flex items-baseline justify-between gap-2 cursor-pointer transition-colors"
                          >
                            <span className="group-hover:underline">
                              {formatEventTitleWithPeriod(ev)}
                            </span>
                            <ArrowRight className="w-3 h-3 text-amber-400/70 group-hover:text-amber-300 shrink-0" />
                          </button>
                        ))}
                      </div>
                      {carryOverOutEvents.length > 6 && (
                        <button
                          type="button"
                          onClick={() => setExpandCarryOut((prev) => !prev)}
                          className="text-[11px] font-mono text-amber-300 hover:text-amber-200 cursor-pointer"
                        >
                          {expandCarryOut
                            ? 'Свернуть список'
                            : `Показать все (${carryOverOutEvents.length})`}
                        </button>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* Правители эпохи (вынесены наверх в обзор, без длинного скролла) */}
              {eraRulers.length > 0 && (
                <section className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-amber-300 inline-flex items-center gap-2 font-semibold">
                      <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Правители эпохи ({eraRulers.length})</span>
                    </h4>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      {eraRulers.length > previewRulers.length && (
                        <button
                          type="button"
                          onClick={() => handleJumpToPeopleGroup('rulers')}
                          className="text-amber-300 hover:text-amber-200 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <span>Все правители ({eraRulers.length})</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleJumpToPeopleGroup('all')}
                        className="text-slate-300 hover:text-white inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <span>Все лица эпохи ({eraFigures.length})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                    {previewRulers.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onSelectRuler(r.id)}
                        className="group w-full text-left py-3 px-2 -mx-2 rounded-lg hover:bg-slate-800/45 transition-colors cursor-pointer space-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                          <div className="flex flex-wrap items-baseline gap-x-2 min-w-0">
                            <span className="font-serif text-sm sm:text-[15px] font-bold text-white group-hover:text-amber-200 transition-colors">
                              {r.ruler}
                            </span>
                            {r.dynastyOrTitle && (
                              <>
                                <span aria-hidden="true" className="text-slate-600 text-xs">
                                  ·
                                </span>
                                <span className="text-xs font-mono text-slate-400">
                                  {r.dynastyOrTitle}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 shrink-0 tabular-nums">
                            <span className="text-amber-300 font-semibold">{r.reignPeriod}</span>
                            {r.center && (
                              <>
                                <span aria-hidden="true" className="text-slate-600">
                                  ·
                                </span>
                                <span>{r.center}</span>
                              </>
                            )}
                            <span aria-hidden="true" className="text-slate-600">
                              ·
                            </span>
                            <span className="text-slate-500">
                              {Math.max(1, r.endYear - r.startYear)} л.
                            </span>
                          </div>
                        </div>
                        {r.reignThesis && (
                          <p className="text-xs text-slate-300/90 line-clamp-2 max-w-3xl">
                            {r.reignThesis}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Ключевые поворотные события эпохи */}
              {topConnectedEvents.length > 0 && (
                <section className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-300 inline-flex items-center gap-2 font-semibold">
                      <Flame className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Ключевые поворотные события эпохи</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleTabChange('events')}
                      className="text-xs font-mono text-amber-300 hover:text-amber-200 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <span>События по сферам ({eraSphereEvents.length})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                    {topConnectedEvents.map((ev) => {
                      const sphereId = classifyEventToEraSphere(ev, branchById, branches);
                      const sphereMeta = sphereId ? ERA_SPHERE_META[sphereId] : null;
                      const styleMeta = sphereId ? SPHERE_STYLE_META[sphereId] : null;
                      const branch = branchById.get(ev.task);
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => onSelectEvent(ev.id)}
                          className="group w-full text-left py-3 px-2 -mx-2 rounded-lg hover:bg-slate-800/45 transition-colors cursor-pointer space-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                            <span className="inline-flex flex-wrap items-center gap-1.5 min-w-0">
                              <span className="text-slate-200 font-semibold tabular-nums">
                                {ev.period}
                              </span>
                              <span aria-hidden="true" className="text-slate-600">
                                ·
                              </span>
                              <span className={`font-semibold ${styleMeta?.accentText ?? 'text-slate-400'}`}>
                                {sphereMeta?.shortLabel ?? 'Вне пяти сфер'}
                              </span>
                              {branch && (
                                <>
                                  <span aria-hidden="true" className="text-slate-600">
                                    ·
                                  </span>
                                  <span className="text-slate-400 truncate">{branch.label}</span>
                                </>
                              )}
                            </span>
                            <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold tabular-nums shrink-0">
                              <Link2 className="w-3 h-3" />
                              <span>{ev.explicitLinks.length}</span>
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-white group-hover:text-amber-200 transition-colors">
                            {ev.title}
                          </div>
                          {ev.outcome ? (
                            <p className="text-xs text-slate-300/90 line-clamp-2 max-w-3xl">
                              <span className="text-amber-300/90 font-medium">Итог:</span>{' '}
                              {ev.outcome}
                            </p>
                          ) : ev.subtitle ? (
                            <p className="text-xs text-slate-400 line-clamp-2 max-w-3xl">
                              {ev.subtitle}
                            </p>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ВКЛАДКА 2: ЛИЦА */}
          {activeTab === 'people' && (
            <div {...panelProps('people')} className="space-y-4">
              {/* Панель переключения групп и поиска */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-950/90 border border-slate-800 p-1 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      setPeopleGroup('all');
                      setVisiblePeopleCount(12);
                    }}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                      peopleGroup === 'all'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Все ({eraFigures.length})
                  </button>
                  {FIGURE_GROUP_ORDER.map((groupId) => {
                    const count = eraFiguresByGroup[groupId].length;
                    const meta = FIGURE_GROUP_META[groupId];
                    const isActive = peopleGroup === groupId;
                    return (
                      <button
                        key={groupId}
                        type="button"
                        onClick={() => {
                          setPeopleGroup(groupId);
                          setVisiblePeopleCount(12);
                        }}
                        className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 tabular-nums ${
                          isActive ? meta.activeButton : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {renderFigureGroupIcon(groupId, 'w-3 h-3 shrink-0')}
                        <span>
                          {meta.shortLabel} ({count})
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full sm:w-64 shrink-0">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={peopleSearch}
                    onChange={(e) => {
                      setPeopleSearch(e.target.value);
                      setVisiblePeopleCount(12);
                    }}
                    placeholder="Имя, роль или вклад…"
                    aria-label="Поиск по лицам эпохи"
                    className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-950/90 border border-slate-700/80 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                  />
                </div>
              </div>

              {eraFigures.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-slate-400">
                  Для этой эпохи пока нет закреплённых персоналий.
                </div>
              ) : showGroupedOverviewInPeople ? (
                <div className="space-y-6">
                  {FIGURE_GROUP_ORDER.map((groupId) => {
                    const items = eraFiguresByGroup[groupId];
                    if (items.length === 0) return null;
                    const meta = FIGURE_GROUP_META[groupId];
                    const preview = items.slice(0, 4);
                    return (
                      <section key={groupId} className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4
                            className={`text-xs font-mono uppercase tracking-wider font-semibold inline-flex items-center gap-2 ${meta.accentText}`}
                          >
                            {renderFigureGroupIcon(groupId)}
                            <span>
                              {meta.label} ({items.length})
                            </span>
                          </h4>
                          {items.length > preview.length && (
                            <button
                              type="button"
                              onClick={() => {
                                setPeopleGroup(groupId);
                                setVisiblePeopleCount(12);
                              }}
                              className="text-xs font-mono text-amber-300 hover:text-amber-200 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            >
                              <span>Все в группе ({items.length})</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                          {preview.map((fig) => renderFigureRow(fig))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : filteredPeople.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-slate-400 space-y-2">
                  <div>По вашему запросу среди лиц эпохи ничего не найдено.</div>
                  <button
                    type="button"
                    onClick={() => {
                      setPeopleGroup('all');
                      setPeopleSearch('');
                    }}
                    className="text-amber-300 hover:text-amber-200 cursor-pointer"
                  >
                    Сбросить фильтр
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-mono text-slate-400 tabular-nums">
                    Показано {displayedPeople.length} из {filteredPeople.length}
                  </div>
                  <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                    {displayedPeople.map((fig) => renderFigureRow(fig))}
                  </div>
                  {filteredPeople.length > displayedPeople.length && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => setVisiblePeopleCount((prev) => prev + 12)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Показать ещё {Math.min(12, filteredPeople.length - displayedPeople.length)}{' '}
                        (осталось {filteredPeople.length - displayedPeople.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisiblePeopleCount(filteredPeople.length)}
                        className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Показать все ({filteredPeople.length})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ВКЛАДКА 3: СОБЫТИЯ */}
          {activeTab === 'events' && (
            <div {...panelProps('events')} className="space-y-4">
              {/* Переключатель 5 сфер */}
              <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-950/90 border border-slate-800 p-1 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSphere('all');
                    setSelectedBranchId('all');
                    setVisibleEventsCount(12);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                    activeSphere === 'all'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Все сферы ({eraSphereEvents.length})
                </button>
                {ERA_SPHERE_ORDER.map((sphereId) => {
                  const sphere = sphereSummaries.find((s) => s.id === sphereId);
                  const count = sphere?.events.length ?? 0;
                  const meta = ERA_SPHERE_META[sphereId];
                  const styleMeta = SPHERE_STYLE_META[sphereId];
                  const isActive = activeSphere === sphereId;
                  return (
                    <button
                      key={sphereId}
                      type="button"
                      onClick={() => {
                        setActiveSphere(sphereId);
                        setSelectedBranchId('all');
                        setVisibleEventsCount(12);
                      }}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 tabular-nums ${
                        isActive ? styleMeta.activeButton : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {renderSphereIcon(sphereId, 'w-3 h-3 shrink-0')}
                      <span>
                        {meta.shortLabel} ({count})
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeSphere !== 'all' && (
                <p className="text-xs text-slate-400 leading-relaxed">
                  <span className={`font-mono font-semibold ${SPHERE_STYLE_META[activeSphere].accentText}`}>
                    {ERA_SPHERE_META[activeSphere].label}:
                  </span>{' '}
                  {ERA_SPHERE_META[activeSphere].description}
                </p>
              )}

              {/* Компактная строка фильтров и сортировки */}
              <div className="flex flex-wrap items-center gap-2">
                {availableBranchesForSphere.length > 1 && (
                  <select
                    aria-label="Фильтр по исторической ветке"
                    value={effectiveSelectedBranchId}
                    onChange={(e) => {
                      setSelectedBranchId(e.target.value);
                      setVisibleEventsCount(12);
                    }}
                    className={selectClass}
                  >
                    <option value="all">
                      Все ветки ({availableBranchesForSphere.length})
                    </option>
                    {availableBranchesForSphere.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label} ({b.count})
                      </option>
                    ))}
                  </select>
                )}

                <select
                  aria-label="Фильтр по границам эпохи"
                  value={boundaryFilter}
                  onChange={(e) => {
                    setBoundaryFilter(e.target.value as EraEventBoundaryFilter);
                    setVisibleEventsCount(12);
                  }}
                  className={selectClass}
                >
                  <option value="all">Все границы эпохи</option>
                  <option value="inside">Внутри эпохи</option>
                  <option value="carryIn">Начались ранее ({carryOverInEvents.length})</option>
                  <option value="carryOut">Продолжились после ({carryOverOutEvents.length})</option>
                </select>

                <select
                  aria-label="Сортировка событий"
                  value={eventsSortMode}
                  onChange={(e) => setEventsSortMode(e.target.value as EraEventsSortMode)}
                  className={selectClass}
                >
                  <option value="impact">По влиянию и связям</option>
                  <option value="chronological">По хронологии</option>
                </select>

                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={eventsSearch}
                    onChange={(e) => {
                      setEventsSearch(e.target.value);
                      setVisibleEventsCount(12);
                    }}
                    placeholder="Поиск события или итога…"
                    aria-label="Поиск по событиям эпохи"
                    className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-950/90 border border-slate-700/80 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                  />
                </div>

                {hasActiveEventFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSphere('all');
                      setSelectedBranchId('all');
                      setBoundaryFilter('all');
                      setEventsSearch('');
                      setVisibleEventsCount(12);
                    }}
                    className="h-8 px-2.5 rounded-lg text-xs font-mono text-amber-300 hover:text-amber-200 cursor-pointer whitespace-nowrap"
                  >
                    Сбросить
                  </button>
                )}
              </div>

              {filteredEvents.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-slate-400">
                  В выбранной сфере и фильтрах событий не найдено.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-mono text-slate-400 tabular-nums">
                    Показано {displayedEvents.length} из {filteredEvents.length}
                  </div>

                  <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                    {displayedEvents.map((ev) => {
                      const sphereId = classifyEventToEraSphere(ev, branchById, branches);
                      const sphereMeta = sphereId ? ERA_SPHERE_META[sphereId] : null;
                      const styleMeta = sphereId ? SPHERE_STYLE_META[sphereId] : null;
                      const branch = branchById.get(ev.task);
                      const isCarryIn = ev.startYear < resolvedEra.startYear;
                      const isCarryOut = ev.endYear > resolvedEra.endYear;

                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => onSelectEvent(ev.id)}
                          className="group w-full text-left py-3 px-2 -mx-2 rounded-lg hover:bg-slate-800/45 transition-colors cursor-pointer space-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                            <span className="inline-flex flex-wrap items-center gap-1.5 min-w-0">
                              <span className="text-slate-200 font-semibold tabular-nums">
                                {ev.period}
                              </span>
                              <span aria-hidden="true" className="text-slate-600">
                                ·
                              </span>
                              <span className={`font-semibold ${styleMeta?.accentText ?? 'text-slate-400'}`}>
                                {sphereMeta?.shortLabel ?? 'Вне пяти сфер'}
                              </span>
                              {branch && (
                                <>
                                  <span aria-hidden="true" className="text-slate-600">
                                    ·
                                  </span>
                                  <span className="text-slate-400 truncate">{branch.label}</span>
                                </>
                              )}
                              {isCarryIn && (
                                <>
                                  <span aria-hidden="true" className="text-slate-600">
                                    ·
                                  </span>
                                  <span className="text-sky-300/90">началось ранее</span>
                                </>
                              )}
                              {isCarryOut && (
                                <>
                                  <span aria-hidden="true" className="text-slate-600">
                                    ·
                                  </span>
                                  <span className="text-amber-300/90">продолжилось далее</span>
                                </>
                              )}
                            </span>

                            {ev.explicitLinks.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold tabular-nums shrink-0">
                                <Link2 className="w-3 h-3" />
                                <span>{ev.explicitLinks.length}</span>
                              </span>
                            )}
                          </div>

                          <div className="text-sm font-semibold text-white group-hover:text-amber-200 transition-colors">
                            {ev.title}
                          </div>

                          {ev.outcome ? (
                            <p className="text-xs text-slate-300/90 line-clamp-2 max-w-3xl">
                              <span className="text-amber-300/90 font-medium">Итог:</span>{' '}
                              {ev.outcome}
                            </p>
                          ) : ev.subtitle ? (
                            <p className="text-xs text-slate-400 line-clamp-2 max-w-3xl">
                              {ev.subtitle}
                            </p>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {filteredEvents.length > displayedEvents.length && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => setVisibleEventsCount((prev) => prev + 12)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Показать ещё {Math.min(12, filteredEvents.length - displayedEvents.length)}{' '}
                        (осталось {filteredEvents.length - displayedEvents.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibleEventsCount(filteredEvents.length)}
                        className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Показать все ({filteredEvents.length})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ВКЛАДКА 4: КУЛЬТУРА И НАУКА */}
          {activeTab === 'culture' && (
            <div {...panelProps('culture')} className="space-y-3">
              {cultureTotalCount === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-slate-400">
                  Для этой эпохи не найдено отдельных карточек культуры, литературы или научных
                  открытий.
                </div>
              ) : (
                <>
                  {discoveriesInPeriod.length > 0 && (
                    <CollapsibleSection
                      title="Научные открытия и инженерные рубежи"
                      count={discoveriesInPeriod.length}
                      icon={<FlaskConical className="w-3.5 h-3.5 text-sky-400" />}
                      accentTextClass="text-sky-300"
                      isOpen={openCultureSections.discoveries}
                      onToggle={() => toggleCultureSection('discoveries')}
                    >
                      {renderCultureList(discoveriesInPeriod, 'discoveries', 'text-sky-300')}
                    </CollapsibleSection>
                  )}

                  {literaryWorksInPeriod.length > 0 && (
                    <CollapsibleSection
                      title="Литературные памятники и книги эпохи"
                      count={literaryWorksInPeriod.length}
                      icon={<BookOpen className="w-3.5 h-3.5 text-amber-400" />}
                      accentTextClass="text-amber-300"
                      isOpen={openCultureSections.literature}
                      onToggle={() => toggleCultureSection('literature')}
                    >
                      {renderCultureList(literaryWorksInPeriod, 'literature', 'text-amber-300')}
                    </CollapsibleSection>
                  )}

                  {cultureEventsInPeriod.length > 0 && (
                    <CollapsibleSection
                      title="Искусство, архитектура и общественная мысль"
                      count={cultureEventsInPeriod.length}
                      icon={<Landmark className="w-3.5 h-3.5 text-emerald-400" />}
                      accentTextClass="text-emerald-300"
                      isOpen={openCultureSections.culture}
                      onToggle={() => toggleCultureSection('culture')}
                    >
                      {renderCultureList(cultureEventsInPeriod, 'culture', 'text-emerald-300')}
                    </CollapsibleSection>
                  )}

                  {worksAboutPeriod.length > 0 && (
                    <CollapsibleSection
                      title="Произведения об этой эпохе (ретроспективный взгляд)"
                      count={worksAboutPeriod.length}
                      icon={<BookMarked className="w-3.5 h-3.5 text-violet-400" />}
                      accentTextClass="text-violet-300"
                      isOpen={openCultureSections.retrospective}
                      onToggle={() => toggleCultureSection('retrospective')}
                    >
                      {renderCultureList(
                        worksAboutPeriod,
                        'retrospective',
                        'text-violet-300',
                        'Издано:',
                      )}
                    </CollapsibleSection>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Нижняя панель переключения между макро-периодами I–XI */}
        <div className="px-5 py-3 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-2 text-xs font-mono">
          {prevEra ? (
            <button
              type="button"
              onClick={() => onSelectEra(prevEra.id)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 inline-flex items-center gap-1.5 cursor-pointer max-w-[46%] truncate"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="truncate">
                {prevEra.displayShortTitle} ({prevEra.period})
              </span>
            </button>
          ) : (
            <span className="text-slate-600">Первый макро-период (862 г.)</span>
          )}

          <span className="text-slate-500 hidden sm:inline tabular-nums">
            Период {resolvedEra.index} из {resolvedEras.length}
          </span>

          {nextEra ? (
            <button
              type="button"
              onClick={() => onSelectEra(nextEra.id)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 inline-flex items-center gap-1.5 cursor-pointer max-w-[46%] truncate"
            >
              <span className="truncate">
                {nextEra.displayShortTitle} ({nextEra.period})
              </span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            </button>
          ) : (
            <span className="text-slate-600">Последний макро-период</span>
          )}
        </div>
      </div>
    </div>
  );
}
