import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { parseMacroRegionParam } from '../engine/regionFilter';
import { serializeBranchSelection, type BranchSelection } from '../engine/layout/branchSelection';
import type { MacroRegionId } from '../types/timeline';

export interface TimelineUrlModalState {
  activeCardId: string | null;
  activeRulerModalId: string | null;
  activePersonModalKey: string | null;
  activeEraModalId: string | null;
  activeWindowModalRange: { from: number; to: number } | null;
}

export interface UseTimelineUrlSyncOptions extends TimelineUrlModalState {
  yearFrom: number | undefined;
  yearTo: number | undefined;
  searchQuery: string;
  selectedMacroRegion?: MacroRegionId;
  activeCampaignId?: string | null;
  branchSelection: BranchSelection;
  setYearFrom: Dispatch<SetStateAction<number | undefined>>;
  setYearTo: Dispatch<SetStateAction<number | undefined>>;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setSelectedMacroRegion?: Dispatch<SetStateAction<MacroRegionId>>;
  restoreBranchSelection: (value: string | null) => void;
  onPopCampaignFromUrl?: (campaignId: string | null) => void;
  onPopModalFromUrl: (next: {
    cardId: string | null;
    rulerId: string | null;
    personKey: string | null;
    eraId: string | null;
    windowRange: { from: number; to: number } | null;
  }) => void;
}

export function parseInitialYearBound<T extends number | undefined>(
  params: URLSearchParams, key: 'from' | 'to', fallback: T,
): number | T {
  const raw = params.get(key);
  return raw && /^\d{1,4}$/.test(raw) && Number(raw) > 0 ? Number(raw) : fallback;
}

export function resolveUrlYearRange(
  from: number | undefined,
  to: number | undefined,
  bounds: { minYear: number; maxYear: number },
  complete: boolean,
): { from: number; to: number } {
  const min = complete ? bounds.minYear : Math.min(bounds.minYear, from ?? Infinity, to ?? Infinity);
  const max = complete ? bounds.maxYear : Math.max(bounds.maxYear, from ?? -Infinity, to ?? -Infinity);
  const first = Math.min(max, Math.max(min, from ?? min));
  const last = Math.min(max, Math.max(min, to ?? max));
  return first <= last ? { from: first, to: last } : { from: min, to: max };
}

export function parseWindowRangeParam(raw: string | null): { from: number; to: number } | null {
  if (!raw) return null;
  const match = raw.trim().match(/^(\d{1,4})[-–](\d{1,4})$/);
  if (!match) return null;
  const from = Number(match[1]);
  const to = Number(match[2]);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0 || from > to) {
    return null;
  }
  return { from, to };
}

export function safelyReplaceUrlState(nextUrl: string): boolean {
  try {
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, '', nextUrl);
      return true;
    }
    return false;
  } catch {
    // Защита от DOMException: SecurityError при превышении лимита вызовов History API в браузере
    return false;
  }
}

export function useTimelineUrlSync({
  yearFrom,
  yearTo,
  searchQuery,
  selectedMacroRegion = 'all',
  activeCampaignId = null,
  activeCardId,
  activeRulerModalId,
  activePersonModalKey,
  activeEraModalId,
  activeWindowModalRange,
  branchSelection,
  setYearFrom,
  setYearTo,
  setSearchQuery,
  setSelectedMacroRegion,
  restoreBranchSelection,
  onPopCampaignFromUrl,
  onPopModalFromUrl,
}: UseTimelineUrlSyncOptions): void {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (yearFrom !== undefined) params.set('from', String(yearFrom));
      else params.delete('from');

      if (yearTo !== undefined) params.set('to', String(yearTo));
      else params.delete('to');

      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      else params.delete('search');

      if (selectedMacroRegion && selectedMacroRegion !== 'all') {
        params.set('region', selectedMacroRegion);
      } else {
        params.delete('region');
      }

      if (activeCampaignId) params.set('campaign', activeCampaignId);
      else params.delete('campaign');

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

      const branchParam = serializeBranchSelection(branchSelection);
      if (branchParam) params.set('branches', branchParam);
      else params.delete('branches');

      const query = params.toString();
      const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
      safelyReplaceUrlState(nextUrl);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [
    yearFrom,
    yearTo,
    searchQuery,
    selectedMacroRegion,
    activeCampaignId,
    activeCardId,
    activeRulerModalId,
    activePersonModalKey,
    activeEraModalId,
    activeWindowModalRange,
    branchSelection,
  ]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setYearFrom(parseInitialYearBound(params, 'from', undefined));
      setYearTo(parseInitialYearBound(params, 'to', undefined));
      setSearchQuery(params.get('search') ?? '');
      if (setSelectedMacroRegion) {
        setSelectedMacroRegion(parseMacroRegionParam(params.get('region')));
      }
      if (onPopCampaignFromUrl) {
        onPopCampaignFromUrl(params.get('campaign'));
      }

      onPopModalFromUrl({
        cardId: params.get('card'),
        rulerId: params.get('ruler'),
        personKey: params.get('person'),
        eraId: params.get('era'),
        windowRange: parseWindowRangeParam(params.get('window')),
      });

      restoreBranchSelection(params.get('branches'));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    setYearFrom,
    setYearTo,
    setSearchQuery,
    setSelectedMacroRegion,
    restoreBranchSelection,
    onPopCampaignFromUrl,
    onPopModalFromUrl,
  ]);
}
