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

// =====================================
// US State Types
// =====================================

/** State metadata in the states index (mirrors CountryMeta structure) */
export interface StateMeta {
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

/** States index file structure */
export interface StatesIndex {
  states: StateMeta[];
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

/** State heatmap data file structure (uses 'state' key instead of 'country') */
export interface StateHeatmapData {
  state: {
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
  /** Callback when cell hover state changes. Receives cell data and the SVG element. */
  onCellHover?: (
    cell: HeatmapCell | null,
    element: SVGRectElement | null
  ) => void;
}

/** Tooltip state - simplified for @floating-ui/dom positioning */
export interface TooltipState {
  /** The hovered cell data (null when no cell is hovered) */
  cell: HeatmapCell | null;
  /** Reference to the hovered SVG rect element for positioning */
  referenceElement: SVGRectElement | null;
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
  states: string[];
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

// =====================================
// Monthly Fertility Time Series Types
// =====================================

/** Single data point in a monthly time series */
export interface MonthlySeriesDataPoint {
  year: number;
  value: number | null;
}

/** Monthly series data for one month */
export interface MonthlySeries {
  month: number;
  monthName: string;
  data: MonthlySeriesDataPoint[];
}

/** Annual average data point */
export interface AnnualAverageDataPoint {
  year: number;
  value: number;
}

/** Month ranking metadata */
export interface MonthRanking {
  highestAvg: number; // Month number (1-12) with highest average
  lowestAvg: number;  // Month number (1-12) with lowest average
}

/** Monthly fertility timeseries data structure */
export interface MonthlyFertilityTimeSeriesData {
  country: {
    code: string;
    name: string;
  };
  metric: 'daily_fertility_rate';
  title: string;
  yearRange: [number, number];
  monthRanking: MonthRanking;
  monthlySeries: MonthlySeries[];
  annualAverageSeries: AnnualAverageDataPoint[];
  yDomain: [number, number];
  sources: string[];
  generatedAt: string;
}

/** Tooltip data for hovered year */
export interface MonthlyFertilityTooltipData {
  year: number;
  monthValues: Array<{
    month: number;
    monthName: string;
    value: number | null;
    color: string;
  }>;
  annualValue: number | null;
}
