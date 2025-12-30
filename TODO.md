## Static image heatmaps
* Add "stacked" format of heatmaps that breaks full history across mutiple rows (for countries with long histories). Generate using matplotlib like existing heatmaps (consult existing python modules).
* Add heatmaps with recent trends (last 50 years) for countries with long histories.

## Country Listing and Filtering
* Create a single sortable table listing of countries with filters for country name, earliest year, latest year, number of missing years, sources. Prioritize sources with HMD data (over only UN or other data sources) in default sorting.

## expandable data tables
* For accessibility reasons, add an expandable table underneath the main heatmap that shows the same raw data in a scrollable HTML table (height capped).

## Comparison View
* Create interactive line chart route (can be static page using search params to identify countries to include? or just local state since Astro isn't an SPA?). Fetch data from nginx static JSON files based on a multi-selection combobox type input (like current country dropdown but with "tiles" indicating selected countries).
* Compare countries by plotting multiple heatmaps, stacked vertically, with a shared color scale.

## Misc TODO Items
* Manually define the list of countries to include based on manual verification of data quality.
* Add conception heatmap that rolls births back 10 months to illustrate conception patterns.
* Deployment script. Add traefik labels to docker containers in compose file.
* Re-arrange chart gallery on country pages
* Add umami analytics script in base layout/header.
* Basic SEO metadata for statically generated pages.
* dynamic OG images for each page
* Source state population data to incorporate state-level fertility rates (US states).