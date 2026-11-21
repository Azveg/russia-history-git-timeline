import type {
  BranchDefinition,
  CausalChainLayer,
  CausalChainMode,
  CausalChainNodeEntry,
  CausalChainResult,
  CausalChainScope,
  CausalChainStepEdge,
  EnrichedEvent,
} from '../../types/timeline';
import { isCampaignEvent } from './campaignPacks';

const CAUSAL_LINK_TYPES = new Set(['triggers', 'enables', 'causes']);
const CULTURAL_LINK_TYPES = new Set(['references', 'about_event', 'inspired_by']);

export interface TraceCausalChainOptions {
  mode?: CausalChainMode;
  maxDepth?: number | null;
  scope?: CausalChainScope;
  activeCampaignPackId?: string | null;
}

function isCausalLinkType(type: string | undefined): boolean {
  return Boolean(type && CAUSAL_LINK_TYPES.has(type));
}

function isCulturalLinkType(type: string | undefined): boolean {
  return Boolean(type && CULTURAL_LINK_TYPES.has(type));
}

function isExternalToActiveCampaign(
  ev: EnrichedEvent,
  activeCampaignPackId: string | null | undefined,
): boolean {
  if (!activeCampaignPackId) {
    return !isCampaignEvent(ev);
  }
  return ev.campaignPackId !== activeCampaignPackId;
}

function isAllowedInScope(
  ev: EnrichedEvent,
  scope: CausalChainScope,
  activeCampaignPackId: string | null | undefined,
): boolean {
  if (scope === 'all') return true;
  if (activeCampaignPackId) {
    return ev.campaignPackId === activeCampaignPackId;
  }
  return isCampaignEvent(ev);
}

function sortNodesChronologically(a: CausalChainNodeEntry, b: CausalChainNodeEntry): number {
  const sortDiff = a.event.startPrecision.sortKey - b.event.startPrecision.sortKey;
  if (sortDiff !== 0) return sortDiff;
  return a.event.title.localeCompare(b.event.title, 'ru');
}

/**
 * Full-depth cycle-safe causal chain tracer.
 * Traverses directed causal links upstream (causes: -1, -2, ...) and downstream (effects: +1, +2, ...),
 * plus synchronous & cultural/retrospective context links (and optional multi-hop traversal in `all_links` mode).
 */
export function traceCausalChain(
  rootEventId: string,
  events: EnrichedEvent[],
  branches: BranchDefinition[],
  options: TraceCausalChainOptions = {},
): CausalChainResult | null {
  const byId = new Map<string, EnrichedEvent>();
  for (let i = 0; i < events.length; i += 1) {
    byId.set(events[i].id, events[i]);
  }

  const root = byId.get(rootEventId);
  if (!root) return null;

  const branchById = new Map<string, BranchDefinition>();
  for (let i = 0; i < branches.length; i += 1) {
    branchById.set(branches[i].id, branches[i]);
  }

  const mode: CausalChainMode = options.mode ?? 'causal_only';
  const maxDepth =
    typeof options.maxDepth === 'number' && options.maxDepth > 0 ? Math.floor(options.maxDepth) : null;
  const scope: CausalChainScope = options.scope ?? 'all';
  const effectivePackId = options.activeCampaignPackId ?? root.campaignPackId ?? null;

  const getBranchMeta = (taskId: string) => {
    const br = branchById.get(taskId);
    return {
      label: br?.label || taskId,
      short: br?.short || br?.label || taskId,
    };
  };

  // 1. Upstream BFS (causes: incoming triggers/enables/causes -> depth -1, -2, -3...)
  const upstreamById = new Map<string, CausalChainNodeEntry>();
  {
    const queue: Array<{ event: EnrichedEvent; depth: number; path: CausalChainStepEdge[] }> = [
      { event: root, depth: 0, path: [] },
    ];
    const visited = new Set<string>([root.id]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (maxDepth !== null && current.depth >= maxDepth) continue;

      for (const link of current.event.explicitLinks) {
        if (link.isAutoSync && mode === 'causal_only') continue;
        const isIncomingCause = link.direction === 'incoming' && isCausalLinkType(link.type);
        const isEarlierSync =
          mode === 'all_links' &&
          !isCausalLinkType(link.type) &&
          !isCulturalLinkType(link.type) &&
          !link.isAutoSync &&
          link.targetEvent.startPrecision.sortKey < current.event.startPrecision.sortKey;

        if (!isIncomingCause && !isEarlierSync) continue;

        const target = byId.get(link.otherId) ?? link.targetEvent;
        if (!target || visited.has(target.id)) continue;
        if (!isAllowedInScope(target, scope, effectivePackId)) continue;

        visited.add(target.id);
        const nextDepth = current.depth + 1;
        const stepEdge: CausalChainStepEdge = {
          fromId: target.id,
          toId: current.event.id,
          type: link.type,
          label: link.label,
          relationKind: isIncomingCause ? 'cause' : 'sync',
        };
        const nextPath = [stepEdge, ...current.path];
        const bMeta = getBranchMeta(target.task);

        upstreamById.set(target.id, {
          event: target,
          branchLabel: bMeta.label,
          branchShort: bMeta.short,
          depth: -nextDepth,
          relationKind: isIncomingCause ? 'cause' : 'sync',
          viaEdge: stepEdge,
          pathFromRoot: nextPath,
          isExternalToCampaign: isExternalToActiveCampaign(target, effectivePackId),
        });

        queue.push({ event: target, depth: nextDepth, path: nextPath });
      }
    }
  }

  // 2. Downstream BFS (effects: outgoing triggers/enables/causes -> depth +1, +2, +3...)
  const downstreamById = new Map<string, CausalChainNodeEntry>();
  {
    const queue: Array<{ event: EnrichedEvent; depth: number; path: CausalChainStepEdge[] }> = [
      { event: root, depth: 0, path: [] },
    ];
    const visited = new Set<string>([root.id]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (maxDepth !== null && current.depth >= maxDepth) continue;

      for (const link of current.event.explicitLinks) {
        if (link.isAutoSync && mode === 'causal_only') continue;
        const isOutgoingEffect = link.direction === 'outgoing' && isCausalLinkType(link.type);
        const isLaterSync =
          mode === 'all_links' &&
          !isCausalLinkType(link.type) &&
          !isCulturalLinkType(link.type) &&
          !link.isAutoSync &&
          link.targetEvent.startPrecision.sortKey > current.event.startPrecision.sortKey;

        if (!isOutgoingEffect && !isLaterSync) continue;

        const target = byId.get(link.otherId) ?? link.targetEvent;
        if (!target || visited.has(target.id) || upstreamById.has(target.id)) continue;
        if (!isAllowedInScope(target, scope, effectivePackId)) continue;

        visited.add(target.id);
        const nextDepth = current.depth + 1;
        const stepEdge: CausalChainStepEdge = {
          fromId: current.event.id,
          toId: target.id,
          type: link.type,
          label: link.label,
          relationKind: isOutgoingEffect ? 'effect' : 'sync',
        };
        const nextPath = [...current.path, stepEdge];
        const bMeta = getBranchMeta(target.task);

        downstreamById.set(target.id, {
          event: target,
          branchLabel: bMeta.label,
          branchShort: bMeta.short,
          depth: nextDepth,
          relationKind: isOutgoingEffect ? 'effect' : 'sync',
          viaEdge: stepEdge,
          pathFromRoot: nextPath,
          isExternalToCampaign: isExternalToActiveCampaign(target, effectivePackId),
        });

        queue.push({ event: target, depth: nextDepth, path: nextPath });
      }
    }
  }

  // 3. Direct synchronous & parallel context links on root (excluding already-classified causes/effects)
  const synchronousById = new Map<string, CausalChainNodeEntry>();
  for (const link of root.explicitLinks) {
    if (link.isAutoSync && mode === 'causal_only') continue;
    const target = byId.get(link.otherId) ?? link.targetEvent;
    if (!target || target.id === root.id) continue;
    if (upstreamById.has(target.id) || downstreamById.has(target.id) || synchronousById.has(target.id)) {
      continue;
    }
    if (isCulturalLinkType(link.type)) continue;
    if (!isAllowedInScope(target, scope, effectivePackId)) continue;

    const bMeta = getBranchMeta(target.task);
    const edge: CausalChainStepEdge = {
      fromId: root.id,
      toId: target.id,
      type: link.type,
      label: link.label,
      relationKind: 'sync',
    };
    synchronousById.set(target.id, {
      event: target,
      branchLabel: bMeta.label,
      branchShort: bMeta.short,
      depth: 0,
      relationKind: 'sync',
      viaEdge: edge,
      pathFromRoot: [edge],
      isExternalToCampaign: isExternalToActiveCampaign(target, effectivePackId),
    });
  }

  // 4. Cultural / retrospective links (books, works, reflections across decades)
  const culturalById = new Map<string, CausalChainNodeEntry>();
  for (const rLink of root.retrospectiveLinks) {
    const target = byId.get(rLink.otherId);
    if (!target || target.id === root.id) continue;
    if (culturalById.has(target.id)) continue;
    if (!isAllowedInScope(target, scope, effectivePackId)) continue;

    const bMeta = getBranchMeta(target.task);
    const edge: CausalChainStepEdge = {
      fromId: rLink.direction === 'depicts' ? root.id : target.id,
      toId: rLink.direction === 'depicts' ? target.id : root.id,
      type: 'references',
      label: rLink.label,
      relationKind: 'cultural',
    };
    culturalById.set(target.id, {
      event: target,
      branchLabel: bMeta.label,
      branchShort: bMeta.short,
      depth: 0,
      relationKind: 'cultural',
      viaEdge: edge,
      pathFromRoot: [edge],
      isExternalToCampaign: isExternalToActiveCampaign(target, effectivePackId),
    });
  }

  // Group into ordered depth layers
  const upstreamLayerMap = new Map<number, CausalChainNodeEntry[]>();
  upstreamById.forEach((entry) => {
    const bucket = upstreamLayerMap.get(entry.depth) ?? [];
    bucket.push(entry);
    upstreamLayerMap.set(entry.depth, bucket);
  });
  const upstreamLayers: CausalChainLayer[] = Array.from(upstreamLayerMap.entries())
    .sort((a, b) => a[0] - b[0]) // deepest cause (-N) first, up to -1
    .map(([depth, items]) => ({
      depth,
      items: items.sort(sortNodesChronologically),
    }));

  const downstreamLayerMap = new Map<number, CausalChainNodeEntry[]>();
  downstreamById.forEach((entry) => {
    const bucket = downstreamLayerMap.get(entry.depth) ?? [];
    bucket.push(entry);
    downstreamLayerMap.set(entry.depth, bucket);
  });
  const downstreamLayers: CausalChainLayer[] = Array.from(downstreamLayerMap.entries())
    .sort((a, b) => a[0] - b[0]) // +1, +2, ... +N
    .map(([depth, items]) => ({
      depth,
      items: items.sort(sortNodesChronologically),
    }));

  const synchronousItems = Array.from(synchronousById.values()).sort(sortNodesChronologically);
  const culturalItems = Array.from(culturalById.values()).sort(sortNodesChronologically);

  const allEventIds = new Set<string>([root.id]);
  const distanceMap = new Map<string, number>([[root.id, 0]]);
  const touchedBranches = new Set<string>([root.task]);
  let externalAtlasCount = 0;
  let minYear = root.startYear;
  let maxYear = root.endYear;

  const registerEntry = (entry: CausalChainNodeEntry, absDist: number) => {
    allEventIds.add(entry.event.id);
    if (!distanceMap.has(entry.event.id)) {
      distanceMap.set(entry.event.id, absDist);
    }
    touchedBranches.add(entry.event.task);
    if (entry.isExternalToCampaign) externalAtlasCount += 1;
    if (entry.event.startYear < minYear) minYear = entry.event.startYear;
    if (entry.event.endYear > maxYear) maxYear = entry.event.endYear;
  };

  upstreamById.forEach((entry) => registerEntry(entry, Math.abs(entry.depth)));
  downstreamById.forEach((entry) => registerEntry(entry, Math.abs(entry.depth)));
  synchronousItems.forEach((entry) => registerEntry(entry, 1));
  if (mode === 'all_links') {
    culturalItems.forEach((entry) => registerEntry(entry, 1));
  }

  const maxUpstreamDepth = upstreamLayers.length > 0 ? Math.abs(upstreamLayers[0].depth) : 0;
  const maxDownstreamDepth =
    downstreamLayers.length > 0 ? downstreamLayers[downstreamLayers.length - 1].depth : 0;

  return {
    root,
    rootBranchLabel: getBranchMeta(root.task).label,
    upstreamLayers,
    downstreamLayers,
    synchronousItems,
    culturalItems,
    allEventIds,
    distanceMap,
    stats: {
      totalNodes: allEventIds.size,
      upstreamCount: upstreamById.size,
      downstreamCount: downstreamById.size,
      synchronousCount: synchronousItems.length,
      culturalCount: culturalItems.length,
      maxUpstreamDepth,
      maxDownstreamDepth,
      externalAtlasCount,
      touchedBranchesCount: touchedBranches.size,
      yearFrom: minYear,
      yearTo: maxYear,
    },
  };
}
