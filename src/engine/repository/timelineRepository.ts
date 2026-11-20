import type {
  BranchDefinition,
  BranchFile,
  ModulesIndexFile,
  MountedFileMeta,
  RulerPeriod,
  RulersFile,
  SourceEntry,
  SourceEntryType,
  SyncManifest,
  TimelineDataFile,
  TimelineNode,
} from '../../types/timeline';
import { parseKeyFiguresList } from '../nlp/personExtractor';

export function getGitHash(idStr: string): string {
  let hash = 2166136261;
  for (let i = 0; i < idStr.length; i++) {
    hash ^= idStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(7, '0').slice(0, 7);
}

const FALLBACK_BRANCH_COLORS = [
  '#38bdf8',
  '#34d399',
  '#a78bfa',
  '#fb923c',
  '#f472b6',
  '#2dd4bf',
  '#60a5fa',
  '#facc15',
] as const;

export function pickFallbackBranchColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_BRANCH_COLORS[hash % FALLBACK_BRANCH_COLORS.length];
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export const SAFE_HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
export const SAFE_BADGE_CLASS_RE = /^[a-zA-Z0-9_\-\s/:.%]+$/;

export function sanitizeBranchDefinition(raw: unknown, fallbackPath: string): BranchDefinition | null {
  if (!isPlainRecord(raw)) return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  if (!id) return null;

  const rawLabel = typeof raw.label === 'string' ? raw.label.trim() : '';
  const rawShort = typeof raw.short === 'string' ? raw.short.trim() : '';
  const label = rawLabel || rawShort || id;
  const short = rawShort || id.toLowerCase();
  const gitName =
    typeof raw.gitName === 'string' && raw.gitName.trim()
      ? raw.gitName.trim()
      : `branch/${short.toLowerCase().replace(/\s+/g, '-')}`;
  const description = typeof raw.description === 'string' ? raw.description.trim() : '';
  const rawColor = typeof raw.color === 'string' ? raw.color.trim() : '';
  const color = SAFE_HEX_COLOR_RE.test(rawColor)
    ? rawColor
    : pickFallbackBranchColor(id);
  const rawBadgeClass = typeof raw.badgeClass === 'string' ? raw.badgeClass.trim() : '';
  const badgeClass =
    rawBadgeClass && SAFE_BADGE_CLASS_RE.test(rawBadgeClass)
      ? rawBadgeClass
      : 'text-slate-300 border-slate-500/40 bg-slate-500/10';
  const parentBranchId =
    typeof raw.parentBranchId === 'string' && raw.parentBranchId.trim() && raw.parentBranchId.trim() !== id
      ? raw.parentBranchId.trim()
      : undefined;

  const validCategory =
    raw.category === 'rulers' ||
    raw.category === 'military' ||
    raw.category === 'economy' ||
    raw.category === 'world' ||
    raw.category === 'other'
      ? raw.category
      : undefined;

  return {
    id,
    gitName,
    label,
    short,
    category: validCategory,
    sourceFile: typeof raw.sourceFile === 'string' && raw.sourceFile.trim() ? raw.sourceFile.trim() : fallbackPath,
    description,
    color,
    badgeClass,
    isMilitary: Boolean(raw.isMilitary),
    alwaysTrunk: raw.alwaysTrunk === true ? true : undefined,
    parentBranchId,
    isGroup: raw.isGroup === true ? true : undefined,
    defaultEnabled: raw.defaultEnabled === false ? false : raw.defaultEnabled === true ? true : undefined,
    defaultCollapsedOnTimeline: raw.defaultCollapsedOnTimeline === true ? true : undefined,
  };
}

const VALID_SOURCE_TYPES = new Set<SourceEntryType>([
  'primary',
  'document',
  'historiography',
  'reference',
]);

function sanitizeSourcesList(raw: unknown): SourceEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const result: SourceEntry[] = [];
  const seenCitations = new Set<string>();

  for (const item of raw) {
    if (!isPlainRecord(item)) continue;
    const rawType = typeof item.type === 'string' ? item.type.trim() : '';
    const citation = typeof item.citation === 'string' ? item.citation.trim() : '';
    if (!citation) continue;

    const dedupKey = citation.toLowerCase();
    if (seenCitations.has(dedupKey)) continue;
    seenCitations.add(dedupKey);

    const type: SourceEntryType = VALID_SOURCE_TYPES.has(rawType as SourceEntryType)
      ? (rawType as SourceEntryType)
      : 'historiography';
    const note =
      typeof item.note === 'string' && item.note.trim().length > 0 ? item.note.trim() : undefined;
    const rawUrl =
      typeof item.url === 'string' && /^https:\/\/\S+$/i.test(item.url.trim())
        ? item.url.trim()
        : undefined;

    result.push({
      type,
      citation,
      ...(note ? { note } : {}),
      ...(rawUrl ? { url: rawUrl } : {}),
    });
  }

  return result.length > 0 ? result : undefined;
}

export function sanitizeTimelineNode(raw: unknown, fallbackTask?: string): TimelineNode | null {
  if (!isPlainRecord(raw)) return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const rawTask = typeof raw.task === 'string' ? raw.task.trim() : '';
  const task = rawTask || fallbackTask || '';

  const hasPeriod = typeof raw.period === 'string' && raw.period.trim().length > 0;
  const hasStartYear = typeof raw.startYear === 'number' && Number.isFinite(raw.startYear);

  if (!id || !title || !task || (!hasPeriod && !hasStartYear)) {
    return null;
  }

  const period = hasPeriod
    ? (raw.period as string).trim()
    : typeof raw.endYear === 'number' && Number.isFinite(raw.endYear) && raw.endYear !== raw.startYear
      ? `${raw.startYear}–${raw.endYear}`
      : `${raw.startYear}`;

  const subEvents = Array.isArray(raw.subEvents)
    ? raw.subEvents
        .filter((se): se is Record<string, unknown> => isPlainRecord(se) && typeof se.title === 'string')
        .map((se) => {
          const cleanTitle = (se.title as string).trim();
          const textVal =
            typeof se.text === 'string' && se.text.trim()
              ? se.text.trim()
              : typeof se.description === 'string'
                ? se.description.trim()
                : '';
          let yearVal: number | string | undefined =
            typeof se.year === 'number' || (typeof se.year === 'string' && se.year.trim().length > 0)
              ? se.year
              : typeof se.dateLabel === 'string' && se.dateLabel.trim().length > 0
                ? se.dateLabel.trim()
                : undefined;

          if (yearVal === undefined) {
            const parenMatch = cleanTitle.match(/\(([^)]*\b\d{3,4}\b[^)]*)\)/);
            if (parenMatch) {
              yearVal = parenMatch[1].trim();
            } else {
              const yearMatch = cleanTitle.match(/\b(\d{3,4})\b/);
              if (yearMatch) {
                yearVal = Number(yearMatch[1]);
              } else if (hasStartYear) {
                yearVal = raw.startYear as number;
              }
            }
          }

          return {
            year: yearVal,
            dateLabel: typeof se.dateLabel === 'string' ? se.dateLabel : undefined,
            title: cleanTitle,
            text: textVal,
            description: typeof se.description === 'string' ? se.description : undefined,
          };
        })
    : undefined;

  const linksTo = Array.isArray(raw.linksTo)
    ? raw.linksTo
        .filter(
          (lnk): lnk is Record<string, unknown> =>
            isPlainRecord(lnk) && typeof lnk.targetId === 'string' && lnk.targetId.trim().length > 0,
        )
        .map((lnk) => ({
          targetId: (lnk.targetId as string).trim(),
          type: typeof lnk.type === 'string' ? lnk.type : 'sync_context',
          label: typeof lnk.label === 'string' ? lnk.label : 'Связанное событие',
        }))
    : undefined;

  const syncTags = Array.isArray(raw.syncTags)
    ? raw.syncTags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : undefined;

  const referenceTags = Array.isArray(raw.referenceTags)
    ? raw.referenceTags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : undefined;

  const prerequisites: string | string[] | undefined = Array.isArray(raw.prerequisites)
    ? raw.prerequisites
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim())
    : typeof raw.prerequisites === 'string' && raw.prerequisites.trim().length > 0
      ? raw.prerequisites.trim()
      : undefined;

  const outcome =
    typeof raw.outcome === 'string' && raw.outcome.trim().length > 0 ? raw.outcome.trim() : undefined;

  const keyFigures = parseKeyFiguresList(raw.keyFigures);

  const rawLit = isPlainRecord(raw.literaryProfile) ? raw.literaryProfile : null;
  const literaryProfile = rawLit
    ? {
        genre:
          typeof rawLit.genre === 'string' && rawLit.genre.trim().length > 0
            ? rawLit.genre.trim()
            : undefined,
        movement:
          typeof rawLit.movement === 'string' && rawLit.movement.trim().length > 0
            ? rawLit.movement.trim()
            : undefined,
        themes:
          typeof rawLit.themes === 'string' && rawLit.themes.trim().length > 0
            ? rawLit.themes.trim()
            : undefined,
        publicationFate:
          typeof rawLit.publicationFate === 'string' && rawLit.publicationFate.trim().length > 0
            ? rawLit.publicationFate.trim()
            : undefined,
        culturalImpact:
          typeof rawLit.culturalImpact === 'string' && rawLit.culturalImpact.trim().length > 0
            ? rawLit.culturalImpact.trim()
            : undefined,
        majorWorks: Array.isArray(rawLit.majorWorks)
          ? rawLit.majorWorks.filter((w): w is string => typeof w === 'string' && w.trim().length > 0)
          : undefined,
      }
    : undefined;

  return {
    id,
    startYear: hasStartYear ? (raw.startYear as number) : undefined,
    endYear: typeof raw.endYear === 'number' && Number.isFinite(raw.endYear) ? raw.endYear : undefined,
    activeFrom:
      typeof raw.activeFrom === 'number' && Number.isFinite(raw.activeFrom)
        ? Math.round(raw.activeFrom)
        : undefined,
    activeTo:
      typeof raw.activeTo === 'number' && Number.isFinite(raw.activeTo)
        ? Math.round(raw.activeTo)
        : undefined,
    startDate: typeof raw.startDate === 'string' ? raw.startDate.trim() : undefined,
    endDate: typeof raw.endDate === 'string' ? raw.endDate.trim() : undefined,
    calendarStyle:
      raw.calendarStyle === 'julian' || raw.calendarStyle === 'gregorian' || raw.calendarStyle === 'both'
        ? raw.calendarStyle
        : undefined,
    isAtomic: raw.isAtomic === true ? true : undefined,
    period,
    title,
    subtitle: typeof raw.subtitle === 'string' ? raw.subtitle : '',
    details: typeof raw.details === 'string' ? raw.details : '',
    prerequisites:
      Array.isArray(prerequisites) && prerequisites.length === 0 ? undefined : prerequisites,
    outcome,
    keyFigures,
    literaryProfile:
      literaryProfile &&
      (literaryProfile.genre ||
        literaryProfile.movement ||
        literaryProfile.themes ||
        literaryProfile.publicationFate ||
        literaryProfile.culturalImpact ||
        (literaryProfile.majorWorks && literaryProfile.majorWorks.length > 0))
        ? literaryProfile
        : undefined,
    eventType: typeof raw.eventType === 'string' ? raw.eventType : undefined,
    task,
    region: typeof raw.region === 'string' ? raw.region : '',
    type: typeof raw.type === 'string' ? raw.type : 'Событие',
    subEvents,
    linksTo,
    sources: sanitizeSourcesList(raw.sources),
    campaignId: typeof raw.campaignId === 'string' && raw.campaignId.trim() ? raw.campaignId.trim() : undefined,
    syncTags,
    referenceTags,
  };
}

const VALID_RULER_RELATION_TYPES = new Set([
  'ally',
  'opponent',
  'diplomacy',
  'family',
  'military',
]);

const VALID_RULER_KINSHIP_GROUPS = new Set<string>([
  'parent',
  'uncle_aunt',
  'spouse',
  'sibling',
  'child',
]);

export function sanitizeRulerPeriod(raw: unknown): RulerPeriod | null {
  if (!isPlainRecord(raw)) return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const startYear = typeof raw.startYear === 'number' && Number.isFinite(raw.startYear) ? raw.startYear : null;
  const endYear = typeof raw.endYear === 'number' && Number.isFinite(raw.endYear) ? raw.endYear : null;
  if (!id || startYear === null || endYear === null) return null;

  const ruler = typeof raw.ruler === 'string' && raw.ruler.trim() ? raw.ruler.trim() : id;
  const shortRuler =
    typeof raw.shortRuler === 'string' && raw.shortRuler.trim() ? raw.shortRuler.trim() : ruler;

  const lifeYears =
    typeof raw.lifeYears === 'string' && raw.lifeYears.trim() ? raw.lifeYears.trim() : undefined;
  const dynastyOrTitle =
    typeof raw.dynastyOrTitle === 'string' && raw.dynastyOrTitle.trim()
      ? raw.dynastyOrTitle.trim()
      : undefined;
  const biography =
    typeof raw.biography === 'string' && raw.biography.trim() ? raw.biography.trim() : undefined;
  const legacy =
    typeof raw.legacy === 'string' && raw.legacy.trim() ? raw.legacy.trim() : undefined;

  const keyActions = Array.isArray(raw.keyActions)
    ? raw.keyActions
        .filter((item): item is Record<string, unknown> => isPlainRecord(item))
        .map((item) => {
          const year = typeof item.year === 'string' ? item.year.trim() : String(item.year ?? '').trim();
          const title = typeof item.title === 'string' ? item.title.trim() : '';
          const summary = typeof item.summary === 'string' ? item.summary.trim() : '';
          const eventId =
            typeof item.eventId === 'string' && item.eventId.trim() ? item.eventId.trim() : undefined;
          if (!title || !summary) return null;
          return {
            year: year || `${startYear}`,
            title,
            summary,
            ...(eventId ? { eventId } : {}),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : undefined;

  const innerCircle = Array.isArray(raw.innerCircle)
    ? raw.innerCircle
        .filter((item): item is Record<string, unknown> => isPlainRecord(item))
        .map((item) => {
          const name = typeof item.name === 'string' ? item.name.trim() : '';
          const rawRel = typeof item.relationType === 'string' ? item.relationType.trim() : '';
          const relationType = VALID_RULER_RELATION_TYPES.has(rawRel)
            ? (rawRel as 'ally' | 'opponent' | 'diplomacy' | 'family' | 'military')
            : 'ally';
          const role = typeof item.role === 'string' ? item.role.trim() : '';
          const connection = typeof item.connection === 'string' ? item.connection.trim() : '';
          if (!name || !connection) return null;
          return {
            name,
            relationType,
            role: role || 'Деятель правления',
            connection,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : undefined;

  const family = Array.isArray(raw.family)
    ? raw.family
        .filter((item): item is Record<string, unknown> => isPlainRecord(item))
        .map((item) => {
          const name = typeof item.name === 'string' ? item.name.trim() : '';
          const relation = typeof item.relation === 'string' ? item.relation.trim() : '';
          const rawGroup = typeof item.group === 'string' ? item.group.trim() : '';
          if (!name || !relation || !VALID_RULER_KINSHIP_GROUPS.has(rawGroup)) return null;
          const rawRulerId =
            typeof item.rulerId === 'string' && item.rulerId.trim() ? item.rulerId.trim() : undefined;
          const rulerId = rawRulerId && rawRulerId !== id ? rawRulerId : undefined;
          const personKey =
            typeof item.personKey === 'string' && item.personKey.trim()
              ? item.personKey.trim()
              : undefined;
          const relLifeYears =
            typeof item.lifeYears === 'string' && item.lifeYears.trim()
              ? item.lifeYears.trim()
              : undefined;
          const title =
            typeof item.title === 'string' && item.title.trim() ? item.title.trim() : undefined;
          const note =
            typeof item.note === 'string' && item.note.trim() ? item.note.trim() : undefined;
          return {
            name,
            relation,
            group: rawGroup as 'parent' | 'uncle_aunt' | 'spouse' | 'sibling' | 'child',
            ...(rulerId ? { rulerId } : {}),
            ...(personKey ? { personKey } : {}),
            ...(relLifeYears ? { lifeYears: relLifeYears } : {}),
            ...(title ? { title } : {}),
            ...(note ? { note } : {}),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : undefined;

  return {
    id,
    eraId: typeof raw.eraId === 'string' && raw.eraId.trim() ? raw.eraId.trim() : 'ERA_1',
    center: typeof raw.center === 'string' && raw.center.trim() ? raw.center.trim() : undefined,
    ruler,
    shortRuler,
    ...(lifeYears ? { lifeYears } : {}),
    ...(dynastyOrTitle ? { dynastyOrTitle } : {}),
    reignPeriod:
      typeof raw.reignPeriod === 'string' && raw.reignPeriod.trim()
        ? raw.reignPeriod.trim()
        : `${startYear}–${Math.max(startYear, endYear)}`,
    startYear,
    endYear: Math.max(startYear, endYear),
    startDate: typeof raw.startDate === 'string' ? raw.startDate.trim() : undefined,
    endDate: typeof raw.endDate === 'string' ? raw.endDate.trim() : undefined,
    calendarStyle:
      raw.calendarStyle === 'julian' || raw.calendarStyle === 'gregorian' || raw.calendarStyle === 'both'
        ? raw.calendarStyle
        : undefined,
    reignTitle: typeof raw.reignTitle === 'string' ? raw.reignTitle : ruler,
    reignThesis: typeof raw.reignThesis === 'string' ? raw.reignThesis : '',
    ...(biography ? { biography } : {}),
    ...(keyActions && keyActions.length > 0 ? { keyActions } : {}),
    ...(innerCircle && innerCircle.length > 0 ? { innerCircle } : {}),
    ...(family && family.length > 0 ? { family } : {}),
    ...(legacy ? { legacy } : {}),
    sources: sanitizeSourcesList(raw.sources),
  };
}

export function isRulersFile(file: TimelineDataFile | undefined): file is RulersFile {
  return Boolean(file && isPlainRecord(file) && 'rulers' in file && Array.isArray(file.rulers));
}

export function isBranchFile(file: TimelineDataFile | undefined): file is BranchFile {
  return Boolean(file && isPlainRecord(file) && 'nodes' in file && Array.isArray(file.nodes));
}

const DATA_SCHEMA_CACHE_KEY = '2.1.0';

const CORE_INITIAL_MODULE_PATHS = new Set<string>([
  'data/rulers.json',
  'data/wars.json',
  'data/economics.json',
  'data/diplomacy.json',
  'data/writers_bio.json',
  'data/writers_works.json',
]);

function normalizeDataPath(rawPath: string): string {
  return rawPath.trim().replace(/^(?:\.\/|\/)+/, '');
}

function resolveRepoFetchUrl(rawPath: string): string {
  return `./${normalizeDataPath(rawPath)}`;
}

export function buildVersionedDataUrl(rawPath: string, versionOrHash?: string, isContentHash = false): string {
  const url = resolveRepoFetchUrl(rawPath);
  const cleanToken = (versionOrHash || DATA_SCHEMA_CACHE_KEY).trim();
  const separator = url.includes('?') ? '&' : '?';
  const paramName = isContentHash ? 'h' : 'v';
  return `${url}${separator}${paramName}=${encodeURIComponent(cleanToken)}`;
}

export function collectBranchesFromDataFile(fileData: TimelineDataFile, fallbackPath: string): BranchDefinition[] {
  const result: BranchDefinition[] = [];
  if (!isPlainRecord(fileData)) return result;
  const pathHint =
    typeof fileData.path === 'string' && fileData.path.trim()
      ? normalizeDataPath(fileData.path)
      : normalizeDataPath(fallbackPath);

  if ('branch' in fileData && fileData.branch) {
    const parsed = sanitizeBranchDefinition(fileData.branch, pathHint);
    if (parsed) result.push(parsed);
  }
  if ('branches' in fileData && Array.isArray(fileData.branches)) {
    fileData.branches.forEach((b) => {
      const parsed = sanitizeBranchDefinition(b, pathHint);
      if (parsed) result.push(parsed);
    });
  }
  return result;
}

export interface TimelineRepositorySnapshot {
  manifest: SyncManifest;
  files: Record<string, TimelineDataFile>;
  isFullyHydrated?: boolean;
}

interface RepositoryBootstrapState {
  manifest: SyncManifest;
  manifestMetaByNormPath: Map<string, MountedFileMeta>;
  orderedCandidatePaths: string[];
  fileHashes: Record<string, string>;
  fallbackVersion: string;
}

let cachedRepositorySnapshot: TimelineRepositorySnapshot | null = null;
let inFlightRepositoryPromise: Promise<TimelineRepositorySnapshot> | null = null;
let cachedBootstrapState: RepositoryBootstrapState | null = null;
let inFlightHydrationPromise: Promise<TimelineRepositorySnapshot> | null = null;

export function clearTimelineRepositoryCache(): void {
  cachedRepositorySnapshot = null;
  inFlightRepositoryPromise = null;
  cachedBootstrapState = null;
  inFlightHydrationPromise = null;
}

async function fetchDataModuleFile(
  normPath: string,
  fileHashes: Record<string, string>,
  fallbackVersion: string,
): Promise<{ normPath: string; data: TimelineDataFile | null }> {
  try {
    const contentHash = fileHashes[normPath];
    const moduleUrl = buildVersionedDataUrl(normPath, contentHash || fallbackVersion, Boolean(contentHash));
    const res = await fetch(moduleUrl, { cache: contentHash ? 'force-cache' : 'no-cache' });
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || ct.includes('text/html')) {
      return { normPath, data: null };
    }
    const parsed = (await res.json()) as unknown;
    if (!isPlainRecord(parsed) || (!Array.isArray(parsed.nodes) && !Array.isArray(parsed.rulers))) {
      return { normPath, data: null };
    }
    return { normPath, data: parsed as unknown as TimelineDataFile };
  } catch {
    return { normPath, data: null };
  }
}

function buildSnapshotFromFiles(
  bootstrap: RepositoryBootstrapState,
  files: Record<string, TimelineDataFile>,
  isFullyHydrated: boolean,
): TimelineRepositorySnapshot {
  const resolvedMountedFiles: MountedFileMeta[] = [];

  bootstrap.orderedCandidatePaths.forEach((normPath) => {
    const existingMeta = bootstrap.manifestMetaByNormPath.get(normPath);
    const data = files[normPath] ?? (existingMeta?.path ? files[existingMeta.path] : undefined);

    if (!data) {
      if (existingMeta) {
        resolvedMountedFiles.push(existingMeta);
      }
      return;
    }

    const rawDataPath = typeof data.path === 'string' && data.path.trim() ? normalizeDataPath(data.path) : '';
    const storeKey = existingMeta?.path || rawDataPath || normPath;
    if (!files[storeKey]) {
      files[storeKey] = data;
    }

    const declaredBranches = collectBranchesFromDataFile(data, storeKey);
    const branchIds = declaredBranches.map((b) => b.id);
    const inferredRole: MountedFileMeta['role'] = isRulersFile(data)
      ? 'rulers_branch'
      : declaredBranches.some((b) => b.isMilitary)
        ? 'military_branches'
        : 'thematic_branch';

    const isFileEnabled =
      data.enabled === false
        ? false
        : existingMeta
          ? existingMeta.enabled !== false
          : true;

    resolvedMountedFiles.push({
      fileId: existingMeta?.fileId || (typeof data.fileId === 'string' && data.fileId) || normPath,
      path: storeKey,
      role: existingMeta?.role || inferredRole,
      branchIds: existingMeta?.branchIds?.length ? existingMeta.branchIds : branchIds,
      title: existingMeta?.title || declaredBranches[0]?.label || storeKey,
      enabled: isFileEnabled,
    });
  });

  return {
    manifest: {
      ...bootstrap.manifest,
      mountedFiles: resolvedMountedFiles,
    },
    files,
    isFullyHydrated,
  };
}

async function loadRepositoryBootstrap(): Promise<RepositoryBootstrapState> {
  const manifestUrl = resolveRepoFetchUrl('data/sync.manifest.json');
  const manifestRes = await fetch(manifestUrl, { cache: 'no-cache' });
  if (!manifestRes.ok) {
    throw new Error(`Не удалось загрузить каталог хронографа (HTTP ${manifestRes.status})`);
  }
  const rawManifest = (await manifestRes.json()) as Partial<SyncManifest>;
  const cacheVersion = (rawManifest.schemaVersion || DATA_SCHEMA_CACHE_KEY).trim();
  const manifest: SyncManifest = {
    project: rawManifest.project || 'Исторический хронограф',
    schemaVersion: cacheVersion,
    timeAxis: rawManifest.timeAxis || {
      minYear: 862,
      maxYear: 2000,
      resolution: 'adaptive_year_month_day',
      overlapRule: 'inclusive_interval',
    },
    mountedFiles: Array.isArray(rawManifest.mountedFiles)
      ? rawManifest.mountedFiles.map((m) => ({
          ...m,
          path: m?.path ? normalizeDataPath(m.path) : m.path,
        }))
      : [],
    macroEras: Array.isArray(rawManifest.macroEras) ? rawManifest.macroEras : [],
    crossLinks: Array.isArray(rawManifest.crossLinks) ? rawManifest.crossLinks : [],
  };

  let hasDiscoveredIndex = false;
  let discoveredPaths: string[] = [];
  let fileHashes: Record<string, string> = {};
  let indexVersion = cacheVersion;

  try {
    const indexUrl = resolveRepoFetchUrl('data/modules.index.json');
    const indexRes = await fetch(indexUrl, { cache: 'no-cache' });
    const ct = indexRes.headers.get('content-type') || '';
    if (indexRes.ok && !ct.includes('text/html')) {
      const idxData = (await indexRes.json()) as ModulesIndexFile;
      if (Array.isArray(idxData?.files)) {
        hasDiscoveredIndex = true;
        discoveredPaths = idxData.files.map(normalizeDataPath).filter(Boolean);
      }
      if (idxData?.fileHashes && isPlainRecord(idxData.fileHashes)) {
        Object.entries(idxData.fileHashes).forEach(([rawKey, val]) => {
          if (typeof val === 'string' && val.trim()) {
            fileHashes[normalizeDataPath(rawKey)] = val.trim();
          }
        });
      }
      if (typeof idxData?.generatedAt === 'string' && idxData.generatedAt.trim()) {
        indexVersion = idxData.generatedAt.trim();
      }
    }
  } catch {
    // Фоллбек на явный список из sync.manifest.json
  }

  const manifestMetaByNormPath = new Map<string, MountedFileMeta>();
  manifest.mountedFiles.forEach((meta) => {
    if (meta?.path) {
      manifestMetaByNormPath.set(normalizeDataPath(meta.path), meta);
    }
  });

  const discoveredSet = new Set(discoveredPaths);
  const orderedCandidatePaths: string[] = [];
  const seenPaths = new Set<string>();

  if (hasDiscoveredIndex) {
    manifest.mountedFiles.forEach((meta) => {
      if (!meta?.path) return;
      const norm = normalizeDataPath(meta.path);
      if (norm && discoveredSet.has(norm) && !seenPaths.has(norm)) {
        seenPaths.add(norm);
        orderedCandidatePaths.push(norm);
      }
    });

    discoveredPaths.forEach((norm) => {
      if (norm && !seenPaths.has(norm)) {
        seenPaths.add(norm);
        orderedCandidatePaths.push(norm);
      }
    });
  } else {
    manifest.mountedFiles.forEach((meta) => {
      if (!meta?.path) return;
      const norm = normalizeDataPath(meta.path);
      if (norm && !seenPaths.has(norm)) {
        seenPaths.add(norm);
        orderedCandidatePaths.push(norm);
      }
    });
  }

  return {
    manifest,
    manifestMetaByNormPath,
    orderedCandidatePaths,
    fileHashes,
    fallbackVersion: indexVersion,
  };
}

function selectInitialModulePaths(
  bootstrap: RepositoryBootstrapState,
  progressive: boolean,
  requiredBranchIds?: Set<string>,
): string[] {
  if (!progressive) {
    return bootstrap.orderedCandidatePaths;
  }

  const initialPaths = bootstrap.orderedCandidatePaths.filter((normPath) => {
    if (CORE_INITIAL_MODULE_PATHS.has(normPath)) return true;
    if (requiredBranchIds && requiredBranchIds.size > 0) {
      const meta = bootstrap.manifestMetaByNormPath.get(normPath);
      if (meta?.branchIds?.some((id) => requiredBranchIds.has(id))) {
        return true;
      }
    }
    return false;
  });

  return initialPaths.length > 0 ? initialPaths : bootstrap.orderedCandidatePaths;
}

export async function hydrateRemainingTimelineModules(): Promise<TimelineRepositorySnapshot | null> {
  if (!cachedBootstrapState || !cachedRepositorySnapshot) {
    return cachedRepositorySnapshot;
  }
  if (cachedRepositorySnapshot.isFullyHydrated) {
    return cachedRepositorySnapshot;
  }
  if (inFlightHydrationPromise) {
    return inFlightHydrationPromise;
  }

  const bootstrap = cachedBootstrapState;
  const existingFiles = cachedRepositorySnapshot.files;
  const remainingPaths = bootstrap.orderedCandidatePaths.filter((normPath) => !existingFiles[normPath]);

  if (remainingPaths.length === 0) {
    cachedRepositorySnapshot = {
      ...cachedRepositorySnapshot,
      isFullyHydrated: true,
    };
    return cachedRepositorySnapshot;
  }

  inFlightHydrationPromise = Promise.all(
    remainingPaths.map((normPath) =>
      fetchDataModuleFile(normPath, bootstrap.fileHashes, bootstrap.fallbackVersion),
    ),
  )
    .then((fetchedEntries) => {
      const mergedFiles: Record<string, TimelineDataFile> = { ...existingFiles };
      fetchedEntries.forEach(({ normPath, data }) => {
        if (!data) return;
        const existingMeta = bootstrap.manifestMetaByNormPath.get(normPath);
        const rawDataPath = typeof data.path === 'string' && data.path.trim() ? normalizeDataPath(data.path) : '';
        const storeKey = existingMeta?.path || rawDataPath || normPath;
        mergedFiles[storeKey] = data;
      });
      const fullSnapshot = buildSnapshotFromFiles(bootstrap, mergedFiles, true);
      cachedRepositorySnapshot = fullSnapshot;
      inFlightHydrationPromise = null;
      return fullSnapshot;
    })
    .catch((err) => {
      inFlightHydrationPromise = null;
      throw err;
    });

  return inFlightHydrationPromise;
}

export async function fetchTimelineRepository(options?: {
  forceRefresh?: boolean;
  progressive?: boolean;
  requiredBranchIds?: string[];
}): Promise<TimelineRepositorySnapshot> {
  if (options?.forceRefresh) {
    clearTimelineRepositoryCache();
  }
  if (cachedRepositorySnapshot && (!options?.progressive || cachedRepositorySnapshot.isFullyHydrated)) {
    return cachedRepositorySnapshot;
  }
  if (cachedRepositorySnapshot && options?.progressive) {
    return cachedRepositorySnapshot;
  }
  if (inFlightRepositoryPromise) {
    return inFlightRepositoryPromise;
  }

  const progressive = Boolean(options?.progressive);
  const requiredSet = options?.requiredBranchIds ? new Set(options.requiredBranchIds) : undefined;

  inFlightRepositoryPromise = (async () => {
    const bootstrap = await loadRepositoryBootstrap();
    cachedBootstrapState = bootstrap;

    const initialPaths = selectInitialModulePaths(bootstrap, progressive, requiredSet);
    const fetchedEntries = await Promise.all(
      initialPaths.map((normPath) =>
        fetchDataModuleFile(normPath, bootstrap.fileHashes, bootstrap.fallbackVersion),
      ),
    );

    const files: Record<string, TimelineDataFile> = {};
    fetchedEntries.forEach(({ normPath, data }) => {
      if (!data) return;
      const existingMeta = bootstrap.manifestMetaByNormPath.get(normPath);
      const rawDataPath = typeof data.path === 'string' && data.path.trim() ? normalizeDataPath(data.path) : '';
      const storeKey = existingMeta?.path || rawDataPath || normPath;
      files[storeKey] = data;
    });

    const isFullyHydrated = initialPaths.length >= bootstrap.orderedCandidatePaths.length;
    const snapshot = buildSnapshotFromFiles(bootstrap, files, isFullyHydrated);
    cachedRepositorySnapshot = snapshot;
    inFlightRepositoryPromise = null;
    return snapshot;
  })().catch((err) => {
    inFlightRepositoryPromise = null;
    throw err;
  });

  return inFlightRepositoryPromise;
}

export function extractBranchesFromStore(
  manifest: SyncManifest,
  filesMap: Record<string, TimelineDataFile>,
): BranchDefinition[] {
  const result: BranchDefinition[] = [];
  const seenIds = new Set<string>();

  manifest.mountedFiles.forEach((meta) => {
    if (!meta.enabled) return;
    const fileData = filesMap[meta.path];
    if (!fileData) return;

    collectBranchesFromDataFile(fileData, meta.path).forEach((branch) => {
      if (!seenIds.has(branch.id)) {
        seenIds.add(branch.id);
        result.push(branch);
      }
    });
  });

  manifest.mountedFiles.forEach((meta) => {
    if (
      !meta.enabled ||
      meta.role === 'trunk' ||
      meta.role === 'rulers_branch' ||
      meta.fileId === 'rulers'
    ) {
      return;
    }
    const fileData = filesMap[meta.path];
    if (!isBranchFile(fileData)) return;

    const fallbackBranchId = collectBranchesFromDataFile(fileData, meta.path).find((b) => !b.isGroup)?.id;

    fileData.nodes.forEach((rawNode) => {
      const node = sanitizeTimelineNode(rawNode, fallbackBranchId);
      if (!node || seenIds.has(node.task)) return;

      seenIds.add(node.task);
      result.push({
        id: node.task,
        gitName: `theme/${node.task.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}`,
        label: node.task,
        short: node.task.toLowerCase(),
        category: 'other',
        sourceFile: meta.path,
        description: `Тематическая линия для событий раздела «${node.task}»`,
        color: pickFallbackBranchColor(node.task),
        badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
        isMilitary: false,
      });
    });
  });

  return result;
}

export function extractRulersFromStore(
  manifest: SyncManifest,
  filesMap: Record<string, TimelineDataFile>,
): RulerPeriod[] {
  const rulersMeta = manifest.mountedFiles.find(
    (m) => m.role === 'trunk' || m.role === 'rulers_branch' || m.fileId === 'rulers',
  );
  if (!rulersMeta || !rulersMeta.enabled) return [];
  const fileData = filesMap[rulersMeta.path];
  if (!isRulersFile(fileData)) return [];

  return fileData.rulers
    .map((raw) => sanitizeRulerPeriod(raw))
    .filter((r): r is RulerPeriod => r !== null);
}
