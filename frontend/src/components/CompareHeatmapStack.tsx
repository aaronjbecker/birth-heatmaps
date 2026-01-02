/**
 * Stack of heatmaps for comparing multiple countries.
 * Displays heatmaps vertically with shared year range and optional unified color scale.
 */
import React, { useMemo, useState, useCallback } from 'react';
import type { CountryHeatmapData, ColorScaleConfig, ScaleMode } from '../lib/types';
import { HeatmapD3 } from './HeatmapD3';
import { ColorLegend } from './ColorLegend';
import { YearRangeFilter } from './YearRangeFilter';
import {
  computeCommonYearRange,
  computeUnifiedColorScale,
  createAlignedCountryData,
} from '../lib/compare-data';

export interface CompareHeatmapStackProps {
  countries: CountryHeatmapData[];
  scaleMode: ScaleMode;
  height?: number;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
  },
  yearFilterContainer: {
    padding: '0 16px',
    marginBottom: '4px',
  },
  countrySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  countryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    backgroundColor: 'var(--color-bg-alt)',
    borderRadius: '4px 4px 0 0',
    borderBottom: '1px solid var(--color-border)',
  },
  countryName: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    margin: 0,
  },
  countryMeta: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-muted)',
  },
  heatmapWrapper: {
    // Allow heatmap to take full width
  },
  legendContainer: {
    padding: '4px 8px',
    backgroundColor: 'var(--color-bg-alt)',
    borderTop: '1px solid var(--color-border)',
    borderRadius: '0 0 4px 4px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    backgroundColor: 'var(--color-bg-alt)',
    borderRadius: '4px',
    border: '1px dashed var(--color-border)',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    margin: '0 0 8px 0',
  },
  emptyText: {
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
    margin: 0,
  },
};

export function CompareHeatmapStack({
  countries,
  scaleMode,
  height = 400,
}: CompareHeatmapStackProps): React.ReactElement {
  // Compute common year range across all countries
  const commonYearRange = useMemo(() => {
    return computeCommonYearRange(countries);
  }, [countries]);

  // Track current year range filter (user can adjust within common range)
  const [yearRange, setYearRange] = useState<[number, number]>(commonYearRange);

  // Track hovered value and which country is being hovered (for synchronized legends)
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const [hoveredCountryCode, setHoveredCountryCode] = useState<string | null>(null);

  // Handle hover from any heatmap
  const handleHeatmapHover = useCallback((countryCode: string, value: number | null) => {
    setHoveredValue(value);
    setHoveredCountryCode(value !== null ? countryCode : null);
  }, []);

  // Update year range when common range changes
  React.useEffect(() => {
    setYearRange(commonYearRange);
  }, [commonYearRange]);

  // Compute unified color scale if in unified mode
  const unifiedColorScale = useMemo(() => {
    if (scaleMode !== 'unified' || countries.length === 0) return null;
    return computeUnifiedColorScale(countries, commonYearRange);
  }, [countries, scaleMode, commonYearRange]);

  // Get the effective color scale for a country
  const getColorScaleForCountry = useCallback(
    (country: CountryHeatmapData): ColorScaleConfig | undefined => {
      if (scaleMode === 'unified' && unifiedColorScale) {
        return unifiedColorScale;
      }
      return undefined; // Use country's own scale
    },
    [scaleMode, unifiedColorScale]
  );

  // Handle year range change
  const handleYearRangeChange = useCallback((start: number, end: number) => {
    setYearRange([start, end]);
  }, []);

  // Empty state
  if (countries.length === 0) {
    return (
      <div style={styles.emptyState}>
        <h3 style={styles.emptyTitle}>No countries selected</h3>
        <p style={styles.emptyText}>
          Select two or more countries above to compare their birth patterns.
        </p>
      </div>
    );
  }

  // Get data years for the filter (use first country's aligned years)
  const dataYears = useMemo(() => {
    const years: number[] = [];
    for (let y = commonYearRange[0]; y <= commonYearRange[1]; y++) {
      years.push(y);
    }
    return years;
  }, [commonYearRange]);

  return (
    <div style={styles.container}>
      {/* Year range filter at top */}
      <div style={styles.yearFilterContainer}>
        <YearRangeFilter
          min={commonYearRange[0]}
          max={commonYearRange[1]}
          start={yearRange[0]}
          end={yearRange[1]}
          onChange={handleYearRangeChange}
          dataYears={dataYears}
        />
      </div>

      {/* Country heatmaps with individual legends */}
      {countries.map((country) => {
        // Create aligned data for this country
        const alignedData = createAlignedCountryData(
          country,
          yearRange, // Use current filter range, not commonYearRange
          getColorScaleForCountry(country)
        );

        // Determine hover indicator for this legend
        // In unified mode: all legends show the hovered value
        // In per-country mode: only the hovered country's legend shows the value
        const legendHoveredValue = scaleMode === 'unified'
          ? hoveredValue
          : hoveredCountryCode === country.country.code
            ? hoveredValue
            : null;

        // Get the color scale for this country's legend
        const legendColorScale = getColorScaleForCountry(country) || country.colorScale;

        return (
          <div key={country.country.code} style={styles.countrySection}>
            {/* Country header */}
            <div style={styles.countryHeader}>
              <h3 style={styles.countryName}>{country.country.name}</h3>
              <span style={styles.countryMeta}>
                {Math.min(...country.years)}–{Math.max(...country.years)}
              </span>
            </div>

            {/* Heatmap */}
            <div style={styles.heatmapWrapper}>
              <HeatmapD3
                data={alignedData}
                height={height}
                showLegend={false}
                showYearFilter={false}
                showControls={true}
                colorScaleOverride={getColorScaleForCountry(country)}
                onCellHover={(value) => handleHeatmapHover(country.country.code, value)}
              />
            </div>

            {/* Color legend below heatmap */}
            <div style={styles.legendContainer}>
              <ColorLegend
                colorScale={legendColorScale}
                metric={country.metric}
                hoveredValue={legendHoveredValue}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default CompareHeatmapStack;
