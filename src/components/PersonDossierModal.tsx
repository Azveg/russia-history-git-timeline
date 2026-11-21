import {
  BookOpen,
  Calendar,
  Crown,
  ExternalLink,
  Filter,
  Search,
  User,
} from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { isEventBranchActive, resolveBranchCategory } from '../engine/timelineEngine';
import { aggregatePersonSources } from '../utils/citation';
import {
  AcademicCitationPanel,
  CiteTriggerButton,
  SourcesApparatusSection,
} from './AcademicCitationBar';
import { DossierModalHeader } from './DossierModalHeader';
import type {
  BranchDefinition,
  ModalHistoryItem,
  PersonDossier,
} from '../types/timeline';

interface PersonDossierModalProps {
  dossier: PersonDossier | null;
  branches: BranchDefinition[];
  activeBranches?: Record<string, boolean>;
  modalHistory?: ModalHistoryItem[];
  onClose: () => void;
  onNavigateBack?: () => void;
  onSelectCard: (cardId: string) => void;
  onOpenRulerModal?: (rulerId: string) => void;
  onFilterTimelineByPerson: (personKey: string) => void;
}

type SphereFilterId = 'all' | 'economy' | 'military' | 'diplomacy' | 'culture_science' | 'world';

const SPHERE_TABS: Array<{ id: SphereFilterId; label: string }> = [
  { id: 'all', label: 'Все сферы' },
  { id: 'economy', label: 'Реформы и экономика' },
  { id: 'military', label: 'Войны и кампании' },
  { id: 'diplomacy', label: 'Дипломатия' },
  { id: 'culture_science', label: 'Культура и наука' },
  { id: 'world', label: 'Мировой контекст' },
];

function getEventSphere(branch: BranchDefinition | undefined, taskId: string): SphereFilterId {
  if (taskId === 'DIPLOMACY_TREATIES') return 'diplomacy';
  if (taskId === 'REFORMS_ECO') return 'economy';
  if (taskId === 'WORLD_CONTEXT' || taskId.startsWith('WORLD_')) return 'world';
  if (
    taskId === 'WRITERS_BIO' ||
    taskId === 'WRITERS_WORKS' ||
    taskId === 'SCIENTISTS_BIO' ||
    taskId === 'SCIENCE_DISCOVERIES' ||
    taskId === 'CULTURE_ALL' ||
    taskId === 'LITERATURE_ALL' ||
    taskId === 'SCIENCE_ALL'
  ) {
    return 'culture_science';
  }
  if (branch) {
    const cat = resolveBranchCategory(branch).key;
    if (cat === 'military') return 'military';
    if (cat === 'economy') return 'economy';
    if (cat === 'world') return 'world';
  }
  return 'culture_science';
}

export function PersonDossierModal({
  dossier,
  branches,
  activeBranches,
  modalHistory = [],
  onClose,
  onNavigateBack,
  onSelectCard,
  onOpenRulerModal,
  onFilterTimelineByPerson,
}: PersonDossierModalProps) {
  const [sphereFilter, setSphereFilter] = useState<SphereFilterId>('all');
  const [eventsSearch, setEventsSearch] = useState('');
  const [visibleEventsCount, setVisibleEventsCount] = useState(12);
  const [showCitation, setShowCitation] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSphereFilter('all');
    setEventsSearch('');
    setVisibleEventsCount(12);
    setShowCitation(false);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [dossier?.key]);

  useEffect(() => {
    setVisibleEventsCount(12);
  }, [sphereFilter, eventsSearch]);

  const dialogRef = useModalFocusTrap<HTMLDivElement>(onClose);

  const branchById = useMemo(
    () => new Map(branches.map((b) => [b.id, b])),
    [branches],
  );

  const sphereCounts = useMemo(() => {
    const counts: Record<SphereFilterId, number> = {
      all: dossier?.events.length ?? 0,
      economy: 0,
      military: 0,
      diplomacy: 0,
      culture_science: 0,
      world: 0,
    };
    if (!dossier) return counts;
    dossier.events.forEach((ev) => {
      const sp = getEventSphere(branchById.get(ev.task), ev.task);
      counts[sp] += 1;
    });
    return counts;
  }, [dossier, branchById]);

  const filteredEvents = useMemo(() => {
    if (!dossier) return [];
    const bySphere =
      sphereFilter === 'all'
        ? dossier.events
        : dossier.events.filter(
            (ev) => getEventSphere(branchById.get(ev.task), ev.task) === sphereFilter,
          );
    const q = eventsSearch.trim().toLowerCase();
    if (!q) return bySphere;
    return bySphere.filter((ev) => {
      const branchLabel = branchById.get(ev.task)?.label ?? '';
      return (
        ev.title.toLowerCase().includes(q) ||
        (ev.subtitle ?? '').toLowerCase().includes(q) ||
        (ev.outcome ?? '').toLowerCase().includes(q) ||
        ev.period.toLowerCase().includes(q) ||
        branchLabel.toLowerCase().includes(q) ||
        (ev.ruler ?? '').toLowerCase().includes(q)
      );
    });
  }, [dossier, sphereFilter, eventsSearch, branchById]);

  const aggregatedSources = useMemo(
    () => (dossier ? aggregatePersonSources(dossier) : []),
    [dossier],
  );

  if (!dossier) return null;

  const lastHistoryItem = modalHistory.length > 0 ? modalHistory[modalHistory.length - 1] : null;
  const availableSpheres = SPHERE_TABS.filter((t) => t.id !== 'all' && sphereCounts[t.id] > 0);
  const yearSpanLabel =
    dossier.yearRange.min === dossier.yearRange.max
      ? `${dossier.yearRange.min}`
      : `${dossier.yearRange.min}–${dossier.yearRange.max}`;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="person-dossier-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl bg-[#0b1325] border border-sky-500/35 shadow-2xl flex flex-col overflow-hidden animate-modal">
        {/* Двухстрочная навигационная шапка досье */}
        <DossierModalHeader
          lastHistoryItem={lastHistoryItem}
          onNavigateBack={onNavigateBack}
          backButtonTone="slate"
          onClose={onClose}
          closeAriaLabel="Закрыть досье участника"
          context={
            <>
              <User className="w-4 h-4 text-sky-400 shrink-0" />
              <span
                className="font-mono text-xs sm:text-sm font-bold text-sky-300 truncate"
                title={`Досье исторического деятеля · ${dossier.displayName}`}
              >
                Досье исторического деятеля
              </span>
              <span aria-hidden="true" className="text-slate-500 hidden sm:inline shrink-0">
                ·
              </span>
              <span className="hidden sm:inline font-mono text-xs text-slate-300 truncate">
                {dossier.displayName}
              </span>
            </>
          }
          actions={
            <>
              <CiteTriggerButton
                isOpen={showCitation}
                onToggle={() => setShowCitation((prev) => !prev)}
              />
              <button
                type="button"
                onClick={() => {
                  onFilterTimelineByPerson(dossier.key);
                  onClose();
                }}
                className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-mono font-bold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                title="Отфильтровать основной таймлайн по всем событиям с участием этого человека"
              >
                <Filter className="w-3.5 h-3.5 shrink-0" />
                <span>Показать все на таймлайне ({dossier.events.length})</span>
              </button>
            </>
          }
        />

        {/* Тело модального окна */}
        <div ref={bodyRef} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {showCitation && (
            <AcademicCitationPanel
              target={{
                kind: 'person',
                id: dossier.key,
                title: dossier.displayName,
                period: yearSpanLabel,
                sectionLabel: 'досье исторического деятеля',
              }}
              secondaryCardDeepLinkId={dossier.bioCard?.id ?? null}
              onClose={() => setShowCitation(false)}
            />
          )}

          {/* Заголовок и тихая строка метаданных без декоративных капсул */}
          <div className="space-y-2.5 pb-4 border-b border-slate-800/80">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0">
                <h3
                  id="person-dossier-title"
                  className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight text-balance"
                >
                  {dossier.displayName}
                </h3>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-slate-400 tabular-nums">
                  <span className="inline-flex items-center gap-1 text-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-sky-400" />
                    <span>Годы упоминаний: {yearSpanLabel}</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Событий и вех: {dossier.events.length}</span>
                  {dossier.rulers.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Правлений: {dossier.rulers.length}</span>
                    </>
                  )}
                </div>
              </div>

              {dossier.bioCard && (
                <button
                  type="button"
                  onClick={() => onSelectCard(dossier.bioCard!.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Биографическая карточка</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </button>
              )}
            </div>

            {dossier.bioCard?.subtitle?.trim() && (
              <p className="max-w-3xl text-sm text-slate-300 leading-relaxed">
                {dossier.bioCard.subtitle.trim()}
              </p>
            )}

            {dossier.variants.length > 1 && (
              <p className="text-xs text-slate-400 leading-relaxed">
                Упоминается в источниках как: {dossier.variants.join(' · ')}
              </p>
            )}
          </div>

          {/* Правления, на которые пришлась деятельность */}
          {dossier.rulers.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Эпохи и правления:</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed">
                {dossier.rulers.map((r, idx) => (
                  <Fragment key={r.id}>
                    {idx > 0 && (
                      <span aria-hidden="true" className="text-slate-600 select-none">
                        ·
                      </span>
                    )}
                    {onOpenRulerModal ? (
                      <button
                        type="button"
                        onClick={() => onOpenRulerModal(r.id)}
                        className="text-slate-200 hover:text-amber-200 underline decoration-amber-400/35 hover:decoration-amber-300 underline-offset-4 transition-colors cursor-pointer tabular-nums"
                        title={`Открыть досье правления: ${r.reignTitle} (${r.reignPeriod})`}
                      >
                        {r.shortRuler} ({r.reignPeriod})
                      </button>
                    ) : (
                      <span className="text-slate-300 tabular-nums">
                        {r.shortRuler} ({r.reignPeriod})
                      </span>
                    )}
                  </Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Переключатель сфер деятельности и поиск */}
          {(availableSpheres.length > 1 || dossier.events.length > 6) && (
            <div className="flex flex-col gap-2.5">
              {availableSpheres.length > 1 && (
                <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-950/90 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSphereFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                      sphereFilter === 'all'
                        ? 'bg-sky-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    Все ({sphereCounts.all})
                  </button>
                  {availableSpheres.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSphereFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                        sphereFilter === tab.id
                          ? 'bg-sky-500 text-slate-950 font-bold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      {tab.label} ({sphereCounts[tab.id]})
                    </button>
                  ))}
                </div>
              )}

              {dossier.events.length > 6 && (
                <div className="relative max-w-md">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={eventsSearch}
                    onChange={(e) => setEventsSearch(e.target.value)}
                    placeholder="Поиск по событиям, итогам, веткам…"
                    aria-label="Поиск по хронологии деятеля"
                    className="w-full h-9 pl-8 pr-3 rounded-lg bg-slate-950/80 border border-slate-800 focus:border-sky-500/60 focus:outline-none text-xs text-slate-100 placeholder:text-slate-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Хронологический список событий и документов с участием деятеля */}
          <div className="rounded-xl bg-slate-900/65 border border-slate-800 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 text-xs font-mono text-slate-400">
              <span>Хронология событий, законов, войн и трудов</span>
              <span className="tabular-nums text-slate-300 shrink-0">
                Показано: {Math.min(visibleEventsCount, filteredEvents.length)} из{' '}
                {filteredEvents.length}
              </span>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="px-4 py-8 text-center space-y-2">
                <p className="text-sm text-slate-400">
                  По текущему запросу события не найдены.
                </p>
                {(eventsSearch.trim() !== '' || sphereFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setEventsSearch('');
                      setSphereFilter('all');
                    }}
                    className="text-xs font-mono text-sky-300 hover:text-sky-200 underline underline-offset-4 cursor-pointer"
                  >
                    Сбросить фильтр
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-800/75">
                  {filteredEvents.slice(0, visibleEventsCount).map((ev) => {
                    const branch = branchById.get(ev.task);
                    const isBranchVisible = activeBranches
                      ? isEventBranchActive(ev, activeBranches)
                      : true;
                    const roleNote = ev.keyFigures?.find(
                      (kf) => kf.includes('(') && dossier.variants.includes(kf),
                    );
                    const parenMatch = roleNote?.match(/\(([^)]+)\)/);

                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => onSelectCard(ev.id)}
                        className="w-full text-left px-4 py-3.5 hover:bg-slate-800/45 transition-colors cursor-pointer group"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-mono">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                            <span className="font-bold text-amber-300 tabular-nums shrink-0">
                              {ev.period}
                            </span>
                            <span className="text-slate-600" aria-hidden="true">
                              ·
                            </span>
                            <span className="font-medium text-sky-300/90 truncate">
                              {branch?.label || ev.task}
                            </span>
                            {!isBranchVisible && (
                              <>
                                <span className="text-slate-600" aria-hidden="true">
                                  ·
                                </span>
                                <span className="text-slate-500">ветка скрыта на таймлайне</span>
                              </>
                            )}
                          </div>

                          {ev.ruler && (
                            <span className="text-[11px] text-slate-400 truncate max-w-[240px]">
                              {ev.ruler}
                            </span>
                          )}
                        </div>

                        <div className="text-sm sm:text-base font-semibold text-white group-hover:text-sky-200 transition-colors mt-1 leading-snug">
                          {ev.title}
                        </div>

                        {parenMatch && (
                          <div className="text-xs text-sky-300/90 mt-1">
                            Роль в карточке: {parenMatch[1]}
                          </div>
                        )}

                        <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed line-clamp-2 max-w-3xl">
                          {ev.outcome || ev.subtitle}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {filteredEvents.length > visibleEventsCount && (
                  <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setVisibleEventsCount((prev) => prev + 12)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 transition-colors cursor-pointer tabular-nums"
                    >
                      Показать ещё 12 (осталось {filteredEvents.length - visibleEventsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibleEventsCount(filteredEvents.length)}
                      className="text-xs font-mono text-slate-400 hover:text-sky-200 transition-colors cursor-pointer tabular-nums"
                    >
                      Показать все ({filteredEvents.length})
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {aggregatedSources.length > 0 && (
            <SourcesApparatusSection
              sources={aggregatedSources}
              onSelectOriginCard={onSelectCard}
              contextHint="Источники собраны из биографической карточки и ключевых исторических вех с участием деятеля."
            />
          )}
        </div>
      </div>
    </div>
  );
}
