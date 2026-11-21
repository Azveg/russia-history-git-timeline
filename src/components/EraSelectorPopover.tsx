import { CalendarRange, ChevronDown, ExternalLink, Filter, RotateCcw, ScrollText, Search, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { doesIntervalBelongToEra, resolveMacroEras } from '../engine/timelineEngine';
import type { EnrichedEvent, MacroEra } from '../types/timeline';
import { useWheelScrollContainment } from '../utils/scrollIsolation';

export interface EpochSlicePreset {
  label: string;
  compactLabel: string;
  subtitle?: string;
  from: number;
  to: number;
  hot?: boolean;
  anchorEventId?: string;
  ensureBranches?: string[];
}

export const EPOCH_SLICE_PRESETS: EpochSlicePreset[] = [
  { label: 'IX–XII вв. (Русь)', compactLabel: 'IX–XII вв. · Русь', from: 862, to: 1237, hot: false },
  { label: 'XIII–XV вв. (Орда и Москва)', compactLabel: 'XIII–XV вв.', from: 1237, to: 1505, hot: false },
  { label: 'XVI–XVII вв. (Царство и Смута)', compactLabel: 'XVI–XVII вв.', from: 1505, to: 1682, hot: false },
  { label: 'XVIII в. (Империя)', compactLabel: 'XVIII в.', from: 1700, to: 1800, hot: false },
  { label: 'XIX в. (Реформы и культура)', compactLabel: 'XIX в.', from: 1801, to: 1900, hot: false },
  { label: 'XX в. (СССР и РФ)', compactLabel: 'XX в.', from: 1901, to: 2000, hot: false },
  {
    label: 'Пётр I и реформы (1689–1725)',
    compactLabel: 'Пётр I · 1689–1725',
    subtitle: 'Империя и флот',
    from: 1689,
    to: 1725,
    hot: true,
    anchorEventId: '1700-northern-war',
    ensureBranches: ['MAIN_RULERS', 'SEAS', 'REFORMS_ECO', 'DIPLOMACY_TREATIES'],
  },
  {
    label: 'Великие реформы (1855–1881)',
    compactLabel: 'Реформы · 1855–1881',
    subtitle: 'Отмена крепостничества',
    from: 1855,
    to: 1881,
    hot: true,
    anchorEventId: '1861-reform-emancipation',
    ensureBranches: ['MAIN_RULERS', 'REFORMS_ECO', 'DIPLOMACY_TREATIES', 'WAR_CONTINENTAL'],
  },
  {
    label: 'Излом 1914–1924',
    compactLabel: 'Излом · 1914–1924',
    subtitle: 'Мировая и революция',
    from: 1914,
    to: 1924,
    hot: true,
    anchorEventId: '1914-ww1',
    ensureBranches: ['MAIN_RULERS', 'WAR_CONTINENTAL', 'INTERNAL_BUFFER', 'REFORMS_ECO'],
  },
  {
    label: 'ВОВ и Атомный проект (1941–1953)',
    compactLabel: 'ВОВ и атом · 1941–1953',
    subtitle: 'Победа и паритет',
    from: 1941,
    to: 1953,
    hot: true,
    anchorEventId: '1941-ww2',
    ensureBranches: ['MAIN_RULERS', 'WAR_CONTINENTAL', 'REFORMS_ECO', 'DIPLOMACY_TREATIES'],
  },
];

interface EraSelectorPopoverProps {
  eras: MacroEra[];
  enrichedEvents: EnrichedEvent[];
  selectedEraId: string;
  yearFrom: number;
  yearTo: number;
  minYear: number;
  maxYear: number;
  onSelectEra: (eraId: string) => void;
  onSelectYearRange?: (from: number, to: number) => void;
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
  onSelectYearRange,
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
            : activeWindowEra
              ? 'bg-amber-500/12 border-amber-500/40 text-amber-200 hover:bg-amber-500/20'
              : 'bg-transparent border-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white'
        }`}
        title={
          activeWindowEra
            ? `Активный период: ${activeWindowEra.displayShortTitle} (${activeWindowEra.period}). Нажмите для выбора эпохи`
            : 'Выбор макро-периода истории, фокусировка окна времени и открытие досье эпохи'
        }
      >
        <ScrollText className="w-3.5 h-3.5 text-amber-400/85 shrink-0" />
        <span>Эпохи</span>

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
          aria-label="Навигатор по макро-периодам"
          className="fixed xl:absolute left-3 right-3 xl:left-0 xl:right-auto top-[calc(var(--top-bar-height,49px)+6px)] xl:top-full xl:mt-2 max-w-[520px] xl:max-w-[calc(100vw-2rem)] xl:w-[520px] mx-auto xl:mx-0 bg-[#090e1c] border border-slate-700/90 rounded-2xl shadow-2xl z-50 overflow-hidden animate-modal"
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

            {onSelectYearRange && (
              <div className="pt-1.5 border-t border-slate-800/70">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mb-1.5">
                  <CalendarRange className="w-3 h-3 text-amber-400" />
                  <span>Быстрые срезы веков и узлов:</span>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                  {EPOCH_SLICE_PRESETS.map((preset) => {
                    const isActive = yearFrom === preset.from && yearTo === preset.to;
                    return (
                      <button
                        key={`era-popover-slice-${preset.label}`}
                        type="button"
                        onClick={() => {
                          onSelectYearRange(preset.from, preset.to);
                          setIsOpen(false);
                        }}
                        title={preset.label}
                        className={`px-2 py-1 rounded-md text-[10px] font-mono border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                            : preset.hot
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
                        }`}
                      >
                        {preset.hot && !isActive && <Sparkles className="w-2.5 h-2.5 inline mr-1 text-amber-400" />}
                        {preset.compactLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
