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

  // --- Scroll Methods ---

  getHeatmapContainer(): Locator {
    // The heatmap container is the scrollable wrapper with overflow-x styling
    // It contains .d3-container which in turn contains the SVG
    return this.page.locator('.heatmap-container');
  }

  async isHeatmapScrollable(): Promise<boolean> {
    const container = this.getHeatmapContainer();
    const overflowX = await container.evaluate((el) => {
      return getComputedStyle(el).overflowX;
    });
    return overflowX === 'auto' || overflowX === 'scroll';
  }

  async getHeatmapScrollWidth(): Promise<number> {
    const container = this.getHeatmapContainer();
    return await container.evaluate((el) => {
      return el.scrollWidth;
    });
  }

  async getHeatmapClientWidth(): Promise<number> {
    const container = this.getHeatmapContainer();
    return await container.evaluate((el) => {
      return el.clientWidth;
    });
  }

  async scrollHeatmapTo(x: number) {
    const container = this.getHeatmapContainer();
    await container.evaluate((el, scrollX) => {
      el.scrollLeft = scrollX;
    }, x);
    // Small delay for scroll to settle
    await this.page.waitForTimeout(100);
  }

  async getHeatmapScrollLeft(): Promise<number> {
    const container = this.getHeatmapContainer();
    return await container.evaluate((el) => {
      return el.scrollLeft;
    });
  }

  // --- Tooltip Methods ---

  getTooltip(): Locator {
    // Tooltip renders with data-testid for reliable selection
    return this.page.locator('[data-testid="tooltip"]');
  }

  async isTooltipVisible(): Promise<boolean> {
    const tooltip = this.getTooltip();
    const count = await tooltip.count();
    if (count === 0) return false;

    const opacity = await tooltip.evaluate((el) => {
      return getComputedStyle(el).opacity;
    });
    return parseFloat(opacity) > 0.5;
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
    // Use testid for reliability
    return this.page.locator('[data-testid="year-range-start"]');
  }

  getEndSlider(): Locator {
    // Use testid for reliability
    return this.page.locator('[data-testid="year-range-end"]');
  }

  async getRangeText(): Promise<string> {
    // Year range is now displayed via input fields
    const startInput = this.page.locator('[data-testid="year-input-start"]');
    const endInput = this.page.locator('[data-testid="year-input-end"]');
    const startValue = await startInput.inputValue();
    const endValue = await endInput.inputValue();
    return `${startValue}–${endValue}`;
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
    return this.page.locator('[data-testid="year-range-reset"]');
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

  getHoverIndicator(): Locator {
    return this.page.locator('.hover-indicator');
  }

  async isHoverIndicatorVisible(): Promise<boolean> {
    const indicator = this.getHoverIndicator();
    return await indicator.count() > 0;
  }

  async getHoverIndicatorLabel(): Promise<string> {
    const indicator = this.getHoverIndicator();
    const text = indicator.locator('text');
    return await text.textContent() || '';
  }

  async getHoverIndicatorPosition(): Promise<number> {
    const indicator = this.getHoverIndicator();
    const line = indicator.locator('line').first();
    const x1 = await line.getAttribute('x1');
    return parseFloat(x1 || '0');
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

  // --- Share Buttons Methods ---

  getShareButtons(): Locator {
    return this.page.locator('.share-buttons');
  }

  getShareButton(platform: 'x' | 'bluesky' | 'facebook' | 'reddit' | 'email' | 'copy'): Locator {
    const ariaLabels: Record<string, string> = {
      x: 'Share on X',
      bluesky: 'Share on Bluesky',
      facebook: 'Share on Facebook',
      reddit: 'Share on Reddit',
      email: 'Share via email',
      copy: 'Copy link',
    };
    return this.page.locator(`.share-btn[aria-label="${ariaLabels[platform]}"]`);
  }

  async getShareButtonCount(): Promise<number> {
    return await this.page.locator('.share-btn').count();
  }

  getCopyLinkButton(): Locator {
    return this.page.locator('.copy-link-btn');
  }

  async clickCopyLink() {
    await this.getCopyLinkButton().click();
    // Small delay for clipboard operation
    await this.page.waitForTimeout(100);
  }

  async isCopyButtonShowingSuccess(): Promise<boolean> {
    const button = this.getCopyLinkButton();
    const classes = await button.getAttribute('class');
    return classes?.includes('copied') || false;
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

/**
 * Compare page - Multi-country comparison view
 */
export class ComparePage {
  constructor(public page: Page) {}

  async goto(queryParams?: string) {
    const url = queryParams ? `/compare?${queryParams}` : '/compare';
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  // --- Country Selection Methods ---

  getCountrySelectTrigger(): Locator {
    return this.page.locator('[data-testid="country-multiselect-trigger"]');
  }

  getCountryDropdown(): Locator {
    return this.page.locator('[data-testid="country-multiselect-menu"]');
  }

  async openCountryDropdown() {
    const dropdown = this.getCountryDropdown();
    const isVisible = await dropdown.isVisible();
    if (!isVisible) {
      await this.getCountrySelectTrigger().click();
      await this.page.waitForTimeout(100);
    }
  }

  async closeCountryDropdown() {
    // Press Escape to close
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(100);
  }

  getCountryOption(code: string): Locator {
    return this.page.locator(`[data-testid="country-option-${code}"]`);
  }

  async selectCountry(code: string) {
    await this.openCountryDropdown();
    await this.getCountryOption(code).click();
    await this.page.waitForTimeout(500); // Wait for data fetch
  }

  async deselectCountry(code: string) {
    await this.openCountryDropdown();
    await this.getCountryOption(code).click();
    await this.page.waitForTimeout(100);
  }

  // Chips don't have data attributes, find by text content
  getSelectedChips(): Locator {
    return this.page.locator('.country-multiselect-chip-remove').locator('..');
  }

  async getSelectedCountryNames(): Promise<string[]> {
    const chips = await this.getSelectedChips().all();
    const names: string[] = [];
    for (const chip of chips) {
      const text = await chip.textContent();
      if (text) names.push(text.replace('✕', '').trim());
    }
    return names;
  }

  async removeCountryByName(name: string) {
    const chip = this.page.locator(`button[aria-label="Remove ${name}"]`);
    await chip.click();
    await this.page.waitForTimeout(100);
  }

  getClearAllButton(): Locator {
    return this.page.locator('.country-multiselect-action:has-text("Clear")');
  }

  getSearchInput(): Locator {
    return this.page.locator('[data-testid="country-multiselect-search"]');
  }

  async searchCountries(query: string) {
    await this.openCountryDropdown();
    const input = this.getSearchInput();
    await input.fill(query);
    await this.page.waitForTimeout(100);
  }

  // --- Scale Mode Methods ---

  getScaleModeToggle(): Locator {
    return this.page.locator('[data-testid="scale-mode-toggle"]');
  }

  getUnifiedScaleButton(): Locator {
    return this.page.locator('[data-testid="scale-mode-unified"]');
  }

  getPerCountryScaleButton(): Locator {
    return this.page.locator('[data-testid="scale-mode-per-country"]');
  }

  async selectScaleMode(mode: 'unified' | 'per-country') {
    if (mode === 'unified') {
      await this.getUnifiedScaleButton().click();
    } else {
      await this.getPerCountryScaleButton().click();
    }
    await this.page.waitForTimeout(100);
  }

  async getActiveScaleMode(): Promise<'unified' | 'per-country'> {
    const unifiedClasses = await this.getUnifiedScaleButton().getAttribute('class');
    return unifiedClasses?.includes('active') ? 'unified' : 'per-country';
  }

  // --- Metric Tab Methods ---

  getMetricTab(metric: 'fertility' | 'seasonality' | 'conception'): Locator {
    const labels: Record<string, string> = {
      fertility: 'Fertility',
      seasonality: 'Seasonality',
      conception: 'Conception',
    };
    return this.page.locator(`.metric-tab:has-text("${labels[metric]}")`);
  }

  async selectMetric(metric: 'fertility' | 'seasonality' | 'conception') {
    await this.getMetricTab(metric).click();
    await this.page.waitForTimeout(500); // Wait for data reload
  }

  async getSelectedMetric(): Promise<string> {
    const activeTab = this.page.locator('.metric-tab.active');
    const text = await activeTab.textContent();
    return text?.toLowerCase() || 'fertility';
  }

  // --- Heatmap Stack Methods ---

  getHeatmapSVGs(): Locator {
    return this.page.locator('.heatmap-svg');
  }

  async getHeatmapCount(): Promise<number> {
    return await this.getHeatmapSVGs().count();
  }

  getCountryHeaders(): Locator {
    // Country name headers in the compare stack
    return this.page.locator('h3').filter({ hasText: /^[A-Z]/ });
  }

  getColorLegends(): Locator {
    return this.page.locator('svg').filter({
      has: this.page.locator('linearGradient'),
    });
  }

  // --- Share Methods ---

  getShareButtons(): Locator {
    return this.page.locator('[data-testid="compare-share-buttons"]');
  }

  getCopyLinkButton(): Locator {
    return this.page.locator('[data-testid="copy-link-button"]');
  }

  async clickCopyLink() {
    await this.getCopyLinkButton().click();
    await this.page.waitForTimeout(100);
  }

  // --- Loading & Error States ---

  getLoadingContainer(): Locator {
    return this.page.locator('text=Loading heatmap data');
  }

  async isLoading(): Promise<boolean> {
    return await this.getLoadingContainer().isVisible();
  }

  getErrorContainer(): Locator {
    // Error text styling
    return this.page.locator('span').filter({ hasText: /Failed|Error/ });
  }

  async hasError(): Promise<boolean> {
    return await this.getErrorContainer().isVisible();
  }

  getEmptyState(): Locator {
    return this.page.locator('text=No countries selected');
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return await this.getEmptyState().isVisible();
  }

  // --- URL Methods ---

  getCurrentUrl(): string {
    return this.page.url();
  }

  getQueryParam(name: string): string | null {
    const url = new URL(this.page.url());
    return url.searchParams.get(name);
  }
}
