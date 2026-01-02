/**
 * TypeScript interfaces for HMD births heatmap data
 */

import type { MetricSlug } from './metrics';

/** Country metadata in the countries index */
export interface CountryMeta {
  code: string;
  name: string;
  sources: string[];
  completeYears: number;
  fertility: {
    yearRange: [number, number];
    hasData: boolean;
  };
  seasonality: {
    yearRange: [number, number];
    hasData: boolean;
  };
  conception: {
    yearRange: [number, number];
    hasData: boolean;
  };
}

/** Data source metadata */
export interface DataSource {
  name: string;
  url: string | null;
}

/** Countries index file structure */
export interface CountriesIndex {
  countries: CountryMeta[];
  dataSources: Record<string, DataSource>;
  minYearsThreshold: number;
  generatedAt: string;
}

/** Single data point in a heatmap */
export interface HeatmapCell {
  year: number;
  month: number;
  value: number | null;
  births?: number | null;
  population?: number | null;
  formattedValue?: string | null;
  source: string;
}

/** Color scale configuration */
export interface ColorScaleConfig {
  type: 'sequential' | 'diverging';
  domain: number[];
  scheme: string;
}

/** Country heatmap data file structure */
export interface CountryHeatmapData {
  country: {
    code: string;
    name: string;
  };
  metric: string;
  title: string;
  subtitle?: string;
  colorScale: ColorScaleConfig;
  years: number[];
  months: string[];
  data: HeatmapCell[];
  sources: string[];
  generatedAt: string;
}

/** Heatmap component props */
export interface HeatmapProps {
  data: CountryHeatmapData;
  width?: number;
  height?: number;
  onCellHover?: (cell: HeatmapCell | null, event: MouseEvent) => void;
}

/** Tooltip state */
export interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  cell: HeatmapCell | null;
}

/** Year range filter state */
export interface YearRangeState {
  min: number;
  max: number;
  start: number;
  end: number;
}

/** Scroll information for heatmap with horizontal overflow */
export interface ScrollInfo {
  needsScroll: boolean;
  scrollWidth: number;
}

// =====================================
// Compare Page Types
// =====================================

/** Scale mode for comparison view */
export type ScaleMode = 'unified' | 'per-country';

/** Query parameters for compare page */
export interface CompareQueryParams {
  countries: string[];
  metric: MetricSlug;
  scale: ScaleMode;
  yearStart?: number;
  yearEnd?: number;
}

/** Result of loading multiple countries with status tracking */
export interface LoadedCountryData {
  data: CountryHeatmapData;
  code: string;
  error?: string;
}

/** Comparison state for managing multiple country datasets */
export interface CompareState {
  selectedCountries: string[];
  loadedData: Map<string, CountryHeatmapData>;
  loading: boolean;
  error: string | null;
  scaleMode: ScaleMode;
  yearRange: [number, number] | null;
  commonYearRange: [number, number] | null;
}
