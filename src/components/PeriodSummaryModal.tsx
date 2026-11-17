import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  Crown,
  Feather,
  FlaskConical,
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
}

type EraFiguresRoleFilter = 'all' | 'writers' | 'scientists';

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
}: PeriodSummaryModalProps) {
  const [roleFilter, setRoleFilter] = useState<EraFiguresRoleFilter>('all');
  const [showAllParticipants, setShowAllParticipants] = useState(false);

  useEffect(() => {
    setShowAllParticipants(false);
    setRoleFilter('all');
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
  } = summary;

  const leafBranches = getLeafBranches(branches).filter((b) => !b.isTimeAxis);
  const lastHistoryItem = modalHistory.length > 0 ? modalHistory[modalHistory.length - 1] : null;

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md"
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
            <button
              type="button"
              onClick={() => {
                onFilterByRuler(ruler.id);
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold transition-colors cursor-pointer"
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

          {/* Исторические события правления по веткам */}
          <div className="space-y-4">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Исторические события в годы правления ({reignEvents.length})</span>
            </div>

            {leafBranches.map((branch) => {
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
                    <span className="text-slate-400">Событий: {items.length}</span>
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
                            <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                              {isInherited && (
                                <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300">
                                  началось до {ruler.startYear}
                                </span>
                              )}
                              {isCarryOver && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">
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
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
