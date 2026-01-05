/**
 * Utility functions for YearRangeFilter component
 * Extracted to allow sharing between Svelte component and tests
 */

export interface DataZone {
  start: number;
  end: number;
  hasData: boolean;
}

/**
 * Calculate tick mark positions based on year range
 * Uses 5-year intervals for short ranges (≤ 30 years), 10-year intervals for longer ranges
 */
export function calculateTickMarks(min: number, max: number): number[] {
  const range = max - min;
  const interval = range <= 30 ? 5 : 10;
  const ticks: number[] = [];

  for (let year = Math.ceil(min / interval) * interval; year <= max; year += interval) {
    ticks.push(year);
  }

  return ticks;
}

/**
 * Analyze data availability to create zones for dual-color track
 * Returns array of zones indicating continuous ranges of data presence/absence
 */
export function analyzeDataZones(
  min: number,
  max: number,
  dataYears?: number[]
): DataZone[] {
  if (!dataYears || dataYears.length === 0) {
    return [{ start: min, end: max, hasData: false }];
  }

  const zones: DataZone[] = [];
  const sortedDataYears = [...dataYears].sort((a, b) => a - b);

  let currentYear = min;

  for (let i = 0; i < sortedDataYears.length; i++) {
    const dataYear = sortedDataYears[i];

    // Skip years outside our range
    if (dataYear < min) continue;
    if (dataYear > max) break;

    // If there's a gap before this data year, create a no-data zone
    if (dataYear > currentYear) {
      zones.push({
        start: currentYear,
        end: dataYear - 1,
        hasData: false,
      });
    }

    // Find the end of this continuous data range
    let rangeEnd = dataYear;
    while (
      i + 1 < sortedDataYears.length &&
      sortedDataYears[i + 1] === rangeEnd + 1 &&
      sortedDataYears[i + 1] <= max
    ) {
      i++;
      rangeEnd = sortedDataYears[i];
    }

    // Create data zone
    zones.push({
      start: dataYear,
      end: rangeEnd,
      hasData: true,
    });

    currentYear = rangeEnd + 1;
  }

  // If there's a gap at the end, create final no-data zone
  if (currentYear <= max) {
    zones.push({
      start: currentYear,
      end: max,
      hasData: false,
    });
  }

  return zones;
}
