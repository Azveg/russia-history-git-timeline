import { ArrowRight, Check, Loader2, RotateCcw, Search, Swords, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import type { CampaignPackRegistryEntry, ModalHistoryItem } from '../types/timeline';
import { DossierModalHeader } from './DossierModalHeader';

interface CampaignCatalogModalProps {
  campaignPacks: CampaignPackRegistryEntry[];
  activeCampaignId: string | null;
  loadedCampaignIds: string[];
  loadingCampaignId: string | null;
  modalHistory?: ModalHistoryItem[];
  onClose: () => void;
  onNavigateBack?: () => void;
  onOpenCampaign: (campaignId: string) => void;
  onExitCampaign: () => void;
}

export function CampaignCatalogModal({
  campaignPacks,
  activeCampaignId,
  loadedCampaignIds,
  loadingCampaignId,
  modalHistory = [],
  onClose,
  onNavigateBack,
  onOpenCampaign,
  onExitCampaign,
}: CampaignCatalogModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useModalFocusTrap<HTMLDivElement>(onClose);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredPacks = useMemo(() => {
    if (!normalizedQuery) return campaignPacks;
    return campaignPacks.filter((pack) => {
      const haystack = [
        pack.title,
        pack.shortTitle ?? '',
        pack.description,
        `${pack.yearFrom}`,
        `${pack.yearTo}`,
        ...pack.branches.map((b) => `${b.label} ${b.short}`),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [campaignPacks, normalizedQuery]);

  const activePack = useMemo(
    () => (activeCampaignId ? campaignPacks.find((p) => p.id === activeCampaignId) ?? null : null),
    [campaignPacks, activeCampaignId],
  );

  const lastHistoryItem = modalHistory.length > 0 ? modalHistory[modalHistory.length - 1] : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#050811]/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-catalog-modal-title"
        tabIndex={-1}
        className="w-full max-w-4xl max-h-[90vh] bg-[#0b1325] border border-slate-700/85 rounded-2xl shadow-2xl flex flex-col overflow-hidden focus:outline-none animate-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <DossierModalHeader
          context={
            <div className="flex items-center gap-2 min-w-0">
              <Swords className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-mono text-amber-300 font-semibold truncate">
                Режим кампаний · углублённый разбор по державам и фронтам
              </span>
            </div>
          }
          lastHistoryItem={lastHistoryItem}
          onNavigateBack={onNavigateBack}
          actions={
            <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <span className="text-slate-400 tabular-nums">
                Доступно кампаний: <strong className="text-slate-200">{campaignPacks.length}</strong>
                {activePack ? ` · активна: «${activePack.title}»` : ''}
              </span>
              {activePack && (
                <button
                  type="button"
                  onClick={() => {
                    onExitCampaign();
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>Вернуться к общему атласу</span>
                </button>
              )}
            </div>
          }
          onClose={onClose}
          closeAriaLabel="Закрыть каталог кампаний"
        />

        <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-slate-800/80 space-y-3 shrink-0 bg-slate-900/45">
          <div>
            <h2
              id="campaign-catalog-modal-title"
              className="font-serif text-2xl sm:text-[26px] font-bold text-white leading-tight"
            >
              Выбор исторической кампании
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed max-w-3xl">
              При переходе в кампанию скрываются сквозные фильтры общего атласа (эпохи, правители, века, горячие узлы и макрорегионы), а при возврате восстанавливается ваше исходное окно и настройки.
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск кампании по названию, годам, державам или фронтам…"
              className="w-full rounded-xl bg-slate-950/90 border border-slate-700/80 pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                aria-label="Очистить поиск по кампаниям"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2">
          {filteredPacks.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm text-slate-300">
                По запросу «{searchQuery.trim()}» кампании не найдены.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-amber-200 transition-colors cursor-pointer"
              >
                Сбросить поиск
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/75">
              {filteredPacks.map((pack) => {
                const isActive = activeCampaignId === pack.id;
                const isPackLoading = loadingCampaignId === pack.id;
                const isPackLoaded = loadedCampaignIds.includes(pack.id);
                const branchLabels = pack.branches.map((b) => b.label).join(' · ');

                return (
                  <article
                    key={pack.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono">
                        <span className="text-amber-300 font-semibold tabular-nums">
                          {pack.yearFrom}–{pack.yearTo} гг.
                        </span>
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                        <span className="text-slate-400 tabular-nums">
                          {pack.branches.length} веток · {pack.eventCount} операций
                        </span>
                        {isActive ? (
                          <>
                            <span aria-hidden="true" className="text-slate-600">
                              ·
                            </span>
                            <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                              <Check className="w-3 h-3 shrink-0" />
                              <span>активна сейчас</span>
                            </span>
                          </>
                        ) : isPackLoaded ? (
                          <>
                            <span aria-hidden="true" className="text-slate-600">
                              ·
                            </span>
                            <span className="text-slate-400">в памяти</span>
                          </>
                        ) : null}
                      </div>

                      <h3 className="font-serif text-xl font-bold text-white leading-snug">
                        {pack.title}
                      </h3>

                      {pack.description && (
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                          {pack.description}
                        </p>
                      )}

                      {branchLabels && (
                        <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
                          Державы и фронты: {branchLabels}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isActive ? (
                        <button
                          type="button"
                          onClick={() => {
                            onExitCampaign();
                            onClose();
                          }}
                          className="px-3.5 py-2 rounded-xl border border-amber-400/70 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                          <span>Выйти в атлас</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isPackLoading}
                          onClick={() => onOpenCampaign(pack.id)}
                          className="px-3.5 py-2 rounded-xl border border-amber-500/45 bg-amber-500/15 hover:bg-amber-500/25 hover:border-amber-400 text-amber-100 text-xs font-mono font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
                        >
                          {isPackLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                              <span>Загрузка…</span>
                            </>
                          ) : (
                            <>
                              <span>Открыть кампанию</span>
                              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
