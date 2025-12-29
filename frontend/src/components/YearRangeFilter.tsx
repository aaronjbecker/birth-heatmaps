/**
 * Year range filter component with dual range slider
 */
import React, { useState, useCallback } from 'react';

export interface YearRangeFilterProps {
  min: number;
  max: number;
  start?: number;
  end?: number;
  onChange: (start: number, end: number) => void;
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
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-primary);
    border: 2px solid var(--color-bg-alt);
    box-shadow: 0 1px 3px var(--color-shadow);
    cursor: pointer;
  }
  .year-range-slider::-moz-range-thumb {
    pointer-events: all;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--color-primary);
    border: 2px solid var(--color-bg-alt);
    box-shadow: 0 1px 3px var(--color-shadow);
    cursor: pointer;
  }
`;

export function YearRangeFilter({
  min,
  max,
  start: initialStart,
  end: initialEnd,
  onChange,
}: YearRangeFilterProps): React.ReactElement {
  const [start, setStart] = useState(initialStart ?? min);
  const [end, setEnd] = useState(initialEnd ?? max);

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

  const handleReset = useCallback(() => {
    setStart(min);
    setEnd(max);
    onChange(min, max);
  }, [min, max, onChange]);

  const rangePercent = {
    left: ((start - min) / (max - min)) * 100,
    right: ((max - end) / (max - min)) * 100,
  };

  const isReset = start === min && end === max;

  return (
    <div style={styles.container}>
      <style>{sliderStyles}</style>
      <div style={styles.header}>
        <span style={styles.label}>Year Range</span>
        <span style={styles.range}>
          {start} – {end}
        </span>
        {!isReset && (
          <button
            style={styles.resetButton}
            onClick={handleReset}
            type="button"
          >
            Reset
          </button>
        )}
      </div>
      <div style={styles.sliderContainer}>
        <div style={styles.sliderTrack} />
        <div
          style={{
            ...styles.sliderRange,
            left: `${rangePercent.left}%`,
            right: `${rangePercent.right}%`,
          }}
        />
        <input
          type="range"
          className="year-range-slider"
          style={{ ...styles.slider, zIndex: 2 }}
          min={min}
          max={max}
          value={start}
          onChange={handleStartChange}
        />
        <input
          type="range"
          className="year-range-slider"
          style={{ ...styles.slider, zIndex: 1 }}
          min={min}
          max={max}
          value={end}
          onChange={handleEndChange}
        />
      </div>
    </div>
  );
}

export default YearRangeFilter;
