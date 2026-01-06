# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Commit Guidelines

- **Never mention Claude or AI in commit messages.** No "Generated with Claude", no "Co-Authored-By: Claude", no AI attribution of any kind.
- Write commit messages as if a human developer wrote them.

## Project Overview

Interactive visualization of birth seasonality patterns using Human Mortality Database and UN Population Division data. This is a dual-component system:

1. **Python Data Pipeline** (`data-pipeline/`) - Loads, processes, and exports birth/population data
2. **Astro Frontend** (`frontend/`) - Static site with D3 interactive heatmaps

## Essential Commands

### Data Pipeline (Python)

```bash
# Development (recommended): Generate JSON + charts
python data-pipeline/scripts/run_pipeline.py --json --charts

# JSON only (fastest, for frontend development)
python data-pipeline/scripts/run_pipeline.py --json

# Include countries with fewer years of data (default: 25)
python data-pipeline/scripts/run_pipeline.py --json --min-years 10

# Run tests
cd data-pipeline && pytest
cd data-pipeline && pytest --cov=src

# Via Docker
docker compose run pipeline              # Full pipeline
docker compose run pipeline-json         # JSON only (faster)
docker compose up jupyter                # Explore data in notebooks
```

### Frontend (Astro + TypeScript)

```bash
cd frontend

# Development
npm run dev                  # Start dev server
npm run build               # Production build (runs astro check first)
npm run preview             # Preview production build

# Testing
npm test                    # Run Vitest unit tests
npm run test:watch          # Watch mode
npm run test:e2e            # Playwright E2E tests
npm run test:e2e:ui         # E2E with UI
npm run test:all            # All tests

# Via Docker
docker compose up frontend-dev
```

### VSCode Debugging

Available debug configurations in `.vscode/launch.json`:
- **"Python: Run Pipeline (JSON + Charts)"** - Recommended for development
- **"Python: pytest"** - Debug Python tests
- **"Astro: Dev Server"** - Debug frontend
- **"Vitest: Run Tests"** - Debug frontend tests
- **"Full Stack: Pipeline + Frontend"** - Run both simultaneously

### Production Deployment

```bash
# Build production Docker image
make build-prod

# Test production build locally (http://localhost:8422)
make test-prod

# Deploy to production server
make deploy

# SSH tunnel to private registry (for manual operations)
make tunnel
```

**Prerequisites:**
1. Add `localhost:5000` to Docker insecure registries
2. Copy `deploy/.env.example` to `deploy/.env` and configure
3. Ensure SSH access to production server

**Key Files:**
- `frontend/Dockerfile.prod` - Multi-stage production build
- `frontend/nginx/default.conf` - Nginx site configuration
- `deploy/docker-compose.prod.yml` - Traefik deployment config
- `deploy/deploy.sh` - Deployment automation script

## Architecture

### Data Pipeline Flow

```
Raw Data (HMD, UN, Japan)
    ↓ loaders/ (hmd.py, un.py, japan.py)
Combined DataFrames
    ↓ processors/ (interpolation.py, fertility.py, seasonality.py)
Processed Metrics
    ↓ exporters/ (json_exporter.py, chart_exporter.py)
JSON Files + PNG Charts
```

**Key Pipeline Modules:**
- `loaders/` - Load raw data from HMD, UN, and Japan sources
- `processors/` - Interpolate population, compute fertility rates and seasonality metrics
- `exporters/` - Export to JSON (for frontend) and PNG charts (for supplementary analysis)
- `schemas/` - Pandera data validation schemas
- `config/` - Country definitions and settings

**Data Validation:** All DataFrames pass through Pandera schemas (`schemas/pandera_schemas.py`) to ensure data integrity.

### Pipeline Output Locations

The pipeline writes to **three locations** simultaneously:

1. **`data-pipeline/output/`** - Primary output (for archival)
2. **`frontend/src/assets/data/`** - Frontend assets (for Vite build-time imports)
3. **`frontend/public/data/`** - Public data (for client-side fetch, e.g., Compare page)

**Structure:**
```
output/                              frontend/src/assets/data/     frontend/public/data/
├── countries.json          ───────> ├── countries.json     ────> ├── countries.json
├── fertility/{country}.json ──────> ├── fertility/*.json   ────> ├── fertility/*.json
├── seasonality/{country}.json ────> ├── seasonality/*.json ────> ├── seasonality/*.json
└── conception/{country}.json ─────> └── conception/*.json  ────> └── conception/*.json
```

Charts follow a similar pattern but use `src/assets/charts/` (see CHART_LOADING.md).

### Frontend Architecture

**Framework:** Astro (static site generator) with React components for D3 interactivity

**Key Components:**
- `HeatmapD3.tsx` - Main D3 heatmap component (React)
- `YearRangeFilter.tsx` - Year range filtering (React)
- `ColorLegend.tsx` - Color scale legend (React)
- `Tooltip.tsx` - Interactive tooltip (React)
- `ThemeToggle.astro` - Dark/light mode toggle (Astro)
- `ChartGallery.astro` - Displays static PNG charts (Astro)

**Compare Page Components:**
- `ComparePageClient.tsx` - Main Compare page logic and state management
- `CountryMultiSelect.tsx` - Multi-select country dropdown with chips
- `ScaleModeToggle.tsx` - Toggle between unified/per-country color scales
- `CompareHeatmapStack.tsx` - Vertically stacked heatmaps for comparison
- `CompareShareButtons.tsx` - Share buttons with dynamic URL

**Key Libraries:**
- `lib/d3-heatmap.ts` - Core D3 rendering logic
- `lib/color-scales.ts` - Color scale generation with configurable schemes
- `lib/data.ts` - Data loading utilities
- `lib/compare-data.ts` - Compare page data loading and alignment utilities
- `lib/url-params.ts` - URL query parameter handling for Compare page
- `lib/types.ts` - TypeScript interfaces for data structures

**State Management:** React hooks within components; no global state management needed.

### Theming System

The project uses a **CSS custom properties approach** for instant theme switching without transitions:

**How it works:**
1. CSS variables defined in `frontend/src/styles/global.css` for both themes:
   ```css
   :root[data-theme="light"] { --color-bg: #fafafa; }
   :root[data-theme="dark"]  { --color-bg: #0f0f0f; }
   ```

2. Tailwind config (`frontend/tailwind.config.mjs`) references these variables:
   ```js
   colors: { bg: { DEFAULT: 'var(--color-bg)' } }
   ```

3. JavaScript sets `data-theme` attribute on `<html>`:
   - `ThemeToggle.astro` - User toggle button
   - `BaseLayout.astro` - Inline script prevents FOUC (Flash of Unstyled Content)

4. When `data-theme` changes, CSS variables update **instantly** (no transitions)

**Usage in components:**
```tsx
// ✅ Correct - automatically theme-aware
<div className="bg-bg text-text border-border">

// ❌ Wrong - redundant dark: prefix
<div className="bg-bg dark:bg-bg-alt">
```

**Key files:**
- `frontend/src/styles/global.css` - CSS variable definitions
- `frontend/tailwind.config.mjs` - Tailwind color mappings
- `frontend/src/components/ThemeToggle.astro` - Theme toggle UI
- `frontend/src/layouts/BaseLayout.astro` - Theme initialization

**Design decision:** No CSS transitions on theme changes ensures instant, consistent switching across all components.

## Data Loading Patterns

This project uses **two data loading patterns** depending on the use case:

### 1. Build-time Imports (Recommended for Static Pages)

For pages generated at build time (e.g., individual country pages), use Vite ES module imports from `src/assets/data/`:

```typescript
// ✅ Static import from src/assets
import countriesData from '../assets/data/countries.json';

// ✅ Dynamic imports with import.meta.glob
const files = import.meta.glob<DataType>('../../assets/data/fertility/*.json');
```

**Benefits:**
- Cache-busting with content hashes
- Build-time validation (missing files = build failure)
- Proper Vite optimization

### 2. Client-side Fetch (For Dynamic/Interactive Pages)

For pages that load data dynamically based on user interaction (e.g., Compare Countries page), use fetch from `public/data/`:

```typescript
// ✅ Client-side dynamic loading
const response = await fetch('/data/fertility/united-states-of-america.json');
const data = await response.json();
```

**Use this pattern when:**
- Data selection depends on user input (multi-select, filters)
- Loading data on-demand would reduce initial bundle size
- The page is static but content is dynamic (like the Compare page)

**Note:** The data pipeline exports to BOTH locations to support both patterns.

### What NOT to Do

```typescript
// ❌ WRONG - Don't use Node.js fs in frontend
fs.readFile('./public/data/countries.json')  // DON'T DO THIS
```

See README.md "Data Loading Pattern" section for complete details.

## Environment Variables

### Pipeline (Python)

Set in `.vscode/launch.json` for local development, `docker-compose.yml` for Docker:

```bash
PYTHONPATH=/path/to/data-pipeline/src
HMD_DATA_DIR=/path/to/hmd_data        # Human Mortality Database files
UN_DATA_DIR=/path/to/data             # UN population data
OUTPUT_DIR=./output                    # Pipeline output
FRONTEND_ASSETS_DATA_DIR=../frontend/src/assets/data   # Build-time imports
FRONTEND_PUBLIC_DATA_DIR=../frontend/public/data       # Client-side fetch
```

**Note:** Raw data files are NOT included in repo per license terms. Download manually from:
- HMD: https://www.mortality.org/
- UN: https://population.un.org/wpp/

### Frontend

Standard Vite/Astro environment variables (none required for basic development).

## Testing Strategy

### Python Tests (`data-pipeline/tests/`)

```bash
cd data-pipeline
pytest                              # All tests
pytest tests/test_config.py         # Country config tests
pytest tests/test_processors.py     # Data processing tests
pytest tests/test_exporters.py      # JSON export validation
```

**Coverage:** Uses pytest with fixtures in `conftest.py` for sample data generation.

### Frontend Tests (`frontend/src/`)

**Unit Tests (Vitest):**
- `lib/types.test.ts` - TypeScript interface validation
- `lib/data.test.ts` - Data loading utilities
- `lib/color-scales.test.ts` - Color scale generation
- `lib/d3-heatmap.test.ts` - D3 rendering logic

**E2E Tests (Playwright):**

Playwright tests validate end-to-end user workflows and component integration:

- `e2e/navigation.spec.ts` - Page routing, breadcrumbs, tab switching
- `e2e/data-loading.spec.ts` - Data fetching, error states, metadata parsing
- `e2e/heatmap-rendering.spec.ts` - D3 SVG rendering, axes, color scales
- `e2e/heatmap-interactions.spec.ts` - Tooltips, hover states, year range filtering
- `e2e/theme-toggle.spec.ts` - Theme switching and persistence

**Test Organization:**
- Page Object Models in `e2e/fixtures/page-objects.ts` - Reusable selectors and methods
- Test utilities in `e2e/fixtures/test-data.ts` - Helper functions and constants
- Uses United States of America (`united-states-of-america`) as reference test country

```bash
cd frontend
npm test                    # Unit tests
npm run test:e2e           # E2E tests (headless)
npm run test:e2e:ui        # E2E with Playwright UI
npm run test:e2e:headed    # E2E in headed browser
npm run test:all           # Both unit and E2E tests
```

**Writing New E2E Tests:**
- Use page objects (`HomePage`, `CountryPage`) to reduce duplication
- Follow existing patterns in theme-toggle.spec.ts
- Use helper functions from test-data.ts (`waitForHeatmapRender`, `waitForTooltipVisible`)
- Tests run against `http://localhost:4321` (dev server auto-starts)
- Chromium only for now; future: Firefox, WebKit support

## Metrics Computed

The pipeline calculates:

- **Daily Fertility Rate (DFR)**: Births per day per 100,000 women aged 15-44
- **12-Month Moving Average**: Smoothed fertility trend
- **Seasonality Ratio (12-month)**: DFR / 12-month moving average
- **Seasonality Ratio (Annual)**: Percentage of annual births per month (normalized to 30-day months)

## Data Filtering

### Minimum Years Threshold

The pipeline filters out countries with insufficient data coverage to ensure meaningful visualizations.

**Configuration:**
- Default threshold: 25 complete years
- A "complete year" requires all 12 months to have data
- Override via CLI: `--min-years <N>`

**Examples:**
```bash
# Use default threshold (25 years)
python data-pipeline/scripts/run_pipeline.py --json

# Lower threshold for testing/exploration
python data-pipeline/scripts/run_pipeline.py --json --min-years 10

# Include all countries regardless of data coverage
python data-pipeline/scripts/run_pipeline.py --json --min-years 0
```

**Output metadata:**
The `countries.json` file includes:
- `minYearsThreshold`: The threshold used for filtering
- `completeYears`: Number of complete years for each country

Countries excluded by the filter are logged during pipeline execution but not included in any output files (JSON, charts).

## Common Workflows

### Full Development Cycle

```bash
# 1. Run pipeline to generate data
python data-pipeline/scripts/run_pipeline.py --json --charts

# 2. Start frontend dev server
cd frontend && npm run dev

# 3. Make changes, tests run automatically with --watch
npm run test:watch
```

### Adding a New Country

1. Add to `data-pipeline/src/config/countries.py` in `COUNTRIES` dict
2. Ensure raw data files exist in HMD/UN directories
3. Re-run pipeline: `python scripts/run_pipeline.py --json`
4. Frontend automatically picks up new JSON file

### Modifying D3 Visualizations

1. Core rendering logic: `frontend/src/lib/d3-heatmap.ts`
2. React wrapper: `frontend/src/components/HeatmapD3.tsx`
3. Test changes: `npm run test -- d3-heatmap`
4. Check browser: `npm run dev`

### Debugging Pipeline Issues

1. Use VSCode debug config "Python: Run Pipeline (JSON + Charts)"
2. Set breakpoints in `loaders/`, `processors/`, or `exporters/`
3. Check validation errors from Pandera schemas
4. Verify output in `data-pipeline/output/` and `frontend/src/assets/data/`

## D3 Heatmap Implementation

The heatmap uses a **React wrapper + pure D3** pattern:

1. **`HeatmapD3.tsx`** (React):
   - Manages state (filters, theme, tooltip)
   - Provides refs to DOM elements
   - Handles resize observers

2. **`lib/d3-heatmap.ts`** (Pure D3):
   - Actual SVG rendering
   - Scales, axes, cells creation
   - No React dependencies

3. **Supporting Components**:
   - `YearRangeFilter.tsx` - Filters visible year range
   - `ColorLegend.tsx` - Shows color scale
   - `Tooltip.tsx` - Displays cell details on hover

This separation keeps D3 logic testable and React state management clean.

## Notes on Project Status

Development follows staged approach (see README.md "Development Status"):
- Stage A-C: Complete (infrastructure, pipeline, frontend init)
- Stage D: D3 heatmap components (in progress)
- Stage E: Integration and testing (in progress)

Charts loading via `import.meta.glob()` is documented in CHART_LOADING.md.
