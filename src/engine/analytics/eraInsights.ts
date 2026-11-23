import type {
  BranchDefinition,
  EnrichedEvent,
  EraEventSphereId,
} from '../../types/timeline';
import { isBiographyNode } from '../calendar/jdnCalendar';
import { classifyEventToEraSphere } from './periodAnalytics';

export interface EraIntensityBucket {
  index: number;
  fromYear: number;
  toYear: number;
  label: string;
  total: number;
  sphereCounts: Record<EraEventSphereId, number>;
  otherCount: number;
}

export interface EraTurningPoint {
  event: EnrichedEvent;
  sphereId: EraEventSphereId | null;
  incomingCausalCount: number;
  outgoingCausalCount: number;
  totalExplicitLinks: number;
  centralityScore: number;
}

export interface EraAnalyticalProfile {
  yearFrom: number;
  yearTo: number;
  buckets: EraIntensityBucket[];
  maxBucketTotal: number;
  turningPoints: EraTurningPoint[];
  guidedRouteEvents: EnrichedEvent[];
}

const profileCache = new WeakMap<EnrichedEvent[], Map<string, EraAnalyticalProfile>>();

function createEmptySphereCounts(): Record<EraEventSphereId, number> {
  return {
    wars: 0,
    reforms: 0,
    diplomacy: 0,
    world: 0,
    science: 0,
  };
}

function chooseBucketCount(totalYears: number): number {
  if (totalYears <= 1) return 1;
  if (totalYears <= 13) return Math.min(totalYears, 6);
  if (totalYears <= 46) return 6;
  if (totalYears <= 101) return 8;
  return 10;
}

/**
 * Computes chronological intensity buckets, top causal turning points, and a curated
 * chronological guided study route for an era or custom time window.
 * Cached via WeakMap keyed on the events array reference + window bounds.
 */
export function computeEraAnalyticalProfile(
  events: EnrichedEvent[],
  yearFrom: number,
  yearTo: number,
  branches: BranchDefinition[],
): EraAnalyticalProfile {
  const safeFrom = Math.min(yearFrom, yearTo);
  const safeTo = Math.max(yearFrom, yearTo);
  const cacheKey = `${safeFrom}:${safeTo}:${branches.length}`;

  let byKey = profileCache.get(events);
  if (!byKey) {
    byKey = new Map<string, EraAnalyticalProfile>();
    profileCache.set(events, byKey);
  }
  const cached = byKey.get(cacheKey);
  if (cached) return cached;

  const branchById = new Map(branches.map((b) => [b.id, b]));
  const totalYears = safeTo - safeFrom + 1;
  const bucketCount = chooseBucketCount(totalYears);

  const buckets: EraIntensityBucket[] = [];
  for (let i = 0; i < bucketCount; i += 1) {
    const bFrom = safeFrom + Math.floor((totalYears * i) / bucketCount);
    const bTo =
      i === bucketCount - 1
        ? safeTo
        : safeFrom + Math.floor((totalYears * (i + 1)) / bucketCount) - 1;
    const label = bFrom === bTo ? `${bFrom}` : `${bFrom}–${bTo}`;
    buckets.push({
      index: i,
      fromYear: bFrom,
      toYear: bTo,
      label,
      total: 0,
      sphereCounts: createEmptySphereCounts(),
      otherCount: 0,
    });
  }

  const scoredCandidates: EraTurningPoint[] = [];

  for (let i = 0; i < events.length; i += 1) {
    const ev = events[i];
    const sphereId = classifyEventToEraSphere(ev, branchById, branches);

    // Bucket assignment by clamped event startYear (or activeFrom for biographies)
    const anchorYear = Math.max(safeFrom, Math.min(safeTo, ev.startYear));
    let bucketIdx = Math.floor(((anchorYear - safeFrom) / totalYears) * bucketCount);
    if (bucketIdx < 0) bucketIdx = 0;
    if (bucketIdx >= bucketCount) bucketIdx = bucketCount - 1;

    const bucket = buckets[bucketIdx];
    bucket.total += 1;
    if (sphereId) {
      bucket.sphereCounts[sphereId] += 1;
    } else {
      bucket.otherCount += 1;
    }

    // Causal centrality scoring (excluding pure biography cards from turning points)
    if (!isBiographyNode(ev, branches)) {
      let incomingCausalCount = 0;
      let outgoingCausalCount = 0;
      const explicitLinks = ev.explicitLinks ?? [];
      for (let k = 0; k < explicitLinks.length; k += 1) {
        const lnk = explicitLinks[k];
        if (lnk.type === 'triggers' || lnk.type === 'enables' || lnk.type === 'causes') {
          if (lnk.direction === 'outgoing') outgoingCausalCount += 1;
          else incomingCausalCount += 1;
        }
      }

      const totalExplicitLinks = explicitLinks.length;
      const subBonus = Math.min(4, (ev.subEvents?.length ?? 0) * 0.5);
      const scopeBonus = ev.outcomesByScope ? 4 : 0;
      const centralityScore =
        outgoingCausalCount * 4 +
        incomingCausalCount * 2.5 +
        totalExplicitLinks * 1.2 +
        subBonus +
        scopeBonus;

      scoredCandidates.push({
        event: ev,
        sphereId,
        incomingCausalCount,
        outgoingCausalCount,
        totalExplicitLinks,
        centralityScore,
      });
    }
  }

  const maxBucketTotal = buckets.reduce((max, b) => Math.max(max, b.total), 0);

  scoredCandidates.sort((a, b) => {
    if (b.centralityScore !== a.centralityScore) return b.centralityScore - a.centralityScore;
    if (b.totalExplicitLinks !== a.totalExplicitLinks) {
      return b.totalExplicitLinks - a.totalExplicitLinks;
    }
    return a.event.startYear - b.event.startYear;
  });

  const turningPoints = scoredCandidates
    .filter((c) => c.totalExplicitLinks > 0 || c.centralityScore >= 2)
    .slice(0, 6);

  // Curated chronological guided route (up to 14 highest-impact non-bio landmarks sorted by year)
  const routeSize = Math.min(14, Math.max(6, scoredCandidates.length));
  const guidedRouteEvents = scoredCandidates
    .slice(0, routeSize)
    .map((c) => c.event)
    .sort((a, b) => {
      if (a.startYear !== b.startYear) return a.startYear - b.startYear;
      if (a.endYear !== b.endYear) return a.endYear - b.endYear;
      return a.title.localeCompare(b.title, 'ru');
    });

  const result: EraAnalyticalProfile = {
    yearFrom: safeFrom,
    yearTo: safeTo,
    buckets,
    maxBucketTotal,
    turningPoints,
    guidedRouteEvents,
  };

  byKey.set(cacheKey, result);
  return result;
}
