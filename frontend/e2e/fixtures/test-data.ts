/**
 * Test data utilities and constants for E2E tests
 */
import { type Page } from '@playwright/test';

/**
 * Test country with known comprehensive data
 * United States of America has extensive HMD data coverage
 */
export const TEST_COUNTRY = {
  code: 'united-states-of-america',
  name: 'United States of America',
  // Year range and cell count will be determined dynamically from actual data
};

/**
 * Wait for heatmap to fully render
 * Accounts for D3 rendering and transitions
 *
 * @param page - Playwright page object
 * @param timeout - Maximum wait time in ms (default: 5000)
 */
export async function waitForHeatmapRender(page: Page, timeout: number = 5000): Promise<void> {
  // Wait for SVG element to be visible
  await page.waitForSelector('.heatmap-svg', { state: 'visible', timeout });

  // Wait for cells to be attached
  await page.waitForSelector('rect.cell', { state: 'attached', timeout });

  // Wait for D3 transitions to complete (typical D3 transition is 200-300ms)
  await page.waitForTimeout(300);
}

/**
 * Get the computed fill color of a heatmap cell
 *
 * @param page - Playwright page object
 * @param index - Index of the cell (0-based)
 * @returns RGB color string or fill attribute value
 */
export async function getCellColor(page: Page, index: number): Promise<string> {
  const cell = page.locator('rect.cell').nth(index);
  return await cell.evaluate((el) => {
    const computed = getComputedStyle(el).fill;
    if (computed && computed !== 'none') {
      return computed;
    }
    return el.getAttribute('fill') || '';
  });
}

/**
 * Verify that both X and Y axes have been rendered
 *
 * @param page - Playwright page object
 * @throws Error if axes are not found
 */
export async function verifyAxes(page: Page): Promise<void> {
  const xAxisCount = await page.locator('.x-axis').count();
  const yAxisCount = await page.locator('.y-axis').count();

  if (xAxisCount === 0) {
    throw new Error('X-axis not found');
  }
  if (yAxisCount === 0) {
    throw new Error('Y-axis not found');
  }
}

/**
 * Get the number of years displayed in the heatmap based on cell count
 *
 * @param page - Playwright page object
 * @returns Number of years (cell count / 12)
 */
export async function getYearCount(page: Page): Promise<number> {
  const cellCount = await page.locator('rect.cell').count();
  return Math.floor(cellCount / 12);
}

/**
 * Parse year range from the displayed text (e.g., "1933 – 2023")
 *
 * @param rangeText - Text containing year range
 * @returns Tuple of [start, end] years
 */
export function parseYearRange(rangeText: string): [number, number] {
  const match = rangeText.match(/(\d{4})\s*[–-]\s*(\d{4})/);
  if (!match) {
    throw new Error(`Could not parse year range from: ${rangeText}`);
  }
  return [parseInt(match[1], 10), parseInt(match[2], 10)];
}

/**
 * Wait for tooltip to appear and become visible
 *
 * @param page - Playwright page object
 * @param timeout - Maximum wait time in ms (default: 2000)
 */
export async function waitForTooltipVisible(page: Page, timeout: number = 2000): Promise<void> {
  const tooltip = page.locator('div[style*="position: fixed"]').first();
  await tooltip.waitFor({ state: 'visible', timeout });

  // Wait for opacity transition
  await page.waitForFunction(
    () => {
      const el = document.querySelector('div[style*="position: fixed"]');
      return el && getComputedStyle(el as HTMLElement).opacity === '1';
    },
    { timeout }
  );
}

/**
 * Wait for navigation to complete and page to be ready
 *
 * @param page - Playwright page object
 */
export async function waitForNavigation(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  // Small buffer for any client-side rendering
  await page.waitForTimeout(100);
}

/**
 * Check if a color is gray (null value indicator)
 * Gray colors are used for null/missing data
 *
 * @param color - RGB color string or hex
 * @returns True if color is gray (#e0e0e0 or similar)
 */
export function isGrayColor(color: string): boolean {
  // Check for common gray values
  const grayPatterns = [
    /rgb\(224,\s*224,\s*224\)/, // rgb(224, 224, 224) = #e0e0e0
    /rgb\(192,\s*192,\s*192\)/, // rgb(192, 192, 192) = #c0c0c0
    /#e0e0e0/i,
    /#c0c0c0/i,
  ];

  return grayPatterns.some(pattern => pattern.test(color));
}

/**
 * Month names for validation
 */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Month abbreviations (short form)
 */
export const MONTH_ABBREV = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Known color schemes used in the application
 */
export const COLOR_SCHEMES = {
  FERTILITY: 'turbo', // Sequential scheme for fertility data
  SEASONALITY: 'RdBu', // Diverging scheme for seasonality data
};

/**
 * Expected metric types
 */
export const METRICS = {
  FERTILITY: 'daily_fertility_rate',
  SEASONALITY_RATIO: 'seasonality_ratio',
  SEASONALITY_PCT: 'seasonality_pct',
};

/**
 * Wait for PhotoSwipe lightbox to open
 *
 * @param page - Playwright page object
 * @param timeout - Maximum wait time in ms (default: 2000)
 */
export async function waitForLightboxOpen(page: Page, timeout: number = 2000): Promise<void> {
  // Wait for PhotoSwipe container with 'pswp--open' class
  await page.waitForSelector('.pswp.pswp--open', { state: 'visible', timeout });

  // Wait for image to load
  await page.waitForSelector('.pswp__img', { state: 'visible', timeout });

  // Small buffer for animations
  await page.waitForTimeout(300);
}

/**
 * Wait for PhotoSwipe lightbox to close
 *
 * @param page - Playwright page object
 * @param timeout - Maximum wait time in ms (default: 2000)
 */
export async function waitForLightboxClose(page: Page, timeout: number = 2000): Promise<void> {
  // Wait for pswp--open class to be removed
  await page.waitForFunction(
    () => {
      const pswp = document.querySelector('.pswp');
      return !pswp || !pswp.classList.contains('pswp--open');
    },
    { timeout }
  );

  // Small buffer for animations
  await page.waitForTimeout(200);
}

/**
 * Chart types available in the gallery
 * Matches CHART_TYPES from content/config.ts
 */
export const GALLERY_CHART_TYPES = [
  'fertility_heatmap',
  'seasonality_heatmap',
  'monthly_fertility_chart',
  'monthly_fertility_boxplot',
  'population_chart',
  'births_chart',
  'daily_fertility_rate_chart',
] as const;

/**
 * Expected chart count per country page
 */
export const EXPECTED_CHART_COUNT = 7;

/**
 * Get the src of the currently active PhotoSwipe image
 *
 * @param page - Playwright page object
 * @returns The src attribute of the active image, or null if not found
 */
export async function getActiveLightboxImageSrc(page: Page): Promise<string | null> {
  // Wait a moment for PhotoSwipe to settle
  await page.waitForTimeout(300);

  return await page.evaluate(() => {
    // Try multiple selectors in order of preference
    const selectors = [
      '.pswp__item--active .pswp__img:not(.pswp__img--placeholder)',
      '.pswp__img:not(.pswp__img--placeholder)',
      '.pswp__img',
    ];

    for (const selector of selectors) {
      const img = document.querySelector(selector);
      if (img && img.getAttribute('src')) {
        return img.getAttribute('src');
      }
    }

    return null;
  });
}
