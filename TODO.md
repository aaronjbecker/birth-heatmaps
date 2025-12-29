## General/Testing
* Expand playwright testing infrastructure to include more comprehensive end-to-end tests for the frontend (mirroring current vitest coverage).

## D3 Heatmap Visualization:
* Set minimum width for heatmap cells (25% of height), and make container automatically scroll horizontally if the heatmap is too wide.
* Year range slider needs better styling (tick marks, snapping to 1Y intervals, full width above heatmap, labels on the left and right edges). Distinguish between sections with and without data (via bar color and thickness).
* Ensure min and max values for color scale are included in the scale and that color scale is consistent with the python version.
* Make color scale full width below heatmap. Ensure labels are not cut off by color scale container. Add labels with min and max values on left and right edges of color scale.
* When a heatmap cell is hovered, we should show an indicator with the current value superimposed on the color scale (vertical line with a triangle on bottom, label on top). This may require some type of context between heatmap and color scale.

## Static image heatmaps
* Add "stacked" format of heatmaps that breaks full history across mutiple rows (for countries with long histories). Generate using matplotlib like existing heatmaps (consult existing python modules).
* Add heatmaps with recent trends (last 50 years) for countries with long histories.

## Static image display
* Add lightbox gallery for static image display modeled in component in example-components directory. Use in place of regular `<Image>` component. Use PhotoSwipe for lightbox and allow navigation between images on the page.

## Country Listing and Filtering
* Create a single sortable table listing of countries with filters for country name, earliest year, latest year, number of missing years, sources. Prioritize sources with HMD data (over UN data) in default sorting.


## Comparison View

