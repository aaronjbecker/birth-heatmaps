/**
 * Data normalization utilities for state/country heatmap data.
 *
 * State JSON files use a 'state' key while country JSON files use a 'country' key.
 * This module provides functions to normalize state data to the CountryHeatmapData
 * format so existing components can be reused without modification.
 */

import type { CountryHeatmapData, StateHeatmapData } from './types';

/**
 * Transform state heatmap data to country heatmap data format.
 *
 * This allows reusing existing components (Heatmap, OG image renderer, etc.)
 * that expect CountryHeatmapData without modification.
 *
 * @param stateData - State heatmap data with 'state' key
 * @returns Equivalent CountryHeatmapData with 'country' key
 */
export function stateToCountryFormat(stateData: StateHeatmapData): CountryHeatmapData {
  return {
    country: {
      code: stateData.state.code,
      name: stateData.state.name,
    },
    metric: stateData.metric,
    title: stateData.title,
    subtitle: stateData.subtitle,
    colorScale: stateData.colorScale,
    years: stateData.years,
    months: stateData.months,
    data: stateData.data,
    sources: stateData.sources,
    generatedAt: stateData.generatedAt,
  };
}

/**
 * Check if data is state format (has 'state' key) vs country format (has 'country' key).
 *
 * @param data - Heatmap data object
 * @returns true if data is in state format
 */
export function isStateHeatmapData(
  data: CountryHeatmapData | StateHeatmapData
): data is StateHeatmapData {
  return 'state' in data && !('country' in data);
}

/**
 * Normalize any heatmap data to CountryHeatmapData format.
 *
 * Handles both state and country data, returning CountryHeatmapData in either case.
 *
 * @param data - Either state or country heatmap data
 * @returns CountryHeatmapData format
 */
export function normalizeHeatmapData(
  data: CountryHeatmapData | StateHeatmapData
): CountryHeatmapData {
  if (isStateHeatmapData(data)) {
    return stateToCountryFormat(data);
  }
  return data;
}
