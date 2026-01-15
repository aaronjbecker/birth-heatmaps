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
    // Country sources
    HMD: 'Human Mortality Database',
    UN: 'United Nations',
    JPOP: 'Japan Statistics Bureau',
    // State birth sources
    CDC: 'CDC WONDER',
    'Martinez-Bakker': 'Martinez-Bakker et al.',
    // State population sources - all Census variants map to Census Bureau
    Census: 'U.S. Census Bureau',
    census_1980s: 'U.S. Census Bureau',
    census_2000s: 'U.S. Census Bureau',
    census_2010s: 'U.S. Census Bureau',
    census_2020s: 'U.S. Census Bureau',
    census_pe19: 'U.S. Census Bureau',
    census_sasrh: 'U.S. Census Bureau',
    nhgis: 'NHGIS',
    interpolated: 'Interpolated',
  };
  return names[source] || source;
}

/**
 * Get consolidated display sources from raw source arrays.
 * Combines similar sources (e.g., all census_* variants become "U.S. Census Bureau").
 * Returns human-readable display names.
 */
export function getConsolidatedDisplaySources(
  birthSources: string[],
  populationSources: string[]
): string[] {
  // Census-related source keys that should consolidate to "U.S. Census Bureau"
  const censusKeys = new Set([
    'Census',
    'census_1980s',
    'census_2000s',
    'census_2010s',
    'census_2020s',
    'census_pe19',
    'census_sasrh',
  ]);

  const displaySources = new Set<string>();

  // Process birth sources
  for (const source of birthSources) {
    displaySources.add(getSourceDisplayName(source));
  }

  // Process population sources with consolidation
  let hasCensus = false;
  for (const source of populationSources) {
    if (censusKeys.has(source)) {
      hasCensus = true;
    } else if (source !== 'interpolated') {
      // Skip 'interpolated' as it's not a primary source
      displaySources.add(getSourceDisplayName(source));
    }
  }

  // Add consolidated Census Bureau if any census sources were present
  if (hasCensus) {
    displaySources.add('U.S. Census Bureau');
  }

  return Array.from(displaySources).sort();
}
