export type AxisResolution = 'year' | 'month' | 'day';

export interface PreciseDateParts {
  year: number;
  month?: number;
  day?: number;
  precision: AxisResolution;
  sortKey: number;
}

export type BranchCategoryKey = 'rulers' | 'military' | 'economy' | 'world' | 'other';

export type BranchPresetId =
  | 'overview'
  | 'all'
  | 'rulers_wars'
  | 'culture_science'
  | 'eco_world'
  | 'rulers_only';

export interface BranchDefinition {
  id: string;
  gitName: string;
  label: string;
  short: string;
  category?: BranchCategoryKey;
  sourceFile?: string;
  description: string;
  color: string;
  badgeClass: string;
  isMilitary: boolean;
  alwaysTrunk?: boolean;
  isTimeAxis?: boolean;
  parentBranchId?: string;
  isGroup?: boolean;
  defaultEnabled?: boolean;
  defaultCollapsedOnTimeline?: boolean;
}

export interface MacroEra {
  id: string;
  roman?: string;
  period: string;
  startYear?: number;
  endYear?: number;
  shortTitle?: string;
  title: string;
  thesis: string;
}

export interface ResolvedMacroEra extends MacroEra {
  index: number;
  startYear: number;
  endYear: number;
  displayShortTitle: string;
}

export interface RulerPeriod {
  id: string;
  eraId: string;
  center?: string;
  ruler: string;
  shortRuler: string;
  reignPeriod: string;
  startYear: number;
  endYear: number;
  startDate?: string;
  endDate?: string;
  reignTitle: string;
  reignThesis: string;
}

export interface SubEvent {
  year?: number | string;
  dateLabel?: string;
  title: string;
  text: string;
  description?: string;
}

export interface InlineNodeLink {
  targetId: string;
  type?:
    | 'triggers'
    | 'sync_context'
    | 'enables'
    | 'references'
    | 'about_event'
    | 'inspired_by'
    | 'causes'
    | 'consequence'
    | string;
  label: string;
}

export interface LiteraryProfile {
  genre?: string;
  movement?: string;
  themes?: string;
  publicationFate?: string;
  culturalImpact?: string;
  majorWorks?: string[];
}

export interface TimelineNode {
  id: string;
  startYear?: number;
  endYear?: number;
  startDate?: string;
  endDate?: string;
  isAtomic?: boolean;
  period: string;
  title: string;
  subtitle: string;
  details: string;
  task: string;
  region: string;
  type: string;
  eventType?: string;
  outcome?: string;
  keyFigures?: string[];
  literaryProfile?: LiteraryProfile;
  subEvents?: SubEvent[];
  linksTo?: InlineNodeLink[];
  campaignId?: string;
  syncTags?: string[];
  referenceTags?: string[];
}

export interface CrossLink {
  id: string;
  from: string;
  to: string;
  type:
    | 'triggers'
    | 'sync_context'
    | 'enables'
    | 'references'
    | 'about_event'
    | 'inspired_by'
    | 'causes'
    | 'consequence'
    | string;
  label: string;
}

export interface MountedFileMeta {
  fileId: string;
  path: string;
  role: 'trunk' | 'military_branches' | 'thematic_branch' | 'rulers_branch' | string;
  branchIds: string[];
  title: string;
  enabled: boolean;
}

export interface ModulesIndexFile {
  generatedAt?: string;
  files: string[];
}

export interface SyncManifest {
  $schema?: string;
  project: string;
  schemaVersion: string;
  timeAxis: {
    minYear: number;
    maxYear: number;
    resolution: string;
    overlapRule: string;
  };
  mountedFiles: MountedFileMeta[];
  macroEras: MacroEra[];
  crossLinks: CrossLink[];
}

export interface RulersFile {
  $schema?: string;
  fileId: string;
  path: string;
  version: string;
  enabled?: boolean;
  branch: BranchDefinition;
  rulers: RulerPeriod[];
}

export interface BranchFile {
  $schema?: string;
  fileId: string;
  path: string;
  version?: string;
  enabled?: boolean;
  branch?: BranchDefinition;
  branches?: BranchDefinition[];
  nodes: TimelineNode[];
  crossLinks?: CrossLink[];
}

export type TimelineDataFile = RulersFile | BranchFile;

export interface ExplicitLinkInfo extends CrossLink {
  direction: 'outgoing' | 'incoming';
  otherId: string;
  targetEvent: EnrichedEvent;
  isAutoSync?: boolean;
  syncTag?: string;
  isRetrospective?: boolean;
  yearGap?: number;
}

export interface RetrospectiveLinkInfo {
  id: string;
  otherId: string;
  direction: 'depicts' | 'depicted_by';
  label: string;
  yearGap: number;
}

export interface EnrichedEvent extends TimelineNode {
  sourceFile: string;
  seq: number;
  startYear: number;
  endYear: number;
  startPrecision: PreciseDateParts;
  endPrecision: PreciseDateParts;
  datePrecision?: AxisResolution;
  isAtomic: boolean;
  duration: number;
  eraId: string;
  eraRoman: string;
  eraTitle: string;
  overlappingRulers: RulerPeriod[];
  ruler: string;
  reignPeriod: string;
  concurrentEvents: EnrichedEvent[];
  explicitLinks: ExplicitLinkInfo[];
  retrospectiveLinks: RetrospectiveLinkInfo[];
}

export interface PersonDossier {
  key: string;
  displayName: string;
  variants: string[];
  events: EnrichedEvent[];
  eventIds: Set<string>;
  bioCard: EnrichedEvent | null;
  rulers: RulerPeriod[];
  yearRange: { min: number; max: number };
  branchCounts: Record<string, number>;
}

export interface RulerParticipantEntry {
  personKey: string;
  displayName: string;
  reignEventCount: number;
  totalEventCount: number;
  firstYearInReign: number;
  branchIds: string[];
  bioCardId: string | null;
}

export type StreamRow =
  | {
      rowType: 'ERA_START';
      year: number;
      sortKey: number;
      priority: number;
      era: MacroEra;
    }
  | {
      rowType: 'TIME_TICK';
      year: number;
      month?: number;
      day?: number;
      label: string;
      sortKey: number;
      priority: number;
    }
  | {
      rowType: 'RULER_COMMIT';
      year: number;
      sortKey: number;
      dateLabel: string;
      priority: number;
      startedBeforeWindow: boolean;
      rulerIndex: number;
      rulerColor: string;
      rulerObj: RulerPeriod;
    }
  | {
      rowType: 'RULER_END';
      year: number;
      sortKey: number;
      dateLabel: string;
      priority: number;
      rulerIndex: number;
      rulerColor: string;
      rulerObj: RulerPeriod;
    }
  | {
      rowType: 'EVENT_COMMIT';
      year: number;
      sortKey: number;
      dateLabel: string;
      priority: number;
      seq: number;
      startedBeforeWindow: boolean;
      isAtomicInView: boolean;
      eventObj: EnrichedEvent;
    }
  | {
      rowType: 'EVENT_END';
      year: number;
      sortKey: number;
      dateLabel: string;
      priority: number;
      seq: number;
      eventObj: EnrichedEvent;
    };

export type CardDensity = 'detailed' | 'compact';

export type FocusScope = 'sync_only' | 'sync_and_concurrent';

export interface RulerSpanSegment {
  ruler: RulerPeriod;
  overlapStart: number;
  overlapEnd: number;
  years: number;
  pct: number;
}

export interface FilterState {
  activeBranches: Record<string, boolean>;
  yearFrom: number;
  yearTo: number;
  selectedEra: string;
  selectedReign: string;
  searchQuery: string;
  selectedPersonKey?: string | null;
  selectedPersonEventIds?: Set<string> | null;
  onlyWithSyncLinks: boolean;
  focusedEventId: string | null;
  focusScope: FocusScope;
  showEndNodes: boolean;
  showOverlapMatrix: boolean;
}

export interface OverlapYearBucket {
  year: number;
  count: number;
  isPeak: boolean;
}

export interface OverlapPeakInterval {
  fromYear: number;
  toYear: number;
  maxCount: number;
}

export interface RulerBoundaryTick {
  year: number;
  rulerId: string;
  shortRuler: string;
  reignPeriod: string;
}

export interface OverlapAnalyticsSummary {
  yearFrom: number;
  yearTo: number;
  maxConcurrency: number;
  peakIntervals: OverlapPeakInterval[];
  primaryPeak: OverlapPeakInterval | null;
  yearBuckets: OverlapYearBucket[];
  rulerBoundaries: RulerBoundaryTick[];
  multiReignCount: number;
  totalEventsCount: number;
  activeLanesCount: number;
}

export interface DensityBin {
  startYear: number;
  endYear: number;
  totalCount: number;
  commitCount: number;
}

export interface YearRangeStep {
  from: number;
  to: number;
}

export interface BranchLaneLayout {
  branchId: string;
  baseX: number;
  subLaneCount: number;
  subXs: number[];
}

export interface BranchSubLaneLayout {
  slotByEventId: Map<string, number>;
  branchLayouts: Map<string, BranchLaneLayout>;
  totalSvgWidth: number;
}

export interface RulerSubLaneLayout {
  slotByRulerId: Map<string, number>;
  colorByRulerId: Map<string, string>;
  laneCount: number;
  railXs: number[];
  timeSpineX: number;
}

export interface DynamicWindowHotspot {
  id: string;
  fromYear: number;
  toYear: number;
  peakCount: number;
  eventCount: number;
  resolution: AxisResolution;
  previewTitles: string[];
}

export interface AboutWorkEntry {
  work: EnrichedEvent;
  relationLabel: string;
  yearGap: number;
}

export interface ModalHistoryItem {
  type: 'card' | 'ruler' | 'era' | 'person';
  kind?: 'card' | 'ruler' | 'era' | 'person';
  id: string;
  label: string;
}
