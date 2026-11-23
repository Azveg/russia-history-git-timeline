import { useDossierTabs } from '../hooks/useDossierTabs';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Compass,
  Crosshair,
  Crown,
  FlaskConical,
  GitBranch,
  Globe2,
  History,
  Layers,
  Link2,
  MapPin,
  ScrollText,
  Search,
  Shield,
  Swords,
  User,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { SourcesApparatusSection } from './AcademicCitationBar';
import { DossierModalHeader } from './DossierModalHeader';
import { downloadMarkdownFile, formatCardToMarkdown } from '../utils/markdownExport';
import { classifyEventMacroRegions, getMacroRegionOption } from '../engine/regionFilter';
import {
  findMacroEraForYear,
  formatCalendarDetailBadge,
  isBiographyNode,
  isLiteraryWorkNode,
  isScienceDiscoveryNode,
  resolveMacroEras,
  resolvePersonKey,
} from '../engine/timelineEngine';
import type {
  BranchDefinition,
  CampaignPackRegistryEntry,
  EnrichedEvent,
  MacroEra,
  MacroRegionId,
  ModalHistoryItem,
  PersonDossier,
  RulerPeriod,
} from '../types/timeline';

interface CardDetailModalProps {
  card: EnrichedEvent | null;
  enrichedEvents: EnrichedEvent[];
  matchingEvents?: EnrichedEvent[];
  branches: BranchDefinition[];
  activeBranches?: Record<string, boolean>;
  eras?: MacroEra[];
  personDossiers?: Map<string, PersonDossier>;
  focusedEventId: string | null;
  selectedMacroRegion?: MacroRegionId;
  modalHistory?: ModalHistoryItem[];
  onClose: () => void;
  onNavigateBack?: () => void;
  onSelectCard: (id: string) => void;
  onJumpToTimelineRow: (id: string) => void;
  onRevealBranch?: (branchId: string) => void;
  onToggleFocusEvent: (id: string) => void;
  onFilterByRuler: (rulerId: string) => void;
  onFilterByMacroRegion?: (region: MacroRegionId) => void;
  onOpenPersonModal?: (personKeyOrName: string) => void;
  onFilterByPerson?: (personName: string) => void;
  onOpenRulerModal?: (rulerId: string) => void;
  onOpenEraModal?: (eraId: string) => void;
  linkedCampaignPack?: CampaignPackRegistryEntry | null;
  onOpenCampaign?: (campaignId: string) => void;
  onOpenCausalTracer?: (eventId: string) => void;
}

type CardModalTabId = 'details' | 'links' | 'concurrent';
type LinksCategoryFilter = 'all' | 'prerequisites' | 'consequences' | 'cultural';

const EVENT_TYPE_LABELS: Record<string, string> = {
  war: 'Военная кампания',
  treaty: 'Дипломатический договор',
  reform: 'Государственная реформа',
  economy: 'Экономика и финансы',
  crisis: 'Политический / социальный кризис',
  culture: 'Культура и мысль',
  biography: 'Биография (лицо эпохи)',
  book: 'Литературное произведение',
  science: 'Научное открытие / институт',
  world: 'Мировой контекст',
};

interface GroupedCardLink {
  category: Exclude<LinksCategoryFilter, 'all'>;
  otherId: string;
  otherEvent: EnrichedEvent;
  badge: string;
  directionMark: string;
  label: string;
}

export function CardDetailModal({
  card,
  enrichedEvents,
  matchingEvents,
  branches,
  activeBranches,
  eras = [],
  personDossiers,
  focusedEventId,
  selectedMacroRegion = 'all',
  modalHistory = [],
  onClose,
  onNavigateBack,
  onSelectCard,
  onJumpToTimelineRow,
  onRevealBranch,
  onToggleFocusEvent,
  onFilterByRuler,
  onFilterByMacroRegion,
  onOpenPersonModal,
  onFilterByPerson,
  onOpenRulerModal,
  onOpenEraModal,
  linkedCampaignPack = null,
  onOpenCampaign,
  onOpenCausalTracer,
}: CardDetailModalProps) {
  const [activeTab, setActiveTab] = useState<CardModalTabId>('details');
  const { handleTabKeyDown, tabProps, panelProps } = useDossierTabs(activeTab);
  const [linksCategory, setLinksCategory] = useState<LinksCategoryFilter>('all');
  const [concurrentBranchFilter, setConcurrentBranchFilter] = useState<string>('ALL');
  const [concurrentOnlyLinked, setConcurrentOnlyLinked] = useState(false);
  const [concurrentSearch, setConcurrentSearch] = useState('');
  const [visibleConcurrentCount, setVisibleConcurrentCount] = useState(12);

  const bodyRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab('details');
    setLinksCategory('all');
    setConcurrentBranchFilter('ALL');
    setConcurrentOnlyLinked(false);
    setConcurrentSearch('');
    setVisibleConcurrentCount(12);
    bodyRef.current?.scrollTo({ top: 0 });
  }, [card?.id]);

  const dialogRef = useModalFocusTrap<HTMLDivElement>(onClose);

  const scrollToTabsIfNeeded = () => {
    const body = bodyRef.current;
    const tabsEl = tabBarRef.current;
    if (!body || !tabsEl) return;
    const targetTop = Math.max(0, tabsEl.offsetTop - 8);
    if (body.scrollTop > targetTop) {
      body.scrollTo({ top: targetTop });
    }
  };

  const handleTabChange = (nextTab: CardModalTabId) => {
    setActiveTab(nextTab);
    scrollToTabsIfNeeded();
  };

  const resolvedEras = useMemo(() => resolveMacroEras(eras), [eras]);
  const branchById = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);
  const eventById = useMemo(
    () => new Map(enrichedEvents.map((ev) => [ev.id, ev])),
    [enrichedEvents],
  );

  const explicitOtherIdSet = useMemo(
    () => new Set(card ? card.explicitLinks.map((l) => l.otherId) : []),
    [card],
  );

  const concurrentBranchOptions = useMemo(() => {
    if (!card || card.concurrentEvents.length === 0) return [];
    const counts = new Map<string, number>();
    card.concurrentEvents.forEach((ev) => {
      counts.set(ev.task, (counts.get(ev.task) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([branchId, count]) => {
        const b = branchById.get(branchId);
        return {
          branchId,
          label: b?.label || branchId,
          count,
        };
      })
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru'));
  }, [card, branchById]);

  const concurrentLinkedCount = useMemo(() => {
    if (!card) return 0;
    return card.concurrentEvents.filter((ev) => explicitOtherIdSet.has(ev.id)).length;
  }, [card, explicitOtherIdSet]);

  const filteredConcurrentEvents = useMemo(() => {
    if (!card) return [];
    const q = concurrentSearch.trim().toLowerCase();
    const list = card.concurrentEvents.filter((ev) => {
      if (concurrentBranchFilter !== 'ALL' && ev.task !== concurrentBranchFilter) return false;
      if (concurrentOnlyLinked && !explicitOtherIdSet.has(ev.id)) return false;
      if (q) {
        const branchLabel = branchById.get(ev.task)?.label ?? ev.task;
        const hay = `${ev.title} ${ev.subtitle ?? ''} ${ev.period} ${branchLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      const aLinked = explicitOtherIdSet.has(a.id) ? 1 : 0;
      const bLinked = explicitOtherIdSet.has(b.id) ? 1 : 0;
      if (bLinked !== aLinked) return bLinked - aLinked;
      if (a.startYear !== b.startYear) return a.startYear - b.startYear;
      return a.endYear - b.endYear;
    });
  }, [card, concurrentBranchFilter, concurrentOnlyLinked, concurrentSearch, explicitOtherIdSet, branchById]);

  if (!card) return null;

  const branchObj = branchById.get(card.task) || branches[0];
  const parentBranchObj = branchObj?.parentBranchId
    ? branchById.get(branchObj.parentBranchId) ?? null
    : null;

  const macroEra = findMacroEraForYear(card.startYear, resolvedEras);

  const navigationPool =
    matchingEvents && matchingEvents.some((e) => e.id === card.id) ? matchingEvents : enrichedEvents;
  const currentIndex = navigationPool.findIndex((e) => e.id === card.id);
  const prevCard = currentIndex > 0 ? navigationPool[currentIndex - 1] : null;
  const nextCard =
    currentIndex >= 0 && currentIndex < navigationPool.length - 1
      ? navigationPool[currentIndex + 1]
      : null;

  const isFocused = focusedEventId === card.id;
  const isBio = isBiographyNode(card);
  const isWork = isLiteraryWorkNode(card);
  const isDiscovery = isScienceDiscoveryNode(card);
  const lastHistoryItem = modalHistory.length > 0 ? modalHistory[modalHistory.length - 1] : null;

  // Группировка связей на 3 смысловых блока
  const culturalReflectionIds = new Set<string>();
  const culturalReflectionItems: GroupedCardLink[] = [];

  card.retrospectiveLinks.forEach((rLink) => {
    const otherEv = eventById.get(rLink.otherId);
    if (otherEv && !culturalReflectionIds.has(otherEv.id)) {
      culturalReflectionIds.add(otherEv.id);
      culturalReflectionItems.push({
        category: 'cultural',
        otherId: otherEv.id,
        otherEvent: otherEv,
        badge:
          rLink.direction === 'depicts'
            ? 'Повествует об эпохе / событии'
            : 'Отражено в произведении',
        directionMark: rLink.direction === 'depicts' ? '←' : '→',
        label: rLink.label,
      });
    }
  });

  const prerequisiteLinks: GroupedCardLink[] = [];
  const consequenceLinks: GroupedCardLink[] = [];

  card.explicitLinks.forEach((link) => {
    const otherEv = link.targetEvent ?? eventById.get(link.otherId);
    if (!otherEv) return;

    const isOtherCulturalOrScientific =
      isBiographyNode(otherEv) || isLiteraryWorkNode(otherEv) || isScienceDiscoveryNode(otherEv);

    if (isOtherCulturalOrScientific && !isBio && !isWork && !isDiscovery) {
      if (!culturalReflectionIds.has(otherEv.id)) {
        culturalReflectionIds.add(otherEv.id);
        culturalReflectionItems.push({
          category: 'cultural',
          otherId: otherEv.id,
          otherEvent: otherEv,
          badge: isScienceDiscoveryNode(otherEv)
            ? 'Наука и технологии'
            : isLiteraryWorkNode(otherEv)
              ? 'Литературный памятник'
              : 'Лицо эпохи',
          directionMark: link.direction === 'incoming' ? '←' : '→',
          label: link.label,
        });
      }
      return;
    }

    if (culturalReflectionIds.has(otherEv.id)) return;

    if (link.direction === 'incoming' && (link.type === 'triggers' || link.type === 'enables')) {
      prerequisiteLinks.push({
        category: 'prerequisites',
        otherId: otherEv.id,
        otherEvent: otherEv,
        badge: 'Предпосылка / причина',
        directionMark: '←',
        label: link.label,
      });
    } else if (
      link.direction === 'outgoing' &&
      (link.type === 'triggers' || link.type === 'enables')
    ) {
      consequenceLinks.push({
        category: 'consequences',
        otherId: otherEv.id,
        otherEvent: otherEv,
        badge: 'Прямое следствие',
        directionMark: '→',
        label: link.label,
      });
    } else if (
      otherEv.startYear > card.endYear ||
      (otherEv.startYear === card.endYear &&
        otherEv.endYear > card.endYear &&
        otherEv.startYear > card.startYear)
    ) {
      consequenceLinks.push({
        category: 'consequences',
        otherId: otherEv.id,
        otherEvent: otherEv,
        badge: 'Последующая связь',
        directionMark: '→',
        label: link.label,
      });
    } else if (
      otherEv.endYear < card.startYear ||
      (otherEv.endYear === card.startYear &&
        otherEv.startYear < card.startYear &&
        otherEv.endYear < card.endYear)
    ) {
      prerequisiteLinks.push({
        category: 'prerequisites',
        otherId: otherEv.id,
        otherEvent: otherEv,
        badge: 'Исторический контекст',
        directionMark: '←',
        label: link.label,
      });
    } else {
      prerequisiteLinks.push({
        category: 'prerequisites',
        otherId: otherEv.id,
        otherEvent: otherEv,
        badge: 'Синхронный контекст',
        directionMark: '↔',
        label: link.label,
      });
    }
  });

  const isBranchHidden = (ev: EnrichedEvent) =>
    activeBranches ? activeBranches[ev.task] === false : false;

  const totalUniqueLinksCount =
    prerequisiteLinks.length + consequenceLinks.length + culturalReflectionItems.length;

  const hiddenBranchLinksCount =
    prerequisiteLinks.filter((i) => isBranchHidden(i.otherEvent)).length +
    consequenceLinks.filter((i) => isBranchHidden(i.otherEvent)).length +
    culturalReflectionItems.filter((i) => isBranchHidden(i.otherEvent)).length;

  const durationText =
    card.duration === 0
      ? 'Точечное событие (менее 1 года)'
      : `${card.duration} ${
          card.duration % 10 === 1 && card.duration % 100 !== 11
            ? 'год'
            : card.duration % 10 >= 2 &&
                card.duration % 10 <= 4 &&
                (card.duration % 100 < 10 || card.duration % 100 >= 20)
              ? 'года'
              : 'лет'
        }`;

  const selectClass =
    'h-8 px-2.5 pr-7 rounded-lg bg-slate-950/90 border border-slate-700/80 hover:border-slate-600 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400/60 cursor-pointer max-w-full';

  const tabs: Array<{ id: CardModalTabId; label: string; count?: number; icon: React.ReactNode }> = [
    {
      id: 'details',
      label: 'Суть и этапы',
      icon: <ScrollText className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'links',
      label: 'Связи',
      count: totalUniqueLinksCount,
      icon: <Link2 className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'concurrent',
      label: 'Синхронные события',
      count: card.concurrentEvents.length,
      icon: <Layers className="w-3.5 h-3.5 shrink-0" />,
    },
  ];

  const displayedConcurrent = filteredConcurrentEvents.slice(0, visibleConcurrentCount);
  const hasConcurrentFilters =
    concurrentBranchFilter !== 'ALL' || concurrentOnlyLinked || concurrentSearch.trim().length > 0;

  const renderLinkSection = (
    title: string,
    accentClass: string,
    items: GroupedCardLink[],
    emptyText: string,
  ) => (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className={`text-xs font-mono uppercase tracking-wider font-semibold ${accentClass}`}>
          {title} ({items.length})
        </h4>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-slate-500 py-2">{emptyText}</p>
      ) : (
        <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
          {items.map((item, idx) => {
            const ob = branchById.get(item.otherEvent.task);
            const hiddenBranch = isBranchHidden(item.otherEvent);
            const isExternalAtlasLink = Boolean(
              card.campaignPackId && item.otherEvent.campaignPackId !== card.campaignPackId,
            );
            return (
              <div key={`${item.otherId}-${item.category}-${idx}`} className="py-3 space-y-1.5">
                <button
                  type="button"
                  onClick={() => onSelectCard(item.otherId)}
                  className="group w-full text-left px-2 -mx-2 py-1 rounded-lg hover:bg-slate-800/45 transition-colors cursor-pointer space-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="inline-flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="text-slate-200 font-semibold tabular-nums">
                        {item.otherEvent.period}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className={`font-semibold ${accentClass}`}>
                        {item.directionMark} {item.badge}
                      </span>
                      {ob && (
                        <>
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                          <span className="text-slate-400 truncate">{ob.label}</span>
                        </>
                      )}
                      {isExternalAtlasLink && (
                        <>
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                          <span className="text-sky-300 inline-flex items-center gap-1">
                            <Globe2 className="w-3 h-3 shrink-0" />
                            <span>Внешний атлас</span>
                          </span>
                        </>
                      )}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-300 shrink-0 transition-colors" />
                  </div>
                  <div className="text-sm font-semibold text-white group-hover:text-amber-200 transition-colors">
                    {item.otherEvent.title}
                  </div>
                  {item.label && (
                    <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">{item.label}</p>
                  )}
                </button>

                {hiddenBranch && (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-amber-300/90 pt-0.5">
                    <span>Ветка «{ob?.label ?? item.otherEvent.task}» сейчас скрыта на ленте</span>
                    {onRevealBranch && (
                      <button
                        type="button"
                        onClick={() => onRevealBranch(item.otherEvent.task)}
                        className="text-amber-300 hover:text-amber-200 underline decoration-amber-400/40 underline-offset-2 cursor-pointer whitespace-nowrap"
                      >
                        Включить ветку
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-card-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl bg-[#0b1325] border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden">
        {/* Шапка карточки */}
        <DossierModalHeader
          lastHistoryItem={lastHistoryItem}
          onNavigateBack={onNavigateBack}
          onExportMarkdown={() => {
            const { filename, content } = formatCardToMarkdown({
              card,
              branch: branchObj,
              parentBranch: parentBranchObj,
              era: macroEra,
              branches,
              allEventsById: eventById,
            });
            downloadMarkdownFile(filename, content);
          }}
          exportMarkdownTitle="Скачать всю карточку в Markdown (.md)"
          exportMarkdownAriaLabel="Скачать карточку в формате Markdown"
          onClose={onClose}
          closeAriaLabel="Закрыть модальное окно"
          context={
            <>
              {isDiscovery ? (
                <FlaskConical className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : isWork ? (
                <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
              ) : isBio ? (
                <User className="w-4 h-4 text-sky-400 shrink-0" />
              ) : (
                <ScrollText className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span
                className="font-sans text-xs sm:text-sm font-semibold text-slate-100 truncate min-w-0"
                title={
                  parentBranchObj
                    ? `${parentBranchObj.short} · ${branchObj.label}`
                    : branchObj.label
                }
              >
                {parentBranchObj
                  ? `${parentBranchObj.short} · ${branchObj.label}`
                  : branchObj.label}
              </span>
              {card.eventType && (
                <>
                  <span aria-hidden="true" className="text-slate-500 hidden sm:inline shrink-0">
                    ·
                  </span>
                  <span className="font-sans text-xs text-slate-300 hidden sm:inline truncate shrink-0 max-w-[160px]">
                    {EVENT_TYPE_LABELS[card.eventType] ?? card.eventType}
                  </span>
                </>
              )}
            </>
          }
          actions={
            <>
              {linkedCampaignPack && onOpenCampaign && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCampaign(linkedCampaignPack.id);
                  }}
                  className="h-8 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  title={`Перейти к многоветвевой детализации кампании «${linkedCampaignPack.title}»`}
                >
                  <Swords className="w-3.5 h-3.5 shrink-0" />
                  <span>Кампания ({linkedCampaignPack.branchIds.length} вет.)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onJumpToTimelineRow(card.id);
                }}
                className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-amber-300 inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                title="Прокрутить график к этому событию и подсветить его"
              >
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span>Показать на графике</span>
              </button>

              {onOpenCausalTracer && totalUniqueLinksCount > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenCausalTracer(card.id)}
                  className="h-8 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-xs font-mono font-semibold text-amber-200 inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                  title="Проследить цепочку причин и следствий от этого события на всю глубину"
                >
                  <GitBranch className="w-3.5 h-3.5 shrink-0" />
                  <span>Цепочка</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onToggleFocusEvent(card.id);
                  onClose();
                }}
                className={`h-8 px-2.5 rounded-lg border text-xs font-mono inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 ${
                  isFocused
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300'
                }`}
                title="Изолировать это событие и все связанные с ним процессы на таймлайне"
              >
                <Crosshair className="w-3.5 h-3.5 shrink-0" />
                <span>{isFocused ? 'Выключить фокус' : 'Фокус связей'}</span>
              </button>
            </>
          }
        />

        {/* Прокручиваемое тело */}
        <div ref={bodyRef} className="px-5 sm:px-6 pt-5 pb-6 overflow-y-auto space-y-5 flex-1">
          {/* Заголовок, период и краткая характеристика */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-1.5 font-bold text-amber-300 tabular-nums">
                  <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{isBio ? `Годы жизни: ${card.period}` : card.period}</span>
                </span>
                {isBio && (
                  <>
                    <span aria-hidden="true" className="text-slate-600">
                      ·
                    </span>
                    <span className="text-slate-300 tabular-nums">
                      Активность: {card.activeFrom}–{card.activeTo} гг.
                    </span>
                  </>
                )}
                {(card.startPrecision.precision !== 'year' ||
                  card.endPrecision.precision !== 'year') &&
                  (() => {
                    const startCal = formatCalendarDetailBadge(card.startPrecision);
                    return (
                      <span className="text-slate-300 tabular-nums inline-flex flex-wrap items-center gap-x-1.5">
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                        <span
                          className={
                            startCal.tone === 'gregorian'
                              ? 'text-sky-300 font-semibold'
                              : 'text-amber-300 font-semibold'
                          }
                        >
                          {startCal.primaryText}
                        </span>
                        <span className="text-slate-400">({startCal.styleLabel})</span>
                        {startCal.counterpartText && (
                          <span className="text-slate-400">· {startCal.counterpartText}</span>
                        )}
                      </span>
                    );
                  })()}
              </div>

              {macroEra && onOpenEraModal && (
                <button
                  type="button"
                  onClick={() => onOpenEraModal(macroEra.id)}
                  className="text-xs text-amber-300 hover:text-amber-200 underline decoration-amber-400/40 underline-offset-4 cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
                >
                  Эпоха: {macroEra.displayShortTitle} ({macroEra.period}) →
                </button>
              )}
            </div>

            <h3
              id="modal-card-title"
              className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight text-balance"
            >
              {card.title}
            </h3>

            {card.subtitle && (
              <p className="text-sm sm:text-[15px] text-slate-300 leading-relaxed max-w-3xl">
                {card.subtitle}
              </p>
            )}
          </div>

          {/* Компактная строка паспорта (3 ориентира без вложенных рамок) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-0.5">
              <div className="font-mono text-[11px] text-slate-400">
                {isBio ? 'Хронология жизни' : 'Хронология и охват'}
              </div>
              <div className="font-mono font-bold text-white tabular-nums">{card.period}</div>
              <div className="text-[11px] text-slate-400 tabular-nums">
                {isBio
                  ? `Активен: ${card.activeFrom}–${card.activeTo} гг. (${Math.max(1, card.activeTo - card.activeFrom)} л.)`
                  : durationText}
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-1">
              <div className="font-mono text-[11px] text-slate-400">География и сфера</div>
              <div className="font-semibold text-white flex items-center gap-1.5 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{card.region || 'Общегосударственный масштаб'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {classifyEventMacroRegions(card).map((regionId) => {
                  const opt = getMacroRegionOption(regionId);
                  const isActive = selectedMacroRegion === regionId;
                  return (
                    <button
                      key={regionId}
                      type="button"
                      onClick={() => {
                        if (onFilterByMacroRegion) {
                          onFilterByMacroRegion(isActive ? 'all' : regionId);
                        }
                      }}
                      title={
                        isActive
                          ? `Активен фильтр по макрорегиону «${opt.label}». Нажмите, чтобы сбросить`
                          : `Отфильтровать ленту таймлайна по макрорегиону «${opt.label}»`
                      }
                      className={`text-[11px] font-mono underline underline-offset-2 transition-colors cursor-pointer ${
                        isActive
                          ? 'text-amber-300 font-semibold decoration-amber-400'
                          : 'text-slate-400 hover:text-amber-200 decoration-slate-600'
                      }`}
                    >
                      {isActive ? `Фильтр: ${opt.shortLabel} ×` : `Фильтр: ${opt.shortLabel}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-1">
              <div className="font-mono text-[11px] text-slate-400">Связи и параллели</div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono tabular-nums">
                <button
                  type="button"
                  onClick={() => handleTabChange('links')}
                  className="font-bold text-emerald-300 hover:text-emerald-200 cursor-pointer"
                >
                  Связей: {totalUniqueLinksCount}
                </button>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => handleTabChange('concurrent')}
                  className="text-sky-300 hover:text-sky-200 cursor-pointer"
                >
                  Синхронных: {card.concurrentEvents.length}
                </button>
              </div>
              {hiddenBranchLinksCount > 0 && (
                <div className="text-[11px] font-mono text-amber-300/90 tabular-nums">
                  В скрытых ветках: {hiddenBranchLinksCount}
                </div>
              )}
            </div>
          </div>

          {/* Липкая полоса 3 вкладок */}
          <div
            ref={tabBarRef}
            role="tablist"
            onKeyDown={handleTabKeyDown}
            aria-label="Разделы карточки"
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

          {/* ВКЛАДКА 1: СУТЬ И ЭТАПЫ */}
          {tabs.filter((tab) => tab.id !== activeTab).map(({ id }) => (
            <div key={id} {...panelProps(id)} />
          ))}
          {activeTab === 'details' && (
            <div {...panelProps('details')} className="space-y-6">
              {/* Предпосылки + Главный итог (или раздельные итоги Россия / Мир) */}
              {(card.prerequisitesList.length > 0 ||
                card.outcome ||
                card.outcomesByScope?.russia ||
                card.outcomesByScope?.world) && (
                <div
                  className={`grid grid-cols-1 ${
                    !card.outcomesByScope && card.prerequisitesList.length > 0 && card.outcome
                      ? 'md:grid-cols-2'
                      : ''
                  } gap-3`}
                >
                  {card.prerequisitesList.length > 0 && (
                    <div className="rounded-xl bg-indigo-950/25 border border-indigo-500/30 p-4 space-y-2">
                      <div className="text-xs font-mono uppercase tracking-wider font-semibold text-indigo-300 inline-flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {isWork
                            ? 'Замысел и предпосылки'
                            : isBio
                              ? 'Истоки пути'
                              : 'Предпосылки и причины'}
                        </span>
                      </div>
                      {card.prerequisitesList.length === 1 ? (
                        <p className="text-xs sm:text-sm text-indigo-50/95 leading-relaxed">
                          {card.prerequisitesList[0]}
                        </p>
                      ) : (
                        <ul className="space-y-1.5 text-xs sm:text-sm text-indigo-50/95 leading-relaxed">
                          {card.prerequisitesList.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span aria-hidden="true" className="text-indigo-300 select-none">
                                ·
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {card.outcomesByScope &&
                  (card.outcomesByScope.russia || card.outcomesByScope.world) ? (
                    <div className="rounded-xl bg-amber-950/25 border border-amber-500/30 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-mono uppercase tracking-wider font-semibold text-amber-300 inline-flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 shrink-0" />
                          <span>Итоги и значение</span>
                        </div>
                        <span className="text-[11px] font-mono text-amber-200/75">
                          Россия · Мир
                        </span>
                      </div>
                      <div
                        className={`grid grid-cols-1 ${
                          card.outcomesByScope.russia && card.outcomesByScope.world
                            ? 'md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-amber-500/20'
                            : ''
                        }`}
                      >
                        {card.outcomesByScope.russia && (
                          <div className="pb-3 md:pb-0 md:pr-4 space-y-1.5">
                            <div className="text-[11px] font-mono uppercase tracking-wider text-amber-300 font-semibold">
                              Для России
                            </div>
                            <p className="text-xs sm:text-sm text-amber-50/95 leading-relaxed">
                              {card.outcomesByScope.russia}
                            </p>
                          </div>
                        )}
                        {card.outcomesByScope.world && (
                          <div
                            className={`${
                              card.outcomesByScope.russia ? 'pt-3 md:pt-0 md:pl-4' : ''
                            } space-y-1.5`}
                          >
                            <div className="text-[11px] font-mono uppercase tracking-wider text-sky-300 font-semibold">
                              Для мира
                            </div>
                            <p className="text-xs sm:text-sm text-amber-50/95 leading-relaxed">
                              {card.outcomesByScope.world}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    card.outcome && (
                      <div className="rounded-xl bg-amber-950/25 border border-amber-500/30 p-4 space-y-2">
                        <div className="text-xs font-mono uppercase tracking-wider font-semibold text-amber-300 inline-flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {isWork
                              ? 'Художественное значение'
                              : isBio
                                ? 'Место в истории'
                                : 'Главный итог и значение'}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-amber-50/95 leading-relaxed">
                          {card.outcome}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Ключевые участники */}
              {card.keyFigures && card.keyFigures.length > 0 && (
                <section className="space-y-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400 inline-flex items-center gap-1.5 font-semibold">
                    <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>
                      {isWork
                        ? 'Автор, прототипы и критики'
                        : isBio
                          ? 'Круг общения и современники'
                          : 'Ключевые участники'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs sm:text-sm">
                    {card.keyFigures.map((person, idx) => {
                      const personKey = personDossiers
                        ? resolvePersonKey(person, personDossiers)
                        : null;
                      const dossier = personKey ? personDossiers?.get(personKey) : null;
                      const eventCount = dossier?.events.length ?? 0;

                      return (
                        <span key={person} className="inline-flex items-center gap-2">
                          {idx > 0 && (
                            <span aria-hidden="true" className="text-slate-600">
                              ·
                            </span>
                          )}
                          {onOpenPersonModal ? (
                            <button
                              type="button"
                              onClick={() => onOpenPersonModal(personKey || person)}
                              title={
                                dossier
                                  ? `Открыть досье: ${dossier.displayName} (событий: ${eventCount})`
                                  : `Открыть досье участника: ${person}`
                              }
                              className="text-sky-200 hover:text-amber-200 underline decoration-sky-500/40 underline-offset-4 transition-colors cursor-pointer"
                            >
                              {person}
                              {eventCount > 0 ? (
                                <span className="font-mono text-[11px] text-slate-400 ml-1 tabular-nums">
                                  ({eventCount})
                                </span>
                              ) : null}
                            </button>
                          ) : onFilterByPerson ? (
                            <button
                              type="button"
                              onClick={() => {
                                onFilterByPerson(person);
                                onClose();
                              }}
                              className="text-sky-200 hover:text-amber-200 underline decoration-sky-500/40 underline-offset-4 transition-colors cursor-pointer"
                            >
                              {person}
                            </button>
                          ) : (
                            <span className="text-slate-200">{person}</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Операционный паспорт события кампании */}
              {card.operationProfile && (
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-semibold inline-flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Операционный паспорт</span>
                    </h4>
                    {card.operationProfile.theater && (
                      <span className="text-[11px] font-mono text-slate-400">
                        {card.operationProfile.theater}
                      </span>
                    )}
                  </div>

                  {card.operationProfile.belligerents &&
                    card.operationProfile.belligerents.length > 0 && (
                      <div className="overflow-x-auto border-y border-slate-800/80">
                        <table className="w-full text-left text-xs sm:text-sm border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800/80 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                              <th className="py-2 pr-3 font-semibold">Сторона</th>
                              <th className="py-2 px-3 font-semibold">Командование</th>
                              <th className="py-2 px-3 font-semibold">Силы</th>
                              <th className="py-2 pl-3 font-semibold">Потери</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/70">
                            {card.operationProfile.belligerents.map((b, idx) => (
                              <tr key={`${b.side}-${idx}`} className="align-top">
                                <td className="py-2.5 pr-3 font-semibold text-white whitespace-nowrap">
                                  {b.side}
                                </td>
                                <td className="py-2.5 px-3 text-slate-200 leading-relaxed">
                                  {b.commanders.length > 0 ? (
                                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                      {b.commanders.map((cmd, cIdx) => {
                                        const pKey = personDossiers
                                          ? resolvePersonKey(cmd, personDossiers)
                                          : null;
                                        return (
                                          <span
                                            key={`${cmd}-${cIdx}`}
                                            className="inline-flex items-center gap-1.5"
                                          >
                                            {cIdx > 0 && (
                                              <span aria-hidden="true" className="text-slate-600">
                                                ·
                                              </span>
                                            )}
                                            {onOpenPersonModal && pKey ? (
                                              <button
                                                type="button"
                                                onClick={() => onOpenPersonModal(pKey)}
                                                className="text-sky-200 hover:text-amber-200 underline decoration-sky-500/40 underline-offset-4 transition-colors cursor-pointer"
                                              >
                                                {cmd}
                                              </button>
                                            ) : (
                                              <span>{cmd}</span>
                                            )}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-slate-500">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-xs text-slate-300 tabular-nums leading-relaxed">
                                  {b.forces || '—'}
                                </td>
                                <td className="py-2.5 pl-3 font-mono text-xs text-amber-200/90 tabular-nums leading-relaxed">
                                  {b.casualties || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                  <dl className="divide-y divide-slate-800/80 border-b border-slate-800/80 text-xs sm:text-sm">
                    {card.operationProfile.strategicObjective && (
                      <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-1 sm:gap-4">
                        <dt className="text-xs text-slate-400 font-medium">Стратегическая цель</dt>
                        <dd className="text-slate-100 leading-relaxed">
                          {card.operationProfile.strategicObjective}
                        </dd>
                      </div>
                    )}
                    {card.operationProfile.resultSummary && (
                      <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-1 sm:gap-4">
                        <dt className="text-xs text-slate-400 font-medium">Оперативный итог</dt>
                        <dd className="text-slate-100 leading-relaxed">
                          {card.operationProfile.resultSummary}
                        </dd>
                      </div>
                    )}
                    {card.operationProfile.turningPoints &&
                      card.operationProfile.turningPoints.length > 0 && (
                        <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-1 sm:gap-4">
                          <dt className="text-xs text-slate-400 font-medium">
                            Переломные моменты
                          </dt>
                          <dd className="text-slate-200 leading-relaxed">
                            <ul className="space-y-1">
                              {card.operationProfile.turningPoints.map((tp, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span aria-hidden="true" className="text-amber-400/80 select-none">
                                    ·
                                  </span>
                                  <span>{tp}</span>
                                </li>
                              ))}
                            </ul>
                          </dd>
                        </div>
                      )}
                    {card.operationProfile.historiographyNote && (
                      <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-1 sm:gap-4">
                        <dt className="text-xs text-slate-400 font-medium">
                          Историографическая оценка
                        </dt>
                        <dd className="text-slate-300 leading-relaxed">
                          {card.operationProfile.historiographyNote}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>
              )}

              {/* Литературно-исторический профиль */}
              {card.literaryProfile && (
                <section className="space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-rose-300 font-semibold inline-flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>
                      {isBio
                        ? 'Творческий профиль писателя'
                        : 'Литературный разбор и судьба текста'}
                    </span>
                  </h4>

                  <dl className="divide-y divide-slate-800/80 border-y border-slate-800/80 text-xs sm:text-sm">
                    {(card.literaryProfile.genre || card.literaryProfile.movement) && (
                      <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-1 sm:gap-4">
                        <dt className="text-xs text-slate-400 font-medium">
                          {isBio ? 'Роль и направление' : 'Жанр и направление'}
                        </dt>
                        <dd className="text-slate-100 leading-relaxed">
                          {[card.literaryProfile.genre, card.literaryProfile.movement]
                            .filter(Boolean)
                            .join(' · ')}
                        </dd>
                      </div>
                    )}
                    {card.literaryProfile.themes && (
                      <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-1 sm:gap-4">
                        <dt className="text-xs text-slate-400 font-medium">
                          {isBio ? 'Сквозная тематика' : 'Темы и проблематика'}
                        </dt>
                        <dd className="text-slate-200 leading-relaxed">
                          {card.literaryProfile.themes}
                        </dd>
                      </div>
                    )}
                    {card.literaryProfile.publicationFate && (
                      <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-1 sm:gap-4">
                        <dt className="text-xs text-slate-400 font-medium">
                          {isBio ? 'Журналы и публикации' : 'Судьба текста и издания'}
                        </dt>
                        <dd className="text-slate-200 leading-relaxed">
                          {card.literaryProfile.publicationFate}
                        </dd>
                      </div>
                    )}
                    {card.literaryProfile.culturalImpact && (
                      <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-1 sm:gap-4">
                        <dt className="text-xs text-slate-400 font-medium">
                          {isBio ? 'Влияние и наследие' : 'Культурное влияние'}
                        </dt>
                        <dd className="text-slate-200 leading-relaxed">
                          {card.literaryProfile.culturalImpact}
                        </dd>
                      </div>
                    )}
                    {card.literaryProfile.majorWorks && card.literaryProfile.majorWorks.length > 0 && (
                      <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-1 sm:gap-4">
                        <dt className="text-xs text-slate-400 font-medium">
                          Корпус главных произведений
                        </dt>
                        <dd className="text-slate-200 leading-relaxed">
                          <ul className="space-y-1">
                            {card.literaryProfile.majorWorks.map((workTitle, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span aria-hidden="true" className="text-rose-400/80 select-none">
                                  ·
                                </span>
                                <span>{workTitle}</span>
                              </li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>
              )}

              {/* Основная историческая справка */}
              <section className="space-y-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  {isWork || isBio
                    ? 'Историко-литературная справка и контекст'
                    : 'Историческая справка и контекст'}
                </h4>
                <p className="text-sm sm:text-[15px] text-slate-200 leading-relaxed whitespace-pre-line max-w-3xl">
                  {card.details}
                </p>
              </section>

              {/* Хронология ключевых этапов (subEvents) */}
              {card.subEvents && card.subEvents.length > 0 && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-semibold inline-flex items-center gap-2">
                      <GitBranch className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        {isWork
                          ? `История замысла и публикаций (${card.subEvents.length})`
                          : isBio
                            ? `Этапы жизни и пути (${card.subEvents.length})`
                            : `Хронология ключевых этапов (${card.subEvents.length})`}
                      </span>
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                      {card.period}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                    {card.subEvents.map((sub, idx) => (
                      <div
                        key={`${sub.year}-${sub.title}-${idx}`}
                        className="py-3 grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-4"
                      >
                        <div className="font-mono text-xs font-bold text-amber-300 tabular-nums">
                          {sub.year !== undefined && sub.year !== '' ? sub.year : `Этап ${idx + 1}`}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="text-sm font-semibold text-white">{sub.title}</div>
                          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                            {sub.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Правители в период события */}
              <section className="space-y-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-semibold inline-flex items-center gap-2">
                  <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Правители в период события ({card.overlappingRulers.length})</span>
                </h4>
                {card.overlappingRulers.length > 0 ? (
                  <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                    {card.overlappingRulers.map((r: RulerPeriod) => (
                      <div
                        key={r.id}
                        className="py-2.5 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-serif text-sm sm:text-[15px] font-bold text-white">
                            {r.ruler}
                          </div>
                          <div className="text-xs font-mono text-slate-400 tabular-nums">
                            <span className="text-amber-300 font-semibold">{r.reignPeriod}</span>
                            {r.center ? ` · ${r.center}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
                          {onOpenRulerModal && (
                            <button
                              type="button"
                              onClick={() => onOpenRulerModal(r.id)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-200 font-semibold cursor-pointer whitespace-nowrap"
                            >
                              Досье →
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              onFilterByRuler(r.id);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer whitespace-nowrap"
                            title="Отфильтровать график по годам правления"
                          >
                            Окно лет
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">{card.ruler || 'Нет данных'}</p>
                )}
              </section>

              {card.sources && card.sources.length > 0 && (
                <SourcesApparatusSection
                  sources={card.sources}
                  citationTarget={{
                    kind: 'card',
                    id: card.id,
                    title: card.title,
                    period: card.period,
                    sectionLabel: parentBranchObj
                      ? `раздел «${parentBranchObj.short} · ${branchObj.label}»`
                      : `раздел «${branchObj.label}»`,
                  }}
                />
              )}
            </div>
          )}

          {/* ВКЛАДКА 2: СВЯЗИ */}
          {activeTab === 'links' && (
            <div {...panelProps('links')} className="space-y-5">
              {/* Фильтр по типу связей */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-950/90 border border-slate-800 p-1 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setLinksCategory('all')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                      linksCategory === 'all'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Все ({totalUniqueLinksCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinksCategory('prerequisites')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                      linksCategory === 'prerequisites'
                        ? 'bg-sky-400 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Предпосылки ({prerequisiteLinks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinksCategory('consequences')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                      linksCategory === 'consequences'
                        ? 'bg-emerald-400 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Следствия ({consequenceLinks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinksCategory('cultural')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                      linksCategory === 'cultural'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Культура и наука ({culturalReflectionItems.length})
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {hiddenBranchLinksCount > 0 && (
                    <span className="text-xs font-mono text-amber-300/90 tabular-nums">
                      В скрытых ветках: {hiddenBranchLinksCount}
                    </span>
                  )}
                  {onOpenCausalTracer && totalUniqueLinksCount > 0 && (
                    <button
                      type="button"
                      onClick={() => onOpenCausalTracer(card.id)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-xs font-mono font-semibold text-amber-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <GitBranch className="w-3.5 h-3.5 shrink-0" />
                      <span>Трассировать цепочку на всю глубину</span>
                    </button>
                  )}
                </div>
              </div>

              {totalUniqueLinksCount === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-slate-400">
                  Для этой карточки пока не заданы явные связи с другими карточками.
                </div>
              ) : (
                <div className="space-y-6">
                  {(linksCategory === 'all' || linksCategory === 'prerequisites') &&
                    renderLinkSection(
                      '1. Предпосылки и контекст',
                      'text-sky-300',
                      prerequisiteLinks,
                      'Нет выделенных предшествующих карточек.',
                    )}

                  {(linksCategory === 'all' || linksCategory === 'consequences') &&
                    renderLinkSection(
                      '2. Итоги и прямые следствия',
                      'text-emerald-300',
                      consequenceLinks,
                      'Нет выделенных последующих карточек.',
                    )}

                  {(linksCategory === 'all' || linksCategory === 'cultural') &&
                    renderLinkSection(
                      '3. Отражение в культуре, литературе и науке',
                      'text-amber-300',
                      culturalReflectionItems,
                      'Нет связанных произведений, биографий или открытий.',
                    )}
                </div>
              )}
            </div>
          )}

          {/* ВКЛАДКА 3: СИНХРОННЫЕ СОБЫТИЯ */}
          {activeTab === 'concurrent' && (
            <div {...panelProps('concurrent')} className="space-y-4">
              {card.concurrentEvents.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-slate-400">
                  Синхронных событий в других ветках для этого периода не найдено.
                </div>
              ) : (
                <>
                  {/* Компактная строка фильтров вместо облака чипов */}
                  <div className="flex flex-wrap items-center gap-2">
                    {concurrentBranchOptions.length > 1 && (
                      <select
                        aria-label="Фильтр синхронных событий по ветке"
                        value={concurrentBranchFilter}
                        onChange={(e) => {
                          setConcurrentBranchFilter(e.target.value);
                          setVisibleConcurrentCount(12);
                        }}
                        className={selectClass}
                      >
                        <option value="ALL">
                          Все ветки ({card.concurrentEvents.length})
                        </option>
                        {concurrentBranchOptions.map((opt) => (
                          <option key={opt.branchId} value={opt.branchId}>
                            {opt.label} ({opt.count})
                          </option>
                        ))}
                      </select>
                    )}

                    {concurrentLinkedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setConcurrentOnlyLinked((prev) => !prev);
                          setVisibleConcurrentCount(12);
                        }}
                        className={`h-8 px-2.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                          concurrentOnlyLinked
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                            : 'bg-slate-950/90 border-slate-700/80 text-emerald-300 hover:border-emerald-400/50'
                        }`}
                      >
                        Только со связью ({concurrentLinkedCount})
                      </button>
                    )}

                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="search"
                        value={concurrentSearch}
                        onChange={(e) => {
                          setConcurrentSearch(e.target.value);
                          setVisibleConcurrentCount(12);
                        }}
                        placeholder="Поиск по синхронным событиям…"
                        aria-label="Поиск по синхронным событиям"
                        className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-950/90 border border-slate-700/80 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                      />
                    </div>

                    {hasConcurrentFilters && (
                      <button
                        type="button"
                        onClick={() => {
                          setConcurrentBranchFilter('ALL');
                          setConcurrentOnlyLinked(false);
                          setConcurrentSearch('');
                          setVisibleConcurrentCount(12);
                        }}
                        className="h-8 px-2.5 rounded-lg text-xs font-mono text-amber-300 hover:text-amber-200 cursor-pointer whitespace-nowrap"
                      >
                        Сбросить
                      </button>
                    )}
                  </div>

                  {filteredConcurrentEvents.length === 0 ? (
                    <div className="py-8 text-center text-xs font-mono text-slate-400">
                      По выбранному фильтру синхронных событий не найдено.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs font-mono text-slate-400 tabular-nums">
                        Показано {displayedConcurrent.length} из {filteredConcurrentEvents.length}
                      </div>

                      <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                        {displayedConcurrent.map((other) => {
                          const ob = branchById.get(other.task);
                          const hasDirectLink = explicitOtherIdSet.has(other.id);
                          return (
                            <button
                              key={other.id}
                              type="button"
                              onClick={() => onSelectCard(other.id)}
                              className="group w-full text-left py-2.5 px-2 -mx-2 rounded-lg hover:bg-slate-800/45 transition-colors cursor-pointer space-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                                <span className="inline-flex flex-wrap items-center gap-1.5 min-w-0">
                                  <span className="text-amber-300 font-semibold tabular-nums">
                                    {other.period}
                                  </span>
                                  <span aria-hidden="true" className="text-slate-600">
                                    ·
                                  </span>
                                  <span className="text-slate-400 truncate">
                                    {ob ? ob.label : other.task}
                                  </span>
                                </span>
                                {hasDirectLink && (
                                  <span className="text-emerald-300 font-semibold shrink-0">
                                    прямая связь
                                  </span>
                                )}
                              </div>
                              <div className="text-sm font-semibold text-white group-hover:text-amber-200 transition-colors">
                                {other.title}
                              </div>
                              {other.subtitle && (
                                <p className="text-xs text-slate-400 line-clamp-1 max-w-3xl">
                                  {other.subtitle}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {filteredConcurrentEvents.length > displayedConcurrent.length && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                          <button
                            type="button"
                            onClick={() => setVisibleConcurrentCount((prev) => prev + 12)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Показать ещё{' '}
                            {Math.min(12, filteredConcurrentEvents.length - displayedConcurrent.length)}{' '}
                            (осталось {filteredConcurrentEvents.length - displayedConcurrent.length})
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setVisibleConcurrentCount(filteredConcurrentEvents.length)
                            }
                            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Показать все ({filteredConcurrentEvents.length})
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Нижняя панель навигации по текущему срезу событий */}
        <div className="px-5 py-3 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-2 text-xs font-mono">
          {prevCard ? (
            <button
              type="button"
              onClick={() => onSelectCard(prevCard.id)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 inline-flex items-center gap-1.5 cursor-pointer max-w-[46%] truncate"
              title={`${prevCard.period} — ${prevCard.title}`}
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="truncate">
                {prevCard.period}: {prevCard.title}
              </span>
            </button>
          ) : (
            <span className="text-slate-600">Начало выбранного списка</span>
          )}

          <span className="text-slate-500 hidden sm:inline tabular-nums">
            {currentIndex >= 0 ? `${currentIndex + 1} / ${navigationPool.length}` : ''}
          </span>

          {nextCard ? (
            <button
              type="button"
              onClick={() => onSelectCard(nextCard.id)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 inline-flex items-center gap-1.5 cursor-pointer max-w-[46%] truncate"
              title={`${nextCard.period} — ${nextCard.title}`}
            >
              <span className="truncate">
                {nextCard.period}: {nextCard.title}
              </span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            </button>
          ) : (
            <span className="text-slate-600">Конец выбранного списка</span>
          )}
        </div>
      </div>
    </div>
  );
}
