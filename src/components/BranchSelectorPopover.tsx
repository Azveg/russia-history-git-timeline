import { Check, ChevronDown, ChevronRight, GitBranch, Lock, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { groupBranchesByCategory } from '../engine/timelineEngine';
import type {
  BranchCategoryKey,
  BranchDefinition,
  BranchPresetId,
} from '../types/timeline';

interface BranchSelectorPopoverProps {
  branchControls: Array<BranchDefinition & { count: number }>;
  activeBranches: Record<string, boolean>;
  onToggleBranch: (branchId: string) => void;
  onToggleCategory: (branchIds: string[], enable: boolean) => void;
  onApplyPreset: (presetId: BranchPresetId) => void;
  onIsolateBranch: (branchId: string) => void;
}

const BRANCH_PRESETS: Array<{ id: BranchPresetId; label: string; title: string }> = [
  { id: 'all', label: 'Все ветки', title: 'Включить все ветки' },
  { id: 'rulers_wars', label: 'Правители и войны', title: 'Оставить правителей и военные кампании' },
  { id: 'eco_world', label: 'Экономика и мир', title: 'Сфокусироваться на реформах и мировом контексте' },
  { id: 'rulers_only', label: 'Только правители', title: 'Показать смену правителей вдоль оси времени' },
];

export function BranchSelectorPopover({
  branchControls,
  activeBranches,
  onToggleBranch,
  onToggleCategory,
  onApplyPreset,
  onIsolateBranch,
}: BranchSelectorPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const activeItems = useMemo(
    () => branchControls.filter((b) => activeBranches[b.id] !== false),
    [branchControls, activeBranches],
  );
  const totalCount = branchControls.length;
  const activeCount = activeItems.length;
  const hasFilteredBranches = activeCount < totalCount;

  const filteredControls = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return branchControls;
    return branchControls.filter(
      (b) =>
        b.label.toLowerCase().includes(q) ||
        b.gitName.toLowerCase().includes(q) ||
        b.short.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q),
    );
  }, [branchControls, searchQuery]);

  const groupedCategories = useMemo(
    () => groupBranchesByCategory(filteredControls),
    [filteredControls],
  );

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 30);

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

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

    function handleDialogWheel(e: WheelEvent) {
      const listEl = listRef.current;
      if (!listEl || !listEl.contains(e.target as Node)) {
        e.preventDefault();
        return;
      }
      const { scrollTop, scrollHeight, clientHeight } = listEl;
      if (scrollHeight <= clientHeight) {
        e.preventDefault();
        return;
      }
      const atTop = scrollTop <= 0 && e.deltaY < 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0;
      if (atTop || atBottom) {
        e.preventDefault();
      }
    }

    const dialogEl = dialogRef.current;
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown, true);
    dialogEl?.addEventListener('wheel', handleDialogWheel, { passive: false });
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown, true);
      dialogEl?.removeEventListener('wheel', handleDialogWheel);
    };
  }, [isOpen]);

  function toggleCategoryCollapse(key: BranchCategoryKey) {
    setCollapsedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`px-3 py-1.5 rounded-lg border text-[11px] font-mono font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
          isOpen
            ? 'bg-slate-800 border-amber-400/70 text-white shadow-md'
            : hasFilteredBranches
              ? 'bg-amber-500/15 border-amber-500/45 text-amber-200 hover:bg-amber-500/25'
              : 'bg-slate-900 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:border-slate-500'
        }`}
        title="Подключение и отключение веток графа (главная ось времени всегда активна)"
      >
        <GitBranch className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>Ветки</span>

        <span className="inline-flex items-center gap-1" aria-hidden="true">
          {activeItems.slice(0, 4).map((b) => (
            <span
              key={b.id}
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: b.color }}
            />
          ))}
          {activeItems.length > 4 && (
            <span className="text-[10px] text-slate-400">+{activeItems.length - 4}</span>
          )}
        </span>

        <span
          className={`tabular-nums px-1.5 py-0.5 rounded text-[10px] ${
            hasFilteredBranches ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
          }`}
        >
          {activeCount}/{totalCount}
        </span>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-label="Управление ветками таймлайна"
          className="absolute left-0 top-full mt-2 w-[340px] sm:w-[440px] max-w-[calc(100vw-1.5rem)] bg-[#090e1c] border border-slate-700/90 rounded-2xl shadow-2xl z-50 overflow-hidden animate-modal"
        >
          <div className="p-3 border-b border-slate-800/90 space-y-2.5 bg-slate-950/70">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск ветки по названию или теме..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Очистить поиск веток"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {hasFilteredBranches && (
                <button
                  type="button"
                  onClick={() => onApplyPreset('all')}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-semibold whitespace-nowrap cursor-pointer"
                >
                  Вкл все
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Закрыть меню веток"
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-500 mr-0.5">Наборы:</span>
              {BRANCH_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onApplyPreset(preset.id)}
                  title={preset.title}
                  className="px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 text-[11px] font-mono text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
              <span className="font-bold text-slate-200">time/main</span>
              <span className="text-slate-400 truncate">Центральная ось времени</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
              <Lock className="w-3 h-3 text-slate-500" />
              всегда активна
            </span>
          </div>

          <div
            ref={listRef}
            className="max-h-[52vh] overflow-y-auto overscroll-contain divide-y divide-slate-800/70"
          >
            {groupedCategories.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                По запросу «{searchQuery}» веток не найдено.
              </div>
            ) : (
              groupedCategories.map((group) => {
                const groupActiveCount = group.items.filter((b) => activeBranches[b.id] !== false).length;
                const allGroupActive = groupActiveCount === group.items.length;
                const isCollapsed = Boolean(collapsedCategories[group.key]) && searchQuery.trim() === '';
                const branchIds = group.items.map((b) => b.id);

                return (
                  <div key={group.key} className="py-2">
                    <div className="px-3 py-1 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCategoryCollapse(group.key)}
                        className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-300 hover:text-white cursor-pointer min-w-0"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                        <span className="truncate">{group.label}</span>
                        <span className="text-[10px] text-slate-500 tabular-nums shrink-0">
                          {groupActiveCount}/{group.items.length}
                        </span>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleCategory(branchIds, !allGroupActive)}
                          className="text-[10px] font-mono text-amber-300 hover:text-amber-200 hover:underline cursor-pointer whitespace-nowrap"
                        >
                          {allGroupActive ? 'Скрыть группу' : 'Вкл группу'}
                        </button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="mt-1 space-y-0.5 px-2">
                        {group.items.map((b) => {
                          const isActive = activeBranches[b.id] !== false;
                          return (
                            <div
                              key={b.id}
                              className={`group/row flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg transition-colors min-h-[36px] ${
                                isActive ? 'hover:bg-slate-900/90' : 'opacity-65 hover:opacity-100 hover:bg-slate-900/50'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => onToggleBranch(b.id)}
                                className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                                title={b.description}
                              >
                                <span
                                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                                    isActive
                                      ? 'border-transparent text-slate-950'
                                      : 'border-slate-700 bg-slate-950 text-transparent'
                                  }`}
                                  style={isActive ? { backgroundColor: b.color } : undefined}
                                >
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </span>

                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold text-white truncate">{b.label}</div>
                                  <div className="text-[10px] font-mono text-slate-400 truncate">{b.gitName}</div>
                                </div>
                              </button>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => onIsolateBranch(b.id)}
                                  className="opacity-0 group-hover/row:opacity-100 focus:opacity-100 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-200 transition-opacity cursor-pointer"
                                  title="Оставить на графе только эту ветку и ось времени"
                                >
                                  Только
                                </button>
                                <span className="text-[11px] font-mono tabular-nums text-slate-400 w-7 text-right">
                                  {b.count}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
