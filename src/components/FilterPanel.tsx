import { CalendarRange, Crown, Link2, RotateCcw, Search, Sparkles, X } from 'lucide-react';
import { useMemo } from 'react';
import { resolveMacroEras } from '../engine/timelineEngine';
import type { MacroEra, RulerPeriod } from '../types/timeline';

interface FilterPanelProps {
  yearFrom: number;
  yearTo: number;
  minYear: number;
  maxYear: number;
  selectedRulerId: string;
  searchQuery: string;
  onlySynced: boolean;
  rulers: RulerPeriod[];
  eras: MacroEra[];
  onChangeYearFrom: (year: number) => void;
  onChangeYearTo: (year: number) => void;
  onSelectYearRange: (from: number, to: number) => void;
  onChangeRuler: (rulerId: string) => void;
  onChangeSearch: (query: string) => void;
  onToggleOnlySynced: () => void;
  onOpenEraModal: (eraId: string) => void;
  onResetFilters: () => void;
}

const CENTURY_PRESETS = [
  { label: 'IX–XII вв. (Русь)', from: 862, to: 1237, hot: false },
  { label: 'XIII–XV вв. (Орда и Москва)', from: 1237, to: 1505, hot: false },
  { label: 'XVI–XVII вв. (Царство и Смута)', from: 1505, to: 1682, hot: false },
  { label: 'XVIII в. (Империя)', from: 1700, to: 1800, hot: false },
  { label: 'XIX в. (Реформы и культура)', from: 1801, to: 1900, hot: false },
  { label: 'XX в. (СССР и РФ)', from: 1901, to: 2000, hot: false },
  { label: 'Пётр I и реформы (1689–1725)', from: 1689, to: 1725, hot: true },
  { label: 'Великие реформы (1855–1881)', from: 1855, to: 1881, hot: true },
  { label: 'Излом 1914–1924', from: 1914, to: 1924, hot: true },
  { label: 'ВОВ и Атомный проект (1941–1953)', from: 1941, to: 1953, hot: true },
];

export function FilterPanel({
  yearFrom,
  yearTo,
  minYear,
  maxYear,
  selectedRulerId,
  searchQuery,
  onlySynced,
  rulers,
  eras,
  onSelectYearRange,
  onChangeRuler,
  onChangeSearch,
  onToggleOnlySynced,
  onOpenEraModal,
  onResetFilters,
}: FilterPanelProps) {
  const resolvedEras = useMemo(() => resolveMacroEras(eras), [eras]);
  const isFullRange = yearFrom === minYear && yearTo === maxYear && !selectedRulerId && !searchQuery && !onlySynced;

  return (
    <section
      aria-label="Консоль поиска, эпох и исторических срезов"
      className="rounded-2xl bg-slate-900/65 border border-slate-800/80 p-3.5 sm:p-4 space-y-3"
    >
      {/* Первая строка: Поиск + Выбор правителя + Фильтр причинно-следственных связей + Сброс */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center">
        <div className="lg:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onChangeSearch(e.target.value)}
            placeholder="Поиск по событиям, личностям, итогам, договорам, книгам, открытиям..."
            className="w-full rounded-xl bg-slate-950/90 border border-slate-700/80 pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onChangeSearch('')}
              aria-label="Очистить поисковый запрос"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="lg:col-span-4 flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Crown className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label="Фильтр по периоду правления"
              value={selectedRulerId}
              onChange={(e) => onChangeRuler(e.target.value)}
              className="w-full rounded-xl bg-slate-950/90 border border-slate-700/80 pl-8 pr-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 transition-colors truncate cursor-pointer"
            >
              <option value="">Все правители ({minYear}–{maxYear}, {rulers.length} узлов)</option>
              {rulers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.reignPeriod} — {r.ruler}
                  {r.center ? ` [${r.center}]` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="lg:col-span-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onToggleOnlySynced}
            className={`flex-1 lg:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
              onlySynced
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
            }`}
            title="Оставить только события с причинно-следственными и культурными связями"
          >
            <Link2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Узловые связи</span>
          </button>

          {!isFullRange && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-xs font-mono font-semibold text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
              title="Сбросить поисковый запрос, фильтр правителя и вернуть диапазон 862–2000"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Все века</span>
            </button>
          )}
        </div>
      </div>

      {/* Вторая строка: Быстрые срезы веков и ключевых исторических узлов */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/60">
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 mr-1">
          <CalendarRange className="w-3.5 h-3.5 text-amber-400" />
          <span>Срезы эпох:</span>
        </span>
        {CENTURY_PRESETS.map((preset) => {
          const isActive = yearFrom === preset.from && yearTo === preset.to && !selectedRulerId;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onSelectYearRange(preset.from, preset.to)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                  : preset.hot
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20'
                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              {preset.hot && !isActive && <Sparkles className="w-3 h-3 inline mr-1 text-amber-400" />}
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Третья строка: 11 макро-периодов истории России (клик = фокус лет, кнопка «Сводка» = модальное досье периода) */}
      {resolvedEras.length > 0 && (
        <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
            <span>
              Макро-периоды ({minYear}–{maxYear}) — клик фокусирует окно времени, кнопка «Досье» открывает обзор эпохи и лиц времени:
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-1.5">
            {resolvedEras.map((era) => {
              const isEraSelected = yearFrom === era.startYear && yearTo === era.endYear;
              return (
                <div
                  key={era.id}
                  onDoubleClick={() => onOpenEraModal(era.id)}
                  className={`flex items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all ${
                    isEraSelected
                      ? 'bg-amber-500/15 border-amber-400 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800/90 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectYearRange(era.startYear, era.endYear)}
                    className="min-w-0 flex-1 text-left cursor-pointer"
                    title={`${era.title} (${era.period}) — сфокусировать окно времени`}
                  >
                    <div className="font-mono text-[10px] text-amber-300 font-bold tabular-nums">
                      {era.period}
                    </div>
                    <div className="font-semibold truncate text-[11px] text-white">
                      {era.displayShortTitle}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenEraModal(era.id)}
                    className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-amber-500 hover:text-slate-950 border border-slate-700/80 text-[10px] font-mono text-amber-300 shrink-0 transition-colors cursor-pointer"
                    title={`Открыть полное досье макро-периода «${era.displayShortTitle}»`}
                  >
                    Досье
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
