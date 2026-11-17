import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crown,
  Flame,
  GitBranch,
  Layers,
  Link2,
  Minus,
  Plus,
  SlidersHorizontal,
  Undo2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { computeDensityBins, getLeafBranches, isBiographyNode } from '../engine/timelineEngine';
import type { BranchDefinition, EnrichedEvent, RulerPeriod } from '../types/timeline';

interface OverlapMapSectionProps {
  matchingEvents: EnrichedEvent[];
  rulers: RulerPeriod[];
  branches: BranchDefinition[];
  activeBranches: Record<string, boolean>;
  yearFrom: number;
  yearTo: number;
  minYear: number;
  maxYear: number;
  hoveredEventId: string | null;
  onHoverEvent: (id: string | null) => void;
  onOpenCardModal: (id: string) => void;
  onOpenPeriodModal: (rulerId: string) => void;
  onOpenWindowModal?: (from: number, to: number) => void;
  onSelectYearRange: (from: number, to: number, recordHistory?: boolean) => void;
  zoomHistoryCount: number;
  lastZoomStep: { from: number; to: number } | null;
  onStepBackZoom: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onShiftWindow: (direction: -1 | 1) => void;
  onApplySpanPreset: (preset: 'all' | 100 | 10 | 2) => void;
  onRecordZoomCheckpoint: () => void;
}

const RULER_BAR_COLORS = ['#fbbf24', '#38bdf8', '#c084fc', '#34d399', '#f472b6', '#fb923c'];

export function OverlapMapSection({
  matchingEvents,
  rulers,
  branches,
  activeBranches,
  yearFrom,
  yearTo,
  minYear,
  maxYear,
  hoveredEventId,
  onHoverEvent,
  onOpenCardModal,
  onOpenPeriodModal,
  onOpenWindowModal,
  onSelectYearRange,
  zoomHistoryCount,
  lastZoomStep,
  onStepBackZoom,
  onZoomIn,
  onZoomOut,
  onShiftWindow,
  onApplySpanPreset,
  onRecordZoomCheckpoint,
}: OverlapMapSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const scrubberTrackRef = useRef<HTMLDivElement | null>(null);
  const lastWheelCheckpointRef = useRef<number>(0);

  const span = Math.max(1, yearTo - yearFrom);
  const globalSpan = Math.max(1, maxYear - minYear);
  const rulersActive = activeBranches.MAIN_RULERS !== false;
  const midYear = Math.round((yearFrom + yearTo) / 2);
  const shiftStepYears = Math.max(1, Math.round(span / 2));

  const canZoomIn = span > 2;
  const canZoomOut = span < globalSpan;
  const canShiftLeft = yearFrom > minYear;
  const canShiftRight = yearTo < maxYear;

  const isFullPeriodActive = yearFrom <= minYear && yearTo >= maxYear;
  const isCenturyActive = !isFullPeriodActive && span >= 80 && span <= 120;
  const isDecadeActive = span >= 8 && span <= 12;
  const isMicroWindowActive = span <= 3;

  const visibleRulers = useMemo(
    () => rulers.filter((r) => r.endYear >= yearFrom && r.startYear <= yearTo),
    [rulers, yearFrom, yearTo],
  );

  const visibleEventBranches = useMemo(
    () => getLeafBranches(branches).filter((b) => !b.isTimeAxis && activeBranches[b.id]),
    [branches, activeBranches],
  );

  // Глобальная гистограмма плотности на весь диапазон 862–2000 для интерактивного скраббера
  const globalDensityBins = useMemo(
    () => computeDensityBins(matchingEvents, minYear, maxYear, 36),
    [matchingEvents, minYear, maxYear],
  );

  const maxGlobalCount = useMemo(
    () => Math.max(1, ...globalDensityBins.map((b) => b.totalCount)),
    [globalDensityBins],
  );

  // Локальная гистограмма плотности для выбранного окна
  const densityBins = useMemo(
    () => computeDensityBins(matchingEvents, yearFrom, yearTo, 28),
    [matchingEvents, yearFrom, yearTo],
  );

  const maxBinCount = useMemo(
    () => Math.max(1, ...densityBins.map((b) => b.totalCount)),
    [densityBins],
  );

  const peakBin = useMemo(() => {
    let best = densityBins[0] ?? null;
    for (const bin of densityBins) {
      if (!best || bin.totalCount > best.totalCount) {
        best = bin;
      }
    }
    return best;
  }, [densityBins]);

  const hoveredEvent = useMemo(
    () => (hoveredEventId ? matchingEvents.find((e) => e.id === hoveredEventId) ?? null : null),
    [hoveredEventId, matchingEvents],
  );

  const linkedIds = useMemo(() => {
    const s = new Set<string>();
    if (!hoveredEvent) return s;
    hoveredEvent.explicitLinks.forEach((l) => s.add(l.otherId));
    return s;
  }, [hoveredEvent]);

  const toPct = (year: number) => {
    const clamped = Math.max(yearFrom, Math.min(yearTo, year));
    return ((clamped - yearFrom) / span) * 100;
  };

  const toGlobalPct = (year: number) => {
    const clamped = Math.max(minYear, Math.min(maxYear, year));
    return ((clamped - minYear) / globalSpan) * 100;
  };

  const ticks = useMemo(() => {
    const step = span <= 30 ? 5 : span <= 80 ? 10 : span <= 200 ? 25 : span <= 500 ? 50 : 100;
    const first = Math.ceil(yearFrom / step) * step;
    const result: number[] = [];
    for (let y = first; y <= yearTo; y += step) {
      result.push(y);
    }
    return result;
  }, [yearFrom, yearTo, span]);

  const globalCenturyTicks = [900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000].filter(
    (y) => y >= minYear && y <= maxYear,
  );

  useEffect(() => {
    const track = scrubberTrackRef.current;
    if (!track) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.altKey && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const now = Date.now();
      if (now - lastWheelCheckpointRef.current > 450) {
        onRecordZoomCheckpoint();
        lastWheelCheckpointRef.current = now;
      }

      const factor = e.deltaY < 0 ? 0.7 : 1.4;
      const currentSpan = Math.max(2, yearTo - yearFrom);
      let targetSpan =
        factor < 1
          ? Math.max(2, Math.floor(currentSpan * factor))
          : Math.min(globalSpan, Math.max(currentSpan + 2, Math.round(currentSpan * factor)));
      if (factor < 1 && targetSpan === currentSpan && currentSpan > 2) {
        targetSpan = currentSpan - 1;
      }

      if (targetSpan >= globalSpan) {
        onSelectYearRange(minYear, maxYear, false);
        return;
      }

      const center = Math.round((yearFrom + yearTo) / 2);
      const halfLeft = Math.floor(targetSpan / 2);
      let nextFrom = center - halfLeft;
      let nextTo = nextFrom + targetSpan;
      if (nextFrom < minYear) {
        nextFrom = minYear;
        nextTo = Math.min(maxYear, minYear + targetSpan);
      }
      if (nextTo > maxYear) {
        nextTo = maxYear;
        nextFrom = Math.max(minYear, maxYear - targetSpan);
      }
      onSelectYearRange(nextFrom, nextTo, false);
    };

    track.addEventListener('wheel', handleWheel, { passive: false });
    return () => track.removeEventListener('wheel', handleWheel);
  }, [yearFrom, yearTo, minYear, maxYear, globalSpan, onRecordZoomCheckpoint, onSelectYearRange]);

  const handleTrackMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    mode: 'move' | 'left' | 'right',
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const track = scrubberTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const startX = e.clientX;
    const initFrom = yearFrom;
    const initTo = yearTo;
    const currentWidthYears = Math.max(2, initTo - initFrom);

    onRecordZoomCheckpoint();

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const deltaYears = Math.round((dx / Math.max(1, rect.width)) * globalSpan);

      if (mode === 'move') {
        let nextFrom = initFrom + deltaYears;
        let nextTo = initTo + deltaYears;
        if (nextFrom < minYear) {
          nextFrom = minYear;
          nextTo = Math.min(maxYear, minYear + currentWidthYears);
        }
        if (nextTo > maxYear) {
          nextTo = maxYear;
          nextFrom = Math.max(minYear, maxYear - currentWidthYears);
        }
        onSelectYearRange(nextFrom, nextTo, false);
      } else if (mode === 'left') {
        const nextFrom = Math.max(minYear, Math.min(initTo - 2, initFrom + deltaYears));
        onSelectYearRange(nextFrom, initTo, false);
      } else if (mode === 'right') {
        const nextTo = Math.min(maxYear, Math.max(initFrom + 2, initTo + deltaYears));
        onSelectYearRange(initFrom, nextTo, false);
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <section
      aria-label="Интерактивный скраббер времени и карта наложения процессов"
      className="rounded-2xl bg-slate-900/65 border border-slate-800/80 overflow-hidden"
    >
      {/* Компактный интерактивный скраббер окна времени (Time Brush) — виден всегда */}
      <div className="px-4 sm:px-5 py-3 bg-slate-950/75 border-b border-slate-800/80 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono font-bold text-amber-300">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Шкала времени и плотность событий ({minYear}–{maxYear})</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400 hidden lg:inline">
              — перетаскивайте рамку, используйте кнопки зума или Alt/Ctrl + колесо мыши (шаг окна: {span} л.)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[11px] font-mono font-bold tabular-nums">
              Окно: {yearFrom}–{yearTo} гг. ({matchingEvents.length} соб.)
            </span>
            {onOpenWindowModal && (
              <button
                type="button"
                onClick={() => onOpenWindowModal(yearFrom, yearTo)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-mono font-bold transition-colors cursor-pointer whitespace-nowrap"
                title={`Открыть сводное досье для выбранного отрезка ${yearFrom}–${yearTo} гг.`}
              >
                <BarChart3 className="w-3 h-3" />
                <span>Досье окна</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-300 cursor-pointer whitespace-nowrap"
            >
              <span>{isExpanded ? 'Свернуть карту полос' : 'Развернуть карту полос'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Полная панель управления масштабом, шагом окна и пресетами охвата */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Кнопка возврата на предыдущий шаг масштаба */}
            <button
              type="button"
              onClick={onStepBackZoom}
              disabled={zoomHistoryCount === 0}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-semibold transition-colors whitespace-nowrap shrink-0 ${
                zoomHistoryCount > 0
                  ? 'bg-slate-900 hover:bg-slate-800 border-amber-500/45 text-amber-200 cursor-pointer'
                  : 'bg-slate-900/40 border-slate-800/80 text-slate-600 cursor-not-allowed'
              }`}
              title={
                lastZoomStep
                  ? `Вернуться к предыдущему масштабу: ${lastZoomStep.from}–${lastZoomStep.to} гг. (шагов в стеке: ${zoomHistoryCount})`
                  : 'История изменения масштаба пуста'
              }
            >
              <Undo2 className="w-3.5 h-3.5 shrink-0" />
              <span>Назад (шаг масштаба)</span>
              {zoomHistoryCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold tabular-nums">
                  {lastZoomStep ? `${lastZoomStep.from}–${lastZoomStep.to}` : zoomHistoryCount}
                </span>
              )}
            </button>

            {/* Кнопки приближения и отдаления ×2 вокруг центра текущего окна */}
            <div
              className="inline-flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px] font-mono shrink-0"
              role="group"
              aria-label="Приближение и отдаление масштаба"
            >
              <button
                type="button"
                onClick={onZoomOut}
                disabled={!canZoomOut}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                  canZoomOut
                    ? 'text-slate-200 hover:bg-slate-800 hover:text-white cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
                title={
                  canZoomOut
                    ? `Отдалить временное окно в 2 раза вокруг ${midYear} г.`
                    : 'Открыт весь доступный период (862–2000 гг.)'
                }
              >
                <Minus className="w-3.5 h-3.5 shrink-0" />
                <span>Отдалить ×2</span>
              </button>

              <span className="w-px h-4 bg-slate-800 mx-0.5" aria-hidden="true" />

              <button
                type="button"
                onClick={onZoomIn}
                disabled={!canZoomIn}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                  canZoomIn
                    ? 'text-amber-300 hover:bg-slate-800 hover:text-amber-200 font-semibold cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
                title={
                  canZoomIn
                    ? `Приблизить временное окно в 2 раза вокруг ${midYear} г.`
                    : 'Достигнуто максимальное приближение (2–3 года)'
                }
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Приблизить ×2</span>
              </button>
            </div>

            {/* Шаговый сдвиг окна влево / вправо */}
            <div
              className="inline-flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px] font-mono shrink-0"
              role="group"
              aria-label="Сдвиг временного окна"
            >
              <button
                type="button"
                onClick={() => onShiftWindow(-1)}
                disabled={!canShiftLeft}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                  canShiftLeft
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
                title={
                  canShiftLeft
                    ? `Сдвинуть окно раньше на ${shiftStepYears} л.`
                    : 'Достигнуто начало хронологии (862 г.)'
                }
              >
                <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                <span>Ранее</span>
              </button>

              <span className="w-px h-4 bg-slate-800 mx-0.5" aria-hidden="true" />

              <button
                type="button"
                onClick={() => onShiftWindow(1)}
                disabled={!canShiftRight}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                  canShiftRight
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
                title={
                  canShiftRight
                    ? `Сдвинуть окно позже на ${shiftStepYears} л.`
                    : 'Достигнут конец хронологии (2000 г.)'
                }
              >
                <span>Позже</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          </div>

          {/* Быстрые зум-переключатели масштаба */}
          <div
            className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px] font-mono"
            role="group"
            aria-label="Быстрые переключатели масштаба"
          >
            <span className="px-2 py-0.5 text-[10px] text-slate-400 hidden sm:inline">Масштаб:</span>
            <button
              type="button"
              onClick={() => onApplySpanPreset('all')}
              className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                isFullPeriodActive
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              title={`Показать весь исторический период (${minYear}–${maxYear} гг.)`}
            >
              Весь период
            </button>
            <button
              type="button"
              onClick={() => onApplySpanPreset(100)}
              className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                isCenturyActive
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              title={`Масштаб в 100 лет вокруг центра окна (${midYear} г.)`}
            >
              Столетие (100 л.)
            </button>
            <button
              type="button"
              onClick={() => onApplySpanPreset(10)}
              className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                isDecadeActive
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              title={`Масштаб в 10 лет вокруг ${midYear} г. (включает помесячную детализацию оси)`}
            >
              Десятилетие (10 л.)
            </button>
            <button
              type="button"
              onClick={() => onApplySpanPreset(2)}
              className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                isMicroWindowActive
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              title={`Узкое окно 2–3 года вокруг ${midYear} г. (включает точную дневную детализацию оси)`}
            >
              2–3 года
            </button>
          </div>
        </div>

        {/* Интерактивная дорожка Time Brush с гистограммой */}
        <div
          ref={scrubberTrackRef}
          className="relative h-12 rounded-xl bg-slate-900/95 border border-slate-800 select-none overflow-hidden"
        >
          {/* Фоновая глобальная гистограмма плотности */}
          <div className="absolute inset-x-0 bottom-4 top-1.5 flex items-end gap-[2px] px-1">
            {globalDensityBins.map((bin) => {
              const heightPct =
                bin.totalCount === 0 ? 6 : Math.max(14, Math.round((bin.totalCount / maxGlobalCount) * 100));
              const inWindow = bin.endYear >= yearFrom && bin.startYear <= yearTo;
              return (
                <button
                  key={`global-bin-${bin.startYear}`}
                  type="button"
                  onClick={() => onSelectYearRange(bin.startYear, bin.endYear)}
                  title={`${bin.startYear}–${bin.endYear} гг.: событий — ${bin.totalCount}. Клик для фокуса`}
                  className="flex-1 h-full flex items-end cursor-pointer group/gbin"
                >
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t transition-colors ${
                      inWindow
                        ? 'bg-amber-400/75 group-hover/gbin:bg-amber-300'
                        : 'bg-slate-700/45 group-hover/gbin:bg-slate-500/70'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Подписи веков внизу дорожки */}
          <div className="absolute inset-x-0 bottom-0 h-4 bg-slate-950/90 border-t border-slate-800/80 pointer-events-none">
            {globalCenturyTicks.map((tick) => (
              <span
                key={tick}
                style={{ left: `${toGlobalPct(tick)}%` }}
                className="absolute top-0.5 -translate-x-1/2 text-[9px] font-mono text-slate-400 tabular-nums"
              >
                {tick}
              </span>
            ))}
          </div>

          {/* Затемнение областей вне выбранного окна */}
          <div
            style={{ width: `${toGlobalPct(yearFrom)}%` }}
            className="absolute inset-y-0 left-0 bg-slate-950/65 pointer-events-none"
          />
          <div
            style={{ width: `${Math.max(0, 100 - toGlobalPct(yearTo))}%` }}
            className="absolute inset-y-0 right-0 bg-slate-950/65 pointer-events-none"
          />

          {/* Перетаскиваемое окно скраббера */}
          <div
            style={{
              left: `${toGlobalPct(yearFrom)}%`,
              width: `${Math.max(1.5, toGlobalPct(yearTo) - toGlobalPct(yearFrom))}%`,
            }}
            onMouseDown={(e) => handleTrackMouseDown(e, 'move')}
            title="Перетащите окно времени влево или вправо"
            className="absolute inset-y-0 border-2 border-amber-400 bg-amber-400/10 cursor-grab active:cursor-grabbing flex items-center justify-between"
          >
            {/* Левый ползунок */}
            <div
              onMouseDown={(e) => handleTrackMouseDown(e, 'left')}
              title={`Изменить начало окна (${yearFrom} г.)`}
              className="w-2.5 h-full bg-amber-400/90 hover:bg-amber-300 cursor-ew-resize flex items-center justify-center"
            >
              <span className="w-0.5 h-4 bg-slate-950 rounded-full" />
            </div>

            {/* Правый ползунок */}
            <div
              onMouseDown={(e) => handleTrackMouseDown(e, 'right')}
              title={`Изменить конец окна (${yearTo} г.)`}
              className="w-2.5 h-full bg-amber-400/90 hover:bg-amber-300 cursor-ew-resize flex items-center justify-center"
            >
              <span className="w-0.5 h-4 bg-slate-950 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 sm:px-5 pb-4 pt-3 space-y-4">
          {/* Гистограмма исторической плотности выбранного окна (клик по столбцу = зум) */}
          <div className="rounded-xl bg-slate-950/80 border border-slate-800/80 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-200 font-semibold">
                  Концентрация исторических процессов в окне {yearFrom}–{yearTo} гг. (клик по интервалу — фокус):
                </span>
              </div>
              <div className="flex items-center gap-3">
                {peakBin && peakBin.totalCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectYearRange(peakBin.startYear, peakBin.endYear)}
                    className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 cursor-pointer"
                    title="Перейти к самому насыщенному интервалу времени"
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      Пик эпохи: {peakBin.startYear}–{peakBin.endYear} ({peakBin.totalCount} соб.)
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="h-12 flex items-end gap-1 pt-1">
              {densityBins.map((bin) => {
                const heightPct =
                  bin.totalCount === 0 ? 6 : Math.max(14, Math.round((bin.totalCount / maxBinCount) * 100));
                const isPeak = peakBin?.startYear === bin.startYear && bin.totalCount > 0;
                const hasHovered =
                  hoveredEvent !== null &&
                  hoveredEvent.startYear <= bin.endYear &&
                  hoveredEvent.endYear >= bin.startYear;

                return (
                  <button
                    key={`${bin.startYear}-${bin.endYear}`}
                    type="button"
                    onClick={() => onSelectYearRange(bin.startYear, bin.endYear)}
                    title={`${bin.startYear}–${bin.endYear} гг.: активных событий — ${bin.totalCount}, новых событий — ${bin.commitCount}. Клик для фокуса`}
                    className="group flex-1 h-full flex flex-col justify-end items-stretch cursor-pointer focus:outline-none"
                  >
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t transition-all ${
                        hasHovered
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                          : isPeak
                            ? 'bg-amber-400 group-hover:bg-amber-300'
                            : bin.totalCount > 0
                              ? 'bg-sky-500/55 group-hover:bg-amber-400/80'
                              : 'bg-slate-800/60 group-hover:bg-slate-700'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="min-w-[680px] space-y-2.5">
              {/* Шкала годов */}
              <div className="flex items-center gap-3">
                <div className="w-40 shrink-0 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Шкала лет ({yearFrom}–{yearTo})
                </div>
                <div className="relative flex-1 h-6 bg-slate-950/90 rounded-lg border border-slate-800/80 overflow-hidden">
                  {ticks.map((tick) => {
                    const left = toPct(tick);
                    return (
                      <div
                        key={tick}
                        style={{ left: `${left}%` }}
                        className="absolute top-0 bottom-0 border-l border-slate-700/60"
                      >
                        <span className="pl-1 text-[10px] font-mono text-slate-400 tabular-nums">{tick}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Лента правителей */}
              {rulersActive && (
                <div className="flex items-center gap-3">
                  <div className="w-40 shrink-0 flex items-center gap-2 text-xs font-mono text-amber-300 font-semibold">
                    <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">Правления</span>
                  </div>
                  <div className="relative flex-1 h-9 bg-slate-950/90 rounded-lg border border-slate-800/90 overflow-hidden">
                    {ticks.map((tick) => (
                      <div
                        key={tick}
                        style={{ left: `${toPct(tick)}%` }}
                        className="absolute top-0 bottom-0 border-l border-slate-800/50 pointer-events-none"
                      />
                    ))}
                    {visibleRulers.map((r, idx) => {
                      const left = toPct(r.startYear);
                      const right = toPct(r.endYear);
                      const width = Math.max(1.2, right - left);
                      const color = RULER_BAR_COLORS[idx % RULER_BAR_COLORS.length];
                      const isOverlappingHovered =
                        hoveredEvent !== null &&
                        r.endYear >= hoveredEvent.startYear &&
                        r.startYear <= hoveredEvent.endYear;

                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => onOpenPeriodModal(r.id)}
                          title={`${r.ruler} (${r.reignPeriod})${r.center ? ` [${r.center}]` : ''} — клик для сводки правления`}
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            backgroundColor: isOverlappingHovered ? `${color}44` : `${color}24`,
                            borderColor: color,
                          }}
                          className={`absolute top-1 bottom-1 rounded border text-left px-1.5 overflow-hidden transition-all hover:z-20 hover:brightness-125 cursor-pointer ${
                            isOverlappingHovered ? 'ring-1 ring-amber-300 z-10' : ''
                          }`}
                        >
                          <span className="block text-[10px] font-mono font-bold text-white truncate">
                            {r.shortRuler} ({r.reignPeriod})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Полосы по каждой активной ветке событий */}
              {visibleEventBranches.map((branch) => {
                const branchEvents = matchingEvents.filter((e) => e.task === branch.id);
                const parentBranch = branch.parentBranchId
                  ? branches.find((b) => b.id === branch.parentBranchId)
                  : null;
                return (
                  <div key={branch.id} className="flex items-center gap-3">
                    <div className="w-40 shrink-0 flex items-center justify-between gap-1.5 text-xs font-mono text-slate-300">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: branch.color }}
                        />
                        {parentBranch && (
                          <span title={`Ветка внутри группы «${parentBranch.label}»`}>
                            <GitBranch className="w-3 h-3 text-slate-500 shrink-0" />
                          </span>
                        )}
                        <span className="truncate font-semibold" title={branch.label}>
                          {branch.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                        {branchEvents.length}
                      </span>
                    </div>

                    <div className="relative flex-1 h-8 bg-slate-950/90 rounded-lg border border-slate-800/90 overflow-hidden">
                      {ticks.map((tick) => (
                        <div
                          key={tick}
                          style={{ left: `${toPct(tick)}%` }}
                          className="absolute top-0 bottom-0 border-l border-slate-800/50 pointer-events-none"
                        />
                      ))}

                      {branchEvents.map((ev) => {
                        const isBio = isBiographyNode(ev);
                        const left = toPct(ev.startYear);
                        const right = toPct(isBio ? ev.startYear : ev.endYear);
                        const isPoint = ev.startYear === ev.endYear || isBio;
                        const width = isPoint ? Math.max(0.9, 100 / Math.max(30, span)) : Math.max(1.2, right - left);
                        const isHovered = hoveredEventId === ev.id;
                        const isLinked = linkedIds.has(ev.id);
                        const isConcurrent =
                          hoveredEvent !== null &&
                          hoveredEvent.id !== ev.id &&
                          ev.startYear <= hoveredEvent.endYear &&
                          ev.endYear >= hoveredEvent.startYear;

                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onMouseEnter={() => onHoverEvent(ev.id)}
                            onMouseLeave={() => onHoverEvent(null)}
                            onClick={() => onOpenCardModal(ev.id)}
                            title={
                              isBio
                                ? `${ev.title} (${ev.period}) · связей: ${ev.explicitLinks.length}`
                                : `${ev.period}: ${ev.title} (правлений: ${ev.overlappingRulers.length}, связей: ${ev.explicitLinks.length})`
                            }
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              backgroundColor: isHovered
                                ? branch.color
                                : isLinked
                                  ? '#10b981'
                                  : `${branch.color}42`,
                              borderColor: isLinked ? '#34d399' : branch.color,
                            }}
                            className={`absolute top-1 bottom-1 rounded border text-left px-1 overflow-hidden transition-all cursor-pointer hover:z-20 ${
                              isHovered
                                ? 'z-30 ring-2 ring-white'
                                : isLinked
                                  ? 'z-20 ring-2 ring-emerald-300'
                                  : isConcurrent
                                    ? 'z-10 ring-1 ring-amber-300/70'
                                    : ''
                            }`}
                          >
                            {width > 4.5 && (
                              <span className="block text-[10px] font-mono font-semibold text-white truncate">
                                {ev.title}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/70">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Наведите курсор на полосу для подсветки одновременных событий и правлений</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <Link2 className="w-3.5 h-3.5" />
                <span>Зелёное свечение = причинно-следственная или культурная связь</span>
              </span>
            </div>
            {hoveredEvent && (
              <span className="text-amber-300 font-semibold">
                Фокус: {hoveredEvent.period} — {hoveredEvent.title} (правлений:{' '}
                {hoveredEvent.overlappingRulers.length}, связей: {hoveredEvent.explicitLinks.length})
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
