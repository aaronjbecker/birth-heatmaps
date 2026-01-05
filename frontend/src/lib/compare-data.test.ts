/**
 * Unit tests for compare-data.ts utilities.
 */
import { describe, it, expect } from 'vitest';
import type { CountryHeatmapData, HeatmapCell, ColorScaleConfig } from './types';
import {
  computeCommonYearRange,
  alignDataToRange,
  getAlignedYears,
  computeUnifiedColorScale,
  createAlignedCountryData,
} from './compare-data';

// Helper to create mock data
function createMockCountryData(
  code: string,
  years: number[],
  values: (number | null)[] = [],
  colorScale: ColorScaleConfig = { type: 'sequential', domain: [0, 10], scheme: 'turbo' }
): CountryHeatmapData {
  const data: HeatmapCell[] = [];
  let valueIndex = 0;

  for (const year of years) {
    for (let month = 1; month <= 12; month++) {
      data.push({
        year,
        month,
        value: values.length > valueIndex ? values[valueIndex] : Math.random() * 10,
        source: 'test',
      });
      valueIndex++;
    }
  }

  return {
    country: { code, name: code.toUpperCase() },
    metric: 'daily_fertility_rate',
    title: 'Test',
    colorScale,
    years,
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    data,
    sources: ['test'],
    generatedAt: new Date().toISOString(),
  };
}

describe('computeCommonYearRange', () => {
  it('returns default range for empty datasets', () => {
    const result = computeCommonYearRange([]);
    expect(result[0]).toBeLessThan(result[1]);
  });

  it('returns the single country range for one dataset', () => {
    const data = createMockCountryData('usa', [2000, 2001, 2002]);
    const result = computeCommonYearRange([data]);
    expect(result).toEqual([2000, 2002]);
  });

  it('finds latest start year across multiple countries', () => {
    const usa = createMockCountryData('usa', [1990, 1991, 1992, 1993, 1994]);
    const norway = createMockCountryData('norway', [1992, 1993, 1994, 1995, 1996]);
    const result = computeCommonYearRange([usa, norway]);
    expect(result[0]).toBe(1992); // Latest start
  });

  it('finds latest end year across multiple countries', () => {
    const usa = createMockCountryData('usa', [2000, 2001, 2002, 2003]);
    const norway = createMockCountryData('norway', [2000, 2001, 2002, 2003, 2004, 2005]);
    const result = computeCommonYearRange([usa, norway]);
    expect(result[1]).toBe(2005); // Latest end
  });

  it('handles countries with different year ranges', () => {
    const usa = createMockCountryData('usa', [1990, 1991, 1992, 1993]);
    const norway = createMockCountryData('norway', [1992, 1993, 1994, 1995]);
    const japan = createMockCountryData('japan', [1991, 1992, 1993, 1994, 1995, 1996]);

    const result = computeCommonYearRange([usa, norway, japan]);
    expect(result[0]).toBe(1992); // All countries have data from 1992
    expect(result[1]).toBe(1996); // Latest end year
  });
});

describe('alignDataToRange', () => {
  it('filters out years before common start', () => {
    const data = createMockCountryData('usa', [1990, 1991, 1992, 1993]);
    const aligned = alignDataToRange(data, [1992, 1993]);

    const years = [...new Set(aligned.map((c) => c.year))];
    expect(years).toEqual([1992, 1993]);
    expect(aligned.some((c) => c.year === 1990)).toBe(false);
    expect(aligned.some((c) => c.year === 1991)).toBe(false);
  });

  it('fills null cells for years after country data ends', () => {
    const data = createMockCountryData('usa', [2000, 2001, 2002]);
    const aligned = alignDataToRange(data, [2000, 2004]);

    // Should have data for 2000-2004
    const years = [...new Set(aligned.map((c) => c.year))].sort((a, b) => a - b);
    expect(years).toEqual([2000, 2001, 2002, 2003, 2004]);

    // Years 2003 and 2004 should have null values
    const nullYears = aligned.filter((c) => c.value === null);
    expect(nullYears.every((c) => c.year >= 2003)).toBe(true);
    expect(nullYears.length).toBe(24); // 2 years × 12 months
  });

  it('preserves intermediate null values', () => {
    const years = [2000, 2001, 2002];
    const values: (number | null)[] = [];

    // Create values with nulls in middle year
    for (let i = 0; i < 36; i++) {
      if (i >= 12 && i < 24) {
        values.push(null); // All of 2001 is null
      } else {
        values.push(5);
      }
    }

    const data = createMockCountryData('usa', years, values);
    const aligned = alignDataToRange(data, [2000, 2002]);

    // Should still have nulls for 2001
    const nullCells = aligned.filter((c) => c.year === 2001 && c.value === null);
    expect(nullCells.length).toBe(12);
  });

  it('maintains correct sort order', () => {
    const data = createMockCountryData('usa', [2000, 2001]);
    const aligned = alignDataToRange(data, [2000, 2002]);

    // Check that cells are sorted by year, then month
    for (let i = 1; i < aligned.length; i++) {
      const prev = aligned[i - 1];
      const curr = aligned[i];
      const prevKey = prev.year * 100 + prev.month;
      const currKey = curr.year * 100 + curr.month;
      expect(currKey).toBeGreaterThan(prevKey);
    }
  });
});

describe('getAlignedYears', () => {
  it('generates array of years within common range', () => {
    const result = getAlignedYears([1990, 1995], [1992, 1997]);
    expect(result).toEqual([1992, 1993, 1994, 1995, 1996, 1997]);
  });

  it('handles single year range', () => {
    const result = getAlignedYears([2000], [2000, 2000]);
    expect(result).toEqual([2000]);
  });
});

describe('computeUnifiedColorScale', () => {
  it('returns default scale for empty datasets', () => {
    const result = computeUnifiedColorScale([], [2000, 2005]);
    expect(result.type).toBe('sequential');
  });

  it('uses first dataset config as base', () => {
    const data1 = createMockCountryData('usa', [2000], [], {
      type: 'diverging',
      domain: [0, 0.5, 1],
      scheme: 'RdBu',
    });

    const result = computeUnifiedColorScale([data1], [2000, 2000]);
    expect(result.type).toBe('diverging');
    expect(result.scheme).toBe('RdBu');
  });

  it('computes min/max across all countries', () => {
    // Create data with known values
    const values1 = Array(12).fill(5);
    const values2 = Array(12).fill(15);

    const data1 = createMockCountryData('usa', [2000], values1);
    const data2 = createMockCountryData('norway', [2000], values2);

    const result = computeUnifiedColorScale([data1, data2], [2000, 2000]);
    expect(result.domain[0]).toBe(5);
    expect(result.domain[1]).toBe(15);
  });

  it('handles diverging scale with center value', () => {
    const values = Array(12).fill(0.08); // Around 8%

    const data = createMockCountryData('usa', [2000], values, {
      type: 'diverging',
      domain: [0.06, 0.0833, 0.10],
      scheme: 'RdBu',
    });

    const result = computeUnifiedColorScale([data], [2000, 2000]);
    expect(result.type).toBe('diverging');
    expect(result.domain.length).toBe(3);
  });

  it('ignores null values when computing domain', () => {
    const values: (number | null)[] = [null, null, null, 5, 10, 15, null, null, null, null, null, null];
    const data = createMockCountryData('usa', [2000], values);

    const result = computeUnifiedColorScale([data], [2000, 2000]);
    expect(result.domain[0]).toBe(5);
    expect(result.domain[1]).toBe(15);
  });
});

describe('createAlignedCountryData', () => {
  it('preserves original metadata', () => {
    const original = createMockCountryData('usa', [2000, 2001, 2002]);
    const aligned = createAlignedCountryData(original, [2001, 2003]);

    expect(aligned.country).toEqual(original.country);
    expect(aligned.metric).toBe(original.metric);
    expect(aligned.title).toBe(original.title);
    expect(aligned.sources).toEqual(original.sources);
  });

  it('updates years array to match common range', () => {
    const original = createMockCountryData('usa', [2000, 2001, 2002]);
    const aligned = createAlignedCountryData(original, [2001, 2004]);

    expect(aligned.years).toEqual([2001, 2002, 2003, 2004]);
  });

  it('uses colorScaleOverride when provided', () => {
    const original = createMockCountryData('usa', [2000], [], {
      type: 'sequential',
      domain: [0, 10],
      scheme: 'turbo',
    });

    const override: ColorScaleConfig = {
      type: 'diverging',
      domain: [0, 5, 10],
      scheme: 'RdBu',
    };

    const aligned = createAlignedCountryData(original, [2000, 2000], override);
    expect(aligned.colorScale).toEqual(override);
  });

  it('uses original colorScale when no override provided', () => {
    const original = createMockCountryData('usa', [2000], [], {
      type: 'sequential',
      domain: [0, 10],
      scheme: 'turbo',
    });

    const aligned = createAlignedCountryData(original, [2000, 2000]);
    expect(aligned.colorScale).toEqual(original.colorScale);
  });
});
