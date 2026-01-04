# Chart Loading in Astro Frontend

This document explains how chart images are loaded in the Astro frontend and where the pipeline needs to write them.

## Overview

The frontend displays two types of visualizations:

1. **Interactive D3 Heatmaps** - Rendered dynamically from JSON data (primary visualization)
2. **Static PNG Charts** - Pre-generated matplotlib charts for supplementary analysis

This document focuses on the **static PNG charts**.

## Chart Image Flow

```
Data Pipeline                      Astro Frontend
┌─────────────────┐               ┌──────────────────────┐
│ chart_exporter  │               │ ChartImage.astro     │
│                 │               │                      │
│ Generates PNGs  │               │ Uses Astro <Image>   │
│ via matplotlib  │               │ component            │
└────────┬────────┘               └──────────┬───────────┘
         │                                   │
         │ Writes to both:                   │ Loads from:
         │                                   │
         ├─────────────────────┐            │
         │                     │            │
         ▼                     ▼            ▼
┌────────────────┐    ┌──────────────────────────────┐
│ output/charts/ │───▶│ src/assets/charts/           │
│ {country}/     │    │ {country-slug}/{chart}.png   │
│ *.png          │    │                              │
└────────────────┘    │ Imported via                 │
                      │ import.meta.glob()           │
  Pipeline output     └──────────────────────────────┘
  (for reference)           Vite/Astro imports
                            (optimized, cached)
```

## Directory Structure

### Pipeline Output (Reference)

```
data-pipeline/output/charts/
├── USA/
│   ├── fertility_heatmap.png
│   ├── seasonality_heatmap.png
│   ├── monthly_fertility_chart.png
│   ├── monthly_fertility_boxplot.png
│   ├── population_chart.png
│   ├── births_chart.png
│   └── daily_fertility_rate_chart.png
├── GBR/
│   └── ... (same files)
└── ...
```

### Frontend Assets (Used by Astro)

```
frontend/src/assets/charts/
├── USA/
│   ├── fertility_heatmap.png
│   ├── seasonality_heatmap.png
│   ├── monthly_fertility_chart.png
│   ├── monthly_fertility_boxplot.png
│   ├── population_chart.png
│   ├── births_chart.png
│   └── daily_fertility_rate_chart.png
├── GBR/
│   └── ... (same files)
└── ...
```

**Note:** Country codes are converted to slugs (e.g., "United States" → "USA").

## How Charts Are Loaded

### 1. Import Pattern (ChartImage.astro)

```typescript
// ChartImage.astro uses Vite's glob import with eager loading
const images = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/charts/**/*.png',
  { eager: true }
);

const imagePath = `../assets/charts/${countrySlug}/${filename}`;
if (images[imagePath]) {
  chartImage = images[imagePath].default;
}
```

### 2. Rendering

```astro
{chartImage ? (
  <Image
    src={chartImage}
    alt={`${metadata.label} for ${countrySlug}`}
    width={800}
    quality={85}
    loading="lazy"
    class="chart-image"
  />
) : (
  <div class="chart-placeholder">
    <p>Chart not available</p>
    <small>Run the data pipeline to generate charts</small>
  </div>
)}
```

## Why This Approach?

### Using `src/assets/charts/` instead of `public/`

**Advantages:**
- ✅ **Vite Asset Handling**: Images are processed and optimized by Vite
- ✅ **Cache Busting**: Content hashes in filenames (`chart-abc123.png`)
- ✅ **Responsive Images**: Astro can generate multiple sizes
- ✅ **Build-time Optimization**: Images are compressed and optimized
- ✅ **Type Safety**: `import.meta.glob` provides type information

**Using `public/` would mean:**
- ❌ No optimization or processing
- ❌ No cache busting (browsers may serve stale images)
- ❌ No build-time validation
- ❌ Manual image optimization required

### Dev vs Prod Behavior

| Aspect | Development | Production |
|--------|-------------|-----------|
| **Location** | `src/assets/charts/` | `src/assets/charts/` |
| **Loading** | `import.meta.glob()` | `import.meta.glob()` |
| **Processing** | On-demand via Vite | Pre-processed at build |
| **Optimization** | None (fast rebuilds) | Full optimization |
| **Cache** | Vite dev cache | Browser cache with hashes |

Both dev and prod use the **same source location** and **same import pattern**. Vite handles the differences automatically.

## Pipeline Configuration

### Settings (data-pipeline/src/config/settings.py)

```python
# Pipeline output (for archival and nginx serving)
CHARTS_OUTPUT_DIR = OUTPUT_DIR / 'charts'

# Frontend assets (for Vite/Astro imports)
FRONTEND_CONTENT_CHARTS_DIR = PROJECT_ROOT / 'frontend' / 'src' / 'assets' / 'charts'
```

### Export Process (data-pipeline/src/exporters/chart_exporter.py)

1. Generate charts to `CHARTS_OUTPUT_DIR`
2. Copy charts to `FRONTEND_CONTENT_CHARTS_DIR`

```python
def export_all_charts(...):
    # Generate to output/charts/{country}/
    # ... chart generation code ...

    # Copy to frontend/src/assets/charts/{country}/
    _copy_charts_to_frontend(CHARTS_OUTPUT_DIR, FRONTEND_CONTENT_CHARTS_DIR)
```

## Environment Variables

For Docker or custom deployments:

```bash
# Override frontend assets charts directory
export FRONTEND_CONTENT_CHARTS_DIR=/app/frontend-assets/charts

# Default (local development)
# FRONTEND_CONTENT_CHARTS_DIR=../frontend/src/assets/charts
```

## Development Workflow

### 1. Generate Charts

```bash
# Run pipeline with charts export
python data-pipeline/scripts/run_pipeline.py --json --charts

# Or use VSCode debug config
# "Python: Run Pipeline (JSON + Charts)"
```

This will:
- Generate charts to `data-pipeline/output/charts/`
- Copy charts to `frontend/src/assets/charts/`

### 2. Verify Charts

```bash
ls frontend/src/assets/charts/USA/
# Should show:
# fertility_heatmap.png
# seasonality_heatmap.png
# monthly_fertility_chart.png
# ...
```

### 3. Start Frontend

```bash
cd frontend
npm run dev
```

Charts are now available via Vite imports and will be displayed in the ChartGallery component on country pages.

## Production Build

### With Docker

```bash
# Build data
docker compose run pipeline

# This generates charts to both:
# - /app/output/charts/ (container)
# - /app/frontend-assets/ (mounted to frontend/src/assets/charts)

# Build frontend
docker compose run frontend-build
```

### Without Docker

```bash
# 1. Generate data and charts
cd data-pipeline
python scripts/run_pipeline.py --json --charts

# 2. Build frontend
cd ../frontend
npm run build
```

The production build will:
- Process all images in `src/assets/charts/`
- Optimize and compress them
- Generate content-hashed filenames
- Output to `dist/_astro/`

## Troubleshooting

### Charts Not Showing

**Symptom:** "Chart not available" placeholder shown

**Causes:**
1. Pipeline hasn't been run with `--charts` flag
2. Charts weren't copied to `frontend/src/assets/charts/`
3. Country slug mismatch (check `get_country_slug()` output)

**Solution:**
```bash
# Re-run pipeline with charts
python data-pipeline/scripts/run_pipeline.py --charts

# Verify charts exist
ls frontend/src/assets/charts/*/
```

### Stale Chart Images

**Symptom:** Changes to charts not reflected in browser

**Causes:**
1. Browser cache
2. Charts not regenerated

**Solution:**
```bash
# Hard refresh in browser (Cmd+Shift+R / Ctrl+Shift+R)
# Or clear Vite cache:
cd frontend
rm -rf node_modules/.vite
npm run dev
```

### Missing Country Directories

**Symptom:** Charts exist but not loaded for specific countries

**Cause:** Country slug mismatch or directory not created

**Solution:**
```python
# Check country slug generation
from data_pipeline.config import get_country_slug
print(get_country_slug("United States"))  # Should output "USA"
```

## Chart Types

The following chart types are generated (see `chart_exporter.py` for details):

| Chart Type | Filename | Description |
|------------|----------|-------------|
| Fertility Heatmap | `fertility_heatmap.png` | Daily fertility rate by month and year |
| Seasonality Heatmap | `seasonality_heatmap.png` | Birth seasonality as percentage of annual births |
| Monthly Fertility Chart | `monthly_fertility_chart.png` | Monthly fertility trends |
| Monthly Fertility Boxplot | `monthly_fertility_boxplot.png` | Distribution of monthly fertility rates |
| Population Chart | `population_chart.png` | Childbearing population over time |
| Births Chart | `births_chart.png` | Total monthly births over time |
| Daily Fertility Rate Chart | `daily_fertility_rate_chart.png` | Daily births per 100k women over time |

All filenames match the `CHART_FILENAMES` constant in `chart_exporter.py` and the `CHART_TYPES` constant in `frontend/src/lib/chart-config.ts`.
