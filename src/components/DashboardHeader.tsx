import { BookOpenCheck, Flag } from 'lucide-react';

interface DashboardHeaderProps {
  visibleLanesCount: number;
  matchingRulersCount: number;
  streamCount: number;
  crossLinksCount: number;
  minYear?: number;
  maxYear?: number;
  showEndNodes: boolean;
  onToggleShowEndNodes: () => void;
}

export function DashboardHeader({
  visibleLanesCount,
  matchingRulersCount,
  streamCount,
  crossLinksCount,
  minYear = 862,
  maxYear = 2000,
  showEndNodes,
  onToggleShowEndNodes,
}: DashboardHeaderProps) {
  return (
    <header className="relative border-b border-slate-800/80 bg-gradient-to-b from-slate-900/75 via-[#060a15] to-[#050811]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-amber-300/90 mb-1">
              <BookOpenCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Интерактивный исторический атлас-хронограф · {minYear}–{maxYear} гг.</span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl lg:text-[34px] font-bold tracking-tight text-white leading-tight">
              История России и мира в параллельных линиях времени
            </h1>

            <p className="mt-1 text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
              Синхронная хронология правлений, войн, реформ, дипломатии, литературы и научных открытий:
              исследуйте пересечения процессов, их предпосылки, итоги и культурный след.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 shrink-0 border-t lg:border-t-0 border-slate-800/80 pt-3 lg:pt-0">
            <div className="flex items-center divide-x divide-slate-800 bg-slate-900/60 border border-slate-800/90 rounded-xl px-3 py-2">
              <div className="pr-3 text-center">
                <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-amber-400">
                  {visibleLanesCount}
                </div>
                <div className="text-[10px] text-slate-400">активных линий</div>
              </div>
              <div className="px-3 text-center">
                <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-white">
                  {matchingRulersCount}
                </div>
                <div className="text-[10px] text-slate-400">правлений</div>
              </div>
              <div className="px-3 text-center">
                <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-sky-400">
                  {streamCount}
                </div>
                <div className="text-[10px] text-slate-400">вех на шкале</div>
              </div>
              <div className="pl-3 text-center">
                <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-emerald-400">
                  {crossLinksCount}
                </div>
                <div className="text-[10px] text-slate-400">связей событий</div>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleShowEndNodes}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                showEndNodes
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-800 bg-slate-950 text-slate-400'
              }`}
              title="Показывать на хронографе отметки окончания правлений и длительных исторических процессов"
            >
              <Flag className="w-3 h-3" />
              <span>Вехи завершения: {showEndNodes ? 'ВКЛ' : 'ВЫКЛ'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
