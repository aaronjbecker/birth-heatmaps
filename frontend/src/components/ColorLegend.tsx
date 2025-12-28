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
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 0',
  },
  title: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '6px',
  },
};

export function ColorLegend({
  colorScale: colorScaleConfig,
  width = 200,
  height = 16,
  metric = 'daily_fertility_rate',
  title,
}: ColorLegendProps): React.ReactElement {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

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
    const margin = { left: 5, right: 5 };
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
    const ticks = generateLegendTicks(domain, 5);
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
        .attr('stroke', '#999');

      tickGroup.append('text')
        .attr('x', x)
        .attr('y', 14)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#666')
        .text(formatValue(tick, metric));
    });
  }, [colorScaleConfig, width, height, metric]);

  const totalHeight = height + 20; // Space for ticks

  return (
    <div style={styles.container}>
      {title && <div style={styles.title}>{title}</div>}
      <svg ref={svgRef} width={width} height={totalHeight} />
    </div>
  );
}

export default ColorLegend;
