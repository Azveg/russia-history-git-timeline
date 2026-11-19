import {
  ArrowRight,
  BookMarked,
  BookOpen,
  CalendarRange,
  Crown,
  Eye,
  Feather,
  Flame,
  FlaskConical,
  GitBranch,
  GitCompareArrows,
  Layers,
  Link2,
  MapPin,
  ScrollText,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { DossierModalHeader } from './DossierModalHeader';
import {
  formatEventTitleWithPeriod,
  getCustomWindowSummaryData,
  getLeafBranches,
} from '../engine/timelineEngine';
import type {
  BranchDefinition,
  EnrichedEvent,
  MacroEra,
  ModalHistoryItem,
  PersonDossier,
  RulerPeriod,
} from '../types/timeline';

interface WindowSummaryModalProps {
  windowRange: { from: number; to: number } | null;
  eras: MacroEra[];
  rulers: RulerPeriod[];
  enrichedEvents: EnrichedEvent[];
  branches: BranchDefinition[];
  activeBranches: Record<string, boolean>;
  personDossiers?: Map<string, PersonDossier>;
  modalHistory?: ModalHistoryItem[];
  onClose: () => void;
  onNavigateBack?: () => void;
  onSelectEra: (eraId: string) => void;
  onSelectRuler: (rulerId: string) => void;
  onSelectEvent: (eventId: string) => void;
  onOpenPersonModal?: (personKey: string) => void;
  onRevealBranches?: (branchIds: string[]) => void;
  onCompareWithWindow?: (from: number, to: number) => void;
}

type FiguresRoleFilter = 'all' | 'writers' | 'scientists';
type CrossLinkCircuitFilter = 'all' | 'historical' | 'cultural';
type EventsSortMode = 'chronological' | 'links';

export function WindowSummaryModal({
  windowRange,
  eras,
  rulers,
  enrichedEvents,
  branches,
  activeBranches,
  personDossiers,
  modalHistory = [],
  onClose,
  onNavigateBack,
  onSelectEra,
  onSelectRuler,
  onSelectEvent,
  onOpenPersonModal,
  onRevealBranches,
  onCompareWithWindow,
}: WindowSummaryModalProps) {
  const [roleFilter, setRoleFilter] = useState<FiguresRoleFilter>('all');
  const [showAllParticipants, setShowAllParticipants] = useState(false);
  const [crossLinkCircuit, setCrossLinkCircuit] = useState<CrossLinkCircuitFilter>('all');
  const [selectedBranchPairKey, setSelectedBranchPairKey] = useState<string | null>(null);
  const [showAllCrossLinks, setShowAllCrossLinks] = useState(false);
  const [eventsSortMode, setEventsSortMode] = useState<EventsSortMode>('chronological');

  useEffect(() => {
    setRoleFilter('all');
    setShowAllParticipants(false);
    setCrossLinkCircuit('all');
    setSelectedBranchPairKey(null);
    setShowAllCrossLinks(false);
    setEventsSortMode('chronological');
  }, [windowRange?.from, windowRange?.to]);

  const dialogRef = useModalFocusTrap<HTMLDivElement>(onClose);

  const summary = useMemo(() => {
    if (!windowRange) return null;
    return getCustomWindowSummaryData(
      windowRange.from,
      windowRange.to,
      rulers,
      enrichedEvents,
      branches,
      eras,
      personDossiers,
      activeBranches,
    );
  }, [windowRange, rulers, enrichedEvents, branches, eras, personDossiers, activeBranches]);

  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

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
    if (!selectedBranchPairKey) return null;
    return filteredCrossBranchPairs.some((p) => p.pairKey === selectedBranchPairKey)
      ? selectedBranchPairKey
      : null;
  }, [selectedBranchPairKey, filteredCrossBranchPairs]);

  const filteredCrossBranchLinks = useMemo(() => {
    if (!summary) return [];
    return summary.crossBranchLinks.filter((lnk) => {
      if (crossLinkCircuit === 'historical' && !lnk.isHistoricalCircuit) return false;
      if (crossLinkCircuit === 'cultural' && lnk.isHistoricalCircuit) return false;
      if (effectivePairKey && lnk.pairKey !== effectivePairKey) return false;
      return true;
    });
  }, [summary, crossLinkCircuit, effectivePairKey]);

  const eventsSortedByLinks = useMemo(() => {
    if (!summary) return [];
    return [...summary.windowEvents].sort((a, b) => {
      if (b.explicitLinks.length !== a.explicitLinks.length) {
        return b.explicitLinks.length - a.explicitLinks.length;
      }
      const aCross = a.explicitLinks.filter((l) => l.targetEvent.task !== a.task).length;
      const bCross = b.explicitLinks.filter((l) => l.targetEvent.task !== b.task).length;
      if (bCross !== aCross) return bCross - aCross;
      return a.startYear - b.startYear;
    });
  }, [summary]);

  if (!windowRange || !summary) return null;

  const {
    yearFrom,
    yearTo,
    totalDurationYears,
    overlappingEras,
    overlappingRulers,
    windowEvents,
    contemporaryWriters,
    contemporaryScientists,
    worksWrittenInPeriod,
    discoveriesInPeriod,
    worksAboutPeriod,
    startedInWindow,
    carryOverInEvents,
    carryOverOutEvents,
    branchBreakdown,
    hiddenActiveBranches,
    centers,
    peakInterval,
    topConnectedEvents,
    crossBranchLinks,
    windowParticipants,
    totalUniqueLinks,
  } = summary;

  const leafBranches = getLeafBranches(branches).filter((b) => !b.isTimeAxis);
  const lastHistoryItem = modalHistory.length > 0 ? modalHistory[modalHistory.length - 1] : null;
  const displayedCrossLinks = showAllCrossLinks
    ? filteredCrossBranchLinks
    : filteredCrossBranchLinks.slice(0, 8);

  const totalFiguresCount = contemporaryWriters.length + contemporaryScientists.length;
  const displayedFigures = [
    ...(roleFilter === 'all' || roleFilter === 'writers'
      ? contemporaryWriters.map((w) => ({ item: w, role: 'writer' as const }))
      : []),
    ...(roleFilter === 'all' || roleFilter === 'scientists'
      ? contemporaryScientists.map((s) => ({ item: s, role: 'scientist' as const }))
      : []),
  ].sort((a, b) => a.item.startYear - b.item.startYear);

  const maxBranchCount = Math.max(1, ...branchBreakdown.map((b) => b.count));

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="window-modal-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl max-h-[92vh] rounded-2xl bg-[#0b1325] border border-amber-500/40 shadow-2xl flex flex-col overflow-hidden">
        {/* Двухстрочная шапка досье окна */}
        <DossierModalHeader
          lastHistoryItem={lastHistoryItem}
          onNavigateBack={onNavigateBack}
          onClose={onClose}
          closeAriaLabel="Закрыть досье окна"
          context={
            <>
              <CalendarRange className="w-4 h-4 text-amber-400 shrink-0" />
              <span
                className="font-mono text-xs sm:text-sm font-bold text-amber-200 truncate tabular-nums"
                title={`Досье произвольного окна · ${yearFrom}–${yearTo} гг.`}
              >
                Досье произвольного окна · {yearFrom}–{yearTo} гг.
              </span>
            </>
          }
          actions={
            onCompareWithWindow || (hiddenActiveBranches.length > 0 && onRevealBranches) ? (
              <>
                {onCompareWithWindow && (
                  <button
                    type="button"
                    onClick={() => onCompareWithWindow(yearFrom, yearTo)}
                    className="h-8 px-3 rounded-lg border border-sky-500/40 bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 text-xs font-mono font-semibold inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                    title="Сравнить выбранный интервал лет с другим периодом или правлением"
                  >
                    <GitCompareArrows className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>Сравнить с…</span>
                  </button>
                )}
                {hiddenActiveBranches.length > 0 && onRevealBranches && (
                  <button
                    type="button"
                    onClick={() => onRevealBranches(hiddenActiveBranches.map((b) => b.id))}
                    className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold transition-colors duration-150 cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    title="Включить на основной ленте все ветки, в которых есть события этого окна"
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span>Показать скрытые ветки ({hiddenActiveBranches.length})</span>
                  </button>
                )}
              </>
            ) : undefined
          }
        />

        {/* Тело модального окна */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Заголовок и ориентация по макро-периодам */}
          <div className="space-y-2.5">
            <h3
              id="window-modal-title"
              className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight tabular-nums"
            >
              Сводный срез периода {yearFrom}–{yearTo} гг.
            </h3>

            {overlappingEras.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-300">
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <ScrollText className="w-3.5 h-3.5 text-amber-400" />
                  Пересекаемые макро-периоды:
                </span>
                {overlappingEras.map((era, idx) => (
                  <span key={era.id} className="inline-flex items-center gap-1.5">
                    {idx > 0 && <span className="text-slate-600">·</span>}
                    <button
                      type="button"
                      onClick={() => onSelectEra(era.id)}
                      className="text-amber-200 hover:text-amber-300 underline decoration-amber-500/40 underline-offset-4 cursor-pointer tabular-nums"
                    >
                      {era.roman ? `${era.roman}. ` : ''}
                      {era.displayShortTitle} ({era.period})
                    </button>
                  </span>
                ))}
              </div>
            )}

            {centers.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-300">
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  Политические центры отрезка:
                </span>
                <span>{centers.join(' · ')}</span>
              </div>
            )}
          </div>

          {/* 4 сводных индикатора окна */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3">
              <div className="text-slate-400">Масштаб отрезка</div>
              <div className="text-lg font-extrabold text-amber-300 mt-0.5 tabular-nums">
                {totalDurationYears} л.
              </div>
              <div className="text-[11px] text-slate-500 tabular-nums">
                начато: {startedInWindow.length} · всего: {windowEvents.length}
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3">
              <div className="text-slate-400">Правления и культура</div>
              <div className="text-lg font-extrabold text-white mt-0.5 tabular-nums">
                {overlappingRulers.length} правл. · {totalFiguresCount} лиц
              </div>
              <div className="text-[11px] text-slate-500 tabular-nums">
                книг: {worksWrittenInPeriod.length} · открытий: {discoveriesInPeriod.length}
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3">
              <div className="text-slate-400">Пик активности</div>
              <div className="text-lg font-extrabold text-sky-300 mt-0.5 tabular-nums">
                {peakInterval ? peakInterval.label : '—'}
              </div>
              <div className="text-[11px] text-slate-500 tabular-nums">
                {peakInterval ? `${peakInterval.count} одновременных процессов` : 'нет перекрытий'}
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3">
              <div className="text-slate-400">Связи в отрезке</div>
              <div className="text-lg font-extrabold text-emerald-300 mt-0.5 tabular-nums">
                {totalUniqueLinks}
              </div>
              <div className="text-[11px] text-slate-500 tabular-nums">
                межветвевых: {crossBranchLinks.length}
              </div>
            </div>
          </div>

          {/* Предупреждение о скрытых на основной ленте ветках (при сохранении полной сводки в досье) */}
          {hiddenActiveBranches.length > 0 && (
            <div className="rounded-xl bg-slate-900/80 border border-amber-500/35 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5 min-w-0">
                <div className="text-amber-200 font-semibold">
                  Сводка включает все сферы периода, но на ленте сейчас скрыты{' '}
                  <span className="font-mono tabular-nums">{hiddenActiveBranches.length}</span>{' '}
                  активных веток этого окна:
                </div>
                <div className="text-slate-400 truncate max-w-2xl">
                  {hiddenActiveBranches.map((b) => b.label).join(' · ')}
                </div>
              </div>
              {onRevealBranches && (
                <button
                  type="button"
                  onClick={() => onRevealBranches(hiddenActiveBranches.map((b) => b.id))}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/45 text-amber-200 font-mono font-semibold transition-colors cursor-pointer shrink-0"
                >
                  Включить на ленте
                </button>
              )}
            </div>
          )}

          {/* Ключевые деятели отрезка */}
          {windowParticipants.length > 0 && onOpenPersonModal && (
            <div className="rounded-xl bg-sky-950/15 border border-sky-500/35 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-mono uppercase tracking-wider text-sky-300 flex items-center gap-2 font-bold">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span className="tabular-nums">
                    Ключевые деятели и участники ({windowParticipants.length})
                  </span>
                </div>
                <span className="text-[11px] text-sky-400/90">
                  нажмите на имя для открытия сквозного досье
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(showAllParticipants ? windowParticipants : windowParticipants.slice(0, 18)).map(
                  (participant) => (
                    <button
                      key={participant.personKey}
                      type="button"
                      onClick={() => onOpenPersonModal(participant.personKey)}
                      title={`Открыть досье: ${participant.displayName} (в окне: ${participant.reignEventCount}, всего в хронологии: ${participant.totalEventCount})`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950/90 hover:bg-sky-500/15 border border-sky-500/25 hover:border-sky-400/65 text-xs text-slate-100 hover:text-sky-200 transition-colors cursor-pointer"
                    >
                      <User className="w-3 h-3 text-sky-400 shrink-0" />
                      <span className="font-medium">{participant.displayName}</span>
                      <span className="text-[11px] font-mono text-sky-300/90 tabular-nums">
                        · {participant.reignEventCount}
                        {participant.totalEventCount > participant.reignEventCount
                          ? ` / ${participant.totalEventCount}`
                          : ''}
                      </span>
                    </button>
                  ),
                )}
              </div>

              {windowParticipants.length > 18 && (
                <button
                  type="button"
                  onClick={() => setShowAllParticipants((prev) => !prev)}
                  className="text-xs font-mono text-sky-300 hover:text-sky-200 transition-colors cursor-pointer"
                >
                  {showAllParticipants
                    ? 'Свернуть список участников'
                    : `Показать всех участников отрезка (${windowParticipants.length})`}
                </button>
              )}
            </div>
          )}

          {/* Ключевые узлы отрезка */}
          {topConnectedEvents.length > 0 && (
            <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/30 p-4 space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-emerald-300 flex items-center gap-2 font-bold">
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ключевые узлы отрезка (наибольшее число связей)</span>
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
                      onClick={() => onSelectEvent(ev.id)}
                      className="text-left p-3 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-emerald-500/25 hover:border-emerald-400/60 transition-all cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span
                          style={{ color: b?.color ?? '#fbbf24' }}
                          className="font-bold tabular-nums"
                        >
                          {ev.period} · {b?.label ?? ev.task}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-emerald-300 font-semibold tabular-nums shrink-0">
                          <Link2 className="w-3 h-3" />
                          <span>{ev.explicitLinks.length}</span>
                          {crossCount > 0 && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              (межветв.: {crossCount})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white">{ev.title}</div>
                      {ev.outcome ? (
                        <p className="text-xs text-amber-200/90 line-clamp-2">Итог: {ev.outcome}</p>
                      ) : (
                        <p className="text-xs text-slate-400 line-clamp-2">{ev.subtitle}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Межветвевые связи отрезка */}
          {crossBranchLinks.length > 0 && (
            <div className="rounded-xl bg-slate-900/75 border border-slate-800 p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-mono uppercase tracking-wider text-emerald-300 flex items-center gap-2 font-bold">
                  <GitBranch className="w-4 h-4 text-emerald-400" />
                  <span className="tabular-nums">
                    Межветвевые связи отрезка ({crossBranchLinks.length})
                  </span>
                </div>

                {historicalCrossCount > 0 && culturalCrossCount > 0 && (
                  <div className="inline-flex flex-wrap items-center rounded-lg bg-slate-950/90 border border-slate-800 p-0.5 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => {
                        setCrossLinkCircuit('all');
                        setShowAllCrossLinks(false);
                      }}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer tabular-nums ${
                        crossLinkCircuit === 'all'
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Все ({crossBranchLinks.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCrossLinkCircuit('historical');
                        setSelectedBranchPairKey(null);
                        setShowAllCrossLinks(false);
                      }}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer tabular-nums ${
                        crossLinkCircuit === 'historical'
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Политика, экономика, войны ({historicalCrossCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCrossLinkCircuit('cultural');
                        setSelectedBranchPairKey(null);
                        setShowAllCrossLinks(false);
                      }}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer tabular-nums ${
                        crossLinkCircuit === 'cultural'
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Культура и наука ({culturalCrossCount})
                    </button>
                  </div>
                )}
              </div>

              {filteredCrossBranchPairs.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {filteredCrossBranchPairs.map((pair) => {
                    const isSelected = effectivePairKey === pair.pairKey;
                    return (
                      <button
                        key={pair.pairKey}
                        type="button"
                        onClick={() => {
                          setSelectedBranchPairKey((prev) =>
                            prev === pair.pairKey ? null : pair.pairKey,
                          );
                          setShowAllCrossLinks(false);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-400/70 text-emerald-100 font-semibold'
                            : 'bg-slate-950/85 hover:bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: pair.colorA }}
                        />
                        <span>{pair.branchALabel}</span>
                        <span className="text-slate-500">↔</span>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: pair.colorB }}
                        />
                        <span>{pair.branchBLabel}</span>
                        <span className="font-mono text-[11px] text-emerald-300 tabular-nums ml-0.5">
                          · {pair.count}
                        </span>
                      </button>
                    );
                  })}
                  {effectivePairKey && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBranchPairKey(null);
                        setShowAllCrossLinks(false);
                      }}
                      className="px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Сбросить пару
                    </button>
                  )}
                </div>
              )}

              <div className="rounded-xl bg-slate-950/70 border border-slate-800/90 divide-y divide-slate-800/75 overflow-hidden">
                {displayedCrossLinks.map((lnk) => {
                  const fromBranch = branchMap.get(lnk.fromEvent.task);
                  const toBranch = branchMap.get(lnk.toEvent.task);
                  const fromExternalNote = !lnk.isFromInReign
                    ? lnk.fromEvent.endYear < yearFrom
                      ? 'до окна'
                      : 'вне окна'
                    : null;
                  const toExternalNote = !lnk.isToInReign
                    ? lnk.toEvent.startYear > yearTo
                      ? 'после окна'
                      : 'вне окна'
                    : null;

                  return (
                    <div key={lnk.id} className="p-3 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-stretch gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectEvent(lnk.fromEvent.id)}
                          className="text-left p-2.5 rounded-lg bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-600 transition-colors cursor-pointer space-y-1 min-w-0"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-mono">
                            <span
                              className="font-bold tabular-nums truncate"
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
                          <div className="text-xs font-bold text-white leading-snug">
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
                          onClick={() => onSelectEvent(lnk.toEvent.id)}
                          className="text-left p-2.5 rounded-lg bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-600 transition-colors cursor-pointer space-y-1 min-w-0"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-mono">
                            <span
                              className="font-bold tabular-nums truncate"
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
                          <div className="text-xs font-bold text-white leading-snug">
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
                <button
                  type="button"
                  onClick={() => setShowAllCrossLinks((prev) => !prev)}
                  className="text-xs font-mono text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer tabular-nums"
                >
                  {showAllCrossLinks
                    ? 'Свернуть список межветвевых связей'
                    : `Показать все связи выборки (${filteredCrossBranchLinks.length})`}
                </button>
              )}
            </div>
          )}

          {/* Распределение по сферам */}
          {branchBreakdown.length > 0 && (
            <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Распределение процессов по историческим, культурным и научным веткам</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {branchBreakdown.map(({ branch, count, isHiddenOnTimeline }) => {
                  const pct = Math.round((count / maxBranchCount) * 100);
                  return (
                    <div
                      key={branch.id}
                      className="rounded-lg bg-slate-950/80 border border-slate-800/90 p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-mono">
                        <span className="font-semibold text-white truncate">
                          {branch.label}
                          {isHiddenOnTimeline && (
                            <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                              (скрыта на ленте)
                            </span>
                          )}
                        </span>
                        <span className="font-bold tabular-nums shrink-0" style={{ color: branch.color }}>
                          {count}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: branch.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Сквозные процессы через границы окна */}
          {(carryOverInEvents.length > 0 || carryOverOutEvents.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {carryOverInEvents.length > 0 && (
                <div className="rounded-xl bg-sky-950/20 border border-sky-500/30 p-3.5 space-y-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-sky-300 font-bold tabular-nums">
                    Пришли из более ранних лет (до {yearFrom} г.): {carryOverInEvents.length}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {carryOverInEvents.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => onSelectEvent(ev.id)}
                        className="px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-900 border border-sky-500/35 text-xs font-mono text-sky-100 cursor-pointer text-left"
                      >
                        {formatEventTitleWithPeriod(ev)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {carryOverOutEvents.length > 0 && (
                <div className="rounded-xl bg-amber-950/20 border border-amber-500/30 p-3.5 space-y-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold tabular-nums">
                    Переходят за правый край окна (после {yearTo} г.): {carryOverOutEvents.length}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {carryOverOutEvents.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => onSelectEvent(ev.id)}
                        className="px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-900 border border-amber-500/35 text-xs font-mono text-amber-100 cursor-pointer text-left"
                      >
                        {formatEventTitleWithPeriod(ev)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Лица эпохи (Писатели / Учёные) */}
          {totalFiguresCount > 0 && (
            <div className="rounded-xl bg-amber-950/15 border border-amber-500/35 p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-mono uppercase tracking-wider text-amber-300 flex items-center gap-2 font-bold">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span className="tabular-nums">Лица периода ({totalFiguresCount})</span>
                </div>

                <div className="inline-flex items-center rounded-lg bg-slate-950/90 border border-slate-800 p-0.5 text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => setRoleFilter('all')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer tabular-nums ${
                      roleFilter === 'all'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Все ({totalFiguresCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter('writers')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1 tabular-nums ${
                      roleFilter === 'writers'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Feather className="w-3 h-3" />
                    <span>Писатели ({contemporaryWriters.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter('scientists')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1 tabular-nums ${
                      roleFilter === 'scientists'
                        ? 'bg-sky-400 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <FlaskConical className="w-3 h-3" />
                    <span>Учёные ({contemporaryScientists.length})</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {displayedFigures.map(({ item: fig, role }) => (
                  <button
                    key={fig.id}
                    type="button"
                    onClick={() => onSelectEvent(fig.id)}
                    className={`text-left p-3 rounded-xl bg-slate-950/85 hover:bg-slate-900 border transition-all cursor-pointer space-y-1 ${
                      role === 'scientist'
                        ? 'border-sky-500/30 hover:border-sky-400/60'
                        : 'border-amber-500/25 hover:border-amber-400/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                      <span
                        className={`font-bold tabular-nums inline-flex items-center gap-1 ${
                          role === 'scientist' ? 'text-sky-300' : 'text-amber-300'
                        }`}
                      >
                        {role === 'scientist' ? (
                          <FlaskConical className="w-3 h-3" />
                        ) : (
                          <Feather className="w-3 h-3" />
                        )}
                        {fig.period}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {role === 'scientist' ? 'Наука' : 'Литература'}
                      </span>
                    </div>
                    <div className="font-serif text-base font-bold text-white">{fig.title}</div>
                    <p className="text-xs text-slate-400 line-clamp-2">{fig.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Научные открытия и институты периода */}
          {discoveriesInPeriod.length > 0 && (
            <div className="rounded-xl bg-sky-950/15 border border-sky-500/35 p-4 space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-sky-300 flex items-center gap-2 font-bold">
                <FlaskConical className="w-4 h-4 text-sky-400" />
                <span className="tabular-nums">
                  Научные открытия и технологические рубежи ({discoveriesInPeriod.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {discoveriesInPeriod.map((disc) => (
                  <button
                    key={disc.id}
                    type="button"
                    onClick={() => onSelectEvent(disc.id)}
                    className="text-left p-3 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-sky-500/25 hover:border-sky-400/60 transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="font-bold text-sky-300 tabular-nums">{disc.period}</span>
                      {disc.explicitLinks.length > 0 && (
                        <span className="text-emerald-300 tabular-nums">
                          связей: {disc.explicitLinks.length}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-white">{disc.title}</div>
                    <p className="text-xs text-slate-400 line-clamp-2">{disc.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Книги и памятники письменности, созданные в окне */}
          {worksWrittenInPeriod.length > 0 && (
            <div className="rounded-xl bg-orange-950/15 border border-orange-500/35 p-4 space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-orange-300 flex items-center gap-2 font-bold">
                <BookOpen className="w-4 h-4 text-orange-400" />
                <span className="tabular-nums">
                  Произведения, созданные в окне {yearFrom}–{yearTo} ({worksWrittenInPeriod.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {worksWrittenInPeriod.map((work) => (
                  <button
                    key={work.id}
                    type="button"
                    onClick={() => onSelectEvent(work.id)}
                    className="text-left p-3 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-orange-500/25 hover:border-orange-400/60 transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="font-bold text-orange-300 tabular-nums">{work.period}</span>
                      {work.explicitLinks.length > 0 && (
                        <span className="text-emerald-300 tabular-nums">
                          связей: {work.explicitLinks.length}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-white">{work.title}</div>
                    <p className="text-xs text-slate-400 line-clamp-2">{work.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Произведения об этих событиях */}
          {worksAboutPeriod.length > 0 && (
            <div className="rounded-xl bg-purple-950/20 border border-purple-500/35 p-4 space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-purple-300 flex items-center gap-2 font-bold">
                <BookMarked className="w-4 h-4 text-purple-400" />
                <span className="tabular-nums">
                  Книги об этом периоде и его событиях ({worksAboutPeriod.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {worksAboutPeriod.map((work) => (
                  <button
                    key={work.id}
                    type="button"
                    onClick={() => onSelectEvent(work.id)}
                    className="text-left p-3 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-purple-500/25 hover:border-purple-400/60 transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="font-bold text-purple-300 tabular-nums">
                        Издано: {work.period}
                      </span>
                      <span className="text-amber-300">О событиях периода</span>
                    </div>
                    <div className="text-sm font-bold text-white">{work.title}</div>
                    <p className="text-xs text-slate-400 line-clamp-2">{work.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Правители на отрезке */}
          {overlappingRulers.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs font-mono uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span className="tabular-nums">
                  Правители и периоды власти на отрезке ({overlappingRulers.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {overlappingRulers.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelectRuler(r.id)}
                    className="text-left p-3.5 rounded-xl bg-slate-900/75 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                      <span className="font-bold text-amber-300 tabular-nums">{r.reignPeriod}</span>
                      <span className="text-slate-400 tabular-nums">
                        {r.center ? `${r.center} · ` : ''}
                        {Math.max(1, r.endYear - r.startYear)} л.
                      </span>
                    </div>
                    <div className="font-serif text-base font-bold text-white">{r.ruler}</div>
                    <p className="text-xs text-slate-400 line-clamp-2">{r.reignThesis}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Все исторические события окна */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="tabular-nums">
                  Исторические события отрезка ({windowEvents.length})
                </span>
              </div>

              {windowEvents.length > 0 && (
                <div className="inline-flex items-center rounded-lg bg-slate-950/90 border border-slate-800 p-0.5 text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => setEventsSortMode('chronological')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      eventsSortMode === 'chronological'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    По хронологии (по веткам)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventsSortMode('links')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      eventsSortMode === 'links'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    По числу связей
                  </button>
                </div>
              )}
            </div>

            {windowEvents.length === 0 ? (
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-6 text-center text-sm text-slate-400">
                На выбранном отрезке исторических событий не найдено.
              </div>
            ) : eventsSortMode === 'chronological' ? (
              leafBranches.map((branch) => {
                const items = windowEvents.filter((e) => e.task === branch.id);
                if (items.length === 0) return null;

                return (
                  <div
                    key={branch.id}
                    className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold" style={{ color: branch.color }}>
                        {branch.label}
                      </span>
                      <span className="text-slate-400 tabular-nums">Событий: {items.length}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {items.map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => onSelectEvent(ev.id)}
                          className="w-full text-left p-2.5 rounded-lg bg-slate-950/75 hover:bg-slate-800/90 border border-slate-800/90 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="font-mono text-xs font-bold tabular-nums"
                              style={{ color: branch.color }}
                            >
                              {ev.period}
                            </span>
                            {ev.explicitLinks.length > 0 && (
                              <span className="text-[11px] font-mono text-emerald-300 tabular-nums">
                                связей: {ev.explicitLinks.length}
                              </span>
                            )}
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                            {ev.title}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{ev.subtitle}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800/75 overflow-hidden">
                {eventsSortedByLinks.map((ev) => {
                  const branch = branchMap.get(ev.task);
                  const crossCount = ev.explicitLinks.filter(
                    (l) => l.targetEvent.task !== ev.task,
                  ).length;

                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onSelectEvent(ev.id)}
                      className="w-full text-left p-3.5 hover:bg-slate-800/65 transition-colors cursor-pointer block"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className="font-mono text-xs font-bold tabular-nums"
                          style={{ color: branch?.color ?? '#fbbf24' }}
                        >
                          {ev.period} · {branch?.label ?? ev.task}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              ev.explicitLinks.length > 0 ? 'text-emerald-300' : 'text-slate-500'
                            }`}
                          >
                            <Link2 className="w-3 h-3" />
                            связей: {ev.explicitLinks.length}
                          </span>
                          {crossCount > 0 && (
                            <span className="text-slate-400">· межветв.: {crossCount}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white mt-1">{ev.title}</div>
                      {ev.outcome ? (
                        <p className="text-xs text-amber-200/90 mt-0.5 line-clamp-2">
                          Итог: {ev.outcome}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 mt-0.5">{ev.subtitle}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
