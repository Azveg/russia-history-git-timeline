import { Flag, FolderGit2, GitBranch, Plus } from 'lucide-react';
import type { BranchDefinition, MilitaryBranchMode } from '../types/timeline';

interface DashboardHeaderProps {
  visibleLanesCount: number;
  matchingRulersCount: number;
  streamCount: number;
  crossLinksCount: number;
  mountedFilesCount: number;
  branchControls: Array<BranchDefinition & { count: number }>;
  activeBranches: Record<string, boolean>;
  militaryBranchMode: MilitaryBranchMode;
  showEndNodes: boolean;
  onToggleBranch: (branchId: string) => void;
  onSetMilitaryBranchMode: (mode: MilitaryBranchMode) => void;
  onToggleShowEndNodes: () => void;
  onOpenRepoStudio: () => void;
  onOpenAddCommit: () => void;
}

export function DashboardHeader({
  visibleLanesCount,
  matchingRulersCount,
  streamCount,
  crossLinksCount,
  mountedFilesCount,
  branchControls,
  activeBranches,
  militaryBranchMode,
  showEndNodes,
  onToggleBranch,
  onSetMilitaryBranchMode,
  onToggleShowEndNodes,
  onOpenRepoStudio,
  onOpenAddCommit,
}: DashboardHeaderProps) {
  return (
    <header className="relative border-b border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-[#050811] to-[#050811] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono text-slate-400 mb-2">
              <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold">
                <GitBranch className="w-3.5 h-3.5" />
                История в ветвях Git · 1686–2026
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-300">
                Подключено файлов: {mountedFilesCount} · Связей синхронизации: {crossLinksCount}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight [text-wrap:balance]">
              Военная история России:{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-sky-300 to-emerald-300">
                модульный Git-граф пересекающихся таймлайнов
              </span>
            </h1>

            <p className="mt-2.5 text-slate-300 text-xs sm:text-sm leading-relaxed">
              Каждая историческая линия хранится в отдельном JSON-файле (
              <code className="text-amber-300 font-mono">data/rulers.json</code>,{' '}
              <code className="text-sky-300 font-mono">data/wars.json</code>,{' '}
              <code className="text-emerald-300 font-mono">data/economics.json</code>,{' '}
              <code className="text-purple-300 font-mono">data/world.json</code>) и объединяется через{' '}
              <code className="text-emerald-300 font-mono">data/sync.manifest.json</code>, который вычисляет
              пересечения периодов и строит причинно-следственные связи (
              <code className="text-emerald-300 font-mono">crossLinks</code>) между ветвями.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-center">
                <div className="text-lg sm:text-2xl font-black font-mono tabular-nums text-amber-400">
                  {visibleLanesCount}
                </div>
                <div className="text-[10px] text-slate-400">веток</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-center">
                <div className="text-lg sm:text-2xl font-black font-mono tabular-nums text-white">
                  {matchingRulersCount}
                </div>
                <div className="text-[10px] text-slate-400">правлений</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-center">
                <div className="text-lg sm:text-2xl font-black font-mono tabular-nums text-sky-400">
                  {streamCount}
                </div>
                <div className="text-[10px] text-slate-400">узлов</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-center">
                <div className="text-lg sm:text-2xl font-black font-mono tabular-nums text-emerald-400">
                  {crossLinksCount}
                </div>
                <div className="text-[10px] text-slate-400">связей</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenRepoStudio}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Git-файлы и GitHub Pages</span>
              </button>
              <button
                type="button"
                onClick={onOpenAddCommit}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Коммит / Ветка</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-amber-400" />
              Слои и параллельные ветки (включайте для анализа наложения):
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onToggleShowEndNodes}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  showEndNodes
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
                title="Показывать на графе точки завершения затяжных войн, начавшихся при одном правителе и завершившихся при другом"
              >
                <Flag className="w-3 h-3" />
                <span>Точки завершения долгих войн: {showEndNodes ? 'ВКЛ' : 'ВЫКЛ'}</span>
              </button>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => onSetMilitaryBranchMode('SPLIT')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    militaryBranchMode === 'SPLIT'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  3 военные ветки
                </button>
                <button
                  type="button"
                  onClick={() => onSetMilitaryBranchMode('UNIFIED')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    militaryBranchMode === 'UNIFIED'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  1 общая военная ветка
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
            {branchControls.map((b) => {
              const isActive = activeBranches[b.id] !== false;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onToggleBranch(b.id)}
                  className={`text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-slate-950/90 border-slate-700 hover:border-slate-500'
                      : 'bg-slate-950/30 border-slate-800/60 opacity-50 hover:opacity-80'
                  }`}
                  title={b.description}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center"
                      style={{
                        backgroundColor: isActive ? b.color : 'transparent',
                        border: `2px solid ${b.color}`,
                      }}
                    >
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono font-bold text-slate-300 truncate">{b.gitName}</div>
                      <div className="text-xs font-semibold text-white truncate">{b.label}</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold tabular-nums px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 shrink-0">
                    {b.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
