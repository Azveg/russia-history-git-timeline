import {
  ArrowLeftRight,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Crown,
  FlaskConical,
  GitBranch,
  GitCompareArrows,
  Globe,
  Handshake,
  Landmark,
  Layers,
  Link2,
  ScrollText,
  Sparkles,
  Swords,
  Tag,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { DossierModalHeader } from './DossierModalHeader';
import {
  ERA_SPHERE_META,
  ERA_SPHERE_ORDER,
  computePeriodComparison,
  resolveMacroEras,
} from '../engine/timelineEngine';
import type {
  BranchDefinition,
  ComparisonSideSummary,
  ComparisonTarget,
  EnrichedEvent,
  EraEventSphereId,
  MacroEra,
  ModalHistoryItem,
  PersonDossier,
  RulerPeriod,
} from '../types/timeline';

type ComparisonTargetKind = ComparisonTarget['kind'];
type CompareTabId = 'summary' | 'spheres' | 'connections';

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

function getBarWidthClass(pct: number): string {
  if (pct <= 0) return 'w-0';
  if (pct < 8) return 'w-[6%]';
  if (pct < 15) return 'w-1/12';
  if (pct < 22) return 'w-1/6';
  if (pct < 30) return 'w-1/4';
  if (pct < 38) return 'w-1/3';
  if (pct < 46) return 'w-5/12';
  if (pct < 55) return 'w-1/2';
  if (pct < 63) return 'w-7/12';
  if (pct < 72) return 'w-2/3';
  if (pct < 80) return 'w-3/4';
  if (pct < 90) return 'w-5/6';
  if (pct < 96) return 'w-11/12';
  return 'w-full';
}

function renderSphereIcon(sphereId: EraEventSphereId, className = 'w-3.5 h-3.5 shrink-0') {
  switch (sphereId) {
    case 'wars':
      return <Swords className={className} />;
    case 'reforms':
      return <Landmark className={className} />;
    case 'diplomacy':
      return <Handshake className={className} />;
    case 'world':
      return <Globe className={className} />;
    case 'science':
      return <FlaskConical className={className} />;
  }
}

const SPHERE_ACCENT: Record<EraEventSphereId, string> = {
  wars: 'text-rose-300',
  reforms: 'text-amber-300',
  diplomacy: 'text-sky-300',
  world: 'text-indigo-300',
  science: 'text-emerald-300',
};

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
  const [activeTab, setActiveTab] = useState<CompareTabId>('summary');
  const [showBranchDetails, setShowBranchDetails] = useState(false);
  const [showAllPairs, setShowAllPairs] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [showAllParticipants, setShowAllParticipants] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const dialogRef = useModalFocusTrap<HTMLDivElement>(onClose);

  const pairSignature = comparePair
    ? `${JSON.stringify(comparePair.left)}__${JSON.stringify(comparePair.right)}`
    : '';

  useEffect(() => {
    setShowAllPairs(false);
    setShowAllTags(false);
    setShowAllParticipants(false);
  }, [pairSignature]);

  const scrollToTabsIfNeeded = () => {
    const body = bodyRef.current;
    const tabsEl = tabBarRef.current;
    if (!body || !tabsEl) return;
    const targetTop = Math.max(0, tabsEl.offsetTop - 8);
    if (body.scrollTop > targetTop) {
      body.scrollTo({ top: targetTop });
    }
  };

  const handleTabChange = (nextTab: CompareTabId) => {
    setActiveTab(nextTab);
    scrollToTabsIfNeeded();
  };

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
      label: 'Северная война ↔ Крымская война',
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

  const sphereComparisonRows = ERA_SPHERE_ORDER.map((sphereId) => {
    const leftCount = left.sphereCounts[sphereId] ?? 0;
    const rightCount = right.sphereCounts[sphereId] ?? 0;
    return {
      id: sphereId,
      label: ERA_SPHERE_META[sphereId].label,
      shortLabel: ERA_SPHERE_META[sphereId].shortLabel,
      leftCount,
      rightCount,
      delta: formatDelta(leftCount, rightCount),
    };
  });
  const maxSphereCount = Math.max(
    1,
    ...sphereComparisonRows.map((r) => Math.max(r.leftCount, r.rightCount)),
  );

  const branchUnionMap = new Map<
    string,
    { branchId: string; label: string; leftCount: number; rightCount: number }
  >();
  left.branchBreakdown.forEach((b) => {
    branchUnionMap.set(b.branch.id, {
      branchId: b.branch.id,
      label: b.branch.label,
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
      label: 'Причинно-следственных связей',
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
      rightVal: right.peakInterval
        ? `${right.peakInterval.label} (${right.peakInterval.count})`
        : '—',
    },
  ];

  const connectionsCount =
    sharedBranchPairs.length + sharedSyncTags.length + sharedParticipants.length;

  const tabs: Array<{ id: CompareTabId; label: string; count?: number; icon: React.ReactNode }> = [
    {
      id: 'summary',
      label: 'Сводка',
      icon: <Layers className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'spheres',
      label: 'Сферы и ветки',
      count: branchComparisonRows.length,
      icon: <GitBranch className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'connections',
      label: 'Связи и деятели',
      count: connectionsCount,
      icon: <Link2 className="w-3.5 h-3.5 shrink-0" />,
    },
  ];

  const renderSideHeaderCard = (
    side: ComparisonSideSummary,
    sideLabel: 'A' | 'B',
    borderAccent: string,
    textAccent: string,
  ) => (
    <div
      className={`rounded-xl bg-slate-900/65 border ${borderAccent} p-4 flex flex-col justify-between gap-2.5`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
          <span className={`font-bold ${textAccent}`}>
            Сторона {sideLabel} · {side.kindLabel} · {side.yearFrom}–{side.yearTo} гг.
          </span>
          <span className="text-slate-400">{side.durationYears} л.</span>
        </div>
        <h4 className="font-serif text-lg sm:text-xl font-bold text-white mt-1 leading-snug text-balance">
          {side.title}
        </h4>
        {side.subtitle && (
          <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
            {side.subtitle}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs font-mono pt-2 border-t border-slate-800/80">
        <button
          type="button"
          onClick={() => {
            onSelectYearRange(side.yearFrom, side.yearTo);
            onClose();
          }}
          className="text-slate-300 hover:text-white underline decoration-slate-600 underline-offset-4 transition-colors cursor-pointer whitespace-nowrap"
        >
          Открыть на шкале →
        </button>
        {side.target.kind === 'ruler' && (
          <button
            type="button"
            onClick={() => onOpenRulerModal(side.target.kind === 'ruler' ? side.target.rulerId : '')}
            className="text-amber-300 hover:text-amber-200 inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Crown className="w-3 h-3" />
            <span>Досье правления</span>
          </button>
        )}
        {side.target.kind === 'era' && (
          <button
            type="button"
            onClick={() => onOpenEraModal(side.target.kind === 'era' ? side.target.eraId : '')}
            className="text-amber-300 hover:text-amber-200 inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ScrollText className="w-3 h-3" />
            <span>Досье эпохи</span>
          </button>
        )}
      </div>
    </div>
  );

  const visiblePairs = showAllPairs ? sharedBranchPairs : sharedBranchPairs.slice(0, 8);
  const visibleTags = showAllTags ? sharedSyncTags : sharedSyncTags.slice(0, 8);
  const visibleParticipants = showAllParticipants
    ? sharedParticipants
    : sharedParticipants.slice(0, 8);

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
        {/* Единая шапка досье */}
        <DossierModalHeader
          lastHistoryItem={lastHistoryItem}
          onNavigateBack={onNavigateBack}
          onClose={onClose}
          closeAriaLabel="Закрыть сравнение периодов"
          context={
            <>
              <GitCompareArrows className="w-4 h-4 shrink-0 text-sky-400" />
              <span
                id="compare-modal-title"
                className="font-serif text-sm sm:text-base font-bold text-white truncate"
              >
                Сравнительный анализ периодов и правлений
              </span>
            </>
          }
          actions={
            <button
              type="button"
              onClick={() =>
                onUpdatePair({
                  left: comparePair.right,
                  right: comparePair.left,
                })
              }
              className="h-8 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
              title="Поменять местами период A и период B"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>A ⇄ B</span>
            </button>
          }
        />

        {/* Прокручиваемое тело */}
        <div ref={bodyRef} className="px-5 sm:px-6 pt-5 pb-6 overflow-y-auto space-y-5 flex-1">
          {/* Готовые сопоставления */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="text-slate-400 shrink-0 inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Готовые пары:</span>
            </span>
            {quickPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onUpdatePair({ left: preset.left, right: preset.right })}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/50 text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
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

          {/* Заголовочные карточки сторон A и B */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {renderSideHeaderCard(left, 'A', 'border-amber-500/35', 'text-amber-300')}
            {renderSideHeaderCard(right, 'B', 'border-sky-500/35', 'text-sky-300')}
          </div>

          {/* Липкая полоса 3 вкладок */}
          <div
            ref={tabBarRef}
            role="tablist"
            aria-label="Разделы сравнения периодов"
            className="sticky top-0 z-10 -mx-5 sm:-mx-6 px-5 sm:px-6 bg-[#0b1325]/95 backdrop-blur-sm border-b border-slate-800/90 flex items-center gap-1 overflow-x-auto"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-3.5 py-2.5 text-xs font-mono inline-flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/70 ${
                    isActive
                      ? 'border-amber-400 text-amber-200 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && (
                    <span
                      className={`tabular-nums text-[11px] ${
                        isActive ? 'text-amber-300/90' : 'text-slate-500'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ВКЛАДКА 1: СВОДКА */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Таблица количественных показателей */}
              <section className="space-y-2.5">
                <h5 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 inline-flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  <span>Количественный профиль и связность процессов</span>
                </h5>

                <div className="rounded-xl border border-slate-800 bg-slate-900/45 overflow-hidden">
                  <div className="grid grid-cols-12 px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    <div className="col-span-5 sm:col-span-6">Показатель</div>
                    <div className="col-span-3 sm:col-span-2 text-right text-amber-300">
                      Период A
                    </div>
                    <div className="col-span-2 text-right text-sky-300">Период B</div>
                    <div className="col-span-2 text-right">Δ (B − A)</div>
                  </div>
                  <div className="divide-y divide-slate-800/70">
                    {metricRows.map((row) => (
                      <div
                        key={row.label}
                        className="grid grid-cols-12 px-4 py-2.5 items-center text-xs hover:bg-slate-900/60"
                      >
                        <div className="col-span-5 sm:col-span-6 text-slate-200 pr-2">
                          {row.label}
                        </div>
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

              {/* Ключевые узловые события каждой стороны */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {[
                  { side: left, label: 'A', titleClass: 'text-amber-300' },
                  { side: right, label: 'B', titleClass: 'text-sky-300' },
                ].map(({ side, label, titleClass }) => (
                  <section key={label} className="space-y-2">
                    <h5
                      className={`text-xs font-mono font-semibold uppercase tracking-wider ${titleClass}`}
                    >
                      Ключевые события · Сторона {label} ({side.yearFrom}–{side.yearTo} гг.)
                    </h5>
                    {side.topConnectedEvents.length === 0 ? (
                      <p className="text-xs text-slate-400">Связанных событий в периоде нет.</p>
                    ) : (
                      <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                        {side.topConnectedEvents.map((ev) => (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => onSelectCard(ev.id)}
                            className="group w-full text-left py-2.5 px-2 -mx-2 rounded-lg hover:bg-slate-800/45 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                          >
                            <div className="min-w-0 text-xs sm:text-sm font-semibold text-white group-hover:text-amber-200 truncate">
                              <span className="font-mono text-xs text-slate-400 mr-2 tabular-nums">
                                {ev.period}
                              </span>
                              <span>{ev.title}</span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-300 shrink-0 tabular-nums">
                              <span>{ev.explicitLinks.length} св.</span>
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
          )}

          {/* ВКЛАДКА 2: СФЕРЫ И ВЕТКИ */}
          {activeTab === 'spheres' && (
            <div className="space-y-6">
              {/* 5 укрупнённых сфер A vs B */}
              <section className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h5 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 inline-flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Сравнение по 5 сферам (Период A vs Период B)</span>
                  </h5>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="text-amber-300">A: {left.title}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-sky-300">B: {right.title}</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                  {sphereComparisonRows.map((row) => {
                    const leftPct = Math.round((row.leftCount / maxSphereCount) * 100);
                    const rightPct = Math.round((row.rightCount / maxSphereCount) * 100);
                    return (
                      <div key={row.id} className="py-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span
                            className={`font-mono font-semibold inline-flex items-center gap-1.5 ${SPHERE_ACCENT[row.id]}`}
                          >
                            {renderSphereIcon(row.id)}
                            <span>{row.label}</span>
                          </span>
                          <span className="font-mono text-xs shrink-0 tabular-nums flex items-center gap-2">
                            <span className="text-amber-300 font-bold">A: {row.leftCount}</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-sky-300 font-bold">B: {row.rightCount}</span>
                            <span className="text-slate-600">·</span>
                            <span className={`font-semibold ${row.delta.toneClass}`}>
                              Δ {row.delta.text}
                            </span>
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-amber-400/85 ${getBarWidthClass(leftPct)}`}
                            />
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-sky-400/85 ${getBarWidthClass(rightPct)}`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Сворачиваемая детализация по конкретным веткам */}
              {branchComparisonRows.length > 0 && (
                <div className="rounded-xl bg-slate-900/55 border border-slate-800/90 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowBranchDetails((prev) => !prev)}
                    aria-expanded={showBranchDetails}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-800/45 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-mono uppercase tracking-wider font-semibold text-slate-300 inline-flex items-center gap-2">
                      <GitBranch className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Детализация по историческим веткам ({branchComparisonRows.length})</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-400 whitespace-nowrap shrink-0">
                      <span>{showBranchDetails ? 'Свернуть' : 'Раскрыть'}</span>
                      {showBranchDetails ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </button>

                  {showBranchDetails && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-800/70 grid grid-cols-1 md:grid-cols-2 gap-x-6 divide-y md:divide-y-0 divide-slate-800/70">
                      {branchComparisonRows.map((row) => {
                        const leftPct = Math.round((row.leftCount / maxBranchCount) * 100);
                        const rightPct = Math.round((row.rightCount / maxBranchCount) * 100);
                        return (
                          <div
                            key={row.branchId}
                            className="py-2.5 space-y-1.5 md:border-b md:border-slate-800/60"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-medium text-slate-200 truncate">
                                {row.label}
                              </span>
                              <span className="font-mono text-[11px] shrink-0 tabular-nums">
                                <span className="text-amber-300 font-bold">{row.leftCount}</span>
                                <span className="text-slate-600 mx-1">·</span>
                                <span className="text-sky-300 font-bold">{row.rightCount}</span>
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="h-1 rounded-full bg-slate-950 overflow-hidden">
                                <div
                                  className={`h-full rounded-full bg-amber-400/80 ${getBarWidthClass(leftPct)}`}
                                />
                              </div>
                              <div className="h-1 rounded-full bg-slate-950 overflow-hidden">
                                <div
                                  className={`h-full rounded-full bg-sky-400/80 ${getBarWidthClass(rightPct)}`}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ВКЛАДКА 3: СВЯЗИ И ДЕЯТЕЛИ */}
          {activeTab === 'connections' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Повторяющиеся контуры связей */}
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-300 inline-flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Контуры связей</span>
                  </h5>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    {sharedBranchPairs.length}
                  </span>
                </div>

                {sharedBranchPairs.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Совпадающих пар веток с явными связями в обоих периодах не обнаружено.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                      {visiblePairs.map((pair) => (
                        <div
                          key={pair.pairKey}
                          className="py-2 flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="text-slate-200 truncate">
                            {pair.branchALabel} ↔ {pair.branchBLabel}
                          </span>
                          <span className="font-mono text-[11px] shrink-0 tabular-nums">
                            <span className="text-amber-300 font-bold">{pair.countLeft}</span>
                            <span className="text-slate-600 mx-1">/</span>
                            <span className="text-sky-300 font-bold">{pair.countRight}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                    {sharedBranchPairs.length > 8 && (
                      <button
                        type="button"
                        onClick={() => setShowAllPairs((prev) => !prev)}
                        className="text-xs font-mono text-amber-300 hover:text-amber-200 cursor-pointer"
                      >
                        {showAllPairs ? 'Свернуть' : `Показать все (${sharedBranchPairs.length})`}
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* Сквозные сюжетные теги */}
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-300 inline-flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Сквозные сюжеты</span>
                  </h5>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    {sharedSyncTags.length}
                  </span>
                </div>

                {sharedSyncTags.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Общих тематических сюжетов между этими периодами нет.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                      {visibleTags.map((t) => (
                        <div
                          key={t.tag}
                          className="py-2 flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="text-slate-200 truncate" title={t.tag}>
                            {t.label}
                          </span>
                          <span className="font-mono text-[11px] shrink-0 tabular-nums">
                            <span className="text-amber-300 font-bold">{t.countLeft}</span>
                            <span className="text-slate-600 mx-1">/</span>
                            <span className="text-sky-300 font-bold">{t.countRight}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                    {sharedSyncTags.length > 8 && (
                      <button
                        type="button"
                        onClick={() => setShowAllTags((prev) => !prev)}
                        className="text-xs font-mono text-amber-300 hover:text-amber-200 cursor-pointer"
                      >
                        {showAllTags ? 'Свернуть' : `Показать все (${sharedSyncTags.length})`}
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* Сквозные деятели и авторы */}
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs font-mono font-semibold uppercase tracking-wider text-sky-300 inline-flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Сквозные деятели</span>
                  </h5>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    {sharedParticipants.length}
                  </span>
                </div>

                {sharedParticipants.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Персон, присутствующих в обоих периодах, не найдено.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                      {visibleParticipants.map((p) =>
                        onOpenPersonModal ? (
                          <button
                            key={p.personKey}
                            type="button"
                            onClick={() => onOpenPersonModal(p.personKey)}
                            className="group w-full text-left py-2 px-1 -mx-1 rounded hover:bg-slate-800/45 flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer"
                          >
                            <span className="text-slate-100 group-hover:text-amber-200 truncate">
                              {p.displayName}
                            </span>
                            <span className="font-mono text-[11px] shrink-0 tabular-nums">
                              <span className="text-amber-300 font-bold">{p.countLeft}</span>
                              <span className="text-slate-600 mx-1">/</span>
                              <span className="text-sky-300 font-bold">{p.countRight}</span>
                            </span>
                          </button>
                        ) : (
                          <div
                            key={p.personKey}
                            className="py-2 flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="text-slate-200 truncate">{p.displayName}</span>
                            <span className="font-mono text-[11px] shrink-0 tabular-nums">
                              <span className="text-amber-300 font-bold">{p.countLeft}</span>
                              <span className="text-slate-600 mx-1">/</span>
                              <span className="text-sky-300 font-bold">{p.countRight}</span>
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                    {sharedParticipants.length > 8 && (
                      <button
                        type="button"
                        onClick={() => setShowAllParticipants((prev) => !prev)}
                        className="text-xs font-mono text-amber-300 hover:text-amber-200 cursor-pointer"
                      >
                        {showAllParticipants
                          ? 'Свернуть'
                          : `Показать все (${sharedParticipants.length})`}
                      </button>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
