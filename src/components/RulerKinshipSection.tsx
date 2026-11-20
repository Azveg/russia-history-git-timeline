import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Crown,
  Info,
  User,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ResolvedRulerRelative,
  RulerKinshipGroup,
  RulerPeriod,
} from '../types/timeline';

interface RulerKinshipSectionProps {
  ruler: RulerPeriod;
  relatives: ResolvedRulerRelative[];
  onOpenRulerModal?: (rulerId: string) => void;
  onOpenPersonModal?: (personKey: string) => void;
}

const GROUP_DEFAULT_LIMIT = 6;

const GROUP_LABELS: Record<RulerKinshipGroup, string> = {
  parent: 'Родители',
  uncle_aunt: 'Дяди и тёти',
  spouse: 'Супруги',
  sibling: 'Братья и сёстры',
  child: 'Дети',
};

function formatEventsShort(count: number): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${count} соб.`;
  if (mod10 === 1) return `${count} соб.`;
  return `${count} соб.`;
}

export function RulerKinshipSection({
  ruler,
  relatives,
  onOpenRulerModal,
  onOpenPersonModal,
}: RulerKinshipSectionProps) {
  const [selectedMiniId, setSelectedMiniId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const miniCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedMiniId(null);
    setExpandedGroups({});
  }, [ruler.id]);

  const grouped = useMemo(() => {
    const byGroup: Record<RulerKinshipGroup, ResolvedRulerRelative[]> = {
      parent: [],
      uncle_aunt: [],
      spouse: [],
      sibling: [],
      child: [],
    };
    for (const rel of relatives) {
      byGroup[rel.group].push(rel);
    }
    return byGroup;
  }, [relatives]);

  const selectedRelative = useMemo(
    () => relatives.find((r) => r.id === selectedMiniId) ?? null,
    [relatives, selectedMiniId],
  );

  if (relatives.length === 0) return null;

  const hasSeniorGeneration = grouped.parent.length > 0 || grouped.uncle_aunt.length > 0;
  const hasSameGenerationRelatives = grouped.spouse.length > 0 || grouped.sibling.length > 0;
  const hasJuniorGeneration = grouped.child.length > 0;

  const rulerLinksCount = relatives.filter((r) => r.targetKind === 'ruler').length;

  const handleRelativeClick = (rel: ResolvedRulerRelative) => {
    if (rel.targetKind === 'ruler' && rel.linkedRuler && onOpenRulerModal) {
      onOpenRulerModal(rel.linkedRuler.id);
      return;
    }
    if (rel.targetKind === 'person' && rel.resolvedPersonKey && onOpenPersonModal) {
      onOpenPersonModal(rel.resolvedPersonKey);
      return;
    }
    setSelectedMiniId((prev) => {
      const next = prev === rel.id ? null : rel.id;
      if (next) {
        requestAnimationFrame(() => {
          miniCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
      return next;
    });
  };

  const toggleGroupExpand = (group: RulerKinshipGroup) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const renderRelativeNode = (rel: ResolvedRulerRelative) => {
    const canNavigateRuler = Boolean(rel.targetKind === 'ruler' && rel.linkedRuler && onOpenRulerModal);
    const canNavigatePerson = Boolean(
      rel.targetKind === 'person' && rel.resolvedPersonKey && onOpenPersonModal,
    );
    const isMiniSelected = !canNavigateRuler && !canNavigatePerson && selectedMiniId === rel.id;

    const borderStyle = canNavigateRuler
      ? 'border-amber-500/30 hover:border-amber-400/65 bg-amber-500/[0.04] hover:bg-amber-500/[0.09]'
      : canNavigatePerson
        ? 'border-sky-500/30 hover:border-sky-400/65 bg-sky-500/[0.04] hover:bg-sky-500/[0.09]'
        : isMiniSelected
          ? 'border-slate-400/70 bg-slate-800/80'
          : 'border-slate-800/90 hover:border-slate-600/90 bg-slate-900/45 hover:bg-slate-800/55';

    const metaYears = rel.lifeYears || rel.linkedRuler?.reignPeriod;

    return (
      <button
        key={rel.id}
        type="button"
        onClick={() => handleRelativeClick(rel)}
        aria-expanded={!canNavigateRuler && !canNavigatePerson ? isMiniSelected : undefined}
        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors duration-150 cursor-pointer flex flex-col justify-between gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 ${borderStyle}`}
      >
        <div className="flex items-start justify-between gap-2 min-w-0">
          <span className="text-sm font-semibold text-slate-100 leading-snug">
            {rel.name}
          </span>
          {canNavigateRuler ? (
            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          ) : canNavigatePerson ? (
            <User className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />
          ) : isMiniSelected ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-400 tabular-nums leading-snug">
          <span>{rel.relation}</span>
          {metaYears && (
            <>
              <span aria-hidden="true" className="mx-1.5 text-slate-600">
                ·
              </span>
              <span className="text-slate-300/90">{metaYears}</span>
            </>
          )}
        </div>

        <div className="pt-0.5 flex items-center gap-1 text-[11px] font-mono tabular-nums">
          {canNavigateRuler && rel.linkedRuler ? (
            <span className="text-amber-300/95 inline-flex items-center gap-1">
              <span>Правитель · {rel.linkedRuler.reignPeriod}</span>
              <ArrowRight className="w-3 h-3 shrink-0" aria-hidden="true" />
            </span>
          ) : canNavigatePerson ? (
            <span className="text-sky-300/95 inline-flex items-center gap-1">
              <span>Досье деятеля · {formatEventsShort(rel.personEventCount)}</span>
              <ArrowRight className="w-3 h-3 shrink-0" aria-hidden="true" />
            </span>
          ) : (
            <span className={isMiniSelected ? 'text-slate-200' : 'text-slate-500'}>
              {isMiniSelected ? 'Скрыть справку' : 'Краткая справка'}
            </span>
          )}
        </div>
      </button>
    );
  };

  const renderGroupBlock = (
    group: RulerKinshipGroup,
    items: ResolvedRulerRelative[],
    gridClass: string,
  ) => {
    if (items.length === 0) return null;
    const isExpanded = Boolean(expandedGroups[group]);
    const hasOverflow = items.length > GROUP_DEFAULT_LIMIT;
    const visibleItems = hasOverflow && !isExpanded ? items.slice(0, GROUP_DEFAULT_LIMIT) : items;

    return (
      <div className="space-y-2 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h5 className="text-[11px] font-mono font-semibold text-slate-400 tracking-wide">
            {GROUP_LABELS[group]}
            <span className="ml-1.5 text-slate-500 tabular-nums">({items.length})</span>
          </h5>
          {hasOverflow && (
            <button
              type="button"
              onClick={() => toggleGroupExpand(group)}
              className="text-[11px] font-mono text-amber-300/90 hover:text-amber-200 inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>{isExpanded ? 'Свернуть' : `Показать всех (${items.length})`}</span>
              {isExpanded ? (
                <ChevronUp className="w-3 h-3" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-3 h-3" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        <div className={gridClass}>{visibleItems.map(renderRelativeNode)}</div>
      </div>
    );
  };

  return (
    <section
      aria-label="Родственные связи и династия"
      className="space-y-4 pt-5 border-t border-slate-800/90"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="text-[11px] font-mono uppercase tracking-widest text-amber-300/90 font-bold">
          Родственные связи и династия
        </h4>
        <div className="text-[11px] font-mono text-slate-400 tabular-nums">
          <span>{relatives.length} связей</span>
          {rulerLinksCount > 0 && (
            <>
              <span aria-hidden="true" className="mx-1.5 text-slate-600">
                ·
              </span>
              <span className="text-amber-300/90">{rulerLinksCount} переходов к правителям</span>
            </>
          )}
        </div>
      </div>

      {/* Схема по трём поколениям с тонкими волосяными соединителями */}
      <div className="rounded-xl bg-[#0d162c]/70 border border-slate-800/90 p-4 sm:p-5 space-y-0">
        {/* Поколение I: Родители, дяди и тёти */}
        {hasSeniorGeneration && (
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2.5">
              Старшее поколение
            </div>
            <div
              className={
                grouped.parent.length > 0 && grouped.uncle_aunt.length > 0
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                  : 'space-y-3'
              }
            >
              {renderGroupBlock(
                'parent',
                grouped.parent,
                grouped.uncle_aunt.length > 0
                  ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-2'
                  : 'grid grid-cols-1 sm:grid-cols-2 gap-2',
              )}
              {renderGroupBlock(
                'uncle_aunt',
                grouped.uncle_aunt,
                grouped.parent.length > 0
                  ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-2'
                  : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2',
              )}
            </div>
          </div>
        )}

        {/* Волосяной соединитель I → II */}
        {hasSeniorGeneration && (
          <div className="flex flex-col items-center py-2" aria-hidden="true">
            <div className="w-full h-px bg-slate-800/80" />
            <div className="w-px h-4 bg-slate-700/90" />
          </div>
        )}

        {/* Поколение II: Текущий правитель, супруги, братья и сёстры */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border border-amber-500/35 bg-amber-500/[0.07]">
            <div className="flex items-center gap-2 min-w-0">
              <Crown className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
              <span className="font-serif text-base font-bold text-white truncate">
                {ruler.shortRuler || ruler.ruler}
              </span>
              <span aria-hidden="true" className="text-slate-600 text-xs">
                ·
              </span>
              <span className="text-xs font-mono text-amber-300/90 tabular-nums whitespace-nowrap shrink-0">
                Текущее досье
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-300 tabular-nums">
              {ruler.lifeYears ? (
                <>
                  <span>{ruler.lifeYears}</span>
                  <span aria-hidden="true" className="mx-1.5 text-slate-600">
                    ·
                  </span>
                </>
              ) : null}
              <span className="text-amber-300/90">правление {ruler.reignPeriod}</span>
            </div>
          </div>

          {hasSameGenerationRelatives && (
            <div
              className={
                grouped.spouse.length > 0 && grouped.sibling.length > 0
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-4 pt-1'
                  : 'pt-1'
              }
            >
              {renderGroupBlock(
                'spouse',
                grouped.spouse,
                grouped.sibling.length > 0
                  ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-2'
                  : 'grid grid-cols-1 sm:grid-cols-2 gap-2',
              )}
              {renderGroupBlock(
                'sibling',
                grouped.sibling,
                grouped.spouse.length > 0
                  ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-2'
                  : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2',
              )}
            </div>
          )}
        </div>

        {/* Волосяной соединитель II → III */}
        {hasJuniorGeneration && (
          <div className="flex flex-col items-center py-2" aria-hidden="true">
            <div className="w-px h-4 bg-slate-700/90" />
            <div className="w-full h-px bg-slate-800/80" />
          </div>
        )}

        {/* Поколение III: Дети */}
        {hasJuniorGeneration && (
          <div className="pt-1">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2.5">
              Младшее поколение
            </div>
            {renderGroupBlock(
              'child',
              grouped.child,
              'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2',
            )}
          </div>
        )}
      </div>

      {/* Встроенная архивная мини-справка для родственников без отдельной карточки */}
      {selectedRelative && (
        <div
          ref={miniCardRef}
          role="region"
          aria-label={`Справка: ${selectedRelative.name}`}
          className="rounded-xl bg-slate-900/80 border border-slate-700/85 p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <div className="text-[11px] font-mono text-amber-300/90">
                Мини-справка · {selectedRelative.relation}
              </div>
              <h5 className="font-serif text-lg font-bold text-white leading-snug">
                {selectedRelative.name}
              </h5>
            </div>
            <button
              type="button"
              onClick={() => setSelectedMiniId(null)}
              aria-label="Скрыть справку"
              className="h-7 px-2.5 rounded-lg border border-slate-700/80 hover:border-slate-500 text-slate-300 hover:text-white text-[11px] font-mono inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
            >
              <span>Свернуть</span>
              <X className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>

          <dl className="divide-y divide-slate-800/80 border-t border-slate-800/80 text-xs sm:text-sm">
            {selectedRelative.lifeYears && (
              <div className="py-2 grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-1 sm:gap-3">
                <dt className="font-mono text-xs text-slate-400">Годы жизни</dt>
                <dd className="font-mono text-xs sm:text-sm text-slate-100 tabular-nums">
                  {selectedRelative.lifeYears}
                </dd>
              </div>
            )}
            {selectedRelative.title && (
              <div className="py-2 grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-1 sm:gap-3">
                <dt className="font-mono text-xs text-slate-400">Титул и статус</dt>
                <dd className="text-slate-200">{selectedRelative.title}</dd>
              </div>
            )}
            {selectedRelative.note && (
              <div className="py-2 grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-1 sm:gap-3">
                <dt className="font-mono text-xs text-slate-400">Роль в династии</dt>
                <dd className="text-slate-200 leading-relaxed max-w-2xl">
                  {selectedRelative.note}
                </dd>
              </div>
            )}
          </dl>

          {selectedRelative.linkedRuler && onOpenRulerModal && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onOpenRulerModal(selectedRelative.linkedRuler!.id)}
                className="text-xs font-mono text-amber-300 hover:text-amber-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 shrink-0" />
                <span>Перейти в досье правителя ({selectedRelative.linkedRuler.reignPeriod})</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          )}

          {selectedRelative.resolvedPersonKey && onOpenPersonModal && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onOpenPersonModal(selectedRelative.resolvedPersonKey!)}
                className="text-xs font-mono text-sky-300 hover:text-sky-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span>Открыть полное досье деятеля</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
