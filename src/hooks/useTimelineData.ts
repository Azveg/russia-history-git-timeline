import { useCallback, useEffect, useState } from 'react';
import {
  fetchTimelineRepository,
  hydrateRemainingTimelineModules,
} from '../engine/repository/timelineRepository';
import type { SyncManifest, TimelineDataFile } from '../types/timeline';

export interface UseTimelineDataOptions {
  initialParams: URLSearchParams;
}

export interface UseTimelineDataResult {
  manifest: SyncManifest | null;
  filesMap: Record<string, TimelineDataFile>;
  loading: boolean;
  loadError: string | null;
  isFullyHydrated: boolean;
  reloadRepository: () => Promise<void>;
  ensureAllModulesLoaded: () => Promise<void>;
}

export function useTimelineData({ initialParams }: UseTimelineDataOptions): UseTimelineDataResult {
  const [manifest, setManifest] = useState<SyncManifest | null>(null);
  const [filesMap, setFilesMap] = useState<Record<string, TimelineDataFile>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFullyHydrated, setIsFullyHydrated] = useState(false);

  const ensureAllModulesLoaded = useCallback(async () => {
    try {
      const fullSnapshot = await hydrateRemainingTimelineModules();
      if (fullSnapshot) {
        setManifest(fullSnapshot.manifest);
        setFilesMap(fullSnapshot.files);
        setIsFullyHydrated(Boolean(fullSnapshot.isFullyHydrated));
      }
    } catch {
      // Non-fatal background hydration error; core modules remain interactive
    }
  }, []);

  const loadRepositoryData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const hasDeepLinkOrSearch = Boolean(
      initialParams.get('card') ||
        initialParams.get('person') ||
        initialParams.get('search'),
    );
    const requestedBranches = (initialParams.get('branches') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const repo = await fetchTimelineRepository({
        progressive: !hasDeepLinkOrSearch,
        requiredBranchIds: requestedBranches,
      });
      setManifest(repo.manifest);
      setFilesMap(repo.files);
      setIsFullyHydrated(Boolean(repo.isFullyHydrated));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка загрузки данных';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [initialParams]);

  useEffect(() => {
    void loadRepositoryData();
  }, [loadRepositoryData]);

  // Phase 2: hydrate remaining non-default modules during browser idle time
  useEffect(() => {
    if (loading || loadError || !manifest || isFullyHydrated) return;

    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof win.requestIdleCallback === 'function') {
      const idleId = win.requestIdleCallback(() => {
        void ensureAllModulesLoaded();
      }, { timeout: 1800 });
      return () => {
        win.cancelIdleCallback?.(idleId);
      };
    }

    const timer = window.setTimeout(() => {
      void ensureAllModulesLoaded();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [loading, loadError, manifest, isFullyHydrated, ensureAllModulesLoaded]);

  return {
    manifest,
    filesMap,
    loading,
    loadError,
    isFullyHydrated,
    reloadRepository: loadRepositoryData,
    ensureAllModulesLoaded,
  };
}
