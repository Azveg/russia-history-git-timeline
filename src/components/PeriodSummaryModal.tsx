import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  BookOpen,
  Crown,
  Feather,
  Flame,
  FlaskConical,
  GitBranch,
  GitCompareArrows,
  Link2,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getLeafBranches, getRulerPeriodSummaryData } from '../engine/timelineEngine';
import type {
  BranchDefinition,
  EnrichedEvent,
  ModalHistoryItem,
  PersonDossier,
  RulerPeriod,
} from '../types/timeline';

interface PeriodSummaryModalProps {
  ruler: RulerPeriod | null;
  enrichedEvents: EnrichedEvent[];
  branches: BranchDefinition[];
  personDossiers?: Map<string, PersonDossier>;
  modalHistory?: ModalHistoryItem[];
  onClose: () => void;
  onNavigateBack?: () => void;
  onSelectCard: (id: string) => void;
  onOpenPersonModal?: (personKey: string) => void;
  onFilterByRuler: (rulerId: string) => void;
  onCompareWithRuler?: (rulerId: string) => void;
}

type EraFiguresRoleFilter = 'all' | 'writers' | 'scientists';
type CrossLinkCircuitFilter = 'all' | 'historical' | 'cultural';
type ReignEventsSortMode = 'chronological' | 'links';

export function PeriodSummaryModal({
  ruler,
  enrichedEvents,
  branches,
  personDossiers,
  modalHistory = [],
  onClose,
  onNavigateBack,
  onSelectCard,
  onOpenPersonModal,
  onFilterByRuler,
  onCompareWithRuler,
}: PeriodSummaryModalProps) {
  const [roleFilter, setRoleFilter] = useState<EraFiguresRoleFilter>('all');
  const [showAllParticipants, setShowAllParticipants] = useState(false);
  const [crossLinkCircuit, setCrossLinkCircuit] = useState<CrossLinkCircuitFilter>('all');
  const [selectedBranchPairKey, setSelectedBranchPairKey] = useState<string | null>(null);
  const [showAllCrossLinks, setShowAllCrossLinks] = useState(false);
  const [eventsSortMode, setEventsSortMode] = useState<ReignEventsSortMode>('chronological');

  useEffect(() => {
    setShowAllParticipants(false);
    setRoleFilter('all');
    setCrossLinkCircuit('all');
    setSelectedBranchPairKey(null);
    setShowAllCrossLinks(false);
    setEventsSortMode('chronological');
  }, [ruler?.id]);

  useEffect(() => {
    if (!ruler) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ruler, onClose]);

  const summary = useMemo(() => {
    if (!ruler) return null;
    return getRulerPeriodSummaryData(ruler, enrichedEvents, branches, personDossiers);
  }, [ruler, enrichedEvents, branches, personDossiers]);

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
    return [...summary.reignEvents].sort((a, b) => {
      if (b.explicitLinks.length !== a.explicitLinks.length) {
        return b.explicitLinks.length - a.explicitLinks.length;
      }
      const aCross = a.explicitLinks.filter((l) => l.targetEvent.task !== a.task).length;
      const bCross = b.explicitLinks.filter((l) => l.targetEvent.task !== b.task).length;
      if (bCross !== aCross) return bCross - aCross;
      return a.startYear - b.startYear;
    });
  }, [summary]);

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
    topConnectedEvents,
    crossBranchLinks,
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="period-modal-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl bg-[#0b1325] border border-amber-500/40 shadow-2xl flex flex-col overflow-hidden">
        {/* Верхняя панель с кнопкой «Назад» и данными правителя */}
        <div className="px-5 py-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 flex-wrap min-w-0">
            {lastHistoryItem && onNavigateBack && (
              <button
                type="button"
                onClick={onNavigateBack}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 font-semibold transition-colors cursor-pointer"
                title={`Вернуться назад: ${lastHistoryItem.label}`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="truncate max-w-[200px]">Назад: {lastHistoryItem.label}</span>
              </button>
            )}
            <Crown className="w-4 h-4 shrink-0" />
            <span className="font-bold">Досье правления · {ruler.reignPeriod}</span>
            {ruler.center && (
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-amber-500/35 text-[11px] text-amber-200">
                Центр: {ruler.center}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onCompareWithRuler && (
              <button
                type="button"
                onClick={() => onCompareWithRuler(ruler.id)}
                className="px-3 py-1.5 rounded-lg border border-sky-500/40 bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 text-xs font-mono font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                title="Открыть сравнение этого правления с другим правлением или эпохой"
              >
                <GitCompareArrows className="w-3.5 h-3.5 text-sky-400" />
                <span>Сравнить с…</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onFilterByRuler(ruler.id);
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              Сфокусировать таймлайн
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть досье правления"
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Тело модального окна */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          <div>
            <h3
              id="period-modal-title"
              className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight"
            >
              {ruler.reignTitle} ({ruler.reignPeriod})
            </h3>
            <p className="text-sm sm:text-base text-slate-200 mt-1.5 leading-relaxed">
              {ruler.reignThesis}
            </p>
          </div>

          {/* 3 сводных индикатора правления */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
              <div className="text-slate-400">Новых событий в правление</div>
              <div className="text-lg font-extrabold text-amber-400 mt-0.5 tabular-nums">
                {startedInReign.length}
              </div>
              <div className="text-[11px] text-slate-500 tabular-nums">
                всего процессов в период: {reignEvents.length}
              </div>
            </div>
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
              <div className="text-slate-400">Лица эпохи и культура</div>
              <div className="text-lg font-extrabold text-sky-400 mt-0.5 tabular-nums">
                {totalFiguresCount} лиц · {worksWrittenInPeriod.length + discoveriesInPeriod.length} пам.
              </div>
              <div className="text-[11px] text-slate-500 tabular-nums">
                книг: {worksWrittenInPeriod.length} · открытий: {discoveriesInPeriod.length}
              </div>
            </div>
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
              <div className="text-slate-400">Сквозные процессы</div>
              <div className="text-lg font-extrabold text-emerald-400 mt-0.5 tabular-nums">
                {inheritedEvents.length} вх. / {carryOverEvents.length} исх.
              </div>
              <div className="text-[11px] text-slate-500">перешли через рубежи правления</div>
            </div>
          </div>

          {/* Ключевые деятели и окружение правителя */}
          {reignParticipants.length > 0 && onOpenPersonModal && (
            <div className="rounded-xl bg-sky-950/15 border border-sky-500/35 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-mono uppercase tracking-wider text-sky-300 flex items-center gap-2 font-bold">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>
                    Ключевые деятели и окружение при {ruler.shortRuler} ({reignParticipants.length})
                  </span>
                </div>
                <span className="text-[11px] text-sky-400/90">
                  нажмите на имя для открытия сквозного досье
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(showAllParticipants ? reignParticipants : reignParticipants.slice(0, 18)).map(
                  (participant) => (
                    <button
                      key={participant.personKey}
                      type="button"
                      onClick={() => onOpenPersonModal(participant.personKey)}
                      title={`Открыть досье: ${participant.displayName} (в это правление: ${participant.reignEventCount}, всего в хронологии: ${participant.totalEventCount})`}
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

              {reignParticipants.length > 18 && (
                <button
                  type="button"
                  onClick={() => setShowAllParticipants((prev) => !prev)}
                  className="text-xs font-mono text-sky-300 hover:text-sky-200 transition-colors cursor-pointer"
                >
                  {showAllParticipants
                    ? 'Свернуть список окружения'
                    : `Показать всех участников правления (${reignParticipants.length})`}
                </button>
              )}
            </div>
          )}

          {/* Ключевые узлы правления */}
          {topConnectedEvents.length > 0 && (
            <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/30 p-4 space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-emerald-300 flex items-center gap-2 font-bold">
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ключевые узлы правления (наибольшее число связей)</span>
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
                        <p className="text-xs text-amber-200/90 line-clamp-2">
                          Итог: {ev.outcome}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 line-clamp-2">{ev.subtitle}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Межветвевые связи правления */}
          {crossBranchLinks.length > 0 && (
            <div className="rounded-xl bg-slate-900/75 border border-slate-800 p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-mono uppercase tracking-wider text-emerald-300 flex items-center gap-2 font-bold">
                  <GitBranch className="w-4 h-4 text-emerald-400" />
                  <span className="tabular-nums">
                    Межветвевые связи правления ({crossBranchLinks.length})
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

              {/* Сводка связок по парам веток */}
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

              {/* Список конкретных связок */}
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
                          onClick={() => onSelectCard(lnk.toEvent.id)}
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

          {/* Блок «Лица эпохи» (Писатели и мыслители / Учёные и изобретатели) */}
          {totalFiguresCount > 0 && (
            <div className="rounded-xl bg-amber-950/15 border border-amber-500/35 p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-mono uppercase tracking-wider text-amber-300 flex items-center gap-2 font-bold">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Лица эпохи при {ruler.shortRuler} ({totalFiguresCount})</span>
                </div>

                <div className="inline-flex items-center rounded-lg bg-slate-950/90 border border-slate-800 p-0.5 text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => setRoleFilter('all')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
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
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1 ${
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
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1 ${
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {displayedFigures.map(({ item: fig, role }) => (
                  <button
                    key={fig.id}
                    type="button"
                    onClick={() => onSelectCard(fig.id)}
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
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-[10px] text-slate-300">
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

          {/* Научные открытия и институты в годы правления */}
          {discoveriesInPeriod.length > 0 && (
            <div className="rounded-xl bg-sky-950/15 border border-sky-500/35 p-4 space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-sky-300 flex items-center gap-2 font-bold">
                <FlaskConical className="w-4 h-4 text-sky-400" />
                <span>
                  Научные открытия и институты в годы правления ({discoveriesInPeriod.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {discoveriesInPeriod.map((disc) => (
                  <button
                    key={disc.id}
                    type="button"
                    onClick={() => onSelectCard(disc.id)}
                    className="text-left p-3 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-sky-500/25 hover:border-sky-400/60 transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="font-bold text-sky-300 tabular-nums">{disc.period}</span>
                      {disc.explicitLinks.length > 0 && (
                        <span className="text-emerald-300">
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

          {/* Книги и памятники литературы, созданные в годы правления */}
          {worksWrittenInPeriod.length > 0 && (
            <div className="rounded-xl bg-orange-950/15 border border-orange-500/35 p-4 space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-orange-300 flex items-center gap-2 font-bold">
                <BookOpen className="w-4 h-4 text-orange-400" />
                <span>
                  Книги и произведения, созданные в годы правления ({worksWrittenInPeriod.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {worksWrittenInPeriod.map((work) => (
                  <button
                    key={work.id}
                    type="button"
                    onClick={() => onSelectCard(work.id)}
                    className="text-left p-3 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-orange-500/25 hover:border-orange-400/60 transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="font-bold text-orange-300 tabular-nums">{work.period}</span>
                      {work.explicitLinks.length > 0 && (
                        <span className="text-emerald-300">
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

          {/* Произведения об этом правителе и эпохе, написанные позднее */}
          {worksAboutPeriod.length > 0 && (
            <div className="rounded-xl bg-purple-950/20 border border-purple-500/35 p-4 space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-purple-300 flex items-center gap-2 font-bold">
                <BookMarked className="w-4 h-4 text-purple-400" />
                <span>
                  Произведения об этом правителе и его времени ({worksAboutPeriod.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {worksAboutPeriod.map((work) => (
                  <button
                    key={work.id}
                    type="button"
                    onClick={() => onSelectCard(work.id)}
                    className="text-left p-3 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-purple-500/25 hover:border-purple-400/60 transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="font-bold text-purple-300 tabular-nums">
                        Издано: {work.period}
                      </span>
                      <span className="text-amber-300">О правлении / событиях</span>
                    </div>
                    <div className="text-sm font-bold text-white">{work.title}</div>
                    <p className="text-xs text-slate-400 line-clamp-2">{work.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Исторические события правления */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="tabular-nums">
                  Исторические события в годы правления ({reignEvents.length})
                </span>
              </div>

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
            </div>

            {eventsSortMode === 'chronological' ? (
              leafBranches.map((branch) => {
                const items = reignEvents.filter((e) => e.task === branch.id);
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

                    <div className="space-y-2">
                      {items.map((ev) => {
                        const isInherited = ev.startYear < ruler.startYear;
                        const isCarryOver = ev.endYear > ruler.endYear;
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => onSelectCard(ev.id)}
                            className="w-full text-left p-2.5 rounded-lg bg-slate-950/75 hover:bg-slate-800/90 border border-slate-800/90 transition-colors cursor-pointer"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span
                                className="font-mono text-xs font-bold tabular-nums"
                                style={{ color: branch.color }}
                              >
                                {ev.period}
                              </span>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                                {ev.explicitLinks.length > 0 && (
                                  <span className="inline-flex items-center gap-1 text-emerald-300 tabular-nums">
                                    <Link2 className="w-3 h-3" />
                                    связей: {ev.explicitLinks.length}
                                  </span>
                                )}
                                {isInherited && (
                                  <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 tabular-nums">
                                    началось до {ruler.startYear}
                                  </span>
                                )}
                                {isCarryOver && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 tabular-nums">
                                    продолжилось после {ruler.endYear}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                              {ev.title}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{ev.subtitle}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800/75 overflow-hidden">
                {eventsSortedByLinks.map((ev) => {
                  const branch = branchMap.get(ev.task);
                  const isInherited = ev.startYear < ruler.startYear;
                  const isCarryOver = ev.endYear > ruler.endYear;
                  const crossCount = ev.explicitLinks.filter(
                    (l) => l.targetEvent.task !== ev.task,
                  ).length;

                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onSelectCard(ev.id)}
                      className="w-full text-left p-3.5 hover:bg-slate-800/65 transition-colors cursor-pointer block"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                          <span
                            className="font-bold tabular-nums"
                            style={{ color: branch?.color ?? '#fbbf24' }}
                          >
                            {ev.period} · {branch?.label ?? ev.task}
                          </span>
                          {isInherited && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-[11px] text-sky-300 tabular-nums">
                              началось до {ruler.startYear}
                            </span>
                          )}
                          {isCarryOver && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-[11px] text-amber-300 tabular-nums">
                              продолжилось после {ruler.endYear}
                            </span>
                          )}
                        </div>

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

                      <div className="text-xs sm:text-sm font-bold text-white mt-1">
                        {ev.title}
                      </div>
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
