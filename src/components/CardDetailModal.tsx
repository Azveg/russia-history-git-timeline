import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Compass,
  Crosshair,
  Crown,
  FlaskConical,
  GitBranch,
  Layers,
  Link2,
  MapPin,
  ScrollText,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo } from 'react';
import {
  findMacroEraForYear,
  isBiographyNode,
  isLiteraryWorkNode,
  isScienceDiscoveryNode,
  resolveMacroEras,
} from '../engine/timelineEngine';
import type {
  BranchDefinition,
  EnrichedEvent,
  MacroEra,
  ModalHistoryItem,
  RulerPeriod,
} from '../types/timeline';

interface CardDetailModalProps {
  card: EnrichedEvent | null;
  enrichedEvents: EnrichedEvent[];
  matchingEvents?: EnrichedEvent[];
  branches: BranchDefinition[];
  eras?: MacroEra[];
  focusedEventId: string | null;
  modalHistory?: ModalHistoryItem[];
  onClose: () => void;
  onNavigateBack?: () => void;
  onSelectCard: (id: string) => void;
  onJumpToTimelineRow: (id: string) => void;
  onToggleFocusEvent: (id: string) => void;
  onFilterByRuler: (rulerId: string) => void;
  onOpenRulerModal?: (rulerId: string) => void;
  onOpenEraModal?: (eraId: string) => void;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  war: 'Военная кампания',
  treaty: 'Дипломатический договор',
  reform: 'Государственная реформа',
  economy: 'Экономика и финансы',
  crisis: 'Политический / социальный кризис',
  culture: 'Культура и мысль',
  biography: 'Биография (лицо эпохи)',
  book: 'Литературное произведение',
  science: 'Научное открытие / институт',
  world: 'Мировой контекст',
};

export function CardDetailModal({
  card,
  enrichedEvents,
  matchingEvents,
  branches,
  eras = [],
  focusedEventId,
  modalHistory = [],
  onClose,
  onNavigateBack,
  onSelectCard,
  onJumpToTimelineRow,
  onToggleFocusEvent,
  onFilterByRuler,
  onOpenRulerModal,
  onOpenEraModal,
}: CardDetailModalProps) {
  useEffect(() => {
    if (!card) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [card, onClose]);

  const resolvedEras = useMemo(() => resolveMacroEras(eras), [eras]);

  if (!card) return null;

  const branchObj = branches.find((b) => b.id === card.task) || branches[0];
  const parentBranchObj = branchObj?.parentBranchId
    ? branches.find((b) => b.id === branchObj.parentBranchId) ?? null
    : null;

  const macroEra = findMacroEraForYear(card.startYear, resolvedEras);

  // Шаг «Предыдущее / Следующее событие» учитывает текущий отфильтрованный список, если карточка входит в него
  const navigationPool =
    matchingEvents && matchingEvents.some((e) => e.id === card.id) ? matchingEvents : enrichedEvents;
  const currentIndex = navigationPool.findIndex((e) => e.id === card.id);
  const prevCard = currentIndex > 0 ? navigationPool[currentIndex - 1] : null;
  const nextCard =
    currentIndex >= 0 && currentIndex < navigationPool.length - 1
      ? navigationPool[currentIndex + 1]
      : null;

  const isFocused = focusedEventId === card.id;
  const isBio = isBiographyNode(card);
  const isWork = isLiteraryWorkNode(card);
  const isDiscovery = isScienceDiscoveryNode(card);

  const lastHistoryItem = modalHistory.length > 0 ? modalHistory[modalHistory.length - 1] : null;

  // Группировка связей на 3 смысловых блока:
  // 1) Предпосылки и синхронный контекст
  // 2) Итоги и прямые следствия
  // 3) Отражение в культуре, литературе и науке
  const culturalReflectionIds = new Set<string>();
  const culturalReflectionItems: Array<{
    otherId: string;
    otherEvent: EnrichedEvent;
    badge: string;
    label: string;
  }> = [];

  card.retrospectiveLinks.forEach((rLink) => {
    const otherEv = enrichedEvents.find((e) => e.id === rLink.otherId);
    if (otherEv && !culturalReflectionIds.has(otherEv.id)) {
      culturalReflectionIds.add(otherEv.id);
      culturalReflectionItems.push({
        otherId: otherEv.id,
        otherEvent: otherEv,
        badge:
          rLink.direction === 'depicts'
            ? 'Повествует об эпохе / событии'
            : 'Отражено в произведении',
        label: rLink.label,
      });
    }
  });

  const prerequisiteLinks: Array<{
    otherId: string;
    otherEvent: EnrichedEvent;
    badge: string;
    label: string;
  }> = [];

  const consequenceLinks: Array<{
    otherId: string;
    otherEvent: EnrichedEvent;
    badge: string;
    label: string;
  }> = [];

  card.explicitLinks.forEach((link) => {
    const otherEv = enrichedEvents.find((e) => e.id === link.otherId);
    if (!otherEv) return;

    const isOtherCulturalOrScientific =
      isBiographyNode(otherEv) || isLiteraryWorkNode(otherEv) || isScienceDiscoveryNode(otherEv);

    if (isOtherCulturalOrScientific && !isBio && !isWork && !isDiscovery) {
      if (!culturalReflectionIds.has(otherEv.id)) {
        culturalReflectionIds.add(otherEv.id);
        culturalReflectionItems.push({
          otherId: otherEv.id,
          otherEvent: otherEv,
          badge: isScienceDiscoveryNode(otherEv)
            ? 'Наука и технологии'
            : isLiteraryWorkNode(otherEv)
              ? 'Литературный памятник'
              : 'Лицо эпохи',
          label: link.label,
        });
      }
      return;
    }

    if (link.direction === 'in' && (link.type === 'triggers' || link.type === 'enables')) {
      prerequisiteLinks.push({
        otherId: otherEv.id,
        otherEvent: otherEv,
        badge: 'Предпосылка / причина',
        label: link.label,
      });
    } else if (link.direction === 'out' && (link.type === 'triggers' || link.type === 'enables')) {
      consequenceLinks.push({
        otherId: otherEv.id,
        otherEvent: otherEv,
        badge: 'Прямое следствие',
        label: link.label,
      });
    } else {
      prerequisiteLinks.push({
        otherId: otherEv.id,
        otherEvent: otherEv,
        badge: 'Синхронная взаимосвязь',
        label: link.label,
      });
    }
  });

  const durationText =
    card.duration === 0
      ? 'Точечное событие (менее 1 года)'
      : `${card.duration} ${
          card.duration % 10 === 1 && card.duration % 100 !== 11
            ? 'год'
            : card.duration % 10 >= 2 &&
                card.duration % 10 <= 4 &&
                (card.duration % 100 < 10 || card.duration % 100 >= 20)
              ? 'года'
              : 'лет'
        }`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-card-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl bg-[#0b1325] border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden">
        {/* Верхняя панель с кнопкой «Назад», веткой и действиями */}
        <div className="px-5 py-3.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono flex-wrap min-w-0">
            {lastHistoryItem && onNavigateBack && (
              <button
                type="button"
                onClick={onNavigateBack}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 font-semibold transition-colors cursor-pointer"
                title={`Вернуться назад: ${lastHistoryItem.label}`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="truncate max-w-[200px]">Назад: {lastHistoryItem.label}</span>
              </button>
            )}

            <span
              className="px-2.5 py-1 rounded-md font-bold text-slate-950 shrink-0"
              style={{ backgroundColor: branchObj.color }}
            >
              {parentBranchObj ? `${parentBranchObj.short} · ${branchObj.label}` : branchObj.label}
            </span>

            {card.eventType && (
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                {EVENT_TYPE_LABELS[card.eventType] ?? card.eventType}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onJumpToTimelineRow(card.id);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-amber-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Прокрутить график к этому событию и подсветить его"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Показать на графике</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleFocusEvent(card.id);
                onClose();
              }}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                isFocused
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300'
              }`}
              title="Изолировать это событие и все связанные с ним процессы на таймлайне"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isFocused ? 'Выключить фокус' : 'Фокус связей'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть модальное окно"
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Основное содержимое паспорта события */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Заголовок и краткая суть */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/35 font-mono text-sm font-black text-amber-300 tabular-nums">
                <Calendar className="w-3.5 h-3.5" />
                {card.period}
              </span>
              {card.datePrecision === 'day' || card.datePrecision === 'month' ? (
                <span className="text-xs font-mono text-slate-400 tabular-nums">
                  точная дата: {card.startDate ?? card.period}
                </span>
              ) : null}
            </div>

            <h3
              id="modal-card-title"
              className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight"
            >
              {card.title}
            </h3>

            <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed">
              {card.subtitle}
            </p>
          </div>

          {/* Паспорт события: структурированная сетка ключевых параметров */}
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-2 text-xs font-mono uppercase tracking-wider text-amber-300/90">
              <span className="inline-flex items-center gap-1.5 font-bold">
                <ScrollText className="w-3.5 h-3.5 text-amber-400" />
                Паспорт исторического узла
              </span>
              {macroEra && onOpenEraModal && (
                <button
                  type="button"
                  onClick={() => onOpenEraModal(macroEra.id)}
                  className="text-[11px] text-amber-300 hover:text-amber-200 underline decoration-amber-400/40 underline-offset-2 cursor-pointer normal-case"
                >
                  Эпоха: {macroEra.displayShortTitle} ({macroEra.period}) →
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="rounded-lg bg-slate-950/75 border border-slate-800/80 p-2.5">
                <div className="text-[10px] font-mono uppercase text-slate-400">Хронология и охват</div>
                <div className="font-mono font-bold text-white mt-0.5 tabular-nums">{card.period}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{durationText}</div>
              </div>

              <div className="rounded-lg bg-slate-950/75 border border-slate-800/80 p-2.5">
                <div className="text-[10px] font-mono uppercase text-slate-400">География / сфера</div>
                <div className="font-semibold text-white mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{card.region || 'Общегосударственный масштаб'}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {EVENT_TYPE_LABELS[card.eventType ?? ''] ?? branchObj.label}
                </div>
              </div>

              <div className="rounded-lg bg-slate-950/75 border border-slate-800/80 p-2.5">
                <div className="text-[10px] font-mono uppercase text-slate-400">Связи и параллели</div>
                <div className="font-mono font-bold text-emerald-300 mt-0.5 tabular-nums">
                  Прямых связей: {card.explicitLinks.length + card.retrospectiveLinks.length}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                  Синхронных процессов: {card.concurrentEvents.length}
                </div>
              </div>
            </div>

            {/* Главный итог и историческое значение (outcome) */}
            {card.outcome && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/35 p-3.5 flex items-start gap-3">
                <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0">
                  <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-amber-300">
                    Главный итог и историческое значение
                  </div>
                  <p className="text-xs sm:text-sm text-amber-50/95 leading-relaxed font-medium">
                    {card.outcome}
                  </p>
                </div>
              </div>
            )}

            {/* Ключевые исторические лица / участники (keyFigures) */}
            {card.keyFigures && card.keyFigures.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span>Ключевые участники и исторические фигуры:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {card.keyFigures.map((person) => (
                    <span
                      key={person}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700/90 text-xs font-medium text-slate-200"
                    >
                      {person}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Развёрнутое историческое описание */}
          <div className="rounded-xl bg-slate-900/75 border border-slate-800 p-4 space-y-2">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Историческая справка и контекст
            </div>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
              {card.details}
            </p>
          </div>

          {/* Вертикальная хронологическая шкала этапов (subEvents) */}
          {card.subEvents && card.subEvents.length > 0 && (
            <div className="rounded-xl bg-slate-900/70 border border-amber-500/30 p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-mono uppercase tracking-wider text-amber-300 flex items-center gap-2 font-bold">
                  <GitBranch className="w-4 h-4 text-amber-400" />
                  <span>Хронология ключевых этапов ({card.subEvents.length})</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  {card.period}
                </span>
              </div>

              <div className="relative pl-5 space-y-3 before:content-[''] before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-amber-500/35">
                {card.subEvents.map((sub, idx) => (
                  <div
                    key={`${sub.year}-${sub.title}-${idx}`}
                    className="relative rounded-lg bg-slate-950/85 border border-slate-800/90 p-3 space-y-1"
                  >
                    <span
                      aria-hidden="true"
                      className="w-3 h-3 rounded-full bg-slate-950 border-2 border-amber-400 absolute -left-[19px] top-3.5"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 font-mono text-xs font-bold text-amber-300 tabular-nums">
                        {sub.year}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-white">{sub.title}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{sub.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Правители в период события */}
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-2.5">
            <div className="text-xs font-mono uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Crown className="w-3.5 h-3.5" />
              <span>Правители в период события ({card.overlappingRulers.length})</span>
            </div>
            {card.overlappingRulers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {card.overlappingRulers.map((r: RulerPeriod) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-serif text-sm font-bold text-white truncate">
                        {r.ruler}
                      </div>
                      <div className="text-[11px] font-mono text-amber-300 tabular-nums">
                        {r.reignPeriod}
                        {r.center ? ` · ${r.center}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onOpenRulerModal && (
                        <button
                          type="button"
                          onClick={() => onOpenRulerModal(r.id)}
                          className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-[11px] font-mono font-semibold text-amber-300 cursor-pointer"
                        >
                          Досье →
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onFilterByRuler(r.id);
                          onClose();
                        }}
                        className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-300 cursor-pointer"
                        title="Отфильтровать график по годам правления"
                      >
                        Окно лет
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400">{card.ruler || 'Нет данных'}</div>
            )}
          </div>

          {/* Наглядная схема связей: 3 смысловых блока (Предпосылки / Следствия / Культурный и научный след) */}
          {(prerequisiteLinks.length > 0 ||
            consequenceLinks.length > 0 ||
            culturalReflectionItems.length > 0) && (
            <div className="rounded-xl bg-slate-900/65 border border-emerald-500/30 p-4 space-y-4">
              <div className="text-xs font-mono uppercase tracking-wider text-emerald-300 flex items-center gap-2 font-bold">
                <Link2 className="w-4 h-4 text-emerald-400" />
                <span>Наглядная схема исторических связей</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Колонка 1: Предпосылки и синхронный контекст */}
                <div className="rounded-xl bg-slate-950/75 border border-slate-800 p-3 space-y-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-sky-300 font-bold flex items-center justify-between">
                    <span>1. Предпосылки и контекст</span>
                    <span className="tabular-nums">{prerequisiteLinks.length}</span>
                  </div>
                  {prerequisiteLinks.length > 0 ? (
                    <div className="space-y-2">
                      {prerequisiteLinks.map((item, idx) => {
                        const ob = branches.find((b) => b.id === item.otherEvent.task);
                        return (
                          <button
                            key={`${item.otherId}-pre-${idx}`}
                            type="button"
                            onClick={() => onSelectCard(item.otherId)}
                            className="w-full text-left p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-sky-400/50 transition-all cursor-pointer space-y-1"
                          >
                            <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                              <span style={{ color: ob?.color ?? '#38bdf8' }} className="font-bold">
                                {item.otherEvent.period}
                              </span>
                              <span className="text-slate-400 truncate">{ob?.short}</span>
                            </div>
                            <div className="text-xs font-bold text-white leading-snug">
                              {item.otherEvent.title}
                            </div>
                            <div className="text-[11px] text-slate-400 leading-snug">
                              {item.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-2">
                      Нет выделенных предшествующих узлов
                    </div>
                  )}
                </div>

                {/* Колонка 2: Итоги и прямые следствия */}
                <div className="rounded-xl bg-slate-950/75 border border-slate-800 p-3 space-y-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-300 font-bold flex items-center justify-between">
                    <span>2. Итоги и следствия</span>
                    <span className="tabular-nums">{consequenceLinks.length}</span>
                  </div>
                  {consequenceLinks.length > 0 ? (
                    <div className="space-y-2">
                      {consequenceLinks.map((item, idx) => {
                        const ob = branches.find((b) => b.id === item.otherEvent.task);
                        return (
                          <button
                            key={`${item.otherId}-cons-${idx}`}
                            type="button"
                            onClick={() => onSelectCard(item.otherId)}
                            className="w-full text-left p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-400/50 transition-all cursor-pointer space-y-1"
                          >
                            <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                              <span style={{ color: ob?.color ?? '#34d399' }} className="font-bold">
                                {item.otherEvent.period}
                              </span>
                              <span className="text-slate-400 truncate">{ob?.short}</span>
                            </div>
                            <div className="text-xs font-bold text-white leading-snug">
                              {item.otherEvent.title}
                            </div>
                            <div className="text-[11px] text-slate-400 leading-snug">
                              {item.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-2">
                      Прямые следствия отражены в паспорте события
                    </div>
                  )}
                </div>

                {/* Колонка 3: Культурный, литературный и научный след */}
                <div className="rounded-xl bg-slate-950/75 border border-slate-800 p-3 space-y-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-amber-300 font-bold flex items-center justify-between">
                    <span>3. Культура и наука</span>
                    <span className="tabular-nums">{culturalReflectionItems.length}</span>
                  </div>
                  {culturalReflectionItems.length > 0 ? (
                    <div className="space-y-2">
                      {culturalReflectionItems.map((item, idx) => {
                        const ob = branches.find((b) => b.id === item.otherEvent.task);
                        const isSci = isScienceDiscoveryNode(item.otherEvent);
                        return (
                          <button
                            key={`${item.otherId}-cult-${idx}`}
                            type="button"
                            onClick={() => onSelectCard(item.otherId)}
                            className="w-full text-left p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/50 transition-all cursor-pointer space-y-1"
                          >
                            <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                              <span
                                style={{ color: ob?.color ?? '#fbbf24' }}
                                className="font-bold inline-flex items-center gap-1"
                              >
                                {isSci ? (
                                  <FlaskConical className="w-3 h-3" />
                                ) : (
                                  <BookOpen className="w-3 h-3" />
                                )}
                                {item.otherEvent.period}
                              </span>
                              <span className="text-amber-300/90 truncate">{item.badge}</span>
                            </div>
                            <div className="text-xs font-bold text-white leading-snug">
                              {item.otherEvent.title}
                            </div>
                            <div className="text-[11px] text-slate-400 leading-snug">
                              {item.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-2">
                      Нет связанных книг или открытий
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Параллельные процессы в других ветках */}
          {card.concurrentEvents.length > 0 && (
            <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                <span>
                  Синхронные события в других ветках ({card.concurrentEvents.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {card.concurrentEvents.slice(0, 12).map((other) => {
                  const ob = branches.find((b) => b.id === other.task);
                  return (
                    <button
                      key={other.id}
                      type="button"
                      onClick={() => onSelectCard(other.id)}
                      className="text-left p-2.5 rounded-lg bg-slate-950/70 hover:bg-slate-800 border border-slate-800/90 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span style={{ color: ob ? ob.color : '#94a3b8' }} className="font-bold">
                          {other.period}
                        </span>
                        <span className="text-slate-500">{ob ? ob.short : other.task}</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-200 mt-0.5 truncate">
                        {other.title}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Нижняя панель навигации по текущему срезу событий */}
        <div className="px-5 py-3 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-2 text-xs font-mono">
          {prevCard ? (
            <button
              type="button"
              onClick={() => onSelectCard(prevCard.id)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 inline-flex items-center gap-1.5 cursor-pointer max-w-[46%] truncate"
              title={`${prevCard.period} — ${prevCard.title}`}
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="truncate">
                {prevCard.period}: {prevCard.title}
              </span>
            </button>
          ) : (
            <span className="text-slate-600">Начало выбранного списка</span>
          )}

          <span className="text-slate-500 hidden sm:inline tabular-nums">
            {currentIndex >= 0 ? `${currentIndex + 1} / ${navigationPool.length}` : ''}
          </span>

          {nextCard ? (
            <button
              type="button"
              onClick={() => onSelectCard(nextCard.id)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 inline-flex items-center gap-1.5 cursor-pointer max-w-[46%] truncate"
              title={`${nextCard.period} — ${nextCard.title}`}
            >
              <span className="truncate">
                {nextCard.period}: {nextCard.title}
              </span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            </button>
          ) : (
            <span className="text-slate-600">Конец выбранного списка</span>
          )}
        </div>
      </div>
    </div>
  );
}
