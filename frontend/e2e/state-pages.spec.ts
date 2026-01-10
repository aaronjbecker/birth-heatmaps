/**
 * E2E tests for US state pages
 */
import { test, expect } from '@playwright/test';
import { TEST_STATE, waitForHeatmapRender, verifyAxes } from './fixtures/test-data';

test.describe('State Pages', () => {
  test.describe('Homepage States Section', () => {
    test('shows states section on homepage', async ({ page }) => {
      await page.goto('/');

      // States section should be visible
      const statesSection = page.locator('#states');
      await expect(statesSection).toBeVisible();

      // Should have heading
      const heading = statesSection.locator('h2');
      await expect(heading).toContainText('US States');
    });

    test('displays state cards on homepage', async ({ page }) => {
      await page.goto('/');

      // Should have state cards
      const statesSection = page.locator('#states');
      const stateLinks = statesSection.locator('a[href^="/fertility/states/"]');

      // Should have 51 states (50 states + DC)
      const count = await stateLinks.count();
      expect(count).toBe(51);
    });

    test('navigation links work between countries and states', async ({ page }) => {
      await page.goto('/');

      // Click on states nav link
      await page.click('a[href="#states"]');

      // Should scroll to states section
      const statesSection = page.locator('#states');
      await expect(statesSection).toBeInViewport();
    });
  });

  test.describe('State Page Navigation', () => {
    test('navigates from homepage to state page', async ({ page }) => {
      await page.goto('/');

      // Find and click California link
      const californiaLink = page.locator(`a[href="/fertility/states/${TEST_STATE.code}"]`);
      await californiaLink.click();

      // Should be on state page
      await expect(page).toHaveURL(`/fertility/states/${TEST_STATE.code}`);

      // Should show state name
      const heading = page.locator('h1');
      await expect(heading).toContainText(TEST_STATE.name);
    });

    test('state page has correct breadcrumb', async ({ page }) => {
      await page.goto(`/fertility/states/${TEST_STATE.code}`);

      // Check breadcrumb links exist
      const countriesLink = page.locator('a[href="/"]').first();
      await expect(countriesLink).toBeVisible();

      const statesLink = page.locator('a[href="/#states"]');
      await expect(statesLink).toBeVisible();
    });
  });

  test.describe('State Heatmap Rendering', () => {
    test('renders heatmap on state page', async ({ page }) => {
      await page.goto(`/fertility/states/${TEST_STATE.code}`);

      // Wait for heatmap to render
      await waitForHeatmapRender(page);

      // Verify SVG exists
      const svg = page.locator('.heatmap-svg');
      await expect(svg).toBeVisible();

      // Verify cells exist
      const cells = page.locator('rect.cell');
      const cellCount = await cells.count();
      expect(cellCount).toBeGreaterThan(0);
    });

    test('heatmap has axes', async ({ page }) => {
      await page.goto(`/fertility/states/${TEST_STATE.code}`);

      await waitForHeatmapRender(page);
      await verifyAxes(page);
    });

    test('heatmap has controls visible', async ({ page }) => {
      await page.goto(`/fertility/states/${TEST_STATE.code}`);

      await waitForHeatmapRender(page);

      // Controls section should be visible (year filter, legend toggle, etc.)
      const controls = page.locator('[data-testid="heatmap-controls"], .heatmap-controls, button');
      await expect(controls.first()).toBeVisible();
    });
  });

  test.describe('Metric Tab Switching', () => {
    test('can switch to seasonality tab', async ({ page }) => {
      await page.goto(`/fertility/states/${TEST_STATE.code}`);

      // Click seasonality tab
      const seasonalityTab = page.locator('a[href$="/seasonality/states/' + TEST_STATE.code + '"]');
      await seasonalityTab.click();

      // URL should update
      await expect(page).toHaveURL(`/seasonality/states/${TEST_STATE.code}`);

      // Heatmap should still render
      await waitForHeatmapRender(page);
    });

    test('can switch to conception tab', async ({ page }) => {
      await page.goto(`/fertility/states/${TEST_STATE.code}`);

      // Click conception tab
      const conceptionTab = page.locator('a[href$="/conception/states/' + TEST_STATE.code + '"]');
      await conceptionTab.click();

      // URL should update
      await expect(page).toHaveURL(`/conception/states/${TEST_STATE.code}`);

      // Heatmap should still render
      await waitForHeatmapRender(page);
    });
  });

  test.describe('State Dropdown Navigation', () => {
    test('state dropdown is visible', async ({ page }) => {
      await page.goto(`/fertility/states/${TEST_STATE.code}`);

      // Dropdown trigger should be visible
      const trigger = page.locator('[data-testid="state-dropdown-trigger"]');
      await expect(trigger).toBeVisible();
    });

    test('can open state dropdown', async ({ page }) => {
      await page.goto(`/fertility/states/${TEST_STATE.code}`);

      // Click to open dropdown
      const trigger = page.locator('[data-testid="state-dropdown-trigger"]');
      await trigger.click();

      // Menu should appear
      const menu = page.locator('[data-testid="state-dropdown-menu"]');
      await expect(menu).toBeVisible();
    });

    test('can search states in dropdown', async ({ page }) => {
      await page.goto(`/fertility/states/${TEST_STATE.code}`);

      // Open dropdown
      const trigger = page.locator('[data-testid="state-dropdown-trigger"]');
      await trigger.click();

      // Search for Texas
      const searchInput = page.locator('[data-testid="state-dropdown-search"]');
      await searchInput.fill('Texas');

      // Texas should be visible
      const texasOption = page.locator('[data-testid="state-option-texas"]');
      await expect(texasOption).toBeVisible();
    });

    test('can navigate to another state via dropdown', async ({ page }) => {
      await page.goto(`/fertility/states/${TEST_STATE.code}`);

      // Open dropdown
      const trigger = page.locator('[data-testid="state-dropdown-trigger"]');
      await trigger.click();

      // Click on Texas
      const texasOption = page.locator('[data-testid="state-option-texas"]');
      await texasOption.click();

      // Should navigate to Texas page
      await expect(page).toHaveURL('/fertility/states/texas');
    });
  });

  test.describe('Compare Link', () => {
    test('compare link exists on state page', async ({ page }) => {
      await page.goto(`/fertility/states/${TEST_STATE.code}`);

      // Compare link should be visible
      const compareLink = page.locator('a[href*="/compare?states="]');
      await expect(compareLink).toBeVisible();
    });

    test('compare link includes current state', async ({ page }) => {
      await page.goto(`/fertility/states/${TEST_STATE.code}`);

      // Compare link should include state code
      const compareLink = page.locator(`a[href*="states=${TEST_STATE.code}"]`);
      await expect(compareLink).toBeVisible();
    });
  });
});
