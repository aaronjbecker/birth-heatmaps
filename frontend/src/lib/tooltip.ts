/**
 * D3-native tooltip using @floating-ui/dom for positioning
 * Bypasses React entirely for immediate positioning
 */
import { computePosition, offset, flip, shift, autoUpdate } from '@floating-ui/dom';
import type { HeatmapCell } from './types';
import { getMonthName } from './d3-heatmap';
import { formatValue } from './color-scales';
import { getSourceDisplayName } from './data';

export interface TooltipInstance {
  show: (cell: HeatmapCell, referenceElement: SVGRectElement, metric: string) => void;
  hide: () => void;
  destroy: () => void;
  isVisible: () => boolean;
}

/**
 * Create a tooltip instance that renders directly to the DOM
 */
export function createTooltip(container: HTMLElement): TooltipInstance {
  // Create tooltip element
  const tooltipEl = document.createElement('div');
  tooltipEl.className = 'heatmap-tooltip';
  tooltipEl.setAttribute('data-testid', 'tooltip');
  tooltipEl.style.cssText = `
    position: absolute;
    pointer-events: none;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.1s ease-out;
    visibility: hidden;
  `;

  // Inner content container
  const contentEl = document.createElement('div');
  contentEl.style.cssText = `
    background-color: var(--color-tooltip-bg);
    border: 1px solid var(--color-tooltip-border);
    border-radius: 4px;
    padding: 8px 12px;
    box-shadow: 0 2px 8px var(--color-shadow);
    font-size: 13px;
    line-height: 1.4;
    min-width: 140px;
    max-width: 220px;
  `;
  tooltipEl.appendChild(contentEl);

  // Append to container
  container.appendChild(tooltipEl);

  let cleanupAutoUpdate: (() => void) | null = null;
  let visible = false;

  function updateContent(cell: HeatmapCell, metric: string): void {
    const monthName = getMonthName(cell.month);
    const formattedValue = formatValue(cell.value, metric);
    const sourceName = getSourceDisplayName(cell.source);

    let html = `
      <div style="font-weight: 600; margin-bottom: 4px; color: var(--color-text);">
        ${monthName} ${cell.year}
      </div>
      <div style="font-size: 18px; font-weight: 700; color: var(--color-text); margin-bottom: 4px;">
        ${formattedValue}
      </div>
    `;

    if (cell.births !== undefined && cell.births !== null) {
      html += `
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: var(--color-text-muted); font-size: 12px;">
          <span>Births:</span>
          <span>${cell.births.toLocaleString()}</span>
        </div>
      `;
    }

    if (cell.population !== undefined && cell.population !== null) {
      html += `
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: var(--color-text-muted); font-size: 12px;">
          <span>Population:</span>
          <span>${cell.population.toLocaleString()}</span>
        </div>
      `;
    }

    html += `
      <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--color-border-light); font-size: 11px; color: var(--color-text-muted);">
        Source: ${sourceName}
      </div>
    `;

    contentEl.innerHTML = html;
  }

  function show(cell: HeatmapCell, referenceElement: SVGRectElement, metric: string): void {
    // Update content first
    updateContent(cell, metric);

    // Clean up previous autoUpdate if any
    if (cleanupAutoUpdate) {
      cleanupAutoUpdate();
      cleanupAutoUpdate = null;
    }

    // Position immediately using floating-ui
    const updatePosition = () => {
      computePosition(referenceElement, tooltipEl, {
        placement: 'top',
        middleware: [
          offset(10),
          flip({ fallbackPlacements: ['bottom', 'right', 'left'] }),
          shift({ padding: 8 }),
        ],
      }).then(({ x, y }) => {
        tooltipEl.style.left = `${x}px`;
        tooltipEl.style.top = `${y}px`;

        // Show after first position calculation
        if (!visible) {
          tooltipEl.style.visibility = 'visible';
          tooltipEl.style.opacity = '1';
          visible = true;
        }
      });
    };

    // Calculate position immediately
    updatePosition();

    // Set up autoUpdate for scroll/resize tracking
    cleanupAutoUpdate = autoUpdate(referenceElement, tooltipEl, updatePosition);
  }

  function hide(): void {
    if (cleanupAutoUpdate) {
      cleanupAutoUpdate();
      cleanupAutoUpdate = null;
    }
    tooltipEl.style.opacity = '0';
    tooltipEl.style.visibility = 'hidden';
    visible = false;
  }

  function destroy(): void {
    hide();
    tooltipEl.remove();
  }

  function isVisible(): boolean {
    return visible;
  }

  return {
    show,
    hide,
    destroy,
    isVisible,
  };
}
