import { Flag, GitBranch } from 'lucide-react';

interface DashboardHeaderProps {
  visibleLanesCount: number;
  matchingRulersCount: number;
  streamCount: number;
  crossLinksCount: number;
  showEndNodes: boolean;
  onToggleShowEndNodes: () => void;
}

export function DashboardHeader({
  visibleLanesCount,
  matchingRulersCount,
  streamCount,
  crossLinksCount,
  showEndNodes,
  onToggleShowEndNodes,
}: DashboardHeaderProps) {
  return (
    <header className="relative border-b border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-[#050811] to-[#050811] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono text-slate-400 mb-2">
              <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold">
                <GitBranch className="w-3.5 h-3.5" />
                История в ветвях Git · 1686–2000
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-300">Связей синхронизации: {crossLinksCount}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight [text-wrap:balance]">
              Военная история России:{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-sky-300 to-emerald-300">
                Git-граф пересекающихся таймлайнов
              </span>
            </h1>

            <p className="mt-2.5 text-slate-300 text-xs sm:text-sm leading-relaxed">
              Центральная ось времени (годы с автоматической детализацией до месяцев и дней): правления, войны,
              реформы и мировой контекст ответвляются от неё и возвращаются слиянием в точке завершения.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-center">
                <div className="text-lg sm:text-2xl font-black font-mono tabular-nums text-amber-400">
                  {visibleLanesCount}
                </div>
                <div className="text-[10px] text-slate-400">веток</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-center">
                <div className="text-lg sm:text-2xl font-black font-mono tabular-nums text-white">
                  {matchingRulersCount}
                </div>
                <div className="text-[10px] text-slate-400">правлений</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-center">
                <div className="text-lg sm:text-2xl font-black font-mono tabular-nums text-sky-400">
                  {streamCount}
                </div>
                <div className="text-[10px] text-slate-400">узлов</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-center">
                <div className="text-lg sm:text-2xl font-black font-mono tabular-nums text-emerald-400">
                  {crossLinksCount}
                </div>
                <div className="text-[10px] text-slate-400">связей</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onToggleShowEndNodes}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  showEndNodes
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
                title="Показывать на графе точки завершения и обратного слияния (merge) правлений и длительных событий"
              >
                <Flag className="w-3 h-3" />
                <span>Точки слияния с осью (merge): {showEndNodes ? 'ВКЛ' : 'ВЫКЛ'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
