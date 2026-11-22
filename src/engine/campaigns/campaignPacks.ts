import type {
  BranchDefinition,
  BranchPairFilter,
  CampaignPackRegistryEntry,
  EnrichedEvent,
  MacroRegionId,
  SyncLinkTypeFilter,
} from '../../types/timeline';
import type { BranchSelection } from '../layout/branchSelection';
import {
  getEventEffectiveEndYear,
  getEventEffectiveStartYear,
  intersectsTimeWindow,
} from '../layout/subLaneLayout';

export interface CampaignReturnSnapshot {
  yearFrom: number | undefined;
  yearTo: number | undefined;
  branchSelection: BranchSelection;
  collapsedParents: Record<string, boolean>;
  selectedEra: string;
  selectedReign: string;
  searchQuery: string;
  selectedPersonKey: string | null;
  selectedSyncTag: string | null;
  selectedMacroRegion: MacroRegionId;
  branchPairFilter: BranchPairFilter | null;
  onlyWithSyncLinks: boolean;
  syncLinkTypeFilter: SyncLinkTypeFilter;
  auditUnlinkedMode: boolean;
}

export function createCampaignReturnSnapshot(
  state: CampaignReturnSnapshot,
): CampaignReturnSnapshot {
  return {
    ...state,
    branchSelection: {
      preset: state.branchSelection.preset,
      overrides: { ...state.branchSelection.overrides },
    },
    collapsedParents: { ...state.collapsedParents },
    branchPairFilter: state.branchPairFilter ? { ...state.branchPairFilter } : null,
  };
}

export function getCampaignEntryFilterDefaults(pack: CampaignPackRegistryEntry) {
  return {
    yearFrom: pack.yearFrom,
    yearTo: pack.yearTo,
    selectedEra: 'ALL' as const,
    selectedReign: 'ALL' as const,
    searchQuery: '',
    selectedPersonKey: null,
    selectedSyncTag: null,
    selectedMacroRegion: 'all' as MacroRegionId,
    branchPairFilter: null,
    onlyWithSyncLinks: false,
    syncLinkTypeFilter: 'all' as SyncLinkTypeFilter,
    auditUnlinkedMode: false,
  };
}

export function resolveCampaignNavigationBounds(
  activeCampaignPack: Pick<CampaignPackRegistryEntry, 'yearFrom' | 'yearTo'> | null | undefined,
  atlasBounds: { minYear: number; maxYear: number },
): { minYear: number; maxYear: number } {
  if (!activeCampaignPack) {
    return atlasBounds;
  }
  const minYear = Math.min(activeCampaignPack.yearFrom, activeCampaignPack.yearTo);
  const maxYear = Math.max(activeCampaignPack.yearFrom, activeCampaignPack.yearTo);
  return { minYear, maxYear };
}

export function isCampaignBranch(branch: Pick<BranchDefinition, 'detailScope' | 'campaignPackId'>): boolean {
  return branch.detailScope === 'campaign' || Boolean(branch.campaignPackId);
}

export function isCampaignEvent(event: Pick<EnrichedEvent, 'detailScope' | 'campaignPackId'>): boolean {
  return event.detailScope === 'campaign' || Boolean(event.campaignPackId);
}

export function getCoreBranches<T extends Pick<BranchDefinition, 'detailScope' | 'campaignPackId'>>(
  branches: T[],
): T[] {
  return branches.filter((b) => !isCampaignBranch(b));
}

export function getCampaignBranches<T extends Pick<BranchDefinition, 'detailScope' | 'campaignPackId'>>(
  branches: T[],
  campaignId: string,
): T[] {
  return branches.filter((b) => b.campaignPackId === campaignId);
}

export function findCampaignPackById(
  packs: CampaignPackRegistryEntry[],
  campaignId: string | null | undefined,
): CampaignPackRegistryEntry | null {
  if (!campaignId) return null;
  return packs.find((p) => p.id === campaignId) ?? null;
}

export function findCampaignPackForEvent(
  packs: CampaignPackRegistryEntry[],
  eventId: string | null | undefined,
): CampaignPackRegistryEntry | null {
  if (!eventId) return null;
  return packs.find((p) => p.parentEventId === eventId) ?? null;
}

export function filterEventsForAnalyticsScope(
  events: EnrichedEvent[],
  options: {
    includeCampaignDetails: boolean;
    activeCampaignPackId?: string | null;
  },
): EnrichedEvent[] {
  if (options.includeCampaignDetails) {
    return events;
  }
  if (options.activeCampaignPackId) {
    return events.filter(
      (ev) => !isCampaignEvent(ev) || ev.campaignPackId === options.activeCampaignPackId,
    );
  }
  return events.filter((ev) => !isCampaignEvent(ev));
}

export function countCampaignEventsInRange(
  events: EnrichedEvent[],
  branches: BranchDefinition[],
  yearFrom: number,
  yearTo: number,
): number {
  let count = 0;
  for (let i = 0; i < events.length; i += 1) {
    const ev = events[i];
    if (!isCampaignEvent(ev)) continue;
    const start = getEventEffectiveStartYear(ev, branches);
    const end = getEventEffectiveEndYear(ev, branches);
    if (intersectsTimeWindow(start, end, yearFrom, yearTo)) {
      count += 1;
    }
  }
  return count;
}

export const ATLAS_CONTEXT_BRANCH_IDS = [
  'WORLD_DIPLOMACY',
  'DIPLOMACY_TREATIES',
  'REFORMS_ECO',
  'WORLD_ECONOMY',
  'INTERNAL_BUFFER',
  'WAR_CONTINENTAL',
] as const;

const ATLAS_CONTEXT_BRANCH_SET = new Set<string>(ATLAS_CONTEXT_BRANCH_IDS);

export function buildCampaignBranchMask(
  branches: BranchDefinition[],
  pack: CampaignPackRegistryEntry,
  options?: {
    enabledBranchIds?: string[] | null;
    includeRulers?: boolean;
    includeMacroWarBranch?: boolean;
    includeAtlasContext?: boolean;
  },
): Record<string, boolean> {
  const packBranchSet = new Set(pack.branchIds);
  const activeSet =
    options?.enabledBranchIds && options.enabledBranchIds.length > 0
      ? new Set(options.enabledBranchIds)
      : packBranchSet;

  const mask: Record<string, boolean> = {};
  branches.forEach((b) => {
    if (b.isGroup) return;
    if (b.id === 'MAIN_RULERS') {
      mask[b.id] = options?.includeRulers !== false;
      return;
    }
    if (packBranchSet.has(b.id) || b.campaignPackId === pack.id) {
      mask[b.id] = activeSet.has(b.id);
      return;
    }
    if (options?.includeAtlasContext && ATLAS_CONTEXT_BRANCH_SET.has(b.id)) {
      mask[b.id] = true;
      return;
    }
    if (options?.includeMacroWarBranch && b.id === 'WAR_CONTINENTAL') {
      mask[b.id] = true;
      return;
    }
    mask[b.id] = false;
  });

  // Ensure every declared pack branchId is present even before all metadata merges
  pack.branchIds.forEach((bId) => {
    if (mask[bId] === undefined) {
      mask[bId] = activeSet.has(bId);
    }
  });

  return mask;
}
