import { ChevronDown, Crown, ExternalLink, Filter, RotateCcw, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { EnrichedEvent, RulerPeriod } from '../types/timeline';
import { useWheelScrollContainment } from '../utils/scrollIsolation';

interface RulerSelectorPopoverProps {
  rulers: RulerPeriod[];
  matchingEvents: EnrichedEvent[];
  selectedRulerId: string;
  yearFrom: number;
  yearTo: number;
  minYear: number;
  maxYear: number;
  onJumpToRuler: (rulerId: string) => void;
  onFilterByRuler: (rulerId: string) => void;
  onOpenRulerModal: (rulerId: string) => void;
}

export function RulerSelectorPopover({
  rulers,
  matchingEvents,
  selectedRulerId,
  yearFrom,
  yearTo,
  minYear,
  maxYear,
  onJumpToRuler,
  onFilterByRuler,
  onOpenRulerModal,
}: RulerSelectorPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useWheelScrollContainment(listRef, isOpen);

  const eventCountByRuler = useMemo(() => {
    const map = new Map<string, number>();
    rulers.forEach((r) => map.set(r.id, 0));
    matchingEvents.forEach((ev) => {
      ev.overlappingRulers.forEach((or) => {
        map.set(or.id, (map.get(or.id) || 0) + 1);
      });
    });
    return map;
  }, [rulers, matchingEvents]);

  const activeWindowRuler = useMemo(() => {
    if (selectedRulerId && selectedRulerId !== 'ALL') {
      return rulers.find((r) => r.id === selectedRulerId) ?? null;
    }
    if (yearFrom !== minYear || yearTo !== maxYear) {
      return rulers.find((r) => r.startYear === yearFrom && r.endYear === yearTo) ?? null;
    }
    return null;
  }, [rulers, selectedRulerId, yearFrom, yearTo, minYear, maxYear]);

  const filteredRulers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rulers;
    return rulers.filter(
      (r) =>
        r.ruler.toLowerCase().includes(q) ||
        r.shortRuler.toLowerCase().includes(q) ||
        r.reignPeriod.toLowerCase().includes(q) ||
        r.reignTitle.toLowerCase().includes(q) ||
        (r.center && r.center.toLowerCase().includes(q)),
    );
  }, [rulers, searchQuery]);

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
        containerRef.current?.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')?.focus();
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
            ? 'bg-slate-800/95 border-amber-400/60 text-white'
            : activeWindowRuler
              ? 'bg-amber-500/12 border-amber-500/40 text-amber-200 hover:bg-amber-500/20'
              : 'bg-transparent border-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white'
        }`}
        title={
          activeWindowRuler
            ? `Активный правитель: ${activeWindowRuler.shortRuler} (${activeWindowRuler.reignPeriod}). Нажмите для выбора правителя`
            : 'Быстрый переход к правителю на ленте, фильтрация лет правления и открытие досье'
        }
      >
        <Crown className="w-3.5 h-3.5 text-amber-400/85 shrink-0" />
        <span>Правители</span>

        <ChevronDown
          className={`hidden min-[380px]:block w-3.5 h-3.5 text-slate-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Навигатор по правителям"
          className="fixed xl:absolute left-3 right-3 xl:left-0 xl:right-auto top-[calc(var(--top-bar-height,49px)+6px)] xl:top-full xl:mt-2 max-w-[500px] xl:max-w-[calc(100vw-2rem)] xl:w-[500px] mx-auto xl:mx-0 bg-[#090e1c] border border-slate-700/90 rounded-2xl shadow-2xl z-50 overflow-hidden animate-modal"
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
                  placeholder="Поиск правителя по имени, годам или центру (Киев, Москва...)"
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Очистить поиск правителя"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {activeWindowRuler && (
                <button
                  type="button"
                  onClick={() => onFilterByRuler('ALL')}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  title="Сбросить фильтр лет правления и показать все века"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Все века</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Закрыть меню правителей"
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-400 px-0.5">
              <span>Клик по правителю — плавный переход на ленте</span>
              <span className="text-slate-500">Окно лет · Досье · Событий</span>
            </div>
          </div>

          <div
            ref={listRef}
            className="max-h-[54vh] overflow-y-auto overscroll-contain divide-y divide-slate-800/60 p-1.5 space-y-0.5"
          >
            {filteredRulers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                По запросу «{searchQuery}» правлений не найдено.
              </div>
            ) : (
              filteredRulers.map((r) => {
                const count = eventCountByRuler.get(r.id) ?? 0;
                const isCurrentWindow =
                  selectedRulerId === r.id || (yearFrom === r.startYear && yearTo === r.endYear);

                return (
                  <div
                    key={r.id}
                    className={`group/ruler flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl transition-colors ${
                      isCurrentWindow
                        ? 'bg-amber-500/15 border border-amber-500/45'
                        : 'hover:bg-slate-900/90 border border-transparent'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onJumpToRuler(r.id);
                      }}
                      className="flex-1 min-w-0 text-left cursor-pointer"
                      title={`Плавно перейти к началу правления «${r.ruler}» (${r.reignPeriod}) на таймлайне`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-mono font-bold tabular-nums text-amber-300 shrink-0">
                          {r.reignPeriod}
                        </span>
                        {r.center && (
                          <span className="text-[10px] font-mono text-slate-400 truncate">
                            · {r.center}
                          </span>
                        )}
                      </div>
                      <div className="font-serif text-xs sm:text-sm font-bold text-white group-hover/ruler:text-amber-300 transition-colors truncate mt-0.5">
                        {r.ruler}
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFilterByRuler(isCurrentWindow ? 'ALL' : r.id);
                        }}
                        className={`px-2 py-1 rounded-md border text-[10px] font-mono inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                          isCurrentWindow
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                            : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:border-amber-400/50 hover:text-amber-200'
                        }`}
                        title={
                          isCurrentWindow
                            ? 'Снять фильтр по годам этого правления и показать весь диапазон'
                            : `Отфильтровать окно таймлайна строго по годам правления (${r.reignPeriod})`
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
                          onOpenRulerModal(r.id);
                        }}
                        className="px-2 py-1 rounded-md bg-slate-900 hover:bg-amber-500/20 border border-slate-700/80 hover:border-amber-400/50 text-[10px] font-mono text-amber-300 inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                        title={`Открыть сводное досье правления «${r.ruler}» и блок «Лица эпохи»`}
                      >
                        <span>Досье</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>

                      <span
                        className="text-[11px] font-mono tabular-nums text-slate-400 w-7 text-right"
                        title="Активных событий в период правления"
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
