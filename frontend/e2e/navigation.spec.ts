import { test, expect } from '@playwright/test';
import { HomePage, CountryPage } from './fixtures/page-objects';
import { TEST_COUNTRY, waitForNavigation } from './fixtures/test-data';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stored state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('homepage loads with country list', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Verify we're on the homepage
    await expect(page).toHaveURL('/');

    // Check that country cards are displayed
    const countryCards = homePage.getCountryCards();
    await expect(countryCards.first()).toBeVisible();

    // Verify we have multiple countries
    const count = await homePage.getCountryCount();
    expect(count).toBeGreaterThan(0);
  });

  test('navigate to country page from homepage', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Check if USA is available
    const hasUSA = await homePage.hasCountryCard(TEST_COUNTRY.code);

    if (hasUSA) {
      // Click on USA
      await homePage.clickCountry(TEST_COUNTRY.code);

      // Verify URL changed
      await expect(page).toHaveURL(`/fertility/${TEST_COUNTRY.code}`);

      // Verify country page loaded
      const countryPage = new CountryPage(page);
      const title = await countryPage.getCountryName();
      expect(title).toBeTruthy();
    } else {
      // Fallback: click first available country
      const firstCard = homePage.getCountryCards().first();
      await firstCard.click();
      await waitForNavigation(page);

      // Just verify we navigated somewhere
      const url = page.url();
      expect(url).toContain('/fertility/');
    }
  });

  test('breadcrumb navigation works correctly', async ({ page }) => {
    const countryPage = new CountryPage(page);

    // Go to a country page
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');

    // Check breadcrumbs exist
    const breadcrumbs = countryPage.getBreadcrumbs();
    await expect(breadcrumbs).toBeVisible();

    // Breadcrumb should contain "Countries" link
    const breadcrumbText = await countryPage.getBreadcrumbText();
    expect(breadcrumbText).toContain('Countries');

    // Click countries breadcrumb (goes to home)
    await countryPage.clickBreadcrumbHome();

    // Verify we're back at homepage
    await expect(page).toHaveURL('/');
  });

  test('tab switching between fertility and seasonality', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');

    // Verify we start on fertility tab
    await expect(page).toHaveURL(`/fertility/${TEST_COUNTRY.code}`);

    // Switch to seasonality tab
    await countryPage.switchTab('seasonality');

    // Verify URL updated
    await expect(page).toHaveURL(`/seasonality/${TEST_COUNTRY.code}`);

    // Verify active tab changed
    const activeTabText = await countryPage.getActiveTabText();
    expect(activeTabText.toLowerCase()).toContain('seasonality');
  });

  test('tab switching preserves country context', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');

    // Get country name on fertility page
    const fertilityCountryName = await countryPage.getCountryName();

    // Switch to seasonality
    await countryPage.switchTab('seasonality');

    // Get country name on seasonality page
    const seasonalityCountryName = await countryPage.getCountryName();

    // Should be the same country
    expect(fertilityCountryName).toBe(seasonalityCountryName);
  });

  test('URL updates when switching tabs', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');

    // Verify initial URL
    expect(page.url()).toContain('/fertility/');

    // Switch to seasonality
    await countryPage.switchTab('seasonality');

    // URL should have changed
    expect(page.url()).toContain('/seasonality/');
    expect(page.url()).not.toContain('/fertility/');
  });

  test('active tab styling applies correctly', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');

    // Get active tab
    const activeTab = countryPage.getActiveTab();
    await expect(activeTab).toBeVisible();

    // Active tab should have active class
    await expect(activeTab).toHaveClass(/active/);

    // Check for primary color styling (border or text)
    const borderColor = await activeTab.evaluate((el) => {
      return getComputedStyle(el).borderBottomColor || getComputedStyle(el).color;
    });

    // Should have some color applied (not transparent or initial)
    expect(borderColor).toBeTruthy();
    expect(borderColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('deep linking to country page works', async ({ page }) => {
    // Navigate directly to a country page URL
    await page.goto(`/fertility/${TEST_COUNTRY.code}`);
    await waitForNavigation(page);

    // Verify page loaded correctly
    await expect(page).toHaveURL(`/fertility/${TEST_COUNTRY.code}`);

    const countryPage = new CountryPage(page);
    const title = await countryPage.getCountryName();
    expect(title).toBeTruthy();
  });

  test('deep linking to seasonality page works', async ({ page }) => {
    // Navigate directly to a seasonality page URL
    await page.goto(`/seasonality/${TEST_COUNTRY.code}`);
    await waitForNavigation(page);

    // Verify page loaded correctly
    await expect(page).toHaveURL(`/seasonality/${TEST_COUNTRY.code}`);

    const countryPage = new CountryPage(page);
    const activeTabText = await countryPage.getActiveTabText();
    expect(activeTabText.toLowerCase()).toContain('seasonality');
  });

  test('header navigation to about page', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Click about link in header
    await page.click('header a[href="/about"]');
    await waitForNavigation(page);

    // Verify we're on about page
    await expect(page).toHaveURL('/about');

    // Verify about page content - use main content h1
    const heading = page.locator('main h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('About');
  });

  test('navigate back from about page', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Go to about page
    await page.click('header a[href="/about"]');
    await waitForNavigation(page);

    // Click home link (title or breadcrumb)
    await page.click('header h1 a, header a[href="/"]');
    await waitForNavigation(page);

    // Should be back at homepage
    await expect(page).toHaveURL('/');
  });

  test('theme persists across navigation', async ({ page }) => {
    // Set dark theme
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('hmd-theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.reload();

    // Verify dark theme
    let theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBe('dark');

    // Navigate to country page
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');

    // Theme should still be dark
    theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBe('dark');

    // Navigate to about page
    await page.click('header a[href="/about"]');
    await waitForNavigation(page);

    // Theme should still be dark
    theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBe('dark');
  });
});
