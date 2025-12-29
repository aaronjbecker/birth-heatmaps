/**
 * D3 heatmap rendering logic
 */
import * as d3 from 'd3';
import type { CountryHeatmapData, HeatmapCell, ScrollInfo } from './types';
import { createColorScale, getColor } from './color-scales';

/**
 * Helper to get CSS variable value
 */
function getCSSVariable(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

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
  getScrollInfo: () => ScrollInfo | null;
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

  // Main group with margin transform
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Group for cells
  const cellsGroup = g.append('g')
    .attr('class', 'cells-group');

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

  // State for scroll information
  let currentScrollInfo: ScrollInfo | null = null;

  // Create color scale
  let colorScale = createColorScale(data.colorScale);

  // Create scales
  let xScale = d3.scaleBand<number>()
    .padding(cfg.cellPadding);

  let yScale = d3.scaleBand<string>()
    .domain(data.months)
    .range([0, height])
    .padding(cfg.cellPadding);

  function updateXAxis() {
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
      .style('fill', getCSSVariable('--color-svg-text'))
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    xAxisGroup.selectAll('line')
      .style('stroke', getCSSVariable('--color-svg-axis'));
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

    // Calculate scroll requirements
    const desiredCellHeight = height / 12; // 12 months
    const minCellWidth = desiredCellHeight * 0.25; // 25% aspect ratio
    const desiredCellWidth = width / years.length;
    const needsScroll = desiredCellWidth < minCellWidth;

    let scrollWidth: number;
    if (needsScroll) {
      scrollWidth = years.length * minCellWidth;
      currentScrollInfo = { needsScroll: true, scrollWidth };
    } else {
      scrollWidth = width;
      currentScrollInfo = { needsScroll: false, scrollWidth: width };
    }

    // Update x scale with appropriate range
    xScale.domain(years).range([0, scrollWidth]);

    // Update SVG width if scrolling is needed
    svg.attr('width', scrollWidth + margin.left + margin.right);

    // Filter cells
    const cells = newData.data.filter(
      (d) => d.year >= currentYearRange[0] && d.year <= currentYearRange[1]
    );

    // Update axes
    updateXAxis();

    const yAxis = d3.axisLeft(yScale).tickSize(0);
    yAxisGroup
      .call(yAxis)
      .select('.domain').remove();

    yAxisGroup.selectAll('text')
      .style('font-size', '12px')
      .style('fill', getCSSVariable('--color-svg-text'));

    yAxisGroup.selectAll('line')
      .style('stroke', getCSSVariable('--color-svg-axis'));

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
          .style('stroke', getCSSVariable('--color-text'))
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

    // Update scales
    yScale.range([0, height]);

    // Update axis position
    xAxisGroup.attr('transform', `translate(0,${height})`);

    // Re-render
    update(currentData, currentYearRange);
  }

  /**
   * Clean up
   */
  function destroy() {
    if (themeObserver) {
      themeObserver.disconnect();
    }
    svg.remove();
  }

  // Set up theme change listener
  const themeObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'data-theme') {
        // Re-render axes with new colors
        updateXAxis();
        const yAxis = d3.axisLeft(yScale).tickSize(0);
        yAxisGroup
          .call(yAxis)
          .select('.domain').remove();

        yAxisGroup.selectAll('text')
          .style('font-size', '12px')
          .style('fill', getCSSVariable('--color-svg-text'));

        yAxisGroup.selectAll('line')
          .style('stroke', getCSSVariable('--color-svg-axis'));
      }
    });
  });

  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });

  /**
   * Get current scroll information
   */
  function getScrollInfo(): ScrollInfo | null {
    return currentScrollInfo;
  }

  // Initial render
  update(data);

  return {
    svg,
    update,
    resize,
    destroy,
    getScrollInfo,
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
