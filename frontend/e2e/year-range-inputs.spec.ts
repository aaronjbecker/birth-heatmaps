import { test, expect } from '@playwright/test';
import { CountryPage } from './fixtures/page-objects';
import { TEST_COUNTRY, waitForHeatmapRender } from './fixtures/test-data';

test.describe('Year Range Inputs', () => {
  test('manual year entry works and updates heatmap', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    const startInput = page.locator('[data-testid="year-input-start"]');
    const endInput = page.locator('[data-testid="year-input-end"]');

    // Get initial start year
    const initialStart = await startInput.inputValue();
    const newStart = (parseInt(initialStart, 10) + 5).toString();

    // Type new start year
    await startInput.focus();
    await startInput.fill('');
    await startInput.type(newStart);
    await startInput.press('Enter');

    // Verify input value
    expect(await startInput.inputValue()).toBe(newStart);

    // Verify heatmap updates (X-axis labels should start with or after newStart)
    const yearLabels = await countryPage.getYearLabels();
    const firstYearLabel = parseInt(yearLabels[0], 10);
    expect(firstYearLabel).toBeGreaterThanOrEqual(parseInt(newStart, 10));
  });

  test('backspace is possible in year inputs', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    const startInput = page.locator('[data-testid="year-input-start"]');
    
    await startInput.focus();
    
    // Clear the input using fill('') which is more robust in Playwright
    await startInput.fill('');
    
    // Input should be empty temporarily
    expect(await startInput.inputValue()).toBe('');
    
    // Type new value
    await startInput.type('1990');
    expect(await startInput.inputValue()).toBe('1990');
    
    await startInput.press('Enter');
    // On blur/enter, if 1990 is valid, it stays.
    expect(await startInput.inputValue()).toBe('1990');
  });

  test('invalid entries are reverted on blur', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    const startInput = page.locator('[data-testid="year-input-start"]');
    const initialValue = await startInput.inputValue();

    await startInput.focus();
    await startInput.fill('9999'); // Invalid year (likely)
    await startInput.blur();

    // Should revert to previous valid value or closest valid value
    expect(await startInput.inputValue()).toBe(initialValue);
  });

  test('start year cannot exceed end year', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    const startInput = page.locator('[data-testid="year-input-start"]');
    const endInput = page.locator('[data-testid="year-input-end"]');
    
    const endValue = parseInt(await endInput.inputValue(), 10);
    
    await startInput.focus();
    await startInput.fill((endValue + 10).toString());
    await startInput.blur();

    // Should NOT be greater than or equal to endValue
    const finalStartValue = parseInt(await startInput.inputValue(), 10);
    expect(finalStartValue).toBeLessThan(endValue);
  });
});

