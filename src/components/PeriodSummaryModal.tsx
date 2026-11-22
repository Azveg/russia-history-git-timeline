import { useDossierTabs } from '../hooks/useDossierTabs';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Crown,
  Feather,
  FlaskConical,
  GitBranch,
  GitCompareArrows,
  Link2,
  Network,
  ScrollText,
  Search,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { SourcesApparatusSection } from './AcademicCitationBar';
import { DossierModalHeader } from './DossierModalHeader';
import { downloadMarkdownFile, formatRulerDossierToMarkdown } from '../utils/markdownExport';
import { RulerKinshipSection } from './RulerKinshipSection';
import {
  formatCalendarDetailBadge,
  getLeafBranches,
  getRulerPeriodSummaryData,
  parsePreciseDate,
} from '../engine/timelineEngine';
import type {
  BranchDefinition,
  EnrichedEvent,
  ModalHistoryItem,
  PersonDossier,
  RulerPeriod,
  RulerRelationType,
} from '../types/timeline';

interface PeriodSummaryModalProps {
  ruler: RulerPeriod | null;
  rulers?: RulerPeriod[];
  enrichedEvents: EnrichedEvent[];
  branches: BranchDefinition[];
  personDossiers?: Map<string, PersonDossier>;
  modalHistory?: ModalHistoryItem[];
  onClose: () => void;
  onNavigateBack?: () => void;
  onSelectCard: (id: string) => void;
  onOpenRulerModal?: (rulerId: string) => void;
  onOpenPersonModal?: (personKey: string) => void;
  onFilterByRuler: (rulerId: string) => void;
  onCompareWithRuler?: (rulerId: string) => void;
}

type ModalTabId = 'biography' | 'people' | 'events' | 'analytics';
type RelationFilter = 'all' | RulerRelationType;
type ContemporariesCategoryFilter = 'all' | 'participants' | 'writers' | 'scientists';
type EventScopeFilter = 'all' | 'started' | 'inherited' | 'carryOver';
type ReignEventsSortMode = 'chronological' | 'links';
type CrossLinkCircuitFilter = 'all' | 'historical' | 'cultural';

const RELATION_META: Record<
  RulerRelationType,
  { label: string; filterLabel: string; textClass: string; borderClass: string }
> = {
  ally: {
    label: 'Соратник и реформатор',
    filterLabel: 'Соратники и реформаторы',
    textClass: 'text-emerald-300',
    borderClass: 'border-emerald-500/25 hover:border-emerald-400/55',
  },
  military: {
    label: 'Военный и полководец',
    filterLabel: 'Военные и полководцы',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-500/25 hover:border-amber-400/55',
  },
  diplomacy: {
    label: 'Дипломатия и внешние связи',
    filterLabel: 'Дипломатия и внешние связи',
    textClass: 'text-sky-300',
    borderClass: 'border-sky-500/25 hover:border-sky-400/55',
  },
  family: {
    label: 'Семья и двор',
    filterLabel: 'Семья и двор',
    textClass: 'text-violet-300',
    borderClass: 'border-violet-500/25 hover:border-violet-400/55',
  },
  opponent: {
    label: 'Оппонент и противник',
    filterLabel: 'Оппоненты и противники',
    textClass: 'text-rose-300',
    borderClass: 'border-rose-500/25 hover:border-rose-400/55',
  },
};

function formatDurationYears(startYear: number, endYear: number): string | null {
  const diff = endYear - startYear;
  if (!Number.isFinite(diff) || diff <= 0) return null;
  const mod100 = diff % 100;
  const mod10 = diff % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${diff} лет`;
  if (mod10 === 1) return `${diff} год`;
  if (mod10 >= 2 && mod10 <= 4) return `${diff} года`;
  return `${diff} лет`;
}

function formatStepNumber(index: number): string {
  return String(index + 1).padStart(2, '0');
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
        <span className={`text-xs font-mono uppercase tracking-wider font-semibold inline-flex items-center gap-2 min-w-0 ${accentTextClass}`}>
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

export function PeriodSummaryModal({
  ruler,
  rulers,
  enrichedEvents,
  branches,
  personDossiers,
  modalHistory = [],
  onClose,
  onNavigateBack,
  onSelectCard,
  onOpenRulerModal,
  onOpenPersonModal,
  onFilterByRuler,
  onCompareWithRuler,
}: PeriodSummaryModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTabId>('biography');
  const { handleTabKeyDown, tabProps, panelProps } = useDossierTabs(activeTab);
  const [showSources, setShowSources] = useState(false);

  // Tab 2: Окружение и современники
  const [relationFilter, setRelationFilter] = useState<RelationFilter>('all');
  const [contempCategory, setContempCategory] = useState<ContemporariesCategoryFilter>('all');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [visibleContempCount, setVisibleContempCount] = useState(12);

  // Tab 3: События и культура
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [eventScope, setEventScope] = useState<EventScopeFilter>('all');
  const [eventsSortMode, setEventsSortMode] = useState<ReignEventsSortMode>('chronological');
  const [eventsSearch, setEventsSearch] = useState('');
  const [visibleEventsCount, setVisibleEventsCount] = useState(12);
  const [openDiscoveries, setOpenDiscoveries] = useState(false);
  const [openWorksInPeriod, setOpenWorksInPeriod] = useState(false);
  const [openWorksAboutPeriod, setOpenWorksAboutPeriod] = useState(false);

  // Tab 4: Аналитика связей
  const [crossLinkCircuit, setCrossLinkCircuit] = useState<CrossLinkCircuitFilter>('all');
  const [selectedBranchPairKey, setSelectedBranchPairKey] = useState<string>('all');
  const [visibleCrossLinksCount, setVisibleCrossLinksCount] = useState(8);

  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab('biography');
    setShowSources(false);
    setRelationFilter('all');
    setContempCategory('all');
    setPeopleSearch('');
    setVisibleContempCount(12);
    setSelectedBranchId('all');
    setEventScope('all');
    setEventsSortMode('chronological');
    setEventsSearch('');
    setVisibleEventsCount(12);
    setOpenDiscoveries(false);
    setOpenWorksInPeriod(false);
    setOpenWorksAboutPeriod(false);
    setCrossLinkCircuit('all');
    setSelectedBranchPairKey('all');
    setVisibleCrossLinksCount(8);
    bodyRef.current?.scrollTo({ top: 0 });
  }, [ruler?.id]);

  const handleTabChange = (nextTab: ModalTabId) => {
    setActiveTab(nextTab);
    bodyRef.current?.scrollTo({ top: 0 });
  };

  const dialogRef = useModalFocusTrap<HTMLDivElement>(onClose);

  const summary = useMemo(() => {
    if (!ruler) return null;
    return getRulerPeriodSummaryData(ruler, enrichedEvents, branches, personDossiers, rulers);
  }, [ruler, enrichedEvents, branches, personDossiers, rulers]);

  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);
  const leafBranches = useMemo(
    () => getLeafBranches(branches).filter((b) => !b.isTimeAxis),
    [branches],
  );

  // Tab 2 memos
  const innerCircleRelationCounts = useMemo(() => {
    const counts: Partial<Record<RulerRelationType, number>> = {};
    if (!summary) return counts;
    for (const member of summary.resolvedInnerCircle) {
      counts[member.relationType] = (counts[member.relationType] ?? 0) + 1;
    }
    return counts;
  }, [summary]);

  const filteredInnerCircle = useMemo(() => {
    if (!summary) return [];
    if (relationFilter === 'all') return summary.resolvedInnerCircle;
    return summary.resolvedInnerCircle.filter((m) => m.relationType === relationFilter);
  }, [summary, relationFilter]);

  type ContemporaryItem =
    | {
        kind: 'participant';
        id: string;
        name: string;
        subtitle: string;
        meta: string;
        personKey: string;
      }
    | {
        kind: 'writer' | 'scientist';
        id: string;
        name: string;
        subtitle: string;
        meta: string;
        eventId: string;
      };

  const allContemporaries = useMemo<ContemporaryItem[]>(() => {
    if (!summary) return [];
    const innerPersonKeys = new Set(
      summary.resolvedInnerCircle.map((m) => m.personKey).filter((k): k is string => Boolean(k)),
    );

    const items: ContemporaryItem[] = [];

    if (contempCategory === 'all' || contempCategory === 'writers') {
      for (const w of summary.contemporaryWriters) {
        items.push({
          kind: 'writer',
          id: `writer-${w.id}`,
          name: w.title,
          subtitle: w.subtitle,
          meta: `${w.period} · Литература`,
          eventId: w.id,
        });
      }
    }

    if (contempCategory === 'all' || contempCategory === 'scientists') {
      for (const s of summary.contemporaryScientists) {
        items.push({
          kind: 'scientist',
          id: `scientist-${s.id}`,
          name: s.title,
          subtitle: s.subtitle,
          meta: `${s.period} · Наука`,
          eventId: s.id,
        });
      }
    }

    if (contempCategory === 'all' || contempCategory === 'participants') {
      for (const p of summary.reignParticipants) {
        if (innerPersonKeys.has(p.personKey)) continue;
        const totalSuffix =
          p.totalEventCount > p.reignEventCount ? ` / ${p.totalEventCount} всего` : '';
        items.push({
          kind: 'participant',
          id: `participant-${p.personKey}`,
          name: p.displayName,
          subtitle: 'Участник событий периода — открыть сквозное досье',
          meta: `Событий в правление: ${p.reignEventCount}${totalSuffix}`,
          personKey: p.personKey,
        });
      }
    }

    const q = peopleSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.meta.toLowerCase().includes(q),
    );
  }, [summary, contempCategory, peopleSearch]);

  // Tab 3 memos
  const reignBranchesWithCounts = useMemo(() => {
    if (!summary) return [];
    const counts = new Map<string, number>();
    for (const ev of summary.reignEvents) {
      counts.set(ev.task, (counts.get(ev.task) ?? 0) + 1);
    }
    return leafBranches
      .filter((b) => (counts.get(b.id) ?? 0) > 0)
      .map((b) => ({ branch: b, count: counts.get(b.id) ?? 0 }));
  }, [summary, leafBranches]);

  const filteredReignEvents = useMemo(() => {
    if (!summary || !ruler) return [];
    const q = eventsSearch.trim().toLowerCase();
    const list = summary.reignEvents.filter((ev) => {
      if (selectedBranchId !== 'all' && ev.task !== selectedBranchId) return false;
      if (eventScope === 'started' && (ev.startYear < ruler.startYear || ev.startYear > ruler.endYear)) {
        return false;
      }
      if (eventScope === 'inherited' && ev.startYear >= ruler.startYear) return false;
      if (eventScope === 'carryOver' && ev.endYear <= ruler.endYear) return false;
      if (q) {
        const hay = `${ev.title} ${ev.subtitle ?? ''} ${ev.outcome ?? ''} ${ev.period}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (eventsSortMode === 'links') {
      return [...list].sort((a, b) => {
        if (b.explicitLinks.length !== a.explicitLinks.length) {
          return b.explicitLinks.length - a.explicitLinks.length;
        }
        const aCross = a.explicitLinks.filter((l) => l.targetEvent.task !== a.task).length;
        const bCross = b.explicitLinks.filter((l) => l.targetEvent.task !== b.task).length;
        if (bCross !== aCross) return bCross - aCross;
        return a.startYear - b.startYear;
      });
    }

    return [...list].sort((a, b) => a.startYear - b.startYear || a.endYear - b.endYear);
  }, [summary, ruler, selectedBranchId, eventScope, eventsSearch, eventsSortMode]);

  // Tab 4 memos
  const historicalCrossCount = useMemo(() => {
    if (!summary) return 0;
    return summary.crossBranchLinks.filter((lnk) => lnk.isHistoricalCircuit).length;
  }, [summary]);

  const culturalCrossCount = useMemo(() => {
    if (!summary) return 0;
    return summary.crossBranchLinks.filter((lnk) => !lnk.isHistoricalCircuit).length;
  }, [summary]);

  const filteredCrossBranchPairs = useMemo(() => {
    if (!summary) return [];
    return summary.crossBranchPairs.filter((pair) => {
      if (crossLinkCircuit === 'historical') return pair.isHistoricalCircuit;
      if (crossLinkCircuit === 'cultural') return !pair.isHistoricalCircuit;
      return true;
    });
  }, [summary, crossLinkCircuit]);

  const effectivePairKey = useMemo(() => {
    if (selectedBranchPairKey === 'all') return 'all';
    return filteredCrossBranchPairs.some((p) => p.pairKey === selectedBranchPairKey)
      ? selectedBranchPairKey
      : 'all';
  }, [selectedBranchPairKey, filteredCrossBranchPairs]);

  const filteredCrossBranchLinks = useMemo(() => {
    if (!summary) return [];
    return summary.crossBranchLinks.filter((lnk) => {
      if (crossLinkCircuit === 'historical' && !lnk.isHistoricalCircuit) return false;
      if (crossLinkCircuit === 'cultural' && lnk.isHistoricalCircuit) return false;
      if (effectivePairKey !== 'all' && lnk.pairKey !== effectivePairKey) return false;
      return true;
    });
  }, [summary, crossLinkCircuit, effectivePairKey]);

  if (!ruler || !summary) return null;

  const {
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
  } = summary;

  const lastHistoryItem = modalHistory.length > 0 ? modalHistory[modalHistory.length - 1] : null;
  const totalFiguresCount = contemporaryWriters.length + contemporaryScientists.length;
  const durationLabel = formatDurationYears(ruler.startYear, ruler.endYear);

  const preciseDateInfo = (() => {
    if (!ruler.startDate && !ruler.endDate) return null;
    const startParts = parsePreciseDate(ruler.startDate, ruler.startYear, false, {
      calendarStyle: ruler.calendarStyle,
      task: 'MAIN_RULERS',
    });
    const endParts = parsePreciseDate(ruler.endDate, ruler.endYear, true, {
      calendarStyle: ruler.calendarStyle,
      task: 'MAIN_RULERS',
    });
    if (startParts.precision === 'year' && endParts.precision === 'year') return null;
    return {
      start: startParts.precision !== 'year' ? formatCalendarDetailBadge(startParts) : null,
      end: endParts.precision !== 'year' ? formatCalendarDetailBadge(endParts) : null,
    };
  })();

  const displayedContemporaries = allContemporaries.slice(0, visibleContempCount);
  const displayedEvents = filteredReignEvents.slice(0, visibleEventsCount);
  const displayedCrossLinks = filteredCrossBranchLinks.slice(0, visibleCrossLinksCount);

  const selectClass =
    'h-8 px-2.5 pr-7 rounded-lg bg-slate-950/90 border border-slate-700/80 hover:border-slate-600 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400/60 cursor-pointer max-w-full';

  const tabs: Array<{ id: ModalTabId; label: string; count?: number; icon: React.ReactNode }> = [
    {
      id: 'biography',
      label: 'Биография и дела',
      icon: <ScrollText className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'people',
      label: 'Окружение',
      count: resolvedInnerCircle.length > 0 ? resolvedInnerCircle.length : totalFiguresCount + reignParticipants.length,
      icon: <Users className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'events',
      label: 'События и культура',
      count: reignEvents.length,
      icon: <Sparkles className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'analytics',
      label: 'Аналитика связей',
      count: crossBranchLinks.length,
      icon: <Network className="w-3.5 h-3.5 shrink-0" />,
    },
  ];

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="period-modal-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-2.5 sm:p-6 bg-slate-950/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl bg-[#0b1325] border border-amber-500/35 shadow-2xl flex flex-col overflow-hidden">
        {/* Верхняя навигационная шапка модального окна */}
        <DossierModalHeader
          lastHistoryItem={lastHistoryItem}
          onNavigateBack={onNavigateBack}
          onExportMarkdown={() => {
            const { filename, content } = formatRulerDossierToMarkdown(summary, branches);
            downloadMarkdownFile(filename, content);
          }}
          exportMarkdownTitle="Скачать досье правителя в Markdown (.md)"
          exportMarkdownAriaLabel="Скачать досье правителя в формате Markdown"
          onClose={onClose}
          closeAriaLabel="Закрыть досье правителя"
          context={
            <>
              <Crown className="w-4 h-4 text-amber-400 shrink-0" />
              <span
                className="font-mono text-xs sm:text-sm font-bold text-amber-300 truncate tabular-nums"
                title={`Досье правителя · ${ruler.reignPeriod}${ruler.center ? ` · ${ruler.center}` : ''}`}
              >
                Досье правителя · {ruler.reignPeriod}
              </span>
              {ruler.center && (
                <>
                  <span aria-hidden="true" className="text-slate-600 hidden sm:inline shrink-0">
                    ·
                  </span>
                  <span className="hidden sm:inline font-mono text-xs text-slate-300 truncate">
                    {ruler.center}
                  </span>
                </>
              )}
            </>
          }
          actions={
            <>
              {onCompareWithRuler && (
                <button
                  type="button"
                  onClick={() => onCompareWithRuler(ruler.id)}
                  className="h-8 px-3 rounded-lg border border-sky-500/40 bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 text-xs font-mono font-semibold inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                  title="Открыть сравнение этого правления с другим правлением или эпохой"
                >
                  <GitCompareArrows className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Сравнить с…</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onFilterByRuler(ruler.id);
                  onClose();
                }}
                className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold inline-flex items-center transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                Сфокусировать таймлайн
              </button>
            </>
          }
        />

        {/* Компактная музейно-архивная шапка личности правителя + полоса вкладок */}
        <div className="px-5 sm:px-6 pt-4 pb-0 border-b border-slate-800/90 bg-[#0d162c]/70 shrink-0">
          {/* Краткое имя и паспортные метаданные без пилюль */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3
                id="period-modal-title"
                className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight text-balance"
              >
                {ruler.ruler}
              </h3>
              <span className="font-mono text-xs sm:text-sm font-semibold text-amber-300 tabular-nums whitespace-nowrap shrink-0">
                Правление: {ruler.reignPeriod}
                {durationLabel && (
                  <span className="text-slate-400 font-normal"> ({durationLabel})</span>
                )}
              </span>
            </div>

            {/* Спокойная строка музейной атрибуции */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-slate-300 tabular-nums">
              {ruler.lifeYears && (
                <span>
                  <span className="text-slate-500">Годы жизни: </span>
                  <span className="text-slate-100">{ruler.lifeYears}</span>
                </span>
              )}
              {ruler.lifeYears && ruler.dynastyOrTitle && (
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
              )}
              {ruler.dynastyOrTitle && (
                <span className="text-slate-300">{ruler.dynastyOrTitle}</span>
              )}
            </div>

            {/* Точные календарные даты (если заданы с точностью до месяца/дня) */}
            {preciseDateInfo && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-mono tabular-nums text-slate-400">
                {preciseDateInfo.start && (
                  <span>
                    <span className="text-slate-500">Начало: </span>
                    <span
                      className={
                        preciseDateInfo.start.tone === 'gregorian'
                          ? 'text-sky-300'
                          : 'text-amber-300'
                      }
                    >
                      {preciseDateInfo.start.primaryText}
                    </span>
                    <span> ({preciseDateInfo.start.styleLabel})</span>
                    {preciseDateInfo.start.counterpartText && (
                      <span> · {preciseDateInfo.start.counterpartText}</span>
                    )}
                  </span>
                )}
                {preciseDateInfo.end && (
                  <span>
                    <span className="text-slate-500">Окончание: </span>
                    <span
                      className={
                        preciseDateInfo.end.tone === 'gregorian'
                          ? 'text-sky-300'
                          : 'text-amber-300'
                      }
                    >
                      {preciseDateInfo.end.primaryText}
                    </span>
                    <span> ({preciseDateInfo.end.styleLabel})</span>
                    {preciseDateInfo.end.counterpartText && (
                      <span> · {preciseDateInfo.end.counterpartText}</span>
                    )}
                  </span>
                )}
              </div>
            )}

            {/* Короткий тезис правления */}
            {ruler.reignThesis && (
              <p className="text-xs sm:text-sm text-slate-300/95 leading-relaxed pt-0.5 max-w-3xl">
                {ruler.reignThesis}
              </p>
            )}
          </div>

          {/* 4 последовательные вкладки изучения */}
          <div
            role="tablist"
            onKeyDown={handleTabKeyDown}
            aria-label="Разделы досье правителя"
            className="mt-4 -mb-px flex items-center gap-1 overflow-x-auto no-scrollbar"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  {...tabProps(tab.id)}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-3 py-2.5 text-xs font-mono font-semibold inline-flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/70 ${
                    isActive
                      ? 'border-amber-400 text-amber-300 bg-amber-500/8'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && tab.count > 0 && (
                    <span
                      className={`text-[11px] tabular-nums ${
                        isActive ? 'text-amber-200/90' : 'text-slate-500'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Прокручиваемое тело активной вкладки */}
        <div ref={bodyRef} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* ============================================================== */}
          {/* ВКЛАДКА 1: БИОГРАФИЯ, КЛЮЧЕВЫЕ ДЕЛА И ИТОГИ                    */}
          {/* ============================================================== */}
          {tabs.filter((tab) => tab.id !== activeTab).map(({ id }) => (
            <div key={id} {...panelProps(id)} />
          ))}
          {activeTab === 'biography' && (
            <div {...panelProps('biography')} className="space-y-6">
              {/* Биография */}
              <section className="space-y-2.5">
                <h4 className="text-[11px] font-mono uppercase tracking-widest text-amber-300/90 font-bold">
                  Личность и исторический путь
                </h4>
                <p className="text-sm sm:text-[15px] text-slate-100 leading-7 max-w-3xl">
                  {ruler.biography || ruler.reignThesis}
                </p>
              </section>

              {/* Родственные связи по поколениям с переходами и мини-справками */}
              {resolvedFamily.length > 0 && (
                <RulerKinshipSection
                  ruler={ruler}
                  relatives={resolvedFamily}
                  onOpenRulerModal={onOpenRulerModal}
                  onOpenPersonModal={onOpenPersonModal}
                />
              )}

              {/* Последовательный список конкретных дел */}
              {resolvedKeyActions.length > 0 && (
                <section className="space-y-3 pt-5 border-t border-slate-800/90">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-[11px] font-mono uppercase tracking-widest text-amber-300/90 font-bold">
                      Что сделано в правление · хронология ключевых шагов
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                      {resolvedKeyActions.length} этапов
                    </span>
                  </div>

                  <ol className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                    {resolvedKeyActions.map((action, idx) => (
                      <li
                        key={`${action.year}-${idx}`}
                        className="py-3.5 grid grid-cols-1 sm:grid-cols-[118px_1fr] gap-2 sm:gap-4 items-start"
                      >
                        <div className="flex sm:flex-col items-baseline gap-2 sm:gap-0.5 font-mono tabular-nums">
                          <span className="text-[11px] text-slate-500">
                            {formatStepNumber(idx)}
                          </span>
                          <span className="text-xs font-bold text-amber-300">{action.year}</span>
                        </div>

                        <div className="space-y-1.5 min-w-0">
                          <div className="text-sm sm:text-[15px] font-semibold text-white leading-snug">
                            {action.title}
                          </div>
                          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                            {action.summary}
                          </p>
                          {action.linkedEvent && (
                            <button
                              type="button"
                              onClick={() => onSelectCard(action.linkedEvent!.id)}
                              className="mt-1 inline-flex items-center gap-1.5 text-xs font-mono text-sky-300 hover:text-sky-200 transition-colors cursor-pointer"
                            >
                              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                              <span className="underline decoration-sky-500/40 underline-offset-4">
                                Подробнее в карточке события: {action.linkedEvent.title}
                              </span>
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* Влияние и наследие */}
              {ruler.legacy && (
                <section className="space-y-2 pt-1">
                  <h4 className="text-[11px] font-mono uppercase tracking-widest text-emerald-300/90 font-bold">
                    Историческое влияние и наследие
                  </h4>
                  <p className="text-sm sm:text-[15px] text-slate-200 leading-7 max-w-3xl">
                    {ruler.legacy}
                  </p>
                </section>
              )}

              {/* Быстрые переходы к следующим шагам изучения */}
              <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-3 text-xs font-mono">
                <span className="text-slate-500">Далее по досье:</span>
                <button
                  type="button"
                  onClick={() => handleTabChange('people')}
                  className="text-sky-300 hover:text-sky-200 inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Окружение и роли ({resolvedInnerCircle.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <span aria-hidden="true" className="text-slate-700">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => handleTabChange('events')}
                  className="text-amber-300 hover:text-amber-200 inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>События и культура ({reignEvents.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Сворачиваемый справочный аппарат */}
              {ruler.sources && ruler.sources.length > 0 && (
                <CollapsibleSection
                  title="Справочный аппарат и историография"
                  count={ruler.sources.length}
                  icon={<BookMarked className="w-3.5 h-3.5 text-slate-400" />}
                  accentTextClass="text-slate-300"
                  isOpen={showSources}
                  onToggle={() => setShowSources((prev) => !prev)}
                >
                  <div className="pt-2">
                    <SourcesApparatusSection sources={ruler.sources} />
                  </div>
                </CollapsibleSection>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* ВКЛАДКА 2: ОКРУЖЕНИЕ (БЛИЖНИЙ КРУГ + СОВРЕМЕННИКИ)             */}
          {/* ============================================================== */}
          {activeTab === 'people' && (
            <div {...panelProps('people')} className="space-y-6">
              {/* Блок 1: Ближний круг с явным объяснением связи */}
              <section className="space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="space-y-0.5">
                    <h4 className="text-[11px] font-mono uppercase tracking-widest text-amber-300/90 font-bold">
                      Ближний круг, соратники и оппоненты ({filteredInnerCircle.length})
                    </h4>
                    <p className="text-xs text-slate-400">
                      Ключевые фигуры с явным указанием их роли и характера отношений с правителем
                    </p>
                  </div>

                  {resolvedInnerCircle.length > 0 && (
                    <select
                      aria-label="Фильтр по типу отношений"
                      value={relationFilter}
                      onChange={(e) => setRelationFilter(e.target.value as RelationFilter)}
                      className={selectClass}
                    >
                      <option value="all">
                        Все роли ({resolvedInnerCircle.length})
                      </option>
                      {(Object.keys(RELATION_META) as RulerRelationType[]).map((relKey) => {
                        const cnt = innerCircleRelationCounts[relKey] ?? 0;
                        if (cnt === 0) return null;
                        return (
                          <option key={relKey} value={relKey}>
                            {RELATION_META[relKey].filterLabel} ({cnt})
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                {filteredInnerCircle.length > 0 ? (
                  <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                    {filteredInnerCircle.map((member) => {
                      const meta = RELATION_META[member.relationType];
                      const canOpenRuler = Boolean(member.linkedRulerId && onOpenRulerModal);
                      const canOpenDossier = !canOpenRuler && Boolean(member.personKey && onOpenPersonModal);
                      return (
                        <div key={member.name} className="py-3.5 space-y-1.5">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
                              {canOpenRuler ? (
                                <button
                                  type="button"
                                  onClick={() => onOpenRulerModal!(member.linkedRulerId!)}
                                  className="font-serif text-lg font-bold text-white hover:text-amber-200 underline decoration-amber-500/40 underline-offset-4 transition-colors cursor-pointer text-left"
                                >
                                  {member.name}
                                </button>
                              ) : canOpenDossier ? (
                                <button
                                  type="button"
                                  onClick={() => onOpenPersonModal!(member.personKey!)}
                                  className="font-serif text-lg font-bold text-white hover:text-sky-200 underline decoration-sky-500/35 underline-offset-4 transition-colors cursor-pointer text-left"
                                >
                                  {member.name}
                                </button>
                              ) : (
                                <span className="font-serif text-lg font-bold text-white">
                                  {member.name}
                                </span>
                              )}
                              <span aria-hidden="true" className="text-slate-600 text-xs">
                                ·
                              </span>
                              <span className={`text-xs font-mono font-semibold ${meta.textClass}`}>
                                {meta.label}
                              </span>
                            </div>

                            {canOpenRuler ? (
                              <button
                                type="button"
                                onClick={() => onOpenRulerModal!(member.linkedRulerId!)}
                                className="text-[11px] font-mono text-amber-300 hover:text-amber-200 inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
                              >
                                <Crown className="w-3 h-3" />
                                <span>
                                  Правитель{member.linkedRulerPeriod ? ` · ${member.linkedRulerPeriod}` : ''}
                                </span>
                              </button>
                            ) : canOpenDossier ? (
                              <button
                                type="button"
                                onClick={() => onOpenPersonModal!(member.personKey!)}
                                className="text-[11px] font-mono text-sky-300 hover:text-sky-200 inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
                              >
                                <User className="w-3 h-3" />
                                <span>
                                  Досье ({member.totalEventCount})
                                </span>
                              </button>
                            ) : null}
                          </div>

                          <div className="text-xs font-mono text-slate-400">{member.role}</div>
                          <p className="text-xs sm:text-sm text-slate-200/95 leading-relaxed max-w-3xl">
                            {member.connection}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-2">
                    По выбранной категории ролей записей не найдено.
                  </p>
                )}
              </section>

              {/* Блок 2: Современники и участники событий эпохи (компактный каталог с фильтрами) */}
              {(totalFiguresCount > 0 || reignParticipants.length > 0) && (
                <section className="space-y-3.5 pt-2">
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-mono uppercase tracking-widest text-sky-300/90 font-bold">
                      Современники, деятели культуры и участники событий ({allContemporaries.length})
                    </h4>
                    <p className="text-xs text-slate-400">
                      Писатели, учёные и исторические лица, упоминаемые в событиях этих лет (не обязательно входившие в личное окружение)
                    </p>
                  </div>

                  {/* Компактная строка фильтров */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Категория современников"
                      value={contempCategory}
                      onChange={(e) => {
                        setContempCategory(e.target.value as ContemporariesCategoryFilter);
                        setVisibleContempCount(12);
                      }}
                      className={selectClass}
                    >
                      <option value="all">
                        Все категории ({totalFiguresCount + reignParticipants.length})
                      </option>
                      <option value="writers">
                        Писатели и мыслители ({contemporaryWriters.length})
                      </option>
                      <option value="scientists">
                        Учёные и изобретатели ({contemporaryScientists.length})
                      </option>
                      <option value="participants">
                        Участники событий правления ({reignParticipants.length})
                      </option>
                    </select>

                    <div className="relative flex-1 min-w-[180px] max-w-xs">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="search"
                        value={peopleSearch}
                        onChange={(e) => {
                          setPeopleSearch(e.target.value);
                          setVisibleContempCount(12);
                        }}
                        placeholder="Поиск по имени…"
                        className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-950/90 border border-slate-700/80 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                      />
                    </div>
                  </div>

                  {displayedContemporaries.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {displayedContemporaries.map((item) => {
                          const handleOpen = () => {
                            if (item.kind === 'participant') {
                              onOpenPersonModal?.(item.personKey);
                            } else {
                              onSelectCard(item.eventId);
                            }
                          };
                          const accentClass =
                            item.kind === 'scientist'
                              ? 'text-sky-300'
                              : item.kind === 'writer'
                                ? 'text-amber-300'
                                : 'text-slate-400';

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={handleOpen}
                              className="text-left p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/90 hover:border-slate-700 transition-colors cursor-pointer space-y-1"
                            >
                              <div className={`text-[11px] font-mono tabular-nums flex items-center gap-1.5 ${accentClass}`}>
                                {item.kind === 'scientist' ? (
                                  <FlaskConical className="w-3 h-3 shrink-0" />
                                ) : item.kind === 'writer' ? (
                                  <Feather className="w-3 h-3 shrink-0" />
                                ) : (
                                  <User className="w-3 h-3 shrink-0 text-sky-400" />
                                )}
                                <span className="truncate">{item.meta}</span>
                              </div>
                              <div className="text-sm font-semibold text-white leading-snug">
                                {item.name}
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-1">{item.subtitle}</p>
                            </button>
                          );
                        })}
                      </div>

                      {allContemporaries.length > 12 && (
                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono pt-1">
                          {visibleContempCount < allContemporaries.length && (
                            <button
                              type="button"
                              onClick={() => setVisibleContempCount((prev) => prev + 24)}
                              className="text-sky-300 hover:text-sky-200 transition-colors cursor-pointer tabular-nums"
                            >
                              Показать ещё (осталось {allContemporaries.length - visibleContempCount})
                            </button>
                          )}
                          {visibleContempCount > 12 && (
                            <button
                              type="button"
                              onClick={() => setVisibleContempCount(12)}
                              className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                            >
                              Свернуть список
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 py-2">
                      По вашему запросу среди современников ничего не найдено.
                    </p>
                  )}
                </section>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* ВКЛАДКА 3: СОБЫТИЯ И КУЛЬТУРА (КОМПАКТНЫЕ ВЫПАДАЮЩИЕ ФИЛЬТРЫ)  */}
          {/* ============================================================== */}
          {activeTab === 'events' && (
            <div {...panelProps('events')} className="space-y-5">
              {/* Компактная панель выпадающих фильтров */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="text-[11px] font-mono uppercase tracking-widest text-amber-300/90 font-bold tabular-nums">
                    Исторические события в годы правления ({filteredReignEvents.length} из {reignEvents.length})
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Фильтр по исторической ветке"
                    value={selectedBranchId}
                    onChange={(e) => {
                      setSelectedBranchId(e.target.value);
                      setVisibleEventsCount(12);
                    }}
                    className={selectClass}
                  >
                    <option value="all">Все ветки ({reignEvents.length})</option>
                    {reignBranchesWithCounts.map(({ branch, count }) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.label} ({count})
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Отношение к рубежам правления"
                    value={eventScope}
                    onChange={(e) => {
                      setEventScope(e.target.value as EventScopeFilter);
                      setVisibleEventsCount(12);
                    }}
                    className={selectClass}
                  >
                    <option value="all">Все процессы ({reignEvents.length})</option>
                    <option value="started">Начались в правление ({startedInReign.length})</option>
                    {inheritedEvents.length > 0 && (
                      <option value="inherited">
                        Перешли от предшественников ({inheritedEvents.length})
                      </option>
                    )}
                    {carryOverEvents.length > 0 && (
                      <option value="carryOver">
                        Продолжились после {ruler.endYear} ({carryOverEvents.length})
                      </option>
                    )}
                  </select>

                  <select
                    aria-label="Сортировка событий"
                    value={eventsSortMode}
                    onChange={(e) => setEventsSortMode(e.target.value as ReignEventsSortMode)}
                    className={selectClass}
                  >
                    <option value="chronological">По хронологии</option>
                    <option value="links">По числу связей</option>
                  </select>

                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={eventsSearch}
                      onChange={(e) => {
                        setEventsSearch(e.target.value);
                        setVisibleEventsCount(12);
                      }}
                      placeholder="Поиск события…"
                      className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-950/90 border border-slate-700/80 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                    />
                  </div>
                </div>
              </div>

              {/* Список событий с постраничным раскрытием */}
              {displayedEvents.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="rounded-xl bg-slate-900/50 border border-slate-800/90 divide-y divide-slate-800/75 overflow-hidden">
                    {displayedEvents.map((ev) => {
                      const branch = branchMap.get(ev.task);
                      const isInherited = ev.startYear < ruler.startYear;
                      const isCarryOver = ev.endYear > ruler.endYear;

                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => onSelectCard(ev.id)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-800/55 transition-colors cursor-pointer block space-y-1"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                              <span
                                className="font-bold shrink-0"
                                style={{ color: branch?.color ?? '#fbbf24' }}
                              >
                                {ev.period}
                              </span>
                              <span aria-hidden="true" className="text-slate-600">
                                ·
                              </span>
                              <span className="text-slate-400 truncate">
                                {branch?.label ?? ev.task}
                              </span>
                              {isInherited && (
                                <>
                                  <span aria-hidden="true" className="text-slate-600">
                                    ·
                                  </span>
                                  <span className="text-sky-300/90">
                                    началось до {ruler.startYear}
                                  </span>
                                </>
                              )}
                              {isCarryOver && (
                                <>
                                  <span aria-hidden="true" className="text-slate-600">
                                    ·
                                  </span>
                                  <span className="text-amber-300/90">
                                    продолжилось после {ruler.endYear}
                                  </span>
                                </>
                              )}
                            </div>

                            {ev.explicitLinks.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-emerald-300/90 shrink-0">
                                <Link2 className="w-3 h-3" />
                                <span>{ev.explicitLinks.length}</span>
                              </span>
                            )}
                          </div>

                          <div className="text-sm font-semibold text-white leading-snug">
                            {ev.title}
                          </div>
                          {ev.outcome ? (
                            <p className="text-xs text-slate-300/90 line-clamp-2">
                              <span className="text-amber-300/90">Итог: </span>
                              {ev.outcome}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 line-clamp-2">{ev.subtitle}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {filteredReignEvents.length > 12 && (
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                      {visibleEventsCount < filteredReignEvents.length && (
                        <>
                          <button
                            type="button"
                            onClick={() => setVisibleEventsCount((prev) => prev + 20)}
                            className="text-amber-300 hover:text-amber-200 transition-colors cursor-pointer tabular-nums"
                          >
                            Показать ещё 20 (осталось {filteredReignEvents.length - visibleEventsCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => setVisibleEventsCount(filteredReignEvents.length)}
                            className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer tabular-nums"
                          >
                            Показать все ({filteredReignEvents.length})
                          </button>
                        </>
                      )}
                      {visibleEventsCount > 12 && (
                        <button
                          type="button"
                          onClick={() => setVisibleEventsCount(12)}
                          className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          Свернуть список
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-3">
                  По выбранным фильтрам событий не найдено.
                </p>
              )}

              {/* 3 сворачиваемых блока культуры и науки (по умолчанию свёрнуты) */}
              {(discoveriesInPeriod.length > 0 ||
                worksWrittenInPeriod.length > 0 ||
                worksAboutPeriod.length > 0) && (
                <div className="space-y-2.5 pt-3 border-t border-slate-800/80">
                  <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                    Наука, литература и память об эпохе
                  </div>

                  {discoveriesInPeriod.length > 0 && (
                    <CollapsibleSection
                      title="Научные открытия и институты в годы правления"
                      count={discoveriesInPeriod.length}
                      icon={<FlaskConical className="w-3.5 h-3.5 text-sky-400" />}
                      accentTextClass="text-sky-300"
                      isOpen={openDiscoveries}
                      onToggle={() => setOpenDiscoveries((prev) => !prev)}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {discoveriesInPeriod.map((disc) => (
                          <button
                            key={disc.id}
                            type="button"
                            onClick={() => onSelectCard(disc.id)}
                            className="text-left p-2.5 rounded-lg bg-slate-950/75 hover:bg-slate-900 border border-slate-800 hover:border-sky-400/50 transition-colors cursor-pointer space-y-0.5"
                          >
                            <div className="text-[11px] font-mono font-bold text-sky-300 tabular-nums">
                              {disc.period}
                            </div>
                            <div className="text-xs sm:text-sm font-semibold text-white">
                              {disc.title}
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2">{disc.subtitle}</p>
                          </button>
                        ))}
                      </div>
                    </CollapsibleSection>
                  )}

                  {worksWrittenInPeriod.length > 0 && (
                    <CollapsibleSection
                      title="Книги и произведения, созданные в годы правления"
                      count={worksWrittenInPeriod.length}
                      icon={<BookOpen className="w-3.5 h-3.5 text-orange-400" />}
                      accentTextClass="text-orange-300"
                      isOpen={openWorksInPeriod}
                      onToggle={() => setOpenWorksInPeriod((prev) => !prev)}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {worksWrittenInPeriod.map((work) => (
                          <button
                            key={work.id}
                            type="button"
                            onClick={() => onSelectCard(work.id)}
                            className="text-left p-2.5 rounded-lg bg-slate-950/75 hover:bg-slate-900 border border-slate-800 hover:border-orange-400/50 transition-colors cursor-pointer space-y-0.5"
                          >
                            <div className="text-[11px] font-mono font-bold text-orange-300 tabular-nums">
                              {work.period}
                            </div>
                            <div className="text-xs sm:text-sm font-semibold text-white">
                              {work.title}
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2">{work.subtitle}</p>
                          </button>
                        ))}
                      </div>
                    </CollapsibleSection>
                  )}

                  {worksAboutPeriod.length > 0 && (
                    <CollapsibleSection
                      title="Произведения об этом правителе и эпохе (написанные позднее)"
                      count={worksAboutPeriod.length}
                      icon={<BookMarked className="w-3.5 h-3.5 text-violet-400" />}
                      accentTextClass="text-violet-300"
                      isOpen={openWorksAboutPeriod}
                      onToggle={() => setOpenWorksAboutPeriod((prev) => !prev)}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {worksAboutPeriod.map((work) => (
                          <button
                            key={work.id}
                            type="button"
                            onClick={() => onSelectCard(work.id)}
                            className="text-left p-2.5 rounded-lg bg-slate-950/75 hover:bg-slate-900 border border-slate-800 hover:border-violet-400/50 transition-colors cursor-pointer space-y-0.5"
                          >
                            <div className="text-[11px] font-mono font-bold text-violet-300 tabular-nums">
                              Издано: {work.period}
                            </div>
                            <div className="text-xs sm:text-sm font-semibold text-white">
                              {work.title}
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2">{work.subtitle}</p>
                          </button>
                        ))}
                      </div>
                    </CollapsibleSection>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* ВКЛАДКА 4: АНАЛИТИКА СВЯЗЕЙ ГРАФА                              */}
          {/* ============================================================== */}
          {activeTab === 'analytics' && (
            <div {...panelProps('analytics')} className="space-y-6">
              {/* 3 компактных сводных показателя */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="rounded-xl bg-slate-900/75 border border-slate-800 p-3">
                  <div className="text-slate-400">Новых событий в правление</div>
                  <div className="text-lg font-bold text-amber-400 mt-0.5 tabular-nums">
                    {startedInReign.length}
                  </div>
                  <div className="text-[11px] text-slate-500 tabular-nums">
                    всего процессов в период: {reignEvents.length}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900/75 border border-slate-800 p-3">
                  <div className="text-slate-400">Культура и наука периода</div>
                  <div className="text-lg font-bold text-sky-400 mt-0.5 tabular-nums">
                    {totalFiguresCount} лиц · {worksWrittenInPeriod.length + discoveriesInPeriod.length} пам.
                  </div>
                  <div className="text-[11px] text-slate-500 tabular-nums">
                    книг: {worksWrittenInPeriod.length} · открытий: {discoveriesInPeriod.length}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900/75 border border-slate-800 p-3">
                  <div className="text-slate-400">Сквозные процессы</div>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5 tabular-nums">
                    {inheritedEvents.length} вх. / {carryOverEvents.length} исх.
                  </div>
                  <div className="text-[11px] text-slate-500">перешли через рубежи правления</div>
                </div>
              </div>

              {/* Наиболее связанные узлы графа с чётким пояснением */}
              {topConnectedEvents.length > 0 && (
                <section className="space-y-2.5">
                  <div className="space-y-0.5">
                    <h4 className="text-[11px] font-mono uppercase tracking-widest text-emerald-300/90 font-bold">
                      Наиболее связанные узлы графа в этот период
                    </h4>
                    <p className="text-xs text-slate-400">
                      События с наибольшим числом перекрёстных ссылок между ветками (хронология личных шагов правителя находится во вкладке «Биография и дела»)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {topConnectedEvents.map((ev) => {
                      const b = branchMap.get(ev.task);
                      const crossCount = ev.explicitLinks.filter(
                        (l) => l.targetEvent.task !== ev.task,
                      ).length;
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => onSelectCard(ev.id)}
                          className="text-left p-3 rounded-xl bg-slate-900/65 hover:bg-slate-900 border border-slate-800 hover:border-emerald-400/55 transition-colors cursor-pointer space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                            <span
                              style={{ color: b?.color ?? '#fbbf24' }}
                              className="font-bold truncate"
                            >
                              {ev.period} · {b?.label ?? ev.task}
                            </span>
                            <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold shrink-0">
                              <Link2 className="w-3 h-3" />
                              <span>{ev.explicitLinks.length}</span>
                              {crossCount > 0 && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({crossCount} межветв.)
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-white">{ev.title}</div>
                          {ev.outcome ? (
                            <p className="text-xs text-slate-300 line-clamp-2">
                              <span className="text-amber-300/90">Итог: </span>
                              {ev.outcome}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 line-clamp-2">{ev.subtitle}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Межветвевые связи правления через 2 компактных выпадающих фильтра */}
              {crossBranchLinks.length > 0 && (
                <section className="space-y-3 pt-4 border-t border-slate-800/80">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-300/90 font-bold inline-flex items-center gap-2 tabular-nums">
                      <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        Межветвевые связи правления ({filteredCrossBranchLinks.length} из {crossBranchLinks.length})
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Фильтр по контуру связей"
                      value={crossLinkCircuit}
                      onChange={(e) => {
                        setCrossLinkCircuit(e.target.value as CrossLinkCircuitFilter);
                        setSelectedBranchPairKey('all');
                        setVisibleCrossLinksCount(8);
                      }}
                      className={selectClass}
                    >
                      <option value="all">Все контуры ({crossBranchLinks.length})</option>
                      {historicalCrossCount > 0 && (
                        <option value="historical">
                          Политика, экономика, войны ({historicalCrossCount})
                        </option>
                      )}
                      {culturalCrossCount > 0 && (
                        <option value="cultural">
                          Культура и наука ({culturalCrossCount})
                        </option>
                      )}
                    </select>

                    {filteredCrossBranchPairs.length > 0 && (
                      <select
                        aria-label="Фильтр по паре веток"
                        value={effectivePairKey}
                        onChange={(e) => {
                          setSelectedBranchPairKey(e.target.value);
                          setVisibleCrossLinksCount(8);
                        }}
                        className={`${selectClass} flex-1 min-w-[220px] max-w-md`}
                      >
                        <option value="all">
                          Все пары веток ({filteredCrossBranchPairs.length})
                        </option>
                        {filteredCrossBranchPairs.map((pair) => (
                          <option key={pair.pairKey} value={pair.pairKey}>
                            {pair.branchALabel} ↔ {pair.branchBLabel} ({pair.count})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="rounded-xl bg-slate-950/70 border border-slate-800/90 divide-y divide-slate-800/75 overflow-hidden">
                    {displayedCrossLinks.map((lnk) => {
                      const fromBranch = branchMap.get(lnk.fromEvent.task);
                      const toBranch = branchMap.get(lnk.toEvent.task);
                      const fromExternalNote = !lnk.isFromInReign
                        ? lnk.fromEvent.endYear < ruler.startYear
                          ? 'до правления'
                          : 'вне правления'
                        : null;
                      const toExternalNote = !lnk.isToInReign
                        ? lnk.toEvent.startYear > ruler.endYear
                          ? 'после правления'
                          : 'вне правления'
                        : null;

                      return (
                        <div key={lnk.id} className="p-3 space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-stretch gap-2">
                            <button
                              type="button"
                              onClick={() => onSelectCard(lnk.fromEvent.id)}
                              className="text-left p-2.5 rounded-lg bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-600 transition-colors cursor-pointer space-y-1 min-w-0"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-mono tabular-nums">
                                <span
                                  className="font-bold truncate"
                                  style={{ color: fromBranch?.color ?? '#38bdf8' }}
                                >
                                  {lnk.fromEvent.period} · {fromBranch?.label ?? lnk.fromEvent.task}
                                </span>
                                {fromExternalNote && (
                                  <span className="text-[10px] text-amber-300/90 shrink-0">
                                    {fromExternalNote}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-semibold text-white leading-snug">
                                {lnk.fromEvent.title}
                              </div>
                            </button>

                            <div className="flex sm:flex-col items-center justify-center gap-1 px-2 py-1 text-[11px] font-mono text-slate-400 shrink-0">
                              <span className="text-emerald-300/90 text-center max-w-[140px] leading-tight">
                                {lnk.roleLabel}
                              </span>
                              {lnk.isDirectional ? (
                                <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <span className="text-emerald-400 font-bold">↔</span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => onSelectCard(lnk.toEvent.id)}
                              className="text-left p-2.5 rounded-lg bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-600 transition-colors cursor-pointer space-y-1 min-w-0"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-mono tabular-nums">
                                <span
                                  className="font-bold truncate"
                                  style={{ color: toBranch?.color ?? '#10b981' }}
                                >
                                  {lnk.toEvent.period} · {toBranch?.label ?? lnk.toEvent.task}
                                </span>
                                {toExternalNote && (
                                  <span className="text-[10px] text-amber-300/90 shrink-0">
                                    {toExternalNote}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-semibold text-white leading-snug">
                                {lnk.toEvent.title}
                              </div>
                            </button>
                          </div>

                          {lnk.description && (
                            <p className="text-xs text-slate-300 leading-relaxed pl-0.5">
                              {lnk.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {filteredCrossBranchLinks.length > 8 && (
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
                      {visibleCrossLinksCount < filteredCrossBranchLinks.length && (
                        <>
                          <button
                            type="button"
                            onClick={() => setVisibleCrossLinksCount((prev) => prev + 16)}
                            className="text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer"
                          >
                            Показать ещё 16 (осталось{' '}
                            {filteredCrossBranchLinks.length - visibleCrossLinksCount})
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setVisibleCrossLinksCount(filteredCrossBranchLinks.length)
                            }
                            className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            Показать все ({filteredCrossBranchLinks.length})
                          </button>
                        </>
                      )}
                      {visibleCrossLinksCount > 8 && (
                        <button
                          type="button"
                          onClick={() => setVisibleCrossLinksCount(8)}
                          className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          Свернуть список
                        </button>
                      )}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
