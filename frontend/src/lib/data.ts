/**
 * Data loading utilities
 */
import type { CountriesIndex, CountryHeatmapData } from './types';

const DATA_BASE_PATH = '/data';

/**
 * Load the countries index
 */
export async function loadCountriesIndex(): Promise<CountriesIndex> {
  const response = await fetch(`${DATA_BASE_PATH}/countries.json`);
  if (!response.ok) {
    throw new Error(`Failed to load countries index: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Load fertility heatmap data for a country
 */
export async function loadFertilityData(countryCode: string): Promise<CountryHeatmapData> {
  const response = await fetch(`${DATA_BASE_PATH}/fertility/${countryCode}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load fertility data for ${countryCode}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Load seasonality heatmap data for a country
 */
export async function loadSeasonalityData(countryCode: string): Promise<CountryHeatmapData> {
  const response = await fetch(`${DATA_BASE_PATH}/seasonality/${countryCode}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load seasonality data for ${countryCode}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Format a year range as a string
 */
export function formatYearRange(range: [number, number]): string {
  return `${range[0]}–${range[1]}`;
}

/**
 * Get display name for a data source
 */
export function getSourceDisplayName(source: string): string {
  const names: Record<string, string> = {
    HMD: 'Human Mortality Database',
    UN: 'United Nations',
    JPOP: 'Japan Statistics Bureau',
  };
  return names[source] || source;
}
