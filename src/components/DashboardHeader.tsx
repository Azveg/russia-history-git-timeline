import { BookOpenCheck } from 'lucide-react';
import { memo } from 'react';

interface DashboardHeaderProps {
  visibleLanesCount: number;
  matchingRulersCount: number;
  streamCount: number;
  visibleLinksCount: number;
  hiddenLinksCount?: number;
  onRevealHiddenLinks?: () => void;
  minYear?: number;
  maxYear?: number;
}

export const DashboardHeader = memo(function DashboardHeader({
  visibleLanesCount,
  matchingRulersCount,
  streamCount,
  visibleLinksCount,
  hiddenLinksCount = 0,
  onRevealHiddenLinks,
  minYear = 862,
  maxYear = 2000,
}: DashboardHeaderProps) {
  return (
    <header className="relative border-b border-slate-800/80 bg-gradient-to-b from-slate-900/70 via-[#060a15] to-[#050811]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 lg:gap-4">
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-amber-300/90">
              <BookOpenCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Исторический атлас-хронограф · {minYear}–{maxYear} гг.</span>
            </div>

            <h1 className="font-serif text-lg sm:text-xl lg:text-[26px] font-bold tracking-tight text-white leading-tight text-balance">
              История России и мира в параллельных линиях времени
            </h1>

            <p className="hidden sm:block mt-0.5 text-slate-400 text-xs leading-snug max-w-2xl truncate">
              Синхронная хронология правлений, войн, реформ, дипломатии, литературы и научных открытий.
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-start lg:justify-end divide-x divide-slate-800/90 shrink-0 border-t lg:border-t-0 border-slate-800/70 pt-1.5 lg:pt-0">
            <div className="pr-3 sm:pr-3.5 text-center">
              <div className="text-sm sm:text-base font-extrabold font-mono tabular-nums text-amber-400 leading-tight">
                {visibleLanesCount}
              </div>
              <div className="text-[10px] text-slate-400 whitespace-nowrap">линий</div>
            </div>
            <div className="px-3 sm:px-3.5 text-center">
              <div className="text-sm sm:text-base font-extrabold font-mono tabular-nums text-white leading-tight">
                {matchingRulersCount}
              </div>
              <div className="text-[10px] text-slate-400 whitespace-nowrap">правлений</div>
            </div>
            <div className="px-3 sm:px-3.5 text-center">
              <div className="text-sm sm:text-base font-extrabold font-mono tabular-nums text-sky-400 leading-tight">
                {streamCount}
              </div>
              <div className="text-[10px] text-slate-400 whitespace-nowrap">вех</div>
            </div>
            <div className="pl-3 sm:pl-3.5 text-center">
              <div
                className="text-sm sm:text-base font-extrabold font-mono tabular-nums text-emerald-400 leading-tight"
                title={
                  hiddenLinksCount > 0
                    ? `В текущем окне видимо связей: ${visibleLinksCount}. Ещё ${hiddenLinksCount} ведут в отключённые ветки.`
                    : `Уникальных связей среди событий текущего окна: ${visibleLinksCount}`
                }
              >
                {visibleLinksCount}
              </div>
              <div className="text-[10px] text-slate-400 whitespace-nowrap">
                связей
                {hiddenLinksCount > 0 && (
                  <>
                    {' · '}
                    <button
                      type="button"
                      onClick={onRevealHiddenLinks}
                      className="font-mono text-amber-300 hover:text-amber-200 underline decoration-amber-500/45 underline-offset-2 cursor-pointer whitespace-nowrap tabular-nums"
                      title="Показать и прокрутить к списку отключённых веток со скрытыми связями"
                    >
                      +{hiddenLinksCount} скр.
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
});
