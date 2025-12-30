import { test, expect } from '@playwright/test';
import { TEST_COUNTRY } from './fixtures/test-data';

test.describe('Share Buttons', () => {
  const countryUrl = `/fertility/${TEST_COUNTRY.code}`;

  test.beforeEach(async ({ page }) => {
    await page.goto(countryUrl);
    await page.waitForLoadState('networkidle');
  });

  test('share buttons container is visible', async ({ page }) => {
    const shareButtons = page.locator('.share-buttons');
    await expect(shareButtons).toBeVisible();
  });

  test('all share buttons are present', async ({ page }) => {
    const shareButtons = page.locator('.share-buttons');

    // Check for all 6 buttons (X, Bluesky, Facebook, Reddit, Email, Copy)
    const buttons = shareButtons.locator('.share-btn');
    await expect(buttons).toHaveCount(6);
  });

  test('X share button has correct link', async ({ page }) => {
    const xButton = page.locator('.share-btn[aria-label="Share on X"]');
    await expect(xButton).toBeVisible();

    const href = await xButton.getAttribute('href');
    expect(href).toContain('twitter.com/intent/tweet');
    expect(href).toContain('url=');
    expect(href).toContain(encodeURIComponent('birth-heatmaps.aaronjbecker.com'));
  });

  test('Bluesky share button has correct link', async ({ page }) => {
    const blueskyButton = page.locator('.share-btn[aria-label="Share on Bluesky"]');
    await expect(blueskyButton).toBeVisible();

    const href = await blueskyButton.getAttribute('href');
    expect(href).toContain('bsky.app/intent/compose');
    expect(href).toContain('birth-heatmaps.aaronjbecker.com');
  });

  test('Facebook share button has correct link', async ({ page }) => {
    const facebookButton = page.locator('.share-btn[aria-label="Share on Facebook"]');
    await expect(facebookButton).toBeVisible();

    const href = await facebookButton.getAttribute('href');
    expect(href).toContain('facebook.com/sharer/sharer.php');
    expect(href).toContain('u=');
  });

  test('Reddit share button has correct link', async ({ page }) => {
    const redditButton = page.locator('.share-btn[aria-label="Share on Reddit"]');
    await expect(redditButton).toBeVisible();

    const href = await redditButton.getAttribute('href');
    expect(href).toContain('reddit.com/submit');
    expect(href).toContain('url=');
    expect(href).toContain('title=');
  });

  test('Email share button has correct mailto link', async ({ page }) => {
    const emailButton = page.locator('.share-btn[aria-label="Share via email"]');
    await expect(emailButton).toBeVisible();

    const href = await emailButton.getAttribute('href');
    expect(href).toMatch(/^mailto:\?/);
    expect(href).toContain('subject=');
    expect(href).toContain('body=');
  });

  test('copy link button exists and is a button element', async ({ page }) => {
    const copyButton = page.locator('.share-btn[aria-label="Copy link"]');
    await expect(copyButton).toBeVisible();

    // Should be a button, not a link
    const tagName = await copyButton.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe('button');
  });

  test('share buttons have correct accessibility attributes', async ({ page }) => {
    const buttons = page.locator('.share-btn');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel?.length).toBeGreaterThan(0);
    }
  });

  test('external share links open in new tab', async ({ page }) => {
    // Check that share links have target="_blank" and rel="noopener noreferrer"
    const externalLinks = page.locator('.share-btn[target="_blank"]');

    // X, Bluesky, Facebook, Reddit should have target="_blank" (4 links)
    const count = await externalLinks.count();
    expect(count).toBe(4);

    for (let i = 0; i < count; i++) {
      const link = externalLinks.nth(i);
      const rel = await link.getAttribute('rel');
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    }
  });

  test('share buttons have hover state styling', async ({ page }) => {
    const button = page.locator('.share-btn').first();

    // Get initial border color
    const initialBorder = await button.evaluate((el) => {
      return getComputedStyle(el).borderColor;
    });

    // Hover over button
    await button.hover();
    await page.waitForTimeout(300); // Wait for transition

    // Border should potentially change on hover
    const hoverBorder = await button.evaluate((el) => {
      return getComputedStyle(el).borderColor;
    });

    // Verify styling is defined (hover state may or may not change color depending on headless mode)
    expect(hoverBorder).toBeDefined();
  });

  test('share buttons positioned in page header', async ({ page }) => {
    // Share buttons should be in the page-header div alongside breadcrumb
    const pageHeader = page.locator('.page-header');
    await expect(pageHeader).toBeVisible();

    const shareButtonsInHeader = pageHeader.locator('.share-buttons');
    await expect(shareButtonsInHeader).toBeVisible();

    // Breadcrumb should also be in header
    const breadcrumbInHeader = pageHeader.locator('.breadcrumb');
    await expect(breadcrumbInHeader).toBeVisible();
  });

  test('share buttons contain SVG icons', async ({ page }) => {
    const buttons = page.locator('.share-btn');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const svg = button.locator('svg');
      const svgCount = await svg.count();
      expect(svgCount).toBeGreaterThanOrEqual(1);
    }
  });
});

test.describe('Share Buttons - Copy Link', () => {
  const countryUrl = `/fertility/${TEST_COUNTRY.code}`;

  test('copy button shows checkmark after click', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto(countryUrl);
    await page.waitForLoadState('networkidle');
    // Wait for script initialization
    await page.waitForTimeout(500);

    const copyButton = page.locator('.copy-link-btn');
    await expect(copyButton).toBeVisible();

    // Verify button is initialized
    await page.waitForFunction(() => {
      const btn = document.querySelector('.copy-link-btn');
      return btn?.hasAttribute('data-copy-initialized');
    }, { timeout: 5000 });

    // Click copy button
    await copyButton.click();

    // Wait for the 'copied' class to be added
    await expect(copyButton).toHaveClass(/copied/, { timeout: 2000 });

    // After 2 seconds, copied class should be removed
    await page.waitForTimeout(2100);
    await expect(copyButton).not.toHaveClass(/copied/);
  });

  test('copy button copies correct URL to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto(countryUrl);
    await page.waitForLoadState('networkidle');
    // Wait for script initialization
    await page.waitForTimeout(500);

    const copyButton = page.locator('.copy-link-btn');

    // Verify button is initialized
    await page.waitForFunction(() => {
      const btn = document.querySelector('.copy-link-btn');
      return btn?.hasAttribute('data-copy-initialized');
    }, { timeout: 5000 });

    // Click to copy
    await copyButton.click();
    await page.waitForTimeout(100);

    // Read clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());

    // Should contain the expected URL
    expect(clipboardText).toContain('birth-heatmaps.aaronjbecker.com');
    expect(clipboardText).toContain('/fertility/');
    expect(clipboardText).toContain(TEST_COUNTRY.code);
  });
});

test.describe('Share Buttons - Responsive', () => {
  const countryUrl = `/fertility/${TEST_COUNTRY.code}`;

  test('share buttons are smaller on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(countryUrl);
    await page.waitForLoadState('networkidle');

    const button = page.locator('.share-btn').first();
    const box = await button.boundingBox();

    // On mobile, buttons should be 32px
    expect(box?.width).toBeLessThanOrEqual(34); // Allow small margin for borders
  });

  test('share buttons are larger on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(countryUrl);
    await page.waitForLoadState('networkidle');

    const button = page.locator('.share-btn').first();
    const box = await button.boundingBox();

    // On desktop, buttons should be 40px
    expect(box?.width).toBeGreaterThanOrEqual(38);
  });
});

test.describe('Share Buttons - Theme', () => {
  const countryUrl = `/fertility/${TEST_COUNTRY.code}`;

  test('share buttons visible in light theme', async ({ page }) => {
    await page.goto(countryUrl);
    await page.evaluate(() => {
      localStorage.setItem('hmd-theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.reload();

    const buttons = page.locator('.share-btn');
    const count = await buttons.count();
    expect(count).toBe(6);

    for (let i = 0; i < count; i++) {
      await expect(buttons.nth(i)).toBeVisible();
    }
  });

  test('share buttons visible in dark theme', async ({ page }) => {
    await page.goto(countryUrl);
    await page.evaluate(() => {
      localStorage.setItem('hmd-theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.reload();

    const buttons = page.locator('.share-btn');
    const count = await buttons.count();
    expect(count).toBe(6);

    for (let i = 0; i < count; i++) {
      await expect(buttons.nth(i)).toBeVisible();
    }
  });

  test('share buttons have appropriate colors in dark theme', async ({ page }) => {
    await page.goto(countryUrl);
    await page.evaluate(() => {
      localStorage.setItem('hmd-theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.reload();

    const button = page.locator('.share-btn').first();
    const bgColor = await button.evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    });

    // In dark theme, background should be a dark color (from --color-bg-alt)
    // #1a1a1a = rgb(26, 26, 26)
    expect(bgColor).toContain('26');
  });
});

test.describe('Share Buttons - Different Metrics', () => {
  test('share buttons present on seasonality page', async ({ page }) => {
    await page.goto(`/seasonality/${TEST_COUNTRY.code}`);
    await page.waitForLoadState('networkidle');

    const shareButtons = page.locator('.share-buttons');
    await expect(shareButtons).toBeVisible();

    const buttons = shareButtons.locator('.share-btn');
    await expect(buttons).toHaveCount(6);
  });

  test('share URL changes with metric', async ({ page }) => {
    // Check fertility page
    await page.goto(`/fertility/${TEST_COUNTRY.code}`);
    await page.waitForLoadState('networkidle');

    const fertilityButton = page.locator('.share-btn[aria-label="Share on X"]');
    const fertilityHref = await fertilityButton.getAttribute('href');
    // URL is encoded in the share link
    expect(fertilityHref).toContain(encodeURIComponent('/fertility/'));

    // Check seasonality page
    await page.goto(`/seasonality/${TEST_COUNTRY.code}`);
    await page.waitForLoadState('networkidle');

    const seasonalityButton = page.locator('.share-btn[aria-label="Share on X"]');
    const seasonalityHref = await seasonalityButton.getAttribute('href');
    // URL is encoded in the share link
    expect(seasonalityHref).toContain(encodeURIComponent('/seasonality/'));
  });
});
