import {
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  Flag,
  MapPin,
  Minus,
  Plus,
  Rows3,
  Rows4,
  Ruler,
  SlidersHorizontal,
  Undo2,
  X,
} from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  MACRO_REGION_OPTIONS,
  computeMacroRegionCounts,
  getMacroRegionOption,
} from '../engine/regionFilter';
import { computeBranchPresetMap, resolveMacroEras } from '../engine/timelineEngine';
import type {
  BranchDefinition,
  BranchPresetId,
  CardDensity,
  EnrichedEvent,
  MacroEra,
  MacroRegionId,
  RulerPeriod,
  TimeScaleMode,
} from '../types/timeline';
import { BranchSelectorPopover } from './BranchSelectorPopover';
import { EPOCH_SLICE_PRESETS, EraSelectorPopover } from './EraSelectorPopover';
import { RulerSelectorPopover } from './RulerSelectorPopover';

interface TopControlBarProps {
  branchControls: Array<BranchDefinition & { count: number }>;
  activeBranches: Record<string, boolean>;
  collapsedParents: Record<string, boolean>;
  expectedTotalBranches?: number;
  isHydratingBranches?: boolean;
  onRequestAllBranches?: () => void;
  onToggleBranch: (branchId: string) => void;
  onToggleCategory: (branchIds: string[], enable: boolean) => void;
  onApplyPreset: (presetId: BranchPresetId) => void;
  onIsolateBranch: (branchId: string) => void;
  onToggleCollapseParent: (parentId: string) => void;
  eras: MacroEra[];
  enrichedEventsForEras: EnrichedEvent[];
  selectedEraId: string;
  onSelectEra: (eraId: string) => void;
  onOpenEraModal: (eraId: string) => void;
  rulers: RulerPeriod[];
  matchingEvents: EnrichedEvent[];
  selectedRulerId: string;
  onJumpToRuler: (rulerId: string) => void;
  onFilterByRuler: (rulerId: string) => void;
  onOpenRulerModal: (rulerId: string) => void;
  selectedMacroRegion?: MacroRegionId;
  macroRegionCounts?: Record<MacroRegionId, number>;
  onSelectMacroRegion?: (region: MacroRegionId) => void;
  yearFrom: number;
  yearTo: number;
  minYear?: number;
  maxYear?: number;
  onYearRangeChange: (from: number, to: number) => void;
  zoomHistoryCount: number;
  lastZoomStep: { from: number; to: number } | null;
  onStepBackZoom: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onShiftWindow: (direction: -1 | 1) => void;
  cardDensity: CardDensity;
  onChangeCardDensity: (density: CardDensity) => void;
  timeScaleMode: TimeScaleMode;
  onChangeTimeScaleMode: (mode: TimeScaleMode) => void;
  showEndNodes: boolean;
  onToggleShowEndNodes: () => void;
  onOpenWindowModal?: (from: number, to: number) => void;
  onResetTimeFilter?: () => void;
  isFiltersCollapsed: boolean;
  activeAdvancedCount?: number;
  onToggleFilters: () => void;
}

const QUICK_PRESETS: Array<{ id: BranchPresetId; label: string; shortLabel: string; title: string }> = [
  {
    id: 'overview',
    label: 'Обзор истории',
    shortLabel: 'Обзор',
    title: 'Ключевой срез: Правители, Большие войны, Экономика и реформы, Дипломатия',
  },
  {
    id: 'rulers_wars',
    label: 'Войны и дипломатия',
    shortLabel: 'Войны',
    title: 'Правители, все 5 ветвей военных кампаний и международные договоры',
  },
  {
    id: 'culture_science',
    label: 'Культура и наука',
    shortLabel: 'Культура',
    title: 'Правители, писатели и классические книги, учёные и научные открытия',
  },
  {
    id: 'all',
    label: 'Все ветки',
    shortLabel: 'Все',
    title: 'Включить все исторические, культурные и научные линии одновременно',
  },
];

export const TopControlBar = memo(function TopControlBar({
  branchControls,
  activeBranches,
  collapsedParents,
  expectedTotalBranches,
  isHydratingBranches = false,
  onRequestAllBranches,
  onToggleBranch,
  onToggleCategory,
  onApplyPreset,
  onIsolateBranch,
  onToggleCollapseParent,
  eras,
  enrichedEventsForEras,
  selectedEraId,
  onSelectEra,
  onOpenEraModal,
  rulers,
  matchingEvents,
  selectedRulerId,
  onJumpToRuler,
  onFilterByRuler,
  onOpenRulerModal,
  selectedMacroRegion = 'all',
  macroRegionCounts: externalMacroRegionCounts,
  onSelectMacroRegion,
  yearFrom,
  yearTo,
  minYear = 862,
  maxYear = 2000,
  onYearRangeChange,
  zoomHistoryCount,
  lastZoomStep,
  onStepBackZoom,
  onZoomIn,
  onZoomOut,
  onShiftWindow,
  cardDensity,
  onChangeCardDensity,
  timeScaleMode,
  onChangeTimeScaleMode,
  showEndNodes,
  onToggleShowEndNodes,
  onOpenWindowModal,
  onResetTimeFilter,
  isFiltersCollapsed,
  activeAdvancedCount = 0,
  onToggleFilters,
}: TopControlBarProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const presetPopoverRef = useRef<HTMLDivElement | null>(null);
  const regionPopoverRef = useRef<HTMLDivElement | null>(null);
  const viewPopoverRef = useRef<HTMLDivElement | null>(null);
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);
  const [isRegionMenuOpen, setIsRegionMenuOpen] = useState(false);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);

  const leafBranches = branchControls.filter((b) => !b.isGroup);
  const span = Math.max(1, yearTo - yearFrom);
  const fullSpan = Math.max(1, maxYear - minYear);
  const canZoomIn = span > 2;
  const canZoomOut = span < fullSpan;
  const canShiftLeft = yearFrom > minYear;
  const canShiftRight = yearTo < maxYear;

  const isPresetActive = (presetId: BranchPresetId): boolean => {
    if (leafBranches.length === 0) return false;
    const targetMap = computeBranchPresetMap(branchControls, presetId);
    return leafBranches.every((b) => Boolean(activeBranches[b.id] !== false) === Boolean(targetMap[b.id]));
  };

  const activePreset = QUICK_PRESETS.find((p) => isPresetActive(p.id)) ?? null;
  const activeRegionOption = getMacroRegionOption(selectedMacroRegion);
  const macroRegionCounts = useMemo(() => {
    if (externalMacroRegionCounts) return externalMacroRegionCounts;
    const windowEvents = enrichedEventsForEras.filter(
      (ev) => ev.endYear >= yearFrom && ev.startYear <= yearTo,
    );
    return computeMacroRegionCounts(windowEvents);
  }, [externalMacroRegionCounts, enrichedEventsForEras, yearFrom, yearTo]);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;

    const updateHeight = () => {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) {
        document.documentElement.style.setProperty('--top-bar-height', `${Math.round(rect.height)}px`);
      }
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isPresetMenuOpen && !isRegionMenuOpen && !isViewMenuOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (
        isPresetMenuOpen &&
        presetPopoverRef.current &&
        !presetPopoverRef.current.contains(e.target as Node)
      ) {
        setIsPresetMenuOpen(false);
      }
      if (
        isRegionMenuOpen &&
        regionPopoverRef.current &&
        !regionPopoverRef.current.contains(e.target as Node)
      ) {
        setIsRegionMenuOpen(false);
      }
      if (
        isViewMenuOpen &&
        viewPopoverRef.current &&
        !viewPopoverRef.current.contains(e.target as Node)
      ) {
        setIsViewMenuOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsPresetMenuOpen(false);
        setIsRegionMenuOpen(false);
        setIsViewMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isPresetMenuOpen, isRegionMenuOpen, isViewMenuOpen]);

  const hasCustomViewSettings =
    cardDensity === 'compact' || !showEndNodes || timeScaleMode === 'proportional';
  const viewSummaryParts: string[] = [];
  if (cardDensity === 'compact') viewSummaryParts.push('Компактно');
  if (timeScaleMode === 'proportional') viewSummaryParts.push('Пропорц.');
  if (!showEndNodes) viewSummaryParts.push('Без вех');
  const viewModeSummary = viewSummaryParts.length > 0 ? viewSummaryParts.join(' · ') : null;

  const resolvedEras = useMemo(() => resolveMacroEras(eras), [eras]);

  const timeBreadcrumb = useMemo(() => {
    const hasExplicitRuler = Boolean(selectedRulerId && selectedRulerId !== 'ALL');
    const explicitRuler = hasExplicitRuler
      ? (rulers.find((r) => r.id === selectedRulerId) ?? null)
      : null;

    const hasExplicitEra = Boolean(selectedEraId && selectedEraId !== 'ALL');
    const explicitEra = hasExplicitEra
      ? (resolvedEras.find((era) => era.id === selectedEraId) ?? null)
      : null;

    const isNarrowedWindow = yearFrom > minYear || yearTo < maxYear;
    const matchedRulerByBounds =
      !explicitRuler && !explicitEra && isNarrowedWindow
        ? (rulers.find((r) => r.startYear === yearFrom && r.endYear === yearTo) ?? null)
        : null;
    const matchedEraByBounds =
      !explicitRuler && !explicitEra && !matchedRulerByBounds && isNarrowedWindow
        ? (resolvedEras.find(
            (era) =>
              Math.max(minYear, era.startYear) === yearFrom &&
              Math.min(maxYear, era.endYear) === yearTo,
          ) ?? null)
        : null;
    const matchedPresetByBounds =
      !explicitRuler && !explicitEra && !matchedRulerByBounds && !matchedEraByBounds && isNarrowedWindow
        ? (EPOCH_SLICE_PRESETS.find((p) => p.from === yearFrom && p.to === yearTo) ?? null)
        : null;

    const isFiltered = Boolean(explicitRuler || explicitEra || isNarrowedWindow);

    let label = 'Все века';
    let detailTitle = `Открыть досье всего периода (${yearFrom}–${yearTo} гг.)`;

    if (explicitRuler) {
      label = explicitRuler.shortRuler;
      detailTitle = `Активный фильтр правителя: ${explicitRuler.ruler} (${yearFrom}–${yearTo}). Клик — досье окна`;
    } else if (explicitEra) {
      label = explicitEra.displayShortTitle;
      detailTitle = `Активный макро-период: ${explicitEra.title} (${yearFrom}–${yearTo}). Клик — досье окна`;
    } else if (matchedRulerByBounds) {
      label = matchedRulerByBounds.shortRuler;
      detailTitle = `Окно правления: ${matchedRulerByBounds.ruler} (${yearFrom}–${yearTo}). Клик — досье окна`;
    } else if (matchedEraByBounds) {
      label = matchedEraByBounds.displayShortTitle;
      detailTitle = `Окно макро-периода: ${matchedEraByBounds.title} (${yearFrom}–${yearTo}). Клик — досье окна`;
    } else if (matchedPresetByBounds) {
      label = matchedPresetByBounds.compactLabel.replace(/\s*·\s*\d+–\d+$/, '');
      detailTitle = `Срез: ${matchedPresetByBounds.label}. Клик — досье окна`;
    } else if (isNarrowedWindow) {
      label = 'Окно';
      detailTitle = `Выбранный интервал: ${yearFrom}–${yearTo} гг. Клик — досье окна`;
    }

    return {
      label,
      rangeText: `${yearFrom}–${yearTo}`,
      isFiltered,
      detailTitle,
    };
  }, [selectedRulerId, selectedEraId, rulers, resolvedEras, yearFrom, yearTo, minYear, maxYear]);

  const handleResetTimeBreadcrumb = () => {
    if (onResetTimeFilter) {
      onResetTimeFilter();
    } else {
      onSelectEra('ALL');
    }
  };

  return (
    <div
      ref={barRef}
      className="sticky top-0 z-50 bg-[#050811]/95 backdrop-blur-md border-b border-slate-800/90 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 py-1.5 xl:py-0 xl:min-h-12 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-1.5 xl:gap-2">
        {/* Строка 1 (на узких/планшетах) / Левая зона (на широких экранах): навигация и фильтры */}
        <div className="flex flex-wrap xl:flex-nowrap items-center gap-1 sm:gap-1.5 min-w-0">
          <BranchSelectorPopover
            branchControls={branchControls}
            activeBranches={activeBranches}
            collapsedParents={collapsedParents}
            expectedTotalBranches={expectedTotalBranches}
            isHydratingBranches={isHydratingBranches}
            onRequestAllBranches={onRequestAllBranches}
            onToggleBranch={onToggleBranch}
            onToggleCategory={onToggleCategory}
            onApplyPreset={onApplyPreset}
            onIsolateBranch={onIsolateBranch}
            onToggleCollapseParent={onToggleCollapseParent}
          />

          <EraSelectorPopover
            eras={eras}
            enrichedEvents={enrichedEventsForEras}
            selectedEraId={selectedEraId}
            yearFrom={yearFrom}
            yearTo={yearTo}
            minYear={minYear}
            maxYear={maxYear}
            onSelectEra={onSelectEra}
            onSelectYearRange={onYearRangeChange}
            onOpenEraModal={onOpenEraModal}
          />

          <RulerSelectorPopover
            rulers={rulers}
            matchingEvents={matchingEvents}
            selectedRulerId={selectedRulerId}
            yearFrom={yearFrom}
            yearTo={yearTo}
            minYear={minYear}
            maxYear={maxYear}
            onJumpToRuler={onJumpToRuler}
            onFilterByRuler={onFilterByRuler}
            onOpenRulerModal={onOpenRulerModal}
          />

          {/* Выпадающее меню «Срез» фиксированной ширины без выезжающей текстовой плашки */}
          <div ref={presetPopoverRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsPresetMenuOpen((prev) => !prev)}
              aria-expanded={isPresetMenuOpen}
              aria-haspopup="menu"
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-semibold inline-flex items-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                isPresetMenuOpen
                  ? 'bg-slate-800/95 border-amber-400/60 text-white'
                  : activePreset
                    ? 'bg-amber-500/12 border-amber-500/40 text-amber-200 hover:bg-amber-500/20'
                    : 'bg-transparent border-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
              title={activePreset ? `Текущий срез: ${activePreset.label}` : 'Выбрать быстрый срез веток'}
            >
              <Compass className="w-3.5 h-3.5 text-amber-400/85 shrink-0" />
              <span>Срез</span>
              <ChevronDown
                className={`hidden min-[380px]:block w-3.5 h-3.5 text-slate-500 transition-transform ${
                  isPresetMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isPresetMenuOpen && (
              <div
                role="menu"
                aria-label="Сценарии веток"
                className="fixed xl:absolute left-3 right-3 xl:left-0 xl:right-auto top-[calc(var(--top-bar-height,49px)+6px)] xl:top-full xl:mt-2 max-w-md xl:max-w-none xl:w-80 mx-auto xl:mx-0 bg-[#090e1c] border border-slate-700/90 rounded-2xl shadow-2xl z-50 p-1.5 space-y-1 animate-modal"
              >
                <div className="px-2.5 py-1 text-[10px] font-mono text-slate-400 border-b border-slate-800/80">
                  Быстрый выбор тематических линий
                </div>
                {QUICK_PRESETS.map((preset) => {
                  const active = isPresetActive(preset.id);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onApplyPreset(preset.id);
                        setIsPresetMenuOpen(false);
                      }}
                      className={`w-full flex items-start justify-between gap-2 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-amber-500/15 border border-amber-500/45 text-white'
                          : 'hover:bg-slate-900 border border-transparent text-slate-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white">{preset.label}</div>
                        <div className="text-[11px] text-slate-400 leading-snug mt-0.5">{preset.title}</div>
                      </div>
                      {active && <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Выпадающее меню фильтра по макрорегионам фиксированной ширины */}
          {onSelectMacroRegion && (
            <div ref={regionPopoverRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsRegionMenuOpen((prev) => !prev)}
                aria-expanded={isRegionMenuOpen}
                aria-haspopup="menu"
                className={`px-2 sm:px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-semibold inline-flex items-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  isRegionMenuOpen
                    ? 'bg-slate-800/95 border-amber-400/60 text-white'
                    : selectedMacroRegion !== 'all'
                      ? 'bg-amber-500/12 border-amber-500/40 text-amber-200 hover:bg-amber-500/20'
                      : 'bg-transparent border-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
                title={
                  selectedMacroRegion !== 'all'
                    ? `Активный макрорегион: ${activeRegionOption.label} (${macroRegionCounts[selectedMacroRegion] ?? 0} соб.)`
                    : 'Фильтр событий по макрорегиону'
                }
              >
                <MapPin className="w-3.5 h-3.5 text-amber-400/85 shrink-0" />
                <span>Регион</span>
                <ChevronDown
                  className={`hidden min-[380px]:block w-3.5 h-3.5 text-slate-500 transition-transform ${
                    isRegionMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isRegionMenuOpen && (
                <div
                  role="menu"
                  aria-label="Фильтр по макрорегионам"
                  className="fixed xl:absolute left-3 right-3 xl:left-0 xl:right-auto top-[calc(var(--top-bar-height,49px)+6px)] xl:top-full xl:mt-2 max-w-md xl:max-w-none xl:w-80 mx-auto xl:mx-0 bg-[#090e1c] border border-slate-700/90 rounded-2xl shadow-2xl z-50 p-1.5 space-y-1 max-h-[75vh] overflow-y-auto animate-modal"
                >
                  <div className="px-2.5 py-1 flex items-center justify-between gap-2 text-[10px] font-mono text-slate-400 border-b border-slate-800/80">
                    <span>Макрорегион · {yearFrom}–{yearTo} гг.</span>
                    {selectedMacroRegion !== 'all' && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectMacroRegion('all');
                          setIsRegionMenuOpen(false);
                        }}
                        className="text-amber-300 hover:text-white underline underline-offset-2 cursor-pointer"
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                  {MACRO_REGION_OPTIONS.map((opt) => {
                    const active = selectedMacroRegion === opt.id;
                    const count = macroRegionCounts[opt.id] ?? 0;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onSelectMacroRegion(opt.id);
                          setIsRegionMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-amber-500/15 border border-amber-500/45 text-white'
                            : 'hover:bg-slate-900 border border-transparent text-slate-200'
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <MapPin
                            className={`w-3.5 h-3.5 shrink-0 ${
                              active ? 'text-amber-400' : 'text-slate-500'
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {opt.label}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums ${
                              active
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                            }`}
                          >
                            {count}
                          </span>
                          {active && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Строка 2 (на узких/планшетах) / Правая зона (на широких экранах): масштаб, интервал, Вид и Анализ */}
        <div className="flex items-center justify-between xl:justify-end gap-1.5 min-w-0 border-t border-slate-800/70 pt-1.5 xl:border-t-0 xl:pt-0 xl:ml-auto xl:shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            {/* Компактный блок шага масштаба назад и зума +/- фиксированной ширины */}
            <div
              className="hidden min-[400px]:inline-flex items-center gap-0.5 text-[11px] font-mono shrink-0"
              role="group"
              aria-label="Управление масштабом окна времени"
            >
              <button
                type="button"
                onClick={onStepBackZoom}
                disabled={zoomHistoryCount === 0}
                aria-label="Шаг назад по масштабу"
                title={
                  lastZoomStep
                    ? `Вернуться к предыдущему масштабу: ${lastZoomStep.from}–${lastZoomStep.to} гг. (шагов в истории: ${zoomHistoryCount})`
                    : 'История масштабирования пуста'
                }
                className={`p-1.5 rounded-md inline-flex items-center justify-center transition-colors ${
                  zoomHistoryCount > 0
                    ? 'text-amber-300 hover:bg-slate-800/70 hover:text-amber-200 cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <Undo2 className="w-3.5 h-3.5 shrink-0" />
              </button>

              <span className="w-px h-3.5 bg-slate-800/90 mx-0.5" aria-hidden="true" />

              <button
                type="button"
                onClick={onZoomOut}
                disabled={!canZoomOut}
                aria-label="Отдалить окно времени в 2 раза"
                title={
                  canZoomOut
                    ? `Отдалить масштаб ×2 вокруг центра окна (${Math.round((yearFrom + yearTo) / 2)} г.)`
                    : 'Уже открыт весь период (862–2000)'
                }
                className={`p-1.5 rounded-md inline-flex items-center justify-center transition-colors ${
                  canZoomOut
                    ? 'text-slate-300 hover:bg-slate-800/70 hover:text-white cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <Minus className="w-3.5 h-3.5 shrink-0" />
              </button>

              <button
                type="button"
                onClick={onZoomIn}
                disabled={!canZoomIn}
                aria-label="Приблизить окно времени в 2 раза"
                title={
                  canZoomIn
                    ? `Приблизить масштаб ×2 вокруг центра окна (${Math.round((yearFrom + yearTo) / 2)} г.)`
                    : 'Достигнут максимальный масштаб (2–3 года)'
                }
                className={`p-1.5 rounded-md inline-flex items-center justify-center transition-colors ${
                  canZoomIn
                    ? 'text-slate-300 hover:bg-slate-800/70 hover:text-amber-200 cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>

            {/* Единая хлебная крошка активного временного фильтра (открытие досье окна + сброс × в один клик) */}
            <div
              className={`inline-flex items-center rounded-lg border text-xs transition-colors min-w-0 ${
                timeBreadcrumb.isFiltered
                  ? 'bg-amber-500/12 border-amber-500/35 text-amber-100'
                  : 'bg-slate-900/65 border-slate-800/80 text-slate-300'
              }`}
            >
              <button
                type="button"
                onClick={() => onOpenWindowModal?.(yearFrom, yearTo)}
                disabled={!onOpenWindowModal}
                title={timeBreadcrumb.detailTitle}
                className={`px-2 py-1 inline-flex items-center gap-1.5 min-w-0 whitespace-nowrap transition-colors ${
                  onOpenWindowModal
                    ? 'hover:text-white cursor-pointer'
                    : 'cursor-default'
                }`}
              >
                <CalendarRange
                  className={`w-3.5 h-3.5 shrink-0 ${
                    timeBreadcrumb.isFiltered ? 'text-amber-300' : 'text-slate-400'
                  }`}
                />
                <span className="hidden sm:inline font-sans font-semibold max-w-[116px] md:max-w-[148px] xl:max-w-[132px] truncate">
                  {timeBreadcrumb.label}
                </span>
                <span aria-hidden="true" className="hidden sm:inline text-slate-500 shrink-0">
                  ·
                </span>
                <span
                  className={`font-mono font-semibold tabular-nums shrink-0 ${
                    timeBreadcrumb.isFiltered ? 'text-amber-300' : 'text-slate-300'
                  }`}
                >
                  {timeBreadcrumb.rangeText}
                </span>
              </button>

              {timeBreadcrumb.isFiltered && (
                <button
                  type="button"
                  onClick={handleResetTimeBreadcrumb}
                  aria-label="Сбросить временной фильтр ко всем векам"
                  title={`Сбросить фильтр и вернуть все века (${minYear}–${maxYear})`}
                  className="pr-1.5 pl-1 py-1 border-l border-amber-500/25 text-amber-300/85 hover:text-white hover:bg-amber-500/20 rounded-r-lg transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="hidden 2xl:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-1 text-[11px] font-mono shrink-0">
              <button
                type="button"
                onClick={() => onShiftWindow(-1)}
                disabled={!canShiftLeft}
                aria-label="Сдвинуть окно времени влево"
                title={
                  canShiftLeft
                    ? `Сдвинуть окно назад на ${Math.max(1, Math.round(span / 2))} л.`
                    : 'Достигнута нижняя граница хронологии'
                }
                className={`p-0.5 rounded transition-colors ${
                  canShiftLeft
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-300 cursor-pointer'
                    : 'text-slate-700 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-slate-400">Окно:</span>
              <input
                type="number"
                min={minYear}
                max={maxYear}
                value={yearFrom}
                aria-label="Год начала"
                onChange={(e) => onYearRangeChange(Number(e.target.value), yearTo)}
                className="w-13 bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-amber-300 font-bold text-center tabular-nums focus:outline-none focus:border-amber-500"
              />
              <span className="text-slate-500">—</span>
              <input
                type="number"
                min={minYear}
                max={maxYear}
                value={yearTo}
                aria-label="Год окончания"
                onChange={(e) => onYearRangeChange(yearFrom, Number(e.target.value))}
                className="w-13 bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-amber-300 font-bold text-center tabular-nums focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => onShiftWindow(1)}
                disabled={!canShiftRight}
                aria-label="Сдвинуть окно времени вправо"
                title={
                  canShiftRight
                    ? `Сдвинуть окно вперёд на ${Math.max(1, Math.round(span / 2))} л.`
                    : 'Достигнута верхняя граница хронологии'
                }
                className={`p-0.5 rounded transition-colors ${
                  canShiftRight
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-300 cursor-pointer'
                    : 'text-slate-700 cursor-not-allowed'
                }`}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Правая группа действий (Вид и Анализ) — фиксированная ширина, всегда в пределах экрана */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <span className="hidden xl:block w-px h-4 bg-slate-800/90 shrink-0" aria-hidden="true" />

            {/* Единое меню «Вид» без текстовых плашек статуса — только мягкая подсветка при активных настройках */}
            <div ref={viewPopoverRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsViewMenuOpen((prev) => !prev)}
                aria-expanded={isViewMenuOpen}
                aria-haspopup="menu"
                className={`px-2 sm:px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-semibold inline-flex items-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  isViewMenuOpen
                    ? 'bg-slate-800/95 border-amber-400/60 text-white'
                    : hasCustomViewSettings
                      ? 'bg-amber-500/12 border-amber-500/40 text-amber-200 hover:bg-amber-500/20'
                      : 'bg-transparent border-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
                title={
                  viewModeSummary
                    ? `Настройки отображения ленты (${viewModeSummary})`
                    : 'Настройки отображения ленты (плотность карточек, масштаб оси и вехи завершения)'
                }
              >
                <Eye className="w-3.5 h-3.5 text-amber-400/85 shrink-0" />
                <span>Вид</span>
                <ChevronDown
                  className={`hidden min-[380px]:block w-3.5 h-3.5 text-slate-500 transition-transform ${
                    isViewMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isViewMenuOpen && (
                <div
                  role="menu"
                  aria-label="Настройки вида"
                  className="fixed xl:absolute left-3 right-3 xl:left-auto xl:right-0 top-[calc(var(--top-bar-height,49px)+6px)] xl:top-full xl:mt-2 max-w-sm xl:max-w-none xl:w-80 mx-auto xl:mx-0 bg-[#090e1c] border border-slate-700/90 rounded-2xl shadow-2xl z-50 p-2.5 space-y-2.5 animate-modal"
                >
                  <div>
                    <div className="px-1.5 pb-1.5 text-[10px] font-mono text-slate-400">
                      Плотность карточек в ленте
                    </div>
                    <div
                      className="grid grid-cols-2 gap-1 rounded-xl bg-slate-950 border border-slate-800 p-1 text-[11px] font-mono"
                      role="group"
                      aria-label="Плотность карточек"
                    >
                      <button
                        type="button"
                        onClick={() => onChangeCardDensity('detailed')}
                        className={`px-2 py-1.5 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          cardDensity === 'detailed'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'text-slate-300 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        <Rows3 className="w-3.5 h-3.5 shrink-0" />
                        <span>Подробно</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeCardDensity('compact')}
                        className={`px-2 py-1.5 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          cardDensity === 'compact'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'text-slate-300 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        <Rows4 className="w-3.5 h-3.5 shrink-0" />
                        <span>Компактно</span>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 pt-2">
                    <div className="px-1.5 pb-1.5 text-[10px] font-mono text-slate-400">
                      Масштаб оси времени
                    </div>
                    <div
                      className="grid grid-cols-2 gap-1 rounded-xl bg-slate-950 border border-slate-800 p-1 text-[11px] font-mono"
                      role="group"
                      aria-label="Режим шкалы времени"
                    >
                      <button
                        type="button"
                        onClick={() => onChangeTimeScaleMode('compact')}
                        className={`px-2 py-1.5 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          timeScaleMode === 'compact'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'text-slate-300 hover:text-white hover:bg-slate-900'
                        }`}
                        title="Плотная событийная лента без пустых вертикальных промежутков"
                      >
                        <Rows4 className="w-3.5 h-3.5 shrink-0" />
                        <span>Событийная</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeTimeScaleMode('proportional')}
                        className={`px-2 py-1.5 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          timeScaleMode === 'proportional'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'text-slate-300 hover:text-white hover:bg-slate-900'
                        }`}
                        title="Пропорциональная шкала: визуальные интервалы между строками отражают дистанцию в годах"
                      >
                        <Ruler className="w-3.5 h-3.5 shrink-0" />
                        <span>По годам</span>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 pt-2">
                    <button
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={showEndNodes}
                      onClick={onToggleShowEndNodes}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                        showEndNodes
                          ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200 hover:bg-emerald-500/15'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <div className="min-w-0 flex items-start gap-2">
                        <Flag className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white">Вехи завершения</div>
                          <div className="text-[11px] text-slate-400 leading-snug">
                            Отметки окончания правлений и процессов
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                          showEndNodes
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {showEndNodes ? 'ВКЛ' : 'ВЫКЛ'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onToggleFilters}
              aria-expanded={!isFiltersCollapsed}
              aria-label={
                isFiltersCollapsed
                  ? 'Включить профи-режим анализа: карта полос, режим кампаний и расширенные фильтры'
                  : 'Свернуть профи-режим анализа'
              }
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                !isFiltersCollapsed
                  ? 'bg-slate-800/95 border-amber-400/60 text-white'
                  : activeAdvancedCount > 0
                    ? 'bg-emerald-500/15 border-emerald-400/55 text-emerald-200 hover:bg-emerald-500/25'
                    : 'bg-transparent border-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
              title="Профи-режим анализа: открыть или свернуть карту полос, режим кампаний, связи, сюжеты, сравнение периодов и досье окна"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400/85 shrink-0" />
              <span className="hidden min-[360px]:inline">Анализ</span>
              {activeAdvancedCount > 0 && (
                <span className="text-emerald-300 text-[10px] font-bold tabular-nums">
                  {activeAdvancedCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});


