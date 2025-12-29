import { test, expect } from '@playwright/test';
import { CountryPage } from './fixtures/page-objects';
import { TEST_COUNTRY, waitForHeatmapRender, waitForTooltipVisible, MONTH_ABBREV } from './fixtures/test-data';

test.describe('Heatmap Interactions', () => {
  test('tooltip shows on cell hover', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    await countryPage.hoverCell(10);

    // Wait for tooltip to appear
    await waitForTooltipVisible(page);

    // Verify tooltip is visible
    const isVisible = await countryPage.isTooltipVisible();
    expect(isVisible).toBe(true);
  });

  test('tooltip hides on mouseout', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    // Verify tooltip is visible
    let isVisible = await countryPage.isTooltipVisible();
    expect(isVisible).toBe(true);

    // Move mouse away from cells to empty area
    await page.mouse.move(10, 10);

    // Wait for tooltip transition (150ms as per Tooltip.tsx)
    await page.waitForTimeout(300);

    // Tooltip should be hidden (opacity should be 0 or element gone)
    const tooltipCount = await page.locator('div[style*="position: fixed"]').count();
    if (tooltipCount > 0) {
      const tooltip = countryPage.getTooltip();
      const opacity = await tooltip.evaluate(el => getComputedStyle(el).opacity);
      expect(parseFloat(opacity)).toBeLessThanOrEqual(0.1);
    }
    // If tooltip is removed from DOM entirely, that's also valid
  });

  test('tooltip positioned near cursor', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    const cell = countryPage.getHeatmapCells().nth(10);
    await cell.hover();
    await waitForTooltipVisible(page);

    // Get tooltip position
    const tooltipPos = await countryPage.getTooltipPosition();

    // Tooltip should be positioned somewhere on the page
    expect(tooltipPos.x).toBeGreaterThan(0);
    expect(tooltipPos.y).toBeGreaterThan(0);

    // Tooltip should be within viewport
    const viewport = page.viewportSize();
    if (viewport) {
      expect(tooltipPos.x).toBeLessThan(viewport.width);
      expect(tooltipPos.y).toBeLessThan(viewport.height);
    }
  });

  test('tooltip displays correct data (month, year)', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    // Get tooltip content
    const content = await countryPage.getTooltipContent();

    // Header should contain month and year
    expect(content.header).toBeTruthy();
    expect(content.header).toMatch(/[A-Za-z]+\s+\d{4}/); // "Month YYYY" format
  });

  test('tooltip displays formatted value', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    // Get tooltip content
    const content = await countryPage.getTooltipContent();

    // Value should be present and formatted
    expect(content.value).toBeTruthy();
    expect(content.value.length).toBeGreaterThan(0);

    // For fertility, should be numeric (possibly with decimals)
    // May contain formatting like commas or decimal points
    const hasNumbers = /\d/.test(content.value);
    expect(hasNumbers).toBe(true);
  });

  test('tooltip shows births count when available', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    // Get tooltip content
    const content = await countryPage.getTooltipContent();

    // Births might be available (depending on data)
    if (content.births) {
      expect(content.births).toBeTruthy();
      // Should be formatted as number with commas
      const hasNumber = /[\d,]+/.test(content.births);
      expect(hasNumber).toBe(true);
    }
  });

  test('tooltip shows population when available', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    // Get tooltip content
    const content = await countryPage.getTooltipContent();

    // Population might be available (depending on data)
    if (content.population) {
      expect(content.population).toBeTruthy();
      // Should be formatted as number
      const hasNumber = /[\d,]+/.test(content.population);
      expect(hasNumber).toBe(true);
    }
  });

  test('tooltip shows source name', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    // Get tooltip content
    const content = await countryPage.getTooltipContent();

    // Source should be displayed (at minimum a non-empty string)
    expect(content.source).toBeTruthy();
    expect(content.source!.length).toBeGreaterThan(0);

    // Source should be one of the known sources or contain relevant text
    const knownSources = ['HMD', 'UN', 'JPOP', 'Japan', 'Human Mortality', 'United Nations', 'Population'];
    const hasKnownSource = knownSources.some(src =>
      content.source?.toUpperCase().includes(src.toUpperCase())
    );
    expect(hasKnownSource).toBe(true);
  });

  test('tooltip has pointer-events none', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    // Check tooltip pointer-events
    const tooltip = countryPage.getTooltip();
    const pointerEvents = await tooltip.evaluate(el =>
      getComputedStyle(el).pointerEvents
    );

    expect(pointerEvents).toBe('none');
  });

  test('tooltip switches when moving between cells', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over first cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    const firstContent = await countryPage.getTooltipContent();

    // Hover over different cell
    await countryPage.hoverCell(25);
    await page.waitForTimeout(200);

    const secondContent = await countryPage.getTooltipContent();

    // Content should be different (different month/year)
    expect(firstContent.header).not.toBe(secondContent.header);
  });

  test('cell highlight applies on hover', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    const cell = countryPage.getHeatmapCells().nth(10);

    // Hover over cell
    await cell.hover();
    await page.waitForTimeout(200);

    // Check if stroke is applied via inline style
    const hoverStroke = await cell.evaluate(el => {
      const style = el.getAttribute('style') || '';
      const computedStroke = getComputedStyle(el).stroke;
      return { style, computedStroke };
    });

    // Either the style attribute should contain stroke, or computed style should not be 'none'
    const hasStrokeStyle = hoverStroke.style.includes('stroke');
    const hasStrokeComputed = hoverStroke.computedStroke !== 'none' && hoverStroke.computedStroke !== '';

    expect(hasStrokeStyle || hasStrokeComputed).toBe(true);
  });

  test('year range filter displays above heatmap', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Check year range filter is visible
    const filter = countryPage.getYearRangeFilter();
    await expect(filter).toBeVisible();

    // Check range text is visible
    const rangeText = await countryPage.getRangeText();
    expect(rangeText).toBeTruthy();
    expect(rangeText).toMatch(/\d{4}\s*[–-]\s*\d{4}/);
  });

  test('year range filter sliders are interactive', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Get start and end sliders
    const startSlider = countryPage.getStartSlider();
    const endSlider = countryPage.getEndSlider();

    await expect(startSlider).toBeVisible();
    await expect(endSlider).toBeVisible();

    // Check they are input type range
    await expect(startSlider).toHaveAttribute('type', 'range');
    await expect(endSlider).toHaveAttribute('type', 'range');
  });

  test('year range updates when slider changes', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Get initial range
    const initialRange = await countryPage.getRangeText();

    // Get slider attributes
    const startSlider = countryPage.getStartSlider();
    const min = await startSlider.getAttribute('min');
    const max = await startSlider.getAttribute('max');

    if (min && max) {
      const minYear = parseInt(min, 10);
      const maxYear = parseInt(max, 10);

      // Change the range (move start year forward)
      const newStart = Math.min(minYear + 5, maxYear - 1);
      await countryPage.setYearRange(newStart, maxYear);

      // Get updated range
      const updatedRange = await countryPage.getRangeText();

      // Range should have changed
      expect(updatedRange).not.toBe(initialRange);
      expect(updatedRange).toContain(newStart.toString());
    }
  });

  test('reset button shows when range is filtered', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Get slider range
    const startSlider = countryPage.getStartSlider();
    const min = await startSlider.getAttribute('min');
    const max = await startSlider.getAttribute('max');

    if (min && max) {
      const minYear = parseInt(min, 10);
      const maxYear = parseInt(max, 10);

      // Filter the range
      await countryPage.setYearRange(minYear + 5, maxYear);

      // Reset button should be visible
      const resetButton = countryPage.getResetButton();
      await expect(resetButton).toBeVisible();
    }
  });

  test('reset button restores full year range', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Get initial range
    const initialRange = await countryPage.getRangeText();

    // Get slider range
    const startSlider = countryPage.getStartSlider();
    const min = await startSlider.getAttribute('min');
    const max = await startSlider.getAttribute('max');

    if (min && max) {
      const minYear = parseInt(min, 10);
      const maxYear = parseInt(max, 10);

      // Filter the range
      await countryPage.setYearRange(minYear + 5, maxYear - 5);

      // Range should have changed
      const filteredRange = await countryPage.getRangeText();
      expect(filteredRange).not.toBe(initialRange);

      // Click reset
      await countryPage.clickReset();

      // Range should be restored
      const resetRange = await countryPage.getRangeText();
      expect(resetRange).toBe(initialRange);
    }
  });
});
