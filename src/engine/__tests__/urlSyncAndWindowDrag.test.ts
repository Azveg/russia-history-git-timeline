import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  parseInitialYearBound,
  parseWindowRangeParam,
  resolveUrlYearRange,
  safelyReplaceUrlState,
} from '../../hooks/useTimelineUrlSync';
import { detectAxisResolution } from '../timelineEngine';

describe('Timeline window dragging & URL sync resilience', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('catches browser History API SecurityError when replaceState rate limit is exceeded', () => {
    const mockWindow = {
      location: {
        pathname: '/',
        search: '?from=1700&to=1800',
        hash: '',
      },
      history: {
        replaceState: vi.fn(() => {
          const err = new Error('Attempt to use history.replaceState() more than 100 times per 30 seconds');
          err.name = 'SecurityError';
          throw err;
        }),
      },
    };
    vi.stubGlobal('window', mockWindow);

    expect(() => safelyReplaceUrlState('/?from=1705&to=1805')).not.toThrow();
    expect(safelyReplaceUrlState('/?from=1705&to=1805')).toBe(false);
    expect(mockWindow.history.replaceState).toHaveBeenCalledTimes(2);
  });

  it('skips redundant history.replaceState calls when target URL matches current location', () => {
    const replaceStateSpy = vi.fn();
    vi.stubGlobal('window', {
      location: {
        pathname: '/',
        search: '?from=1700&to=1800',
        hash: '',
      },
      history: {
        replaceState: replaceStateSpy,
      },
    });

    expect(safelyReplaceUrlState('/?from=1700&to=1800')).toBe(false);
    expect(replaceStateSpy).not.toHaveBeenCalled();

    expect(safelyReplaceUrlState('/?from=1710&to=1810')).toBe(true);
    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/?from=1710&to=1810');
  });

  it('parses URL year bounds and window range safely across valid and invalid inputs', () => {
    const validParams = new URLSearchParams('from=1682&to=1725');
    expect(parseInitialYearBound(validParams, 'from', 862)).toBe(1682);
    expect(parseInitialYearBound(validParams, 'to', 2000)).toBe(1725);

    const invalidParams = new URLSearchParams('from=abc&to=9999');
    expect(parseInitialYearBound(invalidParams, 'from', 862)).toBe(862);
    expect(parseInitialYearBound(invalidParams, 'to', 2000)).toBe(9999);
    expect(resolveUrlYearRange(undefined, 9999, { minYear: 862, maxYear: 2019 }, true)).toEqual({ from: 862, to: 2019 });

    expect(parseWindowRangeParam('1700-1721')).toEqual({ from: 1700, to: 1721 });
    expect(parseWindowRangeParam('1800-1700')).toBeNull();
    expect(parseWindowRangeParam('invalid')).toBeNull();
  });

  it('restores years outside the initial modules and validates against the full data bounds', () => {
    const params = new URLSearchParams('from=2005&to=2010&window=2005-2010');
    const from = parseInitialYearBound(params, 'from', undefined);
    const to = parseInitialYearBound(params, 'to', undefined);
    expect(resolveUrlYearRange(from, to, { minYear: 862, maxYear: 2000 }, false)).toEqual({ from: 2005, to: 2010 });
    expect(resolveUrlYearRange(from, to, { minYear: 862, maxYear: 2019 }, true)).toEqual({ from: 2005, to: 2010 });
    expect(parseWindowRangeParam(params.get('window'))).toEqual({ from: 2005, to: 2010 });
    expect(resolveUrlYearRange(1900, 1700, { minYear: 862, maxYear: 2019 }, true)).toEqual({ from: 862, to: 2019 });
  });

  it('transitions axis resolution cleanly when narrowing or dragging window to micro intervals', () => {
    expect(detectAxisResolution(862, 2000)).toBe('year');
    expect(detectAxisResolution(1700, 1712)).toBe('month');
    expect(detectAxisResolution(1700, 1702)).toBe('day');
    expect(detectAxisResolution(1700, 1700)).toBe('day');
  });
});
