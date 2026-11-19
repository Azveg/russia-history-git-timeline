import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { computeBranchPresetMap } from '../engine/timelineEngine';
import type { BranchDefinition } from '../types/timeline';

export interface TimelineUrlModalState {
  activeCardId: string | null;
  activeRulerModalId: string | null;
  activePersonModalKey: string | null;
  activeEraModalId: string | null;
  activeWindowModalRange: { from: number; to: number } | null;
}

export interface UseTimelineUrlSyncOptions extends TimelineUrlModalState {
  yearFrom: number;
  yearTo: number;
  searchQuery: string;
  activeBranches: Record<string, boolean>;
  branches: BranchDefinition[];
  setYearFrom: Dispatch<SetStateAction<number>>;
  setYearTo: Dispatch<SetStateAction<number>>;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setActiveBranches: Dispatch<SetStateAction<Record<string, boolean>>>;
  onPopModalFromUrl: (next: {
    cardId: string | null;
    rulerId: string | null;
    personKey: string | null;
    eraId: string | null;
    windowRange: { from: number; to: number } | null;
  }) => void;
}

export function parseInitialYearBound(params: URLSearchParams, key: 'from' | 'to', fallback: number): number {
  const raw = Number(params.get(key));
  return Number.isFinite(raw) && raw >= 862 && raw <= 2000 ? raw : fallback;
}

export function parseWindowRangeParam(raw: string | null): { from: number; to: number } | null {
  if (!raw) return null;
  const match = raw.trim().match(/^(\d{3,4})[-–](\d{3,4})$/);
  if (!match) return null;
  const from = Number(match[1]);
  const to = Number(match[2]);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 862 || to > 2000 || from > to) {
    return null;
  }
  return { from, to };
}

export function useTimelineUrlSync({
  yearFrom,
  yearTo,
  searchQuery,
  activeCardId,
  activeRulerModalId,
  activePersonModalKey,
  activeEraModalId,
  activeWindowModalRange,
  activeBranches,
  branches,
  setYearFrom,
  setYearTo,
  setSearchQuery,
  setActiveBranches,
  onPopModalFromUrl,
}: UseTimelineUrlSyncOptions): void {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (yearFrom !== 862) params.set('from', String(yearFrom));
    else params.delete('from');

    if (yearTo !== 2000) params.set('to', String(yearTo));
    else params.delete('to');

    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    else params.delete('search');

    if (activeCardId) params.set('card', activeCardId);
    else params.delete('card');

    if (activeRulerModalId) params.set('ruler', activeRulerModalId);
    else params.delete('ruler');

    if (activePersonModalKey) params.set('person', activePersonModalKey);
    else params.delete('person');

    if (activeEraModalId) params.set('era', activeEraModalId);
    else params.delete('era');

    if (activeWindowModalRange) {
      params.set('window', `${activeWindowModalRange.from}-${activeWindowModalRange.to}`);
    } else {
      params.delete('window');
    }

    if (branches.length > 0 && Object.keys(activeBranches).length > 0) {
      const overviewMap = computeBranchPresetMap(branches, 'overview');
      const leafBranches = branches.filter((b) => !b.isGroup);
      const isOverviewDefault = leafBranches.every(
        (b) => Boolean(activeBranches[b.id]) === Boolean(overviewMap[b.id]),
      );
      if (isOverviewDefault) {
        params.delete('branches');
      } else {
        const enabledIds = leafBranches
          .filter((b) => activeBranches[b.id])
          .map((b) => b.id);
        params.set('branches', enabledIds.join(','));
      }
    }

    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, '', nextUrl);
    }
  }, [
    yearFrom,
    yearTo,
    searchQuery,
    activeCardId,
    activeRulerModalId,
    activePersonModalKey,
    activeEraModalId,
    activeWindowModalRange,
    activeBranches,
    branches,
  ]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setYearFrom(parseInitialYearBound(params, 'from', 862));
      setYearTo(parseInitialYearBound(params, 'to', 2000));
      setSearchQuery(params.get('search') ?? '');

      onPopModalFromUrl({
        cardId: params.get('card'),
        rulerId: params.get('ruler'),
        personKey: params.get('person'),
        eraId: params.get('era'),
        windowRange: parseWindowRangeParam(params.get('window')),
      });

      if (branches.length > 0) {
        const urlBranchesRaw = params.get('branches');
        if (!urlBranchesRaw) {
          setActiveBranches(computeBranchPresetMap(branches, 'overview'));
        } else {
          const requestedIds = new Set(
            urlBranchesRaw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          );
          const leafBranches = branches.filter((b) => !b.isGroup);
          if (leafBranches.some((b) => requestedIds.has(b.id))) {
            const nextMap: Record<string, boolean> = {};
            leafBranches.forEach((b) => {
              nextMap[b.id] = b.isTimeAxis ? true : requestedIds.has(b.id);
            });
            setActiveBranches(nextMap);
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [branches, setYearFrom, setYearTo, setSearchQuery, setActiveBranches, onPopModalFromUrl]);
}
