/**
 * Categorical color palette for Compare page line charts and wide heatmaps.
 * 10 colors chosen for contrast on both light and dark backgrounds.
 */

const PALETTE = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#a855f7', // purple
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f59e0b', // amber
  '#6366f1', // indigo
  '#10b981', // emerald
] as const;

const FALLBACK_COLOR = '#9ca3af'; // gray-400

/**
 * Assign colors to country/state codes based on their order.
 * Wraps around if more than 10 codes are provided.
 */
export function assignCountryColors(codes: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i < codes.length; i++) {
    map.set(codes[i], PALETTE[i % PALETTE.length]);
  }
  return map;
}

/**
 * Look up a country's assigned color with gray fallback.
 */
export function getCountryColor(colorMap: Map<string, string>, code: string): string {
  return colorMap.get(code) ?? FALLBACK_COLOR;
}
