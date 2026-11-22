import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Compass,
  GitBranch,
  Link2,
  Route,
  X,
} from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import {
  ERA_SPHERE_ORDER,
  computeEraAnalyticalProfile,
  type EraIntensityBucket,
} from '../engine/timelineEngine';
import type {
  BranchDefinition,
  EnrichedEvent,
  EraEventSphereId,
} from '../types/timeline';

interface EraAnalyticalProfileSectionProps {
  events: EnrichedEvent[];
  yearFrom: number;
  yearTo: number;
  branches: BranchDefinition[];
  periodLabel: string;
  onSelectEvent: (eventId: string) => void;
  onFocusSubWindow?: (from: number, to: number) => void;
}

const SPHERE_CHART_COLORS: Record<EraEventSphereId, { fill: string; legendBg: string; label: string }> = {
  wars: { fill: '#f43f5e', legendBg: 'bg-rose-400', label: 'Войны' },
  reforms: { fill: '#f59e0b', legendBg: 'bg-amber-400', label: 'Реформы' },
  diplomacy: { fill: '#10b981', legendBg: 'bg-emerald-400', label: 'Дипломатия' },
  world: { fill: '#38bdf8', legendBg: 'bg-sky-400', label: 'Мир' },
  science: { fill: '#a78bfa', legendBg: 'bg-violet-400', label: 'Наука' },
};

const OTHER_FILL = '#64748b';

export const EraAnalyticalProfileSection = memo(function EraAnalyticalProfileSection({
  events,
  yearFrom,
  yearTo,
  branches,
  periodLabel,
  onSelectEvent,
  onFocusSubWindow,
}: EraAnalyticalProfileSectionProps) {
  const [selectedBucketIdx, setSelectedBucketIdx] = useState<number | null>(null);
  const [isGuidedModeOpen, setIsGuidedModeOpen] = useState(false);
  const [guidedStepIdx, setGuidedStepIdx] = useState(0);

  const profile = useMemo(
    () => computeEraAnalyticalProfile(events, yearFrom, yearTo, branches),
    [events, yearFrom, yearTo, branches],
  );

  const selectedBucket: EraIntensityBucket | null =
    selectedBucketIdx !== null ? profile.buckets[selectedBucketIdx] ?? null : null;

  const selectedBucketEvents = useMemo(() => {
    if (!selectedBucket) return [];
    return events
      .filter((ev) => ev.startYear >= selectedBucket.fromYear && ev.startYear <= selectedBucket.toYear)
      .sort((a, b) => a.startYear - b.startYear)
      .slice(0, 8);
  }, [events, selectedBucket]);

  const routeEvents = profile.guidedRouteEvents;
  const clampedStepIdx = Math.min(guidedStepIdx, Math.max(0, routeEvents.length - 1));
  const currentRouteEvent = routeEvents[clampedStepIdx] ?? null;

  if (events.length === 0) return null;

  const chartHeight = 96;
  const bucketCount = Math.max(1, profile.buckets.length);
  const slotWidth = 60;
  const chartWidth = bucketCount * slotWidth;
  const maxTotal = Math.max(1, profile.maxBucketTotal);

  return (
    <section className="space-y-5 pt-1">
      {/* 1. Пульс интенсивности периода по под-отрезкам */}
      <div className="rounded-xl bg-slate-900/70 border border-slate-800/90 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 inline-flex items-center gap-2 font-semibold">
              <BarChart3 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Пульс интенсивности: {periodLabel}</span>
            </h4>
            <p className="text-xs text-slate-400">
              Распределение событий по хронологическим отрезкам и 5 сферам (нажмите на столбец для разбора)
            </p>
          </div>

          {routeEvents.length >= 2 && (
            <button
              type="button"
              onClick={() => {
                setIsGuidedModeOpen((prev) => !prev);
                setGuidedStepIdx(0);
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isGuidedModeOpen
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-amber-500/12 hover:bg-amber-500/22 border-amber-500/40 text-amber-200'
              }`}
            >
              <Route className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isGuidedModeOpen
                  ? 'Свернуть маршрут'
                  : `Пройти период (${routeEvents.length} вех)`}
              </span>
            </button>
          )}
        </div>

        {/* Интерактивная пошаговая экскурсия по эпохе */}
        {isGuidedModeOpen && currentRouteEvent && (
          <div className="rounded-xl bg-[#070d1b] border border-amber-500/35 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="inline-flex items-center gap-2 text-amber-300 font-semibold tabular-nums">
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Маршрут изучения · шаг {clampedStepIdx + 1} из {routeEvents.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={clampedStepIdx === 0}
                  onClick={() => setGuidedStepIdx((prev) => Math.max(0, prev - 1))}
                  className={`px-2.5 py-1 rounded-lg border text-xs inline-flex items-center gap-1 transition-colors ${
                    clampedStepIdx === 0
                      ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                      : 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 cursor-pointer'
                  }`}
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Назад</span>
                </button>
                <button
                  type="button"
                  disabled={clampedStepIdx >= routeEvents.length - 1}
                  onClick={() =>
                    setGuidedStepIdx((prev) => Math.min(routeEvents.length - 1, prev + 1))
                  }
                  className={`px-2.5 py-1 rounded-lg border text-xs inline-flex items-center gap-1 transition-colors ${
                    clampedStepIdx >= routeEvents.length - 1
                      ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                      : 'border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 cursor-pointer'
                  }`}
                >
                  <span>Далее</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsGuidedModeOpen(false)}
                  aria-label="Закрыть маршрут изучения"
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Прогресс-индикатор шагов */}
            <div className="flex items-center gap-1">
              {routeEvents.map((ev, idx) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setGuidedStepIdx(idx)}
                  aria-label={`Шаг ${idx + 1}: ${ev.title} (${ev.period})`}
                  title={`${ev.period} · ${ev.title}`}
                  className={`h-1.5 flex-1 rounded-full transition-colors cursor-pointer ${
                    idx === clampedStepIdx
                      ? 'bg-amber-400'
                      : idx < clampedStepIdx
                        ? 'bg-amber-500/45 hover:bg-amber-400/70'
                        : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <span className="font-mono text-xs font-bold text-amber-300 tabular-nums">
                  {currentRouteEvent.period}
                </span>
                <span className="font-serif text-lg sm:text-xl font-bold text-white leading-snug">
                  {currentRouteEvent.title}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                {currentRouteEvent.subtitle}
              </p>

              {currentRouteEvent.outcomesByScope ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs border-t border-slate-800/75">
                  <div className="space-y-0.5">
                    <div className="font-mono text-[11px] text-amber-300 font-semibold">
                      Для России
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {currentRouteEvent.outcomesByScope.russia}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-mono text-[11px] text-sky-300 font-semibold">
                      Для мира
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {currentRouteEvent.outcomesByScope.world}
                    </p>
                  </div>
                </div>
              ) : currentRouteEvent.outcome ? (
                <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800/75 pt-2 max-w-3xl">
                  <span className="font-mono text-slate-300 font-semibold">Итог: </span>
                  {currentRouteEvent.outcome}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs font-mono">
                <span className="text-slate-400 tabular-nums">
                  {currentRouteEvent.ruler ? `${currentRouteEvent.ruler} · ` : ''}
                  связей: {currentRouteEvent.explicitLinks.length}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectEvent(currentRouteEvent.id)}
                  className="text-amber-300 hover:text-amber-200 inline-flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Открыть полный паспорт →</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SVG-гистограмма интенсивности (без инлайн-style) */}
        <div className="space-y-2">
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight + 24}`}
              className="w-full min-w-[360px] h-32 select-none"
              role="img"
              aria-label={`График интенсивности событий в периоде ${periodLabel}`}
            >
              {/* Базовая линия */}
              <line
                x1={0}
                y1={chartHeight}
                x2={chartWidth}
                y2={chartHeight}
                stroke="#334155"
                strokeWidth={1}
              />

              {profile.buckets.map((bucket, idx) => {
                const x = idx * slotWidth + 10;
                const barWidth = slotWidth - 20;
                const isSelected = selectedBucketIdx === idx;
                let currentY = chartHeight;

                const segments: Array<{ key: string; y: number; h: number; fill: string }> = [];
                for (const sphereId of ERA_SPHERE_ORDER) {
                  const count = bucket.sphereCounts[sphereId];
                  if (count <= 0) continue;
                  const segH = Math.max(3, (count / maxTotal) * (chartHeight - 14));
                  currentY -= segH;
                  segments.push({
                    key: sphereId,
                    y: currentY,
                    h: segH,
                    fill: SPHERE_CHART_COLORS[sphereId].fill,
                  });
                }
                if (bucket.otherCount > 0) {
                  const segH = Math.max(3, (bucket.otherCount / maxTotal) * (chartHeight - 14));
                  currentY -= segH;
                  segments.push({
                    key: 'other',
                    y: currentY,
                    h: segH,
                    fill: OTHER_FILL,
                  });
                }

                return (
                  <g
                    key={bucket.index}
                    onClick={() =>
                      setSelectedBucketIdx((prev) => (prev === idx ? null : idx))
                    }
                    className="cursor-pointer"
                  >
                    <title>
                      {`${bucket.label}: ${bucket.total} соб. (войны ${bucket.sphereCounts.wars}, реформы ${bucket.sphereCounts.reforms}, дипломатия ${bucket.sphereCounts.diplomacy}, мир ${bucket.sphereCounts.world}, наука ${bucket.sphereCounts.science})`}
                    </title>
                    <rect
                      x={idx * slotWidth + 2}
                      y={0}
                      width={slotWidth - 4}
                      height={chartHeight + 22}
                      rx={6}
                      fill={isSelected ? '#f59e0b' : '#1e293b'}
                      fillOpacity={isSelected ? 0.14 : 0}
                    />
                    {segments.map((seg) => (
                      <rect
                        key={seg.key}
                        x={x}
                        y={seg.y}
                        width={barWidth}
                        height={seg.h}
                        rx={2}
                        fill={seg.fill}
                        fillOpacity={isSelected ? 1 : 0.85}
                      />
                    ))}
                    {bucket.total > 0 && (
                      <text
                        x={x + barWidth / 2}
                        y={Math.max(10, currentY - 4)}
                        textAnchor="middle"
                        fill={isSelected ? '#fcd34d' : '#cbd5e1'}
                        fontSize={10}
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {bucket.total}
                      </text>
                    )}
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight + 15}
                      textAnchor="middle"
                      fill={isSelected ? '#fde68a' : '#94a3b8'}
                      fontSize={9}
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {bucket.fromYear}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Тихая типографская легенда */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {ERA_SPHERE_ORDER.map((sphereId) => (
                <span key={sphereId} className="inline-flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-xs ${SPHERE_CHART_COLORS[sphereId].legendBg}`}
                    aria-hidden="true"
                  />
                  <span>{SPHERE_CHART_COLORS[sphereId].label}</span>
                </span>
              ))}
            </div>
            {selectedBucket && (
              <button
                type="button"
                onClick={() => setSelectedBucketIdx(null)}
                className="text-amber-300 hover:text-amber-200 cursor-pointer"
              >
                Сбросить выбор отрезка
              </button>
            )}
          </div>
        </div>

        {/* Выбранный под-отрезок из гистограммы */}
        {selectedBucket && (
          <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <span className="text-amber-300 font-semibold tabular-nums">
                Отрезок {selectedBucket.label} гг. · {selectedBucket.total} событий
              </span>
              {onFocusSubWindow && (
                <button
                  type="button"
                  onClick={() => onFocusSubWindow(selectedBucket.fromYear, selectedBucket.toYear)}
                  className="text-sky-300 hover:text-sky-200 underline underline-offset-4 cursor-pointer"
                >
                  Показать этот отрезок на ленте →
                </button>
              )}
            </div>
            {selectedBucketEvents.length > 0 ? (
              <div className="divide-y divide-slate-800/60">
                {selectedBucketEvents.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onSelectEvent(ev.id)}
                    className="w-full text-left py-1.5 text-xs flex items-baseline justify-between gap-3 hover:text-amber-200 text-slate-200 transition-colors cursor-pointer group"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-mono text-amber-300/90 tabular-nums mr-2">
                        {ev.period}
                      </span>
                      <span className="group-hover:underline">{ev.title}</span>
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-amber-300 shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">В этом отрезке не зафиксировано стартов событий.</p>
            )}
          </div>
        )}
      </div>

      {/* 2. Ключевые развилки периода (наивысшая причинная центральность) */}
      {profile.turningPoints.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 inline-flex items-center gap-2 font-semibold">
              <GitBranch className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Ключевые развилки и узлы влияния</span>
            </h4>
            <span className="text-[11px] font-mono text-slate-500">
              по числу причинно-следственных связей
            </span>
          </div>

          <div className="divide-y divide-slate-800/75 border-y border-slate-800/75">
            {profile.turningPoints.map((tp) => (
              <button
                key={tp.event.id}
                type="button"
                onClick={() => onSelectEvent(tp.event.id)}
                className="w-full text-left py-2.5 px-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 hover:bg-slate-900/50 transition-colors cursor-pointer group"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-mono text-xs font-bold text-amber-300 tabular-nums shrink-0">
                      {tp.event.period}
                    </span>
                    <span className="text-sm font-semibold text-white group-hover:text-amber-200 transition-colors">
                      {tp.event.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1 max-w-2xl">
                    {tp.event.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono shrink-0 tabular-nums">
                  {tp.incomingCausalCount > 0 && (
                    <span className="text-sky-300" title="Входящие причины">
                      ← {tp.incomingCausalCount}
                    </span>
                  )}
                  {tp.outgoingCausalCount > 0 && (
                    <span className="text-emerald-300" title="Исходящие следствия">
                      → {tp.outgoingCausalCount}
                    </span>
                  )}
                  <span
                    className="inline-flex items-center gap-1 text-slate-400"
                    title="Всего явных связей"
                  >
                    <Link2 className="w-3 h-3" />
                    {tp.totalExplicitLinks}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-300" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
});
