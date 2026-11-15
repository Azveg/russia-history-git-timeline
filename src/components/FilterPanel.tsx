import { useRef } from 'react';
import { BookOpen, Flame, Link2, Search, X } from 'lucide-react';
import { resolveMacroEras } from '../engine/timelineEngine';
import type { DynamicWindowHotspot, MacroEra, RulerPeriod, YearRangeStep } from '../types/timeline';

interface FilterPanelProps {
  yearFrom: number;
  yearTo: number;
  onYearRangeChange: (from: number, to: number, recordHistory?: boolean) => void;
  onRecordZoomStep: (from: number, to: number) => void;
  onQuickWindowSelect: (from: number, to: number) => void;
  hotspots: DynamicWindowHotspot[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedEra: string;
  onSelectEra: (eraId: string) => void;
  onOpenEraModal: (eraId: string) => void;
  selectedReign: string;
  onSelectReign: (rulerId: string) => void;
  onResetAll: () => void;
  hasActiveFilters: boolean;
  macroEras: MacroEra[];
  eraCounts: Record<string, number>;
  rulers: RulerPeriod[];
  matchingRulersCount: number;
  matchingEventsCount: number;
  onlyWithSyncLinks: boolean;
  onToggleOnlyWithSyncLinks: () => void;
  syncLinkedCount: number;
}

const CENTURY_WINDOWS = [
  { label: 'Весь период', from: 1686, to: 2000 },
  { label: 'XVIII в.', from: 1700, to: 1800 },
  { label: 'XIX в.', from: 1801, to: 1900 },
  { label: 'XX в.', from: 1901, to: 2000 },
];

export function FilterPanel({
  yearFrom,
  yearTo,
  onYearRangeChange,
  onRecordZoomStep,
  onQuickWindowSelect,
  hotspots,
  searchQuery,
  onSearchChange,
  selectedEra,
  onSelectEra,
  onOpenEraModal,
  selectedReign,
  onSelectReign,
  onResetAll,
  hasActiveFilters,
  macroEras,
  eraCounts,
  rulers,
  matchingRulersCount,
  matchingEventsCount,
  onlyWithSyncLinks,
  onToggleOnlyWithSyncLinks,
  syncLinkedCount,
}: FilterPanelProps) {
  const spanYears = Math.max(1, yearTo - yearFrom);
  const sliderOriginRef = useRef<YearRangeStep | null>(null);

  const handleSliderStart = () => {
    sliderOriginRef.current = { from: yearFrom, to: yearTo };
  };

  const handleSliderCommit = () => {
    const origin = sliderOriginRef.current;
    sliderOriginRef.current = null;
    if (origin && (origin.from !== yearFrom || origin.to !== yearTo)) {
      onRecordZoomStep(origin.from, origin.to);
    }
  };

  return (
    <section
      aria-label="Фильтры и диапазон времени"
      className="border-b border-slate-800/70 bg-[#070b16]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 space-y-3">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-mono font-semibold text-slate-300">
                Фильтр временного окна:
              </span>
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 font-mono text-xs">
                <span className="text-slate-400">с</span>
                <input
                  type="number"
                  min={1686}
                  max={2000}
                  value={yearFrom}
                  aria-label="Начало окна лет"
                  onChange={(e) => onYearRangeChange(Number(e.target.value), yearTo)}
                  className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-white font-bold text-center tabular-nums focus:outline-none focus:border-amber-500"
                />
                <span className="text-slate-400">по</span>
                <input
                  type="number"
                  min={1686}
                  max={2000}
                  value={yearTo}
                  aria-label="Конец окна лет"
                  onChange={(e) => onYearRangeChange(yearFrom, Number(e.target.value))}
                  className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-white font-bold text-center tabular-nums focus:outline-none focus:border-amber-500"
                />
                <span className="text-slate-500">гг.</span>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-slate-400">
                {yearFrom}–{yearTo} ({spanYears} лет) · {matchingEventsCount} событий · {matchingRulersCount} правлений
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Поиск войны, реформы, правителя..."
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                />
                {searchQuery.trim() !== '' && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    aria-label="Очистить поиск"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={selectedReign}
                onChange={(e) => onSelectReign(e.target.value)}
                aria-label="Фильтр по правителю"
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60 max-w-[215px]"
              >
                <option value="ALL">Все правители ({rulers.length})</option>
                {rulers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.reignPeriod} — {r.shortRuler}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={onResetAll}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 text-xs font-mono font-semibold whitespace-nowrap cursor-pointer"
                >
                  Сбросить всё
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tabular-nums text-slate-400 w-24 shrink-0">
                Начало ({yearFrom}):
              </span>
              <input
                type="range"
                min={1686}
                max={2000}
                value={yearFrom}
                aria-label="Ползунок начала окна"
                onPointerDown={handleSliderStart}
                onPointerUp={handleSliderCommit}
                onChange={(e) => onYearRangeChange(Number(e.target.value), yearTo, false)}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tabular-nums text-slate-400 w-24 shrink-0">
                Конец ({yearTo}):
              </span>
              <input
                type="range"
                min={1686}
                max={2000}
                value={yearTo}
                aria-label="Ползунок конца окна"
                onPointerDown={handleSliderStart}
                onPointerUp={handleSliderCommit}
                onChange={(e) => onYearRangeChange(yearFrom, Number(e.target.value), false)}
                className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-0.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-mono text-slate-400 shrink-0 mr-1">Быстрые окна:</span>

            {CENTURY_WINDOWS.map((w) => {
              const isActive = yearFrom === w.from && yearTo === w.to;
              return (
                <button
                  key={w.label}
                  type="button"
                  onClick={() => onQuickWindowSelect(w.from, w.to)}
                  className={`px-2.5 py-1 rounded-md border text-[11px] font-mono whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 font-semibold'
                      : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                  }`}
                >
                  {w.label}
                </button>
              );
            })}

            {hotspots.length > 0 ? (
              <>
                <span aria-hidden="true" className="h-4 w-px bg-slate-800 mx-1 shrink-0" />
                <span
                  className="text-[11px] font-mono text-slate-500 inline-flex items-center gap-1 shrink-0 mr-0.5"
                  title="Автоматически вычисленные отрезки максимальной плотности для выбранных веток"
                >
                  <Flame className="w-3 h-3 text-rose-400" />
                  <span>Пики веток:</span>
                </span>
                {hotspots.map((h) => {
                  const isActive = yearFrom === h.fromYear && yearTo === h.toYear;
                  const detailHint =
                    h.resolution === 'day'
                      ? 'дни'
                      : h.resolution === 'month'
                        ? 'мес.'
                        : `${h.eventCount} соб.`;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => onQuickWindowSelect(h.fromYear, h.toYear)}
                      title={`Топ-период по выбранным веткам (${h.peakCount} одновр., всего ${h.eventCount} соб.): ${h.previewTitles.join(', ')}`}
                      className={`px-2.5 py-1 rounded-md border text-[11px] font-mono tabular-nums whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-rose-500/25 border-rose-400 text-rose-100 font-semibold'
                          : 'bg-slate-950 hover:bg-slate-800 border-rose-500/30 text-rose-200'
                      }`}
                    >
                      {h.fromYear}–{h.toYear} · {detailHint}
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                <span aria-hidden="true" className="h-4 w-px bg-slate-800 mx-1 shrink-0" />
                <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap shrink-0">
                  Включите тематические ветки для расчёта пиковых окон
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => onSelectEra('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selectedEra === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              Все периоды (1686–2000)
            </button>
            {resolveMacroEras(macroEras).map((era) => {
              const active = selectedEra === era.id;
              return (
                <div
                  key={era.id}
                  className={`inline-flex items-stretch rounded-lg border shrink-0 overflow-hidden transition-colors ${
                    active
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-900 text-slate-300 border-slate-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectEra(active ? 'ALL' : era.id)}
                    title={era.title}
                    className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                      active ? 'hover:bg-amber-400/40' : 'hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-bold max-w-[200px] truncate">{era.displayShortTitle}</span>
                    <span className="text-[11px] opacity-80 tabular-nums">({era.period})</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums ${
                        active ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {eraCounts[era.id] || 0}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenEraModal(era.id)}
                    aria-label={`Открыть карточку периода: ${era.displayShortTitle}`}
                    title={`Открыть динамическую карточку периода «${era.displayShortTitle}»`}
                    className={`px-2 flex items-center justify-center border-l cursor-pointer transition-colors ${
                      active
                        ? 'border-slate-950/20 hover:bg-slate-950/15 text-slate-950'
                        : 'border-slate-800 hover:bg-slate-800 text-amber-400 hover:text-amber-300'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onToggleOnlyWithSyncLinks}
            className={`text-[11px] font-mono px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
              onlyWithSyncLinks
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300'
            }`}
            title="Показать только события, имеющие явные причинно-следственные связи (crossLinks)"
          >
            <Link2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Только со связями (sync)</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums ${
                onlyWithSyncLinks ? 'bg-emerald-950 text-emerald-200' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {syncLinkedCount}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
