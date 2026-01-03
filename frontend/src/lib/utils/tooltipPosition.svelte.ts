/**
 * Tooltip positioning utility using @floating-ui/dom
 * Positions tooltip relative to an SVG element (heatmap cell)
 */
import {
  computePosition,
  flip,
  offset,
  shift,
  arrow,
  type Middleware,
  type Placement,
} from '@floating-ui/dom';
import { applyArrow } from './tooltipArrow';

interface TooltipConfig {
  tooltipRef: HTMLElement | null;
  arrowRef: HTMLElement | null;
  referenceElement: SVGRectElement | Element | null;
  placement?: string;
  offsetPx?: number;
  arrowSizePx?: number;
  arrowPadding?: number;
  showTooltip?: boolean;
}

/**
 * Position a tooltip relative to an SVG element
 * Call this in $effect.pre() for synchronous positioning before render
 */
export function positionTooltip(config: TooltipConfig): void {
  const {
    tooltipRef,
    arrowRef,
    referenceElement,
    placement = 'top',
    offsetPx = 10,
    arrowSizePx = 8,
    arrowPadding = 5,
    showTooltip = true,
  } = config;

  if (!showTooltip || !tooltipRef || !referenceElement) return;

  const middleware: Middleware[] = [
    offset(offsetPx),
    flip({ fallbackPlacements: ['bottom', 'right', 'left'] }),
    shift({ padding: 8 }),
  ];

  if (arrowRef) {
    middleware.push(arrow({ element: arrowRef, padding: arrowPadding }));
  }

  computePosition(referenceElement, tooltipRef, {
    strategy: 'absolute',
    placement: placement as Placement,
    middleware,
  }).then(({ x, y, placement: finalPlacement, middlewareData }) => {
    if (!tooltipRef) return;

    Object.assign(tooltipRef.style, {
      left: `${x}px`,
      top: `${y}px`,
    });

    if (arrowRef) {
      applyArrow({
        placement: finalPlacement,
        middlewareData,
        config: {
          arrowRef,
          arrowSizePx,
        },
      });
    }
  });
}

interface MouseTooltipConfig {
  tooltipRef: HTMLElement | null;
  arrowRef: HTMLElement | null;
  containerEl: HTMLElement | null;
  offsetX: number | null;
  offsetY: number | null;
  placement?: string;
  offsetPx?: number;
  arrowSizePx?: number;
  arrowPadding?: number;
  showTooltip?: boolean;
}

/**
 * Position a tooltip at mouse coordinates (virtual reference)
 * Useful for charts where tooltip follows the cursor
 */
export function positionTooltipAtMouse(config: MouseTooltipConfig): void {
  const {
    tooltipRef,
    arrowRef,
    containerEl,
    offsetX,
    offsetY,
    placement = 'top',
    offsetPx = 10,
    arrowSizePx = 8,
    arrowPadding = 5,
    showTooltip = true,
  } = config;

  if (!showTooltip || !tooltipRef || !containerEl || offsetX === null || offsetY === null) return;

  const middleware: Middleware[] = [
    offset(offsetPx),
    flip(),
    shift({ padding: 8 }),
  ];

  if (arrowRef) {
    middleware.push(arrow({ element: arrowRef, padding: arrowPadding }));
  }

  const { left: containerLeft, top: containerTop } = containerEl.getBoundingClientRect();
  const x = offsetX + containerLeft;
  const y = offsetY + containerTop;

  // Create virtual reference element at mouse position
  const virtualReference = {
    getBoundingClientRect() {
      return {
        x,
        y,
        top: y,
        left: x,
        bottom: y,
        right: x,
        width: 0,
        height: 0,
      };
    },
  };

  computePosition(virtualReference, tooltipRef, {
    strategy: 'absolute',
    placement: placement as Placement,
    middleware,
  }).then(({ x: posX, y: posY, placement: finalPlacement, middlewareData }) => {
    if (!tooltipRef) return;

    Object.assign(tooltipRef.style, {
      left: `${posX}px`,
      top: `${posY}px`,
    });

    if (arrowRef) {
      applyArrow({
        placement: finalPlacement,
        middlewareData,
        config: {
          arrowRef,
          arrowSizePx,
        },
      });
    }
  });
}
