import { ArrowLeft, ArrowRight, Crosshair, Crown, Flag, GitCommitHorizontal, GitMerge, Link2, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getEventRulerSegments,
  getGitHash,
  RULER_ALT_COLORS,
  resolveEventBranch,
} from '../engine/timelineEngine';
import type {
  AxisResolution,
  BranchDefinition,
  CardDensity,
  EnrichedEvent,
  FocusScope,
  MacroEra,
  RulerPeriod,
  StreamRow,
  SyncManifest,
} from '../types/timeline';

interface GitTimelineProps {
  stream: StreamRow[];
  matchingEvents: EnrichedEvent[];
  matchingRulers: RulerPeriod[];
  rulers: RulerPeriod[];
  visibleLanes: BranchDefinition[];
  branches: BranchDefinition[];
  manifest: SyncManifest;
  yearFrom: number;
  axisResolution: AxisResolution;
  hoveredEventId: string | null;
  cardDensity: CardDensity;
  focusedEvent: EnrichedEvent | null;
  focusScope: FocusScope;
  onChangeFocusScope: (scope: FocusScope) => void;
  onToggleFocusEvent: (eventId: string) => void;
  onExitFocusMode: () => void;
  highlightedJumpId: string | null;
  onJumpToEvent: (targetEventId: string) => void;
  onHoverEvent: (eventId: string | null) => void;
  onOpenCardModal: (eventId: string) => void;
  onOpenPeriodModal: (rulerId: string) => void;
  onSelectYearRange: (from: number, to: number) => void;
}

const SEGMENT_TONES = [
  'bg-amber-400/80 hover:bg-amber-300',
  'bg-sky-400/80 hover:bg-sky-300',
  'bg-emerald-400/80 hover:bg-emerald-300',
  'bg-purple-400/80 hover:bg-purple-300',
];

const RESOLUTION_LABELS: Record<AxisResolution, string> = {
  year: 'Годы',
  month: 'Месяцы (окно ≤ 12 л.)',
  day: 'Дни и точные даты (окно ≤ 2 л.)',
};

export function GitTimeline({
  stream,
  matchingEvents,
  matchingRulers,
  rulers,
  visibleLanes,
  branches,
  manifest,
  yearFrom,
  axisResolution,
  hoveredEventId,
  cardDensity,
  focusedEvent,
  focusScope,
  onChangeFocusScope,
  onToggleFocusEvent,
  onExitFocusMode,
  highlightedJumpId,
  onJumpToEvent,
  onHoverEvent,
  onOpenCardModal,
  onOpenPeriodModal,
  onSelectYearRange,
}: GitTimelineProps) {
  const streamContainerRef = useRef<HTMLDivElement | null>(null);
  const [activeStickyRulerId, setActiveStickyRulerId] = useState<string | null>(null);

  const defaultStickyRulerId = useMemo(() => {
    if (matchingRulers.length > 0) return matchingRulers[0].id;
    if (matchingEvents.length > 0 && matchingEvents[0].overlappingRulers.length > 0) {
      return matchingEvents[0].overlappingRulers[0].id;
    }
    return rulers[0]?.id ?? null;
  }, [matchingRulers, matchingEvents, rulers]);

  useEffect(() => {
    setActiveStickyRulerId(defaultStickyRulerId);
  }, [defaultStickyRulerId, stream.length]);

  useEffect(() => {
    const container = streamContainerRef.current;
    if (!container) return;

    const visibleMap = new Map<Element, string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const rId = entry.target.getAttribute('data-ruler-context');
          if (!rId) return;
          if (entry.isIntersecting) {
            visibleMap.set(entry.target, rId);
          } else {
            visibleMap.delete(entry.target);
          }
        });

        if (visibleMap.size > 0) {
          let bestEl: Element | null = null;
          let bestDist = Number.POSITIVE_INFINITY;
          visibleMap.forEach((_, el) => {
            const rect = el.getBoundingClientRect();
            const dist = Math.abs(rect.top - 132);
            if (dist < bestDist) {
              bestDist = dist;
              bestEl = el;
            }
          });
          if (bestEl) {
            const matchedId = visibleMap.get(bestEl);
            if (matchedId) setActiveStickyRulerId(matchedId);
          }
        }
      },
      {
        root: null,
        rootMargin: '-115px 0px -65% 0px',
        threshold: 0,
      },
    );

    const anchors = container.querySelectorAll('[data-ruler-context]');
    anchors.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [stream, cardDensity]);

  const activeStickyRuler = useMemo(
    () => rulers.find((r) => r.id === (activeStickyRulerId || defaultStickyRulerId)) ?? null,
    [rulers, activeStickyRulerId, defaultStickyRulerId],
  );

  const activeStickyEra: MacroEra | null = useMemo(() => {
    if (!activeStickyRuler) return null;
    return manifest.macroEras.find((e) => e.id === activeStickyRuler.eraId) ?? null;
  }, [activeStickyRuler, manifest.macroEras]);

  const activeStickyRulerEventCount = useMemo(() => {
    if (!activeStickyRuler) return 0;
    return matchingEvents.filter((ev) => ev.overlappingRulers.some((r) => r.id === activeStickyRuler.id)).length;
  }, [activeStickyRuler, matchingEvents]);

  // Трёхзонная геометрия графа: [Правители (чередование A/B)] | [Центральная ось времени] | [Тематические ветки]
  const hasRulersLane = visibleLanes.some((l) => l.id === 'MAIN_RULERS');
  const thematicLanes = useMemo(
    () => visibleLanes.filter((l) => l.id !== 'MAIN_RULERS' && l.id !== 'TIME_AXIS'),
    [visibleLanes],
  );

  const rulerRailAX = 16;
  const rulerRailBX = 30;
  const timeSpineX = hasRulersLane ? 54 : 22;
  const laneSpacing = 22;
  const firstThematicX = timeSpineX + 28;
  const getThematicX = (thematicIdx: number) => firstThematicX + thematicIdx * laneSpacing;
  const svgWidth = Math.max(
    112,
    thematicLanes.length > 0 ? getThematicX(thematicLanes.length - 1) + 20 : timeSpineX + 30,
  );

  const rulerIndexById = useMemo(() => new Map(rulers.map((r, i) => [r.id, i])), [rulers]);

  const rulerSortBounds = useMemo(() => {
    const map = new Map<string, { startKey: number; endKey: number }>();
    matchingRulers.forEach((r) => {
      const sy = r.startDate
        ? Number(r.startDate.slice(0, 4)) * 10000 +
          Number(r.startDate.slice(5, 7) || 1) * 100 +
          Number(r.startDate.slice(8, 10) || 1)
        : r.startYear * 10000 + 101;
      const ey = r.endDate
        ? Number(r.endDate.slice(0, 4)) * 10000 +
          Number(r.endDate.slice(5, 7) || 12) * 100 +
          Number(r.endDate.slice(8, 10) || 28)
        : r.endYear * 10000 + 1228;
      map.set(r.id, { startKey: sy, endKey: ey });
    });
    return map;
  }, [matchingRulers]);

  const alreadyRunningEvents = !focusedEvent ? matchingEvents.filter((ev) => ev.startYear < yearFrom) : [];

  const hoveredEvent = hoveredEventId ? (matchingEvents.find((e) => e.id === hoveredEventId) ?? null) : null;
  const linkedEventIds = new Set<string>();
  if (hoveredEventId) {
    (manifest.crossLinks || []).forEach((lnk) => {
      if (lnk.from === hoveredEventId) linkedEventIds.add(lnk.to);
      if (lnk.to === hoveredEventId) linkedEventIds.add(lnk.from);
    });
  }

  function renderRailsForRow(
    sortKey: number,
    options?: {
      skipRulerId?: string;
      highlightThematicId?: string;
      excludeEventIdFromThematic?: string;
    },
  ) {
    const activeA = hasRulersLane
      ? matchingRulers.find((r) => {
          if (r.id === options?.skipRulerId) return false;
          const idx = rulerIndexById.get(r.id) ?? 0;
          if (idx % 2 !== 0) return false;
          const b = rulerSortBounds.get(r.id);
          return b ? b.startKey <= sortKey && b.endKey >= sortKey : false;
        })
      : undefined;

    const activeB = hasRulersLane
      ? matchingRulers.find((r) => {
          if (r.id === options?.skipRulerId) return false;
          const idx = rulerIndexById.get(r.id) ?? 0;
          if (idx % 2 === 0) return false;
          const b = rulerSortBounds.get(r.id);
          return b ? b.startKey <= sortKey && b.endKey >= sortKey : false;
        })
      : undefined;

    return (
      <>
        {hasRulersLane && (
          <g>
            {activeA ? (
              <line
                x1={rulerRailAX}
                y1={0}
                x2={rulerRailAX}
                y2={420}
                stroke={RULER_ALT_COLORS[0]}
                strokeWidth={3}
                strokeOpacity={0.92}
              />
            ) : (
              <line
                x1={rulerRailAX}
                y1={0}
                x2={rulerRailAX}
                y2={420}
                stroke={RULER_ALT_COLORS[0]}
                strokeWidth={1.2}
                strokeOpacity={0.18}
                strokeDasharray="3 4"
              />
            )}

            {activeB ? (
              <line
                x1={rulerRailBX}
                y1={0}
                x2={rulerRailBX}
                y2={420}
                stroke={RULER_ALT_COLORS[1]}
                strokeWidth={3}
                strokeOpacity={0.92}
              />
            ) : (
              <line
                x1={rulerRailBX}
                y1={0}
                x2={rulerRailBX}
                y2={420}
                stroke={RULER_ALT_COLORS[1]}
                strokeWidth={1.2}
                strokeOpacity={0.18}
                strokeDasharray="3 4"
              />
            )}
          </g>
        )}

        {/* Центральный ствол времени (time/main) */}
        <line
          x1={timeSpineX}
          y1={0}
          x2={timeSpineX}
          y2={420}
          stroke="#cbd5e1"
          strokeWidth={3.2}
          strokeOpacity={0.85}
        />

        {/* Тематические ветки справа от оси времени */}
        {thematicLanes.map((lane, tIdx) => {
          const x = getThematicX(tIdx);
          const activeCount = matchingEvents.filter((ev) => {
            if (ev.id === options?.excludeEventIdFromThematic) return false;
            if (ev.isAtomic) return false;
            if (resolveEventBranch(ev, branches).id !== lane.id) return false;
            return ev.startPrecision.sortKey <= sortKey && ev.endPrecision.sortKey >= sortKey;
          }).length;

          if (activeCount === 0 && lane.id !== options?.highlightThematicId) {
            return (
              <line
                key={lane.id}
                x1={x}
                y1={0}
                x2={x}
                y2={420}
                stroke={lane.color}
                strokeWidth={1.4}
                strokeOpacity={0.22}
                strokeDasharray="4 4"
              />
            );
          }

          if (activeCount >= 2) {
            return (
              <g key={lane.id}>
                <line
                  x1={x - 3}
                  y1={0}
                  x2={x - 3}
                  y2={420}
                  stroke={lane.color}
                  strokeWidth={2.2}
                  strokeOpacity={0.95}
                />
                <line
                  x1={x + 3}
                  y1={0}
                  x2={x + 3}
                  y2={420}
                  stroke={lane.color}
                  strokeWidth={2.2}
                  strokeOpacity={0.95}
                />
              </g>
            );
          }

          return (
            <line
              key={lane.id}
              x1={x}
              y1={0}
              x2={x}
              y2={420}
              stroke={lane.color}
              strokeWidth={3.2}
              strokeOpacity={0.92}
            />
          );
        })}
      </>
    );
  }

  return (
    <div>
      <div className="sticky top-[45px] z-20 bg-[#050811]/95 backdrop-blur-md border border-slate-800/90 rounded-t-2xl shadow-md overflow-hidden">
        <div className="px-3 sm:px-5 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0">
            {visibleLanes.map((lane) => {
              const isTimeAxis = lane.id === 'TIME_AXIS';
              return (
                <div
                  key={lane.id}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-mono shrink-0 ${
                    isTimeAxis
                      ? 'bg-slate-800/90 border-slate-600 text-white font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lane.color }} />
                  <span>{lane.short}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0 text-[11px] font-mono text-slate-400">
            <span className="hidden md:inline text-slate-300">
              Масштаб оси: <strong className="text-sky-300 font-semibold">{RESOLUTION_LABELS[axisResolution]}</strong>
            </span>
            <span aria-hidden="true" className="hidden md:inline text-slate-600">
              ·
            </span>
            <span className="text-amber-300/90 font-semibold">Клик = git show</span>
          </div>
        </div>

        {activeStickyRuler && (
          <div className="px-3 sm:px-5 py-1.5 border-t border-slate-800/80 bg-slate-950/90 flex items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex items-center gap-2 min-w-0 truncate">
              {activeStickyEra && (
                <>
                  <span className="text-amber-400 font-bold shrink-0">Эпоха {activeStickyEra.roman}</span>
                  <span aria-hidden="true" className="text-slate-600 shrink-0">
                    ·
                  </span>
                </>
              )}
              <span className="inline-flex items-center gap-1 text-white font-bold truncate">
                <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">{activeStickyRuler.shortRuler}</span>
              </span>
              <span className="text-amber-300/90 tabular-nums shrink-0">{activeStickyRuler.reignPeriod}</span>
              <span className="hidden sm:inline text-slate-500 truncate">· {activeStickyRuler.reignTitle}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline text-slate-400 tabular-nums">
                {activeStickyRulerEventCount} соб.
              </span>
              {!focusedEvent && (
                <button
                  type="button"
                  onClick={() => onSelectYearRange(activeStickyRuler.startYear, activeStickyRuler.endYear)}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors cursor-pointer"
                  title="Отфильтровать временное окно по годам этого правителя"
                >
                  Окно
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenPeriodModal(activeStickyRuler.id)}
                className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 font-semibold transition-colors cursor-pointer"
              >
                Сводка →
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        ref={streamContainerRef}
        className="border-x border-b border-slate-800/90 rounded-b-2xl bg-slate-950/40 divide-y divide-slate-800/50"
      >
        {focusedEvent && (
          <div className="bg-emerald-950/35 border-b border-emerald-500/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-0.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="inline-flex items-center gap-1.5 text-emerald-300 font-bold">
                  <Crosshair className="w-3.5 h-3.5" />
                  Режим фокуса связей
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-slate-300 tabular-nums">
                  sync-связей: {focusedEvent.explicitLinks.length} · параллельных: {focusedEvent.concurrentEvents.length}
                </span>
              </div>
              <div className="text-sm font-bold text-white truncate">
                {focusedEvent.period} — {focusedEvent.title}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="inline-flex items-center rounded-lg bg-slate-950 border border-emerald-500/35 p-0.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => onChangeFocusScope('sync_only')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    focusScope === 'sync_only'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Только sync ({focusedEvent.explicitLinks.length})
                </button>
                <button
                  type="button"
                  onClick={() => onChangeFocusScope('sync_and_concurrent')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    focusScope === 'sync_and_concurrent'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Sync + параллельные ({focusedEvent.concurrentEvents.length})
                </button>
              </div>

              <button
                type="button"
                onClick={onExitFocusMode}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-mono font-semibold inline-flex items-center gap-1 cursor-pointer"
                title="Выйти из режима фокуса и вернуться к общему графику (Esc)"
              >
                <X className="w-3.5 h-3.5" />
                <span>Выйти (Esc)</span>
              </button>
            </div>
          </div>
        )}

        {yearFrom > 1686 && alreadyRunningEvents.length > 0 && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-semibold text-amber-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Переходящие процессы (начались до {yearFrom} г. и продолжаются в окне):
            </span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-amber-100">
              {alreadyRunningEvents.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onOpenCardModal(e.id)}
                  className="underline decoration-amber-400/50 hover:text-white cursor-pointer text-left"
                >
                  {e.period} {e.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {stream.map((item, idx) => {
          if (item.rowType === 'ERA_START') {
            const { era } = item;
            const carryOverWars = matchingEvents.filter(
              (ev) => ev.startYear < item.year && ev.endYear > item.year,
            );

            return (
              <div
                key={`era-${era.id}`}
                className="relative flex items-stretch bg-gradient-to-r from-slate-900/95 via-slate-900/70 to-slate-950 border-y border-amber-500/30"
              >
                <div className="shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                  <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                    {renderRailsForRow(item.sortKey)}
                    <line
                      x1={timeSpineX + 8}
                      y1={36}
                      x2={svgWidth}
                      y2={36}
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      strokeOpacity={0.7}
                    />
                    <circle cx={timeSpineX} cy={36} r={10} fill="#050811" stroke="#cbd5e1" strokeWidth={3} />
                    <circle cx={timeSpineX} cy={36} r={4.5} fill="#f59e0b" />
                  </svg>
                </div>

                <div className="flex-1 py-4 pr-4 sm:pr-6">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="px-2.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black tabular-nums">
                      ЭПОХА {era.roman} · {era.period}
                    </span>
                    <span className="text-slate-300">Рубеж на центральной оси времени</span>
                  </div>
                  <h2 className="text-base sm:text-xl font-extrabold text-white mt-1.5 [text-wrap:balance]">
                    {era.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">{era.thesis}</p>
                  {carryOverWars.length > 0 && (
                    <div className="mt-2 text-[11px] font-mono text-sky-300">
                      Сквозь границу эпохи продолжают идти:{' '}
                      {carryOverWars.map((w) => `${w.title} (${w.period})`).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (item.rowType === 'TIME_TICK') {
            return (
              <div
                key={`tick-${item.sortKey}-${idx}`}
                className="relative flex items-stretch bg-slate-950/75"
              >
                <div className="shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                  <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                    {renderRailsForRow(item.sortKey)}
                    <line
                      x1={timeSpineX + 4}
                      y1={14}
                      x2={svgWidth}
                      y2={14}
                      stroke="#475569"
                      strokeWidth={1}
                      strokeDasharray="2 3"
                      strokeOpacity={0.55}
                    />
                    <circle cx={timeSpineX} cy={14} r={3.5} fill="#050811" stroke="#94a3b8" strokeWidth={2} />
                  </svg>
                </div>

                <div className="flex-1 py-1 pr-4 sm:pr-6 flex items-center gap-2 text-[11px] font-mono text-slate-400">
                  <span className="font-bold text-slate-300 tabular-nums">{item.label}</span>
                  <span aria-hidden="true" className="text-slate-700">
                    ·
                  </span>
                  <span className="text-slate-500">ось time/main</span>
                </div>
              </div>
            );
          }

          if (item.rowType === 'RULER_COMMIT') {
            const r = item.rulerObj;
            const commitHash = getGitHash(r.id);
            const rx = item.rulerIndex % 2 === 0 ? rulerRailAX : rulerRailBX;
            const ongoingWarsAtAccession = matchingEvents.filter(
              (ev) => ev.startYear < r.startYear && ev.endYear > r.startYear,
            );

            return (
              <div
                key={`ruler-${r.id}`}
                id={r.id}
                data-ruler-context={r.id}
                className="relative flex items-stretch bg-slate-900/70 hover:bg-slate-900/95 transition-colors"
              >
                <div className="shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                  <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                    {renderRailsForRow(item.sortKey, { skipRulerId: r.id })}

                    {hasRulersLane && (
                      <>
                        {/* Ветка правления: ответвление (branch) от центральной оси времени влево к rx и продолжение вниз */}
                        {!item.startedBeforeWindow && (
                          <path
                            d={`M ${timeSpineX} 16 C ${timeSpineX - 10} 18, ${rx} 20, ${rx} 36`}
                            fill="none"
                            stroke={item.rulerColor}
                            strokeWidth={2.6}
                            strokeOpacity={0.95}
                          />
                        )}
                        <line
                          x1={rx}
                          y1={item.startedBeforeWindow ? 0 : 34}
                          x2={rx}
                          y2={420}
                          stroke={item.rulerColor}
                          strokeWidth={3}
                          strokeOpacity={0.95}
                        />
                        <line
                          x1={timeSpineX + 6}
                          y1={28}
                          x2={svgWidth}
                          y2={28}
                          stroke={item.rulerColor}
                          strokeWidth={1.4}
                          strokeDasharray="3 3"
                          strokeOpacity={0.7}
                        />
                        <circle cx={timeSpineX} cy={16} r={4} fill="#050811" stroke="#cbd5e1" strokeWidth={2} />
                        <circle
                          cx={rx}
                          cy={34}
                          r={6.5}
                          fill="#050811"
                          stroke={item.rulerColor}
                          strokeWidth={3}
                        />
                        <circle cx={rx} cy={34} r={2.5} fill={item.rulerColor} />
                      </>
                    )}
                  </svg>
                </div>

                <div className="flex-1 py-3.5 pr-4 sm:pr-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 font-mono text-xs font-black tabular-nums"
                        style={{ color: item.rulerColor }}
                      >
                        <Crown className="w-3.5 h-3.5" />
                        {item.dateLabel}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-white">{r.ruler}</span>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                        ветка {r.reignPeriod}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">rulers #{commitHash}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!focusedEvent && (
                        <button
                          type="button"
                          onClick={() => onSelectYearRange(r.startYear, r.endYear)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap"
                          title="Отфильтровать таймлайн строго по годам этого правления"
                        >
                          Фокус: {r.startYear}–{r.endYear}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenPeriodModal(r.id)}
                        className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Все события при правителе →
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mt-1">{r.reignThesis}</p>

                  {ongoingWarsAtAccession.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-amber-200/90">
                      <span>Смена правителя в ходе идущих кампаний:</span>
                      {ongoingWarsAtAccession.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => onOpenCardModal(w.id)}
                          className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-white hover:border-amber-400 cursor-pointer"
                        >
                          {w.title} ({w.period})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (item.rowType === 'RULER_END') {
            const r = item.rulerObj;
            const rx = item.rulerIndex % 2 === 0 ? rulerRailAX : rulerRailBX;
            const mergeY = 22;

            return (
              <div
                key={`ruler-end-${r.id}-${idx}`}
                onClick={() => onOpenPeriodModal(r.id)}
                className="relative flex items-stretch bg-slate-950/55 hover:bg-slate-900/45 transition-colors cursor-pointer group"
              >
                <div className="shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                  <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                    {renderRailsForRow(item.sortKey, { skipRulerId: r.id })}

                    {hasRulersLane && (
                      <>
                        {/* Линия правления приходит сверху до mergeY и сливается обратно в timeSpineX */}
                        <line
                          x1={rx}
                          y1={0}
                          x2={rx}
                          y2={mergeY - 6}
                          stroke={item.rulerColor}
                          strokeWidth={3}
                          strokeOpacity={0.9}
                        />
                        <path
                          d={`M ${rx} ${mergeY - 6} C ${rx} ${mergeY + 6}, ${timeSpineX - 10} ${mergeY + 2}, ${timeSpineX} ${mergeY + 6}`}
                          fill="none"
                          stroke={item.rulerColor}
                          strokeWidth={2.4}
                          strokeOpacity={0.9}
                        />
                        <circle cx={timeSpineX} cy={mergeY + 6} r={4} fill="#050811" stroke="#cbd5e1" strokeWidth={2} />
                        <rect
                          x={rx - 4}
                          y={mergeY - 10}
                          width={8}
                          height={8}
                          rx={2}
                          fill="#050811"
                          stroke={item.rulerColor}
                          strokeWidth={2.2}
                        />
                      </>
                    )}
                  </svg>
                </div>

                <div className="flex-1 py-2 pr-3 sm:pr-6">
                  <div className="rounded-lg bg-slate-900/40 border border-slate-800/70 group-hover:border-slate-700 px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2 min-w-0 font-mono">
                      <GitMerge className="w-3.5 h-3.5 shrink-0" style={{ color: item.rulerColor }} />
                      <span className="font-bold tabular-nums" style={{ color: item.rulerColor }}>
                        {item.dateLabel}
                      </span>
                      <span className="text-slate-400">Слияние ветки правления:</span>
                      <span className="font-sans font-semibold text-slate-200 group-hover:text-white truncate">
                        {r.shortRuler} ({r.reignPeriod})
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 shrink-0 tabular-nums">
                      ~{Math.max(1, r.endYear - r.startYear)} л. у власти
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          if (item.rowType === 'EVENT_COMMIT') {
            const ev = item.eventObj;
            const branchObj = resolveEventBranch(ev, branches);
            const origBranchObj = branches.find((b) => b.id === ev.task) || branchObj;
            const thematicIdx = Math.max(0, thematicLanes.findIndex((l) => l.id === branchObj.id));
            const commitX = getThematicX(thematicIdx);
            const isCompact = cardDensity === 'compact';
            const commitY = isCompact ? 22 : 34;
            const commitHash = getGitHash(ev.id);
            const hasMultipleRulers = ev.overlappingRulers.length > 1;
            const rulerSegments = hasMultipleRulers ? getEventRulerSegments(ev) : [];
            const concurrentPreview = ev.concurrentEvents.slice(0, 3);
            const isAtomic = item.isAtomicInView;

            const isCrossLinked = hoveredEventId !== null && linkedEventIds.has(ev.id);
            const isOverlapping =
              hoveredEvent !== null &&
              hoveredEvent.id !== ev.id &&
              ev.startYear <= hoveredEvent.endYear &&
              ev.endYear >= hoveredEvent.startYear;
            const isSelfHovered = hoveredEventId === ev.id;
            const isFocusedTarget = focusedEvent?.id === ev.id;
            const isJumpHighlighted = highlightedJumpId === ev.id;

            let cardHighlightClass =
              'border-slate-800/90 group-hover:border-slate-600 bg-slate-900/75 group-hover:bg-slate-900';
            if (isJumpHighlighted) {
              cardHighlightClass = 'jump-target-highlighted';
            } else if (isFocusedTarget) {
              cardHighlightClass = 'border-emerald-400/80 bg-emerald-950/25 shadow-lg';
            } else if (isCrossLinked) {
              cardHighlightClass = 'crosslink-highlighted';
            } else if (isOverlapping || isSelfHovered) {
              cardHighlightClass = 'overlap-highlighted';
            }

            return (
              <div
                key={`commit-${ev.id}-${idx}`}
                id={`row-${ev.id}`}
                data-ruler-context={ev.overlappingRulers[0]?.id ?? ''}
                onClick={() => onOpenCardModal(ev.id)}
                onMouseEnter={() => onHoverEvent(ev.id)}
                onMouseLeave={() => onHoverEvent(null)}
                className="commit-row relative flex items-stretch hover:bg-slate-900/40 transition-colors cursor-pointer group"
              >
                <div className="shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                  <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                    {renderRailsForRow(item.sortKey, {
                      highlightThematicId: branchObj.id,
                      excludeEventIdFromThematic: isAtomic ? ev.id : undefined,
                    })}

                    {/* Для длительных процессов: ответвление (fork) от центральной оси времени к ветке события */}
                    {!isAtomic && !item.startedBeforeWindow && (
                      <>
                        <path
                          d={`M ${timeSpineX} 10 C ${timeSpineX + 12} 10, ${commitX} 16, ${commitX} ${commitY}`}
                          fill="none"
                          stroke={branchObj.color}
                          strokeWidth={2}
                          strokeOpacity={0.85}
                        />
                        <circle cx={timeSpineX} cy={10} r={3.5} fill="#050811" stroke="#cbd5e1" strokeWidth={2} />
                      </>
                    )}

                    {/* Для атомарных событий: точечный вынос прямо от оси времени к коммиту без fork-merge рельсы */}
                    {isAtomic && (
                      <>
                        <line
                          x1={timeSpineX + 4}
                          y1={commitY}
                          x2={commitX - 6}
                          y2={commitY}
                          stroke={branchObj.color}
                          strokeWidth={1.6}
                          strokeDasharray="2 2"
                          strokeOpacity={0.75}
                        />
                        <circle cx={timeSpineX} cy={commitY} r={3.2} fill="#cbd5e1" />
                      </>
                    )}

                    <line
                      x1={commitX + 7}
                      y1={commitY}
                      x2={svgWidth}
                      y2={commitY}
                      stroke={branchObj.color}
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      strokeOpacity={0.8}
                    />

                    {isAtomic ? (
                      <g className="commit-node-ring">
                        <polygon
                          points={`${commitX},${commitY - 7} ${commitX + 7},${commitY} ${commitX},${commitY + 7} ${commitX - 7},${commitY}`}
                          fill="#050811"
                          stroke={branchObj.color}
                          strokeWidth={2.5}
                        />
                        <circle cx={commitX} cy={commitY} r={2} fill={branchObj.color} />
                      </g>
                    ) : (
                      <>
                        <circle
                          className="commit-node-ring"
                          cx={commitX}
                          cy={commitY}
                          r={isCompact ? 7.5 : 9.5}
                          fill={branchObj.color}
                          fillOpacity={0.22}
                        />
                        <circle
                          cx={commitX}
                          cy={commitY}
                          r={isCompact ? 4.5 : 5.5}
                          fill="#050811"
                          stroke={branchObj.color}
                          strokeWidth={isCompact ? 2.5 : 3}
                        />
                        <circle cx={commitX} cy={commitY} r={isCompact ? 1.8 : 2.2} fill={branchObj.color} />
                      </>
                    )}
                  </svg>
                </div>

                {isCompact ? (
                  <div className="flex-1 py-1 pr-3 sm:pr-6">
                    <div
                      className={`rounded-lg border px-3 py-2 min-h-[38px] flex items-center justify-between gap-3 transition-all ${cardHighlightClass}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className="font-mono text-xs font-extrabold tabular-nums shrink-0"
                          style={{ color: branchObj.color }}
                        >
                          {axisResolution === 'year' ? ev.period : item.dateLabel}
                        </span>
                        <span aria-hidden="true" className="text-slate-600 shrink-0">
                          ·
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-200 truncate">
                          {ev.title}
                        </span>
                        <span className="hidden md:inline text-[11px] font-mono text-slate-400 shrink-0">
                          · {origBranchObj.short}
                        </span>
                        {isAtomic && (
                          <span className="hidden sm:inline text-[11px] font-mono text-slate-400 shrink-0">
                            · точка
                          </span>
                        )}
                        {hasMultipleRulers && (
                          <span className="hidden sm:inline text-[11px] font-mono text-amber-300 shrink-0 tabular-nums">
                            · {ev.overlappingRulers.length} правл.
                          </span>
                        )}
                        {ev.explicitLinks.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-300 shrink-0 tabular-nums">
                            · <Link2 className="w-3 h-3" /> {ev.explicitLinks.length}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-[11px] font-mono">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFocusEvent(ev.id);
                          }}
                          className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                            isFocusedTarget
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                              : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300'
                          }`}
                          title="Изолировать связи этого события"
                        >
                          {isFocusedTarget ? 'В фокусе' : 'Фокус'}
                        </button>
                        <span className="text-amber-400 font-semibold hidden sm:inline">git show →</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 py-2.5 pr-3 sm:pr-6">
                    <div className={`rounded-xl border p-3.5 sm:p-4 transition-all ${cardHighlightClass}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="font-mono text-xs font-extrabold tabular-nums"
                              style={{ color: branchObj.color }}
                            >
                              {axisResolution === 'year' ? ev.period : `${item.dateLabel} (${ev.period})`}
                            </span>
                            {isAtomic ? (
                              <>
                                <span aria-hidden="true" className="text-slate-600">
                                  ·
                                </span>
                                <span className="text-[11px] font-mono text-slate-400">
                                  атомарный коммит
                                </span>
                              </>
                            ) : (
                              item.startedBeforeWindow && (
                                <>
                                  <span aria-hidden="true" className="text-slate-600">
                                    ·
                                  </span>
                                  <span className="text-[11px] font-mono text-amber-300">
                                    идет с {ev.startYear} г.
                                  </span>
                                </>
                              )
                            )}
                            <span aria-hidden="true" className="text-slate-600">
                              ·
                            </span>
                            <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-200 transition-colors">
                              {ev.title}
                            </h4>
                          </div>

                          <p className="text-xs sm:text-sm text-slate-300 leading-snug">{ev.subtitle}</p>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 shrink-0 self-start">
                          <span style={{ color: origBranchObj.color }}>{origBranchObj.gitName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-500">#{commitHash}</span>
                        </div>
                      </div>

                      {hasMultipleRulers && rulerSegments.length > 1 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/50 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                            <span className="text-amber-300 font-semibold">
                              Смена правителей в ходе события ({ev.overlappingRulers.length}):
                            </span>
                            <span className="text-slate-500 hidden sm:inline tabular-nums">
                              {ev.startYear}–{ev.endYear} гг.
                            </span>
                          </div>

                          <div
                            className="h-2 rounded-full bg-slate-950 border border-slate-800/90 overflow-hidden flex gap-px"
                            role="group"
                            aria-label="Шкала смены правителей"
                          >
                            {rulerSegments.map((seg, segIdx) => (
                              <button
                                key={seg.ruler.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenPeriodModal(seg.ruler.id);
                                }}
                                style={{ width: `${Math.max(8, seg.pct)}%` }}
                                className={`h-full transition-colors cursor-pointer ${
                                  SEGMENT_TONES[segIdx % SEGMENT_TONES.length]
                                }`}
                                title={`${seg.ruler.ruler} (${seg.overlapStart}–${seg.overlapEnd} гг., ~${seg.years} л.). Нажмите для сводки правления.`}
                              />
                            ))}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-mono text-slate-300">
                            {rulerSegments.map((seg, segIdx) => (
                              <span key={seg.ruler.id} className="inline-flex items-center gap-1">
                                {segIdx > 0 && (
                                  <span aria-hidden="true" className="text-slate-600 mr-1">
                                    →
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenPeriodModal(seg.ruler.id);
                                  }}
                                  className="hover:text-amber-300 hover:underline cursor-pointer tabular-nums"
                                >
                                  {seg.ruler.shortRuler} ({seg.years} г.)
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {ev.explicitLinks.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/50 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-mono text-emerald-400 font-semibold mr-0.5 inline-flex items-center gap-1">
                            <Link2 className="w-3 h-3" />
                            Связи:
                          </span>
                          {ev.explicitLinks.map((lnk) => {
                            const target = lnk.targetEvent;
                            const targetBranch = branches.find((b) => b.id === target.task);
                            const isOutgoing = lnk.direction === 'outgoing';
                            return (
                              <button
                                key={lnk.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onJumpToEvent(target.id);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/45 hover:bg-emerald-900/60 border border-emerald-500/35 hover:border-emerald-400 text-[11px] font-mono text-emerald-100 transition-colors cursor-pointer text-left max-w-full"
                                title={`${lnk.label} — Нажмите для перехода к узлу в ленте`}
                              >
                                {isOutgoing ? (
                                  <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                                ) : (
                                  <ArrowLeft className="w-3 h-3 text-sky-400 shrink-0" />
                                )}
                                <span className="text-emerald-300 shrink-0">
                                  {isOutgoing ? 'Следствие:' : 'Причина:'}
                                </span>
                                <span className="truncate font-semibold text-white">{target.title}</span>
                                <span className="text-slate-400 tabular-nums shrink-0">({target.period})</span>
                                {targetBranch && (
                                  <span
                                    className="hidden sm:inline text-[10px] shrink-0"
                                    style={{ color: targetBranch.color }}
                                  >
                                    · {targetBranch.short}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono">
                          <span
                            className={`inline-flex items-center gap-1 ${
                              hasMultipleRulers ? 'text-amber-300 font-semibold' : 'text-slate-300'
                            }`}
                          >
                            <Crown className="w-3 h-3" />
                            {hasMultipleRulers ? `${ev.overlappingRulers.length} правл.: ` : ''}
                            {ev.ruler}
                          </span>

                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>

                          <span className="text-slate-500" title="Исходный модульный JSON-файл">
                            {ev.sourceFile}
                          </span>

                          {ev.explicitLinks.length > 0 && (
                            <>
                              <span aria-hidden="true" className="text-slate-600">
                                ·
                              </span>
                              <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                                <Link2 className="w-3 h-3" />
                                sync: {ev.explicitLinks.length}
                              </span>
                            </>
                          )}

                          {ev.concurrentEvents.length > 0 && (
                            <>
                              <span aria-hidden="true" className="text-slate-600">
                                ·
                              </span>
                              <span
                                className="text-sky-300"
                                title={`Параллельные события: ${ev.concurrentEvents.map((c) => c.title).join(', ')}`}
                              >
                                параллельно: {ev.concurrentEvents.length} (
                                {concurrentPreview.map((c) => c.title.slice(0, 16) + '…').join(', ')})
                              </span>
                            </>
                          )}

                          {ev.subEvents && ev.subEvents.length > 0 && (
                            <>
                              <span aria-hidden="true" className="text-slate-600">
                                ·
                              </span>
                              <span className="text-amber-300 font-semibold">
                                подветок: {ev.subEvents.length}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 font-mono">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFocusEvent(ev.id);
                            }}
                            className={`px-2 py-0.5 rounded border inline-flex items-center gap-1 transition-colors cursor-pointer ${
                              isFocusedTarget
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                                : 'bg-slate-950/70 border-slate-700/80 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300'
                            }`}
                            title="Изолировать событие, его sync-связи и параллельные события"
                          >
                            <Crosshair className="w-3 h-3" />
                            <span>{isFocusedTarget ? 'В фокусе ✓' : 'Фокус связей'}</span>
                          </button>

                          <span className="text-amber-400 font-semibold group-hover:underline inline-flex items-center gap-1">
                            <GitCommitHorizontal className="w-3.5 h-3.5" />
                            git show →
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // EVENT_END: точка завершения и обратное слияние (merge) длительного процесса с центральной осью времени
          const ev = item.eventObj;
          const branchObj = resolveEventBranch(ev, branches);
          const thematicIdx = Math.max(0, thematicLanes.findIndex((l) => l.id === branchObj.id));
          const commitX = getThematicX(thematicIdx);
          const mergeY = 22;

          return (
            <div
              key={`end-${ev.id}-${idx}`}
              onClick={() => onOpenCardModal(ev.id)}
              onMouseEnter={() => onHoverEvent(ev.id)}
              onMouseLeave={() => onHoverEvent(null)}
              className="relative flex items-stretch hover:bg-slate-900/40 transition-colors cursor-pointer group"
            >
              <div className="shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                  {renderRailsForRow(item.sortKey, { highlightThematicId: branchObj.id })}
                  <path
                    d={`M ${commitX} ${mergeY - 4} C ${commitX} ${mergeY + 10}, ${timeSpineX + 12} ${mergeY + 4}, ${timeSpineX} ${mergeY + 10}`}
                    fill="none"
                    stroke={branchObj.color}
                    strokeWidth={1.8}
                    strokeDasharray="3 2"
                    strokeOpacity={0.85}
                  />
                  <circle cx={timeSpineX} cy={mergeY + 10} r={3.5} fill="#050811" stroke="#cbd5e1" strokeWidth={2} />
                  <rect
                    x={commitX - 4.5}
                    y={mergeY - 8.5}
                    width={9}
                    height={9}
                    rx={2}
                    fill="#050811"
                    stroke={branchObj.color}
                    strokeWidth={2.5}
                  />
                </svg>
              </div>

              <div className="flex-1 py-2 pr-3 sm:pr-6">
                <div className="rounded-lg bg-slate-900/40 border border-slate-800/70 group-hover:border-slate-700 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <Flag className="w-3.5 h-3.5 shrink-0" style={{ color: branchObj.color }} />
                    <span className="font-mono font-bold tabular-nums" style={{ color: branchObj.color }}>
                      {item.dateLabel}
                    </span>
                    <span className="text-slate-400 font-mono">Слияние с осью:</span>
                    <span className="font-semibold text-slate-200 group-hover:text-white truncate">
                      {ev.title} ({ev.period})
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0 tabular-nums">
                    {ev.overlappingRulers.length > 1
                      ? `Сменилось правлений: ${ev.overlappingRulers.length}`
                      : ev.duration > 0
                        ? `Длительность: ${ev.duration} л.`
                        : 'Завершение процесса'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
