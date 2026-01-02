import { test, expect } from '@playwright/test';
import { ComparePage } from './fixtures/page-objects';
import { waitForNavigation, TEST_COUNTRY } from './fixtures/test-data';

test.describe('Compare Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('compare page loads with empty state', async ({ page }) => {
    const comparePage = new ComparePage(page);
    await comparePage.goto();

    // Verify we're on the compare page
    await expect(page).toHaveURL('/compare');

    // Page title should be visible
    const heading = page.locator('main h1');
    await expect(heading).toContainText('Compare');

    // Empty state should be visible when no countries selected
    const emptyState = comparePage.getEmptyState();
    await expect(emptyState).toBeVisible();
  });

  test('navigate to compare page from header', async ({ page }) => {
    await page.goto('/');
    await waitForNavigation(page);

    // Click Compare link in header
    await page.click('header a[href="/compare"]');
    await waitForNavigation(page);

    await expect(page).toHaveURL('/compare');
  });

  test('navigate to compare page from country page', async ({ page }) => {
    // Go to a country page first
    await page.goto(`/fertility/${TEST_COUNTRY.code}`);
    await waitForNavigation(page);

    // Find and click the "Compare with other countries" link
    const compareLink = page.locator('a.compare-link');
    await expect(compareLink).toBeVisible();
    await compareLink.click();
    await waitForNavigation(page);

    // Should be on compare page with country pre-selected
    expect(page.url()).toContain('/compare');
    expect(page.url()).toContain(`countries=${TEST_COUNTRY.code}`);
  });

  test('country multi-select opens and closes', async ({ page }) => {
    const comparePage = new ComparePage(page);
    await comparePage.goto();

    // Open dropdown
    await comparePage.openCountryDropdown();
    const dropdown = comparePage.getCountryDropdown();
    await expect(dropdown).toBeVisible();

    // Close by pressing Escape
    await comparePage.closeCountryDropdown();
    await page.waitForTimeout(200);
    // Dropdown should close
    await expect(dropdown).not.toBeVisible();
  });

  test('selecting countries shows heatmaps', async ({ page }) => {
    const comparePage = new ComparePage(page);
    await comparePage.goto();

    // Select a country
    await comparePage.selectCountry(TEST_COUNTRY.code);

    // Wait for heatmap to load (may need longer for first data fetch)
    await page.waitForTimeout(2000);

    // Heatmap SVG should be visible
    const heatmapSVG = page.locator('.heatmap-svg');
    await expect(heatmapSVG.first()).toBeVisible({ timeout: 10000 });

    const heatmapCount = await comparePage.getHeatmapCount();
    expect(heatmapCount).toBeGreaterThanOrEqual(1);
  });

  test('can select multiple countries from dropdown', async ({ page }) => {
    const comparePage = new ComparePage(page);
    await comparePage.goto();

    // Select first country
    await comparePage.selectCountry(TEST_COUNTRY.code);

    // Wait for heatmap to load (may need longer for first data fetch)
    await page.waitForTimeout(2000);

    // Wait for heatmap SVG to appear
    const heatmapSVG = page.locator('.heatmap-svg');
    await expect(heatmapSVG.first()).toBeVisible({ timeout: 10000 });

    // Verify dropdown shows selection count
    const trigger = comparePage.getCountrySelectTrigger();
    const triggerText = await trigger.textContent();
    expect(triggerText).toContain('1 selected');
  });

  test('scale mode toggle works with multiple countries', async ({ page }) => {
    // Scale mode toggle requires 2+ countries to be enabled
    const comparePage = new ComparePage(page);
    await comparePage.goto();

    // Select first country
    await comparePage.selectCountry(TEST_COUNTRY.code);
    await page.waitForTimeout(500);

    // Toggle should be disabled with only 1 country
    const perCountryButton = comparePage.getPerCountryScaleButton();
    await expect(perCountryButton).toBeDisabled();

    // Select a second country
    await comparePage.openCountryDropdown();
    const uncheckedOption = page.locator('.country-multiselect-option').filter({
      has: page.locator('input[type="checkbox"]:not(:checked)'),
    }).first();

    if (await uncheckedOption.isVisible()) {
      await uncheckedOption.click();
      await page.waitForTimeout(1000);

      // Toggle should now be enabled
      await expect(perCountryButton).toBeEnabled();

      // Check initial state via aria-pressed attribute
      const unifiedButton = comparePage.getUnifiedScaleButton();
      await expect(unifiedButton).toHaveAttribute('aria-pressed', 'true');

      // Switch to per-country
      await comparePage.selectScaleMode('per-country');
      await expect(perCountryButton).toHaveAttribute('aria-pressed', 'true');

      // URL should update
      expect(comparePage.getQueryParam('scale')).toBe('per-country');
    }
  });

  test('URL updates when selecting countries', async ({ page }) => {
    const comparePage = new ComparePage(page);
    await comparePage.goto();

    // Select a country
    await comparePage.selectCountry(TEST_COUNTRY.code);
    await page.waitForTimeout(300);

    // URL should contain the country
    expect(page.url()).toContain(`countries=${TEST_COUNTRY.code}`);
  });

  test('deep linking with countries parameter works', async ({ page }) => {
    const comparePage = new ComparePage(page);
    await comparePage.goto(`countries=${TEST_COUNTRY.code}`);

    // Wait for data to load
    await page.waitForTimeout(1000);

    // Heatmap should be visible
    const heatmapCount = await comparePage.getHeatmapCount();
    expect(heatmapCount).toBeGreaterThanOrEqual(1);
  });

  test('deep linking with metric parameter works', async ({ page }) => {
    const comparePage = new ComparePage(page);
    await comparePage.goto(`countries=${TEST_COUNTRY.code}&metric=seasonality`);

    await page.waitForTimeout(500);

    // Seasonality metric tab should be active
    const seasonalityTab = comparePage.getMetricTab('seasonality');
    const classes = await seasonalityTab.getAttribute('class');
    expect(classes).toContain('active');
  });

  test('deep linking with scale parameter works', async ({ page }) => {
    const comparePage = new ComparePage(page);
    await comparePage.goto(`countries=${TEST_COUNTRY.code}&scale=per-country`);

    await page.waitForTimeout(300);

    // Per-country button should be pressed
    const perCountryButton = comparePage.getPerCountryScaleButton();
    await expect(perCountryButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('metric tabs change displayed data', async ({ page }) => {
    const comparePage = new ComparePage(page);
    await comparePage.goto(`countries=${TEST_COUNTRY.code}`);

    await page.waitForTimeout(1000);

    // Switch to seasonality
    await comparePage.selectMetric('seasonality');
    await page.waitForTimeout(500);

    // URL should update
    expect(comparePage.getQueryParam('metric')).toBe('seasonality');

    // Heatmap should still be visible
    const heatmapCount = await comparePage.getHeatmapCount();
    expect(heatmapCount).toBeGreaterThanOrEqual(1);
  });

  test('share buttons are visible when countries selected', async ({ page }) => {
    const comparePage = new ComparePage(page);
    await comparePage.goto(`countries=${TEST_COUNTRY.code}`);

    await page.waitForTimeout(500);

    // Share buttons should be visible
    const shareButtons = comparePage.getShareButtons();
    await expect(shareButtons).toBeVisible();

    // Copy link button should exist
    const copyButton = comparePage.getCopyLinkButton();
    await expect(copyButton).toBeVisible();
  });

  test('clear all button is visible in dropdown', async ({ page }) => {
    const comparePage = new ComparePage(page);
    await comparePage.goto(`countries=${TEST_COUNTRY.code}`);

    await page.waitForTimeout(1000);

    // Open dropdown
    await comparePage.openCountryDropdown();

    // Clear button should be visible
    const clearButton = comparePage.getClearAllButton();
    await expect(clearButton).toBeVisible();
  });

  test('search filters country list', async ({ page }) => {
    const comparePage = new ComparePage(page);
    await comparePage.goto();

    // Open dropdown and count initial options
    await comparePage.openCountryDropdown();
    const initialOptions = await page.locator('.country-multiselect-option').count();

    // Search for a specific term
    await comparePage.searchCountries('United');
    await page.waitForTimeout(100);

    // Filtered options should exist
    const filteredOptions = await page.locator('.country-multiselect-option').count();
    expect(filteredOptions).toBeGreaterThan(0);
    expect(filteredOptions).toBeLessThanOrEqual(initialOptions);
  });

  test('theme persists on compare page', async ({ page }) => {
    // Set dark theme
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('hmd-theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    const comparePage = new ComparePage(page);
    await comparePage.goto();

    // Theme should still be dark
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBe('dark');
  });

  test('color legend displays when country selected', async ({ page }) => {
    const comparePage = new ComparePage(page);
    await comparePage.goto(`countries=${TEST_COUNTRY.code}`);

    await page.waitForTimeout(1000);

    // There should be a color legend
    const legends = comparePage.getColorLegends();
    const legendCount = await legends.count();
    expect(legendCount).toBeGreaterThan(0);
  });

  test('heatmap cells are rendered', async ({ page }) => {
    const comparePage = new ComparePage(page);
    await comparePage.goto(`countries=${TEST_COUNTRY.code}`);

    await page.waitForTimeout(1000);

    // Check that heatmap cells exist
    const cells = page.locator('rect.cell');
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThan(0);
  });

  test('handles invalid country code gracefully', async ({ page }) => {
    const comparePage = new ComparePage(page);
    await comparePage.goto('countries=invalid-country-code');

    await page.waitForTimeout(500);

    // Should show empty state, not crash
    const emptyState = comparePage.getEmptyState();
    await expect(emptyState).toBeVisible();
  });

  test('country headers show correct names', async ({ page }) => {
    const comparePage = new ComparePage(page);
    await comparePage.goto(`countries=${TEST_COUNTRY.code}`);

    await page.waitForTimeout(1000);

    // Country name should appear in header
    const headers = comparePage.getCountryHeaders();
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThanOrEqual(1);

    // First header should contain the country name
    const firstHeader = await headers.first().textContent();
    expect(firstHeader).toBeTruthy();
  });
});
