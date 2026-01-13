/**
 * Data loading and processing utilities for the Compare Countries feature.
 *
 * These functions handle:
 * - Loading country data dynamically via fetch from /data/
 * - Computing common year ranges across multiple countries
 * - Aligning data to common ranges (trimming early, filling late with nulls)
 * - Computing unified color scales from multiple datasets
 */

import type { CountryHeatmapData, StateHeatmapData, HeatmapCell, ColorScaleConfig } from './types';
import type { MetricSlug } from './metrics';
import { stateToCountryFormat } from './normalize-data';

const DATA_BASE_PATH = '/data';

/**
 * Load heatmap data for a specific country and metric.
 * Uses fetch to load from the public folder.
 */
export async function loadMetricData(
  countryCode: string,
  metric: MetricSlug
): Promise<CountryHeatmapData> {
  const url = `${DATA_BASE_PATH}/${metric}/${countryCode}.json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load ${metric} data for ${countryCode}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Load data for multiple countries in parallel.
 * Returns a Map of country code to data, silently skipping failed loads.
 */
export async function loadMultipleCountries(
  countryCodes: string[],
  metric: MetricSlug
): Promise<Map<string, CountryHeatmapData>> {
  const results = await Promise.allSettled(
    countryCodes.map(code => loadMetricData(code, metric))
  );

  const dataMap = new Map<string, CountryHeatmapData>();

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      dataMap.set(countryCodes[index], result.value);
    } else {
      console.warn(`Failed to load data for ${countryCodes[index]}:`, result.reason);
    }
  });

  return dataMap;
}

/**
 * Load heatmap data for a specific state and metric.
 * Uses fetch to load from the public folder, then transforms to CountryHeatmapData format.
 */
export async function loadStateMetricData(
  stateCode: string,
  metric: MetricSlug
): Promise<CountryHeatmapData> {
  const url = `${DATA_BASE_PATH}/${metric}/states/${stateCode}.json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load ${metric} data for state ${stateCode}: ${response.statusText}`);
  }

  const stateData: StateHeatmapData = await response.json();
  return stateToCountryFormat(stateData);
}

/**
 * Load data for multiple states in parallel.
 * Returns a Map of state code to data, silently skipping failed loads.
 */
export async function loadMultipleStates(
  stateCodes: string[],
  metric: MetricSlug
): Promise<Map<string, CountryHeatmapData>> {
  const results = await Promise.allSettled(
    stateCodes.map(code => loadStateMetricData(code, metric))
  );

  const dataMap = new Map<string, CountryHeatmapData>();

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      dataMap.set(stateCodes[index], result.value);
    } else {
      console.warn(`Failed to load data for state ${stateCodes[index]}:`, result.reason);
    }
  });

  return dataMap;
}

/**
 * Find common year range across multiple countries.
 *
 * Returns [latestStart, latestEnd] where:
 * - latestStart: The latest starting year among all countries (all must have data from here)
 * - latestEnd: The latest ending year among all countries (extend to show all recent data)
 *
 * This trims the early end but keeps the late end, filling with nulls where needed.
 */
export function computeCommonYearRange(
  datasets: CountryHeatmapData[]
): [number, number] {
  if (datasets.length === 0) {
    return [1900, new Date().getFullYear()];
  }

  // Find the latest start year (all countries must have data from this point)
  const latestStart = Math.max(...datasets.map(d => Math.min(...d.years)));

  // Find the latest end year (keep all data up to the most recent country)
  const latestEnd = Math.max(...datasets.map(d => Math.max(...d.years)));

  return [latestStart, latestEnd];
}

/**
 * Align a country's data to the common year range.
 *
 * - Filters out years before commonStart
 * - Fills with null cells for years after the country's last data but before commonEnd
 * - Preserves intermediate nulls as-is
 */
export function alignDataToRange(
  data: CountryHeatmapData,
  commonRange: [number, number]
): HeatmapCell[] {
  const [commonStart, commonEnd] = commonRange;
  const countryMaxYear = Math.max(...data.years);

  // Filter to include only years >= commonStart
  let alignedCells = data.data.filter(cell => cell.year >= commonStart);

  // If country's data ends before commonEnd, fill with null cells
  if (countryMaxYear < commonEnd) {
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    for (let year = countryMaxYear + 1; year <= commonEnd; year++) {
      for (const month of months) {
        alignedCells.push({
          year,
          month,
          value: null,
          source: 'null-fill'
        });
      }
    }
  }

  // Sort by year and month to ensure correct order
  alignedCells.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  return alignedCells;
}

/**
 * Update years array to match the common range.
 */
export function getAlignedYears(
  originalYears: number[],
  commonRange: [number, number]
): number[] {
  const [commonStart, commonEnd] = commonRange;
  const years: number[] = [];

  for (let year = commonStart; year <= commonEnd; year++) {
    years.push(year);
  }

  return years;
}

/**
 * Compute a unified color scale domain from multiple countries' data.
 *
 * This calculates the min/max (and center for diverging scales) across
 * all provided datasets within the common year range.
 */
export function computeUnifiedColorScale(
  datasets: CountryHeatmapData[],
  commonRange: [number, number]
): ColorScaleConfig {
  if (datasets.length === 0) {
    return { type: 'sequential', domain: [0, 1], scheme: 'turbo' };
  }

  // Use first dataset's scale type and scheme as the base
  const baseConfig = datasets[0].colorScale;

  // Collect all non-null values across all countries within common range
  const allValues: number[] = [];

  for (const dataset of datasets) {
    for (const cell of dataset.data) {
      if (cell.year >= commonRange[0] && cell.value !== null) {
        allValues.push(cell.value);
      }
    }
  }

  if (allValues.length === 0) {
    return baseConfig;
  }

  const min = Math.min(...allValues);
  const max = Math.max(...allValues);

  if (baseConfig.type === 'diverging') {
    // For seasonality (diverging scales), 0.0833 (1/12) is the center
    // representing equal distribution across months
    const center = 0.0833;

    // Ensure center is within the data range
    const adjustedCenter = Math.max(min, Math.min(max, center));

    return {
      type: 'diverging',
      domain: [
        Math.round(min * 10000) / 10000,
        Math.round(adjustedCenter * 10000) / 10000,
        Math.round(max * 10000) / 10000
      ],
      scheme: baseConfig.scheme
    };
  }

  return {
    type: 'sequential',
    domain: [
      Math.round(min * 10) / 10,
      Math.round(max * 10) / 10
    ],
    scheme: baseConfig.scheme
  };
}

/**
 * Create an aligned version of CountryHeatmapData for comparison display.
 * This preserves the original data but updates years and data arrays for alignment.
 */
export function createAlignedCountryData(
  original: CountryHeatmapData,
  commonRange: [number, number],
  colorScaleOverride?: ColorScaleConfig
): CountryHeatmapData {
  return {
    ...original,
    years: getAlignedYears(original.years, commonRange),
    data: alignDataToRange(original, commonRange),
    colorScale: colorScaleOverride || original.colorScale
  };
}
