export type AxisResolution = 'year' | 'month' | 'day';

export type CalendarStyle = 'julian' | 'gregorian' | 'both';

export interface DateCalendarParts {
  year: number;
  month?: number;
  day?: number;
  precision: AxisResolution;
  sortKey: number;
}

export interface PreciseDateParts extends DateCalendarParts {
  calendarStyle: CalendarStyle;
  original: DateCalendarParts;
  unified: DateCalendarParts;
  julianParts?: DateCalendarParts;
  gregorianParts?: DateCalendarParts;
  offsetDays: number;
  hasStyleSplit: boolean;
}

export type BranchCategoryKey = 'rulers' | 'military' | 'economy' | 'world' | 'other';

export type BranchPresetId =
  | 'overview'
  | 'all'
  | 'none'
  | 'rulers_wars'
  | 'culture_science'
  | 'eco_world'
  | 'rulers_only';

export type DetailScope = 'core' | 'campaign';

export type ModuleLoadPolicy = 'eager' | 'background' | 'on_demand';

export interface CampaignPackMeta {
  id: string;
  title: string;
  shortTitle?: string;
  description: string;
  parentEventId?: string;
  yearFrom: number;
  yearTo: number;
  groupBranchId?: string;
}

export interface CampaignPackBranchSummary {
  id: string;
  label: string;
  short: string;
  color: string;
  description: string;
  eventCount: number;
}

export interface CampaignPackRegistryEntry extends CampaignPackMeta {
  filePaths: string[];
  branchIds: string[];
  eventCount: number;
  branches: CampaignPackBranchSummary[];
}

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
  detailScope?: DetailScope;
  campaignPackId?: string;
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

export type SourceEntryType = 'primary' | 'document' | 'historiography' | 'reference';

export interface SourceEntry {
  type: SourceEntryType;
  citation: string;
  note?: string;
  url?: string;
}

export type RulerRelationType =
  | 'ally'
  | 'opponent'
  | 'diplomacy'
  | 'family'
  | 'military';

export interface RulerKeyAction {
  year: string;
  title: string;
  summary: string;
  eventId?: string;
}

export interface RulerInnerCircleMember {
  name: string;
  relationType: RulerRelationType;
  role: string;
  connection: string;
}

export type RulerKinshipGroup = 'parent' | 'uncle_aunt' | 'spouse' | 'sibling' | 'child';

export interface RulerRelative {
  name: string;
  relation: string;
  group: RulerKinshipGroup;
  rulerId?: string;
  personKey?: string;
  lifeYears?: string;
  title?: string;
  note?: string;
}

export interface ResolvedRulerRelative extends RulerRelative {
  id: string;
  targetKind: 'ruler' | 'person' | 'mini_card';
  linkedRuler: RulerPeriod | null;
  resolvedPersonKey: string | null;
  personEventCount: number;
}

export interface ResolvedRulerInnerCircleMember extends RulerInnerCircleMember {
  personKey: string | null;
  linkedRulerId?: string | null;
  linkedRulerPeriod?: string | null;
  reignEventCount: number;
  totalEventCount: number;
}

export interface ResolvedRulerKeyAction extends RulerKeyAction {
  linkedEvent: EnrichedEvent | null;
}

export interface RulerPeriod {
  id: string;
  eraId: string;
  center?: string;
  ruler: string;
  shortRuler: string;
  lifeYears?: string;
  dynastyOrTitle?: string;
  reignPeriod: string;
  startYear: number;
  endYear: number;
  startDate?: string;
  endDate?: string;
  calendarStyle?: CalendarStyle;
  reignTitle: string;
  reignThesis: string;
  biography?: string;
  keyActions?: RulerKeyAction[];
  innerCircle?: RulerInnerCircleMember[];
  family?: RulerRelative[];
  legacy?: string;
  sources?: SourceEntry[];
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

export interface OperationBelligerent {
  side: string;
  commanders: string[];
  forces?: string;
  casualties?: string;
}

export interface OperationProfile {
  theater?: string;
  strategicObjective?: string;
  belligerents: OperationBelligerent[];
  resultSummary?: string;
  turningPoints?: string[];
  historiographyNote?: string;
}

export interface OutcomeByScope {
  russia?: string;
  world?: string;
}

export interface TimelineNode {
  id: string;
  startYear?: number;
  endYear?: number;
  activeFrom?: number;
  activeTo?: number;
  startDate?: string;
  endDate?: string;
  calendarStyle?: CalendarStyle;
  isAtomic?: boolean;
  period: string;
  title: string;
  subtitle: string;
  details: string;
  task: string;
  region: string;
  type: string;
  eventType?: string;
  prerequisites?: string | string[];
  outcome?: string;
  outcomesByScope?: OutcomeByScope;
  keyFigures?: string[];
  literaryProfile?: LiteraryProfile;
  operationProfile?: OperationProfile;
  subEvents?: SubEvent[];
  linksTo?: InlineNodeLink[];
  sources?: SourceEntry[];
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
  role: 'trunk' | 'military_branches' | 'thematic_branch' | 'rulers_branch' | 'campaign_pack' | string;
  branchIds: string[];
  title: string;
  enabled: boolean;
  loadPolicy?: ModuleLoadPolicy;
  detailScope?: DetailScope;
  campaignPackId?: string;
}

export interface ModulesIndexFile {
  schemaVersion?: string;
  generatedAt?: string;
  files: string[];
  onDemandFiles?: string[];
  campaignPacks?: CampaignPackRegistryEntry[];
  fileHashes?: Record<string, string>;
  disabledFiles?: string[];
  cardModules?: Record<string, string>;
  personModules?: Record<string, string[]>;
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
  loadPolicy?: ModuleLoadPolicy;
  detailScope?: DetailScope;
  campaignPack?: CampaignPackMeta;
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
  detailScope: DetailScope;
  campaignPackId?: string;
  seq: number;
  startYear: number;
  endYear: number;
  activeFrom: number;
  activeTo: number;
  startPrecision: PreciseDateParts;
  activeStartPrecision: PreciseDateParts;
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
  prerequisitesList: string[];
  concurrentEvents: EnrichedEvent[];
  concurrentCount?: number;
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

export type TimeScaleMode = 'compact' | 'proportional';

export type MacroRegionId =
  | 'all'
  | 'rus_center'
  | 'rus_north_west'
  | 'rus_south_caucasus'
  | 'rus_volga_ural'
  | 'rus_siberia_fareast'
  | 'europe'
  | 'asia_east'
  | 'middle_east_africa'
  | 'americas_global'
  | 'unknown';

export type FocusScope = 'sync_only' | 'sync_and_concurrent';

export type FocusDepth = 1 | 2 | 3;

export type SyncLinkTypeFilter = 'all' | 'causal' | 'retrospective' | 'sync';

export interface RulerSpanSegment {
  ruler: RulerPeriod;
  overlapStart: number;
  overlapEnd: number;
  years: number;
  pct: number;
}

export interface SyncTagOption {
  tag: string;
  label: string;
  eventCount: number;
  branchIds: string[];
}

export interface BranchPairFilter {
  branchA: string;
  branchB: string;
}

export interface AuditCandidateInfo {
  eventId: string;
  candidates: EnrichedEvent[];
  sameYearCandidatesCount: number;
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
  selectedSyncTag?: string | null;
  selectedMacroRegion?: MacroRegionId;
  branchPairFilter?: BranchPairFilter | null;
  auditUnlinkedMode?: boolean;
  computeAuditMap?: boolean;
  onlyWithSyncLinks: boolean;
  syncLinkTypeFilter?: SyncLinkTypeFilter;
  focusedEventId: string | null;
  focusScope: FocusScope;
  focusDepth?: FocusDepth;
  focusKeepWindow?: boolean;
  tracedChainEventIds?: Set<string> | null;
  tracedChainRootId?: string | null;
  showEndNodes: boolean;
  showOverlapMatrix: boolean;
}

export type CausalChainMode = 'causal_only' | 'all_links';
export type CausalChainScope = 'all' | 'campaign_only';

export interface CausalChainStepEdge {
  fromId: string;
  toId: string;
  type: string;
  label: string;
  relationKind: 'cause' | 'effect' | 'sync' | 'cultural';
}

export interface CausalChainNodeEntry {
  event: EnrichedEvent;
  branchLabel: string;
  branchShort: string;
  depth: number;
  relationKind: 'root' | 'cause' | 'effect' | 'sync' | 'cultural';
  viaEdge: CausalChainStepEdge | null;
  pathFromRoot: CausalChainStepEdge[];
  isExternalToCampaign: boolean;
}

export interface CausalChainLayer {
  depth: number;
  items: CausalChainNodeEntry[];
}

export interface CausalChainResult {
  root: EnrichedEvent;
  rootBranchLabel: string;
  upstreamLayers: CausalChainLayer[];
  downstreamLayers: CausalChainLayer[];
  synchronousItems: CausalChainNodeEntry[];
  culturalItems: CausalChainNodeEntry[];
  allEventIds: Set<string>;
  distanceMap: Map<string, number>;
  stats: {
    totalNodes: number;
    upstreamCount: number;
    downstreamCount: number;
    synchronousCount: number;
    culturalCount: number;
    maxUpstreamDepth: number;
    maxDownstreamDepth: number;
    externalAtlasCount: number;
    touchedBranchesCount: number;
    yearFrom: number;
    yearTo: number;
  };
}

export interface TracedChainFilter {
  rootEventId: string;
  rootTitle: string;
  eventIds: Set<string>;
  distanceMap: Map<string, number>;
  mode: CausalChainMode;
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

export type ComparisonTarget =
  | { kind: 'ruler'; rulerId: string }
  | { kind: 'era'; eraId: string }
  | { kind: 'window'; from: number; to: number; label?: string };

export interface ModalHistoryItem {
  type: 'card' | 'ruler' | 'era' | 'person' | 'window' | 'compare' | 'tracer' | 'campaigns';
  kind?: 'card' | 'ruler' | 'era' | 'person' | 'window' | 'compare' | 'tracer' | 'campaigns';
  id: string;
  label: string;
  windowRange?: { from: number; to: number };
  comparePair?: { left: ComparisonTarget; right: ComparisonTarget };
}

export interface ReignCrossBranchLink {
  id: string;
  pairKey: string;
  branchAId: string;
  branchBId: string;
  branchALabel: string;
  branchBLabel: string;
  fromEvent: EnrichedEvent;
  toEvent: EnrichedEvent;
  linkType: string;
  roleLabel: string;
  isDirectional: boolean;
  description: string;
  isFromInReign: boolean;
  isToInReign: boolean;
  isHistoricalCircuit: boolean;
}

export interface ReignBranchPairSummary {
  pairKey: string;
  branchAId: string;
  branchBId: string;
  branchALabel: string;
  branchBLabel: string;
  colorA: string;
  colorB: string;
  count: number;
  isHistoricalCircuit: boolean;
}

export interface HiddenBranchLinkGroup {
  branchId: string;
  branchLabel: string;
  color: string;
  hiddenLinkCount: number;
  hiddenEventCount: number;
  sampleTargetTitles: string[];
}

export interface WindowLinksVisibilitySummary {
  visibleLinksCount: number;
  totalWindowLinksCount: number;
  hiddenLinksCount: number;
  hiddenGroups: HiddenBranchLinkGroup[];
}

export interface ComparisonSideSummary {
  target: ComparisonTarget;
  kindLabel: string;
  title: string;
  subtitle: string;
  yearFrom: number;
  yearTo: number;
  durationYears: number;
  historicalEventsCount: number;
  totalNodesCount: number;
  startedInPeriodCount: number;
  carryOverInCount: number;
  carryOverOutCount: number;
  rulersCount: number;
  rulersList: RulerPeriod[];
  centers: string[];
  peakInterval: { label: string; count: number } | null;
  totalUniqueLinks: number;
  causalLinksCount: number;
  retrospectiveLinksCount: number;
  syncLinksCount: number;
  crossBranchLinksCount: number;
  worksAboutPeriodCount: number;
  branchBreakdown: Array<{ branch: BranchDefinition; count: number; sharePct: number }>;
  sphereCounts: Record<EraEventSphereId, number>;
  unclassifiedSphereEventsCount: number;
  crossBranchPairs: ReignBranchPairSummary[];
  topConnectedEvents: EnrichedEvent[];
  syncTags: Array<{ tag: string; label: string; count: number }>;
  participants: RulerParticipantEntry[];
}

export interface ComparisonPatternMatch {
  pairKey: string;
  branchALabel: string;
  branchBLabel: string;
  colorA: string;
  colorB: string;
  countLeft: number;
  countRight: number;
  isHistoricalCircuit: boolean;
}

export interface PeriodComparisonReport {
  left: ComparisonSideSummary;
  right: ComparisonSideSummary;
  sharedBranchPairs: ComparisonPatternMatch[];
  sharedSyncTags: Array<{ tag: string; label: string; countLeft: number; countRight: number }>;
  sharedParticipants: Array<{ personKey: string; displayName: string; countLeft: number; countRight: number }>;
  deltas: {
    events: number;
    links: number;
    causalLinks: number;
    retrospectiveLinks: number;
    durationYears: number;
  };
}

export type EraEventSphereId = 'wars' | 'reforms' | 'diplomacy' | 'world' | 'science';

export interface EraEventSphereSummary {
  id: EraEventSphereId;
  label: string;
  shortLabel: string;
  description: string;
  events: EnrichedEvent[];
  topEvents: EnrichedEvent[];
  linkCount: number;
}

export type EraFigureGroupId = 'rulers' | 'politics_military' | 'writers' | 'scientists';

export interface EraFigureEntry {
  id: string;
  group: EraFigureGroupId;
  name: string;
  period: string;
  sortYear: number;
  roleLabel: string;
  description: string;
  metaNote?: string;
  targetKind: 'ruler' | 'event' | 'person' | 'none';
  targetId?: string;
  linkCount?: number;
}
