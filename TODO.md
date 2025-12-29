## General/Testing
* ✅ Expand playwright testing infrastructure to include more comprehensive end-to-end tests for the frontend (mirroring current vitest coverage) - COMPLETED
  - Created 4 new test suites: navigation, data-loading, heatmap-rendering, heatmap-interactions
  - Added page object models and test utilities for maintainability
  - 68 total E2E tests with 67 passing, 1 skipped (98.5% pass rate)
  - Fixed all selector and timing issues
  - Test artifacts properly excluded from version control

### Future Testing Expansion
* Add accessibility E2E tests (ARIA attributes, keyboard navigation, screen reader support)
* Add responsive E2E tests (mobile/tablet viewports, ResizeObserver behavior)
* Add cross-browser testing (Firefox, WebKit configurations)
* Add performance E2E tests (load time metrics, render performance)
* Add visual regression tests (screenshot comparison for UI changes)
* Improve year range filter test coverage (comprehensive slider edge cases)

## D3 Heatmap Visualization:
* Set minimum width for heatmap cells (25% of height), and make container automatically scroll horizontally if the heatmap is too wide.
* Year range slider needs better styling (tick marks, snapping to 1Y intervals, full width above heatmap, labels on the left and right edges). Distinguish between sections with and without data (via bar color and thickness).
* Ensure min and max values for color scale are included in the scale and that color scale is consistent with the python version.
* Make color scale full width below heatmap. Ensure labels are not cut off by color scale container. Add labels with min and max values on left and right edges of color scale.
* When a heatmap cell is hovered, we should show an indicator with the current value superimposed on the color scale (vertical line with a triangle on bottom, label on top). This may require some type of context between heatmap and color scale.

## Heatmap tooltip
* Integrate floating-ui to keep tooltip visible within container.

## Static image heatmaps
* Add "stacked" format of heatmaps that breaks full history across mutiple rows (for countries with long histories). Generate using matplotlib like existing heatmaps (consult existing python modules).
* Add heatmaps with recent trends (last 50 years) for countries with long histories.

## Country Listing and Filtering
* Create a single sortable table listing of countries with filters for country name, earliest year, latest year, number of missing years, sources. Prioritize sources with HMD data (over only UN or other data sources) in default sorting.


## Comparison View

