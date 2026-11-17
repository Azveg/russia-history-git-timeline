import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
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
  isFiltersCollapsed,
  activeAdvancedCount = 0,
  onToggleFilters,
}: TopControlBarProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const presetPopoverRef = useRef<HTMLDivElement | null>(null);
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);

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
    if (!isPresetMenuOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (presetPopoverRef.current && !presetPopoverRef.current.contains(e.target as Node)) {
        setIsPresetMenuOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsPresetMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isPresetMenuOpen]);

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
                  ? 'bg-slate-800 border-amber-400/70 text-white shadow-md'
                  : activePreset
                    ? 'bg-amber-500/15 border-amber-500/45 text-amber-200 hover:bg-amber-500/25'
                    : 'bg-slate-900 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:border-slate-500'
              }`}
              title={activePreset ? `Текущий срез: ${activePreset.label}` : 'Выбрать быстрый срез веток'}
            >
              <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Срез</span>
              {activePreset && (
                <span className="hidden lg:inline px-1.5 py-0.5 rounded bg-amber-500/90 text-slate-950 font-bold text-[10px]">
                  {activePreset.shortLabel}
                </span>
              )}
              <ChevronDown
                className={`hidden min-[380px]:block w-3.5 h-3.5 text-slate-400 transition-transform ${
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
          {/* Компактный блок шага масштаба назад и зума +/- в шапке */}
          <div
            className="hidden sm:inline-flex items-center gap-0.5 rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px] font-mono shrink-0"
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
                  ? 'text-amber-300 hover:bg-slate-800 hover:text-amber-200 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Назад</span>
              {zoomHistoryCount > 0 && (
                <span className="px-1 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold tabular-nums">
                  {zoomHistoryCount}
                </span>
              )}
            </button>

            <span className="w-px h-4 bg-slate-800 mx-0.5" aria-hidden="true" />

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
                  ? 'text-slate-200 hover:bg-slate-800 hover:text-white cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <Minus className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline text-[10px] font-bold">×2</span>
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
                  ? 'text-amber-300 hover:bg-slate-800 hover:text-amber-200 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline text-[10px] font-bold">×2</span>
            </button>
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

          <div
            className="inline-flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px] font-mono shrink-0"
            role="group"
            aria-label="Плотность карточек"
          >
            <button
              type="button"
              onClick={() => onChangeCardDensity('detailed')}
              aria-label="Подробный режим карточек"
              className={`px-1.5 xl:px-2 py-1 rounded-md inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                cardDensity === 'detailed'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Подробные карточки с ключевыми итогами, участниками и шкалой правлений"
            >
              <Rows3 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Подробно</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeCardDensity('compact')}
              aria-label="Компактный режим карточек"
              className={`px-1.5 xl:px-2 py-1 rounded-md inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                cardDensity === 'compact'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Компактные однострочные записи для быстрого обзора больших эпох"
            >
              <Rows4 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Компактно</span>
            </button>
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
                ? 'bg-slate-800/90 border-amber-400/60 text-white hover:bg-slate-800'
                : activeAdvancedCount > 0
                  ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/25'
                  : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title="Развернуть или свернуть панель «Расширенный анализ» (типы связей, сюжеты синхронизации, пара веток, аудит)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
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


