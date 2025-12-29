/**
 * Tooltip component for heatmap cell hover display
 */
import React, { useEffect, useRef, useState } from 'react';
import type { HeatmapCell } from '../lib/types';
import { getMonthName } from '../lib/d3-heatmap';
import { formatValue } from '../lib/color-scales';
import { getSourceDisplayName } from '../lib/data';

export interface TooltipProps {
  cell: HeatmapCell | null;
  x: number;
  y: number;
  visible: boolean;
  metric?: string;
  containerRef?: React.RefObject<HTMLElement>;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 1000,
    transition: 'opacity 0.15s ease-in-out',
  },
  tooltip: {
    backgroundColor: 'var(--color-tooltip-bg)',
    border: '1px solid var(--color-tooltip-border)',
    borderRadius: '4px',
    padding: '8px 12px',
    boxShadow: '0 2px 8px var(--color-shadow)',
    fontSize: '13px',
    lineHeight: '1.4',
    minWidth: '140px',
    maxWidth: '220px',
  },
  header: {
    fontWeight: 600,
    marginBottom: '4px',
    color: 'var(--color-text)',
  },
  value: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--color-text)',
    marginBottom: '4px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '2px',
    color: 'var(--color-text-muted)',
    fontSize: '12px',
  },
  label: {
    color: 'var(--color-text-muted)',
  },
  source: {
    marginTop: '6px',
    paddingTop: '6px',
    borderTop: '1px solid var(--color-border-light)',
    fontSize: '11px',
    color: 'var(--color-text-muted)',
  },
};

/**
 * Calculate tooltip position that stays within viewport bounds
 */
function calculateTooltipPosition(
  cursorX: number,
  cursorY: number,
  tooltipWidth: number,
  tooltipHeight: number
): { x: number; y: number } {
  const offset = 15;
  const padding = 8;

  // Get viewport dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Default position: bottom-right of cursor
  let x = cursorX + offset;
  let y = cursorY + offset;

  // Check if tooltip would overflow right edge
  if (x + tooltipWidth + padding > viewportWidth) {
    // Position to the left of cursor
    x = cursorX - tooltipWidth - offset;
  }

  // Check if tooltip would overflow bottom edge
  if (y + tooltipHeight + padding > viewportHeight) {
    // Position above cursor
    y = cursorY - tooltipHeight - offset;
  }

  // Ensure tooltip doesn't go off left edge
  if (x < padding) {
    x = padding;
  }

  // Ensure tooltip doesn't go off top edge
  if (y < padding) {
    y = padding;
  }

  return { x, y };
}

export function Tooltip({
  cell,
  x,
  y,
  visible,
  metric = 'daily_fertility_rate',
}: TooltipProps): React.ReactElement | null {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: x + 15, y: y + 15 });

  useEffect(() => {
    if (!visible || !cell || !tooltipRef.current) {
      return;
    }

    // Get tooltip dimensions
    const rect = tooltipRef.current.getBoundingClientRect();

    // Calculate position that stays within viewport
    const newPosition = calculateTooltipPosition(x, y, rect.width, rect.height);
    setPosition(newPosition);
  }, [visible, cell, x, y]);

  if (!visible || !cell) {
    return null;
  }

  const monthName = getMonthName(cell.month);
  const formattedValue = formatValue(cell.value, metric);
  const sourceName = getSourceDisplayName(cell.source);

  const tooltipStyle: React.CSSProperties = {
    ...styles.container,
    left: position.x,
    top: position.y,
    opacity: visible ? 1 : 0,
  };

  return (
    <div ref={tooltipRef} style={tooltipStyle}>
      <div style={styles.tooltip}>
        <div style={styles.header}>
          {monthName} {cell.year}
        </div>
        <div style={styles.value}>
          {formattedValue}
        </div>
        {cell.births !== undefined && cell.births !== null && (
          <div style={styles.row}>
            <span style={styles.label}>Births:</span>
            <span>{cell.births.toLocaleString()}</span>
          </div>
        )}
        {cell.population !== undefined && cell.population !== null && (
          <div style={styles.row}>
            <span style={styles.label}>Population:</span>
            <span>{cell.population.toLocaleString()}</span>
          </div>
        )}
        <div style={styles.source}>
          Source: {sourceName}
        </div>
      </div>
    </div>
  );
}

export default Tooltip;
