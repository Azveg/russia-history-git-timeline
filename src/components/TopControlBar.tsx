import { Compass, PanelLeftClose, PanelLeftOpen, Rows3, Rows4, SlidersHorizontal } from 'lucide-react';
import { computeBranchPresetMap } from '../engine/timelineEngine';
import type { BranchDefinition, BranchPresetId, CardDensity } from '../types/timeline';
import { BranchSelectorPopover } from './BranchSelectorPopover';

interface TopControlBarProps {
  branchControls: Array<BranchDefinition & { count: number }>;
  activeBranches: Record<string, boolean>;
  collapsedParents: Record<string, boolean>;
  onToggleBranch: (branchId: string) => void;
  onToggleCategory: (branchIds: string[], enable: boolean) => void;
  onApplyPreset: (presetId: BranchPresetId) => void;
  onIsolateBranch: (branchId: string) => void;
  onToggleCollapseParent: (parentId: string) => void;
  yearFrom: number;
  yearTo: number;
  minYear?: number;
  maxYear?: number;
  onYearRangeChange: (from: number, to: number) => void;
  cardDensity: CardDensity;
  onChangeCardDensity: (density: CardDensity) => void;
  isFiltersCollapsed: boolean;
  isLegendCollapsed: boolean;
  onToggleFilters: () => void;
  onToggleLegend: () => void;
}

const QUICK_PRESETS: Array<{ id: BranchPresetId; label: string; title: string }> = [
  {
    id: 'overview',
    label: 'Обзор истории',
    title: 'Ключевой срез: Правители, Большие войны, Экономика и реформы, Дипломатия',
  },
  {
    id: 'rulers_wars',
    label: 'Войны и дипломатия',
    title: 'Правители, все 5 ветвей военных кампаний и международные договоры',
  },
  {
    id: 'culture_science',
    label: 'Культура и наука',
    title: 'Правители, писатели и классические книги, учёные и научные открытия',
  },
  {
    id: 'all',
    label: 'Все ветки',
    title: 'Включить все исторические, культурные и научные линии одновременно',
  },
];

export function TopControlBar({
  branchControls,
  activeBranches,
  collapsedParents,
  onToggleBranch,
  onToggleCategory,
  onApplyPreset,
  onIsolateBranch,
  onToggleCollapseParent,
  yearFrom,
  yearTo,
  minYear = 862,
  maxYear = 2000,
  onYearRangeChange,
  cardDensity,
  onChangeCardDensity,
  isFiltersCollapsed,
  isLegendCollapsed,
  onToggleFilters,
  onToggleLegend,
}: TopControlBarProps) {
  const leafBranches = branchControls.filter((b) => !b.isGroup);

  const isPresetActive = (presetId: BranchPresetId): boolean => {
    if (leafBranches.length === 0) return false;
    const targetMap = computeBranchPresetMap(branchControls, presetId);
    return leafBranches.every((b) => Boolean(activeBranches[b.id] !== false) === Boolean(targetMap[b.id]));
  };

  return (
    <div className="sticky top-0 z-40 bg-[#050811]/95 backdrop-blur-md border-b border-slate-800/90 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 flex flex-wrap xl:flex-nowrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <BranchSelectorPopover
            branchControls={branchControls}
            activeBranches={activeBranches}
            collapsedParents={collapsedParents}
            onToggleBranch={onToggleBranch}
            onToggleCategory={onToggleCategory}
            onApplyPreset={onApplyPreset}
            onIsolateBranch={onIsolateBranch}
            onToggleCollapseParent={onToggleCollapseParent}
          />

          <div
            className="hidden sm:inline-flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 text-[11px]"
            role="group"
            aria-label="Сценарии веток"
          >
            <span className="px-2 py-0.5 text-slate-400 inline-flex items-center gap-1 font-mono text-[10px]">
              <Compass className="w-3 h-3 text-amber-400" />
              <span className="hidden md:inline">Срез:</span>
            </span>
            {QUICK_PRESETS.map((preset) => {
              const active = isPresetActive(preset.id);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onApplyPreset(preset.id)}
                  title={preset.title}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <div className="hidden md:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] font-mono">
            <span className="text-slate-400">Окно:</span>
            <input
              type="number"
              min={minYear}
              max={maxYear}
              value={yearFrom}
              aria-label="Год начала"
              onChange={(e) => onYearRangeChange(Number(e.target.value), yearTo)}
              className="w-14 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-amber-300 font-bold text-center tabular-nums focus:outline-none focus:border-amber-500"
            />
            <span className="text-slate-500">—</span>
            <input
              type="number"
              min={minYear}
              max={maxYear}
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
              title="Подробные карточки с ключевыми итогами, участниками и шкалой правлений"
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
              title="Компактные однострочные записи для быстрого обзора больших эпох"
            >
              <Rows4 className="w-3.5 h-3.5" />
              <span>Компактно</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleFilters}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Свернуть или развернуть панель эпох и поиска"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>{isFiltersCollapsed ? '+ Фильтры' : '− Фильтры'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleLegend}
            className="hidden lg:flex px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-[11px] font-mono font-semibold items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Скрыть или показать боковой навигатор по правлениям"
          >
            {isLegendCollapsed ? (
              <PanelLeftOpen className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <PanelLeftClose className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{isLegendCollapsed ? '+ Правители' : '− Правители'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
