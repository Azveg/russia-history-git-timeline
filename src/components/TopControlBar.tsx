import { PanelLeftClose, PanelLeftOpen, Rows3, Rows4, SlidersHorizontal } from 'lucide-react';
import type { BranchDefinition, CardDensity } from '../types/timeline';

interface TopControlBarProps {
  branchControls: Array<BranchDefinition & { count: number }>;
  activeBranches: Record<string, boolean>;
  onToggleBranch: (branchId: string) => void;
  yearFrom: number;
  yearTo: number;
  onYearRangeChange: (from: number, to: number) => void;
  cardDensity: CardDensity;
  onChangeCardDensity: (density: CardDensity) => void;
  isFiltersCollapsed: boolean;
  isLegendCollapsed: boolean;
  onToggleFilters: () => void;
  onToggleLegend: () => void;
}

export function TopControlBar({
  branchControls,
  activeBranches,
  onToggleBranch,
  yearFrom,
  yearTo,
  onYearRangeChange,
  cardDensity,
  onChangeCardDensity,
  isFiltersCollapsed,
  isLegendCollapsed,
  onToggleFilters,
  onToggleLegend,
}: TopControlBarProps) {
  return (
    <div className="sticky top-0 z-40 bg-[#050811]/95 backdrop-blur-md border-b border-slate-800/90 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
          <span className="text-[11px] font-mono text-slate-400 mr-1 shrink-0 hidden sm:inline">
            Ветки:
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {branchControls.map((b) => {
              const isActive = activeBranches[b.id] !== false;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onToggleBranch(b.id)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 border-slate-700 text-white hover:border-slate-500'
                      : 'bg-slate-950/50 border-slate-800/70 text-slate-500 opacity-60 hover:opacity-100'
                  }`}
                  title={`${b.label}: нажмите, чтобы включить или скрыть ветку`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: isActive ? b.color : 'transparent',
                      border: `2px solid ${b.color}`,
                    }}
                  />
                  <span>{b.short}</span>
                  <span className="text-[10px] text-slate-400 tabular-nums">({b.count})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <div className="hidden md:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] font-mono">
            <span className="text-slate-400">Годы:</span>
            <input
              type="number"
              min={1686}
              max={2000}
              value={yearFrom}
              aria-label="Год начала"
              onChange={(e) => onYearRangeChange(Number(e.target.value), yearTo)}
              className="w-14 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-amber-300 font-bold text-center tabular-nums focus:outline-none focus:border-amber-500"
            />
            <span className="text-slate-500">—</span>
            <input
              type="number"
              min={1686}
              max={2000}
              value={yearTo}
              aria-label="Год окончания"
              onChange={(e) => onYearRangeChange(yearFrom, Number(e.target.value))}
              className="w-14 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-amber-300 font-bold text-center tabular-nums focus:outline-none focus:border-amber-500"
            />
          </div>

          <div
            className="inline-flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px] font-mono"
            role="group"
            aria-label="Плотность карточек"
          >
            <button
              type="button"
              onClick={() => onChangeCardDensity('detailed')}
              className={`px-2 py-1 rounded-md inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                cardDensity === 'detailed'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Подробные карточки со шкалой правителей и кнопками переходов"
            >
              <Rows3 className="w-3.5 h-3.5" />
              <span>Подробно</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeCardDensity('compact')}
              className={`px-2 py-1 rounded-md inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                cardDensity === 'compact'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Компактные однострочные строки для быстрого обзора"
            >
              <Rows4 className="w-3.5 h-3.5" />
              <span>Компактно</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleFilters}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Свернуть или развернуть панель фильтров и диаграмму наложения"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>{isFiltersCollapsed ? '+ Фильтры' : '− Фильтры'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleLegend}
            className="hidden lg:flex px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-[11px] font-mono font-semibold items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Скрыть или показать боковую легенду и список правителей"
          >
            {isLegendCollapsed ? (
              <PanelLeftOpen className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <PanelLeftClose className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{isLegendCollapsed ? '+ Легенда' : '− Легенда'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
