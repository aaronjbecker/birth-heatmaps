/**
 * Zoom and pan behavior utilities for D3 visualizations
 */
import * as d3 from 'd3';

export interface ZoomConfig {
  minScale: number;
  maxScale: number;
  translateExtent?: [[number, number], [number, number]];
  onZoom?: (transform: d3.ZoomTransform) => void;
  onZoomStart?: () => void;
  onZoomEnd?: () => void;
}

export interface ZoomController {
  zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  reset: () => void;
  zoomIn: (factor?: number) => void;
  zoomOut: (factor?: number) => void;
  panTo: (x: number, y: number) => void;
  getCurrentTransform: () => d3.ZoomTransform;
  setTransform: (transform: d3.ZoomTransform) => void;
  destroy: () => void;
}

const defaultConfig: ZoomConfig = {
  minScale: 1,
  maxScale: 8,
};

/**
 * Create a zoom controller for an SVG element
 */
export function createZoomController(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  width: number,
  height: number,
  config: Partial<ZoomConfig> = {}
): ZoomController {
  const cfg = { ...defaultConfig, ...config };
  let currentTransform = d3.zoomIdentity;

  const translateExtent = cfg.translateExtent || [
    [0, 0],
    [width, height],
  ];

  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([cfg.minScale, cfg.maxScale])
    .translateExtent(translateExtent)
    .extent([[0, 0], [width, height]])
    .on('start', () => {
      cfg.onZoomStart?.();
    })
    .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      currentTransform = event.transform;
      cfg.onZoom?.(event.transform);
    })
    .on('end', () => {
      cfg.onZoomEnd?.();
    });

  svg.call(zoom);

  function reset() {
    svg.transition()
      .duration(300)
      .call(zoom.transform, d3.zoomIdentity);
  }

  function zoomIn(factor = 1.5) {
    svg.transition()
      .duration(200)
      .call(zoom.scaleBy, factor);
  }

  function zoomOut(factor = 1.5) {
    svg.transition()
      .duration(200)
      .call(zoom.scaleBy, 1 / factor);
  }

  function panTo(x: number, y: number) {
    svg.transition()
      .duration(300)
      .call(zoom.translateTo, x, y);
  }

  function getCurrentTransform() {
    return currentTransform;
  }

  function setTransform(transform: d3.ZoomTransform) {
    svg.call(zoom.transform, transform);
  }

  function destroy() {
    svg.on('.zoom', null);
  }

  return {
    zoom,
    reset,
    zoomIn,
    zoomOut,
    panTo,
    getCurrentTransform,
    setTransform,
    destroy,
  };
}

/**
 * Constrain a transform within bounds
 */
export function constrainTransform(
  transform: d3.ZoomTransform,
  width: number,
  height: number,
  contentWidth: number,
  contentHeight: number
): d3.ZoomTransform {
  const { k, x, y } = transform;

  // Calculate bounds
  const minX = Math.min(0, width - contentWidth * k);
  const minY = Math.min(0, height - contentHeight * k);
  const maxX = 0;
  const maxY = 0;

  // Constrain
  const constrainedX = Math.max(minX, Math.min(maxX, x));
  const constrainedY = Math.max(minY, Math.min(maxY, y));

  return d3.zoomIdentity.translate(constrainedX, constrainedY).scale(k);
}

/**
 * Calculate the optimal zoom level to fit content
 */
export function calculateFitZoom(
  containerWidth: number,
  containerHeight: number,
  contentWidth: number,
  contentHeight: number,
  padding = 0.1
): number {
  const scaleX = (containerWidth * (1 - padding)) / contentWidth;
  const scaleY = (containerHeight * (1 - padding)) / contentHeight;
  return Math.min(scaleX, scaleY, 1);
}

/**
 * Calculate transform to center content
 */
export function calculateCenterTransform(
  containerWidth: number,
  containerHeight: number,
  contentWidth: number,
  contentHeight: number,
  scale = 1
): d3.ZoomTransform {
  const x = (containerWidth - contentWidth * scale) / 2;
  const y = (containerHeight - contentHeight * scale) / 2;
  return d3.zoomIdentity.translate(x, y).scale(scale);
}
