import { Check, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, GitBranch, GitMerge, Lock, Minus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getDescendantBranchIds,
  groupBranchesByCategory,
  isBranchOrDescendantActive,
} from '../engine/timelineEngine';
import { useWheelScrollContainment } from '../utils/scrollIsolation';
import type {
  BranchCategoryKey,
  BranchDefinition,
  BranchPresetId,
} from '../types/timeline';

type BranchControlItem = BranchDefinition & { count: number };

interface BranchSelectorPopoverProps {
  branchControls: BranchControlItem[];
  activeBranches: Record<string, boolean>;
  collapsedParents: Record<string, boolean>;
  onToggleBranch: (branchId: string) => void;
  onToggleCategory: (branchIds: string[], enable: boolean) => void;
  onApplyPreset: (presetId: BranchPresetId) => void;
  onIsolateBranch: (branchId: string) => void;
  onToggleCollapseParent: (parentId: string) => void;
}

export function BranchSelectorPopover({
  branchControls,
  activeBranches,
  collapsedParents,
  onToggleBranch,
  onToggleCategory,
  onApplyPreset,
  onIsolateBranch,
  onToggleCollapseParent,
}: BranchSelectorPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useWheelScrollContainment(listRef, isOpen);

  const leafControls = useMemo(
    () => branchControls.filter((b) => !b.isGroup),
    [branchControls],
  );

  const activeItems = useMemo(
    () => leafControls.filter((b) => activeBranches[b.id] !== false),
    [leafControls, activeBranches],
  );
  const totalCount = leafControls.length;
  const activeCount = activeItems.length;
  const hasFilteredBranches = activeCount < totalCount;

  const filteredControls = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return branchControls;

    const byId = new Map(branchControls.map((b) => [b.id, b]));
    const matchedIds = new Set<string>();

    branchControls.forEach((b) => {
      const hit =
        b.label.toLowerCase().includes(q) ||
        b.gitName.toLowerCase().includes(q) ||
        b.short.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q);
      if (hit) {
        matchedIds.add(b.id);
        let cur: BranchControlItem | undefined = b;
        const guard = new Set<string>();
        while (cur?.parentBranchId && !guard.has(cur.parentBranchId)) {
          guard.add(cur.parentBranchId);
          matchedIds.add(cur.parentBranchId);
          cur = byId.get(cur.parentBranchId);
        }
      }
    });

    return branchControls.filter((b) => matchedIds.has(b.id));
  }, [branchControls, searchQuery]);

  const groupedCategories = useMemo(
    () => groupBranchesByCategory(filteredControls),
    [filteredControls],
  );

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

  const allGroupsExpanded =
    groupedCategories.length > 0 &&
    groupedCategories.every((g) => Boolean(expandedCategories[g.key]));
  const anyGroupExpanded = groupedCategories.some((g) => Boolean(expandedCategories[g.key]));

  function toggleCategoryCollapse(key: BranchCategoryKey) {
    setExpandedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleExpandAllGroups() {
    const next: Record<string, boolean> = {};
    groupedCategories.forEach((g) => {
      next[g.key] = true;
    });
    setExpandedCategories(next);
  }

  function handleCollapseAllGroups() {
    setExpandedCategories({});
  }

  function renderBranchNode(
    b: BranchControlItem,
    childrenMap: Map<string, BranchControlItem[]>,
    depth: number,
  ) {
    const childItems = childrenMap.get(b.id) || [];
    const hasChildren = childItems.length > 0;
    const descendants = hasChildren ? getDescendantBranchIds(b.id, branchControls) : [];
    const leafDescendantObjs = descendants
      .map((id) => branchControls.find((item) => item.id === id))
      .filter((item): item is BranchControlItem => Boolean(item && !item.isGroup));

    let isChecked = activeBranches[b.id] !== false;
    let isIndeterminate = false;

    if (hasChildren && leafDescendantObjs.length > 0) {
      const activeDescCount = leafDescendantObjs.filter((d) => activeBranches[d.id] !== false).length;
      const ownActive = !b.isGroup && activeBranches[b.id] !== false;
      isChecked = isBranchOrDescendantActive(b, branchControls, activeBranches);
      isIndeterminate =
        (activeDescCount > 0 && activeDescCount < leafDescendantObjs.length) ||
        (!b.isGroup && ownActive && activeDescCount === 0);
    }

    const isTimelineCollapsed = hasChildren && Boolean(collapsedParents[b.id]);

    return (
      <div key={b.id}>
        <div
          className={`group/row flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg transition-colors min-h-[36px] ${
            isChecked ? 'hover:bg-slate-900/90' : 'opacity-65 hover:opacity-100 hover:bg-slate-900/50'
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
                isChecked
                  ? 'border-transparent text-slate-950'
                  : 'border-slate-700 bg-slate-950 text-transparent'
              }`}
              style={isChecked ? { backgroundColor: b.color } : undefined}
            >
              {isIndeterminate ? (
                <Minus className="w-3 h-3 stroke-[3]" />
              ) : (
                <Check className="w-3 h-3 stroke-[3]" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-semibold text-white truncate">{b.label}</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {b.description}
                {depth > 0 && (
                  <span className="text-slate-600 ml-1.5">· подветка</span>
                )}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasChildren && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCollapseParent(b.id);
                }}
                className={`px-1.5 py-0.5 rounded border text-[10px] font-mono inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                  isTimelineCollapsed
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 hover:bg-amber-500/30 font-semibold'
                    : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:border-slate-500 hover:text-white'
                }`}
                title={
                  isTimelineCollapsed
                    ? `Развернуть дочерние ветки (${childItems.length}) в отдельные линии на таймлайне`
                    : `Свернуть ${childItems.length} дочерних веток в одну общую линию на таймлайне`
                }
              >
                {isTimelineCollapsed ? (
                  <>
                    <GitBranch className="w-3 h-3" />
                    <span>Развернуть ({childItems.length})</span>
                  </>
                ) : (
                  <>
                    <GitMerge className="w-3 h-3" />
                    <span>В 1 линию</span>
                  </>
                )}
              </button>
            )}

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

        {hasChildren && (
          <div className="ml-4 pl-2.5 border-l border-slate-800 space-y-0.5 mt-0.5 mb-1">
            {childItems.map((child) => renderBranchNode(child, childrenMap, depth + 1))}
          </div>
        )}
      </div>
    );
  }

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
            : hasFilteredBranches
              ? 'bg-amber-500/12 border-amber-500/40 text-amber-200 hover:bg-amber-500/20'
              : 'bg-transparent border-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white'
        }`}
        title="Подключение и отключение веток графа (главная ось времени всегда активна)"
      >
        <GitBranch className="w-3.5 h-3.5 text-amber-400/85 shrink-0" />
        <span>Ветки</span>

        <span className="hidden xl:inline-flex items-center gap-1" aria-hidden="true">
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
          className={`tabular-nums text-[10px] ${
            hasFilteredBranches
              ? 'px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 font-normal'
          }`}
        >
          {activeCount}/{totalCount}
        </span>

        <ChevronDown
          className={`hidden min-[380px]:block w-3.5 h-3.5 text-slate-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Управление ветками таймлайна"
          className="fixed lg:absolute left-3 right-3 lg:left-0 lg:right-auto top-[54px] lg:top-full lg:mt-2 max-w-[500px] lg:max-w-[calc(100vw-2rem)] lg:w-[490px] mx-auto lg:mx-0 bg-[#090e1c] border border-slate-700/90 rounded-2xl shadow-2xl z-50 overflow-hidden animate-modal"
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
          </div>

          <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-900/50 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
              <span className="font-bold text-slate-200">Ось времени</span>
              <span className="text-slate-400 truncate hidden sm:inline">Центральная шкала правлений</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                <Lock className="w-3 h-3 text-slate-500" />
                всегда
              </span>
            </div>

            {groupedCategories.length > 0 && searchQuery.trim() === '' && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={allGroupsExpanded}
                  onClick={handleExpandAllGroups}
                  className="px-2 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none border border-slate-700/80 text-[10px] text-slate-200 inline-flex items-center gap-1 cursor-pointer transition-colors"
                  title="Развернуть все группы веток"
                >
                  <ChevronsUpDown className="w-3 h-3 text-amber-300" />
                  <span>Развернуть все</span>
                </button>
                <button
                  type="button"
                  disabled={!anyGroupExpanded}
                  onClick={handleCollapseAllGroups}
                  className="px-2 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none border border-slate-700/80 text-[10px] text-slate-200 inline-flex items-center gap-1 cursor-pointer transition-colors"
                  title="Свернуть все группы веток"
                >
                  <ChevronsDownUp className="w-3 h-3 text-slate-400" />
                  <span>Свернуть все</span>
                </button>
              </div>
            )}
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
                const leafGroupItems = group.items.filter((b) => !b.isGroup);
                const countTargetItems = leafGroupItems.length > 0 ? leafGroupItems : group.items;
                const groupActiveCount = countTargetItems.filter(
                  (b) => activeBranches[b.id] !== false,
                ).length;
                const allGroupActive = groupActiveCount === countTargetItems.length;
                const isCollapsed = searchQuery.trim() === '' && !expandedCategories[group.key];
                const branchIds = group.items.map((b) => b.id);

                // Строим локальное дерево parentBranchId внутри категории
                const groupIdSet = new Set(group.items.map((b) => b.id));
                const childrenMap = new Map<string, BranchControlItem[]>();
                const rootItems: BranchControlItem[] = [];

                group.items.forEach((b) => {
                  if (b.parentBranchId && groupIdSet.has(b.parentBranchId)) {
                    const list = childrenMap.get(b.parentBranchId) || [];
                    list.push(b);
                    childrenMap.set(b.parentBranchId, list);
                  } else {
                    rootItems.push(b);
                  }
                });

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
                          {groupActiveCount}/{countTargetItems.length}
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
                        {rootItems.map((root) => renderBranchNode(root, childrenMap, 0))}
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
