/**
 * Arrow positioning utility for floating-ui tooltips
 * Adapted from nameplay project
 */
import type { MiddlewareData, Coords } from '@floating-ui/dom';

interface ArrowConfig {
  arrowRef: HTMLElement;
  arrowSizePx?: number;
}

export function applyArrow({
  placement,
  middlewareData,
  config,
}: {
  placement: string;
  middlewareData: MiddlewareData;
  config: ArrowConfig;
}): void {
  const { arrowRef, arrowSizePx = 12 } = config;
  if (!middlewareData.arrow || !arrowRef) return;

  const { x, y } = middlewareData.arrow as Partial<Coords>;
  const arrowSize = `${arrowSizePx}px`;
  const arrowSideOffset = `${-arrowSizePx / 2}px`;
  const placementSide = placement.split('-')[0];
  const arrowSide = {
    top: 'bottom',
    right: 'left',
    bottom: 'top',
    left: 'right',
  }[placementSide] as string;

  const clipPath = {
    bottom: 'polygon(100% 0%, 100% 100%, 0% 100%)',
    top: 'polygon(0% 100%, 0% 0%, 100% 0%)',
    right: 'polygon(0% 100%, 100% 100%, 100% 0%)',
    left: 'polygon(0% 100%, 0% 0%, 100% 0%)',
  }[arrowSide];

  Object.assign(arrowRef.style, {
    left: x != null ? x + 'px' : '',
    top: y != null ? y + 'px' : '',
    [arrowSide]: arrowSideOffset,
    [placementSide]: '',
    height: arrowSize,
    width: arrowSize,
    clipPath,
  });
}
