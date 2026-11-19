import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const RELOAD_GUARD_KEY = 'chronograph_module_reload_ts';
const RELOAD_COOLDOWN_MS = 15_000;

export function isModuleImportError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = `${error.name} ${error.message}`.toLowerCase();
  return (
    msg.includes('importing a module script failed') ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('chunkloaderror') ||
    msg.includes('loading chunk') ||
    msg.includes('dynamically imported module')
  );
}

export function attemptModuleRecoveryReload(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const rawTs = window.sessionStorage.getItem(RELOAD_GUARD_KEY);
    const lastReloadAt = rawTs ? Number(rawTs) : 0;
    const now = Date.now();
    if (Number.isFinite(lastReloadAt) && now - lastReloadAt < RELOAD_COOLDOWN_MS) {
      return false;
    }
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  retries = 2,
): LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await importer();
      } catch (error) {
        lastError = error;
        if (!isModuleImportError(error) || attempt === retries) {
          break;
        }
        await wait(250 * (attempt + 1));
      }
    }

    if (isModuleImportError(lastError) && attemptModuleRecoveryReload()) {
      // Keep Suspense fallback visible while the browser performs a clean reload.
      return new Promise<{ default: T }>(() => {});
    }

    throw lastError;
  });
}
