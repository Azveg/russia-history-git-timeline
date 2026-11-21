import { Compass } from 'lucide-react';
import { memo } from 'react';
import type { EraJumpEntry } from './timelineChronicleModel';

interface TimelineEraJumpBarProps {
  entries: EraJumpEntry[];
  activeEraId: string | null;
  onJumpToEra: (entry: EraJumpEntry) => void;
}

export const TimelineEraJumpBar = memo(function TimelineEraJumpBar({
  entries,
  activeEraId,
  onJumpToEra,
}: TimelineEraJumpBarProps) {
  if (entries.length <= 1) return null;

  return (
    <div
      className="px-3 sm:px-5 py-1.5 border-t border-slate-800/80 bg-[#060b16]/95 flex items-center gap-2 overflow-x-auto no-scrollbar"
      role="navigation"
      aria-label="Быстрый переход по эпохам окна"
    >
      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 shrink-0">
        <Compass className="w-3 h-3 text-amber-400/85 shrink-0" />
        <span className="hidden sm:inline">Эпохи:</span>
      </span>

      <div className="flex items-center gap-1 min-w-0">
        {entries.map((entry) => {
          const isActive = entry.era.id === activeEraId;
          const isDisabled = entry.eventCount === 0 && entry.firstStreamIdx === null;

          return (
            <button
              key={entry.era.id}
              type="button"
              disabled={isDisabled}
              onClick={() => onJumpToEra(entry)}
              title={`${entry.era.title} (${entry.era.period}) — событий в окне: ${entry.eventCount}`}
              className={`px-2 py-1 rounded-lg border text-[11px] font-mono inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors tabular-nums ${
                isActive
                  ? 'bg-amber-500/15 border-amber-400/55 text-amber-200 font-semibold cursor-pointer'
                  : isDisabled
                    ? 'bg-transparent border-transparent text-slate-600 cursor-not-allowed'
                    : 'bg-transparent border-transparent text-slate-300 hover:bg-slate-800/80 hover:text-white cursor-pointer'
              }`}
            >
              <span>{entry.era.displayShortTitle}</span>
              <span className={isActive ? 'text-amber-300/90 text-[10px]' : 'text-slate-500 text-[10px]'}>
                {entry.era.startYear}–{entry.era.endYear}
              </span>
              {entry.eventCount > 0 && (
                <span className={isActive ? 'text-amber-300 text-[10px]' : 'text-slate-500 text-[10px]'}>
                  · {entry.eventCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});
