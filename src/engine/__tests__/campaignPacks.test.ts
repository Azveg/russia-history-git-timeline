import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTimelineModuleIndex } from '../../../scripts/buildTimelineModuleIndex';
import {
  ATLAS_CONTEXT_BRANCH_IDS,
  buildCampaignBranchMask,
  countCampaignEventsInRange,
  createCampaignReturnSnapshot,
  filterEventsForAnalyticsScope,
  findCampaignPackById,
  findCampaignPackForEvent,
  getCampaignBranches,
  getCampaignEntryFilterDefaults,
  getCoreBranches,
  resolveCampaignNavigationBounds,
} from '../campaigns/campaignPacks';
import { traceCausalChain } from '../campaigns/causalChainTracer';
import { computeBranchPresetMap } from '../layout/subLaneLayout';
import {
  clearTimelineRepositoryCache,
  fetchTimelineRepository,
  hydrateRemainingTimelineModules,
  loadCampaignPackModules,
} from '../repository/timelineRepository';
import {
  buildUnifiedTimelineStream,
  extractBranchesFromStore,
  extractRulersFromStore,
  getEnrichedEvents,
} from '../timelineEngine';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

function createPublicFetchMock() {
  const index = buildTimelineModuleIndex(PUBLIC_DIR);
  const requestedPaths: string[] = [];

  const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
    const rawUrl = typeof input === 'string' ? input : input.toString();
    const cleaned = rawUrl.split('?')[0].replace(/^\.\//, '').replace(/^\/+/, '');
    requestedPaths.push(cleaned);

    if (cleaned === 'data/modules.index.json') {
      return new Response(JSON.stringify(index), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const fullPath = path.join(PUBLIC_DIR, cleaned);
    if (!fs.existsSync(fullPath)) {
      return new Response('Not found', { status: 404 });
    }
    const body = fs.readFileSync(fullPath, 'utf8');
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  return { mockFetch, requestedPaths, index };
}

afterEach(() => {
  clearTimelineRepositoryCache();
  vi.unstubAllGlobals();
});

describe('campaignPacks — on-demand WWI architecture, operation profiles & deep causal tracing', () => {
  it('classifies all 7 WWI power modules as onDemandFiles in modules.index.json with full pack metadata', () => {
    const index = buildTimelineModuleIndex(PUBLIC_DIR);
    expect(index.files.some((f) => f.startsWith('data/campaigns/ww1/'))).toBe(false);
    expect(index.onDemandFiles).toEqual([
      'data/campaigns/ww1/austria_hungary.json',
      'data/campaigns/ww1/britain.json',
      'data/campaigns/ww1/france.json',
      'data/campaigns/ww1/germany.json',
      'data/campaigns/ww1/ottoman.json',
      'data/campaigns/ww1/russia.json',
      'data/campaigns/ww1/usa.json',
    ]);

    const ww1Pack = findCampaignPackById(index.campaignPacks ?? [], 'ww1');
    expect(ww1Pack).not.toBeNull();
    expect(ww1Pack?.parentEventId).toBe('1914-ww1');
    expect(ww1Pack?.yearFrom).toBe(1914);
    expect(ww1Pack?.yearTo).toBe(1918);
    expect(ww1Pack?.branchIds).toEqual(
      expect.arrayContaining([
        'WW1_RUSSIA',
        'WW1_GERMANY',
        'WW1_FRANCE',
        'WW1_BRITAIN',
        'WW1_AUSTRIA_HUNGARY',
        'WW1_OTTOMAN',
        'WW1_USA',
      ]),
    );
    expect(ww1Pack?.eventCount).toBe(31);
    expect(index.cardModules?.['ww1-fr-marne']).toBe('data/campaigns/ww1/france.json');
    expect(index.cardModules?.['ww1-ah-caporetto']).toBe('data/campaigns/ww1/austria_hungary.json');
    expect(index.cardModules?.['ww1-ot-gallipoli-defense']).toBe('data/campaigns/ww1/ottoman.json');
    expect(index.cardModules?.['ww1-us-meuse-argonne']).toBe('data/campaigns/ww1/usa.json');
    expect(findCampaignPackForEvent(index.campaignPacks ?? [], '1914-ww1')?.id).toBe('ww1');
  });

  it('never fetches on_demand campaign modules during progressive boot or background hydration, and supports atlas context mask', async () => {
    const { mockFetch, requestedPaths } = createPublicFetchMock();
    vi.stubGlobal('fetch', mockFetch);

    const initial = await fetchTimelineRepository({ progressive: true });
    expect(initial.loadedCampaignIds).toEqual([]);
    expect(initial.campaignPacks.some((p) => p.id === 'ww1')).toBe(true);
    expect(requestedPaths.some((p) => p.startsWith('data/campaigns/ww1/'))).toBe(false);

    const hydrated = await hydrateRemainingTimelineModules({ priority: true });
    expect(hydrated).not.toBeNull();
    expect(hydrated!.isFullyHydrated).toBe(true);
    expect(hydrated!.loadedCampaignIds).toEqual([]);
    expect(requestedPaths.some((p) => p.startsWith('data/campaigns/ww1/'))).toBe(false);

    const withWw1 = await loadCampaignPackModules('ww1');
    expect(withWw1).not.toBeNull();
    expect(withWw1!.loadedCampaignIds).toContain('ww1');
    for (const file of [
      'data/campaigns/ww1/russia.json',
      'data/campaigns/ww1/germany.json',
      'data/campaigns/ww1/france.json',
      'data/campaigns/ww1/britain.json',
      'data/campaigns/ww1/austria_hungary.json',
      'data/campaigns/ww1/ottoman.json',
      'data/campaigns/ww1/usa.json',
    ]) {
      expect(withWw1!.files[file]).toBeDefined();
    }

    const branches = extractBranchesFromStore(withWw1!.manifest, withWw1!.files);
    const coreBranches = getCoreBranches(branches);
    const ww1Branches = getCampaignBranches(branches, 'ww1');
    expect(ww1Branches.map((b) => b.id)).toEqual(
      expect.arrayContaining([
        'WW1_RUSSIA',
        'WW1_GERMANY',
        'WW1_FRANCE',
        'WW1_BRITAIN',
        'WW1_AUSTRIA_HUNGARY',
        'WW1_OTTOMAN',
        'WW1_USA',
      ]),
    );
    expect(coreBranches.some((b) => b.campaignPackId === 'ww1')).toBe(false);

    // Macro presets MUST always keep campaign branches disabled
    for (const preset of ['overview', 'all', 'rulers_wars', 'culture_science', 'none'] as const) {
      const presetMap = computeBranchPresetMap(branches, preset);
      for (const ww1Br of ww1Branches) {
        expect(presetMap[ww1Br.id]).toBe(false);
      }
    }

    // Campaign Mode mask without external atlas context
    const ww1Pack = findCampaignPackById(withWw1!.campaignPacks, 'ww1')!;
    const isolatedMask = buildCampaignBranchMask(branches, ww1Pack, {
      enabledBranchIds: ['WW1_RUSSIA', 'WW1_FRANCE', 'WW1_USA'],
      includeRulers: true,
      includeAtlasContext: false,
    });
    expect(isolatedMask.MAIN_RULERS).toBe(true);
    expect(isolatedMask.WW1_RUSSIA).toBe(true);
    expect(isolatedMask.WW1_FRANCE).toBe(true);
    expect(isolatedMask.WW1_USA).toBe(true);
    expect(isolatedMask.WW1_GERMANY).toBe(false);
    expect(isolatedMask.WORLD_DIPLOMACY).toBe(false);
    expect(isolatedMask.WAR_CONTINENTAL).toBe(false);

    // Campaign Mode mask WITH external atlas context enabled
    const withAtlasMask = buildCampaignBranchMask(branches, ww1Pack, {
      enabledBranchIds: ['WW1_RUSSIA', 'WW1_USA'],
      includeRulers: true,
      includeAtlasContext: true,
    });
    for (const ctxId of ATLAS_CONTEXT_BRANCH_IDS) {
      if (branches.some((b) => b.id === ctxId)) {
        expect(withAtlasMask[ctxId]).toBe(true);
      }
    }
  });

  it('isolates campaign events from macro analytics, preserves operationProfile and Julian/Gregorian order', async () => {
    const { mockFetch } = createPublicFetchMock();
    vi.stubGlobal('fetch', mockFetch);

    await fetchTimelineRepository({ progressive: true, target: { campaignId: 'ww1' } });
    const snapshot = await hydrateRemainingTimelineModules({ priority: true });
    expect(snapshot).not.toBeNull();
    expect(snapshot!.loadedCampaignIds).toContain('ww1');

    const branches = extractBranchesFromStore(snapshot!.manifest, snapshot!.files);
    const rulers = extractRulersFromStore(snapshot!.manifest, snapshot!.files);
    const enriched = getEnrichedEvents(snapshot!.manifest, snapshot!.files, rulers);

    const campaignCountInWw1 = countCampaignEventsInRange(enriched, branches, 1914, 1918);
    expect(campaignCountInWw1).toBe(31);

    const coreOnly = filterEventsForAnalyticsScope(enriched, { includeCampaignDetails: false });
    const withDetails = filterEventsForAnalyticsScope(enriched, { includeCampaignDetails: true });
    expect(withDetails.length - coreOnly.length).toBe(31);
    expect(coreOnly.some((e) => e.campaignPackId === 'ww1')).toBe(false);

    // All 31 WWI campaign nodes carry a sanitized structured operationProfile
    const ww1Events = enriched.filter((e) => e.campaignPackId === 'ww1');
    expect(ww1Events.length).toBe(31);
    for (const ev of ww1Events) {
      expect(ev.operationProfile).toBeDefined();
      expect(ev.operationProfile?.theater).toBeTruthy();
      expect(ev.operationProfile?.belligerents?.length).toBeGreaterThanOrEqual(2);
      expect(ev.operationProfile?.resultSummary).toBeTruthy();
    }

    // Verify Julian/Gregorian unified chronology:
    const schlieffen = enriched.find((e) => e.id === 'ww1-de-schlieffen')!;
    const eastPrussia = enriched.find((e) => e.id === 'ww1-ru-east-prussia')!;
    const tannenberg = enriched.find((e) => e.id === 'ww1-de-tannenberg')!;
    const marne = enriched.find((e) => e.id === 'ww1-fr-marne')!;

    expect(schlieffen.startPrecision.sortKey).toBeLessThan(eastPrussia.startPrecision.sortKey);
    expect(eastPrussia.startPrecision.sortKey).toBeLessThan(tannenberg.startPrecision.sortKey);
    expect(tannenberg.startPrecision.sortKey).toBeLessThan(marne.startPrecision.sortKey);

    // Cross-country links resolve across separate JSON files
    expect(eastPrussia.explicitLinks.some((l) => l.otherId === 'ww1-fr-marne')).toBe(true);
    expect(eastPrussia.explicitLinks.some((l) => l.otherId === 'ww1-de-tannenberg')).toBe(true);
  });

  it('traces full-depth causal chains across campaign powers and external atlas, and isolates traced chains on the timeline', async () => {
    const { mockFetch } = createPublicFetchMock();
    vi.stubGlobal('fetch', mockFetch);

    await fetchTimelineRepository({ progressive: true, target: { campaignId: 'ww1' } });
    const snapshot = await hydrateRemainingTimelineModules({ priority: true });
    const branches = extractBranchesFromStore(snapshot!.manifest, snapshot!.files);
    const rulers = extractRulersFromStore(snapshot!.manifest, snapshot!.files);
    const enriched = getEnrichedEvents(snapshot!.manifest, snapshot!.files, rulers);

    // 1. Deep trace from Compiègne armistice reaches July Crisis (1914) upstream & Versailles (1919) downstream
    const compiegneTrace = traceCausalChain('ww1-fr-compiegne', enriched, branches, {
      mode: 'causal_only',
      scope: 'all',
      maxDepth: 6,
      activeCampaignPackId: 'ww1',
    });
    expect(compiegneTrace).not.toBeNull();
    const upstreamIds = compiegneTrace!.upstreamLayers.flatMap((l) => l.items.map((n) => n.event.id));
    const downstreamIds = compiegneTrace!.downstreamLayers.flatMap((l) => l.items.map((n) => n.event.id));
    expect(upstreamIds).toContain('ww1-de-kaiserschlacht');
    expect(upstreamIds).toContain('1914-world-july-crisis');
    expect(downstreamIds).toContain('1919-world-versailles');

    const julyEntry = compiegneTrace!.upstreamLayers
      .flatMap((l) => l.items)
      .find((n) => n.event.id === '1914-world-july-crisis');
    expect(julyEntry?.isExternalToCampaign).toBe(true);
    expect(Math.abs(julyEntry?.depth ?? 0)).toBeGreaterThanOrEqual(2);

    // 2. Deep trace from USA Meuse-Argonne connects Federal Reserve (1913) -> Neutrality -> AEF -> Meuse-Argonne -> Compiègne -> Versailles (1919)
    const usaTrace = traceCausalChain('ww1-us-meuse-argonne', enriched, branches, {
      mode: 'causal_only',
      scope: 'all',
      maxDepth: 6,
      activeCampaignPackId: 'ww1',
    });
    expect(usaTrace).not.toBeNull();
    expect(usaTrace!.allEventIds.has('ww1-us-entry-aef')).toBe(true);
    expect(usaTrace!.allEventIds.has('ww1-us-neutrality-zimmermann')).toBe(true);
    expect(usaTrace!.allEventIds.has('1913-world-federal-reserve-system')).toBe(true);
    expect(usaTrace!.allEventIds.has('ww1-fr-compiegne')).toBe(true);
    expect(usaTrace!.allEventIds.has('1919-world-versailles')).toBe(true);

    // 3. Scope = campaign_only filters out external atlas events
    const campaignOnlyTrace = traceCausalChain('ww1-us-meuse-argonne', enriched, branches, {
      mode: 'causal_only',
      scope: 'campaign_only',
      maxDepth: 6,
      activeCampaignPackId: 'ww1',
    });
    expect(campaignOnlyTrace).not.toBeNull();
    expect(campaignOnlyTrace!.allEventIds.has('ww1-us-entry-aef')).toBe(true);
    expect(campaignOnlyTrace!.allEventIds.has('1913-world-federal-reserve-system')).toBe(false);
    expect(campaignOnlyTrace!.allEventIds.has('1919-world-versailles')).toBe(false);

    // 4. maxDepth = 1 caps upstream and downstream layers at depth 1
    const depth1Trace = traceCausalChain('ww1-us-meuse-argonne', enriched, branches, {
      mode: 'causal_only',
      scope: 'all',
      maxDepth: 1,
      activeCampaignPackId: 'ww1',
    });
    expect(depth1Trace!.upstreamLayers.every((l) => Math.abs(l.depth) <= 1)).toBe(true);
    expect(depth1Trace!.downstreamLayers.every((l) => Math.abs(l.depth) <= 1)).toBe(true);
    expect(depth1Trace!.allEventIds.has('1913-world-federal-reserve-system')).toBe(false);

    // 5. buildUnifiedTimelineStream with tracedChainEventIds isolates strictly those events and expands years
    const activeBranches: Record<string, boolean> = {};
    for (const b of branches) activeBranches[b.id] = b.campaignPackId === 'ww1' || b.id === 'MAIN_RULERS';
    const stream = buildUnifiedTimelineStream(
      enriched,
      rulers,
      snapshot!.manifest,
      branches,
      {
        activeBranches,
        yearFrom: 1914,
        yearTo: 1918,
        selectedEra: 'ALL',
        selectedReign: 'ALL',
        searchQuery: '',
        onlyWithSyncLinks: false,
        focusedEventId: null,
        focusScope: 'sync_only',
        tracedChainEventIds: usaTrace!.allEventIds,
        tracedChainRootId: 'ww1-us-meuse-argonne',
        showEndNodes: true,
        showOverlapMatrix: false,
      },
    );
    const streamEventIds = new Set(stream.matchingEvents.map((e) => e.id));
    expect(streamEventIds.size).toBe(usaTrace!.allEventIds.size);
    for (const id of usaTrace!.allEventIds) {
      expect(streamEventIds.has(id)).toBe(true);
    }
    expect(stream.effectiveYearFrom).toBeLessThanOrEqual(1913);
    expect(stream.effectiveYearTo).toBeGreaterThanOrEqual(1919);
  });

  it('preloads a campaign pack on boot when deep-linking directly to a campaign card ID', async () => {
    const { mockFetch } = createPublicFetchMock();
    vi.stubGlobal('fetch', mockFetch);

    const snap = await fetchTimelineRepository({
      progressive: true,
      target: { cardId: 'ww1-ah-caporetto' },
    });
    expect(snap.loadedCampaignIds).toContain('ww1');
    expect(snap.files['data/campaigns/ww1/austria_hungary.json']).toBeDefined();
    expect(snap.files['data/campaigns/ww1/russia.json']).toBeDefined();
    expect(snap.files['data/campaigns/ww1/usa.json']).toBeDefined();
  });

  it('exposes global 1914-ww1 milestones, split outcomesByScope (Russia/World), and indexes them in search', async () => {
    const { mockFetch } = createPublicFetchMock();
    vi.stubGlobal('fetch', mockFetch);

    const snap = await fetchTimelineRepository({ progressive: false });
    const branches = extractBranchesFromStore(snap.manifest, snap.files);
    const rulers = extractRulersFromStore(snap.manifest, snap.files);
    const enriched = getEnrichedEvents(snap.manifest, snap.files, rulers);

    const ww1 = enriched.find((ev) => ev.id === '1914-ww1');
    expect(ww1).toBeDefined();
    expect(ww1!.startDate).toBe('1914-07-28');
    expect(ww1!.endDate).toBe('1918-11-11');
    expect(ww1!.subEvents).toBeDefined();
    expect(ww1!.subEvents!.length).toBeGreaterThanOrEqual(10);
    expect(ww1!.subEvents![0].year).toContain('1914');
    expect(ww1!.subEvents![ww1!.subEvents!.length - 1].year).toContain('1918');

    expect(ww1!.outcomesByScope).toBeDefined();
    expect(ww1!.outcomesByScope!.russia).toBeTruthy();
    expect(ww1!.outcomesByScope!.world).toBeTruthy();
    expect(ww1!.outcomesByScope!.russia).toContain('Брестский мир');
    expect(ww1!.outcomesByScope!.world).toContain('Лиги Наций');

    const activeBranches: Record<string, boolean> = {};
    for (const b of branches) {
      if (b.detailScope !== 'campaign') activeBranches[b.id] = true;
    }

    const worldSearch = buildUnifiedTimelineStream(
      enriched,
      rulers,
      snap.manifest,
      branches,
      {
        activeBranches,
        yearFrom: 862,
        yearTo: 2000,
        selectedEra: 'ALL',
        selectedReign: 'ALL',
        searchQuery: 'мандатной системе',
        onlyWithSyncLinks: false,
        focusedEventId: null,
        focusScope: 'sync_only',
        showEndNodes: true,
        showOverlapMatrix: false,
      },
    );
    expect(worldSearch.matchingEvents.some((ev) => ev.id === '1914-ww1')).toBe(true);

    const russiaSearch = buildUnifiedTimelineStream(
      enriched,
      rulers,
      snap.manifest,
      branches,
      {
        activeBranches,
        yearFrom: 862,
        yearTo: 2000,
        selectedEra: 'ALL',
        selectedReign: 'ALL',
        searchQuery: 'Прибалтики и Бессарабии',
        onlyWithSyncLinks: false,
        focusedEventId: null,
        focusScope: 'sync_only',
        showEndNodes: true,
        showOverlapMatrix: false,
      },
    );
    expect(russiaSearch.matchingEvents.some((ev) => ev.id === '1914-ww1')).toBe(true);
  });

  it('preserves loaded on-demand campaign packs when background core hydration finishes concurrently', async () => {
    const { mockFetch } = createPublicFetchMock();
    vi.stubGlobal('fetch', mockFetch);

    await fetchTimelineRepository({ progressive: true });

    // Start core background hydration and campaign pack load concurrently
    const [hydratedSnap, campaignSnap] = await Promise.all([
      hydrateRemainingTimelineModules({ priority: true }),
      loadCampaignPackModules('ww1'),
    ]);

    expect(campaignSnap).not.toBeNull();
    expect(hydratedSnap).not.toBeNull();
    // Regardless of which promise resolved second, the repository must retain ww1 in loadedCampaignIds
    const finalSnap = await loadCampaignPackModules('ww1');
    expect(finalSnap).not.toBeNull();
    expect(finalSnap!.loadedCampaignIds).toContain('ww1');
    expect(finalSnap!.isFullyHydrated).toBe(true);
    expect(finalSnap!.files['data/campaigns/ww1/russia.json']).toBeDefined();
    expect(finalSnap!.files['data/campaigns/ww1/usa.json']).toBeDefined();
  });

  it('creates an isolated return snapshot, resets entry filters, and scopes navigation bounds during Campaign Mode', () => {
    const sourceState = {
      yearFrom: 1682,
      yearTo: 1825,
      branchSelection: {
        preset: 'overview' as const,
        overrides: { MAIN_RULERS: true, WAR_CONTINENTAL: false },
      },
      collapsedParents: { WAR_GROUP: true },
      selectedEra: 'imperial',
      selectedReign: 'peter1',
      searchQuery: 'Северная',
      selectedPersonKey: 'peter_i',
      selectedSyncTag: 'baltic',
      selectedMacroRegion: 'europe' as const,
      branchPairFilter: { branchA: 'MAIN_RULERS', branchB: 'WAR_CONTINENTAL' },
      onlyWithSyncLinks: true,
      syncLinkTypeFilter: 'causal' as const,
      auditUnlinkedMode: true,
    };

    const snapshot = createCampaignReturnSnapshot(sourceState);
    expect(snapshot).toEqual(sourceState);

    // Mutate source objects to verify deep isolation of nested structures
    sourceState.branchSelection.overrides.MAIN_RULERS = false;
    sourceState.collapsedParents.WAR_GROUP = false;
    sourceState.branchPairFilter.branchA = 'REFORMS_ECO';

    expect(snapshot.branchSelection.overrides.MAIN_RULERS).toBe(true);
    expect(snapshot.collapsedParents.WAR_GROUP).toBe(true);
    expect(snapshot.branchPairFilter?.branchA).toBe('MAIN_RULERS');

    const ww1Pack = {
      id: 'ww1',
      title: 'Первая мировая война',
      shortTitle: 'ПМВ 1914–1918',
      description: 'Углублённый разбор кампании 1914–1918 гг.',
      yearFrom: 1914,
      yearTo: 1918,
      parentEventId: '1914-ww1',
      branchIds: ['WW1_RUSSIA', 'WW1_GERMANY'],
      filePaths: ['data/campaigns/ww1/russia.json'],
      branches: [],
      eventCount: 31,
    };

    const entryDefaults = getCampaignEntryFilterDefaults(ww1Pack);
    expect(entryDefaults).toEqual({
      yearFrom: 1914,
      yearTo: 1918,
      selectedEra: 'ALL',
      selectedReign: 'ALL',
      searchQuery: '',
      selectedPersonKey: null,
      selectedSyncTag: null,
      selectedMacroRegion: 'all',
      branchPairFilter: null,
      onlyWithSyncLinks: false,
      syncLinkTypeFilter: 'all',
      auditUnlinkedMode: false,
    });

    const atlasBounds = { minYear: 862, maxYear: 2000 };
    expect(resolveCampaignNavigationBounds(null, atlasBounds)).toEqual(atlasBounds);
    expect(resolveCampaignNavigationBounds(ww1Pack, atlasBounds)).toEqual({
      minYear: 1914,
      maxYear: 1918,
    });
  });
});

