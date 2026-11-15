import { ChevronLeft, ChevronRight, Crown, FileJson, GitBranch, Link2, X, Zap } from 'lucide-react';
import { getGitHash } from '../engine/timelineEngine';
import type { BranchDefinition, EnrichedEvent } from '../types/timeline';

interface CardDetailModalProps {
  eventId: string | null;
  enrichedEvents: EnrichedEvent[];
  branches: BranchDefinition[];
  onClose: () => void;
  onSelectEvent: (eventId: string) => void;
  onSelectYearRange: (from: number, to: number) => void;
}

export function CardDetailModal({
  eventId,
  enrichedEvents,
  branches,
  onClose,
  onSelectEvent,
  onSelectYearRange,
}: CardDetailModalProps) {
  if (!eventId) return null;
  const idx = enrichedEvents.findIndex((item) => item.id === eventId);
  if (idx === -1) return null;

  const card = enrichedEvents[idx];
  const branchObj = branches.find((b) => b.id === card.task) || branches[0];
  const commitHash = getGitHash(card.id);
  const prevEvent = idx > 0 ? enrichedEvents[idx - 1] : null;
  const nextEvent = idx < enrichedEvents.length - 1 ? enrichedEvents[idx + 1] : null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl my-8 animate-modal"
      >
        <div className="p-6 bg-gradient-to-b from-slate-800/90 to-slate-900 border-b border-slate-800 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="absolute right-4 top-4 w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-wrap items-center gap-2.5 pr-10 mb-3 text-xs font-mono">
            <span
              className="px-2.5 py-0.5 rounded font-black tabular-nums text-slate-950"
              style={{ backgroundColor: branchObj?.color || '#f59e0b' }}
            >
              {card.period}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: branchObj?.color }}>
              <GitBranch className="w-3.5 h-3.5" />
              {branchObj?.gitName || card.task}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <FileJson className="w-3.5 h-3.5" />
              {card.sourceFile}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-slate-400">commit #{commitHash}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug [text-wrap:balance]">
            {card.period} — {card.title}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-amber-200/90 font-medium">{card.subtitle}</p>
        </div>

        <div className="p-6 space-y-4 max-h-[68vh] overflow-y-auto">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[11px] font-mono text-amber-400 font-bold mb-2 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" />
              Синхронизация с data/rulers.json — правители в период события ({card.overlappingRulers.length}):
            </div>
            <div className="flex flex-wrap gap-2">
              {card.overlappingRulers.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectYearRange(r.startYear, r.endYear);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-left transition-colors cursor-pointer"
                >
                  <div className="text-[10px] font-mono text-amber-400 tabular-nums">{r.reignPeriod}</div>
                  <div className="text-xs font-bold text-white">{r.ruler}</div>
                </button>
              ))}
            </div>
          </div>

          {card.explicitLinks.length > 0 && (
            <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-4 space-y-2.5">
              <div className="text-xs font-mono font-bold text-emerald-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  Межветочные связи из data/sync.manifest.json:
                </span>
                <span className="text-[11px] text-emerald-400 tabular-nums">{card.explicitLinks.length}</span>
              </div>
              <div className="space-y-2">
                {card.explicitLinks.map((lnk) => {
                  const target = lnk.targetEvent;
                  const tb = branches.find((b) => b.id === target.task) || branches[0];
                  const dirLabel =
                    lnk.direction === 'outgoing' ? '→ Причина / триггер для:' : '← Следствие / связано с:';
                  return (
                    <button
                      key={lnk.id}
                      type="button"
                      onClick={() => onSelectEvent(target.id)}
                      className="w-full text-left p-3 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-emerald-500/30 cursor-pointer transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="text-emerald-300 font-bold">{dirLabel}</span>
                        <span className="text-slate-400">
                          {tb?.gitName} · {target.sourceFile}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white mt-1">
                        <span className="font-mono mr-1.5 tabular-nums" style={{ color: tb?.color }}>
                          {target.period}
                        </span>
                        {target.title}
                      </div>
                      <div className="text-xs text-slate-300 mt-1 italic">«{lnk.label}»</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5">
            <div className="text-xs font-mono font-bold text-amber-400 mb-2">
              Подробное историческое описание ({card.region} · {card.type})
            </div>
            <p className="text-slate-100 text-sm sm:text-base leading-relaxed">{card.details}</p>

            {card.subEvents && card.subEvents.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800/90 space-y-2.5">
                <div className="text-xs font-mono font-bold text-amber-400">
                  Вложенные операции и подветки кампании ({card.subEvents.length}):
                </div>
                {card.subEvents.map((se) => (
                  <div key={se.title} className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-xs sm:text-sm">
                    <div className="font-bold text-amber-300">{se.title}</div>
                    <div className="text-slate-300 mt-0.5">{se.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {card.concurrentEvents.length > 0 && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="text-xs font-mono font-bold text-sky-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Параллельные события в {card.startYear}–{card.endYear} гг. ({card.concurrentEvents.length}):
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectYearRange(card.startYear, card.endYear);
                  }}
                  className="text-[11px] font-mono text-amber-300 hover:underline cursor-pointer"
                >
                  Фильтр на {card.startYear}–{card.endYear} гг. →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {card.concurrentEvents.map((ce) => {
                  const cb = branches.find((b) => b.id === ce.task) || branches[0];
                  return (
                    <button
                      key={ce.id}
                      type="button"
                      onClick={() => onSelectEvent(ce.id)}
                      className="text-left p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                        <span className="font-bold tabular-nums" style={{ color: cb?.color }}>
                          {ce.period}
                        </span>
                        <span className="text-slate-400">{cb?.short}</span>
                      </div>
                      <div className="text-xs font-semibold text-white mt-0.5 truncate">{ce.title}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={!prevEvent}
            onClick={() => prevEvent && onSelectEvent(prevEvent.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-semibold text-slate-200 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Предыдущий коммит</span>
          </button>

          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {idx + 1} / {enrichedEvents.length}
          </span>

          <button
            type="button"
            disabled={!nextEvent}
            onClick={() => nextEvent && onSelectEvent(nextEvent.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-semibold text-slate-200 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <span>Следующий коммит</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
