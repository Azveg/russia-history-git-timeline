import {
  ArrowLeft,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  GitBranch,
  Globe2,
  Layers,
  Loader2,
  Swords,
  X,
} from 'lucide-react';
import { memo } from 'react';
import type {
  BranchDefinition,
  CampaignPackRegistryEntry,
  TracedChainFilter,
} from '../../types/timeline';

interface CampaignModeBarProps {
  pack: CampaignPackRegistryEntry;
  campaignBranches: BranchDefinition[];
  activeBranches: Record<string, boolean>;
  isLoading: boolean;
  includeAtlasContext: boolean;
  isProAnalysisOpen?: boolean;
  tracedChainFilter?: TracedChainFilter | null;
  onToggleCampaignBranch: (branchId: string) => void;
  onEnableAllCampaignBranches: () => void;
  onToggleAtlasContext: () => void;
  onToggleProAnalysis?: () => void;
  onOpenAnchorCard?: (eventId: string) => void;
  onOpenCausalTracer?: () => void;
  onReopenTracedChain?: () => void;
  onClearTracedChain?: () => void;
  onExitCampaign: () => void;
}

export const CampaignModeBar = memo(function CampaignModeBar({
  pack,
  campaignBranches,
  activeBranches,
  isLoading,
  includeAtlasContext,
  isProAnalysisOpen = false,
  tracedChainFilter = null,
  onToggleCampaignBranch,
  onEnableAllCampaignBranches,
  onToggleAtlasContext,
  onToggleProAnalysis,
  onOpenAnchorCard,
  onOpenCausalTracer,
  onReopenTracedChain,
  onClearTracedChain,
  onExitCampaign,
}: CampaignModeBarProps) {
  const leafBranches = campaignBranches.filter((b) => !b.isGroup);
  const displayBranches =
    leafBranches.length > 0
      ? leafBranches.map((b) => ({
          id: b.id,
          label: b.label,
          short: b.short,
          description: b.description,
        }))
      : pack.branches.map((b) => ({
          id: b.id,
          label: b.label,
          short: b.short,
          description: b.description,
        }));

  const activeCount = displayBranches.filter((b) => activeBranches[b.id] !== false).length;
  const allActive = displayBranches.length > 0 && activeCount === displayBranches.length;

  return (
    <section
      aria-label={`Режим кампании: ${pack.title}`}
      className="rounded-2xl border border-amber-500/40 bg-[#0b1325]/95 shadow-xl overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-slate-800/90 flex flex-col gap-3 bg-slate-950/60">
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-amber-300/95">
            <Swords className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="uppercase tracking-wider font-semibold">Режим кампании</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="tabular-nums text-slate-300">
              {pack.yearFrom}–{pack.yearTo} гг.
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="tabular-nums text-slate-400">
              веток: {activeCount}/{displayBranches.length} · операций: {pack.eventCount}
            </span>
            {isLoading && (
              <>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span
                  role="status"
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono text-amber-300"
                >
                  <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                  <span>Загрузка веток…</span>
                </span>
              </>
            )}
          </div>

          <h2 className="font-serif text-lg sm:text-xl font-bold text-white leading-snug">
            {pack.title}
          </h2>
          {pack.description && (
            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
              {pack.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-800/70">
          {onOpenCausalTracer && (
            <button
              type="button"
              onClick={onOpenCausalTracer}
              className="h-8 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/45 text-xs font-mono font-semibold text-amber-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              title="Открыть трассировщик причинно-следственных цепочек кампании на всю глубину"
            >
              <GitBranch className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Трассировщик связей</span>
            </button>
          )}

          {onToggleProAnalysis && (
            <button
              type="button"
              aria-pressed={isProAnalysisOpen}
              onClick={onToggleProAnalysis}
              className={`h-8 px-2.5 rounded-lg border text-xs font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                isProAnalysisOpen
                  ? 'bg-emerald-500/15 border-emerald-400/55 text-emerald-200 font-semibold'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-200 hover:text-amber-200'
              }`}
              title={
                isProAnalysisOpen
                  ? 'Свернуть карту полос и панель расширенного анализа'
                  : 'Показать карту полос и панель профи-анализа'
              }
            >
              <Layers className="w-3.5 h-3.5 text-amber-400/85 shrink-0" />
              <span>Карта полос</span>
            </button>
          )}

          {pack.parentEventId && onOpenAnchorCard && (
            <button
              type="button"
              onClick={() => onOpenAnchorCard(pack.parentEventId!)}
              className="h-8 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono text-slate-200 hover:text-amber-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              title="Открыть обзорную макро-карточку этой войны"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400/85 shrink-0" />
              <span>Обзорная карточка</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExitCampaign}
            className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap sm:ml-auto"
            title="Закрыть режим кампании и вернуться к исходному масштабу атласа"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span>Вернуться к общему атласу</span>
          </button>
        </div>
      </div>

      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 bg-[#080f1e]/80">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono text-slate-400 mr-1">Державы и фронты:</span>
          {displayBranches.map((br) => {
            const enabled = activeBranches[br.id] !== false;
            return (
              <button
                key={br.id}
                type="button"
                aria-pressed={enabled}
                onClick={() => onToggleCampaignBranch(br.id)}
                title={br.description || br.label}
                className={`px-2.5 py-1 rounded-lg border text-xs font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  enabled
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-100 hover:bg-amber-500/25 font-semibold'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {enabled ? (
                  <Check className="w-3 h-3 text-amber-400 shrink-0" />
                ) : (
                  <EyeOff className="w-3 h-3 text-slate-500 shrink-0" />
                )}
                <span>{br.short || br.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {!allActive && (
            <button
              type="button"
              onClick={onEnableAllCampaignBranches}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-mono text-amber-200 inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Eye className="w-3 h-3 shrink-0" />
              <span>Все фронты</span>
            </button>
          )}
          <button
            type="button"
            aria-pressed={includeAtlasContext}
            onClick={onToggleAtlasContext}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              includeAtlasContext
                ? 'bg-sky-500/15 border-sky-400/45 text-sky-200 font-semibold'
                : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Добавить на ленту внешние ветки атласа: мировая дипломатия, договоры, реформы и экономика, внутренние кризисы и обзорная линия войн"
          >
            <Globe2 className="w-3.5 h-3.5 shrink-0" />
            <span>{includeAtlasContext ? 'Контекст атласа: вкл' : 'Контекст атласа: выкл'}</span>
          </button>
        </div>
      </div>

      {tracedChainFilter && (
        <div className="px-4 py-2 border-t border-emerald-500/30 bg-emerald-950/25 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
            <GitBranch className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-emerald-200 font-semibold">Изолирована цепочка:</span>
            <span className="text-white truncate">{tracedChainFilter.rootTitle}</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-slate-300 tabular-nums">
              звеньев: {tracedChainFilter.eventIds.size}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onReopenTracedChain && (
              <button
                type="button"
                onClick={onReopenTracedChain}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                Открыть схему
              </button>
            )}
            {onClearTracedChain && (
              <button
                type="button"
                onClick={onClearTracedChain}
                className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-100 inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              >
                <X className="w-3 h-3 shrink-0" />
                <span>Сбросить цепочку</span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
});
