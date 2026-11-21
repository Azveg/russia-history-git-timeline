import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Crown,
  ExternalLink,
  Layers,
  Link2,
  Users,
  X,
} from 'lucide-react';
import { Fragment, memo, useEffect, useMemo, useState } from 'react';
import type {
  BranchDefinition,
  EnrichedEvent,
  EraEventSphereId,
  RulerPeriod,
} from '../../types/timeline';
import { CHRONICLE_SPHERE_LABELS } from './timelineChronicleModel';

type ReaderTabId = 'essence' | 'links' | 'concurrent';

export interface ReaderLinkItem {
  targetEvent: EnrichedEvent;
  branchLabel: string;
  rowDelta: number | null;
  yearDelta: number;
  isHiddenBranch: boolean;
  direction: 'up' | 'down' | 'off';
}

interface TimelineLiveReaderProps {
  event: EnrichedEvent | null;
  sphereId: EraEventSphereId | null;
  branch: BranchDefinition | undefined;
  branches: BranchDefinition[];
  rulers: RulerPeriod[];
  currentIndex: number;
  totalCount: number;
  hasPrev: boolean;
  hasNext: boolean;
  isFocused: boolean;
  linkItems: ReaderLinkItem[];
  onStep: (direction: -1 | 1) => void;
  onSelectEvent: (eventId: string) => void;
  onJumpToEvent: (eventId: string) => void;
  onOpenCardModal: (eventId: string) => void;
  onOpenPeriodModal: (rulerId: string) => void;
  onOpenPersonModal?: (personKeyOrRaw: string) => void;
  onToggleFocusEvent: (eventId: string) => void;
  onCloseMobileSheet?: () => void;
  variant?: 'sidebar' | 'sheet';
}

export const TimelineLiveReader = memo(function TimelineLiveReader({
  event,
  sphereId,
  branch,
  branches,
  rulers,
  currentIndex,
  totalCount,
  hasPrev,
  hasNext,
  isFocused,
  linkItems,
  onStep,
  onSelectEvent,
  onJumpToEvent,
  onOpenCardModal,
  onOpenPeriodModal,
  onOpenPersonModal,
  onToggleFocusEvent,
  onCloseMobileSheet,
  variant = 'sidebar',
}: TimelineLiveReaderProps) {
  const [activeTab, setActiveTab] = useState<ReaderTabId>('essence');
  const [visibleConcurrentCount, setVisibleConcurrentCount] = useState(8);

  useEffect(() => {
    setVisibleConcurrentCount(8);
  }, [event?.id]);

  const branchById = useMemo(
    () => new Map(branches.map((b) => [b.id, b])),
    [branches],
  );

  const primaryRuler = useMemo(() => {
    if (!event) return null;
    if (event.overlappingRulers.length > 0) {
      return rulers.find((r) => r.id === event.overlappingRulers[0].id) ?? null;
    }
    return null;
  }, [event, rulers]);

  const concurrentList = useMemo(() => {
    if (!event || activeTab !== 'concurrent') return [];
    return event.concurrentEvents;
  }, [event, activeTab]);

  if (!event) {
    return (
      <section className="rounded-2xl border border-slate-800/90 bg-[#0b1325]/95 p-4 space-y-2 shadow-lg">
        <div className="flex items-center gap-1.5 text-xs font-mono text-amber-300">
          <BookOpen className="w-3.5 h-3.5 shrink-0" />
          <span>Живая читалка</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Выберите любое событие в ленте — здесь сразу откроются подробности, связи и синхронный
          контекст с листанием «Назад / Далее».
        </p>
      </section>
    );
  }

  const concurrentTotal = event.concurrentCount ?? event.concurrentEvents.length;
  const upLinks = linkItems.filter((l) => l.direction === 'up');
  const downLinks = linkItems.filter((l) => l.direction === 'down');
  const offLinks = linkItems.filter((l) => l.direction === 'off');

  return (
    <section
      aria-label="Живая читалка выбранного события"
      className={`rounded-2xl border border-amber-500/30 bg-[#0b1325]/98 shadow-xl overflow-hidden flex flex-col ${
        variant === 'sheet' ? 'max-h-[78vh]' : ''
      }`}
    >
      {/* Верхняя панель листания Предыдущее / Следующее */}
      <div className="px-3.5 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => onStep(-1)}
            aria-label="Предыдущее событие"
            title="Предыдущее событие (Alt+← или K)"
            className={`px-2 py-1 rounded-lg border text-xs font-mono inline-flex items-center gap-1 transition-colors ${
              hasPrev
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 hover:text-amber-200 cursor-pointer'
                : 'bg-slate-950 border-slate-800/70 text-slate-600 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Назад</span>
          </button>

          <button
            type="button"
            disabled={!hasNext}
            onClick={() => onStep(1)}
            aria-label="Следующее событие"
            title="Следующее событие (Alt+→ или J)"
            className={`px-2 py-1 rounded-lg border text-xs font-mono inline-flex items-center gap-1 transition-colors ${
              hasNext
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 hover:text-amber-200 cursor-pointer'
                : 'bg-slate-950 border-slate-800/70 text-slate-600 cursor-not-allowed'
            }`}
          >
            <span>Далее</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {totalCount > 0 && currentIndex >= 0 && (
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              {currentIndex + 1} / {totalCount}
            </span>
          )}
          {onCloseMobileSheet && (
            <button
              type="button"
              onClick={onCloseMobileSheet}
              aria-label="Свернуть читалку"
              className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Заголовок и тихий паспорт события */}
      <div className="px-4 py-3 border-b border-slate-800/80 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-slate-400">
          <span className="font-bold text-amber-300 tabular-nums">{event.period}</span>
          {sphereId && (
            <>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="text-sky-300/90">{CHRONICLE_SPHERE_LABELS[sphereId]}</span>
            </>
          )}
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="truncate">{branch?.label || event.task}</span>
        </div>

        <h3 className="font-serif text-lg sm:text-xl font-bold text-white leading-snug text-balance">
          {event.title}
        </h3>

        {primaryRuler && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Crown className="w-3.5 h-3.5 text-amber-400/85 shrink-0" />
            <button
              type="button"
              onClick={() => onOpenPeriodModal(primaryRuler.id)}
              className="text-slate-300 hover:text-amber-200 underline decoration-amber-400/35 hover:decoration-amber-300 underline-offset-4 transition-colors cursor-pointer truncate tabular-nums"
              title={`Открыть досье правления: ${primaryRuler.ruler}`}
            >
              {primaryRuler.shortRuler} ({primaryRuler.reignPeriod})
            </button>
          </div>
        )}
      </div>

      {/* 3 компактные вкладки читалки */}
      <div
        className="px-3 pt-2 border-b border-slate-800/80 bg-slate-950/50 flex items-center gap-1"
        role="tablist"
        aria-label="Разделы живой читалки"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'essence'}
          onClick={() => setActiveTab('essence')}
          className={`px-2.5 py-1.5 text-xs font-mono border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'essence'
              ? 'border-amber-400 text-amber-200 font-semibold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Суть
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'links'}
          onClick={() => setActiveTab('links')}
          className={`px-2.5 py-1.5 text-xs font-mono border-b-2 transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
            activeTab === 'links'
              ? 'border-amber-400 text-amber-200 font-semibold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Связи ({linkItems.length})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'concurrent'}
          onClick={() => setActiveTab('concurrent')}
          className={`px-2.5 py-1.5 text-xs font-mono border-b-2 transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
            activeTab === 'concurrent'
              ? 'border-amber-400 text-amber-200 font-semibold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Синхронно ({concurrentTotal})
        </button>
      </div>

      {/* Прокручиваемое тело активной вкладки */}
      <div className="p-4 overflow-y-auto flex-1 space-y-3.5 max-h-[52vh]">
        {activeTab === 'essence' && (
          <>
            {event.subtitle && (
              <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed">
                {event.subtitle}
              </p>
            )}

            {event.details && (
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {event.details}
              </p>
            )}

            {event.outcome && (
              <div className="pt-3 border-t border-slate-800/80 space-y-1">
                <div className="text-[11px] font-mono text-amber-300/90 uppercase tracking-wider">
                  Итог и значение
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {event.outcome}
                </p>
              </div>
            )}

            {event.subEvents && event.subEvents.length > 0 && (
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Ключевые этапы ({event.subEvents.length})
                </div>
                <div className="divide-y divide-slate-800/60">
                  {event.subEvents.slice(0, 6).map((sub, idx) => (
                    <div key={`${sub.title}-${idx}`} className="py-2 first:pt-0 last:pb-0">
                      <div className="text-xs font-semibold text-white">{sub.title}</div>
                      <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{sub.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {event.keyFigures && event.keyFigures.length > 0 && (
              <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
                <div className="text-[11px] font-mono text-slate-400 inline-flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-sky-400" />
                  <span>Ключевые лица:</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-relaxed">
                  {event.keyFigures.map((fig, idx) => (
                    <Fragment key={`${fig}-${idx}`}>
                      {idx > 0 && (
                        <span aria-hidden="true" className="text-slate-600 select-none">
                          ·
                        </span>
                      )}
                      {onOpenPersonModal ? (
                        <button
                          type="button"
                          onClick={() => onOpenPersonModal(fig)}
                          className="text-sky-300 hover:text-sky-200 underline decoration-sky-400/35 hover:decoration-sky-300 underline-offset-4 transition-colors cursor-pointer"
                        >
                          {fig}
                        </button>
                      ) : (
                        <span className="text-slate-300">{fig}</span>
                      )}
                    </Fragment>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'links' && (
          <div className="space-y-3">
            {linkItems.length === 0 ? (
              <p className="text-xs text-slate-400 leading-relaxed">
                У этого события нет отмеченных прямых перекрёстных связей. Вы можете посмотреть
                параллельные события эпохи во вкладке «Синхронно».
              </p>
            ) : (
              <>
                {[
                  { id: 'up', label: 'Выше на ленте', icon: ArrowUp, items: upLinks },
                  { id: 'down', label: 'Ниже на ленте', icon: ArrowDown, items: downLinks },
                  { id: 'off', label: 'Вне текущего окна или в скрытой ветке', icon: Link2, items: offLinks },
                ]
                  .filter((grp) => grp.items.length > 0)
                  .map((grp) => {
                    const Icon = grp.icon;
                    return (
                      <div key={grp.id} className="space-y-1.5">
                        <div className="text-[11px] font-mono text-slate-400 inline-flex items-center gap-1.5">
                          <Icon className="w-3 h-3 text-emerald-400" />
                          <span>
                            {grp.label} ({grp.items.length})
                          </span>
                        </div>
                        <div className="divide-y divide-slate-800/70 rounded-xl border border-slate-800/80 bg-slate-950/60 overflow-hidden">
                          {grp.items.map((lnk) => (
                            <button
                              key={lnk.targetEvent.id}
                              type="button"
                              onClick={() => {
                                onSelectEvent(lnk.targetEvent.id);
                                onJumpToEvent(lnk.targetEvent.id);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-900 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                                <span className="text-amber-300 font-semibold tabular-nums shrink-0">
                                  {lnk.targetEvent.period}
                                </span>
                                <span className="text-slate-400 truncate">{lnk.branchLabel}</span>
                                {lnk.yearDelta !== 0 && (
                                  <span className="text-emerald-300 tabular-nums shrink-0">
                                    {lnk.yearDelta > 0 ? `+${lnk.yearDelta}` : lnk.yearDelta} л.
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-semibold text-white mt-0.5 leading-snug">
                                {lnk.targetEvent.title}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </>
            )}
          </div>
        )}

        {activeTab === 'concurrent' && (
          <div className="space-y-2.5">
            {concurrentList.length === 0 ? (
              <p className="text-xs text-slate-400 leading-relaxed">
                Синхронных событий в базе для этого интервала не найдено.
              </p>
            ) : (
              <>
                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-sky-400" />
                    <span>Параллельно в те же годы</span>
                  </span>
                  <span className="tabular-nums">
                    {Math.min(visibleConcurrentCount, concurrentList.length)} / {concurrentList.length}
                  </span>
                </div>

                <div className="divide-y divide-slate-800/70 rounded-xl border border-slate-800/80 bg-slate-950/60 overflow-hidden">
                  {concurrentList.slice(0, visibleConcurrentCount).map((cev) => {
                    const cBranch = branchById.get(cev.task);
                    return (
                      <button
                        key={cev.id}
                        type="button"
                        onClick={() => {
                          onSelectEvent(cev.id);
                          onJumpToEvent(cev.id);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-900 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                          <span className="text-amber-300 font-semibold tabular-nums shrink-0">
                            {cev.period}
                          </span>
                          <span className="text-slate-400 truncate">
                            {cBranch?.label || cev.task}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-white mt-0.5 leading-snug">
                          {cev.title}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {concurrentList.length > visibleConcurrentCount && (
                  <button
                    type="button"
                    onClick={() => setVisibleConcurrentCount((prev) => prev + 8)}
                    className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer tabular-nums"
                  >
                    Показать ещё ({concurrentList.length - visibleConcurrentCount})
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Нижняя панель действий */}
      <div className="px-3.5 py-2.5 border-t border-slate-800 bg-slate-950/85 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onToggleFocusEvent(event.id)}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
            isFocused
              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
              : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300'
          }`}
          title="Оставить на ленте только это событие и его связи"
        >
          <Crosshair className="w-3.5 h-3.5 shrink-0" />
          <span>{isFocused ? 'В фокусе' : 'Фокус'}</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenCardModal(event.id)}
          className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-xs font-mono font-semibold text-amber-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
        >
          <span>Полная карточка</span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        </button>
      </div>
    </section>
  );
});
