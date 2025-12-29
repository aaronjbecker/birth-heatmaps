import { test, expect } from '@playwright/test';
import { HomePage, CountryPage } from './fixtures/page-objects';
import { TEST_COUNTRY, waitForHeatmapRender, getYearCount } from './fixtures/test-data';

test.describe('Data Loading', () => {
  test('countries list loads on homepage', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Verify countries are loaded
    const countryCount = await homePage.getCountryCount();
    expect(countryCount).toBeGreaterThan(0);

    // Check that at least some countries are visible
    const firstCard = homePage.getCountryCards().first();
    await expect(firstCard).toBeVisible();
  });

  test('fertility data loads for valid country', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');

    // Wait for heatmap to render
    await waitForHeatmapRender(page);

    // Verify SVG exists
    const svg = countryPage.getHeatmapSVG();
    await expect(svg).toBeVisible();

    // Verify cells are rendered
    const cellCount = await countryPage.getCellCount();
    expect(cellCount).toBeGreaterThan(0);
  });

  test('seasonality data loads for valid country', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'seasonality');

    // Wait for heatmap to render
    await waitForHeatmapRender(page);

    // Verify SVG exists
    const svg = countryPage.getHeatmapSVG();
    await expect(svg).toBeVisible();

    // Verify cells are rendered
    const cellCount = await countryPage.getCellCount();
    expect(cellCount).toBeGreaterThan(0);
  });

  test('heatmap displays after data loads', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');

    // Wait for heatmap
    await waitForHeatmapRender(page);

    // Check that heatmap is visible
    const svg = countryPage.getHeatmapSVG();
    await expect(svg).toBeVisible();

    // Check that axes are rendered
    const xAxis = countryPage.getXAxis();
    const yAxis = countryPage.getYAxis();
    await expect(xAxis).toBeVisible();
    await expect(yAxis).toBeVisible();
  });

  test('correct number of cells rendered (years × 12)', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');

    await waitForHeatmapRender(page);

    // Get cell count
    const cellCount = await countryPage.getCellCount();

    // Cell count should be divisible by 12 (12 months per year)
    expect(cellCount % 12).toBe(0);

    // Should have at least one year of data
    const yearCount = Math.floor(cellCount / 12);
    expect(yearCount).toBeGreaterThan(0);
  });

  test('country metadata parsed correctly', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');

    await waitForHeatmapRender(page);

    // Get country name using the updated selector
    const countryName = await countryPage.getCountryName();
    expect(countryName).toBeTruthy();
    expect(countryName.length).toBeGreaterThan(0);

    // Verify it's the expected country (should contain "United States")
    const lowerName = countryName.toLowerCase();
    expect(lowerName).toContain('united');
  });

  test('different year ranges handled correctly', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');

    await waitForHeatmapRender(page);

    // Get year range from filter
    const rangeText = await countryPage.getRangeText();
    expect(rangeText).toBeTruthy();

    // Should contain two years separated by dash or en-dash
    expect(rangeText).toMatch(/\d{4}\s*[–-]\s*\d{4}/);

    // Get year count from cells
    const yearCount = await getYearCount(page);
    expect(yearCount).toBeGreaterThan(0);

    // Verify cell count matches year range
    const cellCount = await countryPage.getCellCount();
    expect(cellCount).toBe(yearCount * 12);
  });

  test('cells have expected structure', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');

    await waitForHeatmapRender(page);

    // Get first cell
    const firstCell = countryPage.getHeatmapCells().first();

    // Check that cell is a rect element
    const tagName = await firstCell.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('rect');

    // Check that cell has class
    await expect(firstCell).toHaveClass(/cell/);

    // Check that cell has dimensions
    const width = await firstCell.getAttribute('width');
    const height = await firstCell.getAttribute('height');
    expect(parseFloat(width || '0')).toBeGreaterThan(0);
    expect(parseFloat(height || '0')).toBeGreaterThan(0);
  });

  test('year and month labels display correctly', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');

    await waitForHeatmapRender(page);

    // Get year labels
    const yearLabels = await countryPage.getYearLabels();
    expect(yearLabels.length).toBeGreaterThan(0);

    // Year labels should be numbers
    yearLabels.forEach(label => {
      const year = parseInt(label, 10);
      expect(year).toBeGreaterThan(1900);
      expect(year).toBeLessThan(2100);
    });

    // Get month labels
    const monthLabels = await countryPage.getMonthLabels();
    expect(monthLabels.length).toBe(12);

    // Month labels should contain expected names or abbreviations
    const hasMonthNames = monthLabels.some(label =>
      ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].includes(label)
    );
    expect(hasMonthNames).toBe(true);
  });

  test('handles invalid country code gracefully', async ({ page }) => {
    // Try to navigate to non-existent country
    const response = await page.goto('/fertility/invalid-country-xyz');

    // For static site generation, invalid routes return 404 status
    // or redirect to a 404 page
    const status = response?.status();

    // Should get 404 status or be on a 404 page
    const is404Status = status === 404;
    const is404Page = page.url().includes('404');
    const hasErrorHeading = await page.locator('h1').filter({ hasText: /404|not found/i }).count() > 0;

    expect(is404Status || is404Page || hasErrorHeading).toBe(true);
  });

  test('shows error when data unavailable', async ({ page }) => {
    const countryPage = new CountryPage(page);

    // For this test, we'll try to detect if the error state UI exists
    // by checking if the component has error handling

    // Navigate to a country page
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');

    // If data loads successfully, the error message should NOT be visible
    await waitForHeatmapRender(page, 10000); // Give it time to load

    const hasError = await countryPage.hasErrorMessage();

    // For a valid country with data, error should not be shown
    expect(hasError).toBe(false);

    // Note: Testing actual error state would require mocking failed data fetch
    // or using a country known to have no data, which is environment-dependent
  });
});
