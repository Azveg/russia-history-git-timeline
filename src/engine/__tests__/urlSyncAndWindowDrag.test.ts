import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  parseInitialYearBound,
  parseWindowRangeParam,
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
    expect(parseInitialYearBound(invalidParams, 'to', 2000)).toBe(2000);

    expect(parseWindowRangeParam('1700-1721')).toEqual({ from: 1700, to: 1721 });
    expect(parseWindowRangeParam('1800-1700')).toBeNull();
    expect(parseWindowRangeParam('invalid')).toBeNull();
  });

  it('transitions axis resolution cleanly when narrowing or dragging window to micro intervals', () => {
    expect(detectAxisResolution(862, 2000)).toBe('year');
    expect(detectAxisResolution(1700, 1712)).toBe('month');
    expect(detectAxisResolution(1700, 1702)).toBe('day');
    expect(detectAxisResolution(1700, 1700)).toBe('day');
  });
});
