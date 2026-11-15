export type MilitaryBranchMode = 'SPLIT' | 'UNIFIED';

export interface BranchDefinition {
  id: string;
  gitName: string;
  label: string;
  short: string;
  sourceFile?: string;
  description: string;
  color: string;
  badgeClass: string;
  isMilitary: boolean;
  alwaysTrunk?: boolean;
}

export interface MacroEra {
  id: string;
  roman: string;
  period: string;
  title: string;
  thesis: string;
}

export interface RulerPeriod {
  id: string;
  eraId: string;
  ruler: string;
  shortRuler: string;
  reignPeriod: string;
  startYear: number;
  endYear: number;
  reignTitle: string;
  reignThesis: string;
}

export interface SubEvent {
  title: string;
  text: string;
}

export interface TimelineNode {
  id: string;
  startYear?: number;
  endYear?: number;
  period: string;
  title: string;
  subtitle: string;
  details: string;
  task: string;
  region: string;
  type: string;
  subEvents?: SubEvent[];
}

export interface CrossLink {
  id: string;
  from: string;
  to: string;
  type: 'triggers' | 'sync_context' | 'enables' | string;
  label: string;
}

export interface MountedFileMeta {
  fileId: string;
  path: string;
  role: 'trunk' | 'military_branches' | 'thematic_branch' | string;
  branchIds: string[];
  title: string;
  enabled: boolean;
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
  branch: BranchDefinition;
  rulers: RulerPeriod[];
}

export interface BranchFile {
  $schema?: string;
  fileId: string;
  path: string;
  version?: string;
  branch?: BranchDefinition;
  branches?: BranchDefinition[];
  nodes: TimelineNode[];
}

export type TimelineDataFile = RulersFile | BranchFile;

export interface ExplicitLinkInfo extends CrossLink {
  direction: 'outgoing' | 'incoming';
  targetEvent: EnrichedEvent;
}

export interface EnrichedEvent extends TimelineNode {
  sourceFile: string;
  seq: number;
  startYear: number;
  endYear: number;
  duration: number;
  eraId: string;
  eraRoman: string;
  eraTitle: string;
  overlappingRulers: RulerPeriod[];
  ruler: string;
  reignPeriod: string;
  concurrentEvents: EnrichedEvent[];
  explicitLinks: ExplicitLinkInfo[];
}

export type StreamRow =
  | {
      rowType: 'ERA_START';
      year: number;
      priority: number;
      era: MacroEra;
    }
  | {
      rowType: 'RULER_COMMIT';
      year: number;
      priority: number;
      startedBeforeWindow: boolean;
      rulerObj: RulerPeriod;
    }
  | {
      rowType: 'EVENT_COMMIT';
      year: number;
      priority: number;
      seq: number;
      startedBeforeWindow: boolean;
      eventObj: EnrichedEvent;
    }
  | {
      rowType: 'EVENT_END';
      year: number;
      priority: number;
      seq: number;
      eventObj: EnrichedEvent;
    };

export interface FilterState {
  militaryBranchMode: MilitaryBranchMode;
  activeBranches: Record<string, boolean>;
  yearFrom: number;
  yearTo: number;
  selectedEra: string;
  selectedReign: string;
  searchQuery: string;
  showEndNodes: boolean;
  showOverlapMatrix: boolean;
}
