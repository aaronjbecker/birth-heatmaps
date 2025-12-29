/**
 * React wrapper component for D3 heatmap visualization
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CountryHeatmapData, HeatmapCell, TooltipState } from '../lib/types';
import { createHeatmap, type HeatmapInstance } from '../lib/d3-heatmap';
import { Tooltip } from './Tooltip';
import { ColorLegend } from './ColorLegend';
import { YearRangeFilter } from './YearRangeFilter';

export interface HeatmapD3Props {
  data: CountryHeatmapData;
  width?: number;
  height?: number;
  showLegend?: boolean;
  showYearFilter?: boolean;
  showControls?: boolean;
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
}: HeatmapD3Props): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const heatmapRef = useRef<HeatmapInstance | null>(null);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    cell: null,
  });

  const [yearRange, setYearRange] = useState<[number, number]>([
    Math.min(...data.years),
    Math.max(...data.years),
  ]);

  const [containerWidth, setContainerWidth] = useState<number>(width || 800);

  const [scrollEnabled, setScrollEnabled] = useState<boolean>(false);

  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  const [scrollState, setScrollState] = useState({
    atStart: true,    // Whether scrolled to leftmost position
    atEnd: false,     // Whether scrolled to rightmost position
  });

  // Handle cell hover
  const handleCellHover = useCallback((cell: HeatmapCell | null, event: MouseEvent) => {
    if (cell) {
      setTooltip({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        cell,
      });
      setHoveredValue(cell.value);
    } else {
      setTooltip((prev) => ({ ...prev, visible: false }));
      setHoveredValue(null);
    }
  }, []);

  // Handle year range change
  const handleYearRangeChange = useCallback((start: number, end: number) => {
    setYearRange([start, end]);
    if (heatmapRef.current) {
      heatmapRef.current.update(data, [start, end]);

      // Update scroll state
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
      atStart: scrollLeft <= 1,  // Small threshold for rounding
      atEnd: scrollLeft + clientWidth >= scrollWidth - 1,
    });
  }, []);

  // Initialize D3 heatmap
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Clean up previous instance
    if (heatmapRef.current) {
      heatmapRef.current.destroy();
    }

    // Get container dimensions
    const rect = container.getBoundingClientRect();
    setContainerWidth(rect.width);

    // Create new heatmap
    heatmapRef.current = createHeatmap(
      container,
      data,
      {},
      handleCellHover
    );

    // Apply initial year range
    heatmapRef.current.update(data, yearRange);

    // Update scroll state
    const scrollInfo = heatmapRef.current.getScrollInfo();
    setScrollEnabled(scrollInfo?.needsScroll ?? false);

    return () => {
      if (heatmapRef.current) {
        heatmapRef.current.destroy();
        heatmapRef.current = null;
      }
    };
  }, [data]); // Only re-create on data change

  // Handle resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        setContainerWidth(newWidth);
        if (heatmapRef.current && newWidth > 0 && newHeight > 0) {
          heatmapRef.current.resize(newWidth, newHeight);

          // Update scroll state after resize
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

    // Update initial scroll state
    updateScrollState();

    // Attach scroll listener
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
      // Reset to default state when scrolling is disabled
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
        {/* Scrolling container */}
        <div
          ref={scrollWrapperRef}
          style={{
            ...styles.heatmapContainer,
            height,
            overflowX: scrollEnabled ? 'auto' : 'hidden',
          }}
        >
          {/* D3 will render into this container */}
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Left scroll indicator - positioned outside scrolling context */}
        <div
          style={{
            ...styles.scrollIndicatorLeft,
            opacity: scrollEnabled && !scrollState.atStart ? 1 : 0,
          }}
        >
          ← more left
        </div>

        {/* Right scroll indicator - positioned outside scrolling context */}
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
            colorScale={data.colorScale}
            width={containerWidth - 32}
            metric={data.metric}
            hoveredValue={hoveredValue}
          />
        </div>
      )}

      <Tooltip
        cell={tooltip.cell}
        x={tooltip.x}
        y={tooltip.y}
        visible={tooltip.visible}
        metric={data.metric}
      />
    </div>
  );
}

export default HeatmapD3;
