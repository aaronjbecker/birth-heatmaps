/**
 * Year range filter component with dual range slider
 */
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';

export interface YearRangeFilterProps {
  min: number;
  max: number;
  start?: number;
  end?: number;
  onChange: (start: number, end: number) => void;
  dataYears?: number[];
}

interface DataZone {
  start: number;
  end: number;
  hasData: boolean;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px 0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    height: '24px', // Prevent layout shift
  },
  labelGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    color: 'var(--color-text-muted)',
    fontWeight: 500,
  },
  range: {
    color: 'var(--color-text)',
    fontWeight: 600,
  },
  sliderContainer: {
    position: 'relative',
    height: '24px',
    marginBottom: '18px',
    cursor: 'pointer',
  },
  sliderTrack: {
    position: 'absolute',
    top: '10px',
    left: 0,
    right: 0,
    height: '4px',
    backgroundColor: 'var(--color-border)',
    borderRadius: '2px',
  },
  sliderRange: {
    position: 'absolute',
    top: '10px',
    height: '4px',
    backgroundColor: 'var(--color-primary)',
    borderRadius: '2px',
  },
  slider: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: '24px',
    WebkitAppearance: 'none',
    appearance: 'none',
    background: 'transparent',
    pointerEvents: 'none',
  },
  ticksContainer: {
    position: 'absolute',
    top: '14px',
    left: 0,
    right: 0,
    height: '12px',
    pointerEvents: 'none',
  },
  tickMark: {
    position: 'absolute',
    width: '1px',
    height: '8px', // Larger ticks
    backgroundColor: 'var(--color-text-muted)', // More visible
    opacity: 0.4,
  },
  edgeLabelsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    marginTop: '-6px',
  },
  resetButton: {
    padding: '4px 8px',
    fontSize: '11px',
    border: '1px solid var(--color-border)',
    borderRadius: '3px',
    backgroundColor: 'var(--color-bg-alt)',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
  },
};

// Inline CSS for range thumb styling (can't use pseudo-selectors in inline styles)
const sliderStyles = `
  .year-range-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    pointer-events: all;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--color-primary);
    border: 2px solid var(--color-bg-alt);
    box-shadow: 0 1px 3px var(--color-shadow);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .year-range-slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }
  .year-range-slider:focus::-webkit-slider-thumb {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  }
  .year-range-slider::-moz-range-thumb {
    pointer-events: all;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-primary);
    border: 2px solid var(--color-bg-alt);
    box-shadow: 0 1px 3px var(--color-shadow);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .year-range-slider::-moz-range-thumb:hover {
    transform: scale(1.1);
  }
  .year-range-slider:focus {
    outline: none;
  }
  .year-range-slider:focus::-moz-range-thumb {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  }
`;

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

export function YearRangeFilter({
  min,
  max,
  start: initialStart,
  end: initialEnd,
  onChange,
  dataYears,
}: YearRangeFilterProps): React.ReactElement {
  // Determine effective range based on data availability
  const { effectiveMin, effectiveMax } = useMemo(() => {
    if (!dataYears || dataYears.length === 0) {
      return { effectiveMin: min, effectiveMax: max };
    }
    const dMin = Math.min(...dataYears);
    const dMax = Math.max(...dataYears);
    // Respect the props bounds if they are tighter, but primarily use data bounds
    return {
      effectiveMin: Math.max(min, dMin),
      effectiveMax: Math.min(max, dMax),
    };
  }, [min, max, dataYears]);

  const [start, setStart] = useState(() => 
    Math.max(effectiveMin, Math.min(effectiveMax, initialStart ?? effectiveMin))
  );
  const [end, setEnd] = useState(() => 
    Math.max(effectiveMin, Math.min(effectiveMax, initialEnd ?? effectiveMax))
  );
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal state if effective bounds change (e.g., country change)
  useEffect(() => {
    const clampedStart = Math.max(effectiveMin, Math.min(effectiveMax, start));
    const clampedEnd = Math.max(effectiveMin, Math.min(effectiveMax, end));
    
    if (clampedStart !== start || clampedEnd !== end) {
      setStart(clampedStart);
      setEnd(clampedEnd);
      onChange(clampedStart, clampedEnd);
    }
  }, [effectiveMin, effectiveMax, start, end, onChange]);

  const handleStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      const newStart = Math.min(value, end - 1);
      setStart(newStart);
      onChange(newStart, end);
    },
    [end, onChange]
  );

  const handleEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      const newEnd = Math.max(value, start + 1);
      setEnd(newEnd);
      onChange(start, newEnd);
    },
    [start, onChange]
  );

  const handleTrackInteraction = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const clickedYear = Math.round(effectiveMin + percentage * (effectiveMax - effectiveMin));

      const distToStart = Math.abs(clickedYear - start);
      const distToEnd = Math.abs(clickedYear - end);

      if (distToStart <= distToEnd) {
        const newStart = Math.min(clickedYear, end - 1);
        setStart(newStart);
        onChange(newStart, end);
      } else {
        const newEnd = Math.max(clickedYear, start + 1);
        setEnd(newEnd);
        onChange(start, newEnd);
      }
    },
    [effectiveMin, effectiveMax, start, end, onChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      handleTrackInteraction(e.clientX);
    },
    [handleTrackInteraction]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.touches[0]) {
        handleTrackInteraction(e.touches[0].clientX);
      }
    },
    [handleTrackInteraction]
  );

  const handleReset = useCallback(() => {
    setStart(effectiveMin);
    setEnd(effectiveMax);
    onChange(effectiveMin, effectiveMax);
  }, [effectiveMin, effectiveMax, onChange]);

  const totalRange = effectiveMax - effectiveMin || 1;
  const rangePercent = {
    left: ((start - effectiveMin) / totalRange) * 100,
    right: ((effectiveMax - end) / totalRange) * 100,
  };

  const isReset = start === effectiveMin && end === effectiveMax;
  const tickMarks = calculateTickMarks(effectiveMin, effectiveMax);
  const dataZones = analyzeDataZones(effectiveMin, effectiveMax, dataYears);

  return (
    <div style={styles.container}>
      <style>{sliderStyles}</style>
      <div style={styles.header}>
        <div style={styles.labelGroup}>
          <span style={styles.label}>Year Range</span>
          <span style={styles.range}>
            {start} – {end}
          </span>
        </div>
        <div style={{ minHeight: '24px', display: 'flex', alignItems: 'center' }}>
          {!isReset && (
            <button
              style={styles.resetButton}
              onClick={handleReset}
              type="button"
              data-testid="year-range-reset"
            >
              Reset
            </button>
          )}
        </div>
      </div>
      <div 
        style={styles.sliderContainer} 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        data-testid="year-range-container"
      >
        {/* Multi-zone track showing data availability */}
        {dataZones.map((zone, index) => {
          const zoneStart = ((zone.start - effectiveMin) / totalRange) * 100;
          const zoneEnd = ((zone.end - effectiveMin) / totalRange) * 100;
          const zoneWidth = Math.max(zoneEnd - zoneStart, zone.hasData ? 0.5 : 0);

          // Determine opacity based on selection
          const isInSelection = zone.end >= start && zone.start <= end;
          const opacity = isInSelection ? 0.4 : 0.2;

          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                top: '10px',
                left: `${zoneStart}%`,
                width: `${zoneWidth}%`,
                height: '4px',
                backgroundColor: zone.hasData
                  ? 'var(--color-primary)'
                  : 'var(--color-border)',
                opacity,
                borderRadius: index === 0 ? '2px 0 0 2px' : index === dataZones.length - 1 ? '0 2px 2px 0' : '0',
              }}
              data-testid={`zone-${index}`}
              data-has-data={zone.hasData}
            />
          );
        })}
        <div
          style={{
            ...styles.sliderRange,
            left: `${rangePercent.left}%`,
            right: `${rangePercent.right}%`,
            opacity: 0.6,
          }}
        />
        {/* Tick marks */}
        <div style={styles.ticksContainer} data-testid="year-range-ticks">
          {tickMarks.map((year) => {
            const position = ((year - effectiveMin) / totalRange) * 100;
            return (
              <div
                key={year}
                style={{
                  ...styles.tickMark,
                  left: `${position}%`,
                }}
                data-year={year}
              />
            );
          })}
        </div>
        <input
          type="range"
          className="year-range-slider"
          style={{ ...styles.slider, zIndex: 2 }}
          min={effectiveMin}
          max={effectiveMax}
          value={start}
          onChange={handleStartChange}
          data-testid="year-range-start"
        />
        <input
          type="range"
          className="year-range-slider"
          style={{ ...styles.slider, zIndex: 1 }}
          min={effectiveMin}
          max={effectiveMax}
          value={end}
          onChange={handleEndChange}
          data-testid="year-range-end"
        />
      </div>
      {/* Edge labels */}
      <div style={styles.edgeLabelsContainer}>
        <span data-testid="year-range-min-label">{effectiveMin}</span>
        <span data-testid="year-range-max-label">{effectiveMax}</span>
      </div>
    </div>
  );
}

export default YearRangeFilter;
