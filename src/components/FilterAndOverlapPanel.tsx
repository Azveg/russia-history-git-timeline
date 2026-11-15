import { Clock, Link2, Search, X } from 'lucide-react';
import { resolveEventBranch } from '../engine/timelineEngine';
import type {
  BranchDefinition,
  EnrichedEvent,
  MacroEra,
  MilitaryBranchMode,
  RulerPeriod,
} from '../types/timeline';

interface FilterAndOverlapPanelProps {
  yearFrom: number;
  yearTo: number;
  onYearRangeChange: (from: number, to: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedEra: string;
  onSelectEra: (eraId: string) => void;
  selectedReign: string;
  onSelectReign: (rulerId: string) => void;
  onResetAll: () => void;
  hasActiveFilters: boolean;
  macroEras: MacroEra[];
  eraCounts: Record<string, number>;
  rulers: RulerPeriod[];
  matchingRulers: RulerPeriod[];
  matchingEvents: EnrichedEvent[];
  visibleLanes: BranchDefinition[];
  branches: BranchDefinition[];
  militaryBranchMode: MilitaryBranchMode;
  showOverlapMatrix: boolean;
  onToggleOverlapMatrix: () => void;
  onlyWithSyncLinks: boolean;
  onToggleOnlyWithSyncLinks: () => void;
  syncLinkedCount: number;
  onOpenCardModal: (eventId: string) => void;
  onHoverEvent: (eventId: string | null) => void;
}

const PRESETS = [
  { label: 'Весь график (1686–2000)', from: 1686, to: 2000, cls: 'border-slate-800 text-slate-300' },
  { label: '1700–1721: Северная война + 4 бунта + Реформы', from: 1700, to: 1721, cls: 'border-amber-500/30 text-amber-300' },
  { label: '1755–1764: Семилетняя война (3 правителя!)', from: 1755, to: 1764, cls: 'border-amber-500/30 text-amber-300' },
  { label: '1850–1865: Кавказ + Крымская + Смена власти', from: 1850, to: 1865, cls: 'border-sky-500/30 text-sky-300' },
  { label: '1914–1923: ПМВ + Революция + Гражданская', from: 1914, to: 1923, cls: 'border-rose-500/30 text-rose-300' },
  { label: '1979–1991: Афганистан (4 генсека) + Распад СССР', from: 1979, to: 1991, cls: 'border-emerald-500/30 text-emerald-300' },
  { label: '1991–1999: Локальные конфликты 1990-х', from: 1991, to: 2000, cls: 'border-purple-500/30 text-purple-300' },
];

export function FilterAndOverlapPanel({
  yearFrom,
  yearTo,
  onYearRangeChange,
  searchQuery,
  onSearchChange,
  selectedEra,
  onSelectEra,
  selectedReign,
  onSelectReign,
  onResetAll,
  hasActiveFilters,
  macroEras,
  eraCounts,
  rulers,
  matchingRulers,
  matchingEvents,
  visibleLanes,
  branches,
  militaryBranchMode,
  showOverlapMatrix,
  onToggleOverlapMatrix,
  onlyWithSyncLinks,
  onToggleOnlyWithSyncLinks,
  syncLinkedCount,
  onOpenCardModal,
  onHoverEvent,
}: FilterAndOverlapPanelProps) {
  const spanYears = Math.max(1, yearTo - yearFrom);
  const maxY = Math.max(yearFrom + 1, yearTo);
  const totalSpan = maxY - yearFrom;
  const toPct = (y: number) => Math.max(0, Math.min(100, ((y - yearFrom) / totalSpan) * 100));

  const thematicLanes = visibleLanes.filter((l) => l.id !== 'MAIN_RULERS');
  const ticks = [
    yearFrom,
    Math.round(yearFrom + totalSpan * 0.25),
    Math.round(yearFrom + totalSpan * 0.5),
    Math.round(yearFrom + totalSpan * 0.75),
    maxY,
  ];

  return (
    <section className="border-b border-slate-800/80 bg-[#070b16]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Фильтр временного окна:
              </span>
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 font-mono text-xs">
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
              <span className="text-[11px] font-mono tabular-nums text-sky-300">
                Окно: {yearFrom}–{yearTo} ({spanYears} лет) · Наложений: {matchingEvents.length} событий и{' '}
                {matchingRulers.length} правлений
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 w-24 shrink-0">Начало ({yearFrom}):</span>
              <input
                type="range"
                min={1686}
                max={2000}
                value={yearFrom}
                aria-label="Ползунок начала окна"
                onChange={(e) => onYearRangeChange(Number(e.target.value), yearTo)}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 w-24 shrink-0">Конец ({yearTo}):</span>
              <input
                type="range"
                min={1686}
                max={2000}
                value={yearTo}
                aria-label="Ползунок конца окна"
                onChange={(e) => onYearRangeChange(yearFrom, Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-mono text-slate-400 shrink-0 mr-1">Примеры пересечений:</span>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => onYearRangeChange(p.from, p.to)}
                className={`px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-800 border text-[11px] font-mono whitespace-nowrap shrink-0 cursor-pointer transition-colors ${p.cls}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => onSelectEra('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedEra === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              Все эпохи (1686–2000)
            </button>
            {macroEras.map((era) => {
              const active = selectedEra === era.id;
              return (
                <button
                  key={era.id}
                  type="button"
                  onClick={() => onSelectEra(active ? 'ALL' : era.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <span className="font-bold">Эпоха {era.roman}</span>
                  <span className="text-[11px] opacity-80 tabular-nums">({era.period})</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums ${
                      active ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {eraCounts[era.id] || 0}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleOnlyWithSyncLinks}
              className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
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

            <button
              type="button"
              onClick={onToggleOverlapMatrix}
              className="text-[11px] font-mono text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg cursor-pointer whitespace-nowrap"
            >
              {showOverlapMatrix ? '− Скрыть карту наложения полос' : '+ Показать карту наложения полос'}
            </button>
          </div>
        </div>

        {showOverlapMatrix && (
          <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-3.5 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="text-xs font-mono font-bold text-slate-200 flex items-center gap-2">
                <span>Синхронная карта наложения периодов ({yearFrom}–{maxY} гг.)</span>
                <span className="text-[11px] font-normal text-slate-400 hidden sm:inline">
                  — показывает перекрытие войн, реформ и правлений
                </span>
              </div>
              <span className="text-[11px] font-mono text-amber-300">
                N правл. = сколько правителей сменилось за время события
              </span>
            </div>

            <div className="space-y-1">
              <div className="grid grid-cols-12 items-center gap-2 py-0.5">
                <div className="col-span-3 sm:col-span-2 flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-[10px] font-mono font-bold text-amber-300 truncate">main/rulers</span>
                </div>
                <div className="col-span-9 sm:col-span-10 relative h-7 bg-slate-900 rounded border border-slate-800 overflow-hidden">
                  {matchingRulers.map((r, idx) => {
                    const left = toPct(Math.max(yearFrom, r.startYear));
                    const right = toPct(Math.min(maxY, r.endYear));
                    const width = Math.max(1.2, right - left);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onYearRangeChange(r.startYear, r.endYear)}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        className={`absolute top-0.5 bottom-0.5 rounded border px-1.5 flex items-center overflow-hidden cursor-pointer transition-colors ${
                          idx % 2 === 0
                            ? 'bg-amber-500/25 border-amber-400/60 hover:bg-amber-500/40'
                            : 'bg-yellow-500/20 border-yellow-400/50 hover:bg-amber-500/40'
                        }`}
                        title={`Правление: ${r.ruler} (${r.reignPeriod}). Нажмите, чтобы сфокусироваться.`}
                      >
                        <span className="text-[10px] font-mono font-bold text-amber-200 truncate">
                          {r.shortRuler} ({r.reignPeriod})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {thematicLanes.map((lane) => {
                const laneEvents = matchingEvents.filter(
                  (ev) => resolveEventBranch(ev, branches, militaryBranchMode).id === lane.id,
                );
                return (
                  <div key={lane.id} className="grid grid-cols-12 items-center gap-2 py-0.5">
                    <div className="col-span-3 sm:col-span-2 flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lane.color }} />
                      <span className="text-[10px] font-mono text-slate-300 truncate">{lane.short}</span>
                    </div>
                    <div className="col-span-9 sm:col-span-10 relative h-6 bg-slate-900/90 rounded border border-slate-800/80 overflow-hidden">
                      {laneEvents.map((ev) => {
                        const left = toPct(Math.max(yearFrom, ev.startYear));
                        const right = toPct(Math.min(maxY, ev.endYear));
                        const width = Math.max(0.9, right - left);
                        const multiPrefix =
                          ev.overlappingRulers.length > 1 ? `[${ev.overlappingRulers.length} правл.] ` : '';
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => onOpenCardModal(ev.id)}
                            onMouseEnter={() => onHoverEvent(ev.id)}
                            onMouseLeave={() => onHoverEvent(null)}
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              backgroundColor: `${lane.color}35`,
                              borderColor: lane.color,
                            }}
                            className="absolute top-1 bottom-1 rounded border px-1 flex items-center overflow-hidden cursor-pointer hover:brightness-125 transition-all text-left"
                            title={`${ev.period} — ${ev.title}\nПравители: ${ev.ruler}`}
                          >
                            <span className="text-[9px] font-mono text-white truncate">
                              {multiPrefix}
                              {ev.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="grid grid-cols-12 items-center gap-2 pt-1">
                <div className="col-span-3 sm:col-span-2" />
                <div className="col-span-9 sm:col-span-10 flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-500 px-1">
                  {ticks.map((t, i) => (
                    <span key={`${t}-${i}`}>{t} г.</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
