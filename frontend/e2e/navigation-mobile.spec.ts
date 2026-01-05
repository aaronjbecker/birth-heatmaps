/**
 * Mobile navigation E2E tests
 * Tests responsive navigation behavior, hamburger menu, and accessibility
 */
import { test, expect } from '@playwright/test';

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('hamburger button is visible on mobile', async ({ page }) => {
    const hamburger = page.locator('[data-testid="mobile-menu-button"]');
    await expect(hamburger).toBeVisible();
  });

  test('desktop navigation is hidden on mobile', async ({ page }) => {
    // Desktop nav should be hidden (has hidden class on mobile)
    const desktopNav = page.locator('header nav .hidden.md\\:flex');
    await expect(desktopNav).toBeHidden();
  });

  test('site title is hidden on mobile, only logo visible', async ({ page }) => {
    const logoLink = page.locator('[data-testid="nav-logo-link"]');
    await expect(logoLink).toBeVisible();

    // Logo SVG should be visible
    const logoSvg = logoLink.locator('svg');
    await expect(logoSvg).toBeVisible();

    // Title text should be hidden on mobile (has hidden class)
    const titleText = logoLink.locator('span.hidden');
    await expect(titleText).toBeHidden();
  });

  test('clicking hamburger opens mobile menu', async ({ page }) => {
    const hamburger = page.locator('[data-testid="mobile-menu-button"]');
    await hamburger.click();

    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    await expect(mobileMenu).toBeVisible();
  });

  test('mobile menu contains all navigation links', async ({ page }) => {
    await page.click('[data-testid="mobile-menu-button"]');

    await expect(page.locator('[data-testid="mobile-nav-countries"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-nav-compare"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-nav-about"]')).toBeVisible();
  });

  test('mobile menu contains country dropdown', async ({ page }) => {
    await page.click('[data-testid="mobile-menu-button"]');

    const dropdown = page.locator('[data-testid="mobile-menu"] [data-testid="country-dropdown-trigger"]');
    await expect(dropdown).toBeVisible();
  });

  test('clicking menu link navigates and closes menu', async ({ page }) => {
    await page.click('[data-testid="mobile-menu-button"]');
    await page.click('[data-testid="mobile-nav-about"]');

    await expect(page).toHaveURL('/about');
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    await expect(mobileMenu).not.toBeVisible();
  });

  test('Escape key closes mobile menu', async ({ page }) => {
    await page.click('[data-testid="mobile-menu-button"]');
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    await expect(mobileMenu).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(mobileMenu).not.toBeVisible();
  });

  test('clicking outside closes mobile menu', async ({ page }) => {
    await page.click('[data-testid="mobile-menu-button"]');
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    await expect(mobileMenu).toBeVisible();

    // Click on main content area
    await page.locator('main').click({ force: true });
    await expect(mobileMenu).not.toBeVisible();
  });

  test('hamburger button toggles between open and close icons', async ({ page }) => {
    const hamburger = page.locator('[data-testid="mobile-menu-button"]');

    // Initially shows hamburger icon (3 lines)
    const hamburgerLines = hamburger.locator('svg line');
    await expect(hamburgerLines).toHaveCount(3);

    // Click to open - should show X icon (2 lines)
    await hamburger.click();
    const xLines = hamburger.locator('svg line');
    await expect(xLines).toHaveCount(2);

    // Click to close - back to hamburger icon
    await hamburger.click();
    await expect(hamburger.locator('svg line')).toHaveCount(3);
  });

  test('hamburger button has correct aria-expanded state', async ({ page }) => {
    const hamburger = page.locator('[data-testid="mobile-menu-button"]');

    // Initially closed
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');

    // After opening
    await hamburger.click();
    await expect(hamburger).toHaveAttribute('aria-expanded', 'true');

    // After closing
    await hamburger.click();
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  });

  test('hamburger button has aria-label', async ({ page }) => {
    const hamburger = page.locator('[data-testid="mobile-menu-button"]');

    // When closed
    await expect(hamburger).toHaveAttribute('aria-label', 'Open menu');

    // When open
    await hamburger.click();
    await expect(hamburger).toHaveAttribute('aria-label', 'Close menu');
  });

  test('hamburger button has aria-controls pointing to menu', async ({ page }) => {
    const hamburger = page.locator('[data-testid="mobile-menu-button"]');
    await expect(hamburger).toHaveAttribute('aria-controls', 'mobile-menu');

    // Verify the menu has matching id
    await hamburger.click();
    const mobileMenu = page.locator('#mobile-menu');
    await expect(mobileMenu).toBeVisible();
  });

  test('focus moves to first link when menu opens', async ({ page }) => {
    await page.click('[data-testid="mobile-menu-button"]');

    // Wait for menu animation
    await page.waitForTimeout(200);

    // First link should be focused
    const firstLink = page.locator('[data-testid="mobile-nav-countries"]');
    await expect(firstLink).toBeFocused();
  });

  test('current page link is highlighted in mobile menu', async ({ page }) => {
    // Navigate to About page
    await page.goto('/about');
    await page.waitForLoadState('networkidle');

    await page.click('[data-testid="mobile-menu-button"]');

    const aboutLink = page.locator('[data-testid="mobile-nav-about"]');
    const classes = await aboutLink.getAttribute('class');
    expect(classes).toContain('font-semibold');
    expect(classes).toContain('text-primary');
  });

  test('theme toggle is visible on mobile', async ({ page }) => {
    // Theme toggle should be visible in mobile controls (md:hidden container)
    const mobileControls = page.locator('.md\\:hidden');
    const themeToggle = mobileControls.locator('#theme-toggle');
    await expect(themeToggle).toBeVisible();
  });
});

test.describe('Desktop Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('hamburger button is hidden on desktop', async ({ page }) => {
    const hamburger = page.locator('[data-testid="mobile-menu-button"]');
    await expect(hamburger).toBeHidden();
  });

  test('desktop navigation is visible', async ({ page }) => {
    // Check nav links are visible
    const navLinks = page.locator('header nav a[href="/"]');
    await expect(navLinks.first()).toBeVisible();

    await expect(page.locator('header nav a[href="/compare"]')).toBeVisible();
    await expect(page.locator('header nav a[href="/about"]')).toBeVisible();
  });

  test('logo and site title are visible on desktop', async ({ page }) => {
    const logoLink = page.locator('[data-testid="nav-logo-link"]');
    await expect(logoLink).toBeVisible();

    // Logo SVG should be visible
    const logoSvg = logoLink.locator('svg');
    await expect(logoSvg).toBeVisible();

    // Title text should be visible on desktop
    const titleText = logoLink.locator('span');
    await expect(titleText).toBeVisible();
    await expect(titleText).toHaveText('Birth Heatmaps');
  });

  test('logo links to home', async ({ page }) => {
    const logoLink = page.locator('[data-testid="nav-logo-link"]');
    await expect(logoLink).toHaveAttribute('href', '/');
  });

  test('country dropdown is visible on desktop', async ({ page }) => {
    // Target the dropdown in the header navigation specifically
    const headerNav = page.locator('header nav');
    const dropdown = headerNav.locator('[data-testid="country-dropdown-trigger"]');
    await expect(dropdown).toBeVisible();
  });

  test('theme toggle is visible on desktop', async ({ page }) => {
    // Theme toggle should be visible in desktop nav (md:flex container)
    const desktopNav = page.locator('.md\\:flex');
    const themeToggle = desktopNav.locator('#theme-toggle');
    await expect(themeToggle).toBeVisible();
  });
});

test.describe('Navigation Responsiveness', () => {
  test('transitions from mobile to desktop correctly', async ({ page }) => {
    // Start mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hamburger = page.locator('[data-testid="mobile-menu-button"]');
    await expect(hamburger).toBeVisible();

    // Resize to desktop
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(hamburger).toBeHidden();
  });

  test('mobile menu closes on resize to desktop', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    await expect(mobileMenu).toBeVisible();

    // Resize to desktop - menu should close
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(mobileMenu).not.toBeVisible();
  });

  test('transitions from desktop to mobile correctly', async ({ page }) => {
    // Start desktop
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hamburger = page.locator('[data-testid="mobile-menu-button"]');
    await expect(hamburger).toBeHidden();

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(hamburger).toBeVisible();
  });
});

test.describe('Navigation Links', () => {
  test('Countries link navigates to home page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/about');
    await page.waitForLoadState('networkidle');

    await page.click('[data-testid="mobile-menu-button"]');
    await page.click('[data-testid="mobile-nav-countries"]');

    await expect(page).toHaveURL('/');
  });

  test('Compare link navigates to compare page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('[data-testid="mobile-menu-button"]');
    await page.click('[data-testid="mobile-nav-compare"]');

    await expect(page).toHaveURL('/compare');
  });

  test('About link navigates to about page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('[data-testid="mobile-menu-button"]');
    await page.click('[data-testid="mobile-nav-about"]');

    await expect(page).toHaveURL('/about');
  });
});
