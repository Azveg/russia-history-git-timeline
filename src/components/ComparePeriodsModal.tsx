import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Crown,
  GitBranch,
  GitCompareArrows,
  Layers,
  Link2,
  ScrollText,
  Sparkles,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { computePeriodComparison, resolveMacroEras } from '../engine/timelineEngine';
import type {
  BranchDefinition,
  ComparisonSideSummary,
  ComparisonTarget,
  EnrichedEvent,
  MacroEra,
  ModalHistoryItem,
  PersonDossier,
  RulerPeriod,
} from '../types/timeline';

type ComparisonTargetKind = ComparisonTarget['kind'];

interface ComparePeriodsModalProps {
  comparePair: { left: ComparisonTarget; right: ComparisonTarget } | null;
  rulers: RulerPeriod[];
  eras: MacroEra[];
  enrichedEvents: EnrichedEvent[];
  branches: BranchDefinition[];
  personDossiers?: Map<string, PersonDossier>;
  modalHistory?: ModalHistoryItem[];
  currentWindow: { from: number; to: number };
  minYear: number;
  maxYear: number;
  onUpdatePair: (pair: { left: ComparisonTarget; right: ComparisonTarget }) => void;
  onClose: () => void;
  onNavigateBack?: () => void;
  onSelectCard: (eventId: string) => void;
  onOpenRulerModal: (rulerId: string) => void;
  onOpenEraModal: (eraId: string) => void;
  onOpenPersonModal?: (personKey: string) => void;
  onSelectYearRange: (from: number, to: number) => void;
}

interface TargetSelectorProps {
  sideLabel: 'A' | 'B';
  accentClass: string;
  target: ComparisonTarget;
  rulers: RulerPeriod[];
  eras: ReturnType<typeof resolveMacroEras>;
  currentWindow: { from: number; to: number };
  minYear: number;
  maxYear: number;
  onChange: (next: ComparisonTarget) => void;
}

function TargetSelector({
  sideLabel,
  accentClass,
  target,
  rulers,
  eras,
  currentWindow,
  minYear,
  maxYear,
  onChange,
}: TargetSelectorProps) {
  const [fromDraft, setFromDraft] = useState(
    target.kind === 'window' ? String(target.from) : String(currentWindow.from),
  );
  const [toDraft, setToDraft] = useState(
    target.kind === 'window' ? String(target.to) : String(currentWindow.to),
  );

  useEffect(() => {
    if (target.kind === 'window') {
      setFromDraft(String(target.from));
      setToDraft(String(target.to));
    }
  }, [target]);

  const handleSwitchKind = (kind: ComparisonTargetKind) => {
    if (kind === target.kind) return;
    if (kind === 'ruler') {
      const fallback = rulers[0]?.id ?? '';
      if (fallback) onChange({ kind: 'ruler', rulerId: fallback });
    } else if (kind === 'era') {
      const fallback = eras[0]?.id ?? '';
      if (fallback) onChange({ kind: 'era', eraId: fallback });
    } else {
      const f = Number.isFinite(Number(fromDraft)) ? Number(fromDraft) : currentWindow.from;
      const t = Number.isFinite(Number(toDraft)) ? Number(toDraft) : currentWindow.to;
      onChange({ kind: 'window', from: Math.min(f, t), to: Math.max(f, t) });
    }
  };

  const commitWindowDraft = (nextFromRaw: string, nextToRaw: string) => {
    const parsedFrom = Number(nextFromRaw);
    const parsedTo = Number(nextToRaw);
    if (!Number.isFinite(parsedFrom) || !Number.isFinite(parsedTo)) return;
    const clampedFrom = Math.max(minYear, Math.min(maxYear, Math.round(parsedFrom)));
    const clampedTo = Math.max(minYear, Math.min(maxYear, Math.round(parsedTo)));
    onChange({
      kind: 'window',
      from: Math.min(clampedFrom, clampedTo),
      to: Math.max(clampedFrom, clampedTo),
    });
  };

  return (
    <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`text-xs font-mono font-bold uppercase tracking-wider ${accentClass}`}>
          Период {sideLabel}
        </span>

        <div className="inline-flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-[11px] font-mono">
          <button
            type="button"
            onClick={() => handleSwitchKind('ruler')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
              target.kind === 'ruler'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Правление
          </button>
          <button
            type="button"
            onClick={() => handleSwitchKind('era')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
              target.kind === 'era'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Макро-эпоха
          </button>
          <button
            type="button"
            onClick={() => handleSwitchKind('window')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
              target.kind === 'window'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Окно лет
          </button>
        </div>
      </div>

      {target.kind === 'ruler' && (
        <select
          aria-label={`Выбор правления для периода ${sideLabel}`}
          value={target.rulerId}
          onChange={(e) => onChange({ kind: 'ruler', rulerId: e.target.value })}
          className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
        >
          {rulers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.shortRuler} ({r.reignPeriod}) — {r.reignTitle}
            </option>
          ))}
        </select>
      )}

      {target.kind === 'era' && (
        <select
          aria-label={`Выбор макро-эпохи для периода ${sideLabel}`}
          value={target.eraId}
          onChange={(e) => onChange({ kind: 'era', eraId: e.target.value })}
          className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
        >
          {eras.map((era) => (
            <option key={era.id} value={era.id}>
              {era.displayShortTitle} · {era.title} ({era.period})
            </option>
          ))}
        </select>
      )}

      {target.kind === 'window' && (
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">с</span>
            <input
              type="number"
              min={minYear}
              max={maxYear}
              value={fromDraft}
              onChange={(e) => setFromDraft(e.target.value)}
              onBlur={() => commitWindowDraft(fromDraft, toDraft)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitWindowDraft(fromDraft, toDraft);
              }}
              aria-label={`Год начала периода ${sideLabel}`}
              className="w-24 h-8 px-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 tabular-nums focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">по</span>
            <input
              type="number"
              min={minYear}
              max={maxYear}
              value={toDraft}
              onChange={(e) => setToDraft(e.target.value)}
              onBlur={() => commitWindowDraft(fromDraft, toDraft)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitWindowDraft(fromDraft, toDraft);
              }}
              aria-label={`Год окончания периода ${sideLabel}`}
              className="w-24 h-8 px-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 tabular-nums focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({
                kind: 'window',
                from: currentWindow.from,
                to: currentWindow.to,
              })
            }
            className="px-2.5 h-8 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] transition-colors cursor-pointer whitespace-nowrap"
            title="Подставить текущее отфильтрованное окно лет"
          >
            Текущее окно ({currentWindow.from}–{currentWindow.to})
          </button>
        </div>
      )}
    </div>
  );
}

function formatDelta(leftVal: number, rightVal: number): { text: string; toneClass: string } {
  const diff = rightVal - leftVal;
  if (diff === 0) {
    return { text: '0', toneClass: 'text-slate-500' };
  }
  return {
    text: diff > 0 ? `+${diff}` : `${diff}`,
    toneClass: diff > 0 ? 'text-emerald-300' : 'text-amber-300',
  };
}

export function ComparePeriodsModal({
  comparePair,
  rulers,
  eras,
  enrichedEvents,
  branches,
  personDossiers,
  modalHistory = [],
  currentWindow,
  minYear,
  maxYear,
  onUpdatePair,
  onClose,
  onNavigateBack,
  onSelectCard,
  onOpenRulerModal,
  onOpenEraModal,
  onOpenPersonModal,
  onSelectYearRange,
}: ComparePeriodsModalProps) {
  const dialogRef = useModalFocusTrap<HTMLDivElement>(onClose);

  const resolvedEras = useMemo(() => resolveMacroEras(eras), [eras]);

  const report = useMemo(() => {
    if (!comparePair) return null;
    return computePeriodComparison(
      comparePair.left,
      comparePair.right,
      rulers,
      enrichedEvents,
      branches,
      eras,
      personDossiers,
    );
  }, [comparePair, rulers, enrichedEvents, branches, eras, personDossiers]);

  const quickPresets = useMemo(() => {
    const findRuler = (fragment: string) =>
      rulers.find((r) => r.shortRuler.toLowerCase().includes(fragment.toLowerCase()));
    const peter = findRuler('пётр i') ?? findRuler('петр i');
    const alex2 = findRuler('александр ii');
    const ivan4 = findRuler('иван iv');
    const catherine2 = findRuler('екатерина ii');

    const items: Array<{ label: string; left: ComparisonTarget; right: ComparisonTarget }> = [];
    if (peter && alex2) {
      items.push({
        label: 'Пётр I ↔ Александр II',
        left: { kind: 'ruler', rulerId: peter.id },
        right: { kind: 'ruler', rulerId: alex2.id },
      });
    }
    if (ivan4 && peter) {
      items.push({
        label: 'Иван IV ↔ Пётр I',
        left: { kind: 'ruler', rulerId: ivan4.id },
        right: { kind: 'ruler', rulerId: peter.id },
      });
    }
    if (peter && catherine2) {
      items.push({
        label: 'Пётр I ↔ Екатерина II',
        left: { kind: 'ruler', rulerId: peter.id },
        right: { kind: 'ruler', rulerId: catherine2.id },
      });
    }
    items.push({
      label: 'Северная война (1700–1721) ↔ Крымская война (1853–1856)',
      left: { kind: 'window', from: 1700, to: 1721, label: 'Северная война' },
      right: { kind: 'window', from: 1853, to: 1856, label: 'Крымская война' },
    });
    items.push({
      label: 'Смута (1598–1613) ↔ Излом (1914–1922)',
      left: { kind: 'window', from: 1598, to: 1613, label: 'Смутное время' },
      right: { kind: 'window', from: 1914, to: 1922, label: 'Революция и Гражданская война' },
    });
    return items;
  }, [rulers]);

  if (!comparePair || !report) return null;

  const { left, right, sharedBranchPairs, sharedSyncTags, sharedParticipants } = report;
  const lastHistoryItem = modalHistory.length > 0 ? modalHistory[modalHistory.length - 1] : null;

  const branchUnionMap = new Map<
    string,
    { branchId: string; label: string; color: string; leftCount: number; rightCount: number }
  >();
  left.branchBreakdown.forEach((b) => {
    branchUnionMap.set(b.branch.id, {
      branchId: b.branch.id,
      label: b.branch.label,
      color: b.branch.color,
      leftCount: b.count,
      rightCount: 0,
    });
  });
  right.branchBreakdown.forEach((b) => {
    const existing = branchUnionMap.get(b.branch.id);
    if (existing) {
      existing.rightCount = b.count;
    } else {
      branchUnionMap.set(b.branch.id, {
        branchId: b.branch.id,
        label: b.branch.label,
        color: b.branch.color,
        leftCount: 0,
        rightCount: b.count,
      });
    }
  });
  const branchComparisonRows = Array.from(branchUnionMap.values()).sort(
    (a, b) => Math.max(b.leftCount, b.rightCount) - Math.max(a.leftCount, a.rightCount),
  );
  const maxBranchCount = Math.max(
    1,
    ...branchComparisonRows.map((r) => Math.max(r.leftCount, r.rightCount)),
  );

  const metricRows: Array<{
    label: string;
    leftVal: number | string;
    rightVal: number | string;
    numericDelta?: { text: string; toneClass: string };
  }> = [
    {
      label: 'Длительность (лет)',
      leftVal: left.durationYears,
      rightVal: right.durationYears,
      numericDelta: formatDelta(left.durationYears, right.durationYears),
    },
    {
      label: 'Исторических событий в периоде',
      leftVal: left.historicalEventsCount,
      rightVal: right.historicalEventsCount,
      numericDelta: formatDelta(left.historicalEventsCount, right.historicalEventsCount),
    },
    {
      label: 'Начато в периоде / унаследовано',
      leftVal: `${left.startedInPeriodCount} / ${left.carryOverInCount}`,
      rightVal: `${right.startedInPeriodCount} / ${right.carryOverInCount}`,
    },
    {
      label: 'Перешло за границу периода',
      leftVal: left.carryOverOutCount,
      rightVal: right.carryOverOutCount,
      numericDelta: formatDelta(left.carryOverOutCount, right.carryOverOutCount),
    },
    {
      label: 'Уникальных связей всего',
      leftVal: left.totalUniqueLinks,
      rightVal: right.totalUniqueLinks,
      numericDelta: formatDelta(left.totalUniqueLinks, right.totalUniqueLinks),
    },
    {
      label: 'Причинно-следственных (triggers / enables)',
      leftVal: left.causalLinksCount,
      rightVal: right.causalLinksCount,
      numericDelta: formatDelta(left.causalLinksCount, right.causalLinksCount),
    },
    {
      label: 'Синхронных / ретроспективных',
      leftVal: `${left.syncLinksCount} / ${left.retrospectiveLinksCount}`,
      rightVal: `${right.syncLinksCount} / ${right.retrospectiveLinksCount}`,
    },
    {
      label: 'Пиковый узел плотности',
      leftVal: left.peakInterval ? `${left.peakInterval.label} (${left.peakInterval.count})` : '—',
      rightVal: right.peakInterval ? `${right.peakInterval.label} (${right.peakInterval.count})` : '—',
    },
  ];

  const renderSideHeaderCard = (
    side: ComparisonSideSummary,
    sideLabel: 'A' | 'B',
    borderAccent: string,
    textAccent: string,
  ) => (
    <div className={`rounded-xl bg-slate-900/65 border ${borderAccent} p-4 flex flex-col justify-between gap-3`}>
      <div>
        <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
          <span className={`font-bold ${textAccent}`}>
            Сторона {sideLabel} · {side.kindLabel} · {side.yearFrom}–{side.yearTo} гг.
          </span>
          <span className="text-slate-400 tabular-nums">{side.durationYears} л.</span>
        </div>
        <h4 className="font-serif text-lg sm:text-xl font-bold text-white mt-1 leading-snug">
          {side.title}
        </h4>
        {side.subtitle && (
          <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">{side.subtitle}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono pt-2 border-t border-slate-800/80">
        <button
          type="button"
          onClick={() => {
            onSelectYearRange(side.yearFrom, side.yearTo);
            onClose();
          }}
          className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
        >
          Открыть на шкале →
        </button>
        {side.target.kind === 'ruler' && (
          <button
            type="button"
            onClick={() => onOpenRulerModal(side.target.kind === 'ruler' ? side.target.rulerId : '')}
            className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/35 text-amber-200 inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Crown className="w-3 h-3" />
            <span>Досье правления</span>
          </button>
        )}
        {side.target.kind === 'era' && (
          <button
            type="button"
            onClick={() => onOpenEraModal(side.target.kind === 'era' ? side.target.eraId : '')}
            className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/35 text-amber-200 inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ScrollText className="w-3 h-3" />
            <span>Досье эпохи</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-modal-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-6xl max-h-[92vh] rounded-2xl bg-[#0b1325] border border-sky-500/40 shadow-2xl flex flex-col overflow-hidden">
        {/* Верхняя панель модального окна */}
        <div className="px-5 py-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs font-mono text-sky-300 flex-wrap min-w-0">
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
            <GitCompareArrows className="w-4 h-4 shrink-0 text-sky-400" />
            <span id="compare-modal-title" className="font-bold text-white text-sm font-serif">
              Сравнительный анализ периодов и правлений
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                onUpdatePair({
                  left: comparePair.right,
                  right: comparePair.left,
                })
              }
              className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              title="Поменять местами период A и период B"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400" />
              <span>A ⇄ B</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть сравнение периодов"
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Тело модального окна */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Готовые исторические пары для быстрого запуска */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="text-slate-400 shrink-0 inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Готовые сопоставления:
            </span>
            {quickPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onUpdatePair({ left: preset.left, right: preset.right })}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/50 text-slate-200 transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Селекторы сторон A и B */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TargetSelector
              sideLabel="A"
              accentClass="text-amber-300"
              target={comparePair.left}
              rulers={rulers}
              eras={resolvedEras}
              currentWindow={currentWindow}
              minYear={minYear}
              maxYear={maxYear}
              onChange={(nextLeft) => onUpdatePair({ left: nextLeft, right: comparePair.right })}
            />
            <TargetSelector
              sideLabel="B"
              accentClass="text-sky-300"
              target={comparePair.right}
              rulers={rulers}
              eras={resolvedEras}
              currentWindow={currentWindow}
              minYear={minYear}
              maxYear={maxYear}
              onChange={(nextRight) => onUpdatePair({ left: comparePair.left, right: nextRight })}
            />
          </div>

          {/* Заголовочные карточки A и B */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {renderSideHeaderCard(left, 'A', 'border-amber-500/35', 'text-amber-300')}
            {renderSideHeaderCard(right, 'B', 'border-sky-500/35', 'text-sky-300')}
          </div>

          {/* Таблица сопоставления ключевых показателей */}
          <section className="space-y-2.5">
            <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Количественный профиль и связность процессов</span>
            </h5>

            <div className="rounded-xl border border-slate-800 bg-slate-900/45 overflow-hidden">
              <div className="grid grid-cols-12 px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <div className="col-span-5 sm:col-span-6">Показатель</div>
                <div className="col-span-3 sm:col-span-2 text-right text-amber-300">Период A</div>
                <div className="col-span-2 text-right text-sky-300">Период B</div>
                <div className="col-span-2 text-right">Δ (B − A)</div>
              </div>
              <div className="divide-y divide-slate-800/70">
                {metricRows.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-12 px-4 py-2.5 items-center text-xs hover:bg-slate-900/60"
                  >
                    <div className="col-span-5 sm:col-span-6 text-slate-200 pr-2">{row.label}</div>
                    <div className="col-span-3 sm:col-span-2 text-right font-mono font-bold text-amber-200 tabular-nums">
                      {row.leftVal}
                    </div>
                    <div className="col-span-2 text-right font-mono font-bold text-sky-200 tabular-nums">
                      {row.rightVal}
                    </div>
                    <div
                      className={`col-span-2 text-right font-mono font-semibold tabular-nums ${
                        row.numericDelta ? row.numericDelta.toneClass : 'text-slate-600'
                      }`}
                    >
                      {row.numericDelta ? row.numericDelta.text : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Повторяющиеся межсферные контуры, сюжеты и персоны */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section className="rounded-xl border border-emerald-500/25 bg-emerald-950/10 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Повторяющиеся контуры связей</span>
                </h5>
                <span className="text-[11px] font-mono text-emerald-300 tabular-nums">
                  {sharedBranchPairs.length}
                </span>
              </div>

              {sharedBranchPairs.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Совпадающих пар веток с явными связями в обоих периодах не обнаружено.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {sharedBranchPairs.slice(0, 10).map((pair) => (
                    <div
                      key={pair.pairKey}
                      className="rounded-lg bg-slate-950/75 border border-slate-800/90 px-3 py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="text-slate-200 truncate">
                        {pair.branchALabel} ↔ {pair.branchBLabel}
                      </span>
                      <span className="font-mono text-[11px] shrink-0 tabular-nums">
                        <span className="text-amber-300 font-bold">{pair.countLeft}</span>
                        <span className="text-slate-500 mx-1">vs</span>
                        <span className="text-sky-300 font-bold">{pair.countRight}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/45 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>Сквозные сюжетные теги</span>
                </h5>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  {sharedSyncTags.length}
                </span>
              </div>

              {sharedSyncTags.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Общих тематических тегов (syncTags) между этими периодами нет.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {sharedSyncTags.slice(0, 12).map((t) => (
                    <div
                      key={t.tag}
                      className="rounded-lg bg-slate-950/75 border border-slate-800/90 px-3 py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-mono text-slate-200 truncate" title={t.tag}>
                        {t.label}
                      </span>
                      <span className="font-mono text-[11px] shrink-0 tabular-nums">
                        <span className="text-amber-300">{t.countLeft}</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-sky-300">{t.countRight}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/45 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span>Сквозные деятели и авторы</span>
                </h5>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  {sharedParticipants.length}
                </span>
              </div>

              {sharedParticipants.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Персон, присутствующих одновременно в обоих периодах (или их наследии), не найдено.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {sharedParticipants.slice(0, 12).map((p) => (
                    <button
                      key={p.personKey}
                      type="button"
                      onClick={() => onOpenPersonModal?.(p.personKey)}
                      disabled={!onOpenPersonModal}
                      className="w-full text-left rounded-lg bg-slate-950/75 hover:bg-slate-900 border border-slate-800/90 px-3 py-2 flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer disabled:cursor-default"
                    >
                      <span className="text-slate-100 truncate">{p.displayName}</span>
                      <span className="font-mono text-[11px] shrink-0 tabular-nums">
                        <span className="text-amber-300">{p.countLeft}</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-sky-300">{p.countRight}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Распределение событий по историческим веткам */}
          <section className="space-y-2.5">
            <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-amber-400" />
              <span>Профиль сфер и веток (Период A vs Период B)</span>
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {branchComparisonRows.map((row) => {
                const leftPct = Math.round((row.leftCount / maxBranchCount) * 100);
                const rightPct = Math.round((row.rightCount / maxBranchCount) * 100);
                return (
                  <div
                    key={row.branchId}
                    className="rounded-lg bg-slate-900/55 border border-slate-800 px-3.5 py-2.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: row.color }}
                        />
                        {row.label}
                      </span>
                      <span className="font-mono text-[11px] shrink-0 tabular-nums">
                        <span className="text-amber-300 font-bold">{row.leftCount}</span>
                        <span className="text-slate-600 mx-1">·</span>
                        <span className="text-sky-300 font-bold">{row.rightCount}</span>
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400/85"
                          style={{ width: `${leftPct}%` }}
                        />
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-sky-400/85"
                          style={{ width: `${rightPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Ключевые узловые события каждой стороны */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              { side: left, label: 'A', titleClass: 'text-amber-300' },
              { side: right, label: 'B', titleClass: 'text-sky-300' },
            ].map(({ side, label, titleClass }) => (
              <section key={label} className="space-y-2">
                <h5 className={`text-xs font-mono font-bold uppercase tracking-wider ${titleClass}`}>
                  Ключевые узловые события · Сторона {label} ({side.yearFrom}–{side.yearTo} гг.)
                </h5>
                {side.topConnectedEvents.length === 0 ? (
                  <p className="text-xs text-slate-400">Связанных событий в периоде нет.</p>
                ) : (
                  <div className="space-y-1.5">
                    {side.topConnectedEvents.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => onSelectCard(ev.id)}
                        className="w-full text-left rounded-lg bg-slate-900/65 hover:bg-slate-900 border border-slate-800 hover:border-slate-600 px-3 py-2 flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white group-hover:text-amber-200 truncate">
                            <span className="font-mono text-slate-400 mr-1.5 tabular-nums">
                              {ev.period}
                            </span>
                            {ev.title}
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-300 shrink-0 tabular-nums">
                          {ev.explicitLinks.length} св.
                          <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-amber-300" />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
