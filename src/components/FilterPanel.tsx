import {
  ArrowLeftRight,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  GitCompare,
  Link2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
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

const CENTURY_PRESETS = [
  { label: 'IX–XII вв. (Русь)', from: 862, to: 1237, hot: false },
  { label: 'XIII–XV вв. (Орда и Москва)', from: 1237, to: 1505, hot: false },
  { label: 'XVI–XVII вв. (Царство и Смута)', from: 1505, to: 1682, hot: false },
  { label: 'XVIII в. (Империя)', from: 1700, to: 1800, hot: false },
  { label: 'XIX в. (Реформы и культура)', from: 1801, to: 1900, hot: false },
  { label: 'XX в. (СССР и РФ)', from: 1901, to: 2000, hot: false },
  { label: 'Пётр I и реформы (1689–1725)', from: 1689, to: 1725, hot: true },
  { label: 'Великие реформы (1855–1881)', from: 1855, to: 1881, hot: true },
  { label: 'Излом 1914–1924', from: 1914, to: 1924, hot: true },
  { label: 'ВОВ и Атомный проект (1941–1953)', from: 1941, to: 1953, hot: true },
];

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

  const activeAdvancedCount =
    (onlySynced || syncLinkTypeFilter !== 'all' ? 1 : 0) +
    (selectedSyncTag ? 1 : 0) +
    (branchPairFilter ? 1 : 0) +
    (auditUnlinkedMode ? 1 : 0);

  const selectedSyncTagMeta = useMemo(
    () => (selectedSyncTag ? syncTagOptions.find((t) => t.tag === selectedSyncTag) ?? null : null),
    [selectedSyncTag, syncTagOptions],
  );

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
      aria-label="Консоль поиска, эпох и исторических срезов"
      className="rounded-2xl bg-slate-900/65 border border-slate-800/80 p-3 sm:p-3.5 space-y-2.5"
    >
      {/* Первая строка (всегда видна): Быстрый поиск + Досье окна + Расширенный анализ + Сброс */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
        <div ref={searchWrapperRef} className="lg:col-span-7 relative">
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
            placeholder="Поиск по событиям, личностям (Витте, Сперанский, Потёмкин...), итогам, договорам, книгам..."
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
              className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl bg-[#0b1325] border border-sky-500/40 shadow-2xl overflow-hidden"
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

        <div className="lg:col-span-5 flex flex-wrap items-center justify-between lg:justify-end gap-1.5">
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
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/40 text-xs font-mono font-bold text-amber-200 transition-colors cursor-pointer whitespace-nowrap tabular-nums shrink-0"
              title={`Открыть сводное досье произвольного окна ${yearFrom}–${yearTo} гг.`}
            >
              <CalendarRange className="w-3.5 h-3.5 shrink-0" />
              <span>Досье окна ({yearFrom}–{yearTo})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleAdvanced}
            aria-expanded={isAdvancedExpanded}
            className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isAdvancedExpanded
                ? 'bg-slate-800 border-amber-400/60 text-white'
                : activeAdvancedCount > 0
                  ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-200'
                  : 'bg-slate-950/85 border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
            }`}
            title="Открыть инструменты расширенного анализа: типы связей, сюжеты синхронизации, пару веток А ↔ Б и аудит без связей"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Расширенный анализ</span>
            {activeAdvancedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 text-[10px] font-bold tabular-nums">
                {activeAdvancedCount}
              </span>
            )}
            {isAdvancedExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
          </button>

          {!isFullRange && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-xs font-mono font-semibold text-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Сбросить поисковый запрос, теги, пару веток, аудит, правителя и вернуть весь диапазон"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Все века</span>
            </button>
          )}
        </div>
      </div>

      {/* Вторая строка (всегда видна): Быстрые срезы веков и ключевых исторических узлов */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/60">
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 mr-1">
          <CalendarRange className="w-3.5 h-3.5 text-amber-400" />
          <span>Срезы эпох:</span>
        </span>
        {CENTURY_PRESETS.map((preset) => {
          const isActive = yearFrom === preset.from && yearTo === preset.to && !selectedRulerId;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onSelectYearRange(preset.from, preset.to)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                  : preset.hot
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20'
                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              {preset.hot && !isActive && <Sparkles className="w-3 h-3 inline mr-1 text-amber-400" />}
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Раскрываемый блок «Расширенный анализ» (Профессиональные аналитические инструменты) */}
      {isAdvancedExpanded && (
        <div className="pt-2.5 border-t border-slate-800/80 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
            <span>Инструменты перекрёстного анализа связей, пар веток и синхронии:</span>
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
