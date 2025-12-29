/**
 * Tooltip component for heatmap cell hover display
 */
import React from 'react';
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

export function Tooltip({
  cell,
  x,
  y,
  visible,
  metric = 'daily_fertility_rate',
}: TooltipProps): React.ReactElement | null {
  if (!visible || !cell) {
    return null;
  }

  const offset = 15;
  const tooltipX = x + offset;
  const tooltipY = y + offset;

  // Keep tooltip within viewport
  const adjustedStyle: React.CSSProperties = {
    ...styles.container,
    left: tooltipX,
    top: tooltipY,
    opacity: visible ? 1 : 0,
  };

  const monthName = getMonthName(cell.month);
  const formattedValue = formatValue(cell.value, metric);
  const sourceName = getSourceDisplayName(cell.source);

  return (
    <div style={adjustedStyle}>
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
