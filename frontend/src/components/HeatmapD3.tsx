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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2 text-red-600 dark:text-red-400">
        <span>No data available</span>
        <span className="text-xs text-text-muted">
          Run the data pipeline to generate JSON files
        </span>
      </div>
    );
  }

  const minYear = Math.min(...data.years);
  const maxYear = Math.max(...data.years);

  return (
    <div className="flex flex-col w-full">
      {showControls && showYearFilter && (
        <div className="w-full mb-4 px-4">
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

      <div className="relative">
        {/* Scrolling container - also serves as tooltip container */}
        <div
          ref={scrollWrapperRef}
          className="relative w-full min-h-[400px] border border-border rounded overflow-hidden"
          style={{
            height,
            overflowX: scrollEnabled ? 'auto' : 'hidden',
          }}
          onPointerLeave={handleContainerPointerLeave}
          onPointerDown={handleContainerPointerDown}
        >
          {/* D3 will render SVG and tooltip into this container */}
          <div ref={containerRef} className="w-full h-full" />
        </div>

        {/* Left scroll indicator */}
        <div
          className="absolute left-0 bottom-0 h-7 w-[90px] pointer-events-none flex items-center pl-2.5 text-[11px] font-medium text-text-muted transition-opacity duration-200 z-10"
          style={{
            background: 'linear-gradient(to right, var(--color-bg), transparent)',
            opacity: scrollEnabled && !scrollState.atStart ? 1 : 0,
          }}
        >
          ← more left
        </div>

        {/* Right scroll indicator */}
        <div
          className="absolute right-0 bottom-0 h-7 w-[110px] pointer-events-none flex items-center justify-end pr-2.5 text-[11px] font-medium text-text-muted transition-opacity duration-200 z-10"
          style={{
            background: 'linear-gradient(to left, var(--color-bg), transparent)',
            opacity: scrollEnabled && !scrollState.atEnd ? 1 : 0,
          }}
        >
          more right →
        </div>
      </div>

      {showControls && showLegend && (
        <div className="w-full mt-4 px-4">
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
