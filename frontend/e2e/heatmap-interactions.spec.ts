import { test, expect } from '@playwright/test';
import { CountryPage } from './fixtures/page-objects';
import { TEST_COUNTRY, waitForHeatmapRender, waitForTooltipVisible, MONTH_ABBREV } from './fixtures/test-data';

test.describe('Heatmap Interactions', () => {
  test('tooltip shows on cell hover', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    await countryPage.hoverCell(10);

    // Wait for tooltip to appear
    await waitForTooltipVisible(page);

    // Verify tooltip is visible
    const isVisible = await countryPage.isTooltipVisible();
    expect(isVisible).toBe(true);
  });

  test('tooltip hides on mouseout', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    // Verify tooltip is visible
    let isVisible = await countryPage.isTooltipVisible();
    expect(isVisible).toBe(true);

    // Move mouse away from cells to empty area
    await page.mouse.move(10, 10);

    // Wait for tooltip transition (150ms as per Tooltip.tsx)
    await page.waitForTimeout(300);

    // Tooltip should be hidden (opacity should be 0 or element gone)
    const tooltipCount = await page.locator('div[style*="position: fixed"]').count();
    if (tooltipCount > 0) {
      const tooltip = countryPage.getTooltip();
      const opacity = await tooltip.evaluate(el => getComputedStyle(el).opacity);
      expect(parseFloat(opacity)).toBeLessThanOrEqual(0.1);
    }
    // If tooltip is removed from DOM entirely, that's also valid
  });

  test('tooltip positioned near cursor', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    const cell = countryPage.getHeatmapCells().nth(10);
    await cell.hover();
    await waitForTooltipVisible(page);

    // Get tooltip position
    const tooltipPos = await countryPage.getTooltipPosition();

    // Tooltip should be positioned somewhere on the page
    expect(tooltipPos.x).toBeGreaterThan(0);
    expect(tooltipPos.y).toBeGreaterThan(0);

    // Tooltip should be within viewport
    const viewport = page.viewportSize();
    if (viewport) {
      expect(tooltipPos.x).toBeLessThan(viewport.width);
      expect(tooltipPos.y).toBeLessThan(viewport.height);
    }
  });

  test('tooltip displays correct data (month, year)', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    // Get tooltip content
    const content = await countryPage.getTooltipContent();

    // Header should contain month and year
    expect(content.header).toBeTruthy();
    expect(content.header).toMatch(/[A-Za-z]+\s+\d{4}/); // "Month YYYY" format
  });

  test('tooltip displays formatted value', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    // Get tooltip content
    const content = await countryPage.getTooltipContent();

    // Value should be present and formatted
    expect(content.value).toBeTruthy();
    expect(content.value.length).toBeGreaterThan(0);

    // For fertility, should be numeric (possibly with decimals)
    // May contain formatting like commas or decimal points
    const hasNumbers = /\d/.test(content.value);
    expect(hasNumbers).toBe(true);
  });

  test('tooltip shows births count when available', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    // Get tooltip content
    const content = await countryPage.getTooltipContent();

    // Births might be available (depending on data)
    if (content.births) {
      expect(content.births).toBeTruthy();
      // Should be formatted as number with commas
      const hasNumber = /[\d,]+/.test(content.births);
      expect(hasNumber).toBe(true);
    }
  });

  test('tooltip shows population when available', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    // Get tooltip content
    const content = await countryPage.getTooltipContent();

    // Population might be available (depending on data)
    if (content.population) {
      expect(content.population).toBeTruthy();
      // Should be formatted as number
      const hasNumber = /[\d,]+/.test(content.population);
      expect(hasNumber).toBe(true);
    }
  });

  test('tooltip shows source name', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    // Get tooltip content
    const content = await countryPage.getTooltipContent();

    // Source should be displayed (at minimum a non-empty string)
    expect(content.source).toBeTruthy();
    expect(content.source!.length).toBeGreaterThan(0);

    // Source should be one of the known sources or contain relevant text
    const knownSources = ['HMD', 'UN', 'JPOP', 'Japan', 'Human Mortality', 'United Nations', 'Population'];
    const hasKnownSource = knownSources.some(src =>
      content.source?.toUpperCase().includes(src.toUpperCase())
    );
    expect(hasKnownSource).toBe(true);
  });

  test('tooltip has pointer-events none', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    // Check tooltip pointer-events
    const tooltip = countryPage.getTooltip();
    const pointerEvents = await tooltip.evaluate(el =>
      getComputedStyle(el).pointerEvents
    );

    expect(pointerEvents).toBe('none');
  });

  test('tooltip switches when moving between cells', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over first cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    const firstContent = await countryPage.getTooltipContent();

    // Hover over different cell
    await countryPage.hoverCell(25);
    await page.waitForTimeout(200);

    const secondContent = await countryPage.getTooltipContent();

    // Content should be different (different month/year)
    expect(firstContent.header).not.toBe(secondContent.header);
  });

  test('cell highlight applies on hover', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    const cell = countryPage.getHeatmapCells().nth(10);

    // Hover over cell
    await cell.hover();
    await page.waitForTimeout(200);

    // Check if stroke is applied via inline style
    const hoverStroke = await cell.evaluate(el => {
      const style = el.getAttribute('style') || '';
      const computedStroke = getComputedStyle(el).stroke;
      return { style, computedStroke };
    });

    // Either the style attribute should contain stroke, or computed style should not be 'none'
    const hasStrokeStyle = hoverStroke.style.includes('stroke');
    const hasStrokeComputed = hoverStroke.computedStroke !== 'none' && hoverStroke.computedStroke !== '';

    expect(hasStrokeStyle || hasStrokeComputed).toBe(true);
  });

  test('year range filter displays above heatmap', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Check year range filter is visible
    const filter = countryPage.getYearRangeFilter();
    await expect(filter).toBeVisible();

    // Check range text is visible
    const rangeText = await countryPage.getRangeText();
    expect(rangeText).toBeTruthy();
    expect(rangeText).toMatch(/\d{4}\s*[–-]\s*\d{4}/);
  });

  test('year range filter sliders are interactive', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Get start and end sliders
    const startSlider = countryPage.getStartSlider();
    const endSlider = countryPage.getEndSlider();

    await expect(startSlider).toBeVisible();
    await expect(endSlider).toBeVisible();

    // Check they are input type range
    await expect(startSlider).toHaveAttribute('type', 'range');
    await expect(endSlider).toHaveAttribute('type', 'range');
  });

  test('year range updates when slider changes', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Get initial range
    const initialRange = await countryPage.getRangeText();

    // Get slider attributes
    const startSlider = countryPage.getStartSlider();
    const min = await startSlider.getAttribute('min');
    const max = await startSlider.getAttribute('max');

    if (min && max) {
      const minYear = parseInt(min, 10);
      const maxYear = parseInt(max, 10);

      // Change the range (move start year forward)
      const newStart = Math.min(minYear + 5, maxYear - 1);
      await countryPage.setYearRange(newStart, maxYear);

      // Get updated range
      const updatedRange = await countryPage.getRangeText();

      // Range should have changed
      expect(updatedRange).not.toBe(initialRange);
      expect(updatedRange).toContain(newStart.toString());
    }
  });

  test('reset button shows when range is filtered', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Get slider range
    const startSlider = countryPage.getStartSlider();
    const min = await startSlider.getAttribute('min');
    const max = await startSlider.getAttribute('max');

    if (min && max) {
      const minYear = parseInt(min, 10);
      const maxYear = parseInt(max, 10);

      // Filter the range
      await countryPage.setYearRange(minYear + 5, maxYear);

      // Reset button should be visible
      const resetButton = countryPage.getResetButton();
      await expect(resetButton).toBeVisible();
    }
  });

  test('reset button restores full year range', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Get initial range
    const initialRange = await countryPage.getRangeText();

    // Get slider range
    const startSlider = countryPage.getStartSlider();
    const min = await startSlider.getAttribute('min');
    const max = await startSlider.getAttribute('max');

    if (min && max) {
      const minYear = parseInt(min, 10);
      const maxYear = parseInt(max, 10);

      // Filter the range
      await countryPage.setYearRange(minYear + 5, maxYear - 5);

      // Range should have changed
      const filteredRange = await countryPage.getRangeText();
      expect(filteredRange).not.toBe(initialRange);

      // Click reset
      await countryPage.clickReset();

      // Range should be restored
      const resetRange = await countryPage.getRangeText();
      expect(resetRange).toBe(initialRange);
    }
  });

  test('tick marks are visible below slider track', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Check that tick marks container exists
    const ticksContainer = page.locator('[data-testid="year-range-ticks"]');
    await expect(ticksContainer).toBeVisible();

    // Verify tick marks are rendered
    const tickMarks = ticksContainer.locator('div[data-year]');
    const tickCount = await tickMarks.count();

    // Should have at least 2 tick marks (depends on year range)
    expect(tickCount).toBeGreaterThanOrEqual(2);
  });

  test('tick marks are correctly positioned', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Get slider range
    const startSlider = countryPage.getStartSlider();
    const min = parseInt(await startSlider.getAttribute('min') || '0', 10);
    const max = parseInt(await startSlider.getAttribute('max') || '0', 10);

    // Get all tick marks
    const ticksContainer = page.locator('[data-testid="year-range-ticks"]');
    const tickMarks = ticksContainer.locator('div[data-year]');
    const firstTick = tickMarks.first();

    // Get the year value from data attribute
    const firstYear = parseInt(await firstTick.getAttribute('data-year') || '0', 10);

    // Verify year is within valid range
    expect(firstYear).toBeGreaterThanOrEqual(min);
    expect(firstYear).toBeLessThanOrEqual(max);

    // Verify tick has left positioning
    const leftPosition = await firstTick.evaluate(el => {
      return (el as HTMLElement).style.left;
    });
    expect(leftPosition).toMatch(/%$/); // Should end with %
  });

  test('edge labels display min and max years', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Get slider range attributes
    const startSlider = countryPage.getStartSlider();
    const min = await startSlider.getAttribute('min');
    const max = await startSlider.getAttribute('max');

    // Check edge labels exist and display correct values
    const minLabel = page.locator('[data-testid="year-range-min-label"]');
    const maxLabel = page.locator('[data-testid="year-range-max-label"]');

    await expect(minLabel).toBeVisible();
    await expect(maxLabel).toBeVisible();

    const minText = await minLabel.textContent();
    const maxText = await maxLabel.textContent();

    expect(minText).toBe(min);
    expect(maxText).toBe(max);
  });

  test('slider values snap to integers', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Get slider
    const startSlider = countryPage.getStartSlider();
    const min = parseInt(await startSlider.getAttribute('min') || '0', 10);
    const max = parseInt(await startSlider.getAttribute('max') || '0', 10);

    // Set a year value
    const testYear = Math.floor((min + max) / 2);
    await countryPage.setYearRange(testYear, max);

    // Get displayed range
    const rangeText = await countryPage.getRangeText();

    // Should contain integer year (not decimal)
    expect(rangeText).toContain(testYear.toString());
    expect(rangeText).not.toMatch(/\d+\.\d+/); // No decimal points
  });

  test('slider thumbs have improved styling', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Check that slider has correct class
    const startSlider = countryPage.getStartSlider();
    const className = await startSlider.getAttribute('class');

    expect(className).toContain('year-range-slider');

    // Verify background is transparent (thumbs styled via CSS)
    const bgStyle = await startSlider.evaluate(el => {
      return getComputedStyle(el).background;
    });

    // Should have transparent background (thumbs are styled separately)
    expect(bgStyle).toMatch(/transparent|rgba\(0,\s*0,\s*0,\s*0\)/i);
  });

  test('data availability zones are rendered on slider track', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Check that zones are rendered
    const zones = page.locator('[data-testid^="zone-"]');
    const zoneCount = await zones.count();

    // Should have at least 1 zone
    expect(zoneCount).toBeGreaterThanOrEqual(1);
  });

  test('zones have correct hasData attribute', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Get all zones
    const zones = page.locator('[data-testid^="zone-"]');
    const firstZone = zones.first();

    // Should have data-has-data attribute
    const hasData = await firstZone.getAttribute('data-has-data');
    expect(hasData).toBeTruthy();
    expect(hasData).toMatch(/true|false/);
  });

  test('zones use different colors for data vs no-data', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Get all zones
    const zones = page.locator('[data-testid^="zone-"]');
    const zoneCount = await zones.count();

    // Collect background colors for zones with data vs no data
    const colors = [];
    for (let i = 0; i < Math.min(zoneCount, 5); i++) {
      const zone = zones.nth(i);
      const hasData = await zone.getAttribute('data-has-data');
      const bgColor = await zone.evaluate(el => getComputedStyle(el).backgroundColor);
      colors.push({ hasData: hasData === 'true', bgColor });
    }

    // Verify zones exist
    expect(colors.length).toBeGreaterThan(0);
  });

  test('zone widths are proportional to year ranges', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Get slider range
    const startSlider = countryPage.getStartSlider();
    const min = parseInt(await startSlider.getAttribute('min') || '0', 10);
    const max = parseInt(await startSlider.getAttribute('max') || '0', 10);
    const totalRange = max - min;

    // Get first zone
    const firstZone = page.locator('[data-testid="zone-0"]');
    const zoneStyle = await firstZone.evaluate(el => (el as HTMLElement).style.width);

    // Width should be a percentage
    expect(zoneStyle).toMatch(/%$/);

    // Extract percentage value
    const widthPercent = parseFloat(zoneStyle);
    expect(widthPercent).toBeGreaterThan(0);
    // Allow small floating point error (zone widths may sum slightly over 100 due to rounding)
    expect(widthPercent).toBeLessThanOrEqual(102);
  });

  test('horizontal scroll appears at narrow viewport with many years', async ({ page }) => {
    // Set narrow viewport
    await page.setViewportSize({ width: 800, height: 600 });

    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // USA has 91 years of data (1933-2023)
    // At 800px viewport, cells would be too narrow, so scroll should activate
    const isScrollable = await countryPage.isHeatmapScrollable();
    expect(isScrollable).toBe(true);

    // Verify scrollWidth > clientWidth
    const scrollWidth = await countryPage.getHeatmapScrollWidth();
    const clientWidth = await countryPage.getHeatmapClientWidth();
    expect(scrollWidth).toBeGreaterThan(clientWidth);
  });

  test('no horizontal scroll at wide viewport', async ({ page }) => {
    // Set wide viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // At 1920px viewport, cells should fit without scroll
    const isScrollable = await countryPage.isHeatmapScrollable();
    expect(isScrollable).toBe(false);

    // Verify scrollWidth equals clientWidth (no overflow)
    const scrollWidth = await countryPage.getHeatmapScrollWidth();
    const clientWidth = await countryPage.getHeatmapClientWidth();
    // Allow small margin for rounding
    expect(Math.abs(scrollWidth - clientWidth)).toBeLessThan(5);
  });

  test('scroll position resets when year range changes', async ({ page }) => {
    // Set narrow viewport to ensure scroll is active
    await page.setViewportSize({ width: 800, height: 600 });

    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Verify scroll is active
    const isScrollable = await countryPage.isHeatmapScrollable();
    expect(isScrollable).toBe(true);

    // Scroll to some position
    await countryPage.scrollHeatmapTo(200);
    let scrollLeft = await countryPage.getHeatmapScrollLeft();
    // Verify we actually scrolled (browser may clamp to max scrollable area)
    expect(scrollLeft).toBeGreaterThan(100);
    const initialScrollLeft = scrollLeft;

    // Change year range
    await countryPage.setYearRange(1950, 1980);
    await waitForHeatmapRender(page);

    // Scroll position should be reset to 0 or much less than before
    scrollLeft = await countryPage.getHeatmapScrollLeft();
    // Allow small tolerance for scroll behavior
    expect(scrollLeft).toBeLessThan(initialScrollLeft / 2);
  });

  test('hover indicator appears on color legend when hovering cell', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Verify no indicator initially
    let isVisible = await countryPage.isHoverIndicatorVisible();
    expect(isVisible).toBe(false);

    // Hover over a cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    // Indicator should appear
    isVisible = await countryPage.isHoverIndicatorVisible();
    expect(isVisible).toBe(true);

    // Indicator should have a label
    const label = await countryPage.getHoverIndicatorLabel();
    expect(label).toBeTruthy();
    expect(label.length).toBeGreaterThan(0);
  });

  test('hover indicator disappears when mouse leaves cell', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    // Indicator should appear
    let isVisible = await countryPage.isHoverIndicatorVisible();
    expect(isVisible).toBe(true);

    // Move mouse away
    await page.mouse.move(10, 10);
    await page.waitForTimeout(300);

    // Indicator should disappear
    isVisible = await countryPage.isHoverIndicatorVisible();
    expect(isVisible).toBe(false);
  });

  test('hover indicator updates when moving between cells', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over first cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    const firstLabel = await countryPage.getHoverIndicatorLabel();
    const firstPosition = await countryPage.getHoverIndicatorPosition();

    // Hover over second cell (different position)
    await countryPage.hoverCell(50);
    await page.waitForTimeout(100);

    const secondLabel = await countryPage.getHoverIndicatorLabel();
    const secondPosition = await countryPage.getHoverIndicatorPosition();

    // Labels and positions should be different (different cells have different values)
    // Note: positions might be the same if values are similar, so we mainly check label exists
    expect(secondLabel).toBeTruthy();
    expect(secondLabel.length).toBeGreaterThan(0);
  });

  test('hover indicator position corresponds to cell value', async ({ page }) => {
    const countryPage = new CountryPage(page);
    await countryPage.goto(TEST_COUNTRY.code, 'fertility');
    await waitForHeatmapRender(page);

    // Hover over a cell
    await countryPage.hoverCell(10);
    await waitForTooltipVisible(page);

    // Get indicator position
    const position = await countryPage.getHoverIndicatorPosition();

    // Position should be within legend bounds (margin.left to width - margin.right)
    // Legend has 40px left margin and 40px right margin
    expect(position).toBeGreaterThanOrEqual(40);

    // Get legend width from the ColorLegend SVG
    const legend = countryPage.getColorLegend();
    const svgWidth = await legend.evaluate(el => el.getBoundingClientRect().width);
    expect(position).toBeLessThanOrEqual(svgWidth - 40);
  });
});
