/**
 * Color scale utilities for heatmap visualization
 */
import * as d3 from 'd3';
import type { ColorScaleConfig } from './types';

/**
 * Color scheme mapping for D3 interpolators
 */
const colorSchemes: Record<string, (t: number) => string> = {
  // Sequential schemes
  turbo: d3.interpolateTurbo,
  viridis: d3.interpolateViridis,
  inferno: d3.interpolateInferno,
  magma: d3.interpolateMagma,
  plasma: d3.interpolatePlasma,
  cividis: d3.interpolateCividis,
  warm: d3.interpolateWarm,
  cool: d3.interpolateCool,

  // Diverging schemes
  RdBu: d3.interpolateRdBu,
  RdYlBu: d3.interpolateRdYlBu,
  RdYlGn: d3.interpolateRdYlGn,
  PiYG: d3.interpolatePiYG,
  PRGn: d3.interpolatePRGn,
  BrBG: d3.interpolateBrBG,
  PuOr: d3.interpolatePuOr,
  Spectral: d3.interpolateSpectral,
};

/**
 * Create a color scale from configuration
 * 
 * @param config - Color scale configuration
 * @param metric - Optional metric name (e.g., 'seasonality_percentage_normalized')
 *                 If provided and metric is seasonality, inverts the domain so cool colors
 *                 represent lower values and warm colors represent higher values
 */
export function createColorScale(
  config: ColorScaleConfig,
  metric?: string
): d3.ScaleSequential<string, never> | d3.ScaleDiverging<string, never> {
  const interpolator = colorSchemes[config.scheme] || d3.interpolateTurbo;

  if (config.type === 'diverging' && config.domain.length === 3) {
    // For seasonality metrics, invert the domain so cool colors (blue) represent
    // lower values and warm colors (red) represent higher values
    let domain = config.domain as [number, number, number];
    if (metric && metric.includes('seasonality')) {
      // Swap min and max, keeping center the same: [max, center, min]
      domain = [domain[2], domain[1], domain[0]];
    }
    
    return d3.scaleDiverging<string>()
      .domain(domain)
      .interpolator(interpolator);
  }

  return d3.scaleSequential<string>()
    .domain([config.domain[0], config.domain[config.domain.length - 1]])
    .interpolator(interpolator);
}

/**
 * Get color for a value, handling null values
 */
export function getColor(
  scale: d3.ScaleSequential<string, never> | d3.ScaleDiverging<string, never>,
  value: number | null
): string {
  if (value === null) {
    return '#e0e0e0'; // Gray for null/missing data
  }
  return scale(value);
}

/**
 * Calculate color scale domain from data using absolute min/max
 *
 * This matches the Python implementation which uses the full data range
 * rather than percentile-based filtering. A floor of 1e-6 is applied
 * to ensure compatibility with logarithmic scales.
 *
 * @param values - Array of numeric values (may include nulls)
 * @param type - Scale type: 'sequential' or 'diverging'
 * @returns Domain array: [min, max] for sequential, [min, mid, max] for diverging
 */
export function calculateDomain(
  values: (number | null)[],
  type: 'sequential' | 'diverging'
): number[] {
  const validValues = values.filter((v): v is number => v !== null);

  if (validValues.length === 0) {
    return type === 'diverging' ? [0, 0.5, 1] : [0, 1];
  }

  // Use absolute min/max (matches Python implementation)
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);

  // Apply floor for log-scale compatibility (matches Python's max(min, 1e-6))
  const safeMin = Math.max(min, 1e-6);

  if (type === 'diverging') {
    const mid = (safeMin + max) / 2;
    return [safeMin, mid, max];
  }

  return [safeMin, max];
}

/**
 * Generate tick values for a color scale legend
 */
export function generateLegendTicks(
  domain: number[],
  tickCount: number = 5
): number[] {
  const min = domain[0];
  const max = domain[domain.length - 1];
  const step = (max - min) / (tickCount - 1);

  return Array.from({ length: tickCount }, (_, i) => min + step * i);
}

/**
 * Format value for display in tooltip or legend
 */
export function formatValue(
  value: number | null,
  metric: string
): string {
  if (value === null) {
    return 'No data';
  }

  if (metric === 'daily_fertility_rate' || metric === 'fertility') {
    return value.toFixed(2);
  }

  if (metric === 'seasonality_ratio') {
    return value.toFixed(3);
  }

  if (metric === 'seasonality_pct' || metric.includes('percent')) {
    return `${(value * 100).toFixed(1)}%`;
  }

  // Default formatting
  if (Math.abs(value) < 0.01) {
    return value.toExponential(2);
  }
  if (Math.abs(value) < 1) {
    return value.toFixed(3);
  }
  if (Math.abs(value) < 100) {
    return value.toFixed(2);
  }
  return value.toLocaleString();
}
