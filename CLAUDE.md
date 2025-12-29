# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

The pipeline writes to **two locations** simultaneously:

1. **`data-pipeline/output/`** - Primary output (for archival/nginx)
2. **`frontend/src/assets/data/`** - Frontend assets (for Vite imports)

**Structure:**
```
output/                              frontend/src/assets/data/
├── countries.json          ───────> ├── countries.json
├── fertility/{country}.json ──────> ├── fertility/{country}.json
└── seasonality/{country}.json ────> └── seasonality/{country}.json
```

Charts follow a similar pattern but use `src/content/charts/` (see CHART_LOADING.md).

### Frontend Architecture

**Framework:** Astro (static site generator) with React components for D3 interactivity

**Key Components:**
- `HeatmapD3.tsx` - Main D3 heatmap component (React)
- `YearRangeFilter.tsx` - Year range filtering (React)
- `ColorLegend.tsx` - Color scale legend (React)
- `Tooltip.tsx` - Interactive tooltip (React)
- `ThemeToggle.astro` - Dark/light mode toggle (Astro)
- `ChartGallery.astro` - Displays static PNG charts (Astro)

**Key Libraries:**
- `lib/d3-heatmap.ts` - Core D3 rendering logic
- `lib/color-scales.ts` - Color scale generation with configurable schemes
- `lib/data.ts` - Data loading utilities
- `lib/types.ts` - TypeScript interfaces for data structures

**State Management:** React hooks within components; no global state management needed.

## Critical Data Loading Pattern

**⚠️ IMPORTANT:** JSON data files MUST be loaded using Vite ES module imports, NOT fetch() or Node.js fs operations.

### Rules

1. **ALWAYS place JSON data in `frontend/src/assets/data/`** - Enables Vite to:
   - Cache-bust with content hashes
   - Optimize and bundle properly
   - Track dependencies correctly

2. **NEVER load data from `public/` using fetch()** - The `public/` directory is only for:
   - Files needing exact URLs (`robots.txt`, `favicon.ico`)
   - Files that should NOT be processed by build system

3. **Use proper ES module imports:**

```typescript
// ✅ CORRECT - Import from src/assets
import countriesData from '../assets/data/countries.json';

// ✅ CORRECT - Dynamic imports with import.meta.glob
const files = import.meta.glob<DataType>('../../assets/data/fertility/*.json');

// ❌ WRONG - Don't use fetch from public/
fetch('/data/countries.json')  // DON'T DO THIS

// ❌ WRONG - Don't use Node.js fs
fs.readFile('./public/data/countries.json')  // DON'T DO THIS
```

### Why This Matters

- **Development:** Vite serves imports with proper module resolution
- **Production:** Files get content-hashed filenames for cache busting
- **Build validation:** Missing files cause build failures (good!)

See README.md "Data Loading Pattern" section for complete details.

## Environment Variables

### Pipeline (Python)

Set in `.vscode/launch.json` for local development, `docker-compose.yml` for Docker:

```bash
PYTHONPATH=/path/to/data-pipeline/src
HMD_DATA_DIR=/path/to/hmd_data        # Human Mortality Database files
UN_DATA_DIR=/path/to/data             # UN population data
OUTPUT_DIR=./output                    # Pipeline output
FRONTEND_ASSETS_DATA_DIR=../frontend/src/assets/data  # Frontend JSON target
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
- `e2e/*.spec.ts` - Browser interaction tests

```bash
cd frontend
npm test                    # Unit tests
npm run test:e2e           # E2E tests
npm run test:all           # Both
```

## Metrics Computed

The pipeline calculates:

- **Daily Fertility Rate (DFR)**: Births per day per 100,000 women aged 15-44
- **12-Month Moving Average**: Smoothed fertility trend
- **Seasonality Ratio (12-month)**: DFR / 12-month moving average
- **Seasonality Ratio (Annual)**: Percentage of annual births per month (normalized to 30-day months)

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
