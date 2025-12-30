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
    color: 'var(--color-text)',
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
    const margin = { top: 30, left: 40, right: 40 }; // Increased top margin
    const barWidth = width - margin.left - margin.right;
    const indicatorScale = d3.scaleLinear()
      .domain([min, max])
      .range([margin.left, margin.left + barWidth]);

    const x = indicatorScale(clampedValue);

    // Get theme colors
    const indicatorColor = '#fbbf24'; // Tailwind amber-400

    // Create indicator group and shift it down to match the bar
    const indicator = svg.append('g')
      .attr('class', 'hover-indicator')
      .attr('transform', `translate(0, ${margin.top})`);

    // Vertical line
    indicator.append('line')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', indicatorColor)
      .attr('stroke-width', 3)
      .attr('opacity', 1);

    // Triangle at bottom
    indicator.append('path')
      .attr('d', `M ${x},${height} L ${x-8},${height+8} L ${x+8},${height+8} Z`)
      .attr('fill', indicatorColor)
      .attr('opacity', 1);

    // Label at top with background
    const labelText = formatValue(clampedValue, metric);
    const labelPaddingX = 6;
    const labelPaddingY = 2; // Reduced vertical padding

    // Measure text to create background rect
    const tempText = indicator.append('text')
      .attr('x', x)
      .attr('y', -8) // Closer to the bar
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 700)
      .text(labelText);

    const textBox = tempText.node()?.getBBox();

    if (textBox) {
      // Background rectangle
      indicator.insert('rect', 'text')
        .attr('x', textBox.x - labelPaddingX)
        .attr('y', textBox.y - labelPaddingY)
        .attr('width', textBox.width + labelPaddingX * 2)
        .attr('height', textBox.height + labelPaddingY * 2)
        .attr('fill', indicatorColor)
        .attr('rx', 3)
        .attr('ry', 3)
        .attr('opacity', 1);
    }

    // Style the text
    tempText
      .attr('fill', '#000000') // Black text on amber
      .attr('opacity', 1);

  }, [hoveredValue, colorScaleConfig, width, height, metric]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const colorScale = createColorScale(colorScaleConfig, metric);
    const domain = colorScaleConfig.domain;
    const min = domain[0];
    const max = domain[domain.length - 1];

    // Margin and layout
    const margin = { top: 30, left: 40, right: 40 }; // Increased top margin
    const barWidth = width - margin.left - margin.right;
    const g = svg.append('g').attr('transform', `translate(0, ${margin.top})`);

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
    g.append('rect')
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

    const tickGroup = g.append('g')
      .attr('transform', `translate(0, ${height + 2})`);

    ticks.forEach((tick) => {
      const x = tickScale(tick);

      tickGroup.append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', 0)
        .attr('y2', 4)
        .style('stroke', 'var(--color-svg-axis)');

      tickGroup.append('text')
        .attr('x', x)
        .attr('y', 14)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .style('fill', 'var(--color-text)')
        .text(formatValue(tick, metric));
    });

    // Add edge labels (min/max values)
    const edgeLabelsGroup = g.append('g')
      .attr('class', 'edge-labels');

    // Min label (left edge)
    edgeLabelsGroup.append('text')
      .attr('x', 0)
      .attr('y', -8)
      .attr('text-anchor', 'start')
      .attr('font-size', '12px')
      .attr('font-weight', 600)
      .style('fill', 'var(--color-text)')
      .attr('data-testid', 'legend-min-label')
      .text(formatValue(min, metric));

    // Max label (right edge)
    edgeLabelsGroup.append('text')
      .attr('x', width)
      .attr('y', -8)
      .attr('text-anchor', 'end')
      .attr('font-size', '12px')
      .attr('font-weight', 600)
      .style('fill', 'var(--color-text)')
      .attr('data-testid', 'legend-max-label')
      .text(formatValue(max, metric));
  }, [colorScaleConfig, width, height, metric]);

  const totalHeight = height + 75; // Increased to account for top and bottom spacing

  return (
    <div style={styles.container}>
      {title && <div style={styles.title}>{title}</div>}
      <svg ref={svgRef} width={width} height={totalHeight} />
    </div>
  );
}

export default ColorLegend;
