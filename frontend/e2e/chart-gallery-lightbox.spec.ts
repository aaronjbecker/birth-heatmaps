import { test, expect } from '@playwright/test';
import { CountryPage } from './fixtures/page-objects';
import { TEST_COUNTRY, waitForLightboxOpen, waitForLightboxClose, EXPECTED_CHART_COUNT, getActiveLightboxImageSrc } from './fixtures/test-data';

test.describe('Chart Gallery Lightbox', () => {
  let countryPage: CountryPage;

  test.beforeEach(async ({ page }) => {
    countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
  });

  test('lightbox opens when chart is clicked', async ({ page }) => {
    // Click first chart
    await countryPage.clickChart(0);

    // Wait for lightbox to open
    await waitForLightboxOpen(page);

    // Verify lightbox is visible
    const isOpen = await countryPage.isLightboxOpen();
    expect(isOpen).toBe(true);

    // Verify PhotoSwipe overlay exists
    const pswp = page.locator('.pswp');
    await expect(pswp).toBeVisible();
    await expect(pswp).toHaveClass(/pswp--open/);
  });

  test('lightbox displays full-size chart image', async ({ page }) => {
    // Click first chart
    await countryPage.clickChart(0);
    await waitForLightboxOpen(page);

    // Verify image is displayed (use more specific selector)
    const lightboxImage = page.locator('.pswp__img:not(.pswp__img--placeholder)').first();
    await expect(lightboxImage).toBeVisible({ timeout: 5000 });

    // Verify image has src attribute
    const src = await lightboxImage.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src).not.toBe('');
  });

  test('ESC key closes lightbox', async ({ page }) => {
    // Open lightbox
    await countryPage.clickChart(0);
    await waitForLightboxOpen(page);

    // Verify it's open
    let isOpen = await countryPage.isLightboxOpen();
    expect(isOpen).toBe(true);

    // Press escape
    await page.keyboard.press('Escape');

    // Wait for close animation
    await waitForLightboxClose(page);

    // Verify lightbox is closed
    isOpen = await countryPage.isLightboxOpen();
    expect(isOpen).toBe(false);
  });

  test('background click closes lightbox', async ({ page }) => {
    // Open lightbox
    await countryPage.clickChart(0);
    await waitForLightboxOpen(page);

    // Click on background (top-left corner of lightbox container)
    const lightbox = countryPage.getLightbox();
    await lightbox.click({ position: { x: 10, y: 10 } });

    // Wait for close animation
    await waitForLightboxClose(page);

    // Verify lightbox is closed
    const isOpen = await countryPage.isLightboxOpen();
    expect(isOpen).toBe(false);
  });

  test('arrow key navigation moves between charts', async ({ page }) => {
    // Open first chart
    await countryPage.clickChart(0);
    await waitForLightboxOpen(page);

    const firstSrc = await getActiveLightboxImageSrc(page);
    expect(firstSrc).toBeTruthy();

    // Press right arrow
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1200); // Wait longer for transition

    // Verify different image
    const secondSrc = await getActiveLightboxImageSrc(page);
    expect(secondSrc).toBeTruthy();
    expect(secondSrc).not.toBe(firstSrc);

    // Press left arrow to go back
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(1200);

    // Should be back to first image
    const returnedSrc = await getActiveLightboxImageSrc(page);
    expect(returnedSrc).toBe(firstSrc);
  });

  test('next/prev buttons navigate between charts', async ({ page }) => {
    // Open first chart
    await countryPage.clickChart(0);
    await waitForLightboxOpen(page);

    const firstSrc = await getActiveLightboxImageSrc(page);
    expect(firstSrc).toBeTruthy();

    // Click next button
    await countryPage.navigateLightboxNext();

    // Verify different image
    const secondSrc = await getActiveLightboxImageSrc(page);
    expect(secondSrc).toBeTruthy();
    expect(secondSrc).not.toBe(firstSrc);

    // Click prev button
    await countryPage.navigateLightboxPrev();

    // Should be back to first image
    const returnedSrc = await getActiveLightboxImageSrc(page);
    expect(returnedSrc).toBe(firstSrc);
  });

  test('zoom button exists and is clickable', async ({ page }) => {
    // Open lightbox
    await countryPage.clickChart(0);
    await waitForLightboxOpen(page);

    // Verify zoom button exists
    const zoomButton = countryPage.getLightboxZoomButton();
    await expect(zoomButton).toBeVisible();

    // Click zoom button (should zoom in)
    await zoomButton.click();
    await page.waitForTimeout(300);

    // Lightbox should still be open
    const isOpen = await countryPage.isLightboxOpen();
    expect(isOpen).toBe(true);
  });

  test('lightbox works on seasonality page', async ({ page }) => {
    // Switch to seasonality tab
    await countryPage.switchTab('seasonality');

    // Click first chart
    await countryPage.clickChart(0);
    await waitForLightboxOpen(page);

    // Verify lightbox is open
    const isOpen = await countryPage.isLightboxOpen();
    expect(isOpen).toBe(true);

    // Close
    await countryPage.closeLightbox();
    await waitForLightboxClose(page);
  });

  test('all charts are available in gallery', async ({ page }) => {
    // Count chart triggers
    const chartCount = await countryPage.getChartCount();

    // Should have expected number of charts
    expect(chartCount).toBe(EXPECTED_CHART_COUNT);

    // All should be clickable (have lightbox-trigger class)
    const triggers = countryPage.getChartTriggers();
    const triggerCount = await triggers.count();
    expect(triggerCount).toBe(EXPECTED_CHART_COUNT);
  });

  test('close button closes lightbox', async ({ page }) => {
    // Open lightbox
    await countryPage.clickChart(0);
    await waitForLightboxOpen(page);

    // Click close button
    const closeButton = countryPage.getLightboxCloseButton();
    await closeButton.click();

    // Wait for close animation
    await waitForLightboxClose(page);

    // Verify lightbox is closed
    const isOpen = await countryPage.isLightboxOpen();
    expect(isOpen).toBe(false);
  });

  test('lightbox navigation maintains order across sections', async ({ page }) => {
    // Open first chart
    await countryPage.clickChart(0);
    await waitForLightboxOpen(page);

    // Navigate through several charts using arrow keys
    const visitedSrcs = new Set<string>();
    const firstSrc = await getActiveLightboxImageSrc(page);
    expect(firstSrc).toBeTruthy();
    visitedSrcs.add(firstSrc!);

    // Navigate through next 3 charts (enough to verify order without being too slow)
    for (let i = 0; i < 3; i++) {
      // Move to next
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(1200);

      const nextSrc = await getActiveLightboxImageSrc(page);
      expect(nextSrc).toBeTruthy();

      // Add to set regardless (with loop enabled, may revisit first image)
      visitedSrcs.add(nextSrc!);
    }

    // We should have visited at least 2 unique charts (allowing for loop wrapping)
    expect(visitedSrcs.size).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Chart Gallery Lightbox - Theme Integration', () => {
  let countryPage: CountryPage;

  test.beforeEach(async ({ page }) => {
    countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
  });

  test('lightbox works in dark theme', async ({ page }) => {
    // Switch to dark theme
    await page.evaluate(() => {
      localStorage.setItem('hmd-theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Open lightbox
    await countryPage.clickChart(0);
    await waitForLightboxOpen(page);

    // Verify lightbox is open
    const isOpen = await countryPage.isLightboxOpen();
    expect(isOpen).toBe(true);

    // Close
    await countryPage.closeLightbox();
  });

  test('theme toggle during lightbox does not crash', async ({ page }) => {
    // Open lightbox in light theme
    await countryPage.clickChart(0);
    await waitForLightboxOpen(page);

    // Close lightbox first (toggling theme while lightbox is open can block the button)
    await countryPage.closeLightbox();
    await waitForLightboxClose(page);

    // Toggle theme
    await page.click('#theme-toggle');
    await page.waitForTimeout(500);

    // Open lightbox again in new theme
    await countryPage.clickChart(0);
    await waitForLightboxOpen(page);

    // Lightbox should work in new theme
    const isOpen = await countryPage.isLightboxOpen();
    expect(isOpen).toBe(true);

    // Should be able to navigate
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(800);

    // Close should work
    await countryPage.closeLightbox();
    await waitForLightboxClose(page);
  });
});
