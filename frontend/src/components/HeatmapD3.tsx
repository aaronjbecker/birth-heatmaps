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
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '16px',
    padding: '0 8px',
  },
  controlsLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  controlsRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  heatmapContainer: {
    width: '100%',
    minHeight: '400px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    color: '#888',
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

  // Handle cell hover
  const handleCellHover = useCallback((cell: HeatmapCell | null, event: MouseEvent) => {
    if (cell) {
      setTooltip({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        cell,
      });
    } else {
      setTooltip((prev) => ({ ...prev, visible: false }));
    }
  }, []);

  // Handle year range change
  const handleYearRangeChange = useCallback((start: number, end: number) => {
    setYearRange([start, end]);
    if (heatmapRef.current) {
      heatmapRef.current.update(data, [start, end]);
    }
  }, [data]);

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
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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
      {showControls && (
        <div style={styles.controls}>
          <div style={styles.controlsLeft}>
            {showLegend && (
              <ColorLegend
                colorScale={data.colorScale}
                width={Math.min(200, containerWidth * 0.3)}
                metric={data.metric}
              />
            )}
          </div>
          <div style={styles.controlsRight}>
            {showYearFilter && (
              <YearRangeFilter
                min={minYear}
                max={maxYear}
                start={yearRange[0]}
                end={yearRange[1]}
                onChange={handleYearRangeChange}
              />
            )}
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        style={{ ...styles.heatmapContainer, height }}
      />

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
