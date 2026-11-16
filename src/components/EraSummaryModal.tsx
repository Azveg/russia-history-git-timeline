import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CalendarRange, ChevronLeft, ChevronRight, Crown, Feather, History, RotateCcw, X } from 'lucide-react';
import { getMacroEraSummaryData, resolveEventBranch, resolveMacroEras } from '../engine/timelineEngine';
import { useOverlayScrollLock } from '../utils/scrollIsolation';
import type { BranchDefinition, EnrichedEvent, MacroEra, RulerPeriod } from '../types/timeline';

interface EraSummaryModalProps {
  eraId: string | null;
  macroEras: MacroEra[];
  minYear?: number;
  maxYear?: number;
  rulers: RulerPeriod[];
  enrichedEvents: EnrichedEvent[];
  branches: BranchDefinition[];
  onClose: () => void;
  onSelectEraModal: (eraId: string) => void;
  onFilterByEraOnTimeline: (eraId: string) => void;
  onOpenRulerModal: (rulerId: string) => void;
  onOpenCardModal: (eventId: string) => void;
}

export function EraSummaryModal({
  eraId,
  macroEras,
  minYear = 862,
  maxYear = 2000,
  rulers,
  enrichedEvents,
  branches,
  onClose,
  onSelectEraModal,
  onFilterByEraOnTimeline,
  onOpenRulerModal,
  onOpenCardModal,
}: EraSummaryModalProps) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');

  const resolvedEras = useMemo(() => resolveMacroEras(macroEras), [macroEras]);
  const idx = eraId ? resolvedEras.findIndex((e) => e.id === eraId) : -1;
  const eraObj = idx !== -1 ? resolvedEras[idx] : undefined;
  const isModalOpen = Boolean(eraId && eraObj);

  useOverlayScrollLock(isModalOpen, [bodyRef]);

  useEffect(() => {
    setSelectedBranchId('ALL');
    setSelectedEventType('ALL');
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [eraId]);

  const summary = useMemo(() => {
    if (!eraObj) return null;
    return getMacroEraSummaryData(eraObj, rulers, enrichedEvents, branches);
  }, [eraObj, rulers, enrichedEvents, branches]);

  const filteredEvents = useMemo(() => {
    if (!summary) return [];
    return summary.events.filter((ev) => {
      if (selectedBranchId !== 'ALL') {
        const b = resolveEventBranch(ev, branches);
        if (b.id !== selectedBranchId) return false;
      }
      if (selectedEventType !== 'ALL') {
        const typeLabel = (ev.type || 'Событие').trim();
        if (typeLabel !== selectedEventType) return false;
      }
      return true;
    });
  }, [summary, selectedBranchId, selectedEventType, branches]);

  if (!isModalOpen || !eraObj || !summary) return null;

  const prevEra = idx > 0 ? resolvedEras[idx - 1] : null;
  const nextEra = idx < resolvedEras.length - 1 ? resolvedEras[idx + 1] : null;
  const hasLocalFilter = selectedBranchId !== 'ALL' || selectedEventType !== 'ALL';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl max-h-[92vh] flex flex-col animate-modal"
      >
        <div className="p-6 bg-gradient-to-b from-slate-800/80 to-slate-900 border-b border-slate-800 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть карточку периода"
            className="absolute right-4 top-4 w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-wrap items-center justify-between gap-2 pr-10 mb-2">
            <div className="inline-flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black tabular-nums">
                {eraObj.period}
              </span>
              <span className="text-amber-300 font-semibold">{eraObj.displayShortTitle}</span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="text-slate-400 tabular-nums">
                Период {idx + 1} из {resolvedEras.length}
              </span>
            </div>

            {eraObj.endYear >= minYear || summary.events.length > 0 || summary.rulers.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  onFilterByEraOnTimeline(eraObj.id);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-xs font-mono font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Показать период на графике</span>
              </button>
            ) : (
              <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap shrink-0">
                График сейчас охватывает {minYear}–{maxYear} гг.
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-white [text-wrap:balance]">
            {eraObj.title}
          </h2>
          <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">{eraObj.thesis}</p>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-slate-400 tabular-nums">
            <span>
              Правителей: <strong className="text-slate-100">{summary.rulers.length}</strong>
            </span>
            <span aria-hidden="true" className="text-slate-700">
              ·
            </span>
            <span>
              Событий: <strong className="text-slate-100">{summary.events.length}</strong>
            </span>
            <span aria-hidden="true" className="text-slate-700">
              ·
            </span>
            <span>
              Писателей эпохи:{' '}
              <strong className="text-fuchsia-300">{summary.contemporaryWriters.length}</strong>
            </span>
            <span aria-hidden="true" className="text-slate-700">
              ·
            </span>
            <span>
              Книг периода:{' '}
              <strong className="text-purple-300">{summary.worksWrittenInPeriod.length}</strong>
            </span>
            <span aria-hidden="true" className="text-slate-700">
              ·
            </span>
            <span>
              Книг об эпохе:{' '}
              <strong className="text-amber-300">{summary.worksAboutPeriod.length}</strong>
            </span>
          </div>
        </div>

        <div ref={bodyRef} className="p-6 flex-1 overflow-y-auto overscroll-contain space-y-6">
          <div>
            <div className="text-xs font-mono font-bold text-slate-400 mb-2.5">
              Правители, вошедшие в период ({summary.rulers.length}):
            </div>

            {summary.rulers.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400">
                {eraObj.endYear < minYear
                  ? `Данные о правителях этого периода появятся после подключения модулей до ${minYear} г.`
                  : 'В этом макро-периоде не найдено пересекающихся правлений.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {summary.rulers.map(({ ruler, eventCount }) => (
                  <button
                    key={ruler.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenRulerModal(ruler.id);
                    }}
                    title={`Открыть карточку правителя: ${ruler.ruler} (${ruler.reignPeriod})`}
                    className="text-left p-3 rounded-xl bg-slate-950/85 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/45 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white group-hover:text-amber-200 truncate">
                        <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{ruler.shortRuler}</span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 tabular-nums shrink-0">
                        {eventCount} соб.
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-amber-300/90 tabular-nums mt-1">
                      {ruler.reignPeriod}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {summary.contemporaryWriters.length > 0 && (
            <div className="pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-fuchsia-300 mb-2.5">
                <Feather className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Лица эпохи · Писатели и поэты, жившие в этот период ({summary.contemporaryWriters.length}):
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {summary.contemporaryWriters.map((writer) => (
                  <button
                    key={writer.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCardModal(writer.id);
                    }}
                    className="text-left p-3 rounded-xl bg-slate-950/85 hover:bg-slate-950 border border-fuchsia-500/25 hover:border-fuchsia-400/60 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white group-hover:text-fuchsia-200 truncate">
                        {writer.title}
                      </span>
                      <span className="text-[11px] font-mono text-fuchsia-300 tabular-nums shrink-0">
                        {writer.period}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {writer.subtitle}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {summary.worksWrittenInPeriod.length > 0 && (
            <div className="pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-300 mb-2.5">
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Книги и произведения, написанные в этот период ({summary.worksWrittenInPeriod.length}):
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {summary.worksWrittenInPeriod.map((work) => (
                  <button
                    key={work.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCardModal(work.id);
                    }}
                    className="text-left p-3 rounded-xl bg-slate-950/85 hover:bg-slate-950 border border-purple-500/25 hover:border-purple-400/60 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-purple-300 font-semibold tabular-nums">
                        {work.period}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[160px]">
                        {work.type}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white group-hover:text-purple-200 mt-1">
                      {work.title}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {work.subtitle}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {summary.worksAboutPeriod.length > 0 && (
            <div className="pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-300 mb-2.5">
                <History className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Книги и произведения об этом историческом периоде ({summary.worksAboutPeriod.length}):
                </span>
              </div>
              <div className="space-y-2">
                {summary.worksAboutPeriod.map(({ work, relationLabel, yearGap }) => (
                  <button
                    key={work.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCardModal(work.id);
                    }}
                    className="w-full text-left p-3 rounded-xl bg-slate-950/85 hover:bg-slate-950 border border-amber-500/25 hover:border-amber-400/60 transition-colors cursor-pointer group"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-bold text-white group-hover:text-amber-200">
                        <span className="font-mono text-amber-300 mr-2 tabular-nums">
                          {work.period}
                        </span>
                        {work.title}
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-[10px] font-mono text-amber-200 tabular-nums shrink-0">
                        {yearGap > 0 ? `+${yearGap} л. спустя` : 'современник эпохи'}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-amber-200/85 mt-1">
                      {relationLabel}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {work.subtitle}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-mono font-bold text-slate-400">
                Фильтр исторических событий по ветке и типу:
              </div>
              {hasLocalFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBranchId('ALL');
                    setSelectedEventType('ALL');
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-300 hover:text-amber-200 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Сбросить фильтры</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedBranchId('ALL')}
                className={`px-2.5 py-1 rounded-md border text-[11px] font-mono whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  selectedBranchId === 'ALL'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                Все ветки ({summary.events.length})
              </button>
              {summary.branchTags.map(({ branch, count }) => {
                const active = selectedBranchId === branch.id;
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => setSelectedBranchId(active ? 'ALL' : branch.id)}
                    className={`px-2.5 py-1 rounded-md border text-[11px] font-mono whitespace-nowrap shrink-0 cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
                      active
                        ? 'bg-slate-800 text-white border-amber-400/70 font-semibold'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800/80'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="w-2 h-2 rounded-xs shrink-0"
                      style={{ backgroundColor: branch.color }}
                    />
                    <span>{branch.label}</span>
                    <span className="text-slate-400 tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>

            {summary.typeTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedEventType('ALL')}
                  className={`px-2.5 py-1 rounded-md border text-[11px] font-mono whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    selectedEventType === 'ALL'
                      ? 'bg-sky-500/20 text-sky-200 border-sky-400/60 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  Все типы
                </button>
                {summary.typeTags.map(({ type, count }) => {
                  const active = selectedEventType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedEventType(active ? 'ALL' : type)}
                      className={`px-2.5 py-1 rounded-md border text-[11px] font-mono whitespace-nowrap shrink-0 cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
                        active
                          ? 'bg-sky-500/20 text-sky-100 border-sky-400/70 font-semibold'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800/80'
                      }`}
                    >
                      <span>{type}</span>
                      <span className="text-slate-400 tabular-nums">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="text-xs font-mono font-bold text-slate-400 tabular-nums">
              Исторические события периода ({filteredEvents.length}
              {hasLocalFilter ? ` из ${summary.events.length}` : ''}):
            </div>

            {filteredEvents.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-950/70 border border-slate-800 text-center space-y-2">
                <p className="text-xs text-slate-400">
                  {summary.events.length === 0 && eraObj.endYear < minYear
                    ? `События для этого периода ещё не подключены — текущая база данных начинается с ${minYear} года.`
                    : 'По выбранному сочетанию ветки и типа исторических событий в этом периоде нет.'}
                </p>
                {hasLocalFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBranchId('ALL');
                      setSelectedEventType('ALL');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-amber-300 cursor-pointer"
                  >
                    Показать все события периода
                  </button>
                )}
              </div>
            ) : (
              filteredEvents.map((ev) => {
                const bObj = resolveEventBranch(ev, branches);
                const startsBefore = summary.carryOverBeforeIds.has(ev.id);
                const continuesAfter = summary.carryOverAfterIds.has(ev.id);
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCardModal(ev.id);
                    }}
                    className="w-full text-left p-4 rounded-xl bg-slate-950/90 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-colors"
                  >
                    <div className="font-bold text-white text-sm sm:text-base">
                      <span className="font-mono mr-2 tabular-nums" style={{ color: bObj.color }}>
                        {ev.period}
                      </span>
                      {ev.title}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-slate-400">
                      <span className="font-semibold" style={{ color: bObj.color }}>
                        {bObj.label}
                      </span>
                      <span aria-hidden="true" className="text-slate-700">
                        ·
                      </span>
                      <span className="text-slate-200">{ev.type || 'Событие'}</span>
                      {ev.ruler && (
                        <>
                          <span aria-hidden="true" className="text-slate-700">
                            ·
                          </span>
                          <span>{ev.ruler}</span>
                        </>
                      )}
                      {ev.region && (
                        <>
                          <span aria-hidden="true" className="text-slate-700">
                            ·
                          </span>
                          <span className="text-slate-500">{ev.region}</span>
                        </>
                      )}
                      {(startsBefore || continuesAfter) && (
                        <>
                          <span aria-hidden="true" className="text-slate-700">
                            ·
                          </span>
                          <span className="text-sky-300">
                            {startsBefore && continuesAfter
                              ? 'охватывает соседние периоды'
                              : startsBefore
                                ? `продолжается с ${ev.startYear} г.`
                                : `переходит до ${ev.endYear} г.`}
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{ev.details}</p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <button
            type="button"
            disabled={!prevEra}
            onClick={() => prevEra && onSelectEraModal(prevEra.id)}
            title={
              prevEra
                ? `Предыдущий период: ${prevEra.displayShortTitle} (${prevEra.period})`
                : 'Это первый макро-период'
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-semibold text-slate-200 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer min-w-0"
          >
            <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Предыдущий период</span>
            {prevEra && (
              <span className="hidden sm:inline text-amber-300/90 truncate max-w-[160px]">
                · {prevEra.displayShortTitle}
              </span>
            )}
          </button>

          <span className="text-xs text-slate-400 font-mono tabular-nums shrink-0">
            {idx + 1} / {resolvedEras.length}
          </span>

          <button
            type="button"
            disabled={!nextEra}
            onClick={() => nextEra && onSelectEraModal(nextEra.id)}
            title={
              nextEra
                ? `Следующий период: ${nextEra.displayShortTitle} (${nextEra.period})`
                : 'Это последний макро-период'
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-semibold text-slate-200 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer min-w-0"
          >
            {nextEra && (
              <span className="hidden sm:inline text-amber-300/90 truncate max-w-[160px]">
                {nextEra.displayShortTitle} ·
              </span>
            )}
            <span className="whitespace-nowrap">Следующий период</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
