/**
 * Open Graph heatmap image generation using node-canvas
 *
 * Renders heatmap data to PNG images at standard OG dimensions (1200x630)
 * for use as social media preview images. Includes title, axis labels, and
 * tick marks to make the preview clearly identifiable as a chart.
 */
import { createCanvas, type CanvasRenderingContext2D } from 'canvas';
import { interpolateTurbo, interpolateRdBu } from 'd3-scale-chromatic';
import { ticks } from 'd3-array';
import type { CountryHeatmapData, ColorScaleConfig } from './types';

// Canvas dimensions
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

// Layout margins
const MARGIN_TOP = 50; // Title area
const MARGIN_RIGHT = 8; // Minimal right padding
const MARGIN_BOTTOM = 36; // Year labels at bottom
const MARGIN_LEFT = 28; // Month abbreviations

// Typography
const FONT_FAMILY = 'monospace';
const FONT_SIZE_TITLE = 28;
const FONT_SIZE_TITLE_YEAR_RANGE = 20;
const FONT_SIZE_YEAR = 22;
const FONT_SIZE_MONTH = 22;

// Colors
const BG_COLOR = '#fafafa'; // Off-white background
const TEXT_COLOR = '#333333'; // Dark text for contrast
const NULL_COLOR = '#e0e0e0'; // Missing data cells

// 1-letter month abbreviations
const MONTH_ABBR = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

// Metric display names (maps internal metric names to human-readable labels)
const METRIC_LABELS: Record<string, string> = {
  daily_fertility_rate: 'Fertility by month',
  seasonality_ratio_12m: 'Monthly Birth Seasonality',
  seasonality_percentage_normalized: 'Monthly Birth Seasonality',
  conception_rate: 'Conceptions by month',
};

/**
 * Format metric slug to human-readable display name.
 */
function formatMetricName(metric: string): string {
  return METRIC_LABELS[metric] || metric;
}

/**
 * Render chart title left-aligned at top.
 * Format: "Country: Metric label (startYear-endYear)"
 * Country name is rendered in bold.
 */
function renderTitle(
  ctx: CanvasRenderingContext2D,
  countryName: string,
  metric: string,
  years: number[]
): void {
  const metricLabel = formatMetricName(metric);
  const yearRange = `(${years[0]}-${years[years.length - 1]})`;

  ctx.fillStyle = TEXT_COLOR;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  let xPos = MARGIN_LEFT;
  const yPos = 12;

  // Bold country name
  ctx.font = `bold ${FONT_SIZE_TITLE}px ${FONT_FAMILY}`;
  ctx.fillText(countryName + ':', xPos, yPos);
  xPos += ctx.measureText(countryName + ': ').width;

  // Regular weight metric label
  ctx.font = `${FONT_SIZE_TITLE}px ${FONT_FAMILY}`;
  ctx.fillText(metricLabel, xPos, yPos);
  xPos += ctx.measureText(metricLabel + ' ').width;

  // Year range in smaller font
  ctx.font = `${FONT_SIZE_TITLE_YEAR_RANGE}px ${FONT_FAMILY}`;
  ctx.fillText(yearRange, xPos, yPos + 2);
}

/**
 * Render X-axis (year labels) at bottom with neat tick intervals.
 */
function renderXAxis(
  ctx: CanvasRenderingContext2D,
  years: number[],
  heatmapX: number,
  heatmapY: number,
  heatmapHeight: number,
  cellWidth: number
): void {
  const minYear = years[0];
  const maxYear = years[years.length - 1];

  // Generate 4-5 evenly spaced ticks at round numbers
  const yearTicks = ticks(minYear, maxYear, 5);

  ctx.font = `${FONT_SIZE_YEAR}px ${FONT_FAMILY}`;
  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const yPos = heatmapY + heatmapHeight + 6;

  for (const year of yearTicks) {
    const yearIndex = years.indexOf(year);
    if (yearIndex === -1) continue; // Skip if year not in data

    const x = heatmapX + (yearIndex + 0.5) * cellWidth;
    ctx.fillText(String(year), x, yPos);
  }
}

/**
 * Render Y-axis (1-letter month abbreviations).
 */
function renderYAxis(
  ctx: CanvasRenderingContext2D,
  heatmapX: number,
  heatmapY: number,
  heatmapHeight: number
): void {
  const cellHeight = heatmapHeight / 12;

  ctx.font = `${FONT_SIZE_MONTH}px ${FONT_FAMILY}`;
  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < 12; i++) {
    const y = heatmapY + (i + 0.5) * cellHeight;
    ctx.fillText(MONTH_ABBR[i], heatmapX - 6, y);
  }
}

/**
 * Create a color scale function from the data's color configuration.
 * Handles both sequential (fertility, conception) and diverging (seasonality) scales.
 */
function createColorScale(
  config: ColorScaleConfig,
  metric: string
): (value: number | null) => string {
  const interpolator =
    config.scheme === 'turbo' ? interpolateTurbo : interpolateRdBu;
  const domain = [...config.domain];

  // Invert domain for seasonality (diverging scales)
  // This makes cool colors (blue) represent below-average and warm (red) above-average
  const isSeasonality =
    config.type === 'diverging' && metric.includes('seasonality');
  if (isSeasonality) {
    domain.reverse();
  }

  return (value: number | null): string => {
    if (value === null) return NULL_COLOR;

    let normalized: number;

    if (config.type === 'diverging' && domain.length === 3) {
      // Three-point scale: [min, center, max] (or reversed for seasonality)
      const [min, center, max] = domain;
      if (value <= center) {
        // Normalize to [0, 0.5]
        const range = center - min;
        normalized = range === 0 ? 0.5 : 0.5 * ((value - min) / range);
      } else {
        // Normalize to [0.5, 1]
        const range = max - center;
        normalized = range === 0 ? 0.5 : 0.5 + 0.5 * ((value - center) / range);
      }
    } else {
      // Two-point sequential scale: [min, max]
      const [min, max] = domain;
      const range = max - min;
      normalized = range === 0 ? 0.5 : (value - min) / range;
    }

    // Clamp to [0, 1] and apply interpolator
    normalized = Math.max(0, Math.min(1, normalized));
    return interpolator(normalized);
  };
}

/**
 * Render heatmap data to a PNG buffer with chart elements.
 * Includes title, axis labels, and tick marks for clear identification.
 *
 * @param data - Country heatmap data containing years, months, values, and color config
 * @returns PNG image as a Uint8Array (suitable for Response body)
 */
export function renderHeatmapToPNG(data: CountryHeatmapData): Uint8Array {
  const canvas = createCanvas(OG_WIDTH, OG_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Fill canvas with off-white background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, OG_WIDTH, OG_HEIGHT);

  const { years } = data;
  const numYears = years.length;
  const numMonths = 12;

  // Calculate heatmap region (accounting for margins)
  const heatmapX = MARGIN_LEFT;
  const heatmapY = MARGIN_TOP;
  const heatmapWidth = OG_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  const heatmapHeight = OG_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

  // Calculate cell dimensions within heatmap region
  const cellWidth = heatmapWidth / numYears;
  const cellHeight = heatmapHeight / numMonths;

  // Render chart elements
  renderTitle(ctx, data.country.name, data.metric, years);
  renderXAxis(ctx, years, heatmapX, heatmapY, heatmapHeight, cellWidth);
  renderYAxis(ctx, heatmapX, heatmapY, heatmapHeight);

  // Create color scale for heatmap cells
  const getColor = createColorScale(data.colorScale, data.metric);

  // Create lookup map for O(1) access to cell values
  const dataMap = new Map<string, number | null>();
  for (const cell of data.data) {
    dataMap.set(`${cell.year}-${cell.month}`, cell.value);
  }

  // Render heatmap cells (months as rows, years as columns)
  for (let monthIdx = 0; monthIdx < numMonths; monthIdx++) {
    for (let yearIdx = 0; yearIdx < numYears; yearIdx++) {
      const year = years[yearIdx];
      const month = monthIdx + 1; // months are 1-indexed in data
      const value = dataMap.get(`${year}-${month}`) ?? null;

      ctx.fillStyle = getColor(value);
      // Use Math.ceil to ensure cells overlap slightly, avoiding gaps
      ctx.fillRect(
        heatmapX + yearIdx * cellWidth,
        heatmapY + monthIdx * cellHeight,
        Math.ceil(cellWidth) + 1,
        Math.ceil(cellHeight) + 1
      );
    }
  }

  // Return as Uint8Array for Response compatibility
  return new Uint8Array(canvas.toBuffer('image/png'));
}
