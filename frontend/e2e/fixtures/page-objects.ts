/**
 * Page Object Models for E2E tests
 * Provides reusable selectors and methods to reduce code duplication
 */
import { type Page, type Locator } from '@playwright/test';

/**
 * Home page - Country selection grid
 */
export class HomePage {
  constructor(public page: Page) {}

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  getCountryCards(): Locator {
    return this.page.locator('a[href^="/fertility/"]');
  }

  async getCountryCount(): Promise<number> {
    return await this.getCountryCards().count();
  }

  async clickCountry(code: string) {
    await this.page.click(`a[href="/fertility/${code}"]`);
    await this.page.waitForLoadState('networkidle');
  }

  async hasCountryCard(code: string): Promise<boolean> {
    const card = this.page.locator(`a[href="/fertility/${code}"]`);
    return await card.count() > 0;
  }
}

/**
 * Country page - Fertility or Seasonality heatmap view
 */
export class CountryPage {
  constructor(public page: Page) {}

  async goto(country: string, metric: 'fertility' | 'seasonality' = 'fertility') {
    await this.page.goto(`/${metric}/${country}`);
    await this.page.waitForLoadState('networkidle');
  }

  // --- Heatmap Methods ---

  getHeatmapSVG(): Locator {
    return this.page.locator('.heatmap-svg');
  }

  getHeatmapCells(): Locator {
    return this.page.locator('rect.cell');
  }

  async getCellCount(): Promise<number> {
    return await this.getHeatmapCells().count();
  }

  async hoverCell(index: number) {
    const cells = this.getHeatmapCells();
    await cells.nth(index).hover();
    // Small delay for D3 hover effects to apply
    await this.page.waitForTimeout(100);
  }

  async getCellColor(index: number): Promise<string> {
    const cell = this.getHeatmapCells().nth(index);
    return await cell.evaluate((el) => {
      return getComputedStyle(el).fill || el.getAttribute('fill') || '';
    });
  }

  getXAxis(): Locator {
    return this.page.locator('.x-axis');
  }

  getYAxis(): Locator {
    return this.page.locator('.y-axis');
  }

  async getYearLabels(): Promise<string[]> {
    const labels = await this.getXAxis().locator('text').allTextContents();
    return labels;
  }

  async getMonthLabels(): Promise<string[]> {
    const labels = await this.getYAxis().locator('text').allTextContents();
    return labels;
  }

  // --- Tooltip Methods ---

  getTooltip(): Locator {
    // Tooltip renders with fixed positioning
    return this.page.locator('div[style*="position: fixed"]').first();
  }

  async isTooltipVisible(): Promise<boolean> {
    const tooltip = this.getTooltip();
    const count = await tooltip.count();
    if (count === 0) return false;

    const opacity = await tooltip.evaluate((el) => {
      return getComputedStyle(el).opacity;
    });
    return opacity === '1';
  }

  async getTooltipContent(): Promise<{
    header: string;
    value: string;
    births?: string;
    population?: string;
    source?: string;
  }> {
    const tooltip = this.getTooltip();
    await tooltip.waitFor({ state: 'visible', timeout: 2000 });

    // Get all div elements in tooltip
    const divs = tooltip.locator('div');

    // First div is header (Month Year)
    const headerText = await divs.nth(0).textContent() || '';

    // Second div is value (large font)
    const valueText = await divs.nth(1).textContent() || '';

    // Try to extract optional fields using more robust selectors
    let births: string | undefined;
    let population: string | undefined;
    let source: string | undefined;

    // Look for births data
    const birthsText = await tooltip.locator('text=Births:').locator('..').textContent();
    if (birthsText && birthsText.includes('Births:')) {
      births = birthsText.replace('Births:', '').trim();
    }

    // Look for population data
    const populationText = await tooltip.locator('text=Population:').locator('..').textContent();
    if (populationText && populationText.includes('Population:')) {
      population = populationText.replace('Population:', '').trim();
    }

    // Look for source
    const sourceText = await tooltip.locator('text=Source:').textContent();
    if (sourceText) {
      source = sourceText.replace('Source:', '').trim();
    }

    return {
      header: headerText.trim(),
      value: valueText.trim(),
      births,
      population,
      source,
    };
  }

  async getTooltipPosition(): Promise<{ x: number; y: number }> {
    const tooltip = this.getTooltip();
    const box = await tooltip.boundingBox();
    return {
      x: box?.x || 0,
      y: box?.y || 0,
    };
  }

  // --- Year Range Filter Methods ---

  getYearRangeFilter(): Locator {
    return this.page.locator('span:has-text("Year Range")').locator('..');
  }

  getStartSlider(): Locator {
    // First range input with class year-range-slider
    return this.page.locator('input.year-range-slider').first();
  }

  getEndSlider(): Locator {
    // Second range input with class year-range-slider
    return this.page.locator('input.year-range-slider').last();
  }

  async getRangeText(): Promise<string> {
    // Find the span next to "Year Range" label
    const rangeContainer = this.page.locator('span:has-text("Year Range")').locator('..');
    const rangeSpan = rangeContainer.locator('span').nth(1); // Second span is the range value
    return await rangeSpan.textContent() || '';
  }

  async setYearRange(start: number, end: number) {
    // Set start slider
    await this.getStartSlider().fill(start.toString());
    // Small delay for state update
    await this.page.waitForTimeout(100);

    // Set end slider
    await this.getEndSlider().fill(end.toString());
    await this.page.waitForTimeout(100);
  }

  getResetButton(): Locator {
    return this.page.locator('button:has-text("Reset")');
  }

  async clickReset() {
    await this.getResetButton().click();
    // Wait for heatmap to update
    await this.page.waitForTimeout(200);
  }

  async isResetButtonVisible(): Promise<boolean> {
    return await this.getResetButton().isVisible();
  }

  // --- Tab Methods ---

  async switchTab(metric: 'fertility' | 'seasonality') {
    const tabText = metric === 'fertility' ? 'Fertility' : 'Seasonality';
    await this.page.click(`.tab:has-text("${tabText}")`);
    await this.page.waitForLoadState('networkidle');
  }

  getActiveTab(): Locator {
    return this.page.locator('.tab.active');
  }

  async getActiveTabText(): Promise<string> {
    const activeTab = this.getActiveTab();
    return await activeTab.textContent() || '';
  }

  // --- Legend Methods ---

  getColorLegend(): Locator {
    // Legend is an SVG with linearGradient
    return this.page.locator('svg').filter({ has: this.page.locator('linearGradient') }).first();
  }

  async getLegendGradientStopCount(): Promise<number> {
    const stops = this.page.locator('linearGradient stop');
    return await stops.count();
  }

  // --- Navigation & Metadata Methods ---

  getBreadcrumbs(): Locator {
    return this.page.locator('nav.breadcrumb');
  }

  async getBreadcrumbText(): Promise<string> {
    const breadcrumb = this.getBreadcrumbs();
    return await breadcrumb.textContent() || '';
  }

  async clickBreadcrumbHome() {
    await this.page.click('nav.breadcrumb a');
    await this.page.waitForLoadState('networkidle');
  }

  getCountryTitle(): Locator {
    // Use main content h1 only (not header h1 or dev toolbar h1s)
    return this.page.locator('main h1');
  }

  async getCountryName(): Promise<string> {
    const title = this.getCountryTitle();
    const text = await title.textContent();
    return text?.trim() || '';
  }

  getMetadataSection(): Locator {
    return this.page.locator('.metadata, [class*="meta"]');
  }

  // --- Error State Methods ---

  getErrorMessage(): Locator {
    return this.page.locator('div:has-text("No data available")');
  }

  async hasErrorMessage(): Promise<boolean> {
    return await this.getErrorMessage().count() > 0;
  }

  getPipelineMessage(): Locator {
    return this.page.locator('span:has-text("Run the data pipeline")');
  }

  async hasPipelineMessage(): Promise<boolean> {
    return await this.getPipelineMessage().count() > 0;
  }

  // --- Chart Gallery Methods ---

  getChartGallery(): Locator {
    return this.page.locator('.chart-gallery');
  }

  getChartImages(): Locator {
    return this.page.locator('.chart-image');
  }

  getChartTriggers(): Locator {
    return this.page.locator('.lightbox-trigger');
  }

  async getChartCount(): Promise<number> {
    return await this.getChartImages().count();
  }

  async clickChart(index: number) {
    const trigger = this.getChartTriggers().nth(index);
    await trigger.click();
    // Small delay for lightbox initialization
    await this.page.waitForTimeout(200);
  }

  // --- PhotoSwipe Lightbox Methods ---

  getLightbox(): Locator {
    return this.page.locator('.pswp');
  }

  async isLightboxOpen(): Promise<boolean> {
    const lightbox = this.getLightbox();
    const count = await lightbox.count();
    if (count === 0) return false;

    // Check if lightbox has 'pswp--open' class
    const classes = await lightbox.getAttribute('class');
    return classes?.includes('pswp--open') || false;
  }

  getLightboxImage(): Locator {
    return this.page.locator('.pswp__img').first();
  }

  getLightboxNextButton(): Locator {
    return this.page.locator('.pswp__button--arrow--next');
  }

  getLightboxPrevButton(): Locator {
    return this.page.locator('.pswp__button--arrow--prev');
  }

  async navigateLightboxNext() {
    await this.getLightboxNextButton().click();
    await this.page.waitForTimeout(1000); // Wait longer for transition
  }

  async navigateLightboxPrev() {
    await this.getLightboxPrevButton().click();
    await this.page.waitForTimeout(1000); // Wait longer for transition
  }

  async closeLightbox() {
    // Press escape key (most reliable method)
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  getLightboxZoomButton(): Locator {
    return this.page.locator('.pswp__button--zoom');
  }

  getLightboxCloseButton(): Locator {
    return this.page.locator('.pswp__button--close');
  }
}
