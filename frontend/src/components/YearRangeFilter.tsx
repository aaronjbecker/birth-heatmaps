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
  
  // Local state for numeric inputs to allow intermediate typing states
  const [startInput, setStartInput] = useState(start.toString());
  const [endInput, setEndInput] = useState(end.toString());
  const isInteractingWithStart = useRef(false);
  const isInteractingWithEnd = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync inputs when start/end changes (e.g. from slider)
  useEffect(() => {
    if (!isInteractingWithStart.current) {
      setStartInput(start.toString());
    }
  }, [start]);

  useEffect(() => {
    if (!isInteractingWithEnd.current) {
      setEndInput(end.toString());
    }
  }, [end]);

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
      const rawValue = e.target.value;
      // Only allow digits
      const sanitizedValue = rawValue.replace(/\D/g, '');
      setStartInput(sanitizedValue);
      
      if (sanitizedValue === '') return;

      const value = parseInt(sanitizedValue, 10);
      if (!isNaN(value) && value >= effectiveMin && value < end) {
        setStart(value);
        onChange(value, end);
      }
    },
    [effectiveMin, end, onChange]
  );

  const handleStartFocus = useCallback(() => {
    isInteractingWithStart.current = true;
  }, []);

  const handleStartBlur = useCallback(() => {
    isInteractingWithStart.current = false;
    // Commit current start value to input on blur
    setStartInput(start.toString());
  }, [start]);

  const handleEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      // Only allow digits
      const sanitizedValue = rawValue.replace(/\D/g, '');
      setEndInput(sanitizedValue);
      
      if (sanitizedValue === '') return;

      const value = parseInt(sanitizedValue, 10);
      if (!isNaN(value) && value > start && value <= effectiveMax) {
        setEnd(value);
        onChange(start, value);
      }
    },
    [effectiveMax, start, onChange]
  );

  const handleEndFocus = useCallback(() => {
    isInteractingWithEnd.current = true;
  }, []);

  const handleEndBlur = useCallback(() => {
    isInteractingWithEnd.current = false;
    // Commit current end value to input on blur
    setEndInput(end.toString());
  }, [end]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  }, []);

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
    <div className="flex flex-col gap-3 p-0">
      <div className="flex justify-between items-center text-sm min-h-8">
        <div className="flex items-center gap-3">
          <span className="text-text-muted font-medium uppercase text-[0.8125rem] tracking-wider">Year Range</span>
          <div className="flex items-center ml-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-[70px] px-2.5 py-1.5 text-sm border border-border rounded bg-bg text-text font-semibold text-center appearance-none"
              value={startInput}
              onChange={handleStartChange}
              onFocus={handleStartFocus}
              onBlur={handleStartBlur}
              onKeyDown={handleKeyDown}
              data-testid="year-input-start"
              aria-label="Start year"
            />
            <span className="px-2 text-text-muted font-medium">–</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-[70px] px-2.5 py-1.5 text-sm border border-border rounded bg-bg text-text font-semibold text-center appearance-none"
              value={endInput}
              onChange={handleEndChange}
              onFocus={handleEndFocus}
              onBlur={handleEndBlur}
              onKeyDown={handleKeyDown}
              data-testid="year-input-end"
              aria-label="End year"
            />
          </div>
        </div>
        <div className="min-h-6 flex items-center">
          {!isReset && (
            <button
              className="px-3 py-1.5 text-xs border border-border rounded bg-bg text-text-muted cursor-pointer transition-all duration-150 hover:bg-bg-alt hover:border-primary"
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
        className="relative h-7 mb-5 cursor-pointer"
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
              className="absolute top-2.5 h-1"
              style={{
                left: `${zoneStart}%`,
                width: `${zoneWidth}%`,
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
          className="absolute top-3 h-1 bg-primary rounded-sm opacity-60"
          style={{
            left: `${rangePercent.left}%`,
            right: `${rangePercent.right}%`,
          }}
        />
        {/* Tick marks */}
        <div className="absolute top-4 left-0 right-0 h-3 pointer-events-none" data-testid="year-range-ticks">
          {tickMarks.map((year) => {
            const position = ((year - effectiveMin) / totalRange) * 100;
            return (
              <div
                key={year}
                className="absolute w-px h-2 bg-text-muted opacity-40"
                style={{
                  left: `${position}%`,
                }}
                data-year={year}
              />
            );
          })}
        </div>
        <input
          type="range"
          className="year-range-slider absolute top-0 w-full h-7 appearance-none bg-transparent pointer-events-none z-[2]"
          min={effectiveMin}
          max={effectiveMax}
          value={start}
          onChange={handleStartChange}
          data-testid="year-range-start"
        />
        <input
          type="range"
          className="year-range-slider absolute top-0 w-full h-7 appearance-none bg-transparent pointer-events-none z-[1]"
          min={effectiveMin}
          max={effectiveMax}
          value={end}
          onChange={handleEndChange}
          data-testid="year-range-end"
        />
      </div>
      {/* Edge labels */}
      <div className="flex justify-between text-xs text-text-muted -mt-1">
        <span data-testid="year-range-min-label">{effectiveMin}</span>
        <span data-testid="year-range-max-label">{effectiveMax}</span>
      </div>
    </div>
  );
}

export default YearRangeFilter;
