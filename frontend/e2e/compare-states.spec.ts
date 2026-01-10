/**
 * E2E tests for Compare page with US states
 */
import { test, expect } from '@playwright/test';
import { TEST_STATE, waitForHeatmapRender } from './fixtures/test-data';

test.describe('Compare Page States', () => {
  test.describe('States Dropdown', () => {
    test('states dropdown is visible on compare page', async ({ page }) => {
      await page.goto('/compare');
      await page.waitForLoadState('networkidle');

      // States dropdown should be visible (wait for Svelte component to hydrate)
      const trigger = page.locator('[data-testid="state-multiselect-trigger"]');
      await expect(trigger).toBeVisible({ timeout: 10000 });
    });

    test('can open states dropdown', async ({ page }) => {
      await page.goto('/compare');
      await page.waitForLoadState('networkidle');

      // Wait for component hydration
      const trigger = page.locator('[data-testid="state-multiselect-trigger"]');
      await trigger.waitFor({ state: 'visible', timeout: 10000 });
      await trigger.click();

      // Menu should appear
      const menu = page.locator('[data-testid="state-multiselect-menu"]');
      await expect(menu).toBeVisible();
    });

    test('can search for states', async ({ page }) => {
      await page.goto('/compare');
      await page.waitForLoadState('networkidle');

      // Wait and open dropdown
      const trigger = page.locator('[data-testid="state-multiselect-trigger"]');
      await trigger.waitFor({ state: 'visible', timeout: 10000 });
      await trigger.click();

      // Search for California
      const search = page.locator('[data-testid="state-multiselect-search"]');
      await search.fill('California');

      // California should be visible
      const californiaOption = page.locator('[data-testid="state-option-california"]');
      await expect(californiaOption).toBeVisible();
    });

    test('can select a state', async ({ page }) => {
      await page.goto('/compare');
      await page.waitForLoadState('networkidle');

      // Wait and open dropdown
      const trigger = page.locator('[data-testid="state-multiselect-trigger"]');
      await trigger.waitFor({ state: 'visible', timeout: 10000 });
      await trigger.click();

      // Select California
      await page.click('[data-testid="state-option-california"]');

      // Trigger should show selection
      await expect(trigger).toContainText('1 selected');
    });
  });

  test.describe('URL Parameters', () => {
    test('loads states from URL parameter', async ({ page }) => {
      await page.goto('/compare?states=california');
      await page.waitForLoadState('networkidle');

      // Wait for Svelte hydration
      await page.waitForTimeout(1000);

      // Chip should show California (look for it anywhere on page)
      const chip = page.locator('text=California').first();
      await expect(chip).toBeVisible({ timeout: 10000 });
    });

    test('loads multiple states from URL', async ({ page }) => {
      await page.goto('/compare?states=california,texas');
      await page.waitForLoadState('networkidle');

      // Wait for Svelte hydration
      await page.waitForTimeout(1000);

      // Both states should be visible as chips or in heatmaps
      const californiaChip = page.locator('text=California').first();
      const texasChip = page.locator('text=Texas').first();

      await expect(californiaChip).toBeVisible({ timeout: 10000 });
      await expect(texasChip).toBeVisible({ timeout: 10000 });
    });

    test('URL updates when selecting states', async ({ page }) => {
      await page.goto('/compare');
      await page.waitForLoadState('networkidle');

      // Wait for component hydration
      const trigger = page.locator('[data-testid="state-multiselect-trigger"]');
      await trigger.waitFor({ state: 'visible', timeout: 10000 });
      await trigger.click();

      // Select California
      await page.click('[data-testid="state-option-california"]');

      // Wait for URL to update
      await page.waitForURL(/states=california/, { timeout: 5000 });
    });
  });

  test.describe('Mixed Countries and States', () => {
    test('can select both countries and states', async ({ page }) => {
      await page.goto('/compare');
      await page.waitForLoadState('networkidle');

      // Wait for component hydration
      const countryTrigger = page.locator('[data-testid="country-multiselect-trigger"]');
      await countryTrigger.waitFor({ state: 'visible', timeout: 10000 });

      // Select a country
      await countryTrigger.click();
      await page.click('[data-testid="country-option-japan"]');

      // Click somewhere else to close country dropdown
      await page.click('h1');
      await page.waitForTimeout(300);

      // Select a state
      const stateTrigger = page.locator('[data-testid="state-multiselect-trigger"]');
      await stateTrigger.click();
      await page.click('[data-testid="state-option-california"]');

      // Both should be selected
      await expect(countryTrigger).toContainText('1 selected');
      await expect(stateTrigger).toContainText('1 selected');
    });

    test('URL contains both countries and states', async ({ page }) => {
      await page.goto('/compare?countries=japan&states=california');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Both should be visible
      const japanChip = page.locator('text=Japan').first();
      const californiaChip = page.locator('text=California').first();

      await expect(japanChip).toBeVisible({ timeout: 10000 });
      await expect(californiaChip).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('State Heatmap Rendering', () => {
    test('renders state heatmap in comparison', async ({ page }) => {
      await page.goto('/compare?states=california');

      // Wait for page and potential data loading
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Wait for heatmap to render
      await waitForHeatmapRender(page, 10000);

      // State name should appear in heatmap or chip
      const stateName = page.locator('text=California');
      await expect(stateName.first()).toBeVisible();
    });

    test('renders multiple state heatmaps', async ({ page }) => {
      await page.goto('/compare?states=california,texas');

      // Wait for page and potential data loading
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Wait for heatmaps to render
      await waitForHeatmapRender(page, 10000);

      // Both states should be visible (in chips or heatmaps)
      const californiaName = page.locator('text=California').first();
      const texasName = page.locator('text=Texas').first();

      await expect(californiaName).toBeVisible();
      await expect(texasName).toBeVisible();
    });
  });

  test.describe('Scale Mode with States', () => {
    test('unified scale mode works with states', async ({ page }) => {
      await page.goto('/compare?states=california,texas&scale=unified');

      await waitForHeatmapRender(page);

      // Scale toggle should show unified
      const unifiedButton = page.locator('button:has-text("Unified")');
      await expect(unifiedButton).toHaveClass(/bg-primary|active/);
    });

    test('per-country scale mode works with states', async ({ page }) => {
      await page.goto('/compare?states=california,texas&scale=per-country');

      await waitForHeatmapRender(page);

      // Scale toggle should show per-country
      const perCountryButton = page.locator('button:has-text("Per-Country")');
      await expect(perCountryButton).toHaveClass(/bg-primary|active/);
    });
  });

  test.describe('Metric Switching with States', () => {
    test('can switch metrics with state selected', async ({ page }) => {
      await page.goto('/compare?states=california');

      await waitForHeatmapRender(page);

      // Click seasonality tab
      const seasonalityButton = page.locator('button:has-text("Seasonality")');
      await seasonalityButton.click();

      // URL should update
      await page.waitForURL(/metric=seasonality/);

      // Heatmap should still render
      await waitForHeatmapRender(page);
    });
  });
});
