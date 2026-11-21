import { parseBranchSelection } from '../engine/layout/branchSelection';
import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchTimelineRepository,
  hydrateRemainingTimelineModules,
  loadCampaignPackModules,
  type TimelineRepositorySnapshot,
} from '../engine/repository/timelineRepository';
import type { CampaignPackRegistryEntry, SyncManifest, TimelineDataFile } from '../types/timeline';

const EMPTY_FILES: Record<string, TimelineDataFile> = {};
const EMPTY_CAMPAIGN_PACKS: CampaignPackRegistryEntry[] = [];
const EMPTY_STRING_LIST: string[] = [];

export interface UseTimelineDataOptions {
  initialParams: URLSearchParams;
}

export interface UseTimelineDataResult {
  manifest: SyncManifest | null;
  filesMap: Record<string, TimelineDataFile>;
  campaignPacks: CampaignPackRegistryEntry[];
  loadedCampaignIds: string[];
  failedCampaignIds: string[];
  loadingCampaignId: string | null;
  loading: boolean;
  loadError: string | null;
  isFullyHydrated: boolean;
  isHydrating: boolean;
  isRetrying: boolean;
  partialLoadWarning: string | null;
  reloadRepository: () => Promise<void>;
  ensureAllModulesLoaded: (options?: { priority?: boolean }) => Promise<void>;
  loadCampaignPack: (campaignId: string) => Promise<boolean>;
}

export function useTimelineData({ initialParams }: UseTimelineDataOptions): UseTimelineDataResult {
  const [snapshot, setSnapshot] = useState<TimelineRepositorySnapshot | null>(null);
  const snapshotRef = useRef<TimelineRepositorySnapshot | null>(null);
  snapshotRef.current = snapshot;
  const [loading, setLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [hydrationError, setHydrationError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [loadingCampaignId, setLoadingCampaignId] = useState<string | null>(null);

  const ensureAllModulesLoaded = useCallback(async (options?: { priority?: boolean }) => {
    try {
      const result = await hydrateRemainingTimelineModules(options);
      if (result) {
        startTransition(() => {
          setSnapshot(result);
          setHydrationError(false);
        });
      }
    } catch {
      setHydrationError(true);
    }
  }, []);

  const loadCampaignPack = useCallback(async (campaignId: string): Promise<boolean> => {
    if (snapshotRef.current?.loadedCampaignIds.includes(campaignId)) {
      return true;
    }
    setLoadingCampaignId(campaignId);
    try {
      const result = await loadCampaignPackModules(campaignId);
      if (result) {
        // Commit snapshot and clear loadingCampaignId in the same synchronous React batch
        // to avoid startTransition starvation against the campaign auto-load effect.
        setSnapshot(result);
        setLoadingCampaignId((prev) => (prev === campaignId ? null : prev));
        return result.loadedCampaignIds.includes(campaignId);
      }
      setLoadingCampaignId((prev) => (prev === campaignId ? null : prev));
      return false;
    } catch {
      setLoadingCampaignId((prev) => (prev === campaignId ? null : prev));
      return false;
    }
  }, []);

  const loadRepositoryData = useCallback(async () => {
    setLoading(true);
    setInitialLoadError(null);

    const selection = parseBranchSelection(initialParams.get('branches'));
    const requestedBranches = Object.keys(selection.overrides).filter((id) => selection.overrides[id]);

    try {
      const repo = await fetchTimelineRepository({
        progressive: true,
        requiredBranchIds: requestedBranches,
        target: {
          cardId: initialParams.get('card') ?? undefined,
          personKey: initialParams.get('person') ?? undefined,
          campaignId: initialParams.get('campaign') ?? undefined,
        },
      });
      setSnapshot(repo);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка загрузки данных';
      setInitialLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [initialParams]);

  useEffect(() => {
    void loadRepositoryData();
  }, [loadRepositoryData]);

  const failedModuleCount = snapshot?.failedModulePaths.length ?? 0;
  const hasUnattemptedModules =
    (snapshot?.missingModulePaths.length ?? 0) > failedModuleCount && !hydrationError;

  // Phase 2: hydrate remaining non-default core modules smoothly during browser idle time
  // (on_demand campaign packs are excluded from missingModulePaths and only fetched when requested)
  useEffect(() => {
    if (loading || !hasUnattemptedModules) return;

    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof win.requestIdleCallback === 'function') {
      const idleId = win.requestIdleCallback(() => {
        void ensureAllModulesLoaded({ priority: false });
      }, { timeout: 1200 });
      return () => {
        win.cancelIdleCallback?.(idleId);
      };
    }

    const timer = window.setTimeout(() => {
      void ensureAllModulesLoaded({ priority: false });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loading, hasUnattemptedModules, ensureAllModulesLoaded]);

  const reloadRepository = useCallback(async () => {
    if (!snapshot) {
      await loadRepositoryData();
      return;
    }
    setIsRetrying(true);
    try {
      await ensureAllModulesLoaded({ priority: true });
    } finally {
      setIsRetrying(false);
    }
  }, [snapshot, loadRepositoryData, ensureAllModulesLoaded]);

  const hasLoadedModules = snapshot?.manifest.mountedFiles.some(
    (module) => module.enabled && Boolean(snapshot.files[module.path]),
  ) ?? false;
  const hasFailures = failedModuleCount > 0 || hydrationError;
  const loadError = initialLoadError ?? (
    hasFailures && !hasLoadedModules && !hasUnattemptedModules
      ? 'Исторические данные временно недоступны.'
      : null
  );

  return {
    manifest: snapshot?.manifest ?? null,
    filesMap: snapshot?.files ?? EMPTY_FILES,
    campaignPacks: snapshot?.campaignPacks ?? EMPTY_CAMPAIGN_PACKS,
    loadedCampaignIds: snapshot?.loadedCampaignIds ?? EMPTY_STRING_LIST,
    failedCampaignIds: snapshot?.failedCampaignIds ?? EMPTY_STRING_LIST,
    loadingCampaignId,
    loading: loading || (!hasLoadedModules && hasUnattemptedModules),
    loadError,
    isFullyHydrated: snapshot?.isFullyHydrated ?? false,
    isHydrating: hasUnattemptedModules || isRetrying,
    isRetrying,
    partialLoadWarning: hasFailures && hasLoadedModules
      ? 'Часть исторических данных недоступна. Поиск и аналитика могут показывать неполные результаты.'
      : null,
    reloadRepository,
    ensureAllModulesLoaded,
    loadCampaignPack,
  };
}
