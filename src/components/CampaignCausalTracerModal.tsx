import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Compass,
  Filter,
  GitBranch,
  Globe2,
  Layers,
  Link2,
  Search,
  Swords,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { traceCausalChain } from '../engine/timelineEngine';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import type {
  BranchDefinition,
  CausalChainMode,
  CausalChainNodeEntry,
  CausalChainResult,
  CausalChainScope,
  EnrichedEvent,
  ModalHistoryItem,
} from '../types/timeline';
import { DossierModalHeader } from './DossierModalHeader';

interface CampaignCausalTracerModalProps {
  rootEventId: string;
  enrichedEvents: EnrichedEvent[];
  branches: BranchDefinition[];
  activeCampaignId?: string | null;
  activeCampaignTitle?: string | null;
  modalHistory?: ModalHistoryItem[];
  onClose: () => void;
  onNavigateBack?: () => void;
  onOpenCard: (eventId: string) => void;
  onJumpToTimelineRow: (eventId: string) => void;
  onApplyTracedChain: (result: CausalChainResult, mode: CausalChainMode) => void;
}

type DepthOption = 'all' | 1 | 2 | 3;

const DEPTH_OPTIONS: Array<{ value: DepthOption; label: string }> = [
  { value: 'all', label: 'Вся глубина' },
  { value: 1, label: '1 шаг' },
  { value: 2, label: '2 шага' },
  { value: 3, label: '3 шага' },
];

export function CampaignCausalTracerModal({
  rootEventId,
  enrichedEvents,
  branches,
  activeCampaignId = null,
  activeCampaignTitle = null,
  modalHistory = [],
  onClose,
  onNavigateBack,
  onOpenCard,
  onJumpToTimelineRow,
  onApplyTracedChain,
}: CampaignCausalTracerModalProps) {
  const [currentRootId, setCurrentRootId] = useState(rootEventId);
  const [localHistory, setLocalHistory] = useState<string[]>([]);
  const [mode, setMode] = useState<CausalChainMode>('causal_only');
  const [depth, setDepth] = useState<DepthOption>('all');
  const [scope, setScope] = useState<CausalChainScope>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentRootId(rootEventId);
    setLocalHistory([]);
    setSearchQuery('');
    setExpandedPaths({});
    bodyRef.current?.scrollTo({ top: 0 });
  }, [rootEventId]);

  const dialogRef = useModalFocusTrap<HTMLDivElement>(onClose);

  const eventById = useMemo(
    () => new Map(enrichedEvents.map((ev) => [ev.id, ev])),
    [enrichedEvents],
  );

  const chainResult = useMemo(
    () =>
      traceCausalChain(currentRootId, enrichedEvents, branches, {
        mode,
        maxDepth: depth === 'all' ? null : depth,
        scope: activeCampaignId ? scope : 'all',
        activeCampaignPackId: activeCampaignId,
      }),
    [currentRootId, enrichedEvents, branches, mode, depth, scope, activeCampaignId],
  );

  const handleRecenter = (nextEventId: string) => {
    if (nextEventId === currentRootId) return;
    setLocalHistory((prev) => [...prev.slice(-11), currentRootId]);
    setCurrentRootId(nextEventId);
    setExpandedPaths({});
    bodyRef.current?.scrollTo({ top: 0 });
  };

  const handleStepBackLocal = () => {
    if (localHistory.length === 0) return;
    const prevId = localHistory[localHistory.length - 1];
    setLocalHistory((prev) => prev.slice(0, -1));
    setCurrentRootId(prevId);
    setExpandedPaths({});
    bodyRef.current?.scrollTo({ top: 0 });
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const matchesSearch = (entry: CausalChainNodeEntry): boolean => {
    if (!normalizedQuery) return true;
    const hay = [
      entry.event.title,
      entry.event.period,
      entry.branchLabel,
      entry.viaEdge?.label ?? '',
      entry.event.subtitle ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(normalizedQuery);
  };

  const filteredUpstreamLayers = useMemo(() => {
    if (!chainResult) return [];
    return chainResult.upstreamLayers
      .map((layer) => ({
        ...layer,
        items: layer.items.filter(matchesSearch),
      }))
      .filter((layer) => layer.items.length > 0);
  }, [chainResult, normalizedQuery]);

  const filteredDownstreamLayers = useMemo(() => {
    if (!chainResult) return [];
    return chainResult.downstreamLayers
      .map((layer) => ({
        ...layer,
        items: layer.items.filter(matchesSearch),
      }))
      .filter((layer) => layer.items.length > 0);
  }, [chainResult, normalizedQuery]);

  const filteredSynchronous = useMemo(
    () => (chainResult ? chainResult.synchronousItems.filter(matchesSearch) : []),
    [chainResult, normalizedQuery],
  );

  const filteredCultural = useMemo(
    () => (chainResult ? chainResult.culturalItems.filter(matchesSearch) : []),
    [chainResult, normalizedQuery],
  );

  if (!chainResult) return null;

  const { root, stats } = chainResult;
  const lastHistoryItem = modalHistory.length > 0 ? modalHistory[modalHistory.length - 1] : null;
  const prevLocalEvent =
    localHistory.length > 0 ? eventById.get(localHistory[localHistory.length - 1]) ?? null : null;

  const renderChainEntry = (
    entry: CausalChainNodeEntry,
    tone: 'upstream' | 'downstream' | 'synchronous' | 'cultural',
  ) => {
    const isExpanded = Boolean(expandedPaths[entry.event.id]);
    const stepDepth = Math.abs(entry.depth);
    const stepText =
      tone === 'upstream'
        ? `−${stepDepth}`
        : tone === 'downstream'
          ? `+${stepDepth}`
          : '↔';
    const stepColor =
      tone === 'upstream'
        ? 'text-sky-300'
        : tone === 'downstream'
          ? 'text-emerald-300'
          : tone === 'synchronous'
            ? 'text-amber-300'
            : 'text-indigo-300';

    const pathIds: string[] =
      entry.pathFromRoot.length > 0
        ? [entry.pathFromRoot[0].fromId, ...entry.pathFromRoot.map((edge) => edge.toId)]
        : [];
    const pathNodes = pathIds
      .map((id) => eventById.get(id))
      .filter((ev): ev is EnrichedEvent => Boolean(ev));

    return (
      <div
        key={`${tone}-${entry.event.id}`}
        className="py-3 space-y-1.5"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono">
              <span className={`font-bold tabular-nums ${stepColor}`}>{stepText}</span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="font-semibold text-amber-300 tabular-nums">
                {entry.event.period}
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="text-slate-300 truncate">{entry.branchLabel}</span>
              {entry.isExternalToCampaign && (
                <>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="text-sky-300 inline-flex items-center gap-1">
                    <Globe2 className="w-3 h-3 shrink-0" />
                    <span>Внешний атлас</span>
                  </span>
                </>
              )}
            </div>

            <div className="text-sm font-semibold text-white leading-snug">
              {entry.event.title}
            </div>

            {entry.viaEdge?.label && (
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                <span className="font-mono text-slate-400">
                  {tone === 'upstream'
                    ? 'Причинная связь: '
                    : tone === 'downstream'
                      ? 'Следствие: '
                      : 'Связь: '}
                </span>
                {entry.viaEdge.label}
              </p>
            )}

            {pathNodes.length > 2 && (
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedPaths((prev) => ({
                      ...prev,
                      [entry.event.id]: !prev[entry.event.id],
                    }))
                  }
                  className="text-[11px] font-mono text-slate-400 hover:text-amber-200 underline decoration-slate-600 underline-offset-2 cursor-pointer"
                >
                  {isExpanded
                    ? 'Скрыть маршрут звена'
                    : `Показать маршрут (${pathNodes.length - 1} пер.)`}
                </button>
                {isExpanded && (
                  <div className="mt-1.5 text-[11px] font-mono text-slate-400 leading-relaxed flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    {pathNodes.map((node, idx) => (
                      <span key={`${entry.event.id}-p-${node.id}`} className="inline-flex items-center gap-1.5">
                        {idx > 0 && (
                          <span aria-hidden="true" className="text-slate-600">
                            →
                          </span>
                        )}
                        <span
                          className={
                            node.id === root.id
                              ? 'text-amber-300 font-semibold'
                              : node.id === entry.event.id
                                ? 'text-white font-semibold'
                                : 'text-slate-300'
                          }
                        >
                          {node.period} {node.title}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => handleRecenter(entry.event.id)}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-amber-200 transition-colors cursor-pointer whitespace-nowrap"
              title="Перестроить граф причин и следствий от этого события"
            >
              От узла
            </button>
            <button
              type="button"
              onClick={() => onOpenCard(entry.event.id)}
              className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-200 font-semibold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1"
              title="Открыть полное досье карточки"
            >
              <span>Карточка</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-tracer-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl max-h-[92vh] rounded-2xl bg-[#0b1325] border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden">
        <DossierModalHeader
          lastHistoryItem={lastHistoryItem}
          onNavigateBack={onNavigateBack}
          onClose={onClose}
          closeAriaLabel="Закрыть трассировщик цепочек связей"
          context={
            <>
              <GitBranch className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-sans text-xs sm:text-sm font-semibold text-slate-100 truncate min-w-0">
                Трассировщик цепочек причин и следствий
              </span>
              {activeCampaignTitle && (
                <>
                  <span aria-hidden="true" className="text-slate-500 hidden sm:inline shrink-0">
                    ·
                  </span>
                  <span className="font-sans text-xs text-amber-300/90 hidden sm:inline truncate max-w-[220px]">
                    {activeCampaignTitle}
                  </span>
                </>
              )}
            </>
          }
          actions={
            <>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onJumpToTimelineRow(root.id);
                }}
                className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-slate-200 hover:text-amber-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Показать опорный узел на ленте хронографа"
              >
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span>К узлу на ленте</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onApplyTracedChain(chainResult, mode);
                  onClose();
                }}
                className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
                title="Оставить на ленте хронографа только звенья найденной цепочки (включая узлы внешнего атласа)"
              >
                <Filter className="w-3.5 h-3.5 shrink-0" />
                <span>Выделить цепочку на ленте ({stats.totalNodes})</span>
              </button>
            </>
          }
        />

        {/* Прокручиваемое тело трассировщика */}
        <div ref={bodyRef} className="px-5 sm:px-6 pt-5 pb-6 overflow-y-auto space-y-5 flex-1">
          {/* Локальная кнопка шага назад при переключении корня внутри трассировщика */}
          {prevLocalEvent && (
            <div className="flex items-center justify-between gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={handleStepBackLocal}
                className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 underline decoration-amber-400/40 underline-offset-4 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Вернуться к узлу: {prevLocalEvent.period} · {prevLocalEvent.title}
                </span>
              </button>
              <span className="text-slate-500 tabular-nums">
                Глубина обхода истории: {localHistory.length}
              </span>
            </div>
          )}

          {/* Заголовок опорного события */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-mono text-slate-400 tabular-nums">
              <span className="font-bold text-amber-300">{root.period}</span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span>{chainResult.rootBranchLabel}</span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span>
                Охват цепи: {stats.yearFrom}–{stats.yearTo} гг.
              </span>
            </div>
            <h3
              id="modal-tracer-title"
              className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight text-balance"
            >
              {root.title}
            </h3>
            {root.subtitle && (
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                {root.subtitle}
              </p>
            )}
          </div>

          {/* 4 метрики цепочки */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-0.5">
              <div className="font-mono text-[11px] text-slate-400">Звеньев в цепи</div>
              <div className="font-mono text-lg font-bold text-white tabular-nums">
                {stats.totalNodes}
              </div>
              <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                веток затронуто: {stats.touchedBranchesCount}
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-0.5">
              <div className="font-mono text-[11px] text-slate-400">Причин и предпосылок</div>
              <div className="font-mono text-lg font-bold text-sky-300 tabular-nums">
                {stats.upstreamCount}
              </div>
              <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                глубина до −{stats.maxUpstreamDepth} шаг.
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-0.5">
              <div className="font-mono text-[11px] text-slate-400">Следствий и продолжений</div>
              <div className="font-mono text-lg font-bold text-emerald-300 tabular-nums">
                {stats.downstreamCount}
              </div>
              <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                глубина до +{stats.maxDownstreamDepth} шаг.
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-0.5">
              <div className="font-mono text-[11px] text-slate-400">Узлов внешнего атласа</div>
              <div className="font-mono text-lg font-bold text-amber-300 tabular-nums">
                {stats.externalAtlasCount}
              </div>
              <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                синхронных: {stats.synchronousCount} · культуры: {stats.culturalCount}
              </div>
            </div>
          </div>

          {/* Панель настроек обхода */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/75 p-3 flex flex-wrap items-center gap-2.5 text-xs font-mono">
            {/* Режим рёбер */}
            <div className="inline-flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => setMode('causal_only')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  mode === 'causal_only'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Причинно-следственные
              </button>
              <button
                type="button"
                onClick={() => setMode('all_links')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  mode === 'all_links'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Все связи
              </button>
            </div>

            {/* Глубина обхода */}
            <div className="inline-flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
              {DEPTH_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setDepth(opt.value)}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                    depth === opt.value
                      ? 'bg-slate-700 text-amber-200 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Граница охвата (внутри кампании или со всем атласом) */}
            {activeCampaignId && (
              <div className="inline-flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    scope === 'all'
                      ? 'bg-sky-500/25 text-sky-200 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Кампания + атлас
                </button>
                <button
                  type="button"
                  onClick={() => setScope('campaign_only')}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    scope === 'campaign_only'
                      ? 'bg-sky-500/25 text-sky-200 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Только кампания
                </button>
              </div>
            )}

            {/* Фильтр по тексту при крупных цепочках */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по звеньям цепи…"
                aria-label="Поиск по звеньям цепи"
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
              />
            </div>
          </div>

          {/* 1. ВОСХОДЯЩИЕ СЛОИ: ПРИЧИНЫ И ПРЕДПОСЫЛКИ (−N … −1) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-sky-300 inline-flex items-center gap-1.5">
                <ArrowUp className="w-3.5 h-3.5 shrink-0" />
                <span>
                  1. Причины и предпосылки ({stats.upstreamCount})
                </span>
              </h4>
              {stats.maxUpstreamDepth > 0 && (
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  от первопричин (−{stats.maxUpstreamDepth}) к событию (−1)
                </span>
              )}
            </div>

            {filteredUpstreamLayers.length === 0 ? (
              <p className="text-xs text-slate-400 border-y border-slate-800/80 py-3">
                {normalizedQuery
                  ? 'Среди причин и предпосылок нет звеньев по заданному поиску.'
                  : 'Входящие причинно-следственные предпосылки в выбранном режиме не найдены.'}
              </p>
            ) : (
              <div className="space-y-4">
                {filteredUpstreamLayers.map((layer) => (
                  <div key={`up-${layer.depth}`} className="space-y-1.5">
                    <div className="text-[11px] font-mono text-sky-300/90 tabular-nums">
                      Шаг −{layer.depth}{' '}
                      <span className="text-slate-500">
                        · звеньев: {layer.items.length}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                      {layer.items.map((entry) => renderChainEntry(entry, 'upstream'))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 2. ЦЕНТРАЛЬНЫЙ ОПОРНЫЙ УЗЕЛ */}
          <section className="rounded-xl border border-amber-500/45 bg-amber-950/20 p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-amber-300">
                <Swords className="w-3.5 h-3.5 shrink-0" />
                <span className="uppercase tracking-wider font-semibold">Опорное событие (0)</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="tabular-nums">{root.period}</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-slate-200">{chainResult.rootBranchLabel}</span>
              </div>

              <button
                type="button"
                onClick={() => onOpenCard(root.id)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-mono font-semibold text-amber-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Открыть полное досье</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>

            <div className="font-serif text-lg sm:text-xl font-bold text-white leading-snug">
              {root.title}
            </div>

            {root.outcome && (
              <p className="text-xs sm:text-sm text-amber-50/90 leading-relaxed max-w-3xl">
                <span className="font-mono text-amber-300 text-[11px] uppercase tracking-wider mr-1.5">
                  Итог:
                </span>
                {root.outcome}
              </p>
            )}

            {root.operationProfile && (
              <div className="pt-2 border-t border-amber-500/25 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {root.operationProfile.theater && (
                  <div>
                    <span className="font-mono text-[11px] text-slate-400">Театр: </span>
                    <span className="text-slate-200">{root.operationProfile.theater}</span>
                  </div>
                )}
                {root.operationProfile.resultSummary && (
                  <div>
                    <span className="font-mono text-[11px] text-slate-400">Оперативный итог: </span>
                    <span className="text-slate-200">{root.operationProfile.resultSummary}</span>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 3. НИСХОДЯЩИЕ СЛОИ: СЛЕДСТВИЯ И ПРОДОЛЖЕНИЯ (+1 … +N) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-emerald-300 inline-flex items-center gap-1.5">
                <ArrowDown className="w-3.5 h-3.5 shrink-0" />
                <span>
                  2. Следствия и продолжения ({stats.downstreamCount})
                </span>
              </h4>
              {stats.maxDownstreamDepth > 0 && (
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  от ближайших (+1) к отдалённым (+{stats.maxDownstreamDepth})
                </span>
              )}
            </div>

            {filteredDownstreamLayers.length === 0 ? (
              <p className="text-xs text-slate-400 border-y border-slate-800/80 py-3">
                {normalizedQuery
                  ? 'Среди следствий нет звеньев по заданному поиску.'
                  : 'Исходящие причинно-следственные продолжения в выбранном режиме не найдены.'}
              </p>
            ) : (
              <div className="space-y-4">
                {filteredDownstreamLayers.map((layer) => (
                  <div key={`down-${layer.depth}`} className="space-y-1.5">
                    <div className="text-[11px] font-mono text-emerald-300/90 tabular-nums">
                      Шаг +{layer.depth}{' '}
                      <span className="text-slate-500">
                        · звеньев: {layer.items.length}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                      {layer.items.map((entry) => renderChainEntry(entry, 'downstream'))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 4. СИНХРОННЫЕ СВЯЗИ И ОТРАЖЕНИЕ В АТЛАСЕ */}
          {(filteredSynchronous.length > 0 || filteredCultural.length > 0) && (
            <section className="space-y-4">
              {filteredSynchronous.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-amber-300 inline-flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      3. Синхронные операции и параллельные связи ({filteredSynchronous.length})
                    </span>
                  </h4>
                  <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                    {filteredSynchronous.map((entry) => renderChainEntry(entry, 'synchronous'))}
                  </div>
                </div>
              )}

              {filteredCultural.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-indigo-300 inline-flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Отражение в культуре, науке и ретроспективе ({filteredCultural.length})
                    </span>
                  </h4>
                  <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                    {filteredCultural.map((entry) => renderChainEntry(entry, 'cultural'))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Нижняя строка справки */}
        <div className="px-5 py-2.5 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              Обход защищён от циклов и автоматически учитывает внешние узлы атласа (дипломатия,
              экономика, революции, культура).
            </span>
          </span>
          <span className="tabular-nums text-slate-300">
            Всего узлов в схеме: {stats.totalNodes}
          </span>
        </div>
      </div>
    </div>
  );
}
