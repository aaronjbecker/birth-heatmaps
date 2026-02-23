/**
 * Unit tests for compare-line-data.ts
 */
import { describe, it, expect } from 'vitest';
import type { CountryHeatmapData, HeatmapCell } from './types';
import {
  extractAnnualAverages,
  extractAnnualBirths,
  extractAnnualPopulation,
  extractMonthlyValues,
  extractMonthlyBirths,
  extractMonthlyPopulation,
  hasRawCounts,
} from './compare-line-data';

function makeData(cells: HeatmapCell[], overrides?: Partial<CountryHeatmapData>): CountryHeatmapData {
  return {
    country: { code: 'test', name: 'Test' },
    metric: 'daily_fertility_rate',
    title: 'Test',
    colorScale: { type: 'sequential', domain: [0, 10], scheme: 'turbo' },
    years: [...new Set(cells.map(c => c.year))].sort(),
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    data: cells,
    sources: [],
    generatedAt: '',
    ...overrides,
  };
}

describe('extractAnnualAverages', () => {
  it('computes average of non-null values per year', () => {
    const data = makeData([
      { year: 2020, month: 1, value: 10 },
      { year: 2020, month: 2, value: 20 },
      { year: 2020, month: 3, value: null },
      { year: 2021, month: 1, value: 30 },
    ]);

    const result = extractAnnualAverages(data);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ x: 2020, y: 15 });
    expect(result[1]).toEqual({ x: 2021, y: 30 });
  });

  it('returns empty array for all-null data', () => {
    const data = makeData([
      { year: 2020, month: 1, value: null },
      { year: 2020, month: 2, value: null },
    ]);

    expect(extractAnnualAverages(data)).toEqual([]);
  });

  it('returns empty array for empty data', () => {
    const data = makeData([]);
    expect(extractAnnualAverages(data)).toEqual([]);
  });

  it('returns sorted results', () => {
    const data = makeData([
      { year: 2022, month: 1, value: 5 },
      { year: 2020, month: 1, value: 10 },
      { year: 2021, month: 1, value: 7 },
    ]);

    const result = extractAnnualAverages(data);
    expect(result.map(p => p.x)).toEqual([2020, 2021, 2022]);
  });
});

describe('extractAnnualBirths', () => {
  it('sums births per year', () => {
    const data = makeData([
      { year: 2020, month: 1, value: 5, births: 1000 },
      { year: 2020, month: 2, value: 5, births: 1200 },
      { year: 2021, month: 1, value: 5, births: 900 },
    ]);

    const result = extractAnnualBirths(data);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ x: 2020, y: 2200 });
    expect(result[1]).toEqual({ x: 2021, y: 900 });
  });

  it('skips cells with null births', () => {
    const data = makeData([
      { year: 2020, month: 1, value: 5, births: 1000 },
      { year: 2020, month: 2, value: 5, births: null },
    ]);

    const result = extractAnnualBirths(data);
    expect(result[0].y).toBe(1000);
  });

  it('returns empty array when no births field', () => {
    const data = makeData([
      { year: 2020, month: 1, value: 5 },
    ]);

    expect(extractAnnualBirths(data)).toEqual([]);
  });
});

describe('extractAnnualPopulation', () => {
  it('averages population per year', () => {
    const data = makeData([
      { year: 2020, month: 1, value: 5, population: 50000000 },
      { year: 2020, month: 2, value: 5, population: 50100000 },
    ]);

    const result = extractAnnualPopulation(data);
    expect(result).toHaveLength(1);
    expect(result[0].y).toBe(50050000);
  });
});

describe('extractMonthlyValues', () => {
  it('converts to decimal year format', () => {
    const data = makeData([
      { year: 2020, month: 1, value: 10 },
      { year: 2020, month: 7, value: 12 },
    ]);

    const result = extractMonthlyValues(data);
    expect(result).toHaveLength(2);
    expect(result[0].x).toBeCloseTo(2020.0);
    expect(result[0].y).toBe(10);
    expect(result[1].x).toBeCloseTo(2020.5);
    expect(result[1].y).toBe(12);
  });

  it('skips null values', () => {
    const data = makeData([
      { year: 2020, month: 1, value: 10 },
      { year: 2020, month: 2, value: null },
    ]);

    const result = extractMonthlyValues(data);
    expect(result).toHaveLength(1);
  });

  it('returns sorted results for unordered input', () => {
    const data = makeData([
      { year: 2021, month: 1, value: 5 },
      { year: 2020, month: 6, value: 10 },
      { year: 2020, month: 1, value: 8 },
    ]);

    const result = extractMonthlyValues(data);
    expect(result[0].x).toBeLessThan(result[1].x);
    expect(result[1].x).toBeLessThan(result[2].x);
  });
});

describe('extractMonthlyBirths', () => {
  it('extracts monthly births with decimal years', () => {
    const data = makeData([
      { year: 2020, month: 1, value: 5, births: 30000 },
      { year: 2020, month: 7, value: 5, births: 32000 },
    ]);

    const result = extractMonthlyBirths(data);
    expect(result).toHaveLength(2);
    expect(result[0].x).toBeCloseTo(2020.0);
    expect(result[0].y).toBe(30000);
    expect(result[1].x).toBeCloseTo(2020.5);
    expect(result[1].y).toBe(32000);
  });
});

describe('extractMonthlyPopulation', () => {
  it('extracts monthly population with decimal years', () => {
    const data = makeData([
      { year: 2020, month: 1, value: 5, population: 50000000 },
      { year: 2020, month: 12, value: 5, population: 50100000 },
    ]);

    const result = extractMonthlyPopulation(data);
    expect(result).toHaveLength(2);
    expect(result[0].x).toBeCloseTo(2020.0);
    expect(result[1].x).toBeCloseTo(2020 + 11 / 12);
  });
});

describe('hasRawCounts', () => {
  it('returns true when births are present', () => {
    const data = makeData([
      { year: 2020, month: 1, value: 5, births: 1000 },
    ]);
    expect(hasRawCounts(data)).toBe(true);
  });

  it('returns true when population is present', () => {
    const data = makeData([
      { year: 2020, month: 1, value: 5, population: 50000000 },
    ]);
    expect(hasRawCounts(data)).toBe(true);
  });

  it('returns false when neither births nor population present', () => {
    const data = makeData([
      { year: 2020, month: 1, value: 0.0833 },
    ]);
    expect(hasRawCounts(data)).toBe(false);
  });

  it('returns false for null births and population', () => {
    const data = makeData([
      { year: 2020, month: 1, value: 5, births: null, population: null },
    ]);
    expect(hasRawCounts(data)).toBe(false);
  });

  it('returns false for empty data', () => {
    const data = makeData([]);
    expect(hasRawCounts(data)).toBe(false);
  });
});
