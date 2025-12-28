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
 */
export function createColorScale(
  config: ColorScaleConfig
): d3.ScaleSequential<string, never> | d3.ScaleDiverging<string, never> {
  const interpolator = colorSchemes[config.scheme] || d3.interpolateTurbo;

  if (config.type === 'diverging' && config.domain.length === 3) {
    return d3.scaleDiverging<string>()
      .domain(config.domain as [number, number, number])
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
 * Calculate color scale domain from data
 */
export function calculateDomain(
  values: (number | null)[],
  type: 'sequential' | 'diverging',
  percentile: number = 0.02
): number[] {
  const validValues = values.filter((v): v is number => v !== null);

  if (validValues.length === 0) {
    return type === 'diverging' ? [0, 0.5, 1] : [0, 1];
  }

  validValues.sort((a, b) => a - b);

  // Use percentile to exclude outliers
  const lowIndex = Math.floor(validValues.length * percentile);
  const highIndex = Math.ceil(validValues.length * (1 - percentile)) - 1;

  const low = validValues[lowIndex];
  const high = validValues[highIndex];

  if (type === 'diverging') {
    const mid = (low + high) / 2;
    return [low, mid, high];
  }

  return [low, high];
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
