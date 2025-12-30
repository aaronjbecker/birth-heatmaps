/**
 * Open Graph heatmap image generation using node-canvas
 *
 * Renders heatmap data to PNG images at standard OG dimensions (1200x630)
 * for use as social media preview images.
 */
import { createCanvas } from 'canvas';
import { interpolateTurbo, interpolateRdBu } from 'd3-scale-chromatic';
import type { CountryHeatmapData, ColorScaleConfig } from './types';

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const NULL_COLOR = '#e0e0e0';

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
 * Render heatmap data to a PNG buffer.
 * Fills the entire OG image with heatmap cells, no borders or spacing.
 *
 * @param data - Country heatmap data containing years, months, values, and color config
 * @returns PNG image as a Uint8Array (suitable for Response body)
 */
export function renderHeatmapToPNG(data: CountryHeatmapData): Uint8Array {
  const canvas = createCanvas(OG_WIDTH, OG_HEIGHT);
  const ctx = canvas.getContext('2d');

  const { years, months } = data;
  const numYears = years.length;
  const numMonths = months.length;

  // Calculate cell dimensions to fill entire canvas
  const cellWidth = OG_WIDTH / numYears;
  const cellHeight = OG_HEIGHT / numMonths;

  const getColor = createColorScale(data.colorScale, data.metric);

  // Create lookup map for O(1) access to cell values
  const dataMap = new Map<string, number | null>();
  for (const cell of data.data) {
    dataMap.set(`${cell.year}-${cell.month}`, cell.value);
  }

  // Render cells (months as rows, years as columns)
  for (let monthIdx = 0; monthIdx < numMonths; monthIdx++) {
    for (let yearIdx = 0; yearIdx < numYears; yearIdx++) {
      const year = years[yearIdx];
      const month = monthIdx + 1; // months are 1-indexed in data
      const value = dataMap.get(`${year}-${month}`) ?? null;

      ctx.fillStyle = getColor(value);
      // Use Math.ceil to ensure cells overlap slightly, avoiding gaps
      ctx.fillRect(
        yearIdx * cellWidth,
        monthIdx * cellHeight,
        Math.ceil(cellWidth) + 1,
        Math.ceil(cellHeight) + 1
      );
    }
  }

  // Return as Uint8Array for Response compatibility
  return new Uint8Array(canvas.toBuffer('image/png'));
}
