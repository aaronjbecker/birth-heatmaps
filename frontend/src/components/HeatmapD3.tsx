/**
 * React wrapper component for D3 heatmap visualization
 */
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { CountryHeatmapData, ColorScaleConfig } from '../lib/types';
import { createHeatmap, type HeatmapInstance } from '../lib/d3-heatmap';
import { ColorLegend } from './ColorLegend';
import { YearRangeFilter } from './YearRangeFilter';

export interface HeatmapD3Props {
  data: CountryHeatmapData;
  width?: number;
  height?: number;
  showLegend?: boolean;
  showYearFilter?: boolean;
  showControls?: boolean;
  /** Override the color scale from data (used for unified scale in Compare view) */
  colorScaleOverride?: ColorScaleConfig;
  /** Callback when cell hover state changes (used for synchronized legends in Compare view) */
  onCellHover?: (value: number | null) => void;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  controlsTop: {
    width: '100%',
    marginBottom: '16px',
    padding: '0 16px',
  },
  controlsBottom: {
    width: '100%',
    marginTop: '16px',
    padding: '0 16px',
  },
  heatmapContainer: {
    position: 'relative',
    width: '100%',
    minHeight: '400px',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    color: 'var(--color-text-muted)',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    color: '#d32f2f',
    flexDirection: 'column',
    gap: '8px',
  },
  scrollIndicatorLeft: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: '28px',
    width: '90px',
    background: 'linear-gradient(to right, var(--color-bg), transparent)',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '10px',
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--color-text-muted)',
    transition: 'opacity 0.2s ease-in-out',
    zIndex: 10,
  },
  scrollIndicatorRight: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    height: '28px',
    width: '110px',
    background: 'linear-gradient(to left, var(--color-bg), transparent)',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: '10px',
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--color-text-muted)',
    transition: 'opacity 0.2s ease-in-out',
    zIndex: 10,
  },
};

export function HeatmapD3({
  data,
  width,
  height = 500,
  showLegend = true,
  showYearFilter = true,
  showControls = true,
  colorScaleOverride,
  onCellHover: onCellHoverCallback,
}: HeatmapD3Props): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const heatmapRef = useRef<HeatmapInstance | null>(null);

  const [yearRange, setYearRange] = useState<[number, number]>([
    Math.min(...data.years),
    Math.max(...data.years),
  ]);

  const [containerWidth, setContainerWidth] = useState<number>(width || 800);

  const [scrollEnabled, setScrollEnabled] = useState<boolean>(false);

  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  const [scrollState, setScrollState] = useState({
    atStart: true,
    atEnd: false,
  });

  // Create effective data with colorScaleOverride applied (for Compare view)
  const effectiveData = useMemo(() => {
    if (!colorScaleOverride) return data;
    return {
      ...data,
      colorScale: colorScaleOverride,
    };
  }, [data, colorScaleOverride]);

  // Handle value hover from D3 (for ColorLegend sync)
  const handleValueHover = useCallback((value: number | null) => {
    setHoveredValue(value);
    onCellHoverCallback?.(value);
  }, [onCellHoverCallback]);

  // Handle pointer leaving the heatmap container
  const handleContainerPointerLeave = useCallback(() => {
    heatmapRef.current?.hideTooltip();
  }, []);

  // Handle pointerdown on container - for touch dismissal when tapping outside cells
  const handleContainerPointerDown = useCallback((event: React.PointerEvent) => {
    const target = event.target as Element;
    if (!target.closest('rect.cell')) {
      heatmapRef.current?.hideTooltip();
    }
  }, []);

  // Handle year range change
  const handleYearRangeChange = useCallback((start: number, end: number) => {
    setYearRange([start, end]);
    if (heatmapRef.current) {
      heatmapRef.current.update(data, [start, end]);
      const scrollInfo = heatmapRef.current.getScrollInfo();
      setScrollEnabled(scrollInfo?.needsScroll ?? false);
    }
  }, [data]);

  // Handle scroll position changes
  const updateScrollState = useCallback(() => {
    if (!scrollWrapperRef.current) return;

    const wrapper = scrollWrapperRef.current;
    const { scrollLeft, scrollWidth, clientWidth } = wrapper;

    setScrollState({
      atStart: scrollLeft <= 1,
      atEnd: scrollLeft + clientWidth >= scrollWidth - 1,
    });
  }, []);

  // Initialize D3 heatmap
  useEffect(() => {
    if (!containerRef.current || !scrollWrapperRef.current) return;

    const container = containerRef.current;
    const tooltipContainer = scrollWrapperRef.current;

    // Clean up previous instance
    if (heatmapRef.current) {
      heatmapRef.current.destroy();
    }

    // Get container dimensions
    const rect = container.getBoundingClientRect();
    setContainerWidth(rect.width);

    // Create new heatmap with D3-native tooltip
    heatmapRef.current = createHeatmap(
      container,
      effectiveData,
      {},
      tooltipContainer,
      handleValueHover
    );

    // Apply initial year range
    heatmapRef.current.update(effectiveData, yearRange);

    // Update scroll state
    const scrollInfo = heatmapRef.current.getScrollInfo();
    setScrollEnabled(scrollInfo?.needsScroll ?? false);

    return () => {
      if (heatmapRef.current) {
        heatmapRef.current.destroy();
        heatmapRef.current = null;
      }
    };
  }, [effectiveData, handleValueHover]);

  // Handle resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        setContainerWidth(newWidth);
        if (heatmapRef.current && newWidth > 0 && newHeight > 0) {
          heatmapRef.current.resize(newWidth, newHeight);
          const scrollInfo = heatmapRef.current.getScrollInfo();
          setScrollEnabled(scrollInfo?.needsScroll ?? false);
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Handle scroll events
  useEffect(() => {
    if (!scrollWrapperRef.current) return;

    const wrapper = scrollWrapperRef.current;
    updateScrollState();
    wrapper.addEventListener('scroll', updateScrollState);

    return () => {
      wrapper.removeEventListener('scroll', updateScrollState);
    };
  }, [updateScrollState]);

  // Update scroll state when scrollEnabled changes
  useEffect(() => {
    if (scrollEnabled) {
      updateScrollState();
    } else {
      setScrollState({ atStart: true, atEnd: false });
    }
  }, [scrollEnabled, updateScrollState]);

  if (!data || !data.data || data.data.length === 0) {
    return (
      <div style={styles.error}>
        <span>No data available</span>
        <span style={{ fontSize: '12px', color: '#888' }}>
          Run the data pipeline to generate JSON files
        </span>
      </div>
    );
  }

  const minYear = Math.min(...data.years);
  const maxYear = Math.max(...data.years);

  return (
    <div style={styles.container}>
      {showControls && showYearFilter && (
        <div style={styles.controlsTop}>
          <YearRangeFilter
            min={minYear}
            max={maxYear}
            start={yearRange[0]}
            end={yearRange[1]}
            onChange={handleYearRangeChange}
            dataYears={data.years}
          />
        </div>
      )}

      <div style={{ position: 'relative' }}>
        {/* Scrolling container - also serves as tooltip container */}
        <div
          ref={scrollWrapperRef}
          style={{
            ...styles.heatmapContainer,
            height,
            overflowX: scrollEnabled ? 'auto' : 'hidden',
          }}
          onPointerLeave={handleContainerPointerLeave}
          onPointerDown={handleContainerPointerDown}
        >
          {/* D3 will render SVG and tooltip into this container */}
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Left scroll indicator */}
        <div
          style={{
            ...styles.scrollIndicatorLeft,
            opacity: scrollEnabled && !scrollState.atStart ? 1 : 0,
          }}
        >
          ← more left
        </div>

        {/* Right scroll indicator */}
        <div
          style={{
            ...styles.scrollIndicatorRight,
            opacity: scrollEnabled && !scrollState.atEnd ? 1 : 0,
          }}
        >
          more right →
        </div>
      </div>

      {showControls && showLegend && (
        <div style={styles.controlsBottom}>
          <ColorLegend
            colorScale={effectiveData.colorScale}
            width={containerWidth - 32}
            metric={effectiveData.metric}
            hoveredValue={hoveredValue}
          />
        </div>
      )}
    </div>
  );
}

export default HeatmapD3;
