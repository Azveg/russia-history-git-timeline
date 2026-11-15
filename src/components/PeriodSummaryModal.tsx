import { Crown, X } from 'lucide-react';
import type { BranchDefinition, EnrichedEvent, RulerPeriod } from '../types/timeline';

interface PeriodSummaryModalProps {
  rulerId: string | null;
  rulers: RulerPeriod[];
  enrichedEvents: EnrichedEvent[];
  branches: BranchDefinition[];
  onClose: () => void;
  onOpenCard: (eventId: string) => void;
}

export function PeriodSummaryModal({
  rulerId,
  rulers,
  enrichedEvents,
  branches,
  onClose,
  onOpenCard,
}: PeriodSummaryModalProps) {
  if (!rulerId) return null;
  const rulerObj = rulers.find((r) => r.id === rulerId);
  if (!rulerObj) return null;

  const eventsInReign = enrichedEvents.filter((ev) =>
    ev.overlappingRulers.some((or) => or.id === rulerId),
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl my-8 max-h-[90vh] flex flex-col animate-modal"
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

          <div className="inline-flex items-center gap-2 mb-2 text-xs font-mono">
            <span className="px-2.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black tabular-nums">
              {rulerObj.reignPeriod}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
              <Crown className="w-3.5 h-3.5" />
              {rulerObj.ruler}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-white [text-wrap:balance]">
            {rulerObj.reignTitle}
          </h2>
          <p className="text-sm text-slate-300 mt-1.5">{rulerObj.reignThesis}</p>
        </div>

        <div className="p-6 overflow-y-auto space-y-3">
          <div className="text-xs font-mono font-bold text-slate-400 mb-2">
            Все пересекающиеся с этим правлением события ({eventsInReign.length}):
          </div>

          {eventsInReign.map((ev) => {
            const bObj = branches.find((b) => b.id === ev.task) || branches[0];
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
          })}
        </div>
      </div>
    </div>
  );
}
