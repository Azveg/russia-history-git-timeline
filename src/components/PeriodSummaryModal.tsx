import { useEffect, useMemo, useRef } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Crown, Feather, History, X } from 'lucide-react';
import { getRulerPeriodSummaryData, resolveEventBranch } from '../engine/timelineEngine';
import { useOverlayScrollLock } from '../utils/scrollIsolation';
import type { BranchDefinition, EnrichedEvent, RulerPeriod } from '../types/timeline';

interface PeriodSummaryModalProps {
  rulerId: string | null;
  rulers: RulerPeriod[];
  enrichedEvents: EnrichedEvent[];
  branches: BranchDefinition[];
  onClose: () => void;
  onSelectRuler: (rulerId: string) => void;
  onOpenCard: (eventId: string) => void;
}

export function PeriodSummaryModal({
  rulerId,
  rulers,
  enrichedEvents,
  branches,
  onClose,
  onSelectRuler,
  onOpenCard,
}: PeriodSummaryModalProps) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const idx = rulerId ? rulers.findIndex((r) => r.id === rulerId) : -1;
  const rulerObj = idx !== -1 ? rulers[idx] : undefined;
  const isModalOpen = Boolean(rulerId && rulerObj);

  useOverlayScrollLock(isModalOpen, [bodyRef]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [rulerId]);

  const summary = useMemo(() => {
    if (!rulerObj) return null;
    return getRulerPeriodSummaryData(rulerObj, enrichedEvents, branches);
  }, [rulerObj, enrichedEvents, branches]);

  if (!isModalOpen || !rulerObj || !summary) return null;

  const prevRuler = idx > 0 ? rulers[idx - 1] : null;
  const nextRuler = idx < rulers.length - 1 ? rulers[idx + 1] : null;

  const {
    historicalEvents,
    contemporaryWriters,
    worksWrittenInPeriod,
    worksAboutPeriod,
  } = summary;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-modal"
      >
        <div className="p-6 bg-gradient-to-b from-slate-800/80 to-slate-900 border-b border-slate-800 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="absolute right-4 top-4 w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex flex-wrap items-center gap-2 mb-2 text-xs font-mono">
            <span className="px-2.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black tabular-nums">
              {rulerObj.reignPeriod}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
              <Crown className="w-3.5 h-3.5" />
              {rulerObj.ruler}
            </span>
            {rulerObj.center && (
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-semibold">
                {rulerObj.center}
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-white [text-wrap:balance]">
            {rulerObj.reignTitle}
          </h2>
          <p className="text-sm text-slate-300 mt-1.5">{rulerObj.reignThesis}</p>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-slate-400 tabular-nums">
            <span>
              Событий: <strong className="text-slate-100">{historicalEvents.length}</strong>
            </span>
            <span aria-hidden="true" className="text-slate-700">
              ·
            </span>
            <span>
              Писателей эпохи:{' '}
              <strong className="text-fuchsia-300">{contemporaryWriters.length}</strong>
            </span>
            <span aria-hidden="true" className="text-slate-700">
              ·
            </span>
            <span>
              Книг времени правления:{' '}
              <strong className="text-purple-300">{worksWrittenInPeriod.length}</strong>
            </span>
            <span aria-hidden="true" className="text-slate-700">
              ·
            </span>
            <span>
              Книг о правлении:{' '}
              <strong className="text-amber-300">{worksAboutPeriod.length}</strong>
            </span>
          </div>
        </div>

        <div ref={bodyRef} className="p-6 flex-1 overflow-y-auto overscroll-contain space-y-6">
          {contemporaryWriters.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-fuchsia-300 mb-2.5">
                <Feather className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Лица эпохи · Писатели и поэты времени правления ({contemporaryWriters.length}):
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {contemporaryWriters.map((writer) => (
                  <button
                    key={writer.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCard(writer.id);
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

          {worksWrittenInPeriod.length > 0 && (
            <div className={contemporaryWriters.length > 0 ? 'pt-4 border-t border-slate-800/80' : ''}>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-300 mb-2.5">
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Книги и произведения, написанные в период правления ({worksWrittenInPeriod.length}):
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {worksWrittenInPeriod.map((work) => (
                  <button
                    key={work.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCard(work.id);
                    }}
                    className="text-left p-3 rounded-xl bg-slate-950/85 hover:bg-slate-950 border border-purple-500/25 hover:border-purple-400/60 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-purple-300 font-semibold tabular-nums">
                        {work.period}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">
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

          {worksAboutPeriod.length > 0 && (
            <div
              className={
                contemporaryWriters.length > 0 || worksWrittenInPeriod.length > 0
                  ? 'pt-4 border-t border-slate-800/80'
                  : ''
              }
            >
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-300 mb-2.5">
                <History className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Книги и произведения об эпохе правления ({worksAboutPeriod.length}):
                </span>
              </div>
              <div className="space-y-2">
                {worksAboutPeriod.map(({ work, relationLabel, yearGap }) => (
                  <button
                    key={work.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCard(work.id);
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
                        {yearGap > 0 ? `+${yearGap} л. спустя` : 'современник правления'}
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

          <div
            className={
              contemporaryWriters.length > 0 ||
              worksWrittenInPeriod.length > 0 ||
              worksAboutPeriod.length > 0
                ? 'pt-4 border-t border-slate-800/80 space-y-3'
                : 'space-y-3'
            }
          >
            <div className="text-xs font-mono font-bold text-slate-400 mb-2">
              Исторические события периода правления ({historicalEvents.length}):
            </div>

            {historicalEvents.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-950/70 border border-slate-800 text-center text-xs text-slate-400">
                Исторических событий, пересекающихся с этим правлением, не найдено.
              </div>
            ) : (
              historicalEvents.map((ev) => {
                const bObj = resolveEventBranch(ev, branches);
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCard(ev.id);
                    }}
                    className="w-full text-left p-4 rounded-xl bg-slate-950/90 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-white text-sm sm:text-base">
                        <span className="font-mono mr-2 tabular-nums" style={{ color: bObj?.color }}>
                          {ev.period}
                        </span>
                        {ev.title}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">{bObj?.gitName}</span>
                    </div>
                    {ev.overlappingRulers.length > 1 && (
                      <div className="text-[11px] font-mono text-amber-300 mt-1">
                        Охватывает несколько правлений: {ev.ruler}
                      </div>
                    )}
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
            disabled={!prevRuler}
            onClick={() => prevRuler && onSelectRuler(prevRuler.id)}
            title={
              prevRuler
                ? `Перейти к предыдущему правителю: ${prevRuler.ruler} (${prevRuler.reignPeriod})`
                : 'Это первый правитель в списке'
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-semibold text-slate-200 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer min-w-0"
          >
            <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Предыдущий правитель</span>
            {prevRuler && (
              <span className="hidden sm:inline text-amber-300/90 truncate max-w-[140px]">
                · {prevRuler.shortRuler}
              </span>
            )}
          </button>

          <span className="text-xs text-slate-400 font-mono tabular-nums shrink-0">
            {idx + 1} / {rulers.length}
          </span>

          <button
            type="button"
            disabled={!nextRuler}
            onClick={() => nextRuler && onSelectRuler(nextRuler.id)}
            title={
              nextRuler
                ? `Перейти к следующему правителю: ${nextRuler.ruler} (${nextRuler.reignPeriod})`
                : 'Это последний правитель в списке'
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-semibold text-slate-200 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer min-w-0"
          >
            {nextRuler && (
              <span className="hidden sm:inline text-amber-300/90 truncate max-w-[140px]">
                {nextRuler.shortRuler} ·
              </span>
            )}
            <span className="whitespace-nowrap">Следующий правитель</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}

