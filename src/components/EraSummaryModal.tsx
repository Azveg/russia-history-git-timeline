import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  BookOpen,
  Crown,
  Feather,
  Flame,
  FlaskConical,
  GitCompareArrows,
  Layers,
  Link2,
  MapPin,
  ScrollText,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  formatEventTitleWithPeriod,
  getLeafBranches,
  getMacroEraSummaryData,
  resolveMacroEra,
  resolveMacroEras,
} from '../engine/timelineEngine';
import type {
  BranchDefinition,
  EnrichedEvent,
  MacroEra,
  ModalHistoryItem,
  RulerPeriod,
} from '../types/timeline';

interface EraSummaryModalProps {
  era: MacroEra | null;
  eras: MacroEra[];
  rulers: RulerPeriod[];
  enrichedEvents: EnrichedEvent[];
  branches: BranchDefinition[];
  modalHistory?: ModalHistoryItem[];
  onClose: () => void;
  onNavigateBack?: () => void;
  onSelectEra: (eraId: string) => void;
  onSelectRuler: (rulerId: string) => void;
  onSelectEvent: (eventId: string) => void;
  onFilterByEraRange: (startYear: number, endYear: number) => void;
  onCompareWithEra?: (eraId: string) => void;
}

type EraFiguresRoleFilter = 'all' | 'writers' | 'scientists';

export function EraSummaryModal({
  era,
  eras,
  rulers,
  enrichedEvents,
  branches,
  modalHistory = [],
  onClose,
  onNavigateBack,
  onSelectEra,
  onSelectRuler,
  onSelectEvent,
  onFilterByEraRange,
  onCompareWithEra,
}: EraSummaryModalProps) {
  const [roleFilter, setRoleFilter] = useState<EraFiguresRoleFilter>('all');

  useEffect(() => {
    if (!era) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [era, onClose]);

  const resolvedEras = useMemo(() => resolveMacroEras(eras), [eras]);

  const summary = useMemo(() => {
    if (!era) return null;
    const resolved =
      resolvedEras.find((e) => e.id === era.id) ??
      resolveMacroEra(era, eras.findIndex((e) => e.id === era.id));
    return getMacroEraSummaryData(resolved, rulers, enrichedEvents, branches);
  }, [era, resolvedEras, eras, rulers, enrichedEvents, branches]);

  if (!era || !summary) return null;

  const {
    era: resolvedEra,
    eraRulers,
    eraEvents,
    contemporaryWriters,
    contemporaryScientists,
    worksWrittenInPeriod,
    discoveriesInPeriod,
    worksAboutPeriod,
    carryOverInEvents,
    carryOverOutEvents,
    branchBreakdown,
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
      aria-labelledby="era-modal-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl max-h-[92vh] rounded-2xl bg-[#0b1325] border border-amber-500/40 shadow-2xl flex flex-col overflow-hidden">
        {/* Верхняя панель с кнопкой «Назад», номером макро-периода и быстрым фильтром */}
        <div className="px-5 py-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs font-mono text-amber-400 flex-wrap min-w-0">
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
            <ScrollText className="w-4 h-4 shrink-0" />
            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black tabular-nums">
              {resolvedEra.displayShortTitle}
            </span>
            <span className="font-bold text-amber-200 tabular-nums">{resolvedEra.period}</span>
            <span className="text-slate-500 hidden sm:inline">· Досье макро-периода</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onCompareWithEra && (
              <button
                type="button"
                onClick={() => onCompareWithEra(resolvedEra.id)}
                className="px-3 py-1.5 rounded-lg border border-sky-500/40 bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 text-xs font-mono font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                title="Сравнить эту макро-эпоху с другой эпохой или правлением"
              >
                <GitCompareArrows className="w-3.5 h-3.5 text-sky-400" />
                <span>Сравнить с…</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onFilterByEraRange(resolvedEra.startYear, resolvedEra.endYear);
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              Сфокусировать окно ({resolvedEra.startYear}–{resolvedEra.endYear})
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть досье макро-периода"
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Тело модального окна */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Заголовок и исторический тезис */}
          <div>
            <h3
              id="era-modal-title"
              className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight"
            >
              {resolvedEra.title}
            </h3>
            <p className="text-sm sm:text-base text-slate-200 mt-2 leading-relaxed">
              {resolvedEra.thesis}
            </p>

            {centers.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-mono">
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  Политические центры и столицы эпохи:
                </span>
                {centers.map((center) => (
                  <span
                    key={center}
                    className="px-2 py-0.5 rounded-md bg-slate-900 border border-amber-500/30 text-amber-200 font-semibold"
                  >
                    {center}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 4 сводных индикатора эпохи */}
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
                {eraEvents.length} соб. · {totalFiguresCount} лиц
              </div>
              <div className="text-[11px] text-slate-500 tabular-nums">
                книг: {worksWrittenInPeriod.length} · открытий: {discoveriesInPeriod.length}
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3">
              <div className="text-slate-400">Пик активности</div>
              <div className="text-lg font-extrabold text-emerald-300 mt-0.5 tabular-nums">
                {peakInterval ? peakInterval.label : '—'}
              </div>
              <div className="text-[11px] text-slate-500 tabular-nums">
                {peakInterval
                  ? `${peakInterval.count} одновременных событий · связей: ${totalSyncLinks}`
                  : `связей: ${totalSyncLinks}`}
              </div>
            </div>
          </div>

          {/* Распределение событий по веткам */}
          {branchBreakdown.length > 0 && (
            <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 space-y-2.5">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Структура эпохи по историческим веткам</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {branchBreakdown.map(({ branch, count }) => (
                  <div
                    key={branch.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: branch.color }}
                    />
                    <span className="text-slate-200 font-semibold">{branch.label}</span>
                    <span
                      className="px-1.5 py-0.5 rounded bg-slate-900 font-bold tabular-nums"
                      style={{ color: branch.color }}
                    >
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Блок «Лица эпохи» с группировкой по ролям (Писатели и мыслители / Учёные и изобретатели) */}
          {totalFiguresCount > 0 && (
            <div className="rounded-xl bg-amber-950/15 border border-amber-500/35 p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-mono uppercase tracking-wider text-amber-300 flex items-center gap-2 font-bold">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Лица эпохи: писатели, мыслители и учёные ({totalFiguresCount})</span>
                </div>

                {/* Табы фильтрации по ролям */}
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

          {/* Научные открытия и технологические прорывы периода */}
          {discoveriesInPeriod.length > 0 && (
            <div className="rounded-xl bg-sky-950/15 border border-sky-500/35 p-4 space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-sky-300 flex items-center gap-2 font-bold">
                <FlaskConical className="w-4 h-4 text-sky-400" />
                <span>
                  Научные открытия, академии и инженерные рубежи периода ({discoveriesInPeriod.length})
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

          {/* Книги и памятники письменности, созданные в этот период */}
          {worksWrittenInPeriod.length > 0 && (
            <div className="rounded-xl bg-orange-950/15 border border-orange-500/35 p-4 space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-orange-300 flex items-center gap-2 font-bold">
                <BookOpen className="w-4 h-4 text-orange-400" />
                <span>
                  Литературные памятники и книги, созданные в этот период ({worksWrittenInPeriod.length})
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

          {/* Произведения об этой эпохе, написанные позднее */}
          {worksAboutPeriod.length > 0 && (
            <div className="rounded-xl bg-purple-950/20 border border-purple-500/35 p-4 space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-purple-300 flex items-center gap-2 font-bold">
                <BookMarked className="w-4 h-4 text-purple-400" />
                <span>
                  Произведения об этой эпохе (ретроспективный взгляд, {worksAboutPeriod.length})
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

          {/* Сквозные процессы на границах эпохи */}
          {(carryOverInEvents.length > 0 || carryOverOutEvents.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {carryOverInEvents.length > 0 && (
                <div className="rounded-xl bg-sky-950/25 border border-sky-500/30 p-3.5 space-y-2">
                  <div className="text-xs font-mono text-sky-300 font-bold">
                    Начались ранее и перешли в этот период ({carryOverInEvents.length}):
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
                <div className="rounded-xl bg-amber-950/25 border border-amber-500/30 p-3.5 space-y-2">
                  <div className="text-xs font-mono text-amber-300 font-bold">
                    Продолжились в следующем макро-периоде ({carryOverOutEvents.length}):
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

          {/* Узловые события эпохи */}
          {topConnectedEvents.length > 0 && (
            <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/30 p-4 space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-emerald-300 flex items-center gap-2 font-bold">
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ключевые события эпохи (наибольшее число причинно-следственных связей)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {topConnectedEvents.map((ev) => {
                  const b = branches.find((br) => br.id === ev.task);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onSelectEvent(ev.id)}
                      className="text-left p-3 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-emerald-500/25 hover:border-emerald-400/60 transition-all cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span style={{ color: b?.color ?? '#fbbf24' }} className="font-bold">
                          {ev.period} · {b?.label ?? ev.task}
                        </span>
                        <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                          <Link2 className="w-3 h-3" /> {ev.explicitLinks.length}
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

          {/* Правители макро-периода */}
          <div className="space-y-2.5">
            <div className="text-xs font-mono uppercase tracking-wider text-amber-300 flex items-center gap-2">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Правители и периоды власти внутри эпохи ({eraRulers.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {eraRulers.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onSelectRuler(r.id)}
                  className="text-left p-3.5 rounded-xl bg-slate-900/75 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-mono">
                    <span className="font-bold text-amber-300 tabular-nums">{r.reignPeriod}</span>
                    <div className="flex items-center gap-1.5">
                      {r.center && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-[10px] text-slate-300">
                          {r.center}
                        </span>
                      )}
                      <span className="text-slate-500 tabular-nums">
                        {Math.max(1, r.endYear - r.startYear)} л.
                      </span>
                    </div>
                  </div>
                  <div className="font-serif text-base font-bold text-white">{r.ruler}</div>
                  <p className="text-xs text-slate-400 line-clamp-2">{r.reignThesis}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Все исторические события макро-периода по веткам */}
          <div className="space-y-4">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Исторические события макро-периода по веткам ({eraEvents.length})</span>
            </div>

            {leafBranches.map((branch) => {
              const items = eraEvents.filter((e) => e.task === branch.id);
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
                          <span className="text-[11px] font-mono text-slate-500">
                            {ev.explicitLinks.length > 0 ? `связей: ${ev.explicitLinks.length}` : ''}
                          </span>
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
            })}
          </div>
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
