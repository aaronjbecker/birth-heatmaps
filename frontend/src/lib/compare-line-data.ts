/**
 * Data extraction utilities for Compare page line charts.
 * Transforms HeatmapCell[] data into time series suitable for multi-line SVG charts.
 */

import type { CountryHeatmapData } from './types';

/** A single point in a time series */
export interface TimeSeriesPoint {
  /** Year (integer for annual, decimal for monthly: e.g. 2005.5 = Jul 2005) */
  x: number;
  /** The metric value */
  y: number;
}

// ===== Annual Granularity =====

/**
 * Extract annual average of the metric value (e.g., DFR, seasonality ratio).
 * Averages all non-null cell values per year.
 */
export function extractAnnualAverages(data: CountryHeatmapData): TimeSeriesPoint[] {
  const yearSums = new Map<number, { sum: number; count: number }>();

  for (const cell of data.data) {
    if (cell.value === null || cell.value === undefined) continue;
    const entry = yearSums.get(cell.year);
    if (entry) {
      entry.sum += cell.value;
      entry.count++;
    } else {
      yearSums.set(cell.year, { sum: cell.value, count: 1 });
    }
  }

  const points: TimeSeriesPoint[] = [];
  for (const [year, { sum, count }] of yearSums) {
    points.push({ x: year, y: sum / count });
  }
  return points.sort((a, b) => a.x - b.x);
}

/**
 * Extract annual total births.
 * Sums births (or futureBirths for conception metric) per year.
 */
export function extractAnnualBirths(data: CountryHeatmapData): TimeSeriesPoint[] {
  const yearSums = new Map<number, number>();

  for (const cell of data.data) {
    const births = cell.futureBirths ?? cell.births;
    if (births === null || births === undefined) continue;
    yearSums.set(cell.year, (yearSums.get(cell.year) ?? 0) + births);
  }

  const points: TimeSeriesPoint[] = [];
  for (const [year, total] of yearSums) {
    points.push({ x: year, y: total });
  }
  return points.sort((a, b) => a.x - b.x);
}

/**
 * Extract annual average population (women 15-44).
 * Averages population values per year.
 */
export function extractAnnualPopulation(data: CountryHeatmapData): TimeSeriesPoint[] {
  const yearSums = new Map<number, { sum: number; count: number }>();

  for (const cell of data.data) {
    if (cell.population === null || cell.population === undefined) continue;
    const entry = yearSums.get(cell.year);
    if (entry) {
      entry.sum += cell.population;
      entry.count++;
    } else {
      yearSums.set(cell.year, { sum: cell.population, count: 1 });
    }
  }

  const points: TimeSeriesPoint[] = [];
  for (const [year, { sum, count }] of yearSums) {
    points.push({ x: year, y: sum / count });
  }
  return points.sort((a, b) => a.x - b.x);
}

// ===== Monthly Granularity =====

/**
 * Extract monthly metric values as a time series with decimal years.
 * Jan 2005 = 2005.0, Feb 2005 = 2005.083..., Dec 2005 = 2005.917...
 */
export function extractMonthlyValues(data: CountryHeatmapData): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];

  for (const cell of data.data) {
    if (cell.value === null || cell.value === undefined) continue;
    points.push({
      x: cell.year + (cell.month - 1) / 12,
      y: cell.value,
    });
  }

  return points.sort((a, b) => a.x - b.x);
}

/**
 * Extract monthly births as a time series with decimal years.
 */
export function extractMonthlyBirths(data: CountryHeatmapData): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];

  for (const cell of data.data) {
    const births = cell.futureBirths ?? cell.births;
    if (births === null || births === undefined) continue;
    points.push({
      x: cell.year + (cell.month - 1) / 12,
      y: births,
    });
  }

  return points.sort((a, b) => a.x - b.x);
}

/**
 * Extract monthly population as a time series with decimal years.
 */
export function extractMonthlyPopulation(data: CountryHeatmapData): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];

  for (const cell of data.data) {
    if (cell.population === null || cell.population === undefined) continue;
    points.push({
      x: cell.year + (cell.month - 1) / 12,
      y: cell.population,
    });
  }

  return points.sort((a, b) => a.x - b.x);
}

// ===== Utilities =====

/**
 * Check if data contains raw counts (births/population).
 * Seasonality metric data typically doesn't include these fields.
 */
export function hasRawCounts(data: CountryHeatmapData): boolean {
  return data.data.some(
    cell => (cell.births !== null && cell.births !== undefined) ||
            (cell.population !== null && cell.population !== undefined)
  );
}
