import { AlertTriangle, Eye, Layers, X } from 'lucide-react';
import type { WindowLinksVisibilitySummary } from '../types/timeline';

interface HiddenLinksNoticeProps {
  visibility: WindowLinksVisibilitySummary;
  onRevealBranch: (branchId: string) => void;
  onRevealBranches: (branchIds: string[]) => void;
  onEnableAllBranches?: () => void;
  onDismiss?: () => void;
}

export function HiddenLinksNotice({
  visibility,
  onRevealBranch,
  onRevealBranches,
  onEnableAllBranches,
  onDismiss,
}: HiddenLinksNoticeProps) {
  if (visibility.hiddenLinksCount === 0 || visibility.hiddenGroups.length === 0) {
    return null;
  }

  const displayedGroups = visibility.hiddenGroups.slice(0, 5);
  const allHiddenBranchIds = visibility.hiddenGroups.map((g) => g.branchId);

  return (
    <section
      id="hidden-links-notice"
      aria-label="Предупреждение о скрытых связях в отключённых ветках"
      className="rounded-2xl bg-[#0b1325] border border-amber-500/35 px-4 py-2.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5"
    >
      <div className="space-y-1.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold text-amber-100">
            У событий текущего окна скрыто{' '}
            <span className="font-mono font-bold text-amber-300 tabular-nums">
              {visibility.hiddenLinksCount}
            </span>{' '}
            связей в отключённых ветках
          </span>
          <span className="text-slate-400 font-mono text-[11px] tabular-nums">
            · затронуто веток: {visibility.hiddenGroups.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {displayedGroups.map((group) => (
            <button
              key={group.branchId}
              type="button"
              onClick={() => onRevealBranch(group.branchId)}
              title={
                group.sampleTargetTitles.length > 0
                  ? `Включить ветку «${group.branchLabel}» (примеры: ${group.sampleTargetTitles.join('; ')})`
                  : `Включить ветку «${group.branchLabel}»`
              }
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-400/60 text-xs text-slate-200 hover:text-white transition-colors cursor-pointer"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: group.color }}
              />
              <span>+ {group.branchLabel}</span>
              <span className="font-mono text-[11px] text-amber-300 tabular-nums">
                · {group.hiddenLinkCount}
              </span>
            </button>
          ))}
          {visibility.hiddenGroups.length > 5 && (
            <span className="text-[11px] font-mono text-slate-400 px-1 tabular-nums">
              и ещё {visibility.hiddenGroups.length - 5}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onRevealBranches(allHiddenBranchIds)}
          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="tabular-nums">
            Раскрыть связанные ветки ({allHiddenBranchIds.length})
          </span>
        </button>

        {onEnableAllBranches && (
          <button
            type="button"
            onClick={onEnableAllBranches}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Все ветки</span>
          </button>
        )}

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Скрыть уведомление о скрытых связях"
            title="Скрыть это уведомление"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </section>
  );
}
