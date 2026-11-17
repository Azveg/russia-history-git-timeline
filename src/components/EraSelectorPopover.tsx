import { ChevronDown, ExternalLink, Filter, RotateCcw, ScrollText, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { doesIntervalBelongToEra, resolveMacroEras } from '../engine/timelineEngine';
import type { EnrichedEvent, MacroEra } from '../types/timeline';
import { useWheelScrollContainment } from '../utils/scrollIsolation';

interface EraSelectorPopoverProps {
  eras: MacroEra[];
  enrichedEvents: EnrichedEvent[];
  selectedEraId: string;
  yearFrom: number;
  yearTo: number;
  minYear: number;
  maxYear: number;
  onSelectEra: (eraId: string) => void;
  onOpenEraModal: (eraId: string) => void;
}

export function EraSelectorPopover({
  eras,
  enrichedEvents,
  selectedEraId,
  yearFrom,
  yearTo,
  minYear,
  maxYear,
  onSelectEra,
  onOpenEraModal,
}: EraSelectorPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useWheelScrollContainment(listRef, isOpen);

  const resolvedEras = useMemo(() => resolveMacroEras(eras), [eras]);

  const eventCountByEra = useMemo(() => {
    const map = new Map<string, number>();
    resolvedEras.forEach((era) => {
      let count = 0;
      for (const ev of enrichedEvents) {
        if (doesIntervalBelongToEra(ev.startYear, ev.endYear, ev.eraId, era)) {
          count += 1;
        }
      }
      map.set(era.id, count);
    });
    return map;
  }, [resolvedEras, enrichedEvents]);

  const activeWindowEra = useMemo(() => {
    if (selectedEraId && selectedEraId !== 'ALL') {
      return resolvedEras.find((era) => era.id === selectedEraId) ?? null;
    }
    if (yearFrom !== minYear || yearTo !== maxYear) {
      return (
        resolvedEras.find(
          (era) =>
            Math.max(minYear, era.startYear) === yearFrom &&
            Math.min(maxYear, era.endYear) === yearTo,
        ) ?? null
      );
    }
    return null;
  }, [resolvedEras, selectedEraId, yearFrom, yearTo, minYear, maxYear]);

  const filteredEras = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return resolvedEras;
    return resolvedEras.filter(
      (era) =>
        era.title.toLowerCase().includes(q) ||
        era.displayShortTitle.toLowerCase().includes(q) ||
        era.period.toLowerCase().includes(q) ||
        era.thesis.toLowerCase().includes(q),
    );
  }, [resolvedEras, searchQuery]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    }, 30);

    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`px-2 sm:px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-semibold inline-flex items-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
          isOpen
            ? 'bg-slate-800 border-amber-400/70 text-white shadow-md'
            : activeWindowEra
              ? 'bg-amber-500/15 border-amber-500/45 text-amber-200 hover:bg-amber-500/25'
              : 'bg-slate-900 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:border-slate-500'
        }`}
        title="Выбор макро-периода истории, фокусировка окна времени и открытие досье эпохи"
      >
        <ScrollText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="xl:hidden">Эпохи</span>
        <span className="hidden xl:inline">Макро-периоды</span>

        {activeWindowEra ? (
          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[10px] max-w-[68px] lg:max-w-[96px] xl:max-w-[130px] truncate">
            {activeWindowEra.displayShortTitle}
          </span>
        ) : (
          <span className="hidden lg:inline-block tabular-nums px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
            {resolvedEras.length}
          </span>
        )}

        <ChevronDown
          className={`hidden min-[380px]:block w-3.5 h-3.5 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Навигатор по макро-периодам"
          className="fixed lg:absolute left-3 right-3 lg:left-0 lg:right-auto top-[54px] lg:top-full lg:mt-2 max-w-[520px] lg:max-w-[calc(100vw-2rem)] lg:w-[520px] mx-auto lg:mx-0 bg-[#090e1c] border border-slate-700/90 rounded-2xl shadow-2xl z-50 overflow-hidden animate-modal"
        >
          <div className="p-3 border-b border-slate-800/90 space-y-2 bg-slate-950/70">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск макро-периода по названию, годам или тезису..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Очистить поиск макро-периода"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {activeWindowEra && (
                <button
                  type="button"
                  onClick={() => onSelectEra('ALL')}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  title="Сбросить фильтр макро-периода и показать все века"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Все века</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Закрыть меню макро-периодов"
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-400 px-0.5">
              <span>Клик по периоду — фокус окна времени</span>
              <span className="text-slate-500">Окно лет · Досье · Событий</span>
            </div>
          </div>

          <div
            ref={listRef}
            className="max-h-[54vh] overflow-y-auto overscroll-contain divide-y divide-slate-800/60 p-1.5 space-y-0.5"
          >
            {filteredEras.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                По запросу «{searchQuery}» макро-периодов не найдено.
              </div>
            ) : (
              filteredEras.map((era) => {
                const count = eventCountByEra.get(era.id) ?? 0;
                const isCurrentWindow =
                  selectedEraId === era.id ||
                  (Math.max(minYear, era.startYear) === yearFrom &&
                    Math.min(maxYear, era.endYear) === yearTo);

                return (
                  <div
                    key={era.id}
                    className={`group/era flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl transition-colors ${
                      isCurrentWindow
                        ? 'bg-amber-500/15 border border-amber-500/45'
                        : 'hover:bg-slate-900/90 border border-transparent'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onSelectEra(era.id);
                      }}
                      className="flex-1 min-w-0 text-left cursor-pointer"
                      title={`${era.title} (${era.period}) — сфокусировать окно времени на ленте`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-mono font-bold tabular-nums text-amber-300 shrink-0">
                          {era.period}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 truncate">
                          · {era.displayShortTitle}
                        </span>
                      </div>
                      <div className="font-serif text-xs sm:text-sm font-bold text-white group-hover/era:text-amber-300 transition-colors truncate mt-0.5">
                        {era.title}
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEra(isCurrentWindow ? 'ALL' : era.id);
                        }}
                        className={`px-2 py-1 rounded-md border text-[10px] font-mono inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                          isCurrentWindow
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                            : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:border-amber-400/50 hover:text-amber-200'
                        }`}
                        title={
                          isCurrentWindow
                            ? 'Снять фильтр по годам этого макро-периода и показать весь диапазон'
                            : `Отфильтровать окно таймлайна строго по годам макро-периода (${era.period})`
                        }
                      >
                        <Filter className="w-2.5 h-2.5" />
                        <span>{isCurrentWindow ? 'Сброс' : 'Окно'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          onOpenEraModal(era.id);
                        }}
                        className="px-2 py-1 rounded-md bg-slate-900 hover:bg-amber-500/20 border border-slate-700/80 hover:border-amber-400/50 text-[10px] font-mono text-amber-300 inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                        title={`Открыть полное досье макро-периода «${era.displayShortTitle}»`}
                      >
                        <span>Досье</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>

                      <span
                        className="text-[11px] font-mono tabular-nums text-slate-400 w-7 text-right"
                        title="Событий базы в этом макро-периоде"
                      >
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
