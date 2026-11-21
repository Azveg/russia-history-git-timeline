import { startTransition, useCallback, useEffect, useState } from 'react';
import {
  fetchTimelineRepository,
  hydrateRemainingTimelineModules,
  type TimelineRepositorySnapshot,
} from '../engine/repository/timelineRepository';
import type { SyncManifest, TimelineDataFile } from '../types/timeline';

const EMPTY_FILES: Record<string, TimelineDataFile> = {};

export interface UseTimelineDataOptions {
  initialParams: URLSearchParams;
}

export interface UseTimelineDataResult {
  manifest: SyncManifest | null;
  filesMap: Record<string, TimelineDataFile>;
  loading: boolean;
  loadError: string | null;
  isFullyHydrated: boolean;
  isHydrating: boolean;
  isRetrying: boolean;
  partialLoadWarning: string | null;
  reloadRepository: () => Promise<void>;
  ensureAllModulesLoaded: (options?: { priority?: boolean }) => Promise<void>;
}

export function useTimelineData({ initialParams }: UseTimelineDataOptions): UseTimelineDataResult {
  const [snapshot, setSnapshot] = useState<TimelineRepositorySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [hydrationError, setHydrationError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

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

  const loadRepositoryData = useCallback(async () => {
    setLoading(true);
    setInitialLoadError(null);

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

  // Phase 2: hydrate remaining non-default modules smoothly during browser idle time
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
  };
}
