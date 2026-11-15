import { Crown, Flag, GitCommitHorizontal, Link2, Zap } from 'lucide-react';
import { getGitHash, resolveEventBranch } from '../engine/timelineEngine';
import type {
  BranchDefinition,
  EnrichedEvent,
  MilitaryBranchMode,
  StreamRow,
  SyncManifest,
} from '../types/timeline';

interface GitTimelineProps {
  stream: StreamRow[];
  matchingEvents: EnrichedEvent[];
  visibleLanes: BranchDefinition[];
  branches: BranchDefinition[];
  militaryBranchMode: MilitaryBranchMode;
  manifest: SyncManifest;
  yearFrom: number;
  hoveredEventId: string | null;
  onHoverEvent: (eventId: string | null) => void;
  onOpenCardModal: (eventId: string) => void;
  onOpenPeriodModal: (rulerId: string) => void;
  onSelectYearRange: (from: number, to: number) => void;
}

export function GitTimeline({
  stream,
  matchingEvents,
  visibleLanes,
  branches,
  militaryBranchMode,
  manifest,
  yearFrom,
  hoveredEventId,
  onHoverEvent,
  onOpenCardModal,
  onOpenPeriodModal,
  onSelectYearRange,
}: GitTimelineProps) {
  const laneSpacing = 22;
  const leftPad = 18;
  const svgWidth = Math.max(88, leftPad * 2 + Math.max(0, visibleLanes.length - 1) * laneSpacing);
  const getLaneX = (laneIdx: number) => leftPad + laneIdx * laneSpacing;
  const trunkIdx = visibleLanes.findIndex((l) => l.id === 'MAIN_RULERS');
  const trunkX = getLaneX(trunkIdx >= 0 ? trunkIdx : 0);

  const alreadyRunningEvents = matchingEvents.filter((ev) => ev.startYear < yearFrom);

  const hoveredEvent = hoveredEventId ? (matchingEvents.find((e) => e.id === hoveredEventId) ?? null) : null;
  const linkedEventIds = new Set<string>();
  if (hoveredEventId) {
    (manifest.crossLinks || []).forEach((lnk) => {
      if (lnk.from === hoveredEventId) linkedEventIds.add(lnk.to);
      if (lnk.to === hoveredEventId) linkedEventIds.add(lnk.from);
    });
  }

  function renderRailsForYear(year: number, highlightLaneIdx = -1) {
    return visibleLanes.map((lane, i) => {
      const x = getLaneX(i);

      if (lane.id === 'MAIN_RULERS') {
        return (
          <line
            key={lane.id}
            x1={x}
            y1={0}
            x2={x}
            y2={400}
            stroke={lane.color}
            strokeWidth={3.5}
            strokeOpacity={0.9}
          />
        );
      }

      const activeCount = matchingEvents.filter(
        (ev) =>
          resolveEventBranch(ev, branches, militaryBranchMode).id === lane.id &&
          ev.startYear <= year &&
          ev.endYear >= year,
      ).length;

      if (activeCount === 0 && i !== highlightLaneIdx) {
        return (
          <line
            key={lane.id}
            x1={x}
            y1={0}
            x2={x}
            y2={400}
            stroke={lane.color}
            strokeWidth={1.5}
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
              y2={400}
              stroke={lane.color}
              strokeWidth={2.2}
              strokeOpacity={0.95}
            />
            <line
              x1={x + 3}
              y1={0}
              x2={x + 3}
              y2={400}
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
          y2={400}
          stroke={lane.color}
          strokeWidth={3.5}
          strokeOpacity={0.92}
        />
      );
    });
  }

  return (
    <div>
      <div className="sticky top-[45px] z-20 bg-[#050811]/95 backdrop-blur-md border border-slate-800/90 rounded-t-2xl px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2 shadow-md">
        <div className="flex flex-wrap items-center gap-1.5">
          {visibleLanes.map((lane) => (
            <div
              key={lane.id}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lane.color }} />
              <span>{lane.short}</span>
            </div>
          ))}
        </div>
        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
          <span className="hidden sm:inline">Наведите на карточку для подсветки пересечений и связей</span>
          <span className="text-amber-300 font-semibold">Клик = git show</span>
        </div>
      </div>

      <div className="border-x border-b border-slate-800/90 rounded-b-2xl bg-slate-950/40 divide-y divide-slate-800/50">
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
                className="relative flex items-stretch bg-gradient-to-r from-amber-500/10 via-slate-900/95 to-slate-950 border-y border-amber-500/30"
              >
                <div className="shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                  <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                    {renderRailsForYear(item.year)}
                    {visibleLanes.map((lane, laneIdx) => {
                      if (laneIdx === trunkIdx || (trunkIdx < 0 && laneIdx === 0)) return null;
                      const targetX = getLaneX(laneIdx);
                      return (
                        <path
                          key={lane.id}
                          d={`M ${trunkX} 36 C ${trunkX} 76, ${targetX} 56, ${targetX} 105`}
                          fill="none"
                          stroke={lane.color}
                          strokeWidth={2.4}
                          strokeOpacity={0.9}
                        />
                      );
                    })}
                    <circle cx={trunkX} cy={36} r={11} fill="#050811" stroke="#f59e0b" strokeWidth={4} />
                    <circle cx={trunkX} cy={36} r={5} fill="#f59e0b" />
                  </svg>
                </div>

                <div className="flex-1 py-4 pr-4 sm:pr-6">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="px-2.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black tabular-nums">
                      НОВАЯ ЭПОХА {era.roman} · {era.period}
                    </span>
                    <span className="text-amber-300/90">
                      Разветвление направлений этапа {era.roman}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-xl font-extrabold text-white mt-1.5 [text-wrap:balance]">
                    {era.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">{era.thesis}</p>
                  {carryOverWars.length > 0 && (
                    <div className="mt-2.5 text-[11px] font-mono text-sky-300 bg-sky-500/10 border border-sky-500/30 rounded-lg px-2.5 py-1 inline-block">
                      Сквозь границу эпохи продолжают идти:{' '}
                      {carryOverWars.map((w) => `${w.title} (${w.period})`).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (item.rowType === 'RULER_COMMIT') {
            const r = item.rulerObj;
            const commitHash = getGitHash(r.id);
            const ongoingWarsAtAccession = matchingEvents.filter(
              (ev) => ev.startYear < r.startYear && ev.endYear > r.startYear,
            );

            return (
              <div
                key={`ruler-${r.id}`}
                id={r.id}
                className="relative flex items-stretch bg-slate-900/85 hover:bg-slate-900 transition-colors"
              >
                <div className="shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                  <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                    {renderRailsForYear(item.year, Math.max(0, trunkIdx))}
                    {ongoingWarsAtAccession.map((ev) => {
                      const bObj = resolveEventBranch(ev, branches, militaryBranchMode);
                      const lIdx = visibleLanes.findIndex((l) => l.id === bObj.id);
                      if (lIdx <= 0) return null;
                      const targetX = getLaneX(lIdx);
                      return (
                        <g key={ev.id}>
                          <line
                            x1={trunkX + 8}
                            y1={32}
                            x2={targetX}
                            y2={32}
                            stroke={bObj.color}
                            strokeWidth={1.8}
                            strokeDasharray="2 2"
                            strokeOpacity={0.85}
                          />
                          <circle cx={targetX} cy={32} r={3.5} fill={bObj.color} />
                        </g>
                      );
                    })}
                    <circle cx={trunkX} cy={32} r={8.5} fill="#050811" stroke="#f59e0b" strokeWidth={3.5} />
                    <circle cx={trunkX} cy={32} r={3.5} fill="#f59e0b" />
                  </svg>
                </div>

                <div className="flex-1 py-3.5 pr-4 sm:pr-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-amber-300 font-mono text-xs font-black tabular-nums">
                        <Crown className="w-3.5 h-3.5" />
                        {r.reignPeriod}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-white">{r.ruler}</span>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">main #{commitHash}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectYearRange(r.startYear, r.endYear)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap"
                        title="Отфильтровать таймлайн строго по годам этого правления"
                      >
                        Фокус: {r.startYear}–{r.endYear}
                      </button>
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
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-amber-200/90 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-1.5">
                      <span>Смена правителя в ходе идущих кампаний:</span>
                      {ongoingWarsAtAccession.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => onOpenCardModal(w.id)}
                          className="px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-700 text-white hover:border-amber-400 cursor-pointer"
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

          if (item.rowType === 'EVENT_COMMIT') {
            const ev = item.eventObj;
            const branchObj = resolveEventBranch(ev, branches, militaryBranchMode);
            const origBranchObj = branches.find((b) => b.id === ev.task) || branchObj;
            const laneIdx = Math.max(0, visibleLanes.findIndex((l) => l.id === branchObj.id));
            const commitX = getLaneX(laneIdx);
            const commitY = 34;
            const commitHash = getGitHash(ev.id);
            const hasMultipleRulers = ev.overlappingRulers.length > 1;
            const concurrentPreview = ev.concurrentEvents.slice(0, 3);

            const isCrossLinked = hoveredEventId !== null && linkedEventIds.has(ev.id);
            const isOverlapping =
              hoveredEvent !== null &&
              hoveredEvent.id !== ev.id &&
              ev.startYear <= hoveredEvent.endYear &&
              ev.endYear >= hoveredEvent.startYear;
            const isSelfHovered = hoveredEventId === ev.id;

            let cardHighlightClass = 'border-slate-800/90 group-hover:border-slate-600 bg-slate-900/75 group-hover:bg-slate-900';
            if (isCrossLinked) {
              cardHighlightClass = 'crosslink-highlighted';
            } else if (isOverlapping || isSelfHovered) {
              cardHighlightClass = 'overlap-highlighted';
            }

            return (
              <div
                key={`commit-${ev.id}-${idx}`}
                id={`row-${ev.id}`}
                onClick={() => onOpenCardModal(ev.id)}
                onMouseEnter={() => onHoverEvent(ev.id)}
                onMouseLeave={() => onHoverEvent(null)}
                className="commit-row relative flex items-stretch hover:bg-slate-900/40 transition-colors cursor-pointer group"
              >
                <div className="shrink-0 relative select-none overflow-hidden" style={{ width: `${svgWidth}px` }}>
                  <svg className="w-full h-full absolute inset-0" width={svgWidth} height="100%">
                    {renderRailsForYear(item.year, laneIdx)}
                    {!item.startedBeforeWindow && laneIdx > 0 && (
                      <path
                        d={`M ${trunkX} 4 C ${trunkX} 24, ${commitX} 14, ${commitX} ${commitY}`}
                        fill="none"
                        stroke={branchObj.color}
                        strokeWidth={1.6}
                        strokeOpacity={0.55}
                      />
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
                    <circle
                      className="commit-node-ring"
                      cx={commitX}
                      cy={commitY}
                      r={9.5}
                      fill={branchObj.color}
                      fillOpacity={0.22}
                    />
                    <circle
                      cx={commitX}
                      cy={commitY}
                      r={5.5}
                      fill="#050811"
                      stroke={branchObj.color}
                      strokeWidth={3}
                    />
                    <circle cx={commitX} cy={commitY} r={2.2} fill={branchObj.color} />
                  </svg>
                </div>

                <div className="flex-1 py-2.5 pr-3 sm:pr-6">
                  <div className={`rounded-xl border p-3.5 sm:p-4 transition-all ${cardHighlightClass}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="font-mono text-xs font-extrabold tabular-nums"
                            style={{ color: branchObj.color }}
                          >
                            {ev.period}
                          </span>
                          {item.startedBeforeWindow && (
                            <>
                              <span aria-hidden="true" className="text-slate-600">
                                ·
                              </span>
                              <span className="text-[11px] font-mono text-amber-300">
                                идет с {ev.startYear} г.
                              </span>
                            </>
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

                      <span className="text-amber-400 font-mono font-semibold group-hover:underline shrink-0 inline-flex items-center gap-1">
                        <GitCommitHorizontal className="w-3.5 h-3.5" />
                        git show →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // EVENT_END: точка завершения длительного процесса / войны
          const ev = item.eventObj;
          const branchObj = resolveEventBranch(ev, branches, militaryBranchMode);
          const laneIdx = Math.max(0, visibleLanes.findIndex((l) => l.id === branchObj.id));
          const commitX = getLaneX(laneIdx);
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
                  {renderRailsForYear(item.year, laneIdx)}
                  {laneIdx > 0 && (
                    <path
                      d={`M ${commitX} ${mergeY} C ${commitX} ${mergeY + 12}, ${trunkX} ${mergeY + 4}, ${trunkX} ${mergeY + 18}`}
                      fill="none"
                      stroke={branchObj.color}
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      strokeOpacity={0.65}
                    />
                  )}
                  <rect
                    x={commitX - 4.5}
                    y={mergeY - 4.5}
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
                      {ev.endYear} г.
                    </span>
                    <span className="text-slate-400 font-mono">Завершение кампании:</span>
                    <span className="font-semibold text-slate-200 group-hover:text-white truncate">
                      {ev.title} ({ev.period})
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {ev.overlappingRulers.length > 1
                      ? `Сменилось правлений: ${ev.overlappingRulers.length}`
                      : `Длительность: ${ev.duration} лет`}
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
