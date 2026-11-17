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
  User,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  findMacroEraForYear,
  isBiographyNode,
  isLiteraryWorkNode,
  isScienceDiscoveryNode,
  resolveMacroEras,
  resolvePersonKey,
} from '../engine/timelineEngine';
import type {
  BranchDefinition,
  EnrichedEvent,
  MacroEra,
  ModalHistoryItem,
  PersonDossier,
  RulerPeriod,
} from '../types/timeline';

interface CardDetailModalProps {
  card: EnrichedEvent | null;
  enrichedEvents: EnrichedEvent[];
  matchingEvents?: EnrichedEvent[];
  branches: BranchDefinition[];
  activeBranches?: Record<string, boolean>;
  eras?: MacroEra[];
  personDossiers?: Map<string, PersonDossier>;
  focusedEventId: string | null;
  modalHistory?: ModalHistoryItem[];
  onClose: () => void;
  onNavigateBack?: () => void;
  onSelectCard: (id: string) => void;
  onJumpToTimelineRow: (id: string) => void;
  onRevealBranch?: (branchId: string) => void;
  onToggleFocusEvent: (id: string) => void;
  onFilterByRuler: (rulerId: string) => void;
  onOpenPersonModal?: (personKeyOrName: string) => void;
  onFilterByPerson?: (personName: string) => void;
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
  activeBranches,
  eras = [],
  personDossiers,
  focusedEventId,
  modalHistory = [],
  onClose,
  onNavigateBack,
  onSelectCard,
  onJumpToTimelineRow,
  onRevealBranch,
  onToggleFocusEvent,
  onFilterByRuler,
  onOpenPersonModal,
  onFilterByPerson,
  onOpenRulerModal,
  onOpenEraModal,
}: CardDetailModalProps) {
  const [showAllConcurrent, setShowAllConcurrent] = useState(false);

  useEffect(() => {
    setShowAllConcurrent(false);
  }, [card?.id]);

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
    directionMark: string;
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
        directionMark: rLink.direction === 'depicts' ? '←' : '→',
        label: rLink.label,
      });
    }
  });

  const prerequisiteLinks: Array<{
    otherId: string;
    otherEvent: EnrichedEvent;
    badge: string;
    directionMark: string;
    label: string;
  }> = [];

  const consequenceLinks: Array<{
    otherId: string;
    otherEvent: EnrichedEvent;
    badge: string;
    directionMark: string;
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
          directionMark: link.direction === 'incoming' ? '←' : '→',
          label: link.label,
        });
      }
      return;
    }

    if (culturalReflectionIds.has(otherEv.id)) {
      return;
    }

    if (link.direction === 'incoming' && (link.type === 'triggers' || link.type === 'enables')) {
      prerequisiteLinks.push({
        otherId: otherEv.id,
        otherEvent: otherEv,
        badge: 'Предпосылка / причина',
        directionMark: '←',
        label: link.label,
      });
    } else if (link.direction === 'outgoing' && (link.type === 'triggers' || link.type === 'enables')) {
      consequenceLinks.push({
        otherId: otherEv.id,
        otherEvent: otherEv,
        badge: 'Прямое следствие',
        directionMark: '→',
        label: link.label,
      });
    } else if (
      otherEv.startYear > card.endYear ||
      (otherEv.startYear === card.endYear &&
        otherEv.endYear > card.endYear &&
        otherEv.startYear > card.startYear)
    ) {
      consequenceLinks.push({
        otherId: otherEv.id,
        otherEvent: otherEv,
        badge: 'Последующая связь',
        directionMark: '→',
        label: link.label,
      });
    } else if (
      otherEv.endYear < card.startYear ||
      (otherEv.endYear === card.startYear &&
        otherEv.startYear < card.startYear &&
        otherEv.endYear < card.endYear)
    ) {
      prerequisiteLinks.push({
        otherId: otherEv.id,
        otherEvent: otherEv,
        badge: 'Исторический контекст',
        directionMark: '←',
        label: link.label,
      });
    } else {
      prerequisiteLinks.push({
        otherId: otherEv.id,
        otherEvent: otherEv,
        badge: 'Синхронный контекст',
        directionMark: '↔',
        label: link.label,
      });
    }
  });

  const isBranchHidden = (ev: EnrichedEvent) =>
    activeBranches ? activeBranches[ev.task] === false : false;

  const totalUniqueLinksCount =
    prerequisiteLinks.length + consequenceLinks.length + culturalReflectionItems.length;

  const hiddenBranchLinksCount =
    prerequisiteLinks.filter((i) => isBranchHidden(i.otherEvent)).length +
    consequenceLinks.filter((i) => isBranchHidden(i.otherEvent)).length +
    culturalReflectionItems.filter((i) => isBranchHidden(i.otherEvent)).length;

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
                {isWork
                  ? 'Паспорт литературного произведения'
                  : isBio
                    ? 'Биографический паспорт'
                    : 'Паспорт исторического события'}
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
                  {card.type && card.type !== 'Событие'
                    ? card.type
                    : EVENT_TYPE_LABELS[card.eventType ?? ''] ?? branchObj.label}
                </div>
              </div>

              <div className="rounded-lg bg-slate-950/75 border border-slate-800/80 p-2.5">
                <div className="text-[10px] font-mono uppercase text-slate-400">Связи и параллели</div>
                <div className="font-mono font-bold text-emerald-300 mt-0.5 tabular-nums">
                  Прямых связей: {totalUniqueLinksCount}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                  Синхронных процессов: {card.concurrentEvents.length}
                  {hiddenBranchLinksCount > 0 ? (
                    <span className="text-amber-300"> · скрытых веток: {hiddenBranchLinksCount}</span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Главный итог и историческое значение (outcome) */}
            {card.outcome && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/35 p-3.5 flex items-start gap-3">
                <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0">
                  <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-amber-300">
                    {isWork
                      ? 'Художественный итог и значение'
                      : isBio
                        ? 'Место в истории литературы'
                        : 'Главный итог и историческое значение'}
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
                <div className="text-[11px] font-mono tracking-wider text-slate-400 flex flex-wrap items-center justify-between gap-1.5">
                  <span className="inline-flex items-center gap-1.5 uppercase">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    <span>
                      {isWork
                        ? 'Автор, прототипы, издатели и критики:'
                        : isBio
                          ? 'Круг общения, современники и адресаты:'
                          : 'Ключевые участники и исторические фигуры:'}
                    </span>
                  </span>
                  {(onOpenPersonModal || onFilterByPerson) && (
                    <span className="text-[11px] text-sky-400/90 normal-case">
                      нажмите на имя, чтобы открыть досье участника
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {card.keyFigures.map((person) => {
                    const personKey = personDossiers
                      ? resolvePersonKey(person, personDossiers)
                      : null;
                    const dossier = personKey ? personDossiers?.get(personKey) : null;
                    const eventCount = dossier?.events.length ?? 0;

                    if (onOpenPersonModal) {
                      return (
                        <button
                          key={person}
                          type="button"
                          onClick={() => onOpenPersonModal(personKey || person)}
                          title={
                            dossier
                              ? `Открыть досье: ${dossier.displayName} (событий: ${eventCount})`
                              : `Открыть досье участника: ${person}`
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950/90 hover:bg-sky-500/15 border border-sky-500/30 hover:border-sky-400/70 text-xs font-medium text-slate-100 hover:text-sky-200 transition-colors cursor-pointer"
                        >
                          <User className="w-3 h-3 text-sky-400 shrink-0" />
                          <span>{person}</span>
                          {eventCount > 0 && (
                            <span className="text-[11px] font-mono text-sky-300/90 tabular-nums">
                              · {eventCount}
                            </span>
                          )}
                        </button>
                      );
                    }

                    if (onFilterByPerson) {
                      return (
                        <button
                          key={person}
                          type="button"
                          onClick={() => {
                            onFilterByPerson(person);
                            onClose();
                          }}
                          title={`Найти все события с участием: ${person}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-sky-500/15 border border-slate-700/90 hover:border-sky-400/50 text-xs font-medium text-slate-200 hover:text-sky-200 transition-colors cursor-pointer"
                        >
                          <User className="w-3 h-3 text-sky-400 shrink-0" />
                          <span>{person}</span>
                        </button>
                      );
                    }

                    return (
                      <span
                        key={person}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700/90 text-xs font-medium text-slate-200"
                      >
                        {person}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Литературно-исторический профиль (жанр, темы, судьба текста, влияние, главные труды) */}
          {card.literaryProfile && (
            <div className="rounded-xl bg-slate-900/75 border border-slate-800 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/80">
                <div className="text-xs font-mono uppercase tracking-wider text-rose-300 flex items-center gap-2 font-bold">
                  <BookOpen className="w-3.5 h-3.5 text-rose-400" />
                  <span>
                    {isBio ? 'Творческий профиль писателя' : 'Литературный разбор и судьба текста'}
                  </span>
                </div>
              </div>

              <dl className="divide-y divide-slate-800/70 text-xs sm:text-sm">
                {(card.literaryProfile.genre || card.literaryProfile.movement) && (
                  <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-1 sm:gap-4">
                    <dt className="text-xs text-slate-400 font-medium">
                      {isBio ? 'Роль и направление' : 'Жанр и направление'}
                    </dt>
                    <dd className="text-slate-100 leading-relaxed">
                      {[card.literaryProfile.genre, card.literaryProfile.movement]
                        .filter(Boolean)
                        .join(' · ')}
                    </dd>
                  </div>
                )}

                {card.literaryProfile.themes && (
                  <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-1 sm:gap-4">
                    <dt className="text-xs text-slate-400 font-medium">
                      {isBio ? 'Сквозная тематика' : 'Темы и проблематика'}
                    </dt>
                    <dd className="text-slate-200 leading-relaxed">{card.literaryProfile.themes}</dd>
                  </div>
                )}

                {card.literaryProfile.publicationFate && (
                  <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-1 sm:gap-4">
                    <dt className="text-xs text-slate-400 font-medium">
                      {isBio ? 'Журналы и публикационная судьба' : 'Судьба текста и издания'}
                    </dt>
                    <dd className="text-slate-200 leading-relaxed">
                      {card.literaryProfile.publicationFate}
                    </dd>
                  </div>
                )}

                {card.literaryProfile.culturalImpact && (
                  <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-1 sm:gap-4">
                    <dt className="text-xs text-slate-400 font-medium">
                      {isBio ? 'Влияние и наследие' : 'Культурное и историческое влияние'}
                    </dt>
                    <dd className="text-slate-200 leading-relaxed">
                      {card.literaryProfile.culturalImpact}
                    </dd>
                  </div>
                )}

                {card.literaryProfile.majorWorks && card.literaryProfile.majorWorks.length > 0 && (
                  <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-1 sm:gap-4">
                    <dt className="text-xs text-slate-400 font-medium">
                      Корпус главных произведений
                    </dt>
                    <dd className="text-slate-200 leading-relaxed">
                      <ul className="space-y-1">
                        {card.literaryProfile.majorWorks.map((workTitle, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-rose-400/80 select-none">·</span>
                            <span>{workTitle}</span>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Развёрнутое историческое описание */}
          <div className="rounded-xl bg-slate-900/75 border border-slate-800 p-4 space-y-2">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
              {isWork || isBio
                ? 'Историко-литературная справка и контекст'
                : 'Историческая справка и контекст'}
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
                  <span>
                    {isWork
                      ? `История замысла, создания и публикаций (${card.subEvents.length})`
                      : isBio
                        ? `Этапы жизни и творческого пути (${card.subEvents.length})`
                        : `Хронология ключевых этапов (${card.subEvents.length})`}
                  </span>
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
                      {sub.year !== undefined && sub.year !== '' && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 font-mono text-xs font-bold text-amber-300 tabular-nums">
                          {sub.year}
                        </span>
                      )}
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
          {totalUniqueLinksCount > 0 && (
            <div className="rounded-xl bg-slate-900/65 border border-emerald-500/30 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-mono uppercase tracking-wider text-emerald-300 flex items-center gap-2 font-bold">
                  <Link2 className="w-4 h-4 text-emerald-400" />
                  <span>Наглядная схема исторических связей ({totalUniqueLinksCount})</span>
                </div>
                {hiddenBranchLinksCount > 0 && (
                  <span className="text-[11px] font-mono text-amber-300 tabular-nums">
                    В скрытых ветках таймлайна: {hiddenBranchLinksCount}
                  </span>
                )}
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
                        const hiddenBranch = isBranchHidden(item.otherEvent);
                        return (
                          <div
                            key={`${item.otherId}-pre-${idx}`}
                            className={`rounded-lg bg-slate-900/90 border transition-all ${
                              hiddenBranch
                                ? 'border-amber-500/40 hover:border-amber-400/60'
                                : 'border-slate-800 hover:border-sky-400/50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => onSelectCard(item.otherId)}
                              className="w-full text-left p-2.5 hover:bg-slate-800/70 rounded-lg transition-colors cursor-pointer space-y-1"
                            >
                              <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                                <span
                                  style={{ color: ob?.color ?? '#38bdf8' }}
                                  className="font-bold tabular-nums"
                                >
                                  {item.otherEvent.period}
                                </span>
                                <span className="text-slate-400 truncate">{ob?.short}</span>
                              </div>
                              <div className="text-[11px] font-mono text-sky-300 font-semibold flex items-center gap-1.5">
                                <span aria-hidden="true">{item.directionMark}</span>
                                <span>{item.badge}</span>
                              </div>
                              <div className="text-xs font-bold text-white leading-snug">
                                {item.otherEvent.title}
                              </div>
                              <div className="text-[11px] text-slate-400 leading-snug">
                                {item.label}
                              </div>
                            </button>
                            {hiddenBranch && (
                              <div className="px-2.5 pb-2 pt-1 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10px] font-mono">
                                <span className="text-amber-300/90 truncate">
                                  Скрытая ветка: {ob?.label ?? item.otherEvent.task}
                                </span>
                                {onRevealBranch && (
                                  <button
                                    type="button"
                                    onClick={() => onRevealBranch(item.otherEvent.task)}
                                    className="text-amber-300 hover:text-amber-200 underline decoration-amber-400/40 underline-offset-2 shrink-0 cursor-pointer"
                                  >
                                    Включить ветку
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-2">
                      Нет выделенных предшествующих событий
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
                        const hiddenBranch = isBranchHidden(item.otherEvent);
                        return (
                          <div
                            key={`${item.otherId}-cons-${idx}`}
                            className={`rounded-lg bg-slate-900/90 border transition-all ${
                              hiddenBranch
                                ? 'border-amber-500/40 hover:border-amber-400/60'
                                : 'border-slate-800 hover:border-emerald-400/50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => onSelectCard(item.otherId)}
                              className="w-full text-left p-2.5 hover:bg-slate-800/70 rounded-lg transition-colors cursor-pointer space-y-1"
                            >
                              <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                                <span
                                  style={{ color: ob?.color ?? '#34d399' }}
                                  className="font-bold tabular-nums"
                                >
                                  {item.otherEvent.period}
                                </span>
                                <span className="text-slate-400 truncate">{ob?.short}</span>
                              </div>
                              <div className="text-[11px] font-mono text-emerald-300 font-semibold flex items-center gap-1.5">
                                <span aria-hidden="true">{item.directionMark}</span>
                                <span>{item.badge}</span>
                              </div>
                              <div className="text-xs font-bold text-white leading-snug">
                                {item.otherEvent.title}
                              </div>
                              <div className="text-[11px] text-slate-400 leading-snug">
                                {item.label}
                              </div>
                            </button>
                            {hiddenBranch && (
                              <div className="px-2.5 pb-2 pt-1 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10px] font-mono">
                                <span className="text-amber-300/90 truncate">
                                  Скрытая ветка: {ob?.label ?? item.otherEvent.task}
                                </span>
                                {onRevealBranch && (
                                  <button
                                    type="button"
                                    onClick={() => onRevealBranch(item.otherEvent.task)}
                                    className="text-amber-300 hover:text-amber-200 underline decoration-amber-400/40 underline-offset-2 shrink-0 cursor-pointer"
                                  >
                                    Включить ветку
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-2">
                      Выделенных следствий по связям не зафиксировано
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
                        const hiddenBranch = isBranchHidden(item.otherEvent);
                        return (
                          <div
                            key={`${item.otherId}-cult-${idx}`}
                            className={`rounded-lg bg-slate-900/90 border transition-all ${
                              hiddenBranch
                                ? 'border-amber-500/50 hover:border-amber-400/70'
                                : 'border-slate-800 hover:border-amber-400/50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => onSelectCard(item.otherId)}
                              className="w-full text-left p-2.5 hover:bg-slate-800/70 rounded-lg transition-colors cursor-pointer space-y-1"
                            >
                              <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                                <span
                                  style={{ color: ob?.color ?? '#fbbf24' }}
                                  className="font-bold inline-flex items-center gap-1 tabular-nums"
                                >
                                  {isSci ? (
                                    <FlaskConical className="w-3 h-3" />
                                  ) : (
                                    <BookOpen className="w-3 h-3" />
                                  )}
                                  {item.otherEvent.period}
                                </span>
                                <span className="text-slate-400 truncate">{ob?.short}</span>
                              </div>
                              <div className="text-[11px] font-mono text-amber-300/95 font-semibold flex items-center gap-1.5">
                                <span aria-hidden="true">{item.directionMark}</span>
                                <span className="truncate">{item.badge}</span>
                              </div>
                              <div className="text-xs font-bold text-white leading-snug">
                                {item.otherEvent.title}
                              </div>
                              <div className="text-[11px] text-slate-400 leading-snug">
                                {item.label}
                              </div>
                            </button>
                            {hiddenBranch && (
                              <div className="px-2.5 pb-2 pt-1 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10px] font-mono">
                                <span className="text-amber-300/90 truncate">
                                  Скрытая ветка: {ob?.label ?? item.otherEvent.task}
                                </span>
                                {onRevealBranch && (
                                  <button
                                    type="button"
                                    onClick={() => onRevealBranch(item.otherEvent.task)}
                                    className="text-amber-300 hover:text-amber-200 underline decoration-amber-400/40 underline-offset-2 shrink-0 cursor-pointer"
                                  >
                                    Включить ветку
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
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
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-mono uppercase tracking-wider text-sky-400 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" />
                  <span>
                    Синхронные события в других ветках ({card.concurrentEvents.length})
                  </span>
                </div>
                {card.concurrentEvents.length > 12 && (
                  <button
                    type="button"
                    onClick={() => setShowAllConcurrent((prev) => !prev)}
                    className="text-xs font-mono text-sky-300 hover:text-sky-200 underline decoration-sky-400/40 underline-offset-2 cursor-pointer"
                  >
                    {showAllConcurrent
                      ? 'Свернуть до 12'
                      : `Показать все ${card.concurrentEvents.length}`}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(showAllConcurrent
                  ? card.concurrentEvents
                  : card.concurrentEvents.slice(0, 12)
                ).map((other) => {
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
