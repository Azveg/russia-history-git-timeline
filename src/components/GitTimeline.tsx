import { Crosshair, Crown, Flag, GitBranch, GitCommitHorizontal, GitMerge, HelpCircle, Link2, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  computeBranchSubLaneLayout,
  computeRulerSubLaneLayout,
  findMacroEraForYear,
  formatAxisGutterDate,
  formatEventTitleWithPeriod,
  getDirectChildBranches,
  hasChildBranches,
  isBiographyNode,
  isBranchOrDescendantActive,
  isMajorCampaignOrConflictNode,
  parsePreciseDate,
  resolveEventBranch,
  resolveMacroEra,
  resolveMacroEras,
} from '../engine/timelineEngine';
import type {
  AxisResolution,
  BranchDefinition,
  CardDensity,
  EnrichedEvent,
  FocusScope,
  ResolvedMacroEra,
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
  activeBranches: Record<string, boolean>;
  collapsedParents: Record<string, boolean>;
  manifest: SyncManifest;
  yearFrom: number;
  minYear?: number;
  axisResolution: AxisResolution;
  hoveredEventId: string | null;
  cardDensity: CardDensity;
  focusedEvent: EnrichedEvent | null;
  focusScope: FocusScope;
  onChangeFocusScope: (scope: FocusScope) => void;
  onToggleFocusEvent: (eventId: string) => void;
  onToggleCollapseParent: (parentId: string) => void;
  onExitFocusMode: () => void;
  highlightedJumpId: string | null;
  onJumpToEvent: (targetEventId: string) => void;
  onHoverEvent: (eventId: string | null) => void;
  onOpenCardModal: (eventId: string) => void;
  onOpenPeriodModal: (rulerId: string) => void;
  onOpenEraModal: (eraId: string) => void;
  onSelectYearRange: (from: number, to: number) => void;
}

interface HoveredCardTooltipState {
  ev: EnrichedEvent;
  branchLabel: string;
  branchColor: string;
  dateLabel: string;
  rect: { top: number; bottom: number; left: number; width: number };
}

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
  activeBranches,
  collapsedParents,
  manifest,
  yearFrom,
  minYear = 862,
  axisResolution,
  hoveredEventId,
  cardDensity,
  focusedEvent,
  focusScope,
  onChangeFocusScope,
  onToggleFocusEvent,
  onToggleCollapseParent,
  onExitFocusMode,
  highlightedJumpId,
  onJumpToEvent,
  onHoverEvent,
  onOpenCardModal,
  onOpenPeriodModal,
  onOpenEraModal,
  onSelectYearRange,
}: GitTimelineProps) {
  const streamContainerRef = useRef<HTMLDivElement | null>(null);
  const [activeStickyRulerId, setActiveStickyRulerId] = useState<string | null>(null);
  const [hoveredCardTooltip, setHoveredCardTooltip] = useState<HoveredCardTooltipState | null>(null);
  const [isGraphHelpOpen, setIsGraphHelpOpen] = useState(false);

  const defaultStickyRulerId = useMemo(() => {
    if (matchingRulers.length > 0) return matchingRulers[0].id;
    if (matchingEvents.length > 0 && matchingEvents[0].overlappingRulers.length > 0) {
      return matchingEvents[0].overlappingRulers[0].id;
    }
    return rulers[0]?.id ?? null;
  }, [matchingRulers, matchingEvents, rulers]);

  useEffect(() => {
    setActiveStickyRulerId(defaultStickyRulerId);
    setHoveredCardTooltip(null);
  }, [defaultStickyRulerId, stream.length, cardDensity]);

  useEffect(() => {
    if (!hoveredCardTooltip) return;
    const clearTooltip = () => setHoveredCardTooltip(null);
    window.addEventListener('scroll', clearTooltip, { passive: true });
    window.addEventListener('resize', clearTooltip, { passive: true });
    return () => {
      window.removeEventListener('scroll', clearTooltip);
      window.removeEventListener('resize', clearTooltip);
    };
  }, [hoveredCardTooltip]);

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

  const resolvedEras = useMemo(() => resolveMacroEras(manifest.macroEras), [manifest.macroEras]);

  const activeStickyEra: ResolvedMacroEra | null = useMemo(() => {
    if (!activeStickyRuler) return null;
    const byId = resolvedEras.find((e) => e.id === activeStickyRuler.eraId);
    if (byId) return byId;
    const midYear = Math.round((activeStickyRuler.startYear + activeStickyRuler.endYear) / 2);
    return findMacroEraForYear(midYear, resolvedEras) ?? null;
  }, [activeStickyRuler, resolvedEras]);

  const activeStickyRulerEventCount = useMemo(() => {
    if (!activeStickyRuler) return 0;
    return matchingEvents.filter((ev) => ev.overlappingRulers.some((r) => r.id === activeStickyRuler.id)).length;
  }, [activeStickyRuler, matchingEvents]);

  // Трёхзонная геометрия графа: [Правители (динамические рельсы)] | [Центральная ось времени] | [Тематические ветки]
  const hasRulersLane = visibleLanes.some((l) => l.id === 'MAIN_RULERS');
  const thematicLanes = useMemo(
    () => visibleLanes.filter((l) => l.id !== 'MAIN_RULERS' && l.id !== 'TIME_AXIS'),
    [visibleLanes],
  );

  const rulerLayout = useMemo(
    () => computeRulerSubLaneLayout(matchingRulers, hasRulersLane),
    [matchingRulers, hasRulersLane],
  );

  const timeSpineX = rulerLayout.timeSpineX;

  const subLaneLayout = useMemo(
    () =>
      computeBranchSubLaneLayout(
        matchingEvents,
        thematicLanes,
        branches,
        axisResolution,
        timeSpineX,
        { collapsedParents },
      ),
    [matchingEvents, thematicLanes, branches, axisResolution, timeSpineX, collapsedParents],
  );

  const svgWidth = subLaneLayout.totalSvgWidth;

  const eventStreamBounds = useMemo(() => {
    const byId = new Map<string, { commitIdx: number; endIdx: number; ev: EnrichedEvent }>();
    stream.forEach((row, rowIdx) => {
      if (row.rowType === 'EVENT_COMMIT' && !row.isAtomicInView) {
        byId.set(row.eventObj.id, {
          commitIdx: rowIdx,
          endIdx: Number.POSITIVE_INFINITY,
          ev: row.eventObj,
        });
      } else if (row.rowType === 'EVENT_END') {
        const entry = byId.get(row.eventObj.id);
        if (entry) {
          entry.endIdx = rowIdx;
        }
      }
    });
    return Array.from(byId.values());
  }, [stream]);

  const getEventX = (ev: EnrichedEvent, isAtomic = false) => {
    const branchObj = resolveEventBranch(ev, branches, collapsedParents);
    const laneInfo = subLaneLayout.branchLayouts.get(branchObj.id);
    const baseX = laneInfo?.baseX ?? timeSpineX + 28;
    if (isAtomic) return baseX;
    const slot = subLaneLayout.slotByEventId.get(ev.id) ?? 0;
    return laneInfo?.subXs[slot] ?? baseX + slot * 10;
  };

  const expandedCollapsibleParents = useMemo(
    () =>
      branches.filter((p) => {
        if (!hasChildBranches(p.id, branches) || collapsedParents[p.id]) return false;
        const activeChildren = getDirectChildBranches(p.id, branches).filter((child) =>
          isBranchOrDescendantActive(child, branches, activeBranches),
        );
        return activeChildren.length >= 2;
      }),
    [branches, activeBranches, collapsedParents],
  );

  const rulerSortBounds = useMemo(() => {
    const map = new Map<string, { startKey: number; endKey: number }>();
    matchingRulers.forEach((r) => {
      const startParts = parsePreciseDate(r.startDate, r.startYear, false);
      const endParts = parsePreciseDate(r.endDate, r.endYear, true);
      map.set(r.id, { startKey: startParts.sortKey, endKey: endParts.sortKey });
    });
    return map;
  }, [matchingRulers]);

  const alreadyRunningEvents = !focusedEvent
    ? matchingEvents.filter(
        (ev) => ev.startYear < yearFrom && isMajorCampaignOrConflictNode(ev, branches),
      )
    : [];

  const gutterWidthClass =
    axisResolution === 'day'
      ? 'w-[92px] sm:w-[104px]'
      : axisResolution === 'month'
        ? 'w-[74px] sm:w-[86px]'
        : 'w-[56px] sm:w-[68px]';

  const gutterMeta = useMemo(() => {
    let prevLabel = '';
    return stream.map((item) => {
      const info = formatAxisGutterDate(item, axisResolution);
      const isDuplicate = info.label === prevLabel && item.rowType !== 'ERA_START';
      prevLabel = info.label;
      return { ...info, isDuplicate };
    });
  }, [stream, axisResolution]);

  const hoveredEvent = hoveredEventId ? (matchingEvents.find((e) => e.id === hoveredEventId) ?? null) : null;
  const linkedEventIds = new Set<string>();
  if (hoveredEvent) {
    hoveredEvent.explicitLinks.forEach((lnk) => {
      linkedEventIds.add(lnk.targetEvent.id);
    });
  } else if (hoveredEventId) {
    (manifest.crossLinks || []).forEach((lnk) => {
      if (lnk.from === hoveredEventId) linkedEventIds.add(lnk.to);
      if (lnk.to === hoveredEventId) linkedEventIds.add(lnk.from);
    });
  }

  function renderRailsForRow(
    rowIdx: number,
    sortKey: number,
    options?: {
      skipRulerId?: string;
    },
  ) {
    return (
      <>
        {hasRulersLane && (
          <g>
            {rulerLayout.railXs.map((rx, slotIdx) => {
              const activeInSlot = matchingRulers.find((r) => {
                if (r.id === options?.skipRulerId) return false;
                if ((rulerLayout.slotByRulerId.get(r.id) ?? 0) !== slotIdx) return false;
                const b = rulerSortBounds.get(r.id);
                return b ? b.startKey <= sortKey && b.endKey >= sortKey : false;
              });

              if (activeInSlot) {
                const slotColor = rulerLayout.colorByRulerId.get(activeInSlot.id) ?? '#f59e0b';
                return (
                  <line
                    key={`ruler-rail-${slotIdx}`}
                    x1={rx}
                    y1={0}
                    x2={rx}
                    y2={420}
                    stroke={slotColor}
                    strokeWidth={3}
                    strokeOpacity={0.92}
                  />
                );
              }

              return (
                <line
                  key={`ruler-rail-${slotIdx}`}
                  x1={rx}
                  y1={0}
                  x2={rx}
                  y2={420}
                  stroke="#f59e0b"
                  strokeWidth={1.1}
                  strokeOpacity={0.14}
                  strokeDasharray="3 4"
                />
              );
            })}
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

        {/* Тематические ветки и их динамические под-нити справа от оси времени */}
        {thematicLanes.map((lane) => {
          const laneInfo = subLaneLayout.branchLayouts.get(lane.id);
          const baseX = laneInfo?.baseX ?? timeSpineX + 28;

          const passingEvents = eventStreamBounds.filter(
            (entry) =>
              resolveEventBranch(entry.ev, branches, collapsedParents).id === lane.id &&
              entry.commitIdx < rowIdx &&
              rowIdx < entry.endIdx,
          );

          const hasBasePassing = passingEvents.some(
            (entry) => (subLaneLayout.slotByEventId.get(entry.ev.id) ?? 0) === 0,
          );

          return (
            <g key={lane.id}>
              {!hasBasePassing && (
                <line
                  x1={baseX}
                  y1={0}
                  x2={baseX}
                  y2={420}
                  stroke={lane.color}
                  strokeWidth={1.3}
                  strokeOpacity={0.22}
                  strokeDasharray="4 4"
                />
              )}

              {passingEvents.map((entry) => {
                const slot = subLaneLayout.slotByEventId.get(entry.ev.id) ?? 0;
                const x = laneInfo?.subXs[slot] ?? baseX + slot * 10;
                const isSelfHovered = hoveredEventId === entry.ev.id;
                const isLinkedHovered = hoveredEventId !== null && linkedEventIds.has(entry.ev.id);
                const isDimmed = hoveredEventId !== null && !isSelfHovered && !isLinkedHovered;

                return (
                  <g key={`rail-${entry.ev.id}`}>
                    {(isSelfHovered || isLinkedHovered) && (
                      <line
                        x1={x}
                        y1={0}
                        x2={x}
                        y2={420}
                        stroke={isLinkedHovered && !isSelfHovered ? '#34d399' : lane.color}
                        strokeWidth={6.5}
                        strokeOpacity={0.28}
                      />
                    )}
                    <line
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={420}
                      stroke={isLinkedHovered && !isSelfHovered ? '#34d399' : lane.color}
                      strokeWidth={isSelfHovered ? 3.6 : isLinkedHovered ? 3.2 : 2.6}
                      strokeOpacity={isSelfHovered || isLinkedHovered ? 1 : isDimmed ? 0.42 : 0.9}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </>
    );
  }

  return (
    <div className="min-w-0 w-full">
      <div className="sticky top-[45px] z-20 bg-[#050811]/95 backdrop-blur-md border border-slate-800/90 rounded-t-2xl shadow-md overflow-hidden">
        <div className="px-3 sm:px-5 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0">
            {visibleLanes.map((lane) => {
              const isTimeAxis = lane.id === 'TIME_AXIS';
              const subCount =
                lane.id === 'MAIN_RULERS'
                  ? rulerLayout.laneCount
                  : (subLaneLayout.branchLayouts.get(lane.id)?.subLaneCount ?? 1);
              const isCollapsedParentLane =
                hasChildBranches(lane.id, branches) && Boolean(collapsedParents[lane.id]);

              if (isCollapsedParentLane) {
                const activeChildCount = getDirectChildBranches(lane.id, branches).filter((child) =>
                  isBranchOrDescendantActive(child, branches, activeBranches),
                ).length;

                return (
                  <button
                    key={lane.id}
                    type="button"
                    onClick={() => onToggleCollapseParent(lane.id)}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/50 text-[10px] font-mono text-amber-100 shrink-0 cursor-pointer transition-colors"
                    title={`${lane.label}: свёрнуто веток (${activeChildCount}). Нажмите, чтобы развернуть в отдельные линии.`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lane.color }} />
                    <span className="font-semibold">{lane.label}</span>
                    {subCount > 1 && (
                      <span className="text-amber-300 font-bold tabular-nums">×{subCount}</span>
                    )}
                    <GitBranch className="w-3 h-3 text-amber-300 ml-0.5" />
                    <span className="text-amber-300 font-bold">Развернуть ({activeChildCount})</span>
                  </button>
                );
              }

              return (
                <div
                  key={lane.id}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-mono shrink-0 ${
                    isTimeAxis
                      ? 'bg-slate-800/90 border-slate-600 text-white font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                  title={
                    subCount > 1
                      ? `${lane.label}: до ${subCount} параллельных линий в окне`
                      : lane.label
                  }
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lane.color }} />
                  <span>{lane.label}</span>
                  {subCount > 1 && (
                    <span className="text-amber-300 font-bold tabular-nums">×{subCount}</span>
                  )}
                </div>
              );
            })}

            {expandedCollapsibleParents.map((parent) => {
              const activeChildCount = getDirectChildBranches(parent.id, branches).filter((child) =>
                isBranchOrDescendantActive(child, branches, activeBranches),
              ).length;
              return (
                <button
                  key={`collapse-${parent.id}`}
                  type="button"
                  onClick={() => onToggleCollapseParent(parent.id)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 hover:border-amber-400/50 text-[10px] font-mono text-slate-300 hover:text-amber-200 shrink-0 cursor-pointer transition-colors whitespace-nowrap"
                  title={`Свернуть ${activeChildCount} веток группы «${parent.label}» в одну линию`}
                >
                  <GitMerge className="w-3 h-3 text-amber-400" />
                  <span>Свернуть «{parent.label}» ({activeChildCount} → 1)</span>
                </button>
              );
            })}
          </div>

          <div className="relative flex items-center gap-2 shrink-0 text-[11px] font-mono text-slate-400">
            <span className="hidden md:inline text-slate-300">
              Масштаб оси: <strong className="text-sky-300 font-semibold">{RESOLUTION_LABELS[axisResolution]}</strong>
            </span>
            <span aria-hidden="true" className="hidden md:inline text-slate-600">
              ·
            </span>
            <span className="hidden sm:inline text-amber-300/90 font-semibold">Клик — паспорт события</span>
            <button
              type="button"
              onClick={() => setIsGraphHelpOpen((prev) => !prev)}
              className={`px-2 py-0.5 rounded-md border text-[10px] font-mono inline-flex items-center gap-1 transition-colors cursor-pointer ${
                isGraphHelpOpen
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 font-bold'
                  : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:border-slate-500 hover:text-white'
              }`}
              title="Памятка: как читать линии, узлы и связи графа"
            >
              <HelpCircle className="w-3 h-3 text-amber-400" />
              <span>Как читать граф</span>
            </button>

            {isGraphHelpOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#090e1c] border border-slate-700/90 rounded-2xl shadow-2xl p-3.5 z-50 text-left space-y-2.5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white">Обозначения на хронографе</span>
                  <button
                    type="button"
                    onClick={() => setIsGraphHelpOpen(false)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                    aria-label="Закрыть памятку"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-[11px] font-sans text-slate-300 space-y-2 leading-snug">
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-1 bg-slate-300 rounded shrink-0" />
                    <span>
                      <strong className="text-white">Ось времени (центр)</strong> — главный хронологический ствол (годы → месяцы → дни).
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-1 bg-amber-400 rounded shrink-0" />
                    <span>
                      <strong className="text-white">Сплошная линия</strong> — длительность правления или исторического процесса (параллельные центры власти и одновременные войны идут по соседним нитям).
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rotate-45 border-2 border-sky-400 bg-slate-950 shrink-0 ml-0.5 mr-1" />
                    <span>
                      <strong className="text-white">Ромб на ветке</strong> — точечное историческое событие, публикация книги, открытие или биография.
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-2 rounded border border-emerald-400 bg-emerald-950/60 shrink-0" />
                    <span>
                      <strong className="text-emerald-300">Изумрудный контур</strong> — причинно-следственная или культурная связь при наведении.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {activeStickyRuler && (
          <div className="px-3 sm:px-5 py-1.5 border-t border-slate-800/80 bg-slate-950/90 flex items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex items-center gap-2 min-w-0 truncate">
              {activeStickyEra && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenEraModal(activeStickyEra.id)}
                    title={`Открыть карточку периода «${activeStickyEra.displayShortTitle}» (${activeStickyEra.period})`}
                    className="text-amber-400 hover:text-amber-200 underline decoration-amber-400/40 underline-offset-2 font-bold shrink-0 cursor-pointer truncate max-w-[200px]"
                  >
                    {activeStickyEra.displayShortTitle}
                  </button>
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
        className="border-x border-b border-slate-800/90 rounded-b-2xl bg-slate-950/40 divide-y divide-slate-800/50 overflow-hidden"
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

        {yearFrom > minYear && alreadyRunningEvents.length > 0 && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-semibold text-amber-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Военные кампании и конфликты, начавшиеся до {yearFrom} г. и продолжающиеся в окне:
            </span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-amber-100">
              {alreadyRunningEvents.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onOpenCardModal(e.id)}
                  className="underline decoration-amber-400/50 hover:text-white cursor-pointer text-left"
                >
                  {formatEventTitleWithPeriod(e)}
                </button>
              ))}
            </div>
          </div>
        )}

        {stream.map((item, idx) => {
          const gutter = gutterMeta[idx];

          if (item.rowType === 'ERA_START') {
            const resolvedEra = resolveMacroEra(item.era);
            const carryOverWars = matchingEvents.filter(
              (ev) =>
                ev.startYear < item.year &&
                ev.endYear > item.year &&
                isMajorCampaignOrConflictNode(ev, branches),
            );

            return (
              <div
                key={`era-${resolvedEra.id}`}
                className="relative flex items-stretch bg-gradient-to-r from-slate-900/95 via-slate-900/70 to-slate-950 border-y border-amber-500/30"
              >
                <div
                  title={gutter.title}
                  className={`${gutterWidthClass} shrink-0 border-r border-slate-800/70 bg-slate-950/60 px-2 sm:px-2.5 pt-[27px] pb-2 flex items-start justify-end font-mono text-[11px] font-bold text-amber-300 tabular-nums whitespace-nowrap select-none`}
                >
                  {gutter.label}
                </div>

                <div className="shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                  <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                    {renderRailsForRow(idx, item.sortKey)}
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

                <div className="flex-1 min-w-0 overflow-hidden py-4 pr-4 sm:pr-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black tabular-nums">
                        {resolvedEra.displayShortTitle} · {resolvedEra.period}
                      </span>
                      <span className="text-slate-400">Макро-период на оси времени</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenEraModal(resolvedEra.id)}
                      className="px-2.5 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                    >
                      Карточка периода →
                    </button>
                  </div>
                  <h2 className="font-serif text-lg sm:text-2xl font-bold tracking-tight text-white mt-1.5 [text-wrap:balance]">
                    {resolvedEra.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">{resolvedEra.thesis}</p>
                  {carryOverWars.length > 0 && (
                    <div className="mt-2 text-[11px] font-mono text-sky-300">
                      Военные кампании, переходящие через рубеж периода:{' '}
                      {carryOverWars.map((w) => formatEventTitleWithPeriod(w)).join(', ')}
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
                <div
                  title={gutter.title}
                  className={`${gutterWidthClass} shrink-0 border-r border-slate-800/50 bg-slate-950/40 px-2 sm:px-2.5 py-1 flex items-center justify-end font-mono text-[10px] tabular-nums whitespace-nowrap select-none ${
                    gutter.isDuplicate ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  {gutter.label}
                </div>

                <div className="shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                  <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                    {renderRailsForRow(idx, item.sortKey)}
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

                <div className="flex-1 min-w-0 overflow-hidden py-1 pr-4 sm:pr-6 flex items-center gap-2 text-[11px] font-mono text-slate-400">
                  <span className="font-bold text-slate-300 tabular-nums">{item.label}</span>
                  <span aria-hidden="true" className="text-slate-700">
                    ·
                  </span>
                  <span className="text-slate-500">хронологический рубеж</span>
                </div>
              </div>
            );
          }

          if (item.rowType === 'RULER_COMMIT') {
            const r = item.rulerObj;
            const rSlot = rulerLayout.slotByRulerId.get(r.id) ?? 0;
            const rx = rulerLayout.railXs[rSlot] ?? 16;
            const rColor = rulerLayout.colorByRulerId.get(r.id) ?? item.rulerColor;
            const ongoingWarsAtAccession = matchingEvents.filter(
              (ev) =>
                ev.startYear < r.startYear &&
                ev.endYear > r.startYear &&
                isMajorCampaignOrConflictNode(ev, branches),
            );

            const isJumpedRuler = highlightedJumpId === r.id;

            return (
              <div
                key={`ruler-${r.id}`}
                id={r.id}
                data-ruler-context={r.id}
                className={`relative flex items-stretch transition-colors group ${
                  isJumpedRuler
                    ? 'bg-amber-500/20 ring-2 ring-inset ring-amber-400'
                    : 'bg-slate-900/70 hover:bg-slate-900/95'
                }`}
              >
                <div
                  title={gutter.title}
                  className={`${gutterWidthClass} shrink-0 border-r border-slate-800/60 bg-slate-950/40 px-2 sm:px-2.5 pt-[24px] pb-2 flex items-start justify-end font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap select-none transition-colors ${
                    gutter.isDuplicate
                      ? 'text-amber-300/45 group-hover:text-amber-200'
                      : 'text-amber-200 group-hover:text-amber-100'
                  }`}
                >
                  {gutter.label}
                </div>

                <div className="shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                  <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                    {renderRailsForRow(idx, item.sortKey, { skipRulerId: r.id })}

                    {hasRulersLane && (
                      <>
                        {/* Ветка правления: ответвление (branch) от центральной оси времени влево к rx и продолжение вниз */}
                        {!item.startedBeforeWindow && (
                          <path
                            d={`M ${timeSpineX} 16 C ${timeSpineX - 10} 18, ${rx} 20, ${rx} 36`}
                            fill="none"
                            stroke={rColor}
                            strokeWidth={2.6}
                            strokeOpacity={0.95}
                          />
                        )}
                        <line
                          x1={rx}
                          y1={item.startedBeforeWindow ? 0 : 34}
                          x2={rx}
                          y2={420}
                          stroke={rColor}
                          strokeWidth={3}
                          strokeOpacity={0.95}
                        />
                        <line
                          x1={timeSpineX + 6}
                          y1={28}
                          x2={svgWidth}
                          y2={28}
                          stroke={rColor}
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
                          stroke={rColor}
                          strokeWidth={3}
                        />
                        <circle cx={rx} cy={34} r={2.5} fill={rColor} />
                      </>
                    )}
                  </svg>
                </div>

                <div className="flex-1 min-w-0 overflow-hidden py-3.5 pr-4 sm:pr-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span
                        className="inline-flex items-center gap-1.5 font-mono text-xs font-black tabular-nums shrink-0"
                        style={{ color: rColor }}
                      >
                        <Crown className="w-3.5 h-3.5" />
                        {item.dateLabel}
                      </span>
                      {r.center && (
                        <span
                          className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-700/80 text-[10px] font-mono font-semibold shrink-0"
                          style={{ color: rColor }}
                        >
                          {r.center}
                        </span>
                      )}
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className="font-serif text-base sm:text-lg font-bold text-white tracking-tight">
                        {r.ruler}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                        правление {r.reignPeriod}
                      </span>
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
                      <span>Смена правителя в ходе военных кампаний:</span>
                      {ongoingWarsAtAccession.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => onOpenCardModal(w.id)}
                          className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-white hover:border-amber-400 cursor-pointer"
                        >
                          {formatEventTitleWithPeriod(w)}
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
            const rSlot = rulerLayout.slotByRulerId.get(r.id) ?? 0;
            const rx = rulerLayout.railXs[rSlot] ?? 16;
            const rColor = rulerLayout.colorByRulerId.get(r.id) ?? item.rulerColor;
            const mergeY = 22;

            return (
              <div
                key={`ruler-end-${r.id}-${idx}`}
                onClick={() => onOpenPeriodModal(r.id)}
                className="relative flex items-stretch bg-slate-950/55 hover:bg-slate-900/45 transition-colors cursor-pointer group"
              >
                <div
                  title={gutter.title}
                  className={`${gutterWidthClass} shrink-0 border-r border-slate-800/50 bg-slate-950/30 px-2 sm:px-2.5 py-2 flex items-center justify-end gap-1 font-mono text-[10px] tabular-nums whitespace-nowrap select-none transition-colors ${
                    gutter.isDuplicate
                      ? 'text-slate-600 group-hover:text-slate-300'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  <span aria-hidden="true" className="text-[9px] text-slate-600 group-hover:text-slate-400">
                    ↵
                  </span>
                  <span>{gutter.label}</span>
                </div>

                <div className="shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                  <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                    {renderRailsForRow(idx, item.sortKey, { skipRulerId: r.id })}

                    {hasRulersLane && (
                      <>
                        {/* Линия правления приходит сверху до mergeY и сливается обратно в timeSpineX */}
                        <line
                          x1={rx}
                          y1={0}
                          x2={rx}
                          y2={mergeY - 6}
                          stroke={rColor}
                          strokeWidth={3}
                          strokeOpacity={0.9}
                        />
                        <path
                          d={`M ${rx} ${mergeY - 6} C ${rx} ${mergeY + 6}, ${timeSpineX - 10} ${mergeY + 2}, ${timeSpineX} ${mergeY + 6}`}
                          fill="none"
                          stroke={rColor}
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
                          stroke={rColor}
                          strokeWidth={2.2}
                        />
                      </>
                    )}
                  </svg>
                </div>

                <div className="flex-1 min-w-0 overflow-hidden py-2 pr-3 sm:pr-6">
                  <div className="w-full max-w-[760px] min-w-0 overflow-hidden rounded-lg bg-slate-900/40 border border-slate-800/70 group-hover:border-slate-700 px-3.5 h-[36px] flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden font-mono">
                      <GitMerge className="w-3.5 h-3.5 shrink-0" style={{ color: rColor }} />
                      <span className="font-bold tabular-nums shrink-0" style={{ color: rColor }}>
                        {item.dateLabel}
                      </span>
                      {r.center && (
                        <span
                          className="hidden md:inline px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[10px] shrink-0"
                          style={{ color: rColor }}
                        >
                          {r.center}
                        </span>
                      )}
                      <span className="text-slate-400 shrink-0 hidden sm:inline">Завершение правления:</span>
                      <span className="font-sans font-semibold text-slate-200 group-hover:text-white truncate min-w-0">
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
            const branchObj = resolveEventBranch(ev, branches, collapsedParents);
            const origBranchObj = branches.find((b) => b.id === ev.task) || branchObj;
            const isAtomic = item.isAtomicInView;
            const laneInfo = subLaneLayout.branchLayouts.get(branchObj.id);
            const baseX = laneInfo?.baseX ?? timeSpineX + 28;
            const slot = isAtomic ? 0 : (subLaneLayout.slotByEventId.get(ev.id) ?? 0);
            const commitX = getEventX(ev, isAtomic);
            const hasBasePassingAtRow =
              slot > 0 &&
              eventStreamBounds.some(
                (entry) =>
                  entry.ev.id !== ev.id &&
                  resolveEventBranch(entry.ev, branches, collapsedParents).id === branchObj.id &&
                  (subLaneLayout.slotByEventId.get(entry.ev.id) ?? 0) === 0 &&
                  entry.commitIdx < idx &&
                  idx < entry.endIdx,
              );
            const forkOriginX = hasBasePassingAtRow ? baseX : timeSpineX;
            const isCompact = cardDensity === 'compact';
            const commitY = isCompact ? 22 : 34;
            const hasMultipleRulers = ev.overlappingRulers.length > 1;
            const dateSummary = axisResolution === 'year' ? ev.period : `${item.dateLabel} (${ev.period})`;

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

            const openCardTooltip = (el: HTMLElement) => {
              const rect = el.getBoundingClientRect();
              setHoveredCardTooltip({
                ev,
                branchLabel: origBranchObj.label,
                branchColor: origBranchObj.color,
                dateLabel: dateSummary,
                rect: {
                  top: rect.top,
                  bottom: rect.bottom,
                  left: rect.left,
                  width: rect.width,
                },
              });
            };

            return (
              <div
                key={`commit-${ev.id}-${idx}`}
                id={`row-${ev.id}`}
                data-ruler-context={ev.overlappingRulers[0]?.id ?? ''}
                onClick={() => {
                  setHoveredCardTooltip(null);
                  onOpenCardModal(ev.id);
                }}
                onMouseEnter={() => onHoverEvent(ev.id)}
                onMouseLeave={() => {
                  onHoverEvent(null);
                  setHoveredCardTooltip(null);
                }}
                className="commit-row relative flex items-stretch hover:bg-slate-900/40 transition-colors cursor-pointer group"
              >
                <div
                  title={gutter.title}
                  className={`${gutterWidthClass} shrink-0 border-r border-slate-800/60 bg-slate-950/35 px-2 sm:px-2.5 ${
                    isCompact ? 'py-1 flex items-center' : 'pt-[25px] pb-2 flex items-start'
                  } justify-end font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap select-none transition-colors ${
                    isSelfHovered || isFocusedTarget
                      ? 'text-white'
                      : gutter.isDuplicate
                        ? 'text-slate-500 group-hover:text-slate-200'
                        : 'text-slate-200 group-hover:text-white'
                  }`}
                >
                  {gutter.label}
                </div>

                <div className="shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                  <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                    {renderRailsForRow(idx, item.sortKey)}

                    {/* Длительный процесс: собственная нить от commitY (или сверху, если начался до окна) + кривая ответвления */}
                    {!isAtomic && (
                      <>
                        {!item.startedBeforeWindow ? (
                          <>
                            <path
                              d={`M ${forkOriginX} 10 C ${forkOriginX + 10} 10, ${commitX} 16, ${commitX} ${commitY}`}
                              fill="none"
                              stroke={branchObj.color}
                              strokeWidth={isSelfHovered ? 3 : 2}
                              strokeOpacity={0.9}
                            />
                            <circle
                              cx={forkOriginX}
                              cy={10}
                              r={3.2}
                              fill="#050811"
                              stroke={hasBasePassingAtRow ? branchObj.color : '#cbd5e1'}
                              strokeWidth={2}
                            />
                          </>
                        ) : (
                          <line
                            x1={commitX}
                            y1={0}
                            x2={commitX}
                            y2={commitY}
                            stroke={branchObj.color}
                            strokeWidth={isSelfHovered ? 3.6 : 2.6}
                            strokeOpacity={0.92}
                          />
                        )}
                        <line
                          x1={commitX}
                          y1={commitY}
                          x2={commitX}
                          y2={420}
                          stroke={branchObj.color}
                          strokeWidth={isSelfHovered ? 3.6 : 2.6}
                          strokeOpacity={isSelfHovered ? 1 : 0.92}
                        />
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
                  <div className="flex-1 min-w-0 overflow-hidden py-1 pr-3 sm:pr-6">
                    <div
                      onMouseEnter={(e) => openCardTooltip(e.currentTarget)}
                      onMouseLeave={() => setHoveredCardTooltip(null)}
                      className={`w-full max-w-[760px] min-w-0 overflow-hidden rounded-lg border px-3 h-[38px] flex items-center justify-between gap-2.5 transition-all ${cardHighlightClass}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                        <span
                          className="font-mono text-xs font-extrabold tabular-nums shrink-0"
                          style={{ color: branchObj.color }}
                        >
                          {axisResolution === 'year' ? ev.period : item.dateLabel}
                        </span>
                        <span aria-hidden="true" className="text-slate-600 shrink-0">
                          ·
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-200 truncate min-w-0">
                          {ev.title}
                        </span>
                        <span className="hidden md:inline text-[11px] font-mono text-slate-400 shrink-0 truncate max-w-[150px]">
                          · {origBranchObj.label}
                        </span>
                        {hasMultipleRulers && !isBiographyNode(ev, branches) && (
                          <span className="hidden lg:inline text-[11px] font-mono text-amber-300 shrink-0 tabular-nums">
                            · {ev.overlappingRulers.length} правл.
                          </span>
                        )}
                        {ev.explicitLinks.length > 0 && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-emerald-300 shrink-0 tabular-nums">
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
                          className={`px-2 py-0.5 rounded border transition-colors cursor-pointer whitespace-nowrap ${
                            isFocusedTarget
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                              : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300'
                          }`}
                          title="Изолировать связи этого события"
                        >
                          {isFocusedTarget ? 'В фокусе' : 'Фокус'}
                        </button>
                        <span className="text-amber-400 font-semibold hidden sm:inline whitespace-nowrap">
                          Паспорт →
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0 overflow-hidden py-2 pr-3 sm:pr-6">
                    <div
                      onMouseEnter={(e) => openCardTooltip(e.currentTarget)}
                      onMouseLeave={() => setHoveredCardTooltip(null)}
                      className={`w-full max-w-[760px] min-w-0 overflow-hidden rounded-xl border px-3.5 py-2.5 transition-all flex flex-col justify-between gap-2 ${cardHighlightClass}`}
                    >
                      <div className="flex items-center justify-between gap-2.5 min-w-0 h-5">
                        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                          <span
                            className="font-mono text-xs font-extrabold tabular-nums shrink-0"
                            style={{ color: branchObj.color }}
                          >
                            {axisResolution === 'year' ? ev.period : item.dateLabel}
                          </span>
                          <span aria-hidden="true" className="text-slate-600 shrink-0">
                            ·
                          </span>
                          <h4 className="text-sm sm:text-[15px] font-bold text-white group-hover:text-amber-200 transition-colors truncate min-w-0">
                            {ev.title}
                          </h4>
                          {!isAtomic && item.startedBeforeWindow && (
                            <span className="hidden lg:inline text-[10px] font-mono text-amber-300 shrink-0 whitespace-nowrap">
                              · с {ev.startYear} г.
                            </span>
                          )}
                        </div>

                        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 shrink-0 whitespace-nowrap">
                          <span className="max-w-[190px] truncate font-semibold" style={{ color: origBranchObj.color }}>
                            {origBranchObj.label}
                          </span>
                          {ev.region && (
                            <>
                              <span aria-hidden="true" className="text-slate-600">
                                ·
                              </span>
                              <span className="text-slate-400 max-w-[140px] truncate">{ev.region}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-[18px] h-[36px] overflow-hidden line-clamp-2">
                        {ev.subtitle}
                      </p>

                      <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between gap-2 text-[11px] text-slate-400 min-w-0 h-[26px]">
                        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden font-mono whitespace-nowrap">
                          {ev.ruler && (
                            <span
                              className={`inline-flex items-center gap-1 min-w-0 truncate ${
                                hasMultipleRulers && !isBiographyNode(ev, branches)
                                  ? 'text-amber-300 font-semibold'
                                  : 'text-slate-300'
                              }`}
                            >
                              <Crown className="w-3 h-3 shrink-0" />
                              <span className="truncate">
                                {isBiographyNode(ev, branches)
                                  ? `Эпоха: ${ev.overlappingRulers[0]?.shortRuler}${
                                      ev.overlappingRulers.length > 1
                                        ? ` — ${ev.overlappingRulers[ev.overlappingRulers.length - 1]?.shortRuler}`
                                        : ''
                                    }`
                                  : hasMultipleRulers
                                    ? `${ev.overlappingRulers.length} правл.`
                                    : ev.ruler}
                              </span>
                            </span>
                          )}

                          {ev.explicitLinks.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold shrink-0 tabular-nums">
                              <Link2 className="w-3 h-3 shrink-0" />
                              <span>{ev.explicitLinks.length}</span>
                            </span>
                          )}

                          {ev.concurrentEvents.length > 0 && (
                            <span className="hidden md:inline text-sky-300 shrink-0 tabular-nums">
                              ∥ {ev.concurrentEvents.length}
                            </span>
                          )}

                          {ev.subEvents && ev.subEvents.length > 0 && (
                            <span className="hidden md:inline text-amber-300 font-semibold shrink-0 tabular-nums">
                              ↳ {ev.subEvents.length}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 font-mono whitespace-nowrap">
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
                            <span>{isFocusedTarget ? 'В фокусе' : 'Фокус'}</span>
                          </button>

                          <span className="text-amber-400 font-semibold group-hover:underline inline-flex items-center gap-1">
                            <GitCommitHorizontal className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Паспорт →</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // EVENT_END: точка завершения и обратное слияние (merge) под-нити обратно в ветку или ось времени
          const ev = item.eventObj;
          const branchObj = resolveEventBranch(ev, branches, collapsedParents);
          const laneInfo = subLaneLayout.branchLayouts.get(branchObj.id);
          const baseX = laneInfo?.baseX ?? timeSpineX + 28;
          const slot = subLaneLayout.slotByEventId.get(ev.id) ?? 0;
          const commitX = getEventX(ev, false);
          const hasBaseContinuingAfter =
            slot > 0 &&
            eventStreamBounds.some(
              (entry) =>
                entry.ev.id !== ev.id &&
                resolveEventBranch(entry.ev, branches, collapsedParents).id === branchObj.id &&
                (subLaneLayout.slotByEventId.get(entry.ev.id) ?? 0) === 0 &&
                entry.commitIdx < idx &&
                idx < entry.endIdx,
            );
          const mergeTargetX = hasBaseContinuingAfter ? baseX : timeSpineX;
          const isEndSelfHovered = hoveredEventId === ev.id;
          const mergeY = 22;

          return (
            <div
              key={`end-${ev.id}-${idx}`}
              onClick={() => onOpenCardModal(ev.id)}
              onMouseEnter={() => onHoverEvent(ev.id)}
              onMouseLeave={() => onHoverEvent(null)}
              className="relative flex items-stretch hover:bg-slate-900/40 transition-colors cursor-pointer group"
            >
              <div
                title={gutter.title}
                className={`${gutterWidthClass} shrink-0 border-r border-slate-800/50 bg-slate-950/25 px-2 sm:px-2.5 py-2 flex items-center justify-end gap-1 font-mono text-[10px] tabular-nums whitespace-nowrap select-none transition-colors ${
                  isEndSelfHovered
                    ? 'text-slate-100'
                    : gutter.isDuplicate
                      ? 'text-slate-600 group-hover:text-slate-300'
                      : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <span aria-hidden="true" className="text-[9px] text-slate-600 group-hover:text-slate-400">
                  ↵
                </span>
                <span>{gutter.label}</span>
              </div>

              <div className="shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                  {renderRailsForRow(idx, item.sortKey)}
                  <line
                    x1={commitX}
                    y1={0}
                    x2={commitX}
                    y2={mergeY - 4}
                    stroke={branchObj.color}
                    strokeWidth={isEndSelfHovered ? 3.6 : 2.6}
                    strokeOpacity={isEndSelfHovered ? 1 : 0.92}
                  />
                  <path
                    d={`M ${commitX} ${mergeY - 4} C ${commitX} ${mergeY + 10}, ${mergeTargetX + 12} ${mergeY + 4}, ${mergeTargetX} ${mergeY + 10}`}
                    fill="none"
                    stroke={branchObj.color}
                    strokeWidth={isEndSelfHovered ? 2.6 : 1.9}
                    strokeDasharray="3 2"
                    strokeOpacity={0.9}
                  />
                  <circle
                    cx={mergeTargetX}
                    cy={mergeY + 10}
                    r={3.2}
                    fill="#050811"
                    stroke={hasBaseContinuingAfter ? branchObj.color : '#cbd5e1'}
                    strokeWidth={2}
                  />
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

              <div className="flex-1 min-w-0 overflow-hidden py-2 pr-3 sm:pr-6">
                <div className="w-full max-w-[760px] min-w-0 overflow-hidden rounded-lg bg-slate-900/40 border border-slate-800/70 group-hover:border-slate-700 px-3.5 h-[36px] flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    <Flag className="w-3.5 h-3.5 shrink-0" style={{ color: branchObj.color }} />
                    <span className="font-mono font-bold tabular-nums shrink-0" style={{ color: branchObj.color }}>
                      {item.dateLabel}
                    </span>
                    <span className="text-slate-400 font-mono shrink-0 hidden sm:inline">
                      {branchObj.isMilitary || ev.task.startsWith('WAR_')
                        ? 'Окончание кампании:'
                        : 'Завершение процесса:'}
                    </span>
                    <span className="font-semibold text-slate-200 group-hover:text-white truncate min-w-0">
                      {formatEventTitleWithPeriod(ev)}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0 tabular-nums whitespace-nowrap hidden sm:inline">
                    {ev.overlappingRulers.length > 1
                      ? `Правлений: ${ev.overlappingRulers.length}`
                      : ev.duration > 0
                        ? `${ev.duration} л.`
                        : 'Завершение'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hoveredCardTooltip && (
        <div
          role="tooltip"
          style={{
            left: Math.max(
              12,
              Math.min(
                hoveredCardTooltip.rect.left,
                (typeof window !== 'undefined' ? window.innerWidth : 1280) -
                  Math.min(440, (typeof window !== 'undefined' ? window.innerWidth : 1280) - 24) -
                  12,
              ),
            ),
            width: Math.min(440, (typeof window !== 'undefined' ? window.innerWidth : 1280) - 24),
            ...(typeof window !== 'undefined' &&
            hoveredCardTooltip.rect.bottom + 240 > window.innerHeight &&
            hoveredCardTooltip.rect.top > 240
              ? { bottom: window.innerHeight - hoveredCardTooltip.rect.top + 8 }
              : { top: hoveredCardTooltip.rect.bottom + 8 }),
          }}
          className="fixed z-50 pointer-events-none rounded-xl border border-slate-700/95 bg-[#080e1d]/98 backdrop-blur-md shadow-2xl p-3.5 text-left"
        >
          <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: hoveredCardTooltip.branchColor }}
              />
              <span className="font-semibold text-slate-300 truncate">{hoveredCardTooltip.branchLabel}</span>
            </div>
            <span
              className="font-extrabold tabular-nums shrink-0"
              style={{ color: hoveredCardTooltip.branchColor }}
            >
              {hoveredCardTooltip.dateLabel}
            </span>
          </div>

          <div className="mt-1.5 text-sm font-bold text-white leading-snug">
            {hoveredCardTooltip.ev.title}
          </div>

          <p className="mt-1 text-xs text-slate-200 leading-relaxed">
            {hoveredCardTooltip.ev.subtitle}
          </p>

          {hoveredCardTooltip.ev.outcome && (
            <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/25 px-2.5 py-1.5 text-[11px] text-amber-100 leading-snug">
              <span className="font-mono font-bold text-amber-300">Итог: </span>
              {hoveredCardTooltip.ev.outcome}
            </div>
          )}

          {hoveredCardTooltip.ev.details &&
            hoveredCardTooltip.ev.details !== hoveredCardTooltip.ev.subtitle &&
            !hoveredCardTooltip.ev.outcome && (
              <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed line-clamp-3">
                {hoveredCardTooltip.ev.details}
              </p>
            )}

          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
            <span className="truncate">
              {hoveredCardTooltip.ev.ruler
                ? `Правитель: ${hoveredCardTooltip.ev.ruler}`
                : hoveredCardTooltip.branchLabel}
            </span>
            <span className="text-amber-300 shrink-0">
              {hoveredCardTooltip.ev.explicitLinks.length > 0
                ? `Связей: ${hoveredCardTooltip.ev.explicitLinks.length} · Клик — паспорт`
                : 'Клик — паспорт события'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
