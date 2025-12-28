/**
 * D3 heatmap rendering logic
 */
import * as d3 from 'd3';
import type { CountryHeatmapData, HeatmapCell } from './types';
import { createColorScale, getColor } from './color-scales';

export interface HeatmapConfig {
  margin: { top: number; right: number; bottom: number; left: number };
  cellPadding: number;
  minCellWidth: number;
  minCellHeight: number;
}

export interface HeatmapInstance {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  update: (data: CountryHeatmapData, yearRange?: [number, number]) => void;
  resize: (width: number, height: number) => void;
  destroy: () => void;
  resetZoom: () => void;
}

const defaultConfig: HeatmapConfig = {
  margin: { top: 20, right: 30, bottom: 50, left: 60 },
  cellPadding: 0.05,
  minCellWidth: 8,
  minCellHeight: 20,
};

/**
 * Create a heatmap instance
 */
export function createHeatmap(
  container: HTMLElement,
  data: CountryHeatmapData,
  config: Partial<HeatmapConfig> = {},
  onCellHover?: (cell: HeatmapCell | null, event: MouseEvent) => void
): HeatmapInstance {
  const cfg = { ...defaultConfig, ...config };
  const { margin } = cfg;

  // Get container dimensions
  const containerRect = container.getBoundingClientRect();
  let width = containerRect.width - margin.left - margin.right;
  let height = containerRect.height - margin.top - margin.bottom;

  // Clear any existing content
  d3.select(container).selectAll('*').remove();

  // Create SVG
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .attr('class', 'heatmap-svg');

  // Create clip path for zoom
  const defs = svg.append('defs');
  defs.append('clipPath')
    .attr('id', 'heatmap-clip')
    .append('rect')
    .attr('width', width)
    .attr('height', height);

  // Main group with margin transform
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Background for zoom handling
  g.append('rect')
    .attr('class', 'zoom-rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'transparent');

  // Clipped group for cells
  const cellsGroup = g.append('g')
    .attr('class', 'cells-group')
    .attr('clip-path', 'url(#heatmap-clip)');

  // Axes groups
  const xAxisGroup = g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${height})`);

  const yAxisGroup = g.append('g')
    .attr('class', 'y-axis');

  // State for current data and year range
  let currentData = data;
  let currentYearRange: [number, number] = [
    Math.min(...data.years),
    Math.max(...data.years),
  ];

  // Create color scale
  let colorScale = createColorScale(data.colorScale);

  // Create scales
  let xScale = d3.scaleBand<number>()
    .padding(cfg.cellPadding);

  let yScale = d3.scaleBand<string>()
    .domain(data.months)
    .range([0, height])
    .padding(cfg.cellPadding);

  // Zoom behavior
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([1, 8])
    .translateExtent([[0, 0], [width + margin.left + margin.right, height + margin.top + margin.bottom]])
    .extent([[0, 0], [width, height]])
    .on('zoom', zoomed);

  svg.call(zoom);

  function zoomed(event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {

    // Apply transform to cells
    cellsGroup.attr('transform', event.transform.toString());

    // Update axes with new scale
    const newXScale = event.transform.rescaleX(xScale as unknown as d3.ScaleLinear<number, number, never>);
    updateXAxis(newXScale);
  }

  function updateXAxis(_scale?: d3.ScaleLinear<number, number, never> | d3.ScaleBand<number>) {
    const years = currentData.years.filter(
      (y) => y >= currentYearRange[0] && y <= currentYearRange[1]
    );

    // Determine tick spacing based on number of years
    const tickInterval = years.length > 50 ? 10 : years.length > 20 ? 5 : 1;
    const tickYears = years.filter((y) => y % tickInterval === 0);

    const axis = d3.axisBottom(xScale)
      .tickValues(tickYears)
      .tickSize(0);

    xAxisGroup
      .call(axis)
      .select('.domain').remove();

    xAxisGroup.selectAll('text')
      .style('font-size', '11px')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');
  }

  /**
   * Update heatmap with new data or year range
   */
  function update(newData: CountryHeatmapData, yearRange?: [number, number]) {
    currentData = newData;
    colorScale = createColorScale(newData.colorScale);

    if (yearRange) {
      currentYearRange = yearRange;
    } else {
      currentYearRange = [
        Math.min(...newData.years),
        Math.max(...newData.years),
      ];
    }

    // Filter years
    const years = newData.years.filter(
      (y) => y >= currentYearRange[0] && y <= currentYearRange[1]
    );

    // Update x scale
    xScale.domain(years).range([0, width]);

    // Filter cells
    const cells = newData.data.filter(
      (d) => d.year >= currentYearRange[0] && d.year <= currentYearRange[1]
    );

    // Update axes
    updateXAxis(xScale);

    const yAxis = d3.axisLeft(yScale).tickSize(0);
    yAxisGroup
      .call(yAxis)
      .select('.domain').remove();

    yAxisGroup.selectAll('text')
      .style('font-size', '12px');

    // Bind data
    const rects = cellsGroup.selectAll<SVGRectElement, HeatmapCell>('rect.cell')
      .data(cells, (d) => `${d.year}-${d.month}`);

    // Exit
    rects.exit().remove();

    // Enter + Update
    rects.enter()
      .append('rect')
      .attr('class', 'cell')
      .merge(rects)
      .attr('x', (d) => xScale(d.year) || 0)
      .attr('y', (d) => yScale(newData.months[d.month - 1]) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('rx', 2)
      .attr('ry', 2)
      .style('fill', (d) => getColor(colorScale, d.value))
      .style('stroke', 'none')
      .style('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent, d: HeatmapCell) {
        d3.select(this)
          .style('stroke', '#333')
          .raise();
        if (onCellHover) {
          onCellHover(d, event);
        }
      })
      .on('mousemove', function (event: MouseEvent, d: HeatmapCell) {
        if (onCellHover) {
          onCellHover(d, event);
        }
      })
      .on('mouseleave', function () {
        d3.select(this)
          .style('stroke', 'none');
        if (onCellHover) {
          onCellHover(null, {} as MouseEvent);
        }
      });
  }

  /**
   * Resize heatmap
   */
  function resize(newWidth: number, newHeight: number) {
    width = newWidth - margin.left - margin.right;
    height = newHeight - margin.top - margin.bottom;

    svg
      .attr('width', newWidth)
      .attr('height', newHeight);

    // Update clip path
    defs.select('#heatmap-clip rect')
      .attr('width', width)
      .attr('height', height);

    // Update background
    g.select('.zoom-rect')
      .attr('width', width)
      .attr('height', height);

    // Update scales
    yScale.range([0, height]);

    // Update axis position
    xAxisGroup.attr('transform', `translate(0,${height})`);

    // Re-render
    update(currentData, currentYearRange);
  }

  /**
   * Reset zoom to initial state
   */
  function resetZoom() {
    svg.transition()
      .duration(300)
      .call(zoom.transform, d3.zoomIdentity);
  }

  /**
   * Clean up
   */
  function destroy() {
    svg.remove();
  }

  // Initial render
  update(data);

  return {
    svg,
    update,
    resize,
    destroy,
    resetZoom,
  };
}

/**
 * Get month name from month number
 */
export function getMonthName(month: number): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return months[month - 1] || '';
}
