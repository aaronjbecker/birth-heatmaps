/**
 * Color legend component for heatmap visualization
 */
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import type { ColorScaleConfig } from '../lib/types';
import { createColorScale, generateLegendTicks, formatValue } from '../lib/color-scales';

export interface ColorLegendProps {
  colorScale: ColorScaleConfig;
  width?: number;
  height?: number;
  metric?: string;
  title?: string;
  hoveredValue?: number | null;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 16px',
  },
  title: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    marginBottom: '6px',
  },
};

export function ColorLegend({
  colorScale: colorScaleConfig,
  width = 800,
  height = 16,
  metric = 'daily_fertility_rate',
  title,
  hoveredValue,
}: ColorLegendProps): React.ReactElement {
  const svgRef = useRef<SVGSVGElement>(null);

  // Render hover indicator when hoveredValue changes (Stage 7)
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    // Remove any existing hover indicator
    svg.selectAll('.hover-indicator').remove();

    // If no hovered value, we're done
    if (hoveredValue === null || hoveredValue === undefined) return;

    const domain = colorScaleConfig.domain;
    const min = domain[0];
    const max = domain[domain.length - 1];

    // Clamp value to domain range
    const clampedValue = Math.max(min, Math.min(max, hoveredValue));

    // Create scale to position indicator
    const margin = { left: 40, right: 40 };
    const barWidth = width - margin.left - margin.right;
    const indicatorScale = d3.scaleLinear()
      .domain([min, max])
      .range([margin.left, margin.left + barWidth]);

    const x = indicatorScale(clampedValue);

    // Get theme colors
    const svgTextColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-svg-text').trim();

    // Create indicator group
    const indicator = svg.append('g')
      .attr('class', 'hover-indicator');

    // Vertical line
    indicator.append('line')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', svgTextColor)
      .attr('stroke-width', 2)
      .attr('opacity', 0.8);

    // Triangle at bottom
    indicator.append('path')
      .attr('d', `M ${x},${height} L ${x-6},${height+6} L ${x+6},${height+6} Z`)
      .attr('fill', svgTextColor)
      .attr('opacity', 0.8);

    // Label at top with background
    const labelText = formatValue(clampedValue, metric);
    const labelPadding = 4;

    // Measure text to create background rect
    const tempText = indicator.append('text')
      .attr('x', x)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', 600)
      .text(labelText);

    const textBox = tempText.node()?.getBBox();

    if (textBox) {
      // Background rectangle
      indicator.insert('rect', 'text')
        .attr('x', textBox.x - labelPadding)
        .attr('y', textBox.y - labelPadding)
        .attr('width', textBox.width + labelPadding * 2)
        .attr('height', textBox.height + labelPadding * 2)
        .attr('fill', 'var(--color-bg-alt)')
        .attr('stroke', svgTextColor)
        .attr('stroke-width', 1)
        .attr('rx', 3)
        .attr('ry', 3)
        .attr('opacity', 0.95);
    }

    // Style the text
    tempText
      .attr('fill', svgTextColor)
      .attr('opacity', 1);

  }, [hoveredValue, colorScaleConfig, width, height, metric]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Get theme-aware colors from CSS variables
    const svgAxisColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-svg-axis').trim();
    const svgTextColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-svg-text').trim();

    const colorScale = createColorScale(colorScaleConfig);
    const domain = colorScaleConfig.domain;
    const min = domain[0];
    const max = domain[domain.length - 1];

    // Create gradient
    const gradientId = `legend-gradient-${Math.random().toString(36).substring(2, 11)}`;
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');

    // Add color stops
    const numStops = 20;
    for (let i = 0; i <= numStops; i++) {
      const t = i / numStops;
      const value = min + t * (max - min);
      gradient.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', colorScale(value));
    }

    // Draw gradient bar
    const margin = { left: 40, right: 40 };
    const barWidth = width - margin.left - margin.right;

    svg.append('rect')
      .attr('x', margin.left)
      .attr('y', 0)
      .attr('width', barWidth)
      .attr('height', height)
      .attr('rx', 3)
      .attr('ry', 3)
      .attr('fill', `url(#${gradientId})`);

    // Add ticks
    const ticks = generateLegendTicks(domain, 7);
    const tickScale = d3.scaleLinear()
      .domain([min, max])
      .range([margin.left, margin.left + barWidth]);

    const tickGroup = svg.append('g')
      .attr('transform', `translate(0, ${height + 2})`);

    ticks.forEach((tick) => {
      const x = tickScale(tick);

      tickGroup.append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', 0)
        .attr('y2', 4)
        .attr('stroke', svgAxisColor);

      tickGroup.append('text')
        .attr('x', x)
        .attr('y', 14)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', svgTextColor)
        .text(formatValue(tick, metric));
    });

    // Add edge labels (min/max values)
    const edgeLabelsGroup = svg.append('g')
      .attr('class', 'edge-labels');

    // Min label (left edge)
    edgeLabelsGroup.append('text')
      .attr('x', 0)
      .attr('y', -5)
      .attr('text-anchor', 'start')
      .attr('font-size', '12px')
      .attr('font-weight', 600)
      .attr('fill', svgTextColor)
      .attr('data-testid', 'legend-min-label')
      .text(formatValue(min, metric));

    // Max label (right edge)
    edgeLabelsGroup.append('text')
      .attr('x', width)
      .attr('y', -5)
      .attr('text-anchor', 'end')
      .attr('font-size', '12px')
      .attr('font-weight', 600)
      .attr('fill', svgTextColor)
      .attr('data-testid', 'legend-max-label')
      .text(formatValue(max, metric));
  }, [colorScaleConfig, width, height, metric]);

  const totalHeight = height + 50; // Space for ticks and edge labels

  return (
    <div style={styles.container}>
      {title && <div style={styles.title}>{title}</div>}
      <svg ref={svgRef} width={width} height={totalHeight} />
    </div>
  );
}

export default ColorLegend;
