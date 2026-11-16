import { useMemo } from 'react';
import { ArrowUpLeft, ChevronDown, ChevronUp, Flame, Layers, Maximize2, RotateCcw } from 'lucide-react';
import { computeOverlapAnalytics, resolveEventBranch } from '../engine/timelineEngine';
import type { BranchDefinition, EnrichedEvent, RulerPeriod, YearRangeStep } from '../types/timeline';

interface OverlapMapSectionProps {
  yearFrom: number;
  yearTo: number;
  minYear?: number;
  maxYear?: number;
  previousYearRange: YearRangeStep | null;
  canStepUp: boolean;
  onZoomStepUp: () => void;
  onResetYearWindow: () => void;
  onYearRangeChange: (from: number, to: number) => void;
  matchingRulers: RulerPeriod[];
  matchingEvents: EnrichedEvent[];
  visibleLanes: BranchDefinition[];
  branches: BranchDefinition[];
  collapsedParents: Record<string, boolean>;
  hoveredEventId: string | null;
  showOverlapMatrix: boolean;
  onToggleOverlapMatrix: () => void;
  onOpenCardModal: (eventId: string) => void;
  onHoverEvent: (eventId: string | null) => void;
  onResetAll: () => void;
  hasActiveFilters: boolean;
}

export function OverlapMapSection({
  yearFrom,
  yearTo,
  minYear = 862,
  maxYear = 2000,
  previousYearRange,
  canStepUp,
  onZoomStepUp,
  onResetYearWindow,
  onYearRangeChange,
  matchingRulers,
  matchingEvents,
  visibleLanes,
  branches,
  collapsedParents,
  hoveredEventId,
  showOverlapMatrix,
  onToggleOverlapMatrix,
  onOpenCardModal,
  onHoverEvent,
  onResetAll,
  hasActiveFilters,
}: OverlapMapSectionProps) {
  const maxY = Math.max(yearFrom + 1, yearTo);
  const totalSpan = maxY - yearFrom;
  const isZoomedRange = yearFrom !== minYear || maxY !== maxYear;
  const toPct = (y: number) => Math.max(0, Math.min(100, ((y - yearFrom) / totalSpan) * 100));

  const thematicLanes = useMemo(
    () => visibleLanes.filter((l) => l.id !== 'MAIN_RULERS' && l.id !== 'TIME_AXIS'),
    [visibleLanes],
  );

  const analytics = useMemo(
    () =>
      computeOverlapAnalytics(
        matchingEvents,
        matchingRulers,
        thematicLanes.length,
        yearFrom,
        maxY,
      ),
    [matchingEvents, matchingRulers, thematicLanes.length, yearFrom, maxY],
  );

  const ticks = [
    yearFrom,
    Math.round(yearFrom + totalSpan * 0.25),
    Math.round(yearFrom + totalSpan * 0.5),
    Math.round(yearFrom + totalSpan * 0.75),
    maxY,
  ];

  const handleFocusPeak = (fromYear: number, toYear: number) => {
    const paddedFrom = Math.max(minYear, fromYear - 2);
    const paddedTo = Math.min(maxYear, Math.max(paddedFrom + 2, toYear + 2));
    if (yearFrom === paddedFrom && yearTo === paddedTo) {
      onYearRangeChange(fromYear, Math.max(fromYear + 1, toYear));
    } else {
      onYearRangeChange(paddedFrom, paddedTo);
    }
  };

  const primaryPeakLabel = analytics.primaryPeak
    ? analytics.primaryPeak.fromYear === analytics.primaryPeak.toYear
      ? `${analytics.primaryPeak.fromYear} г.`
      : `${analytics.primaryPeak.fromYear}–${analytics.primaryPeak.toYear} гг.`
    : null;

  if (!showOverlapMatrix) {
    return (
      <section aria-label="Карта синхронного наложения периодов" className="border-b border-slate-800/80 bg-[#050811]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="bg-[#0b1222] border border-slate-700/70 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Layers className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Карта синхронного наложения периодов</span>
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-400 flex flex-wrap items-center gap-2">
                <span>{yearFrom}–{maxY} гг.</span>
                <span aria-hidden="true">·</span>
                <span>
                  Пик: {analytics.maxConcurrency}{' '}
                  {analytics.maxConcurrency === 1 ? 'процесс' : 'процессов'}
                  {primaryPeakLabel ? ` (${primaryPeakLabel})` : ''}
                </span>
                <span aria-hidden="true">·</span>
                <span>{analytics.totalEventsCount} событий</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {canStepUp && previousYearRange && (
                <button
                  type="button"
                  onClick={onZoomStepUp}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  title={`Вернуться на уровень выше: ${previousYearRange.from}–${previousYearRange.to} гг.`}
                >
                  <ArrowUpLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span>На уровень выше</span>
                </button>
              )}

              {isZoomedRange && (
                <button
                  type="button"
                  onClick={onResetYearWindow}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  title={`Вернуться к исходному диапазону ${minYear}–${maxYear} гг. (ветки и поиск сохранятся)`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Весь период</span>
                </button>
              )}

              <button
                type="button"
                onClick={onToggleOverlapMatrix}
                className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-200 text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Развернуть карту наложения</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Число трековых строк в сетке (1 дорожка правителей + N тематических веток + 1 полоса плотности)
  const totalTrackRows = 1 + thematicLanes.length + 1;

  return (
    <section
      aria-label="Карта синхронного наложения периодов"
      className="border-b border-slate-800/80 bg-[#050811]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="bg-[#0b1222] border border-slate-700/75 rounded-2xl overflow-hidden">
          {/* Заголовок аналитического инструмента + 3 сводные метрики */}
          <div className="px-4 sm:px-5 py-3.5 bg-[#0e1629] border-b border-slate-800/90 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400 shrink-0" />
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-white">
                  Карта синхронного наложения периодов
                </h2>
              </div>
              <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono tabular-nums">
                <span>Окно {yearFrom}–{maxY} гг.</span>
                <span aria-hidden="true">·</span>
                <span>{totalSpan} лет</span>
                <span aria-hidden="true">·</span>
                <span>Сквозные границы {matchingRulers.length} правлений</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
              {/* Сводка показателей без вложенных карточек и пилюль */}
              <div className="flex flex-wrap items-center divide-x divide-slate-800 text-xs font-mono tabular-nums">
                {analytics.primaryPeak ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleFocusPeak(analytics.primaryPeak!.fromYear, analytics.primaryPeak!.toYear)
                    }
                    className="pr-3.5 text-left group cursor-pointer focus:outline-none"
                    title="Нажмите, чтобы приблизить зону максимального одновременного наложения событий"
                  >
                    <div className="text-[10px] text-rose-300/90 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-rose-400" />
                      <span>Пик наложения</span>
                    </div>
                    <div className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                      {analytics.maxConcurrency} одновр. · {primaryPeakLabel}
                    </div>
                  </button>
                ) : (
                  <div className="pr-3.5">
                    <div className="text-[10px] text-slate-400">Пик наложения</div>
                    <div className="text-xs font-bold text-slate-200">{analytics.maxConcurrency} одновр.</div>
                  </div>
                )}

                <div className="px-3.5">
                  <div className="text-[10px] text-slate-400">Через 2+ правления</div>
                  <div className="text-xs font-bold text-amber-300">{analytics.multiReignCount} событий</div>
                </div>

                <div className="pl-3.5">
                  <div className="text-[10px] text-slate-400">Покрытие матрицы</div>
                  <div className="text-xs font-bold text-sky-300">
                    {analytics.totalEventsCount} соб. · {analytics.activeLanesCount} вет.
                  </div>
                </div>
              </div>

              {(canStepUp || isZoomedRange) && (
                <div className="flex items-center gap-1.5">
                  {canStepUp && previousYearRange && (
                    <button
                      type="button"
                      onClick={onZoomStepUp}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      title={`Вернуться на уровень выше: ${previousYearRange.from}–${previousYearRange.to} гг.`}
                    >
                      <ArrowUpLeft className="w-3.5 h-3.5 text-amber-400" />
                      <span>На уровень выше</span>
                      <span className="text-slate-400 tabular-nums hidden sm:inline">
                        ({previousYearRange.from}–{previousYearRange.to})
                      </span>
                    </button>
                  )}

                  {isZoomedRange && (
                    <button
                      type="button"
                      onClick={onResetYearWindow}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      title={`Вернуться к исходному диапазону ${minYear}–${maxYear} гг. (ветки и поиск сохранятся)`}
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Весь период</span>
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={onToggleOverlapMatrix}
                className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                <span>Свернуть карту</span>
              </button>
            </div>
          </div>

          {/* Тело синхронизированной матрицы */}
          {matchingEvents.length === 0 && matchingRulers.length === 0 ? (
            <div className="px-5 py-8 text-center space-y-3">
              <p className="text-xs sm:text-sm text-slate-300">
                В окне {yearFrom}–{maxY} гг. при текущих фильтрах пересечений не найдено.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={onResetAll}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Сбросить фильтры</span>
                </button>
              )}
            </div>
          ) : (
            <div className="px-4 sm:px-5 py-4 space-y-2">
              {/* Верхняя строка отметок пиков и переходов власти */}
              <div className="grid grid-cols-[9.5rem_1fr] sm:grid-cols-[15rem_1fr] gap-x-3 items-end">
                <div className="text-[11px] font-medium text-slate-400 truncate">Линии смен / пики</div>
                <div className="relative h-4 select-none">
                  {analytics.rulerBoundaries.map((boundary) => {
                    const left = toPct(boundary.year);
                    return (
                      <span
                        key={`top-tick-${boundary.rulerId}-${boundary.year}`}
                        style={{ left: `${left}%` }}
                        className="absolute bottom-0 -translate-x-1/2 text-[9px] font-mono tabular-nums text-amber-300/80 whitespace-nowrap pointer-events-none hidden sm:inline"
                      >
                        {totalSpan <= 160 ? boundary.year : ''}
                      </span>
                    );
                  })}

                  {analytics.peakIntervals.map((peak) => {
                    const left = toPct(peak.fromYear);
                    const right = toPct(Math.min(maxY, peak.toYear + 1));
                    const width = Math.max(1.2, right - left);
                    const label =
                      peak.fromYear === peak.toYear
                        ? `Пик ${peak.maxCount}`
                        : `${peak.fromYear}–${peak.toYear} · ${peak.maxCount}`;
                    return (
                      <button
                        key={`peak-tag-${peak.fromYear}-${peak.toYear}`}
                        type="button"
                        onClick={() => handleFocusPeak(peak.fromYear, peak.toYear)}
                        style={{ left: `${left}%`, minWidth: `${width}%` }}
                        className="absolute top-0 h-4 px-1 rounded-sm bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/50 text-[9px] font-mono tabular-nums text-rose-200 leading-none flex items-center justify-center whitespace-nowrap cursor-pointer z-20 transition-colors"
                        title={`Пик наложения: ${peak.maxCount} одновременных процессов (${peak.fromYear}–${peak.toYear} гг.). Нажмите для масштабирования.`}
                      >
                        {width >= 4 || analytics.peakIntervals.length <= 2 ? label : `×${peak.maxCount}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Сетка дорожек со сквозным координатным слоем */}
              <div className="grid grid-cols-[9.5rem_1fr] sm:grid-cols-[15rem_1fr] gap-x-3 gap-y-1.5 relative">
                {/* Сквозной координатный слой (колонка 2 поверх всех строк) */}
                <div
                  className="col-start-2 relative pointer-events-none z-10"
                  style={{ gridRow: `1 / ${totalTrackRows + 1}` }}
                  aria-hidden="true"
                >
                  {/* Полосы пиков максимального наложения */}
                  {analytics.peakIntervals.map((peak) => {
                    const left = toPct(peak.fromYear);
                    const right = toPct(Math.min(maxY, peak.toYear + 1));
                    const width = Math.max(0.8, right - left);
                    return (
                      <div
                        key={`peak-band-${peak.fromYear}-${peak.toYear}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        className="absolute top-0 bottom-0 bg-rose-500/[0.11] border-x border-rose-400/35"
                      />
                    );
                  })}

                  {/* Сквозные вертикальные линии границ правлений */}
                  {analytics.rulerBoundaries.map((boundary) => {
                    const left = toPct(boundary.year);
                    return (
                      <div
                        key={`boundary-line-${boundary.rulerId}-${boundary.year}`}
                        style={{ left: `${left}%` }}
                        className="absolute top-0 bottom-0 border-l border-dashed border-amber-400/35"
                      />
                    );
                  })}
                </div>

                {/* Строка 1: Дорожка правителей */}
                <div className="col-start-1 row-start-1 flex items-center gap-2 pr-1 pb-1.5 border-b border-slate-800/70 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span
                    className="text-xs font-semibold text-amber-300 truncate"
                    title="Правители и правления"
                  >
                    Правители и правления
                  </span>
                </div>
                <div className="col-start-2 row-start-1 pb-1.5 border-b border-slate-800/70">
                  <div className="relative h-7 bg-slate-900/95 rounded border border-slate-800 overflow-hidden">
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
                          className={`absolute top-0.5 bottom-0.5 rounded border px-1.5 flex items-center overflow-hidden cursor-pointer transition-colors z-20 ${
                            idx % 2 === 0
                              ? 'bg-amber-500/25 border-amber-400/60 hover:bg-amber-500/40'
                              : 'bg-yellow-500/20 border-yellow-400/50 hover:bg-amber-500/40'
                          }`}
                          title={`Правление: ${r.ruler} (${r.reignPeriod}). Нажмите, чтобы сфокусироваться.`}
                        >
                          <span className="text-[10px] font-mono font-bold text-amber-100 truncate">
                            {r.shortRuler} ({r.reignPeriod})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Строки 2..N+1: Тематические ветки */}
                {thematicLanes.map((lane, laneIdx) => {
                  const rowNum = laneIdx + 2;
                  const laneEvents = matchingEvents.filter(
                    (ev) => resolveEventBranch(ev, branches, collapsedParents).id === lane.id,
                  );
                  return (
                    <div key={lane.id} className="contents">
                      <div
                        className="col-start-1 flex items-center gap-2 pr-1 min-w-0"
                        style={{ gridRow: rowNum }}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: lane.color }}
                        />
                        <span
                          className="text-xs font-medium text-slate-200 truncate"
                          title={`${lane.label} (${lane.gitName})`}
                        >
                          {lane.label}
                        </span>
                      </div>
                      <div className="col-start-2" style={{ gridRow: rowNum }}>
                        <div className="relative h-6 bg-slate-900/75 rounded border border-slate-800/80 overflow-hidden">
                          {laneEvents.map((ev) => {
                            const left = toPct(Math.max(yearFrom, ev.startYear));
                            const right = toPct(Math.min(maxY, ev.endYear));
                            const width = Math.max(0.9, right - left);
                            const isHovered = hoveredEventId === ev.id;
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
                                  backgroundColor: isHovered ? `${lane.color}85` : `${lane.color}38`,
                                  borderColor: lane.color,
                                }}
                                className={`absolute top-1 bottom-1 rounded border px-1 flex items-center overflow-hidden cursor-pointer transition-all text-left ${
                                  isHovered ? 'ring-1 ring-white z-30 brightness-125' : 'hover:brightness-125 z-20'
                                }`}
                                title={
                                  ev.ruler
                                    ? `${ev.period} — ${ev.title}\nПравители: ${ev.ruler}`
                                    : `${ev.period} — ${ev.title}`
                                }
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
                    </div>
                  );
                })}

                {/* Нижняя строка: тепловая полоса плотности по годам */}
                <div
                  className="col-start-1 flex items-center gap-2 pr-1 pt-1 min-w-0"
                  style={{ gridRow: totalTrackRows }}
                >
                  <span className="text-[11px] font-medium text-slate-400 truncate">
                    Плотность по годам
                  </span>
                </div>
                <div className="col-start-2 pt-1" style={{ gridRow: totalTrackRows }}>
                  <div className="relative h-5 bg-slate-950/90 rounded border border-slate-800/80 flex items-end overflow-hidden">
                    {analytics.yearBuckets.map((bucket) => {
                      const heightPct =
                        analytics.maxConcurrency > 0
                          ? Math.max(12, Math.round((bucket.count / analytics.maxConcurrency) * 100))
                          : 12;
                      const barClass = bucket.isPeak
                        ? 'bg-rose-400 hover:bg-rose-300'
                        : bucket.count >= 2
                        ? 'bg-sky-400/65 hover:bg-sky-300'
                        : bucket.count === 1
                        ? 'bg-slate-600/65 hover:bg-slate-500'
                        : 'bg-slate-900/40';
                      return (
                        <button
                          key={`density-${bucket.year}`}
                          type="button"
                          onClick={() =>
                            onYearRangeChange(
                              Math.max(minYear, bucket.year - 5),
                              Math.min(maxYear, bucket.year + 5),
                            )
                          }
                          style={{ height: `${heightPct}%` }}
                          className={`flex-1 min-w-[1px] transition-colors cursor-pointer z-20 ${barClass}`}
                          title={`${bucket.year} г.: одновременных процессов — ${bucket.count}. Нажмите, чтобы приблизить ±5 лет.`}
                          aria-label={`${bucket.year} год: ${bucket.count} процессов`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Ось лет под матрицей */}
              <div className="grid grid-cols-[9.5rem_1fr] sm:grid-cols-[15rem_1fr] gap-x-3 items-center">
                <div />
                <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-400 px-0.5">
                  {ticks.map((t, i) => (
                    <span key={`${t}-${i}`}>{t} г.</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Компактная строка расшифровки */}
          <div className="px-4 sm:px-5 py-2 bg-[#080e1c] border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 border-t border-dashed border-amber-400/70 inline-block" />
                <span>Пунктир — смена правителя сквозь ветки</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-rose-500/30 border border-rose-400/60 rounded-sm inline-block" />
                <span>Подсветка — пик одновременных событий</span>
              </span>
            </div>
            <span className="text-slate-500">
              Клик по полосе открывает карточку · клик по пику или правителю масштабирует окно
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
