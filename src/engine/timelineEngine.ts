import type {
  BranchDefinition,
  BranchFile,
  EnrichedEvent,
  ExplicitLinkInfo,
  FilterState,
  MacroEra,
  MilitaryBranchMode,
  RulerPeriod,
  RulerSpanSegment,
  RulersFile,
  StreamRow,
  SyncManifest,
  TimelineDataFile,
} from '../types/timeline';

export const UNIFIED_MILITARY_BRANCH: BranchDefinition = {
  id: 'MILITARY_ALL',
  gitName: 'war/conflicts',
  label: 'Военные конфликты (все)',
  short: 'war/all',
  sourceFile: 'data/wars.json',
  description: 'Все международные войны, колониальные походы, интервенции и силовые операции',
  color: '#ef4444',
  badgeClass: 'bg-red-500/15 text-red-300 border-red-500/40',
  isMilitary: true,
};

const CUSTOM_EVENT_YEARS: Record<string, [number, number]> = {
  '1746-chukchi': [1746, 1776],
  '1776-world-usa-france': [1776, 1789],
  '1813-foreign-campaigns': [1813, 1815],
  '1918-basmachi': [1918, 1934],
  '1920s-north-caucasus': [1922, 1936],
  '1934-xinjiang': [1934, 1937],
  '1944-upa-forest-brothers': [1944, 1956],
  '1973-reform-oil-boom': [1970, 1986],
  '1975-world-helsinki': [1975, 1989],
};

export function parseEventYears(periodStr: string, eventId?: string): { startYear: number; endYear: number } {
  if (eventId && CUSTOM_EVENT_YEARS[eventId]) {
    return { startYear: CUSTOM_EVENT_YEARS[eventId][0], endYear: CUSTOM_EVENT_YEARS[eventId][1] };
  }
  const matches = periodStr.match(/\b(16\d\d|17\d\d|18\d\d|19\d\d|20\d\d)\b/g);
  if (!matches || matches.length === 0) {
    return { startYear: 1700, endYear: 1700 };
  }
  const nums = matches.map(Number);
  const startYear = nums[0];
  const endYear = nums.length > 1 ? Math.max(...nums) : startYear;
  return { startYear, endYear: Math.max(startYear, endYear) };
}

export function getGitHash(idStr: string): string {
  let hash = 2166136261;
  for (let i = 0; i < idStr.length; i++) {
    hash ^= idStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(7, '0').slice(0, 7);
}

export function isRulersFile(file: TimelineDataFile | undefined): file is RulersFile {
  return Boolean(file && 'rulers' in file && Array.isArray(file.rulers));
}

export function isBranchFile(file: TimelineDataFile | undefined): file is BranchFile {
  return Boolean(file && 'nodes' in file && Array.isArray(file.nodes));
}

export async function fetchTimelineRepository(): Promise<{
  manifest: SyncManifest;
  files: Record<string, TimelineDataFile>;
}> {
  const manifestRes = await fetch('./data/sync.manifest.json', { cache: 'no-store' });
  if (!manifestRes.ok) {
    throw new Error(`Не удалось загрузить файл синхронизации (HTTP ${manifestRes.status})`);
  }
  const manifest = (await manifestRes.json()) as SyncManifest;
  const files: Record<string, TimelineDataFile> = {};

  await Promise.allSettled(
    manifest.mountedFiles.map(async (meta) => {
      const cleanPath = meta.path.replace(/^\.?\//, '');
      const res = await fetch(`./${cleanPath}`, { cache: 'no-store' });
      if (res.ok) {
        files[meta.path] = (await res.json()) as TimelineDataFile;
      }
    }),
  );

  return { manifest, files };
}

export function extractBranchesFromStore(
  manifest: SyncManifest,
  filesMap: Record<string, TimelineDataFile>,
): BranchDefinition[] {
  const result: BranchDefinition[] = [];
  manifest.mountedFiles.forEach((meta) => {
    if (!meta.enabled) return;
    const fileData = filesMap[meta.path];
    if (!fileData) return;
    if ('branch' in fileData && fileData.branch) {
      result.push({ ...fileData.branch, sourceFile: fileData.branch.sourceFile || meta.path });
    } else if ('branches' in fileData && Array.isArray(fileData.branches)) {
      fileData.branches.forEach((b) => {
        result.push({ ...b, sourceFile: b.sourceFile || meta.path });
      });
    }
  });
  return result;
}

export function extractRulersFromStore(
  manifest: SyncManifest,
  filesMap: Record<string, TimelineDataFile>,
): RulerPeriod[] {
  const rulersMeta = manifest.mountedFiles.find((m) => m.role === 'trunk' || m.fileId === 'rulers');
  if (!rulersMeta) return [];
  const fileData = filesMap[rulersMeta.path];
  if (isRulersFile(fileData)) {
    return fileData.rulers;
  }
  return [];
}

export function getEnrichedEvents(
  manifest: SyncManifest,
  filesMap: Record<string, TimelineDataFile>,
  rulers: RulerPeriod[],
): EnrichedEvent[] {
  const list: EnrichedEvent[] = [];
  let seq = 0;
  const macroEras = manifest.macroEras || [];

  manifest.mountedFiles.forEach((fileMeta) => {
    if (!fileMeta.enabled || fileMeta.role === 'trunk') return;
    const fileObj = filesMap[fileMeta.path];
    if (!isBranchFile(fileObj)) return;

    fileObj.nodes.forEach((ev) => {
      const parsed =
        typeof ev.startYear === 'number' && typeof ev.endYear === 'number'
          ? { startYear: ev.startYear, endYear: ev.endYear }
          : parseEventYears(ev.period || '1700', ev.id);

      const startYear = parsed.startYear;
      const endYear = Math.max(startYear, parsed.endYear);
      const duration = endYear - startYear;

      const overlappingRulers = rulers.filter((r) => r.startYear <= endYear && r.endYear >= startYear);
      if (overlappingRulers.length === 0 && rulers.length > 0) {
        overlappingRulers.push(rulers[0]);
      }

      let eraObj: MacroEra | undefined = macroEras[0];
      if (startYear >= 1991) eraObj = macroEras[3] || macroEras[macroEras.length - 1];
      else if (startYear >= 1917) eraObj = macroEras[2] || macroEras[macroEras.length - 1];
      else if (startYear >= 1801) eraObj = macroEras[1] || macroEras[macroEras.length - 1];

      list.push({
        ...ev,
        sourceFile: fileMeta.path,
        seq: seq++,
        startYear,
        endYear,
        duration,
        eraId: eraObj?.id || 'ERA_1',
        eraRoman: eraObj?.roman || 'I',
        eraTitle: eraObj?.title || '',
        overlappingRulers,
        ruler: overlappingRulers.map((r) => r.shortRuler).join(' → '),
        reignPeriod:
          overlappingRulers.length > 1
            ? `${overlappingRulers[0].startYear}–${overlappingRulers[overlappingRulers.length - 1].endYear} (${overlappingRulers.length} правл.)`
            : overlappingRulers[0]?.reignPeriod || '',
        concurrentEvents: [],
        explicitLinks: [],
      });
    });
  });

  list.sort((a, b) => {
    if (a.startYear !== b.startYear) return a.startYear - b.startYear;
    return a.seq - b.seq;
  });

  const byId = new Map(list.map((e) => [e.id, e]));
  const crossLinks = manifest.crossLinks || [];

  list.forEach((ev) => {
    ev.concurrentEvents = list.filter(
      (other) => other.id !== ev.id && other.startYear <= ev.endYear && other.endYear >= ev.startYear,
    );

    const links: ExplicitLinkInfo[] = [];
    crossLinks.forEach((lnk) => {
      if (lnk.from === ev.id || lnk.to === ev.id) {
        const isOutgoing = lnk.from === ev.id;
        const targetId = isOutgoing ? lnk.to : lnk.from;
        const targetEvent = byId.get(targetId);
        if (targetEvent) {
          links.push({
            ...lnk,
            direction: isOutgoing ? 'outgoing' : 'incoming',
            targetEvent,
          });
        }
      }
    });
    ev.explicitLinks = links;
  });

  return list;
}

export function getVisibleLanes(
  branches: BranchDefinition[],
  activeBranches: Record<string, boolean>,
  militaryBranchMode: MilitaryBranchMode,
): BranchDefinition[] {
  const list: BranchDefinition[] = [];
  branches.forEach((b) => {
    if (b.id === 'MAIN_RULERS') {
      if (activeBranches.MAIN_RULERS !== false) list.push(b);
    } else if (b.isMilitary) {
      if (militaryBranchMode === 'SPLIT' && activeBranches[b.id] !== false) {
        list.push(b);
      }
    } else if (activeBranches[b.id] !== false) {
      list.push(b);
    }
  });

  if (militaryBranchMode === 'UNIFIED' && activeBranches.MILITARY_ALL !== false) {
    const hasMilitary = branches.some((b) => b.isMilitary);
    if (hasMilitary) {
      const insertAt = list.length > 0 && list[0].id === 'MAIN_RULERS' ? 1 : 0;
      list.splice(insertAt, 0, UNIFIED_MILITARY_BRANCH);
    }
  }

  if (list.length === 0 && branches.length > 0) {
    list.push(branches[0]);
  }

  return list;
}

export function resolveEventBranch(
  ev: EnrichedEvent,
  branches: BranchDefinition[],
  militaryBranchMode: MilitaryBranchMode,
): BranchDefinition {
  const origBranch = branches.find((b) => b.id === ev.task);
  if (militaryBranchMode === 'UNIFIED' && origBranch?.isMilitary) {
    return UNIFIED_MILITARY_BRANCH;
  }
  return origBranch || branches[0] || UNIFIED_MILITARY_BRANCH;
}

export function isEventBranchActive(
  ev: EnrichedEvent,
  branches: BranchDefinition[],
  activeBranches: Record<string, boolean>,
  militaryBranchMode: MilitaryBranchMode,
): boolean {
  const origBranch = branches.find((b) => b.id === ev.task);
  if (militaryBranchMode === 'UNIFIED' && origBranch?.isMilitary) {
    return activeBranches.MILITARY_ALL !== false;
  }
  return activeBranches[ev.task] !== false;
}

export function intersectsTimeWindow(startYear: number, endYear: number, yearFrom: number, yearTo: number): boolean {
  return startYear <= yearTo && endYear >= yearFrom;
}

export function getEventRulerSegments(ev: EnrichedEvent): RulerSpanSegment[] {
  if (ev.overlappingRulers.length === 0) return [];
  const raw = ev.overlappingRulers.map((ruler) => {
    const overlapStart = Math.max(ev.startYear, ruler.startYear);
    const overlapEnd = Math.min(ev.endYear, ruler.endYear);
    const years = Math.max(1, overlapEnd - overlapStart);
    return { ruler, overlapStart, overlapEnd, years };
  });
  const totalYears = raw.reduce((acc, item) => acc + item.years, 0) || 1;
  return raw.map((item) => ({
    ...item,
    pct: (item.years / totalYears) * 100,
  }));
}

export function buildUnifiedTimelineStream(
  enrichedEvents: EnrichedEvent[],
  rulers: RulerPeriod[],
  manifest: SyncManifest,
  branches: BranchDefinition[],
  filters: FilterState,
): {
  stream: StreamRow[];
  matchingEvents: EnrichedEvent[];
  matchingRulers: RulerPeriod[];
  focusedEvent: EnrichedEvent | null;
  effectiveYearFrom: number;
  effectiveYearTo: number;
} {
  const q = filters.searchQuery.trim().toLowerCase();
  const focusTarget = filters.focusedEventId
    ? (enrichedEvents.find((ev) => ev.id === filters.focusedEventId) ?? null)
    : null;

  let matchingEvents: EnrichedEvent[] = [];
  let matchingRulers: RulerPeriod[] = [];
  let effectiveYearFrom = filters.yearFrom;
  let effectiveYearTo = filters.yearTo;

  const rulersFileMeta = manifest.mountedFiles.find((f) => f.role === 'trunk' || f.fileId === 'rulers');
  const isRulersFileMounted = rulersFileMeta ? rulersFileMeta.enabled : true;

  if (focusTarget) {
    const allowedIds = new Set<string>([focusTarget.id]);
    focusTarget.explicitLinks.forEach((lnk) => {
      allowedIds.add(lnk.targetEvent.id);
    });
    if (filters.focusScope === 'sync_and_concurrent') {
      focusTarget.concurrentEvents.forEach((ce) => {
        allowedIds.add(ce.id);
      });
    }

    matchingEvents = enrichedEvents.filter((ev) => allowedIds.has(ev.id));

    const touchedRulerIds = new Set<string>();
    matchingEvents.forEach((ev) => {
      ev.overlappingRulers.forEach((r) => touchedRulerIds.add(r.id));
    });

    matchingRulers = rulers.filter((r) => {
      if (!isRulersFileMounted || filters.activeBranches.MAIN_RULERS === false) return false;
      return touchedRulerIds.has(r.id);
    });

    const minEventYear = matchingEvents.reduce((m, e) => Math.min(m, e.startYear), focusTarget.startYear);
    const maxEventYear = matchingEvents.reduce((m, e) => Math.max(m, e.endYear), focusTarget.endYear);
    effectiveYearFrom = Math.max(1686, minEventYear);
    effectiveYearTo = Math.min(2000, Math.max(effectiveYearFrom + 1, maxEventYear));
  } else {
    matchingEvents = enrichedEvents.filter((ev) => {
      if (!isEventBranchActive(ev, branches, filters.activeBranches, filters.militaryBranchMode)) return false;
      if (!intersectsTimeWindow(ev.startYear, ev.endYear, filters.yearFrom, filters.yearTo)) return false;
      if (filters.selectedEra !== 'ALL' && ev.eraId !== filters.selectedEra) return false;
      if (filters.onlyWithSyncLinks && ev.explicitLinks.length === 0) return false;
      if (filters.selectedReign !== 'ALL') {
        const matchesRuler = ev.overlappingRulers.some((r) => r.id === filters.selectedReign);
        if (!matchesRuler) return false;
      }
      if (!q) return true;
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.subtitle.toLowerCase().includes(q) ||
        ev.details.toLowerCase().includes(q) ||
        ev.period.toLowerCase().includes(q) ||
        ev.ruler.toLowerCase().includes(q) ||
        ev.region.toLowerCase().includes(q) ||
        Boolean(ev.subEvents?.some((s) => s.title.toLowerCase().includes(q) || s.text.toLowerCase().includes(q)))
      );
    });

    matchingRulers = rulers.filter((r) => {
      if (!isRulersFileMounted || filters.activeBranches.MAIN_RULERS === false) return false;
      if (!intersectsTimeWindow(r.startYear, r.endYear, filters.yearFrom, filters.yearTo)) return false;
      if (filters.selectedEra !== 'ALL' && r.eraId !== filters.selectedEra) return false;
      if (filters.selectedReign !== 'ALL' && r.id !== filters.selectedReign) return false;
      if (!q && !filters.onlyWithSyncLinks) return true;
      const selfMatch = q !== '' && (r.ruler.toLowerCase().includes(q) || r.reignTitle.toLowerCase().includes(q));
      const hasMatchingEvent = matchingEvents.some((ev) => ev.overlappingRulers.some((or) => or.id === r.id));
      return selfMatch || hasMatchingEvent;
    });
  }

  const stream: StreamRow[] = [];
  const eraStartYears: Record<string, number> = { ERA_1: 1686, ERA_2: 1801, ERA_3: 1917, ERA_4: 1991 };

  manifest.macroEras.forEach((era) => {
    const y = eraStartYears[era.id] ?? 1686;
    const hasItemsInEra =
      matchingEvents.some((e) => e.eraId === era.id) || matchingRulers.some((r) => r.eraId === era.id);
    if (hasItemsInEra && y >= effectiveYearFrom && y <= effectiveYearTo) {
      stream.push({
        rowType: 'ERA_START',
        year: y,
        priority: 1,
        era,
      });
    }
  });

  matchingRulers.forEach((rulerObj) => {
    const displayYear = focusTarget ? rulerObj.startYear : Math.max(rulerObj.startYear, effectiveYearFrom);
    const startedBeforeWindow = !focusTarget && rulerObj.startYear < effectiveYearFrom;
    stream.push({
      rowType: 'RULER_COMMIT',
      year: displayYear,
      priority: 2,
      startedBeforeWindow,
      rulerObj,
    });
  });

  matchingEvents.forEach((eventObj) => {
    const displayYear = focusTarget ? eventObj.startYear : Math.max(eventObj.startYear, effectiveYearFrom);
    const startedBeforeWindow = !focusTarget && eventObj.startYear < effectiveYearFrom;
    stream.push({
      rowType: 'EVENT_COMMIT',
      year: displayYear,
      priority: 3,
      seq: eventObj.seq,
      startedBeforeWindow,
      eventObj,
    });

    if (
      filters.showEndNodes &&
      eventObj.duration >= 3 &&
      (focusTarget || eventObj.endYear <= effectiveYearTo) &&
      (eventObj.overlappingRulers.length > 1 || eventObj.duration >= 6)
    ) {
      stream.push({
        rowType: 'EVENT_END',
        year: eventObj.endYear,
        priority: 4,
        seq: eventObj.seq,
        eventObj,
      });
    }
  });

  stream.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.priority !== b.priority) return a.priority - b.priority;
    const seqA = 'seq' in a ? a.seq : 0;
    const seqB = 'seq' in b ? b.seq : 0;
    return seqA - seqB;
  });

  return {
    stream,
    matchingEvents,
    matchingRulers,
    focusedEvent: focusTarget,
    effectiveYearFrom,
    effectiveYearTo,
  };
}

export function downloadJsonFile(filename: string, data: unknown): void {
  const jsonText = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildRepoSyncScript(
  manifest: SyncManifest,
  filesMap: Record<string, TimelineDataFile>,
): string {
  const lines = [
    '#!/usr/bin/env node',
    '// Скрипт обновления всех модульных JSON-файлов ветвей в public/data/',
    'const fs = require("fs");',
    'fs.mkdirSync("public/data", { recursive: true });',
    `fs.writeFileSync("public/data/sync.manifest.json", ${JSON.stringify(JSON.stringify(manifest, null, 2))});`,
  ];
  Object.entries(filesMap).forEach(([filePath, content]) => {
    const targetPath = filePath.startsWith('public/') ? filePath : `public/${filePath.replace(/^\.?\//, '')}`;
    lines.push(`fs.writeFileSync(${JSON.stringify(targetPath)}, ${JSON.stringify(JSON.stringify(content, null, 2))});`);
  });
  lines.push('console.log("Файлы ветвей в public/data/ успешно обновлены!");');
  return lines.join('\n');
}
