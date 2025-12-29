import { test, expect } from '@playwright/test';
import { CountryPage } from './fixtures/page-objects';
import { TEST_COUNTRY, waitForHeatmapRender, verifyAxes, getCellColor, isGrayColor } from './fixtures/test-data';

test.describe('Heatmap Rendering', () => {
  test('SVG element renders with correct dimensions', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    const svg = countryPage.getHeatmapSVG();
    await expect(svg).toBeVisible();

    // Check SVG has width and height
    const width = await svg.getAttribute('width');
    const height = await svg.getAttribute('height');

    expect(parseFloat(width || '0')).toBeGreaterThan(0);
    expect(parseFloat(height || '0')).toBeGreaterThan(0);
  });

  test('cells group created with correct structure', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Check cells exist
    const cells = countryPage.getHeatmapCells();
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThan(0);

    // Cells should be rect elements
    const firstCell = cells.first();
    const tagName = await firstCell.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('rect');
  });

  test('X-axis renders with year labels', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Verify X-axis exists
    const xAxis = countryPage.getXAxis();
    await expect(xAxis).toBeVisible();

    // Check for year labels
    const yearLabels = await countryPage.getYearLabels();
    expect(yearLabels.length).toBeGreaterThan(0);

    // Verify labels are years
    yearLabels.forEach(label => {
      const year = parseInt(label, 10);
      expect(year).toBeGreaterThan(1900);
      expect(year).toBeLessThan(2100);
    });
  });

  test('Y-axis renders with month labels (all 12)', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Verify Y-axis exists
    const yAxis = countryPage.getYAxis();
    await expect(yAxis).toBeVisible();

    // Check for month labels
    const monthLabels = await countryPage.getMonthLabels();

    // Should have 12 month labels
    expect(monthLabels.length).toBe(12);

    // Check that labels are month names or abbreviations
    const expectedMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const hasExpectedMonths = monthLabels.every((label, idx) =>
      expectedMonths.includes(label) || label.toLowerCase().includes(expectedMonths[idx].toLowerCase())
    );

    expect(hasExpectedMonths).toBe(true);
  });

  test('correct number of cells rendered', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    const cellCount = await countryPage.getCellCount();

    // Should be divisible by 12 (months)
    expect(cellCount % 12).toBe(0);

    // Should have data for at least one year
    const years = Math.floor(cellCount / 12);
    expect(years).toBeGreaterThan(0);
  });

  test('cells have correct positioning attributes', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    const firstCell = countryPage.getHeatmapCells().first();

    // Check x and y attributes
    const x = await firstCell.getAttribute('x');
    const y = await firstCell.getAttribute('y');

    expect(x).not.toBeNull();
    expect(y).not.toBeNull();

    // x and y should be valid numbers
    expect(parseFloat(x || '0')).toBeGreaterThanOrEqual(0);
    expect(parseFloat(y || '0')).toBeGreaterThanOrEqual(0);
  });

  test('border radius applied to cells (rx/ry attributes)', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    const firstCell = countryPage.getHeatmapCells().first();

    // Check for rx/ry attributes (border radius)
    const rx = await firstCell.getAttribute('rx');
    const ry = await firstCell.getAttribute('ry');

    // At least one should be set if border radius is applied
    const hasRadius = (rx && parseFloat(rx) > 0) || (ry && parseFloat(ry) > 0);
    expect(hasRadius).toBe(true);
  });

  test('year tick labels at appropriate intervals', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    const yearLabels = await countryPage.getYearLabels();

    // Should have year labels
    expect(yearLabels.length).toBeGreaterThan(0);

    // Check that labels are spaced reasonably (not every year if range is large)
    const years = yearLabels.map(label => parseInt(label, 10));
    const uniqueYears = new Set(years);

    expect(uniqueYears.size).toBe(years.length); // No duplicates
  });

  test('axes have proper text styling', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Get axis text elements
    const xAxisText = countryPage.getXAxis().locator('text').first();
    const yAxisText = countryPage.getYAxis().locator('text').first();

    await expect(xAxisText).toBeVisible();
    await expect(yAxisText).toBeVisible();

    // Check font size
    const xFontSize = await xAxisText.evaluate(el => getComputedStyle(el).fontSize);
    const yFontSize = await yAxisText.evaluate(el => getComputedStyle(el).fontSize);

    expect(parseFloat(xFontSize)).toBeGreaterThan(0);
    expect(parseFloat(yFontSize)).toBeGreaterThan(0);
  });

  test('cells have color values applied', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Get first few cells
    const cellCount = Math.min(10, await countryPage.getCellCount());

    for (let i = 0; i < cellCount; i++) {
      const color = await getCellColor(page, i);
      expect(color).toBeTruthy();
      expect(color).not.toBe('none');
    }
  });

  test('color scale appropriate for fertility data', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Fertility uses sequential color scale (turbo)
    // Check that cells have varied colors
    const colors = new Set<string>();
    const cellCount = Math.min(20, await countryPage.getCellCount());

    for (let i = 0; i < cellCount; i++) {
      const color = await getCellColor(page, i);
      colors.add(color);
    }

    // Should have multiple different colors (not all the same)
    expect(colors.size).toBeGreaterThan(1);
  });

  test('color scale appropriate for seasonality data', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'seasonality');
    await waitForHeatmapRender(page);

    // Seasonality uses diverging color scale (RdBu)
    // Check that cells have varied colors
    const colors = new Set<string>();
    const cellCount = Math.min(20, await countryPage.getCellCount());

    for (let i = 0; i < cellCount; i++) {
      const color = await getCellColor(page, i);
      colors.add(color);
    }

    // Should have multiple different colors
    expect(colors.size).toBeGreaterThan(1);
  });

  test('color legend renders with gradient', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Check for color legend
    const legend = countryPage.getColorLegend();
    await expect(legend).toBeVisible();

    // Check for gradient stops
    const stopCount = await countryPage.getLegendGradientStopCount();
    expect(stopCount).toBeGreaterThanOrEqual(2); // At least start and end colors
  });

  test('legend has sufficient gradient stops', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Check gradient has many stops for smooth transition
    const stopCount = await countryPage.getLegendGradientStopCount();

    // Should have multiple stops for smooth gradient (typically 20+)
    expect(stopCount).toBeGreaterThanOrEqual(10);
  });

  test('axes render in both themes', async ({ page }) => {
    const countryPage = new CountryPage(page);

    // Test in light theme
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('hmd-theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    });

    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    await verifyAxes(page);

    // Test in dark theme
    await page.evaluate(() => {
      localStorage.setItem('hmd-theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.reload();
    await waitForHeatmapRender(page);

    await verifyAxes(page);
  });
});
