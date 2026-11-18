import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  Flag,
  GitCompareArrows,
  Minus,
  Plus,
  Rows3,
  Rows4,
  SlidersHorizontal,
  Undo2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { computeBranchPresetMap } from '../engine/timelineEngine';
import type {
  BranchDefinition,
  BranchPresetId,
  CardDensity,
  EnrichedEvent,
  MacroEra,
  RulerPeriod,
} from '../types/timeline';
import { BranchSelectorPopover } from './BranchSelectorPopover';
import { EraSelectorPopover } from './EraSelectorPopover';
import { RulerSelectorPopover } from './RulerSelectorPopover';

interface TopControlBarProps {
  branchControls: Array<BranchDefinition & { count: number }>;
  activeBranches: Record<string, boolean>;
  collapsedParents: Record<string, boolean>;
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
  showEndNodes: boolean;
  onToggleShowEndNodes: () => void;
  onOpenCompareModal?: () => void;
  onOpenWindowModal?: (from: number, to: number) => void;
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

export function TopControlBar({
  branchControls,
  activeBranches,
  collapsedParents,
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
  showEndNodes,
  onToggleShowEndNodes,
  onOpenCompareModal,
  onOpenWindowModal,
  isFiltersCollapsed,
  activeAdvancedCount = 0,
  onToggleFilters,
}: TopControlBarProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const presetPopoverRef = useRef<HTMLDivElement | null>(null);
  const viewPopoverRef = useRef<HTMLDivElement | null>(null);
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);
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
    if (!isPresetMenuOpen && !isViewMenuOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (
        isPresetMenuOpen &&
        presetPopoverRef.current &&
        !presetPopoverRef.current.contains(e.target as Node)
      ) {
        setIsPresetMenuOpen(false);
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
        setIsViewMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isPresetMenuOpen, isViewMenuOpen]);

  const hasCustomViewSettings = cardDensity === 'compact' || !showEndNodes;
  const viewModeSummary =
    cardDensity === 'compact' && !showEndNodes
      ? 'Компактно · Без вех'
      : cardDensity === 'compact'
        ? 'Компактно'
        : !showEndNodes
          ? 'Без вех'
          : null;

  return (
    <div
      ref={barRef}
      className="sticky top-0 z-50 bg-[#050811]/95 backdrop-blur-md border-b border-slate-800/90 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 h-12 flex flex-nowrap items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex flex-nowrap items-center gap-1 sm:gap-1.5 shrink-0">
          <BranchSelectorPopover
            branchControls={branchControls}
            activeBranches={activeBranches}
            collapsedParents={collapsedParents}
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

          {/* Выпадающее меню «Срез» для всех размеров экрана */}
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
              {activePreset && (
                <span className="hidden lg:inline px-1.5 py-0.5 rounded bg-amber-500/90 text-slate-950 font-bold text-[10px]">
                  {activePreset.shortLabel}
                </span>
              )}
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
                className="fixed lg:absolute left-3 right-3 lg:left-0 lg:right-auto top-[54px] lg:top-full lg:mt-2 max-w-md lg:max-w-none lg:w-80 mx-auto lg:mx-0 bg-[#090e1c] border border-slate-700/90 rounded-2xl shadow-2xl z-50 p-1.5 space-y-1 animate-modal"
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
        </div>

        <div className="flex flex-nowrap items-center gap-1 sm:gap-1.5 ml-auto shrink-0">
          {/* Компактный блок шага масштаба назад и зума +/- в тихом ghost-стиле */}
          <div
            className="hidden sm:inline-flex items-center gap-0.5 text-[11px] font-mono shrink-0"
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
              className={`px-1.5 py-1 rounded-md inline-flex items-center gap-1 transition-colors whitespace-nowrap ${
                zoomHistoryCount > 0
                  ? 'text-amber-300 hover:bg-slate-800/70 hover:text-amber-200 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Назад</span>
              {zoomHistoryCount > 0 && (
                <span className="text-amber-300 text-[10px] font-bold tabular-nums">
                  {zoomHistoryCount}
                </span>
              )}
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
              className={`px-1.5 py-1 rounded-md inline-flex items-center gap-0.5 transition-colors whitespace-nowrap ${
                canZoomOut
                  ? 'text-slate-300 hover:bg-slate-800/70 hover:text-white cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <Minus className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline text-[10px] font-semibold">×2</span>
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
              className={`px-1.5 py-1 rounded-md inline-flex items-center gap-0.5 transition-colors whitespace-nowrap ${
                canZoomIn
                  ? 'text-slate-300 hover:bg-slate-800/70 hover:text-amber-200 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline text-[10px] font-semibold">×2</span>
            </button>
          </div>

          <span className="hidden sm:block w-px h-4 bg-slate-800/90 shrink-0" aria-hidden="true" />

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

          {/* Единое меню «Вид» (плотность карточек, вехи завершения, сравнение и досье окна) */}
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
              title="Настройки отображения ленты, вехи завершения и инструменты сравнения периодов"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400/85 shrink-0" />
              <span>Вид</span>
              {viewModeSummary && (
                <span className="hidden lg:inline px-1.5 py-0.5 rounded bg-amber-500/90 text-slate-950 font-bold text-[10px]">
                  {viewModeSummary}
                </span>
              )}
              <ChevronDown
                className={`hidden min-[380px]:block w-3.5 h-3.5 text-slate-500 transition-transform ${
                  isViewMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isViewMenuOpen && (
              <div
                role="menu"
                aria-label="Настройки вида и сравнения"
                className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-[54px] sm:top-full sm:mt-2 max-w-sm sm:max-w-none sm:w-80 mx-auto sm:mx-0 bg-[#090e1c] border border-slate-700/90 rounded-2xl shadow-2xl z-50 p-2.5 space-y-2.5 animate-modal"
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

                {(onOpenCompareModal || onOpenWindowModal) && (
                  <div className="border-t border-slate-800/80 pt-2 space-y-1">
                    <div className="px-1.5 pb-0.5 text-[10px] font-mono text-slate-400">
                      Сводки и сопоставления
                    </div>
                    {onOpenCompareModal && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsViewMenuOpen(false);
                          onOpenCompareModal();
                        }}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-slate-950/70 hover:bg-sky-500/15 border border-slate-800 hover:border-sky-500/40 text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <GitCompareArrows className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="text-xs font-semibold text-sky-100 truncate">
                            Сравнить два периода
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-sky-300 shrink-0">→</span>
                      </button>
                    )}

                    {onOpenWindowModal && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsViewMenuOpen(false);
                          onOpenWindowModal(yearFrom, yearTo);
                        }}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-slate-950/70 hover:bg-amber-500/15 border border-slate-800 hover:border-amber-500/40 text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <BarChart3 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-xs font-semibold text-amber-100 truncate tabular-nums">
                            Досье окна ({yearFrom}–{yearTo})
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-amber-300 shrink-0">→</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleFilters}
            aria-expanded={!isFiltersCollapsed}
            aria-label={
              isFiltersCollapsed
                ? 'Развернуть инструменты расширенного анализа'
                : 'Свернуть инструменты расширенного анализа'
            }
            className={`px-2 sm:px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              !isFiltersCollapsed
                ? 'bg-slate-800/95 border-amber-400/60 text-white'
                : activeAdvancedCount > 0
                  ? 'bg-emerald-500/15 border-emerald-400/55 text-emerald-200 hover:bg-emerald-500/25'
                  : 'bg-transparent border-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white'
            }`}
            title="Развернуть или свернуть панель «Расширенный анализ» (типы связей, сюжеты синхронизации, пара веток, аудит)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400/85 shrink-0" />
            <span className="hidden sm:inline">{isFiltersCollapsed ? '+ Анализ' : '− Анализ'}</span>
            {activeAdvancedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 text-[10px] font-bold tabular-nums">
                {activeAdvancedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


