import { eraGraphAnchor, timelineEventAnchor } from './timelineAnchors';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Crosshair,
  Crown,
  Eye,
  Flag,
  GitCommitHorizontal,
  GitCompare,
  GitMerge,
  Link2,
  MapPin,
} from 'lucide-react';
import { Fragment, memo } from 'react';
import { getMacroRegionOption } from '../../engine/regionFilter';
import {
  formatEventTitleWithPeriod,
  getCalendarStyleAxisMarker,
  parsePreciseDate,
  resolveMacroEra,
} from '../../engine/timelineEngine';
import type {
  AuditCandidateInfo,
  AxisResolution,
  BranchDefinition,
  BranchSubLaneLayout,
  CardDensity,
  EnrichedEvent,
  FocusDepth,
  MacroRegionId,
  RulerSubLaneLayout,
  StreamRow,
} from '../../types/timeline';
import type { PrecomputedEventMeta, PrecomputedRowRails } from './timelineLayoutPrecompute';

export type NodeVisualKind = 'milestone' | 'process' | 'biography';

export interface NodeVisualStatusMeta {
  kind: NodeVisualKind;
  symbol: '◆' | '●' | '◈';
  kindLabel: string;
  shortKindLabel: string;
  durationLabel: string;
  compactDurationLabel: string;
  spanRangeLabel: string;
  trackStartPct: number;
  trackWidthPct: number;
  secondaryTrackLabel?: string;
}

export function formatDurationYearsRu(years: number): string {
  const n = Math.max(1, Math.round(years));
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 19) return `${n} лет`;
  if (mod10 === 1) return `${n} год`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} года`;
  return `${n} лет`;
}

export function computeNodeVisualStatusMeta(
  ev: EnrichedEvent,
  isBioNode: boolean,
  isAtomicInView: boolean,
  effStartYear: number,
  effEndYear: number,
): NodeVisualStatusMeta {
  if (isBioNode) {
    const lifeYears = Math.max(1, ev.endYear - ev.startYear);
    const activeYears = Math.max(1, effEndYear - effStartYear);
    const rawStartPct = Math.round(((effStartYear - ev.startYear) / lifeYears) * 100);
    const trackStartPct = Math.max(0, Math.min(82, rawStartPct));
    const rawWidthPct = Math.round((activeYears / lifeYears) * 100);
    const trackWidthPct = Math.max(16, Math.min(100 - trackStartPct, rawWidthPct));
    return {
      kind: 'biography',
      symbol: '◈',
      kindLabel: 'Биография',
      shortKindLabel: 'биогр.',
      durationLabel: `жизнь ${lifeYears} л. · пик ${activeYears} л.`,
      compactDurationLabel: `акт. ${activeYears} л.`,
      spanRangeLabel: `${ev.startYear}–${ev.endYear} (акт. ${effStartYear}–${effEndYear})`,
      trackStartPct,
      trackWidthPct,
      secondaryTrackLabel: `${ev.startYear}–${ev.endYear}`,
    };
  }

  const rawSpanYears = Math.max(0, ev.endYear - ev.startYear);
  if (!isAtomicInView || rawSpanYears > 1) {
    const spanYears = Math.max(1, rawSpanYears);
    const trackWidthPct = Math.max(
      20,
      Math.min(100, Math.round(Math.sqrt(spanYears / 45) * 100)),
    );
    return {
      kind: 'process',
      symbol: '●',
      kindLabel: 'Процесс',
      shortKindLabel: 'процесс',
      durationLabel: `${ev.startYear}–${ev.endYear} · ${formatDurationYearsRu(spanYears)}`,
      compactDurationLabel: `${spanYears} л.`,
      spanRangeLabel: `${ev.startYear}–${ev.endYear}`,
      trackStartPct: 0,
      trackWidthPct,
    };
  }

  return {
    kind: 'milestone',
    symbol: '◆',
    kindLabel: 'Веха',
    shortKindLabel: 'веха',
    durationLabel:
      rawSpanYears === 1 ? `${ev.startYear}–${ev.endYear} · 1 год` : 'Точечное событие (≤ 1 года)',
    compactDurationLabel: 'веха',
    spanRangeLabel: `${ev.startYear}`,
    trackStartPct: 0,
    trackWidthPct: 0,
  };
}

export interface GutterRowMeta {
  label: string;
  title: string;
  styleLabel?: string;
  styleTone?: 'julian' | 'gregorian' | 'both';
  isDuplicate: boolean;
}

export interface TimelineStreamRowProps {
  item: StreamRow;
  idx: number;
  gutter: GutterRowMeta;
  gutterWidthClass: string;
  isDesktopGraph: boolean;
  svgWidth: number;
  timeSpineX: number;
  connectorBusX: number;
  hasRulersLane: boolean;
  rulerLayout: RulerSubLaneLayout;
  thematicLanes: BranchDefinition[];
  subLaneLayout: BranchSubLaneLayout;
  rowRails: PrecomputedRowRails;
  spacerRails: PrecomputedRowRails | null;
  spacerHeight: number;
  deltaYears: number;
  prevYear: number | null;
  showSpacerBus: boolean;
  axisResolution: AxisResolution;
  cardDensity: CardDensity;
  selectedMacroRegion: MacroRegionId;
  hasFocusedEvent: boolean;
  focusDepth: FocusDepth;
  eventMeta?: PrecomputedEventMeta;
  carryOverWars?: EnrichedEvent[];
  ongoingWars?: EnrichedEvent[];
  auditInfo?: AuditCandidateInfo;
  hasEndRowInStream: boolean;
  hasStartRowInStream: boolean;
  // Granular interactive / highlight state (only changes on affected rows!)
  isSelfHovered: boolean;
  isCrossLinked: boolean;
  isOverlapping: boolean;
  isFocusedTarget: boolean;
  focusDistance?: number;
  isJumpHighlighted: boolean;
  isConnectedToBus: boolean;
  showBusSegment: boolean;
  busY1: number;
  busY2: number;
  showUpArrow: boolean;
  showDownArrow: boolean;
  dimOtherPassingRails: boolean;
  hoveredPassingRailId: string | null;
  linkedPassingRailIdsKey: string;
  // Stable callbacks
  onActivateHoverEvent: (eventId: string) => void;
  onScheduleClearHoverEvent: () => void;
  onOpenCardTooltip: (
    el: HTMLElement,
    ev: EnrichedEvent,
    branchLabel: string,
    branchColor: string,
    dateLabel: string,
  ) => void;
  onCloseCardTooltip: () => void;
  onScrollToDomRow: (domId: string, eventId: string) => void;
  onOpenCardModal: (eventId: string) => void;
  onOpenPeriodModal: (rulerId: string) => void;
  onOpenEraModal: (eraId: string) => void;
  onSelectYearRange: (from: number, to: number) => void;
  onToggleFocusEvent: (eventId: string) => void;
  onRevealBranches?: (branchIds: string[]) => void;
  onSelectMacroRegion?: (region: MacroRegionId) => void;
}

const MOBILE_SPINE_WIDTH = 36;
const MOBILE_SPINE_X = 16;
const MOBILE_CONNECTOR_BUS_X = 27;

function renderPrecomputedDesktopRails(params: {
  rowRails: PrecomputedRowRails;
  hasRulersLane: boolean;
  rulerLayout: RulerSubLaneLayout;
  timeSpineX: number;
  connectorBusX: number;
  thematicLanes: BranchDefinition[];
  subLaneLayout: BranchSubLaneLayout;
  showBusSegment: boolean;
  busY1: number;
  busY2: number;
  dimOtherPassingRails: boolean;
  hoveredPassingRailId: string | null;
  linkedPassingRailSet: Set<string> | null;
}) {
  const {
    rowRails,
    hasRulersLane,
    rulerLayout,
    timeSpineX,
    connectorBusX,
    thematicLanes,
    subLaneLayout,
    showBusSegment,
    busY1,
    busY2,
    dimOtherPassingRails,
    hoveredPassingRailId,
    linkedPassingRailSet,
  } = params;

  return (
    <>
      {hasRulersLane && (
        <g>
          {rulerLayout.railXs.map((rx, slotIdx) => {
            const activeSlot = rowRails.activeRulerSlots[slotIdx];
            if (activeSlot) {
              return (
                <line
                  key={`ruler-rail-${slotIdx}`}
                  x1={rx}
                  y1={0}
                  x2={rx}
                  y2={420}
                  stroke={activeSlot.color}
                  strokeWidth={3}
                  strokeOpacity={0.65}
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

      {/* Вертикальная шина связей вдоль оси при наведении на карточку */}
      {showBusSegment && (
        <line
          x1={connectorBusX}
          y1={busY1}
          x2={connectorBusX}
          y2={busY2}
          stroke="#10b981"
          strokeWidth={2.2}
          strokeDasharray="4 3"
          strokeOpacity={0.9}
        />
      )}

      {/* Тематические ветки и их динамические под-нити справа от оси времени */}
      {thematicLanes.map((lane) => {
        const laneInfo = subLaneLayout.branchLayouts.get(lane.id);
        const baseX = laneInfo?.baseX ?? timeSpineX + 28;
        const laneBucket = rowRails.passingByLane.get(lane.id);
        const hasBasePassing = laneBucket?.hasBasePassing ?? false;
        const passingRails = laneBucket?.rails;

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

            {passingRails &&
              passingRails.map((rail) => {
                const isRailSelfHovered = hoveredPassingRailId === rail.eventId;
                const isRailLinkedHovered = Boolean(
                  linkedPassingRailSet && linkedPassingRailSet.has(rail.eventId),
                );
                const isDimmed =
                  dimOtherPassingRails && !isRailSelfHovered && !isRailLinkedHovered;

                return (
                  <g key={`rail-${rail.eventId}`}>
                    {(isRailSelfHovered || isRailLinkedHovered) && (
                      <line
                        x1={rail.x}
                        y1={0}
                        x2={rail.x}
                        y2={420}
                        stroke={isRailLinkedHovered && !isRailSelfHovered ? '#34d399' : lane.color}
                        strokeWidth={6.5}
                        strokeOpacity={0.28}
                      />
                    )}
                    <line
                      x1={rail.x}
                      y1={0}
                      x2={rail.x}
                      y2={420}
                      stroke={isRailLinkedHovered && !isRailSelfHovered ? '#34d399' : lane.color}
                      strokeWidth={
                        isRailSelfHovered
                          ? 3.6
                          : isRailLinkedHovered
                            ? 3.2
                            : rail.isBioRail
                              ? 2.1
                              : 2.6
                      }
                      strokeDasharray={
                        rail.isBioRail && !isRailSelfHovered && !isRailLinkedHovered
                          ? '6 3'
                          : undefined
                      }
                      strokeOpacity={
                        isRailSelfHovered || isRailLinkedHovered
                          ? 1
                          : isDimmed
                            ? 0.28
                            : rail.isBioRail
                              ? 0.5
                              : 0.65
                      }
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

function renderMobileSpine(options: {
  kind: 'era' | 'tick' | 'ruler_start' | 'ruler_end' | 'event_commit' | 'event_end';
  color?: string;
  isAtomic?: boolean;
  isBioNode?: boolean;
  isCompact?: boolean;
  isSelfHovered?: boolean;
  isConnectedToBus?: boolean;
  startedBeforeWindow?: boolean;
  showBusSegment: boolean;
  busY1: number;
  busY2: number;
}) {
  const nodeColor = options.color ?? '#f59e0b';
  const commitY = options.kind === 'event_commit' ? (options.isCompact ? 22 : 28) : 22;

  return (
    <div className="sm:hidden w-[36px] shrink-0 relative select-none overflow-hidden">
      <svg className="w-full h-full absolute inset-0" width={MOBILE_SPINE_WIDTH} height="100%">
        <line
          x1={MOBILE_SPINE_X}
          y1={0}
          x2={MOBILE_SPINE_X}
          y2={420}
          stroke="#cbd5e1"
          strokeWidth={2.6}
          strokeOpacity={0.78}
        />

        {options.showBusSegment && (
          <line
            x1={MOBILE_CONNECTOR_BUS_X}
            y1={options.busY1}
            x2={MOBILE_CONNECTOR_BUS_X}
            y2={options.busY2}
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="4 3"
            strokeOpacity={0.9}
          />
        )}

        {options.kind === 'era' && (
          <>
            <line
              x1={MOBILE_SPINE_X + 8}
              y1={36}
              x2={MOBILE_SPINE_WIDTH}
              y2={36}
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeOpacity={0.7}
            />
            <circle cx={MOBILE_SPINE_X} cy={36} r={9} fill="#050811" stroke="#cbd5e1" strokeWidth={2.6} />
            <circle cx={MOBILE_SPINE_X} cy={36} r={4} fill="#f59e0b" />
          </>
        )}

        {options.kind === 'tick' && (
          <>
            <line
              x1={MOBILE_SPINE_X + 4}
              y1={14}
              x2={MOBILE_SPINE_WIDTH}
              y2={14}
              stroke="#475569"
              strokeWidth={1}
              strokeDasharray="2 3"
              strokeOpacity={0.55}
            />
            <circle cx={MOBILE_SPINE_X} cy={14} r={3.2} fill="#050811" stroke="#94a3b8" strokeWidth={1.8} />
          </>
        )}

        {options.kind === 'ruler_start' && (
          <>
            <line
              x1={MOBILE_SPINE_X - 7}
              y1={options.startedBeforeWindow ? 0 : 28}
              x2={MOBILE_SPINE_X - 7}
              y2={420}
              stroke={nodeColor}
              strokeWidth={2.4}
              strokeOpacity={0.6}
            />
            <line
              x1={MOBILE_SPINE_X + 6}
              y1={28}
              x2={MOBILE_SPINE_WIDTH}
              y2={28}
              stroke={nodeColor}
              strokeWidth={1.4}
              strokeDasharray="3 3"
              strokeOpacity={0.55}
            />
            <circle cx={MOBILE_SPINE_X} cy={28} r={5.5} fill="#050811" stroke={nodeColor} strokeWidth={2.6} />
            <circle cx={MOBILE_SPINE_X} cy={28} r={2.2} fill={nodeColor} />
          </>
        )}

        {options.kind === 'ruler_end' && (
          <>
            <line
              x1={MOBILE_SPINE_X - 7}
              y1={0}
              x2={MOBILE_SPINE_X - 7}
              y2={22}
              stroke={nodeColor}
              strokeWidth={2.4}
              strokeOpacity={0.6}
            />
            <rect
              x={MOBILE_SPINE_X - 4}
              y={18}
              width={8}
              height={8}
              rx={2}
              fill="#050811"
              stroke={nodeColor}
              strokeWidth={2.2}
            />
          </>
        )}

        {options.kind === 'event_commit' && (
          <>
            {options.isConnectedToBus && (
              <g>
                <line
                  x1={MOBILE_SPINE_X}
                  y1={commitY}
                  x2={MOBILE_CONNECTOR_BUS_X}
                  y2={commitY}
                  stroke="#10b981"
                  strokeWidth={1.8}
                />
                <circle
                  cx={MOBILE_CONNECTOR_BUS_X}
                  cy={commitY}
                  r={3.2}
                  fill={options.isSelfHovered ? '#10b981' : '#050811'}
                  stroke="#10b981"
                  strokeWidth={1.8}
                />
              </g>
            )}

            {!options.isAtomic && (
              <line
                x1={MOBILE_SPINE_X + 5}
                y1={options.startedBeforeWindow ? 0 : commitY}
                x2={MOBILE_SPINE_X + 5}
                y2={420}
                stroke={nodeColor}
                strokeWidth={options.isSelfHovered ? 2.6 : 1.8}
                strokeDasharray={options.isBioNode ? '4 2' : undefined}
                strokeOpacity={options.isSelfHovered ? 0.95 : 0.45}
              />
            )}

            <line
              x1={MOBILE_SPINE_X + 6}
              y1={commitY}
              x2={MOBILE_SPINE_WIDTH}
              y2={commitY}
              stroke={nodeColor}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeOpacity={options.isSelfHovered ? 1 : 0.6}
            />

            {options.isAtomic || options.isBioNode ? (
              <g>
                <polygon
                  points={`${MOBILE_SPINE_X},${commitY - 6.5} ${MOBILE_SPINE_X + 6.5},${commitY} ${MOBILE_SPINE_X},${commitY + 6.5} ${MOBILE_SPINE_X - 6.5},${commitY}`}
                  fill="#050811"
                  stroke={nodeColor}
                  strokeWidth={2.3}
                />
                <circle cx={MOBILE_SPINE_X} cy={commitY} r={1.8} fill={nodeColor} />
              </g>
            ) : (
              <>
                <circle cx={MOBILE_SPINE_X} cy={commitY} r={8.5} fill={nodeColor} fillOpacity={0.22} />
                <circle
                  cx={MOBILE_SPINE_X}
                  cy={commitY}
                  r={5}
                  fill="#050811"
                  stroke={nodeColor}
                  strokeWidth={2.5}
                />
                <circle cx={MOBILE_SPINE_X} cy={commitY} r={2} fill={nodeColor} />
              </>
            )}
          </>
        )}

        {options.kind === 'event_end' && (
          <>
            <line
              x1={MOBILE_SPINE_X + 5}
              y1={22}
              x2={MOBILE_SPINE_WIDTH}
              y2={22}
              stroke={nodeColor}
              strokeWidth={1.3}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <rect
              x={MOBILE_SPINE_X - 4.5}
              y={17.5}
              width={9}
              height={9}
              rx={2}
              fill="#050811"
              stroke={nodeColor}
              strokeWidth={2.3}
            />
          </>
        )}
      </svg>
    </div>
  );
}

export const TimelineStreamRow = memo(function TimelineStreamRow({
  item,
  gutter,
  gutterWidthClass,
  isDesktopGraph,
  svgWidth,
  timeSpineX,
  connectorBusX,
  hasRulersLane,
  rulerLayout,
  thematicLanes,
  subLaneLayout,
  rowRails,
  spacerRails,
  spacerHeight,
  deltaYears,
  prevYear,
  showSpacerBus,
  axisResolution,
  cardDensity,
  selectedMacroRegion,
  hasFocusedEvent,
  focusDepth,
  eventMeta,
  carryOverWars,
  ongoingWars,
  auditInfo,
  hasEndRowInStream,
  hasStartRowInStream,
  isSelfHovered,
  isCrossLinked,
  isOverlapping,
  isFocusedTarget,
  focusDistance,
  isJumpHighlighted,
  isConnectedToBus,
  showBusSegment,
  busY1,
  busY2,
  showUpArrow,
  showDownArrow,
  dimOtherPassingRails,
  hoveredPassingRailId,
  linkedPassingRailIdsKey,
  onActivateHoverEvent,
  onScheduleClearHoverEvent,
  onOpenCardTooltip,
  onCloseCardTooltip,
  onScrollToDomRow,
  onOpenCardModal,
  onOpenPeriodModal,
  onOpenEraModal,
  onSelectYearRange,
  onToggleFocusEvent,
  onRevealBranches,
  onSelectMacroRegion,
}: TimelineStreamRowProps) {
  const linkedPassingRailSet = linkedPassingRailIdsKey
    ? new Set(linkedPassingRailIdsKey.split(','))
    : null;

  const spacerEl =
    spacerHeight > 0 && prevYear !== null ? (
      <div
        aria-hidden="true"
        className="relative flex items-stretch bg-slate-950/35 select-none"
        style={{ height: `${spacerHeight}px` }}
      >
        <div
          className={`${gutterWidthClass} shrink-0 border-r border-slate-800/40 bg-slate-950/30 px-2 sm:px-2.5 items-center justify-end font-mono text-[10px] text-slate-500 tabular-nums whitespace-nowrap`}
        >
          {deltaYears >= 3 ? `+${deltaYears} л.` : ''}
        </div>

        {!isDesktopGraph ? (
          <div className="sm:hidden w-[36px] shrink-0 relative overflow-hidden">
            <svg className="w-full h-full absolute inset-0" width={MOBILE_SPINE_WIDTH} height="100%">
              <line
                x1={MOBILE_SPINE_X}
                y1={0}
                x2={MOBILE_SPINE_X}
                y2={420}
                stroke="#cbd5e1"
                strokeWidth={2.6}
                strokeOpacity={0.78}
              />
              {showSpacerBus && (
                <line
                  x1={MOBILE_CONNECTOR_BUS_X}
                  y1={0}
                  x2={MOBILE_CONNECTOR_BUS_X}
                  y2={420}
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  strokeOpacity={0.9}
                />
              )}
            </svg>
          </div>
        ) : (
          <div
            className="hidden sm:block shrink-0 relative overflow-hidden"
            style={{ width: `${svgWidth}px` }}
          >
            <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
              {renderPrecomputedDesktopRails({
                rowRails: spacerRails ?? rowRails,
                hasRulersLane,
                rulerLayout,
                timeSpineX,
                connectorBusX,
                thematicLanes,
                subLaneLayout,
                showBusSegment: showSpacerBus,
                busY1: 0,
                busY2: 420,
                dimOtherPassingRails,
                hoveredPassingRailId,
                linkedPassingRailSet,
              })}
            </svg>
          </div>
        )}

        <div className="flex-1 min-w-0 flex items-center gap-2 pr-3 sm:pr-6">
          <div className="h-px flex-1 border-t border-dashed border-slate-800/80" />
          {deltaYears >= 3 && (
            <span className="font-mono text-[10px] text-slate-500 tabular-nums whitespace-nowrap">
              ↕ {formatDurationYearsRu(deltaYears)} ({prevYear}–{item.year})
            </span>
          )}
          <div className="h-px w-8 border-t border-dashed border-slate-800/80" />
        </div>
      </div>
    ) : null;

  let rowEl;

  if (item.rowType === 'ERA_START') {
    const resolvedEra = resolveMacroEra(item.era);
    const wars = carryOverWars ?? [];

    rowEl = (
      <div id={eraGraphAnchor(item.era.id)} className="timeline-row-cv relative flex items-stretch bg-gradient-to-r from-slate-900/95 via-slate-900/70 to-slate-950 border-y border-amber-500/30">
        <div
          title={gutter.title}
          className={`${gutterWidthClass} shrink-0 border-r border-slate-800/70 bg-slate-950/60 px-2 sm:px-2.5 pt-[27px] pb-2 items-start justify-end font-mono text-[11px] font-bold text-amber-300 tabular-nums whitespace-nowrap select-none`}
        >
          {gutter.label}
        </div>

        {!isDesktopGraph ? (
          renderMobileSpine({
            kind: 'era',
            showBusSegment,
            busY1,
            busY2,
          })
        ) : (
          <div
            className="hidden sm:block shrink-0 relative select-none overflow-hidden"
            style={{ width: `${svgWidth}px` }}
          >
            <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
              {renderPrecomputedDesktopRails({
                rowRails,
                hasRulersLane,
                rulerLayout,
                timeSpineX,
                connectorBusX,
                thematicLanes,
                subLaneLayout,
                showBusSegment,
                busY1,
                busY2,
                dimOtherPassingRails,
                hoveredPassingRailId,
                linkedPassingRailSet,
              })}
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
        )}

        <div className="flex-1 min-w-0 overflow-hidden py-4 pr-3 sm:pr-6">
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
          {wars.length > 0 && (
            <div className="mt-2 text-[11px] font-mono text-sky-300">
              Военные кампании, переходящие через рубеж периода:{' '}
              {wars.map((w) => formatEventTitleWithPeriod(w)).join(', ')}
            </div>
          )}
        </div>
      </div>
    );
  } else if (item.rowType === 'TIME_TICK') {
    rowEl = (
      <div className="relative flex items-stretch bg-slate-950/75">
        <div
          title={gutter.title}
          className={`${gutterWidthClass} shrink-0 border-r border-slate-800/50 bg-slate-950/40 px-2 sm:px-2.5 py-1 flex-col items-end justify-center font-mono text-[10px] leading-tight tabular-nums whitespace-nowrap select-none ${
            gutter.isDuplicate ? 'text-slate-400/75' : 'text-slate-300'
          }`}
        >
          <span>{gutter.label}</span>
          {gutter.styleLabel && (
            <span className="text-[9px] text-sky-400/80 font-normal">{gutter.styleLabel}</span>
          )}
        </div>

        {!isDesktopGraph ? (
          renderMobileSpine({
            kind: 'tick',
            showBusSegment,
            busY1,
            busY2,
          })
        ) : (
          <div
            className="hidden sm:block shrink-0 relative select-none overflow-hidden"
            style={{ width: `${svgWidth}px` }}
          >
            <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
              {renderPrecomputedDesktopRails({
                rowRails,
                hasRulersLane,
                rulerLayout,
                timeSpineX,
                connectorBusX,
                thematicLanes,
                subLaneLayout,
                showBusSegment,
                busY1,
                busY2,
                dimOtherPassingRails,
                hoveredPassingRailId,
                linkedPassingRailSet,
              })}
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
        )}

        <div className="flex-1 min-w-0 overflow-hidden py-1.5 sm:py-1 pr-3 sm:pr-6 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-sans text-slate-400">
          <span className="font-mono font-bold text-slate-200 tabular-nums">{item.label}</span>
          {gutter.styleLabel && (
            <span className="sm:hidden font-mono text-[10px] text-sky-400/85">{gutter.styleLabel}</span>
          )}
          <span aria-hidden="true" className="text-slate-400">
            ·
          </span>
          <span className="text-slate-400">хронологический рубеж</span>
        </div>
      </div>
    );
  } else if (item.rowType === 'RULER_COMMIT') {
    const r = item.rulerObj;
    const rSlot = rulerLayout.slotByRulerId.get(r.id) ?? 0;
    const rx = rulerLayout.railXs[rSlot] ?? 16;
    const rColor = rulerLayout.colorByRulerId.get(r.id) ?? item.rulerColor;
    const ongoingWarsAtAccession = ongoingWars ?? [];

    rowEl = (
      <div
        id={r.id}
        data-ruler-context={r.id}
        className={`relative flex items-stretch transition-colors group ${
          isJumpHighlighted
            ? 'bg-amber-500/20 ring-2 ring-inset ring-amber-400'
            : 'bg-slate-900/70 hover:bg-slate-900/95'
        }`}
      >
        <div
          title={gutter.title}
          className={`${gutterWidthClass} shrink-0 border-r border-slate-800/60 bg-slate-950/40 px-2 sm:px-2.5 pt-[24px] pb-2 flex-col items-end justify-start font-mono text-[11px] leading-tight font-semibold tabular-nums whitespace-nowrap select-none transition-colors ${
            gutter.isDuplicate
              ? 'text-amber-300/75 group-hover:text-amber-200'
              : 'text-amber-200 group-hover:text-amber-100'
          }`}
        >
          <span>{gutter.label}</span>
          {gutter.styleLabel && (
            <span
              className={`text-[9px] font-normal mt-0.5 ${
                gutter.styleTone === 'gregorian' ? 'text-sky-300/80' : 'text-amber-300/75'
              }`}
            >
              {gutter.styleLabel}
            </span>
          )}
        </div>

        {!isDesktopGraph ? (
          renderMobileSpine({
            kind: 'ruler_start',
            color: rColor,
            startedBeforeWindow: item.startedBeforeWindow,
            showBusSegment,
            busY1,
            busY2,
          })
        ) : (
          <div
            className="hidden sm:block shrink-0 relative select-none overflow-hidden"
            style={{ width: `${svgWidth}px` }}
          >
            <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
              {renderPrecomputedDesktopRails({
                rowRails,
                hasRulersLane,
                rulerLayout,
                timeSpineX,
                connectorBusX,
                thematicLanes,
                subLaneLayout,
                showBusSegment,
                busY1,
                busY2,
                dimOtherPassingRails,
                hoveredPassingRailId,
                linkedPassingRailSet,
              })}

              {hasRulersLane && (
                <>
                  {!item.startedBeforeWindow && (
                    <path
                      d={`M ${timeSpineX} 16 C ${timeSpineX - 10} 18, ${rx} 20, ${rx} 36`}
                      fill="none"
                      stroke={rColor}
                      strokeWidth={2.6}
                      strokeOpacity={0.65}
                    />
                  )}
                  <line
                    x1={rx}
                    y1={item.startedBeforeWindow ? 0 : 34}
                    x2={rx}
                    y2={420}
                    stroke={rColor}
                    strokeWidth={3}
                    strokeOpacity={0.65}
                  />
                  <line
                    x1={timeSpineX + 6}
                    y1={28}
                    x2={svgWidth}
                    y2={28}
                    stroke={rColor}
                    strokeWidth={1.4}
                    strokeDasharray="3 3"
                    strokeOpacity={0.48}
                  />
                  <circle cx={timeSpineX} cy={16} r={4} fill="#050811" stroke="#cbd5e1" strokeWidth={2} />
                  <circle cx={rx} cy={34} r={6.5} fill="#050811" stroke={rColor} strokeWidth={3} />
                  <circle cx={rx} cy={34} r={2.5} fill={rColor} />
                </>
              )}
            </svg>
          </div>
        )}

        <div className="flex-1 min-w-0 overflow-hidden py-3.5 pr-2.5 sm:pr-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
              <span
                className="inline-flex items-center gap-1.5 font-mono text-xs font-black tabular-nums shrink-0"
                style={{ color: rColor }}
              >
                <Crown className="w-3.5 h-3.5" />
                {item.dateLabel}
              </span>
              {axisResolution !== 'year' &&
                !item.startedBeforeWindow &&
                (() => {
                  const marker = getCalendarStyleAxisMarker(
                    parsePreciseDate(r.startDate, r.startYear, false, {
                      calendarStyle: r.calendarStyle,
                      task: 'MAIN_RULERS',
                    }),
                  );
                  return marker ? (
                    <span
                      className={`text-[10px] font-mono shrink-0 ${
                        marker.tone === 'gregorian' ? 'text-sky-300/85' : 'text-amber-300/85'
                      }`}
                    >
                      {marker.label}
                    </span>
                  ) : null;
                })()}
              {r.center && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/90 border border-slate-700/80 text-xs font-sans font-semibold text-slate-300 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: rColor }} />
                  <span>{r.center}</span>
                </span>
              )}
              <span aria-hidden="true" className="text-slate-400 hidden sm:inline">
                ·
              </span>
              <span className="font-serif text-base sm:text-lg font-bold text-white tracking-tight">
                {r.ruler}
              </span>
              <span aria-hidden="true" className="text-slate-400">
                ·
              </span>
              <span className="text-xs font-sans text-slate-400">
                правление{' '}
                <span className="font-mono tabular-nums text-slate-300">{r.reignPeriod}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {!hasFocusedEvent && (
                <button
                  type="button"
                  onClick={() => onSelectYearRange(r.startYear, r.endYear)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-sans font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  title="Отфильтровать таймлайн строго по годам этого правления"
                >
                  Фокус:{' '}
                  <span className="font-mono tabular-nums">
                    {r.startYear}–{r.endYear}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenPeriodModal(r.id)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-sans font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                Все события при правителе →
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-300 mt-1">{r.reignThesis}</p>

          {ongoingWarsAtAccession.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-sans text-amber-200/90">
              <span>Смена правителя в ходе военных кампаний:</span>
              {ongoingWarsAtAccession.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => onOpenCardModal(w.id)}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-white hover:border-amber-400 cursor-pointer text-xs"
                >
                  {formatEventTitleWithPeriod(w)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } else if (item.rowType === 'RULER_END') {
    const r = item.rulerObj;
    const rSlot = rulerLayout.slotByRulerId.get(r.id) ?? 0;
    const rx = rulerLayout.railXs[rSlot] ?? 16;
    const rColor = rulerLayout.colorByRulerId.get(r.id) ?? item.rulerColor;
    const mergeY = 22;

    rowEl = (
      <div
        role="button"
        tabIndex={0}
        aria-label={`Завершение правления: ${r.ruler} (${r.reignPeriod})`}
        onClick={() => onOpenPeriodModal(r.id)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenPeriodModal(r.id);
          }
        }}
        className="timeline-row-cv relative flex items-stretch bg-slate-950/55 hover:bg-slate-900/45 focus-visible:outline-2 focus-visible:outline-amber-400 transition-colors cursor-pointer group"
      >
        <div
          title={gutter.title}
          className={`${gutterWidthClass} shrink-0 border-r border-slate-800/50 bg-slate-950/30 px-2 sm:px-2.5 py-2 flex-col items-end justify-center font-mono text-[10px] leading-tight tabular-nums whitespace-nowrap select-none transition-colors ${
            gutter.isDuplicate
              ? 'text-slate-400/75 group-hover:text-slate-200'
              : 'text-slate-300 group-hover:text-white'
          }`}
        >
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="text-[9px] text-slate-400 group-hover:text-slate-200">
              ↵
            </span>
            <span>{gutter.label}</span>
          </span>
          {gutter.styleLabel && (
            <span
              className={`text-[9px] font-normal ${
                gutter.styleTone === 'gregorian' ? 'text-sky-300/75' : 'text-amber-300/75'
              }`}
            >
              {gutter.styleLabel}
            </span>
          )}
        </div>

        {!isDesktopGraph ? (
          renderMobileSpine({
            kind: 'ruler_end',
            color: rColor,
            showBusSegment,
            busY1,
            busY2,
          })
        ) : (
          <div
            className="hidden sm:block shrink-0 relative select-none overflow-hidden"
            style={{ width: `${svgWidth}px` }}
          >
            <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
              {renderPrecomputedDesktopRails({
                rowRails,
                hasRulersLane,
                rulerLayout,
                timeSpineX,
                connectorBusX,
                thematicLanes,
                subLaneLayout,
                showBusSegment,
                busY1,
                busY2,
                dimOtherPassingRails,
                hoveredPassingRailId,
                linkedPassingRailSet,
              })}

              {hasRulersLane && (
                <>
                  <line
                    x1={rx}
                    y1={0}
                    x2={rx}
                    y2={mergeY - 6}
                    stroke={rColor}
                    strokeWidth={3}
                    strokeOpacity={0.65}
                  />
                  <path
                    d={`M ${rx} ${mergeY - 6} C ${rx} ${mergeY + 6}, ${timeSpineX - 10} ${mergeY + 2}, ${timeSpineX} ${mergeY + 6}`}
                    fill="none"
                    stroke={rColor}
                    strokeWidth={2.4}
                    strokeOpacity={0.65}
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
        )}

        <div className="flex-1 min-w-0 overflow-hidden py-2 pr-2.5 sm:pr-6">
          <div className="w-full max-w-[760px] min-w-0 overflow-hidden rounded-lg bg-slate-900/40 border border-slate-800/70 group-hover:border-slate-700 px-3 sm:px-3.5 min-h-[36px] py-1.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-2 gap-y-1 text-xs font-sans">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-0.5 min-w-0 flex-1 overflow-hidden">
              <GitMerge className="w-3.5 h-3.5 shrink-0" style={{ color: rColor }} />
              <span className="font-mono font-bold text-slate-200 tabular-nums shrink-0">
                {item.dateLabel}
              </span>
              {gutter.styleLabel && (
                <span
                  className={`sm:hidden font-mono text-[10px] shrink-0 ${
                    gutter.styleTone === 'gregorian' ? 'text-sky-300/80' : 'text-amber-300/80'
                  }`}
                >
                  {gutter.styleLabel}
                </span>
              )}
              {r.center && (
                <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-xs text-slate-300 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: rColor }} />
                  <span>{r.center}</span>
                </span>
              )}
              <span className="text-slate-400 shrink-0 hidden sm:inline">Завершение правления:</span>
              <span className="font-semibold text-slate-200 group-hover:text-white line-clamp-2 sm:truncate min-w-0">
                {r.shortRuler}{' '}
                <span className="font-mono text-slate-300 tabular-nums">({r.reignPeriod})</span>
              </span>
            </div>
            <span className="text-xs font-sans text-slate-400 shrink-0 tabular-nums ml-auto sm:ml-0">
              ~<span className="font-mono">{Math.max(1, r.endYear - r.startYear)}</span> л. у власти
            </span>
          </div>
        </div>
      </div>
    );
  } else if (item.rowType === 'EVENT_COMMIT' && eventMeta) {
    const ev = item.eventObj;
    const {
      branchObj,
      origBranchObj,
      isBioNode,
      effStartYear,
      effEndYear,
      baseX,
      commitX: nonAtomicCommitX,
      atomicCommitX,
      hiddenBranchSummaries,
      hiddenLinksTotal,
      eventMacroRegions,
    } = eventMeta;
    const isAtomic = item.isAtomicInView;
    const commitX = isAtomic ? atomicCommitX : nonAtomicCommitX;
    const hasBasePassingAtRow = rowRails.hasBasePassingAtCommit;
    const forkOriginX = hasBasePassingAtRow ? baseX : timeSpineX;
    const isCompact = cardDensity === 'compact';
    const commitY = isCompact ? 22 : 34;
    const hasMultipleRulers = ev.overlappingRulers.length > 1;
    const bioPeriodBadge = item.startedBeforeWindow
      ? `акт. с ${effStartYear} (${ev.period})`
      : `акт. ${effStartYear}–${effEndYear} (${ev.period})`;
    const dateSummary = isBioNode
      ? bioPeriodBadge
      : axisResolution === 'year'
        ? ev.period
        : `${item.dateLabel} (${ev.period})`;

    const nodeStatus = computeNodeVisualStatusMeta(ev, isBioNode, isAtomic, effStartYear, effEndYear);
    const primaryMacroRegionId =
      selectedMacroRegion !== 'all' && eventMacroRegions.includes(selectedMacroRegion)
        ? selectedMacroRegion
        : eventMacroRegions[0];
    const primaryMacroRegionOpt = getMacroRegionOption(primaryMacroRegionId);
    const isMacroRegionActive = selectedMacroRegion === primaryMacroRegionId;

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

    const openEventCard = () => {
      onCloseCardTooltip();
      onOpenCardModal(ev.id);
    };
    const openFromTitle = (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      openEventCard();
    };

    rowEl = (
      <div
        id={timelineEventAnchor(ev.id, 'graph')}
        data-ruler-context={ev.overlappingRulers[0]?.id ?? ''}
        onClick={openEventCard}
        onMouseEnter={() => onActivateHoverEvent(ev.id)}
        onMouseLeave={() => {
          onScheduleClearHoverEvent();
          onCloseCardTooltip();
        }}
        className="timeline-row-cv commit-row relative flex items-stretch hover:bg-slate-900/40 transition-colors cursor-pointer group focus-within:ring-2 focus-within:ring-inset focus-within:ring-amber-400/80"
      >
        <div
          title={gutter.title}
          className={`${gutterWidthClass} shrink-0 border-r border-slate-800/60 bg-slate-950/35 px-2 sm:px-2.5 ${
            isCompact ? 'py-1 flex-col items-end justify-center' : 'pt-[25px] pb-2 flex-col items-end justify-start'
          } font-mono text-[11px] leading-tight font-semibold tabular-nums whitespace-nowrap select-none transition-colors ${
            isSelfHovered || isFocusedTarget
              ? 'text-white'
              : gutter.isDuplicate
                ? 'text-slate-400/80 group-hover:text-slate-200'
                : 'text-slate-200 group-hover:text-white'
          }`}
        >
          <span>{gutter.label}</span>
          {gutter.styleLabel && (
            <span
              className={`text-[9px] font-normal ${
                gutter.styleTone === 'gregorian' ? 'text-sky-300/80' : 'text-amber-300/80'
              }`}
            >
              {gutter.styleLabel}
            </span>
          )}
        </div>

        {!isDesktopGraph ? (
          renderMobileSpine({
            kind: 'event_commit',
            color: branchObj.color,
            isAtomic,
            isBioNode,
            isCompact,
            isSelfHovered,
            isConnectedToBus,
            startedBeforeWindow: item.startedBeforeWindow,
            showBusSegment,
            busY1,
            busY2,
          })
        ) : (
          <div
            className="hidden sm:block shrink-0 relative select-none overflow-hidden"
            style={{ width: `${svgWidth}px` }}
          >
            <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
              {renderPrecomputedDesktopRails({
                rowRails,
                hasRulersLane,
                rulerLayout,
                timeSpineX,
                connectorBusX,
                thematicLanes,
                subLaneLayout,
                showBusSegment,
                busY1,
                busY2,
                dimOtherPassingRails,
                hoveredPassingRailId,
                linkedPassingRailSet,
              })}

              {isConnectedToBus && (
                <g>
                  <path
                    d={`M ${connectorBusX} ${commitY} C ${(connectorBusX + commitX) / 2} ${commitY}, ${(connectorBusX + commitX) / 2} ${commitY}, ${commitX} ${commitY}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeOpacity={0.95}
                  />
                  <circle
                    cx={connectorBusX}
                    cy={commitY}
                    r={3.5}
                    fill={isSelfHovered ? '#10b981' : '#050811'}
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                  {showUpArrow && (
                    <polygon
                      points={`${connectorBusX},${Math.max(4, commitY - 14)} ${connectorBusX - 3.5},${Math.max(9, commitY - 9)} ${connectorBusX + 3.5},${Math.max(9, commitY - 9)}`}
                      fill="#34d399"
                    />
                  )}
                  {showDownArrow && (
                    <polygon
                      points={`${connectorBusX},${commitY + 14} ${connectorBusX - 3.5},${commitY + 9} ${connectorBusX + 3.5},${commitY + 9}`}
                      fill="#34d399"
                    />
                  )}
                </g>
              )}

              {!isAtomic && (
                <>
                  {!item.startedBeforeWindow ? (
                    <>
                      <path
                        d={`M ${forkOriginX} 10 C ${forkOriginX + 10} 10, ${commitX} 16, ${commitX} ${commitY}`}
                        fill="none"
                        stroke={branchObj.color}
                        strokeWidth={isSelfHovered ? 3 : isBioNode ? 1.8 : 2}
                        strokeDasharray={isBioNode && !isSelfHovered ? '4 2' : undefined}
                        strokeOpacity={isSelfHovered ? 1 : isBioNode ? 0.5 : 0.65}
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
                      strokeWidth={isSelfHovered ? 3.6 : isBioNode ? 2.1 : 2.6}
                      strokeDasharray={isBioNode && !isSelfHovered ? '6 3' : undefined}
                      strokeOpacity={isSelfHovered ? 1 : isBioNode ? 0.5 : 0.65}
                    />
                  )}
                  <line
                    x1={commitX}
                    y1={commitY}
                    x2={commitX}
                    y2={420}
                    stroke={branchObj.color}
                    strokeWidth={isSelfHovered ? 3.6 : isBioNode ? 2.1 : 2.6}
                    strokeDasharray={isBioNode && !isSelfHovered ? '6 3' : undefined}
                    strokeOpacity={isSelfHovered ? 1 : isBioNode ? 0.5 : 0.65}
                  />
                </>
              )}

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
                    strokeOpacity={isSelfHovered ? 1 : 0.55}
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
                strokeOpacity={isSelfHovered ? 1 : 0.52}
              />

              {isAtomic || isBioNode ? (
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
        )}

        {isCompact ? (
          <div className="flex-1 min-w-0 overflow-hidden py-1 pr-2.5 sm:pr-6">
            <div
              onMouseEnter={(e) =>
                onOpenCardTooltip(
                  e.currentTarget,
                  ev,
                  origBranchObj.label,
                  origBranchObj.color,
                  dateSummary,
                )
              }
              onMouseLeave={onCloseCardTooltip}
              style={
                nodeStatus.kind === 'process'
                  ? { borderLeftWidth: '3px', borderLeftColor: branchObj.color }
                  : nodeStatus.kind === 'biography'
                    ? {
                        borderLeftWidth: '3px',
                        borderLeftStyle: 'dashed',
                        borderLeftColor: branchObj.color,
                      }
                    : undefined
              }
              className={`w-full max-w-[760px] min-w-0 overflow-hidden rounded-lg border px-2.5 sm:px-3 min-h-[38px] py-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2.5 transition-all ${cardHighlightClass}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1 overflow-hidden">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 shrink-0">
                  <span className="font-mono text-xs font-extrabold text-slate-200 group-hover:text-white tabular-nums shrink-0">
                    {isBioNode
                      ? bioPeriodBadge
                      : axisResolution === 'year'
                        ? ev.period
                        : item.dateLabel}
                  </span>
                  {axisResolution !== 'year' &&
                    !isBioNode &&
                    !item.startedBeforeWindow &&
                    (() => {
                      const marker = getCalendarStyleAxisMarker(ev.startPrecision);
                      return marker ? (
                        <span
                          className={`font-mono text-[10px] shrink-0 ${
                            marker.tone === 'gregorian' ? 'text-sky-300/85' : 'text-amber-300/85'
                          }`}
                          title={gutter.title}
                        >
                          {marker.label}
                        </span>
                      ) : null;
                    })()}
                  <span
                    className="inline-flex items-center gap-1 font-sans text-xs text-slate-400 shrink-0 tabular-nums"
                    title={`${nodeStatus.kindLabel}: ${nodeStatus.durationLabel}`}
                  >
                    <span style={{ color: branchObj.color }}>{nodeStatus.symbol}</span>
                    <span className="font-mono text-[11px]">{nodeStatus.compactDurationLabel}</span>
                    {nodeStatus.kind !== 'milestone' && (
                      <span className="hidden sm:inline-block w-6 h-1 rounded-full bg-slate-800 overflow-hidden relative align-middle">
                        <span
                          className="block h-full rounded-full opacity-80"
                          style={{
                            marginLeft: `${nodeStatus.trackStartPct}%`,
                            width: `${nodeStatus.trackWidthPct}%`,
                            backgroundColor: branchObj.color,
                          }}
                        />
                      </span>
                    )}
                  </span>
                  <span className="sm:hidden inline-flex items-center gap-1 text-xs font-sans text-slate-300 min-w-0">
                    <span aria-hidden="true" className="text-slate-400">
                      ·
                    </span>
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: origBranchObj.color }}
                    />
                    <span className="truncate max-w-[140px]">
                      {origBranchObj.short || origBranchObj.label}
                    </span>
                  </span>
                </div>
                <span aria-hidden="true" className="hidden sm:inline text-slate-400 shrink-0">
                  ·
                </span>
                <button type="button" onClick={openFromTitle} aria-label={`${ev.title} (${ev.period})`} className="text-[13px] sm:text-sm font-bold text-white group-hover:text-amber-200 leading-snug line-clamp-2 sm:truncate min-w-0 text-left">
                  {ev.title}
                </button>
                <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-sans text-slate-300 shrink-0 max-w-[175px]">
                  <span aria-hidden="true" className="text-slate-400">
                    ·
                  </span>
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: origBranchObj.color }}
                  />
                  <span className="truncate">{origBranchObj.label}</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMacroRegion?.(isMacroRegionActive ? 'all' : primaryMacroRegionId);
                  }}
                  title={`${primaryMacroRegionOpt.label}${ev.region ? ` (${ev.region})` : ''} — нажмите для фильтрации по макрорегиону`}
                  className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-mono shrink-0 transition-colors cursor-pointer ${
                    isMacroRegionActive
                      ? 'bg-amber-500/20 border-amber-400/70 text-amber-200 font-semibold'
                      : 'bg-slate-950/75 border-slate-800 text-slate-300 hover:border-amber-400/50 hover:text-amber-200'
                  }`}
                >
                  <MapPin className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                  <span>{primaryMacroRegionOpt.shortLabel}</span>
                </button>
                {hasMultipleRulers && !isBioNode && (
                  <span className="hidden lg:inline text-xs font-sans text-slate-300 shrink-0 tabular-nums">
                    · <span className="font-mono">{ev.overlappingRulers.length}</span> правл.
                  </span>
                )}
                {ev.explicitLinks.length > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs font-mono text-emerald-300 shrink-0 tabular-nums">
                    · <Link2 className="w-3 h-3" /> {ev.explicitLinks.length}
                  </span>
                )}
                {hasFocusedEvent && focusDepth > 1 && focusDistance !== undefined && focusDistance >= 1 && (
                  <span className="hidden sm:inline text-xs font-sans text-emerald-300 shrink-0 tabular-nums">
                    · <span className="font-mono">{focusDistance}</span> шаг
                  </span>
                )}
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-2 shrink-0 text-xs font-sans pt-0.5 sm:pt-0">
                <div className="sm:hidden flex items-center gap-2 text-xs font-sans text-slate-400 min-w-0">
                  {ev.explicitLinks.length > 0 && (
                    <span className="inline-flex items-center gap-1 font-mono text-emerald-300 tabular-nums">
                      <Link2 className="w-3 h-3" /> {ev.explicitLinks.length}
                    </span>
                  )}
                  {ev.ruler && (
                    <span className="truncate max-w-[130px] text-slate-300">{ev.ruler}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-auto sm:ml-0">
                  {hasEndRowInStream && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onScrollToDomRow(`row-end-${ev.id}`, ev.id);
                      }}
                      className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg border border-slate-700/80 bg-slate-950/70 hover:border-amber-400/60 hover:text-amber-200 text-slate-300 transition-colors cursor-pointer font-mono text-xs tabular-nums"
                      title={`Быстрый переход к строке завершения (${effEndYear} г.)`}
                    >
                      <ArrowDown className="w-3 h-3 text-amber-400" />
                      <span>{effEndYear}</span>
                    </button>
                  )}
                  {hiddenLinksTotal > 0 && onRevealBranches && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRevealBranches(hiddenBranchSummaries.map((b) => b.branchId));
                      }}
                      className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 font-sans text-xs transition-colors cursor-pointer whitespace-nowrap tabular-nums"
                      title={`Скрытых связей: ${hiddenLinksTotal} (${hiddenBranchSummaries.map((b) => b.label).join(', ')}). Нажмите, чтобы раскрыть ветки.`}
                    >
                      <Eye className="w-3 h-3 text-amber-400" />
                      <span>
                        <span className="font-mono">+{hiddenLinksTotal}</span>:{' '}
                        {hiddenBranchSummaries
                          .slice(0, 2)
                          .map((b) => b.label)
                          .join(' · ')}
                      </span>
                    </button>
                  )}
                  {auditInfo && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-amber-300 font-mono text-xs font-semibold tabular-nums">
                      <GitCompare className="w-3 h-3" /> {auditInfo.candidates.length}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFocusEvent(ev.id);
                    }}
                    className={`px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-lg border font-sans text-xs transition-colors cursor-pointer whitespace-nowrap ${
                      isFocusedTarget
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300'
                    }`}
                    title="Изолировать связи этого события"
                  >
                    {isFocusedTarget ? 'В фокусе' : 'Фокус'}
                  </button>
                  <span className="text-amber-400 font-sans text-xs font-semibold whitespace-nowrap">
                    Паспорт →
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0 overflow-hidden py-2 pr-2.5 sm:pr-6">
            <div
              onMouseEnter={(e) =>
                onOpenCardTooltip(
                  e.currentTarget,
                  ev,
                  origBranchObj.label,
                  origBranchObj.color,
                  dateSummary,
                )
              }
              onMouseLeave={onCloseCardTooltip}
              style={
                nodeStatus.kind === 'process'
                  ? { borderLeftWidth: '3px', borderLeftColor: branchObj.color }
                  : nodeStatus.kind === 'biography'
                    ? {
                        borderLeftWidth: '3px',
                        borderLeftStyle: 'dashed',
                        borderLeftColor: branchObj.color,
                      }
                    : undefined
              }
              className={`w-full max-w-[760px] min-w-0 overflow-hidden rounded-xl border px-3 sm:px-3.5 py-2.5 transition-all flex flex-col justify-between gap-2 ${cardHighlightClass}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2.5 min-w-0 min-h-[20px]">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1 overflow-hidden">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 shrink-0">
                    <span className="font-mono text-xs font-extrabold text-slate-200 group-hover:text-white tabular-nums shrink-0">
                      {isBioNode
                        ? bioPeriodBadge
                        : axisResolution === 'year'
                          ? ev.period
                          : item.dateLabel}
                    </span>
                    {axisResolution !== 'year' &&
                      !isBioNode &&
                      !item.startedBeforeWindow &&
                      (() => {
                        const marker = getCalendarStyleAxisMarker(ev.startPrecision);
                        return marker ? (
                          <span
                            className={`font-mono text-[10px] shrink-0 whitespace-nowrap ${
                              marker.tone === 'gregorian' ? 'text-sky-300/85' : 'text-amber-300/85'
                            }`}
                            title={gutter.title}
                          >
                            {marker.label}
                          </span>
                        ) : null;
                      })()}
                    <span className="sm:hidden inline-flex items-center gap-1.5 text-xs font-sans text-slate-300 min-w-0">
                      <span aria-hidden="true" className="text-slate-400">
                        ·
                      </span>
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: origBranchObj.color }}
                      />
                      <span className="truncate max-w-[155px]">
                        {origBranchObj.short || origBranchObj.label}
                      </span>
                    </span>
                  </div>
                  <span aria-hidden="true" className="hidden sm:inline text-slate-400 shrink-0">
                    ·
                  </span>
                  <h4 className="text-[15px] leading-snug font-bold text-white group-hover:text-amber-200 transition-colors line-clamp-2 sm:truncate min-w-0">
                    <button type="button" className="text-left" onClick={openFromTitle} aria-label={`${ev.title} (${ev.period})`}>
                      {ev.title}
                    </button>
                  </h4>
                  {!isAtomic && !isBioNode && item.startedBeforeWindow && (
                    <span className="hidden lg:inline text-xs font-sans text-amber-300 shrink-0 whitespace-nowrap">
                      · с <span className="font-mono tabular-nums">{ev.startYear}</span> г.
                    </span>
                  )}
                  {hasFocusedEvent && focusDepth > 1 && focusDistance !== undefined && focusDistance >= 1 && (
                    <span className="hidden sm:inline text-xs font-sans text-emerald-300 shrink-0 whitespace-nowrap tabular-nums">
                      · <span className="font-mono">{focusDistance}</span> шаг
                    </span>
                  )}
                </div>

                <div className="hidden sm:flex items-center gap-1.5 text-xs font-sans text-slate-400 shrink-0 whitespace-nowrap">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs text-slate-300 tabular-nums"
                    title={`${nodeStatus.kindLabel}: ${nodeStatus.durationLabel}`}
                  >
                    <span style={{ color: branchObj.color }}>{nodeStatus.symbol}</span>
                    <span>
                      {nodeStatus.kind === 'milestone'
                        ? 'Веха'
                        : nodeStatus.kind === 'biography'
                          ? `Биогр. · ${nodeStatus.compactDurationLabel}`
                          : `Процесс · ${formatDurationYearsRu(Math.max(1, ev.endYear - ev.startYear))}`}
                    </span>
                    {nodeStatus.kind !== 'milestone' && (
                      <span
                        aria-hidden="true"
                        className="w-10 h-1.5 rounded-full bg-slate-800/95 border border-slate-700/70 overflow-hidden inline-block align-middle"
                      >
                        <span
                          className="block h-full rounded-full opacity-80"
                          style={{
                            marginLeft: `${nodeStatus.trackStartPct}%`,
                            width: `${nodeStatus.trackWidthPct}%`,
                            backgroundColor: branchObj.color,
                          }}
                        />
                      </span>
                    )}
                  </span>
                  <span aria-hidden="true" className="text-slate-400">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1.5 max-w-[180px] font-semibold text-slate-300">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: origBranchObj.color }}
                    />
                    <span className="truncate">{origBranchObj.label}</span>
                  </span>
                  <span aria-hidden="true" className="text-slate-400">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMacroRegion?.(isMacroRegionActive ? 'all' : primaryMacroRegionId);
                    }}
                    title={`${primaryMacroRegionOpt.label}${ev.region ? ` (${ev.region})` : ''} — нажмите для фильтрации ленты по макрорегиону`}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-mono transition-colors cursor-pointer ${
                      isMacroRegionActive
                        ? 'bg-amber-500/20 border-amber-400/70 text-amber-200 font-semibold'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-amber-400/55 hover:text-amber-200'
                    }`}
                  >
                    <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{primaryMacroRegionOpt.shortLabel}</span>
                    {ev.region &&
                      ev.region.toLowerCase() !== primaryMacroRegionOpt.shortLabel.toLowerCase() && (
                        <span className="text-slate-400 max-w-[105px] truncate hidden lg:inline">
                          · {ev.region}
                        </span>
                      )}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-[18px] min-h-[36px] overflow-hidden line-clamp-2">
                {ev.subtitle}
              </p>

              {hiddenLinksTotal > 0 && (
                <div className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-sans">
                  <div className="flex items-center gap-1.5 text-amber-200/95 min-w-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate tabular-nums">
                      Скрыто связей: <strong className="font-mono">{hiddenLinksTotal}</strong> (
                      {hiddenBranchSummaries
                        .slice(0, 3)
                        .map((b) => b.label)
                        .join(' · ')}
                      {hiddenBranchSummaries.length > 3 ? ` +${hiddenBranchSummaries.length - 3}` : ''})
                    </span>
                  </div>
                  {onRevealBranches && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRevealBranches(hiddenBranchSummaries.map((b) => b.branchId));
                      }}
                      className="px-2.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 text-amber-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Раскрыть ветки →
                    </button>
                  )}
                </div>
              )}

              {auditInfo && (
                <div className="rounded-lg bg-slate-800/55 px-2.5 py-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-sans">
                  <span className="inline-flex items-center gap-1 text-amber-300 font-semibold shrink-0 tabular-nums">
                    <GitCompare className="w-3 h-3" />
                    <span>
                      Без связи: <span className="font-mono">{auditInfo.candidates.length}</span>
                      {auditInfo.sameYearCandidatesCount > 0
                        ? ` (в том же году: ${auditInfo.sameYearCandidatesCount})`
                        : ''}
                    </span>
                  </span>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-300 min-w-0">
                    {auditInfo.candidates.slice(0, 2).map((cand) => (
                      <button
                        key={cand.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCardModal(cand.id);
                        }}
                        className="underline decoration-slate-600 hover:text-amber-200 truncate max-w-[230px] cursor-pointer text-left"
                      >
                        <span className="font-mono tabular-nums">{cand.period}</span> {cand.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-1.5 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs font-sans text-slate-400 min-w-0 min-h-[26px]">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0 flex-1">
                  <span
                    className="sm:hidden inline-flex items-center gap-1 text-xs text-slate-300 shrink-0 tabular-nums"
                    title={`${nodeStatus.kindLabel}: ${nodeStatus.durationLabel}`}
                  >
                    <span style={{ color: branchObj.color }}>{nodeStatus.symbol}</span>
                    <span className="font-mono text-[11px]">{nodeStatus.compactDurationLabel}</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMacroRegion?.(isMacroRegionActive ? 'all' : primaryMacroRegionId);
                    }}
                    title={`${primaryMacroRegionOpt.label}${ev.region ? ` (${ev.region})` : ''} — нажмите для фильтрации по макрорегиону`}
                    className={`sm:hidden inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-mono shrink-0 transition-colors cursor-pointer ${
                      isMacroRegionActive
                        ? 'bg-amber-500/20 border-amber-400/70 text-amber-200 font-semibold'
                        : 'bg-slate-950/75 border-slate-800 text-slate-300 hover:border-amber-400/50 hover:text-amber-200'
                    }`}
                  >
                    <MapPin className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                    <span>{primaryMacroRegionOpt.shortLabel}</span>
                  </button>
                  {ev.ruler && (
                    <span
                      className={`inline-flex items-center gap-1 min-w-0 truncate ${
                        hasMultipleRulers && !isBioNode
                          ? 'text-slate-200 font-semibold'
                          : 'text-slate-300'
                      }`}
                    >
                      <Crown className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {isBioNode
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
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-300 font-semibold shrink-0 tabular-nums">
                      <Link2 className="w-3 h-3 shrink-0" />
                      <span>{ev.explicitLinks.length}</span>
                    </span>
                  )}

                  {(ev.concurrentCount ?? ev.concurrentEvents.length) > 0 && (
                    <span className="hidden md:inline font-mono text-xs text-slate-300 shrink-0 tabular-nums">
                      ∥ {ev.concurrentCount ?? ev.concurrentEvents.length}
                    </span>
                  )}

                  {ev.subEvents && ev.subEvents.length > 0 && (
                    <span className="hidden md:inline font-mono text-xs text-slate-300 shrink-0 tabular-nums">
                      ↳ {ev.subEvents.length}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 font-sans text-xs whitespace-nowrap ml-auto sm:ml-0">
                  {hasEndRowInStream && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onScrollToDomRow(`row-end-${ev.id}`, ev.id);
                      }}
                      className="px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-lg border border-slate-700/80 bg-slate-950/70 hover:border-amber-400/60 hover:text-amber-200 text-slate-300 inline-flex items-center gap-1 transition-colors cursor-pointer tabular-nums"
                      title={`Прокрутить ленту к точке завершения (${effEndYear} г.)`}
                    >
                      <ArrowDown className="w-3 h-3 text-amber-400" />
                      <span className="hidden sm:inline">К концу</span>
                      <span className="font-mono">({effEndYear})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFocusEvent(ev.id);
                    }}
                    className={`px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-lg border inline-flex items-center gap-1 transition-colors cursor-pointer ${
                      isFocusedTarget
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                        : 'bg-slate-950/70 border-slate-700/80 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300'
                    }`}
                    title="Изолировать событие, его прямые связи и параллельные процессы"
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>{isFocusedTarget ? 'В фокусе' : 'Фокус'}</span>
                  </button>

                  <span className="px-1.5 py-1 sm:p-0 text-amber-400 font-semibold group-hover:underline inline-flex items-center gap-1">
                    <GitCommitHorizontal className="w-3.5 h-3.5" />
                    <span>Паспорт →</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } else if (item.rowType === 'EVENT_END' && eventMeta) {
    const ev = item.eventObj;
    const { branchObj, baseX, commitX, isBioNode, effStartYear } = eventMeta;
    const hasBaseContinuingAfter = rowRails.hasBaseContinuingAtEnd;
    const mergeTargetX = hasBaseContinuingAfter ? baseX : timeSpineX;
    const mergeY = 22;

    rowEl = (
      <div
        id={`row-end-${ev.id}`}
        onClick={() => onOpenCardModal(ev.id)}
        onMouseEnter={() => onActivateHoverEvent(ev.id)}
        onMouseLeave={() => onScheduleClearHoverEvent()}
        className="timeline-row-cv relative flex items-stretch hover:bg-slate-900/40 transition-colors cursor-pointer group focus-within:ring-2 focus-within:ring-inset focus-within:ring-amber-400/80"
      >
        <div
          title={gutter.title}
          className={`${gutterWidthClass} shrink-0 border-r border-slate-800/50 bg-slate-950/25 px-2 sm:px-2.5 py-2 flex-col items-end justify-center font-mono text-[10px] leading-tight tabular-nums whitespace-nowrap select-none transition-colors ${
            isSelfHovered
              ? 'text-slate-100'
              : gutter.isDuplicate
                ? 'text-slate-400/75 group-hover:text-slate-200'
                : 'text-slate-300 group-hover:text-white'
          }`}
        >
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="text-[9px] text-slate-400 group-hover:text-slate-200">
              ↵
            </span>
            <span>{gutter.label}</span>
          </span>
          {gutter.styleLabel && (
            <span
              className={`text-[9px] font-normal ${
                gutter.styleTone === 'gregorian' ? 'text-sky-300/80' : 'text-amber-300/80'
              }`}
            >
              {gutter.styleLabel}
            </span>
          )}
        </div>

        {!isDesktopGraph ? (
          renderMobileSpine({
            kind: 'event_end',
            color: branchObj.color,
            showBusSegment,
            busY1,
            busY2,
          })
        ) : (
          <div
            className="hidden sm:block shrink-0 relative select-none overflow-hidden"
            style={{ width: `${svgWidth}px` }}
          >
            <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
              {renderPrecomputedDesktopRails({
                rowRails,
                hasRulersLane,
                rulerLayout,
                timeSpineX,
                connectorBusX,
                thematicLanes,
                subLaneLayout,
                showBusSegment,
                busY1,
                busY2,
                dimOtherPassingRails,
                hoveredPassingRailId,
                linkedPassingRailSet,
              })}
              <line
                x1={commitX}
                y1={0}
                x2={commitX}
                y2={mergeY - 4}
                stroke={branchObj.color}
                strokeWidth={isSelfHovered ? 3.6 : 2.6}
                strokeOpacity={isSelfHovered ? 1 : 0.65}
              />
              <path
                d={`M ${commitX} ${mergeY - 4} C ${commitX} ${mergeY + 10}, ${mergeTargetX + 12} ${mergeY + 4}, ${mergeTargetX} ${mergeY + 10}`}
                fill="none"
                stroke={branchObj.color}
                strokeWidth={isSelfHovered ? 2.6 : 1.9}
                strokeDasharray="3 2"
                strokeOpacity={isSelfHovered ? 1 : 0.65}
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
        )}

        <div className="flex-1 min-w-0 overflow-hidden py-2 pr-2.5 sm:pr-6">
          <div
            className={`w-full max-w-[760px] min-w-0 overflow-hidden rounded-lg border px-3 sm:px-3.5 min-h-[36px] py-1.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-2 gap-y-1.5 text-xs transition-all ${
              isJumpHighlighted
                ? 'jump-target-highlighted'
                : 'bg-slate-900/40 border-slate-800/70 group-hover:border-slate-700'
            }`}
          >
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-0.5 min-w-0 flex-1 overflow-hidden">
              <Flag className="w-3.5 h-3.5 shrink-0" style={{ color: branchObj.color }} />
              <span className="font-mono font-bold text-slate-200 tabular-nums shrink-0">
                {item.dateLabel}
              </span>
              {axisResolution !== 'year' &&
                (() => {
                  const marker = getCalendarStyleAxisMarker(ev.endPrecision);
                  return marker ? (
                    <span
                      className={`font-mono text-[10px] shrink-0 whitespace-nowrap ${
                        marker.tone === 'gregorian' ? 'text-sky-300/80' : 'text-amber-300/80'
                      }`}
                    >
                      {marker.label}
                    </span>
                  ) : null;
                })()}
              <span className="text-slate-400 font-sans text-xs shrink-0 hidden sm:inline">
                {isBioNode
                  ? 'Завершение жизненного и творческого пути:'
                  : branchObj.isMilitary || ev.task.startsWith('WAR_')
                    ? 'Окончание кампании:'
                    : 'Завершение процесса:'}
              </span>
              <button
                type="button"
                aria-label={`Окончание: ${ev.title} (${item.dateLabel})`}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenCardModal(ev.id);
                }}
                className="font-semibold text-slate-200 group-hover:text-white line-clamp-2 sm:truncate min-w-0 text-left"
              >
                {formatEventTitleWithPeriod(ev)}
              </button>
            </div>
            <div className="flex items-center gap-2 shrink-0 font-sans text-xs tabular-nums whitespace-nowrap ml-auto sm:ml-0">
              <span className="text-slate-400 hidden sm:inline">
                {ev.overlappingRulers.length > 1
                  ? `Правлений: ${ev.overlappingRulers.length}`
                  : ev.duration > 0
                    ? formatDurationYearsRu(ev.duration)
                    : 'Завершение'}
              </span>
              {hasStartRowInStream && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onScrollToDomRow(timelineEventAnchor(ev.id, 'graph'), ev.id);
                  }}
                  className="px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-lg border border-slate-700/80 bg-slate-950/70 hover:border-amber-400/60 hover:text-amber-200 text-slate-300 inline-flex items-center gap-1 transition-colors cursor-pointer"
                  title={`Вернуться к началу процесса (${effStartYear} г.)`}
                >
                  <ArrowUp className="w-3 h-3 text-amber-400" />
                  <span className="hidden md:inline">К началу</span>
                  <span className="font-mono">({effStartYear})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    return null;
  }

  return spacerEl ? (
    <Fragment>
      {spacerEl}
      {rowEl}
    </Fragment>
  ) : (
    rowEl
  );
});
