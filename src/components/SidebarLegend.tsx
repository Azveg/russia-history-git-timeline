import { useRef } from 'react';
import { Crown, X } from 'lucide-react';
import { useWheelScrollContainment } from '../utils/scrollIsolation';
import type { BranchDefinition, EnrichedEvent, RulerPeriod } from '../types/timeline';

interface SidebarLegendProps {
  rulers: RulerPeriod[];
  matchingEvents: EnrichedEvent[];
  visibleLanes: BranchDefinition[];
  yearFrom: number;
  yearTo: number;
  onSelectYearRange: (from: number, to: number) => void;
  onHideSidebar: () => void;
}

export function SidebarLegend({
  rulers,
  matchingEvents,
  visibleLanes,
  yearFrom,
  yearTo,
  onSelectYearRange,
  onHideSidebar,
}: SidebarLegendProps) {
  const asideRef = useRef<HTMLElement | null>(null);
  useWheelScrollContainment(asideRef);

  return (
    <aside
      ref={asideRef}
      className="hidden lg:block lg:col-span-3 sticky top-14 bg-slate-900/60 border border-slate-800/90 rounded-2xl p-4 max-h-[calc(100vh-4.5rem)] overflow-y-auto overscroll-contain"
    >
      <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-400 mb-3 px-1">
        <span className="flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5" />
          Ветка правителей
        </span>
        <button
          type="button"
          onClick={onHideSidebar}
          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
          title="Скрыть боковую панель"
        >
          <X className="w-3 h-3" />
          <span>Скрыть</span>
        </button>
      </div>

      <nav className="space-y-1">
        {rulers.map((r) => {
          const overlappingCount = matchingEvents.filter((ev) =>
            ev.overlappingRulers.some((or) => or.id === r.id),
          ).length;
          const isCurrentWindow = yearFrom === r.startYear && yearTo === r.endYear;

          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectYearRange(r.startYear, r.endYear)}
              className={`w-full group flex items-start justify-between gap-2 px-2.5 py-2 rounded-xl border transition-colors text-left cursor-pointer ${
                isCurrentWindow
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                  : 'border-transparent hover:bg-slate-800/80 text-slate-200'
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-mono font-bold tabular-nums text-amber-300">
                    {r.reignPeriod}
                  </span>
                  {r.center && (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800/90 px-1.5 py-0.2 rounded truncate max-w-[130px]">
                      {r.center}
                    </span>
                  )}
                </div>
                <div className="text-xs font-semibold group-hover:text-amber-300 truncate mt-0.5">
                  {r.ruler}
                </div>
              </div>
              <span
                className="text-[11px] font-mono font-bold tabular-nums text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded-md shrink-0 mt-0.5"
                title="Активных событий в период правления"
              >
                {overlappingCount}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-5 pt-4 border-t border-slate-800/80 px-1 space-y-2.5">
        <div className="text-[11px] font-mono font-bold text-slate-300">Как читать граф от оси времени:</div>
        <div className="text-[11px] text-slate-400 space-y-1.5 leading-snug">
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-slate-300 rounded shrink-0" />
            <span>
              <strong className="text-slate-200">Ось времени (центр)</strong> — главный ствол (годы → месяцы → дни).
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-amber-400 rounded shrink-0" />
            <span>
              <strong className="text-slate-200">Сплошная рельса / ветвление</strong> — длительность правления или процесса (при раздробленности параллельные князья идут по отдельным рельсам).
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 flex items-center justify-between shrink-0" aria-hidden="true">
              <span className="w-0.5 h-3 bg-orange-400 rounded-full" />
              <span className="w-0.5 h-3 bg-orange-400/80 rounded-full" />
              <span className="w-0.5 h-3 bg-orange-400/60 rounded-full" />
            </span>
            <span>
              <strong className="text-slate-200">Параллельные под-ветки</strong> — при 2, 3, 4+ одновременных событиях ветки каждое идёт по своей нити.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rotate-45 border-2 border-sky-400 bg-slate-950 shrink-0 ml-0.5 mr-1" />
            <span>
              <strong className="text-slate-200">Ромб на ветке</strong> — атомарное (точечное) событие без слияния.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-2 rounded border border-emerald-400 bg-emerald-950/60 shrink-0" />
            <span>
              <strong className="text-emerald-300">Изумрудный контур</strong> — явная sync-связь при наведении.
            </span>
          </div>
        </div>

        <div className="pt-2 space-y-1.5 text-[11px] text-slate-400">
          {visibleLanes.map((lane) => (
            <div key={lane.id} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: lane.color }} />
              <span className="font-mono text-[10px] text-slate-300 shrink-0">{lane.gitName}</span>
              <span className="text-slate-500 truncate">— {lane.label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
