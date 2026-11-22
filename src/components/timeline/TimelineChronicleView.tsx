import { chronicleEraAnchor, timelineEventAnchor } from './timelineAnchors';
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Crown,
  Link2,
} from 'lucide-react';
import { Fragment, memo, useMemo, useState } from 'react';
import type { BranchDefinition, EraEventSphereId } from '../../types/timeline';
import {
  CHRONICLE_SPHERE_LABELS,
  ERA_SPHERE_ORDER,
  type ChronicleSphereFilter,
  type TimelineChronicleData,
} from './timelineChronicleModel';

interface TimelineChronicleViewProps {
  chronicle: TimelineChronicleData;
  branches: BranchDefinition[];
  sphereFilter: ChronicleSphereFilter;
  onChangeSphereFilter: (sphere: ChronicleSphereFilter) => void;
  collapsedEras: Record<string, boolean>;
  onToggleEraCollapsed: (eraId: string) => void;
  onToggleAllEras: (collapseAll: boolean) => void;
  selectedEventId: string | null;
  focusedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  onOpenCardModal: (eventId: string) => void;
  onOpenEraModal: (eraId: string) => void;
  onOpenPeriodModal: (rulerId: string) => void;
}

const CHAPTER_PAGE_SIZE = 24;

export const TimelineChronicleView = memo(function TimelineChronicleView({
  chronicle,
  branches,
  sphereFilter,
  onChangeSphereFilter,
  collapsedEras,
  onToggleEraCollapsed,
  onToggleAllEras,
  selectedEventId,
  focusedEventId,
  onSelectEvent,
  onOpenCardModal,
  onOpenEraModal,
  onOpenPeriodModal,
}: TimelineChronicleViewProps) {
  const [visibleCountByEra, setVisibleCountByEra] = useState<Record<string, number>>({});
  const branchById = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);
  const allCollapsed =
    chronicle.chapters.length > 0 &&
    chronicle.chapters.every((ch) => Boolean(collapsedEras[ch.era.id]));

  return (
    <div className="bg-[#070d1b]/90">
      {/* Панель фильтра по 5 сферам + свернуть/развернуть все главы */}
      <div className="px-3 sm:px-5 py-2.5 border-b border-slate-800/80 bg-slate-950/70 flex flex-wrap items-center justify-between gap-2">
        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Фильтр хроники по 5 сферам"
        >
          <button
            type="button"
            aria-pressed={sphereFilter === 'all'}
            onClick={() => onChangeSphereFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer tabular-nums whitespace-nowrap ${
              sphereFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            Все ({chronicle.totalMatchingEvents})
          </button>

          {ERA_SPHERE_ORDER.map((sphereId: EraEventSphereId) => {
            const count = chronicle.sphereTotals[sphereId];
            const isActive = sphereFilter === sphereId;
            return (
              <button
                key={sphereId}
                type="button"
                aria-pressed={isActive}
                disabled={count === 0 && !isActive}
                onClick={() => onChangeSphereFilter(sphereId)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors tabular-nums whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold cursor-pointer'
                    : count === 0
                      ? 'text-slate-600 cursor-not-allowed'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900 cursor-pointer'
                }`}
              >
                {CHRONICLE_SPHERE_LABELS[sphereId]} ({count})
              </button>
            );
          })}
        </div>

        {chronicle.chapters.length > 1 && (
          <button
            type="button"
            onClick={() => onToggleAllEras(!allCollapsed)}
            className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono text-slate-300 hover:text-amber-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            {allCollapsed ? (
              <>
                <ChevronsUpDown className="w-3.5 h-3.5 text-amber-400" />
                <span>Развернуть главы</span>
              </>
            ) : (
              <>
                <ChevronsDownUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Свернуть главы</span>
              </>
            )}
          </button>
        )}
      </div>
      {sphereFilter === 'all' && chronicle.unclassifiedCount > 0 && (
        <p className="px-3 py-2 text-xs text-slate-400 sm:px-5">
          Вне пяти сфер: {chronicle.unclassifiedCount}. Эти материалы доступны в разделе «Все».
        </p>
      )}

      {/* Список глав-эпох */}
      {chronicle.chapters.length === 0 ? (
        <div className="px-6 py-12 text-center space-y-2">
          <p className="text-sm text-slate-300">
            {chronicle.totalMatchingEvents === 0
              ? 'Сейчас все тематические ветки скрыты или в выбранном диапазоне нет событий.'
              : 'В выбранном диапазоне и сфере событий не найдено.'}
          </p>
          {chronicle.totalMatchingEvents === 0 ? (
            <p className="text-xs text-slate-400">
              Включите нужные ветки в меню «Ветки» сверху или переключитесь на «Граф веток», чтобы увидеть ось времени и эпохи.
            </p>
          ) : sphereFilter !== 'all' ? (
            <button
              type="button"
              onClick={() => onChangeSphereFilter('all')}
              className="text-xs font-mono text-amber-300 hover:text-amber-200 underline underline-offset-4 cursor-pointer"
            >
              Показать все сферы
            </button>
          ) : null}
        </div>
      ) : (
        <div className="divide-y divide-slate-800/90">
          {chronicle.chapters.map((chapter) => {
            const isCollapsed = Boolean(collapsedEras[chapter.era.id]);

            return (
              <section
                key={chapter.era.id}
                id={chronicleEraAnchor(chapter.era.id)}
                data-era-chapter={chapter.era.id}
                className="scroll-mt-36"
              >
                {/* Заголовок главы-эпохи */}
                <div className="px-3 sm:px-5 py-3 bg-[#0a1224]/95 border-b border-slate-800/70 flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onToggleEraCollapsed(chapter.era.id)}
                      aria-expanded={!isCollapsed}
                      aria-label={
                        isCollapsed
                          ? `Развернуть главу ${chapter.era.title}`
                          : `Свернуть главу ${chapter.era.title}`
                      }
                      className="mt-0.5 p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 transition-colors cursor-pointer shrink-0"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                        <button
                          type="button"
                          onClick={() => onToggleEraCollapsed(chapter.era.id)}
                          className="font-serif text-lg sm:text-xl font-bold text-white hover:text-amber-200 transition-colors text-left leading-tight cursor-pointer"
                        >
                          {chapter.era.title}
                        </button>
                        <span className="font-mono text-xs text-amber-300 tabular-nums shrink-0">
                          {chapter.era.period}
                        </span>
                        <span className="font-mono text-xs text-slate-400 tabular-nums shrink-0">
                          · {chapter.events.length} соб.
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed max-w-3xl line-clamp-2">
                        {chapter.era.thesis}
                      </p>

                      {chapter.rulers.length > 0 && !isCollapsed && (
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 pt-0.5 text-xs">
                          <Crown className="w-3 h-3 text-amber-400/85 shrink-0" />
                          {chapter.rulers.slice(0, 8).map((r, rIdx) => (
                            <Fragment key={r.id}>
                              {rIdx > 0 && (
                                <span aria-hidden="true" className="text-slate-600 select-none">
                                  ·
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => onOpenPeriodModal(r.id)}
                                className="text-slate-300 hover:text-amber-200 underline decoration-amber-400/30 hover:decoration-amber-300 underline-offset-4 transition-colors cursor-pointer tabular-nums"
                                title={`Открыть досье правления: ${r.ruler} (${r.reignPeriod})`}
                              >
                                {r.shortRuler}
                              </button>
                            </Fragment>
                          ))}
                          {chapter.rulers.length > 8 && (
                            <span className="text-slate-500 font-mono text-[11px] tabular-nums">
                              +{chapter.rulers.length - 8}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenEraModal(chapter.era.id)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/12 hover:bg-amber-500/22 border border-amber-500/35 text-xs font-mono text-amber-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Досье эпохи →
                  </button>
                </div>

                {/* Список событий главы (с пагинацией по 24 записи для быстрого DOM) */}
                {!isCollapsed && (() => {
                  const baseLimit = visibleCountByEra[chapter.era.id] ?? CHAPTER_PAGE_SIZE;
                  const selectedIdx = selectedEventId
                    ? chapter.events.findIndex((ev) => ev.id === selectedEventId)
                    : -1;
                  const effectiveLimit = Math.max(
                    baseLimit,
                    selectedIdx >= 0 ? selectedIdx + 1 : CHAPTER_PAGE_SIZE,
                  );
                  const visibleEvents = chapter.events.slice(0, effectiveLimit);
                  const remainingCount = chapter.events.length - visibleEvents.length;

                  return (
                    <div className="divide-y divide-slate-800/65">
                      {visibleEvents.map((ev) => {
                        const isSelected = selectedEventId === ev.id;
                        const isFocused = focusedEventId === ev.id;
                        const sphereId = chronicle.sphereByEventId.get(ev.id);
                        const branch = branchById.get(ev.task);

                        return (
                          <button
                            key={ev.id}
                            id={timelineEventAnchor(ev.id, 'chronicle')}
                            type="button"
                            onClick={() => onSelectEvent(ev.id)}
                            onDoubleClick={() => onOpenCardModal(ev.id)}
                            className={`w-full text-left px-3 sm:px-5 py-3 transition-colors cursor-pointer scroll-mt-36 group ${
                              isSelected
                                ? 'bg-amber-500/12'
                                : isFocused
                                  ? 'bg-emerald-500/8 hover:bg-emerald-500/12'
                                  : 'hover:bg-slate-900/75'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-mono">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                                <span
                                  className={`font-bold tabular-nums shrink-0 ${
                                    isSelected ? 'text-amber-300' : 'text-amber-300/90'
                                  }`}
                                >
                                  {ev.period}
                                </span>
                                <span aria-hidden="true" className="text-slate-600">
                                  ·
                                </span>
                                <span className="text-sky-300/90 shrink-0">
                                  {sphereId ? CHRONICLE_SPHERE_LABELS[sphereId] : 'Вне пяти сфер'}
                                </span>
                                <span aria-hidden="true" className="text-slate-600">
                                  ·
                                </span>
                                <span className="text-slate-400 truncate">
                                  {branch?.label || ev.task}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 text-[11px]">
                                {ev.explicitLinks.length > 0 && (
                                  <span className="inline-flex items-center gap-1 text-emerald-300/90 tabular-nums">
                                    <Link2 className="w-3 h-3" />
                                    {ev.explicitLinks.length}
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="text-amber-300 font-semibold">в читалке</span>
                                )}
                              </div>
                            </div>

                            <div
                              className={`text-sm sm:text-[15px] font-semibold leading-snug mt-1 transition-colors ${
                                isSelected
                                  ? 'text-amber-100'
                                  : 'text-white group-hover:text-amber-200'
                              }`}
                            >
                              {ev.title}
                            </div>

                            {(ev.subtitle || ev.outcome) && (
                              <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed line-clamp-2 max-w-3xl">
                                {ev.subtitle || ev.outcome}
                              </p>
                            )}
                          </button>
                        );
                      })}

                      {remainingCount > 0 && (
                        <div className="px-3 sm:px-5 py-2.5 bg-slate-950/45 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                          <span className="text-slate-400 tabular-nums">
                            Показано {visibleEvents.length} из {chapter.events.length} событий главы
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setVisibleCountByEra((prev) => ({
                                  ...prev,
                                  [chapter.era.id]: effectiveLimit + CHAPTER_PAGE_SIZE,
                                }))
                              }
                              className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-200 transition-colors cursor-pointer tabular-nums"
                            >
                              Показать ещё {Math.min(CHAPTER_PAGE_SIZE, remainingCount)}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setVisibleCountByEra((prev) => ({
                                  ...prev,
                                  [chapter.era.id]: chapter.events.length,
                                }))
                              }
                              className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer tabular-nums"
                            >
                              Показать все ({chapter.events.length})
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
});
