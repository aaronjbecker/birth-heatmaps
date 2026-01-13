/**
 * Pure chart utilities for Monthly Fertility Time Series Chart - SSR-compatible
 * These functions have no DOM dependencies and can run server-side
 */

import { scaleLinear, type ScaleLinear } from 'd3-scale';
import { line, type Line } from 'd3-shape';

// ViewBox dimensions - fixed coordinate system for responsive scaling
export const VIEWBOX = { width: 1000, height: 500 } as const;

// Chart margins in viewBox units (tightened for efficient screen use)
export const CHART_MARGIN = { top: 20, right: 20, bottom: 35, left: 50 } as const;

// Derived layout constants
export const CHART_TOP = CHART_MARGIN.top;
export const CHART_HEIGHT = VIEWBOX.height - CHART_TOP - CHART_MARGIN.bottom;
export const CHART_WIDTH = VIEWBOX.width - CHART_MARGIN.left - CHART_MARGIN.right;

// Month color constants
export const MONTH_COLORS = {
  highest: '#ff4500', // orangered
  lowest: '#4169e1',  // royalblue
  other: '#808080',   // gray
  annual: 'var(--color-text)', // theme-aware black/white
} as const;

/**
 * Create X scale (linear years) using viewBox coordinates
 */
export function createXScale(years: number[]): ScaleLinear<number, number> {
  if (years.length === 0) {
    return scaleLinear().domain([2000, 2020]).range([0, CHART_WIDTH]);
  }
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  return scaleLinear()
    .domain([minYear, maxYear])
    .range([0, CHART_WIDTH]);
}

/**
 * Create Y scale (linear fertility rate) using viewBox coordinates
 */
export function createYScale(yDomain: [number, number]): ScaleLinear<number, number> {
  return scaleLinear()
    .domain(yDomain)
    .range([CHART_HEIGHT, 0]); // Inverted for SVG (0 at top)
}

/**
 * Create line generator for chart paths
 */
export function createLineGenerator(
  xScale: ScaleLinear<number, number>,
  yScale: ScaleLinear<number, number>
): Line<[number, number]> {
  return line<[number, number]>()
    .defined(d => d[1] !== null && !isNaN(d[1]))
    .x(d => xScale(d[0]))
    .y(d => yScale(d[1]));
}

/**
 * Get color and styling for a month line
 */
export function getMonthColor(
  month: number,
  highestMonth: number,
  lowestMonth: number
): { color: string; alpha: number; strokeWidth: number } {
  if (month === highestMonth) {
    return { color: MONTH_COLORS.highest, alpha: 1, strokeWidth: 2.5 };
  }
  if (month === lowestMonth) {
    return { color: MONTH_COLORS.lowest, alpha: 1, strokeWidth: 2.5 };
  }
  return { color: MONTH_COLORS.other, alpha: 0.4, strokeWidth: 1.2 };
}

/**
 * Generate Y-axis tick values for linear scale
 */
export function computeYTickValues(yDomain: [number, number]): number[] {
  const [min, max] = yDomain;
  const range = max - min;

  // Choose a nice tick interval based on range
  let interval: number;
  if (range <= 10) {
    interval = 2;
  } else if (range <= 25) {
    interval = 5;
  } else if (range <= 50) {
    interval = 10;
  } else {
    interval = Math.ceil(range / 5 / 5) * 5; // Round to nearest 5
  }

  // Generate ticks starting from a nice number
  const startTick = Math.ceil(min / interval) * interval;
  const ticks: number[] = [];

  for (let tick = startTick; tick <= max; tick += interval) {
    ticks.push(tick);
  }

  return ticks;
}

/**
 * Generate X-axis tick values (years)
 * Adapts interval based on year range and container width
 */
export function computeXTickValues(
  years: number[],
  containerWidth: number = 800
): Array<{ year: number; x: number; label: string }> {
  if (years.length === 0) return [];

  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const yearRange = maxYear - minYear;

  // Determine interval based on range and container width
  let interval: number;
  const pixelsPerLabel = 60; // Minimum pixels between labels
  const maxLabels = Math.floor(containerWidth / pixelsPerLabel);

  if (yearRange <= 30) {
    interval = yearRange <= maxLabels * 5 ? 5 : 10;
  } else if (yearRange <= 60) {
    interval = 10;
  } else {
    interval = yearRange <= maxLabels * 10 ? 10 : 20;
  }

  const xScale = createXScale(years);
  const ticks: Array<{ year: number; x: number; label: string }> = [];

  // Start from first year divisible by interval
  const startYear = Math.ceil(minYear / interval) * interval;

  for (let year = startYear; year <= maxYear; year += interval) {
    ticks.push({
      year,
      x: xScale(year),
      label: String(year),
    });
  }

  return ticks;
}

/**
 * Convert viewBox coordinates to percentage for HTML overlay positioning
 */
export function viewBoxToPercent(viewBoxX: number, viewBoxY: number): { left: string; top: string } {
  return {
    left: `${(viewBoxX / VIEWBOX.width) * 100}%`,
    top: `${(viewBoxY / VIEWBOX.height) * 100}%`,
  };
}

/**
 * Convert client (mouse) coordinates to viewBox coordinates
 * Requires the SVG element's bounding rect
 */
export function clientToViewBox(
  clientX: number,
  clientY: number,
  svgRect: DOMRect
): { x: number; y: number } {
  const scaleX = VIEWBOX.width / svgRect.width;
  const scaleY = VIEWBOX.height / svgRect.height;
  return {
    x: (clientX - svgRect.left) * scaleX,
    y: (clientY - svgRect.top) * scaleY,
  };
}

/**
 * Binary search for closest year index
 * Returns index of year closest to target value
 */
export function binarySearchClosestYear(years: number[], target: number): number {
  if (years.length === 0) return 0;
  if (years.length === 1) return 0;

  let lo = 0;
  let hi = years.length - 1;

  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (years[mid] < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  // Check if previous index is closer
  if (lo > 0) {
    const diffLo = Math.abs(years[lo] - target);
    const diffPrev = Math.abs(years[lo - 1] - target);
    if (diffPrev < diffLo) {
      return lo - 1;
    }
  }

  return lo;
}

/**
 * Format month name from month number (1-12)
 */
export const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const;

export function getMonthName(month: number, short: boolean = false): string {
  const index = Math.max(0, Math.min(11, month - 1));
  return short ? MONTH_NAMES_SHORT[index] : MONTH_NAMES_FULL[index];
}
