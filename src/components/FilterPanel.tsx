import {
  ArrowLeftRight,
  ArrowRight,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  Flame,
  GitCompare,
  Link2,
  RotateCcw,
  Search,
  Tag,
  User,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { searchPersonDossiers } from '../engine/timelineEngine';
import type {
  BranchDefinition,
  BranchPairFilter,
  PersonDossier,
  SyncLinkTypeFilter,
  SyncTagOption,
} from '../types/timeline';
import { EPOCH_SLICE_PRESETS, type EpochSlicePreset } from './EraSelectorPopover';

interface FilterPanelProps {
  yearFrom: number;
  yearTo: number;
  minYear: number;
  maxYear: number;
  selectedRulerId: string;
  searchQuery: string;
  onlySynced: boolean;
  syncLinkTypeFilter: SyncLinkTypeFilter;
  thematicBranches: BranchDefinition[];
  syncTagOptions: SyncTagOption[];
  selectedSyncTag: string | null;
  branchPairFilter: BranchPairFilter | null;
  auditUnlinkedMode: boolean;
  auditFlaggedCount: number;
  personDossiers?: Map<string, PersonDossier>;
  selectedPersonDossier?: PersonDossier | null;
  isAdvancedExpanded: boolean;
  onToggleAdvanced: () => void;
  onChangeYearFrom: (year: number) => void;
  onChangeYearTo: (year: number) => void;
  onSelectYearRange: (from: number, to: number) => void;
  onQuickStartHotNode?: (preset: EpochSlicePreset) => void;
  onChangeSearch: (query: string) => void;
  onToggleOnlySynced: () => void;
  onChangeSyncLinkTypeFilter: (nextType: SyncLinkTypeFilter) => void;
  onSelectSyncTag: (tag: string | null) => void;
  onChangeBranchPair: (pair: BranchPairFilter | null) => void;
  onToggleAuditUnlinkedMode: () => void;
  onOpenWindowModal?: (from: number, to: number) => void;
  onOpenPersonModal?: (personKey: string) => void;
  onClearPersonFilter?: () => void;
  onResetFilters: () => void;
}

export function FilterPanel({
  yearFrom,
  yearTo,
  minYear,
  maxYear,
  selectedRulerId,
  searchQuery,
  onlySynced,
  syncLinkTypeFilter,
  thematicBranches,
  syncTagOptions,
  selectedSyncTag,
  branchPairFilter,
  auditUnlinkedMode,
  auditFlaggedCount,
  personDossiers,
  selectedPersonDossier,
  isAdvancedExpanded,
  onToggleAdvanced,
  onChangeYearFrom,
  onChangeYearTo,
  onSelectYearRange,
  onQuickStartHotNode,
  onChangeSearch,
  onToggleOnlySynced,
  onChangeSyncLinkTypeFilter,
  onSelectSyncTag,
  onChangeBranchPair,
  onToggleAuditUnlinkedMode,
  onOpenWindowModal,
  onOpenPersonModal,
  onClearPersonFilter,
  onResetFilters,
}: FilterPanelProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [highlightedPersonIdx, setHighlightedPersonIdx] = useState(-1);
  const [draftBranchA, setDraftBranchA] = useState(branchPairFilter?.branchA ?? '');
  const [draftBranchB, setDraftBranchB] = useState(branchPairFilter?.branchB ?? '');
  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const slicesRailRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftBranchA(branchPairFilter?.branchA ?? '');
    setDraftBranchB(branchPairFilter?.branchB ?? '');
  }, [branchPairFilter]);

  const personSuggestions = useMemo(() => {
    if (!personDossiers || !onOpenPersonModal) return [];
    return searchPersonDossiers(searchQuery, personDossiers, 6);
  }, [searchQuery, personDossiers, onOpenPersonModal]);

  useEffect(() => {
    setHighlightedPersonIdx(-1);
  }, [searchQuery]);

  useEffect(() => {
    function handleOutsidePointer(e: PointerEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener('pointerdown', handleOutsidePointer);
    return () => document.removeEventListener('pointerdown', handleOutsidePointer);
  }, []);

  const showPersonSuggestions = isSearchFocused && personSuggestions.length > 0;
  const isFullRange =
    yearFrom === minYear &&
    yearTo === maxYear &&
    !selectedRulerId &&
    !searchQuery &&
    !onlySynced &&
    syncLinkTypeFilter === 'all' &&
    !selectedPersonDossier &&
    !selectedSyncTag &&
    !branchPairFilter &&
    !auditUnlinkedMode;

  const selectedSyncTagMeta = useMemo(
    () => (selectedSyncTag ? syncTagOptions.find((t) => t.tag === selectedSyncTag) ?? null : null),
    [selectedSyncTag, syncTagOptions],
  );

  const hotPresets = useMemo(
    () => EPOCH_SLICE_PRESETS.filter((p) => p.hot),
    [],
  );

  const centuryPresets = useMemo(
    () => EPOCH_SLICE_PRESETS.filter((p) => !p.hot),
    [],
  );

  const activeHotIdx = hotPresets.findIndex(
    (p) => yearFrom === p.from && yearTo === p.to && !selectedRulerId,
  );
  const primaryHotPreset =
    activeHotIdx >= 0
      ? hotPresets[(activeHotIdx + 1) % hotPresets.length]
      : hotPresets[0];
  const isCyclingHot = activeHotIdx >= 0;

  const handleBranchAChange = (nextA: string) => {
    setDraftBranchA(nextA);
    if (!nextA) {
      onChangeBranchPair(null);
      return;
    }
    if (draftBranchB && draftBranchB !== nextA) {
      onChangeBranchPair({ branchA: nextA, branchB: draftBranchB });
    }
  };

  const handleBranchBChange = (nextB: string) => {
    setDraftBranchB(nextB);
    if (!nextB) {
      onChangeBranchPair(null);
      return;
    }
    if (draftBranchA && draftBranchA !== nextB) {
      onChangeBranchPair({ branchA: draftBranchA, branchB: nextB });
    }
  };

  return (
    <section
      id="filter-panel-console"
      aria-label="Консоль поиска, эпох и исторических срезов"
      className="rounded-2xl bg-slate-900/65 border border-slate-800/80 p-2.5 sm:px-3.5 sm:py-2.5 space-y-2"
    >
      {/* Первая строка (всегда видна): Быстрый поиск + Досье окна + Сброс */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2">
        <div ref={searchWrapperRef} className="flex-1 min-w-0 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onChange={(e) => {
              onChangeSearch(e.target.value);
              setIsSearchFocused(true);
            }}
            onKeyDown={(e) => {
              if (!showPersonSuggestions) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedPersonIdx((prev) => (prev + 1) % personSuggestions.length);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedPersonIdx((prev) =>
                  prev <= 0 ? personSuggestions.length - 1 : prev - 1,
                );
              } else if (e.key === 'Enter' && highlightedPersonIdx >= 0) {
                const chosen = personSuggestions[highlightedPersonIdx];
                if (chosen && onOpenPersonModal) {
                  e.preventDefault();
                  setIsSearchFocused(false);
                  onOpenPersonModal(chosen.key);
                }
              } else if (e.key === 'Escape') {
                e.stopPropagation();
                setIsSearchFocused(false);
              }
            }}
            placeholder="Поиск по событиям, предпосылкам, итогам, личностям (Витте, Сперанский...), договорам..."
            aria-autocomplete="list"
            aria-expanded={showPersonSuggestions}
            className="w-full rounded-xl bg-slate-950/90 border border-slate-700/80 pl-9 pr-8 py-1.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onChangeSearch('')}
              aria-label="Очистить поисковый запрос"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {showPersonSuggestions && onOpenPersonModal && (
            <div
              role="listbox"
              aria-label="Найденные исторические деятели"
              className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-xl bg-[#0b1325] border border-sky-500/40 shadow-2xl overflow-hidden"
            >
              <div className="px-3.5 py-2 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-sky-300">
                <span>Исторические лица и участники ({personSuggestions.length})</span>
                <span className="text-slate-400">нажмите, чтобы открыть досье</span>
              </div>
              <div className="divide-y divide-slate-800/75">
                {personSuggestions.map((person, idx) => {
                  const spanText =
                    person.yearRange.min === person.yearRange.max
                      ? `${person.yearRange.min}`
                      : `${person.yearRange.min}–${person.yearRange.max}`;
                  const isHighlighted = idx === highlightedPersonIdx;
                  return (
                    <button
                      key={person.key}
                      type="button"
                      role="option"
                      aria-selected={isHighlighted}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setIsSearchFocused(false);
                        onOpenPersonModal(person.key);
                      }}
                      className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                        isHighlighted ? 'bg-sky-500/15' : 'hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <User className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-semibold text-white truncate">
                            {person.displayName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 tabular-nums truncate">
                            {spanText} · событий: {person.events.length}
                            {person.rulers.length > 0 ? ` · правлений: ${person.rulers.length}` : ''}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-sky-300 shrink-0">Досье →</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-1.5 shrink-0">
          <div className="flex lg:hidden items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1 text-xs font-mono">
            <span className="text-slate-400">Окно:</span>
            <input
              type="number"
              min={minYear}
              max={maxYear}
              value={yearFrom}
              aria-label="Год начала диапазона"
              onChange={(e) => onChangeYearFrom(Number(e.target.value))}
              className="w-14 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-amber-300 font-bold text-center tabular-nums focus:outline-none focus:border-amber-500"
            />
            <span className="text-slate-500">—</span>
            <input
              type="number"
              min={minYear}
              max={maxYear}
              value={yearTo}
              aria-label="Год окончания диапазона"
              onChange={(e) => onChangeYearTo(Number(e.target.value))}
              className="w-14 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-amber-300 font-bold text-center tabular-nums focus:outline-none focus:border-amber-500"
            />
          </div>

          {onOpenWindowModal && (
            <button
              type="button"
              onClick={() => onOpenWindowModal(yearFrom, yearTo)}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-transparent hover:bg-slate-800/75 text-xs font-mono font-medium text-slate-300 hover:text-amber-200 transition-colors cursor-pointer whitespace-nowrap tabular-nums shrink-0"
              title={`Открыть сводное досье произвольного окна ${yearFrom}–${yearTo} гг.`}
            >
              <CalendarRange className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Досье ({yearFrom}–{yearTo})</span>
            </button>
          )}

          {!isFullRange && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-transparent hover:bg-slate-800/75 text-xs font-mono font-medium text-amber-300 hover:text-amber-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Сбросить поисковый запрос, теги, пару веток, аудит, правителя и вернуть весь диапазон"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Все века</span>
            </button>
          )}

          {/* Главная доминирующая кнопка быстрого старта (Primary Entry Point) */}
          {primaryHotPreset && (
            <button
              type="button"
              onClick={() =>
                onQuickStartHotNode
                  ? onQuickStartHotNode(primaryHotPreset)
                  : onSelectYearRange(primaryHotPreset.from, primaryHotPreset.to)
              }
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-sans font-bold shadow-[0_0_20px_-4px_rgba(245,158,11,0.5)] transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              title={`Переключить окно на поворотный узел: ${primaryHotPreset.label} с ключевыми связями`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isCyclingHot
                  ? `Далее: ${primaryHotPreset.compactLabel}`
                  : `Начать: ${primaryHotPreset.compactLabel}`}
              </span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* Вторая строка: 4 акцентных «горячих» узла быстрого старта + тихий ряд веков */}
      <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800/60 min-w-0">
        <div
          ref={slicesRailRef}
          className="flex-1 min-w-0 flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar scroll-smooth py-0.5"
        >
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-amber-300 shrink-0 whitespace-nowrap mr-0.5">
            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Горячие узлы:</span>
          </span>

          {hotPresets.map((preset) => {
            const isActive = yearFrom === preset.from && yearTo === preset.to && !selectedRulerId;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={(e) => {
                  if (onQuickStartHotNode) {
                    onQuickStartHotNode(preset);
                  } else {
                    onSelectYearRange(preset.from, preset.to);
                  }
                  e.currentTarget.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center',
                  });
                }}
                title={`${preset.label}${preset.subtitle ? ` — ${preset.subtitle}` : ''}`}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                    : 'bg-amber-500/12 border-amber-500/35 text-amber-100 hover:bg-amber-500/22 hover:border-amber-400/60 font-semibold'
                }`}
              >
                {preset.compactLabel}
              </button>
            );
          })}

          <span className="w-px h-4 bg-slate-800 mx-1 shrink-0" aria-hidden="true" />

          <span className="text-[11px] font-mono text-slate-500 shrink-0 whitespace-nowrap hidden md:inline">
            Века:
          </span>

          {centuryPresets.map((preset) => {
            const isActive = yearFrom === preset.from && yearTo === preset.to && !selectedRulerId;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={(e) => {
                  onSelectYearRange(preset.from, preset.to);
                  e.currentTarget.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center',
                  });
                }}
                title={preset.label}
                className={`px-2 py-1 rounded-md text-[11px] font-mono border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-slate-800 border-amber-400/50 text-amber-200 font-semibold'
                    : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                {preset.compactLabel}
              </button>
            );
          })}
        </div>

        <div className="hidden sm:inline-flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => slicesRailRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
            aria-label="Прокрутить срезы эпох влево"
            className="p-1 rounded-md bg-transparent text-slate-500 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => slicesRailRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
            aria-label="Прокрутить срезы эпох вправо"
            className="p-1 rounded-md bg-transparent text-slate-500 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Раскрываемый блок «Расширенный анализ» (Профессиональные аналитические инструменты) */}
      {isAdvancedExpanded && (
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
            <span>Расширенный анализ: связи, сюжеты синхронизации, пары веток и аудит</span>
            <button
              type="button"
              onClick={onToggleAdvanced}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-mono transition-colors cursor-pointer whitespace-nowrap"
            >
              <ChevronUp className="w-3 h-3" />
              <span>Свернуть</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Узловые связи и тип связей */}
            <div className="inline-flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onToggleOnlySynced}
                className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  onlySynced || syncLinkTypeFilter !== 'all'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                    : 'bg-slate-950/85 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
                title="Оставить только события с выбранным типом исторических связей"
              >
                <Link2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Узловые связи</span>
              </button>

              <select
                aria-label="Тип узловых связей"
                value={syncLinkTypeFilter}
                onChange={(e) => onChangeSyncLinkTypeFilter(e.target.value as SyncLinkTypeFilter)}
                className={`rounded-xl border px-2.5 py-1.5 text-xs font-mono transition-colors cursor-pointer focus:outline-none focus:border-emerald-400 ${
                  syncLinkTypeFilter !== 'all'
                    ? 'bg-emerald-500/15 border-emerald-400/70 text-emerald-100 font-semibold'
                    : 'bg-slate-950/85 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
                title="Фильтр событий по семантическому типу связей"
              >
                <option value="all" className="bg-slate-950 text-slate-100">
                  Все типы связей
                </option>
                <option value="causal" className="bg-slate-950 text-slate-100">
                  Причинно-следственные
                </option>
                <option value="retrospective" className="bg-slate-950 text-slate-100">
                  Ретроспективные
                </option>
                <option value="sync" className="bg-slate-950 text-slate-100">
                  Синхронные
                </option>
              </select>
            </div>

            {/* Сюжет синхронизации (syncTags) */}
            <div className="flex items-center gap-1.5 min-w-[210px] flex-1 sm:flex-initial">
              <Tag className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <select
                aria-label="Фильтр по сюжету синхронизации"
                value={selectedSyncTag ?? ''}
                onChange={(e) => onSelectSyncTag(e.target.value ? e.target.value : null)}
                className={`w-full sm:w-[250px] rounded-xl border px-2.5 py-1.5 text-xs font-mono transition-colors cursor-pointer focus:outline-none focus:border-sky-400 ${
                  selectedSyncTag
                    ? 'bg-sky-500/15 border-sky-400/70 text-sky-100 font-semibold'
                    : 'bg-slate-950/85 border-slate-800 text-slate-300'
                }`}
              >
                <option value="">Сюжет синхронизации ({syncTagOptions.length})</option>
                {syncTagOptions.map((opt) => (
                  <option key={opt.tag} value={opt.tag} className="bg-slate-950 text-slate-100">
                    {opt.label} ({opt.eventCount})
                  </option>
                ))}
              </select>
              {selectedSyncTag && (
                <button
                  type="button"
                  onClick={() => onSelectSyncTag(null)}
                  aria-label="Сбросить фильтр по сюжету"
                  className="p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-400 hover:text-white cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Выбор пары веток А ↔ Б */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="hidden xl:inline text-[11px] font-mono text-slate-400">Пара веток:</span>
              <select
                aria-label="Первая ветвь пары"
                value={draftBranchA}
                onChange={(e) => handleBranchAChange(e.target.value)}
                className={`rounded-xl border px-2.5 py-1.5 text-xs font-mono transition-colors cursor-pointer focus:outline-none focus:border-emerald-400 max-w-[170px] ${
                  branchPairFilter
                    ? 'bg-emerald-500/15 border-emerald-400/70 text-emerald-100 font-semibold'
                    : 'bg-slate-950/85 border-slate-800 text-slate-300'
                }`}
              >
                <option value="">Ветка А</option>
                {thematicBranches.map((b) => (
                  <option
                    key={b.id}
                    value={b.id}
                    disabled={b.id === draftBranchB}
                    className="bg-slate-950 text-slate-100"
                  >
                    {b.label}
                  </option>
                ))}
              </select>

              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />

              <select
                aria-label="Вторая ветвь пары"
                value={draftBranchB}
                onChange={(e) => handleBranchBChange(e.target.value)}
                className={`rounded-xl border px-2.5 py-1.5 text-xs font-mono transition-colors cursor-pointer focus:outline-none focus:border-emerald-400 max-w-[170px] ${
                  branchPairFilter
                    ? 'bg-emerald-500/15 border-emerald-400/70 text-emerald-100 font-semibold'
                    : 'bg-slate-950/85 border-slate-800 text-slate-300'
                }`}
              >
                <option value="">Ветка Б</option>
                {thematicBranches.map((b) => (
                  <option
                    key={b.id}
                    value={b.id}
                    disabled={b.id === draftBranchA}
                    className="bg-slate-950 text-slate-100"
                  >
                    {b.label}
                  </option>
                ))}
              </select>

              {(draftBranchA || draftBranchB || branchPairFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftBranchA('');
                    setDraftBranchB('');
                    onChangeBranchPair(null);
                  }}
                  aria-label="Сбросить фильтр пары ветвей"
                  title="Сбросить выбор пары ветвей"
                  className="p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-400 hover:text-white cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Аудит без связей */}
            <button
              type="button"
              onClick={onToggleAuditUnlinkedMode}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ml-auto ${
                auditUnlinkedMode
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                  : 'bg-slate-950/85 border-slate-800 text-slate-300 hover:border-amber-500/45 hover:text-amber-200'
              }`}
              title="Показать одновременные события разных веток в текущем окне, между которыми нет проставленных связей"
            >
              <GitCompare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="tabular-nums">
                {auditUnlinkedMode
                  ? `Аудит без связей · ${auditFlaggedCount}`
                  : 'Аудит без связей'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Активная сводка режима аудита или выбранного сюжета (видна даже при свёрнутом блоке анализа) */}
      {(auditUnlinkedMode || selectedSyncTagMeta) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-300 min-w-0">
            {auditUnlinkedMode && (
              <span className="text-amber-200">
                Режим аудита: показаны узлы с параллелями в других ветках без проставленных связей (кандидатов: <strong className="font-mono tabular-nums">{auditFlaggedCount}</strong>).
              </span>
            )}
            {auditUnlinkedMode && selectedSyncTagMeta && (
              <span aria-hidden="true" className="text-slate-600">·</span>
            )}
            {selectedSyncTagMeta && (
              <span className="text-sky-200">
                Сюжет: <strong>{selectedSyncTagMeta.label}</strong> (всего в базе: <span className="font-mono tabular-nums">{selectedSyncTagMeta.eventCount}</span>)
              </span>
            )}
          </div>
          {auditUnlinkedMode && (
            <button
              type="button"
              onClick={onToggleAuditUnlinkedMode}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-mono cursor-pointer shrink-0"
            >
              Выйти из аудита
            </button>
          )}
        </div>
      )}

      {/* Индикатор активного фильтра по участнику (из досье) */}
      {selectedPersonDossier && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/35 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-sky-200 min-w-0">
            <User className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="font-semibold">Фильтр по участнику: {selectedPersonDossier.displayName}</span>
            <span className="font-mono text-[11px] text-sky-300/85 tabular-nums">
              · событий в досье: {selectedPersonDossier.events.length}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenPersonModal && (
              <button
                type="button"
                onClick={() => onOpenPersonModal(selectedPersonDossier.key)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-sky-500/40 text-sky-200 text-[11px] font-mono transition-colors cursor-pointer"
              >
                Открыть досье
              </button>
            )}
            {onClearPersonFilter && (
              <button
                type="button"
                onClick={onClearPersonFilter}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-mono transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Снять</span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
