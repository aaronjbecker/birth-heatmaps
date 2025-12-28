# HMD Births Heatmaps - Development Plan

This document serves as a handoff guide for continuing development of the HMD Births Heatmaps project.

## Project Overview

**Goal:** Transform Python data analysis scripts into a full-stack application with:
- Dockerized Python data pipeline (conda/micromamba)
- Astro SSG frontend with interactive D3 heatmaps
- Self-hosted deployment (flexible configuration)

**Data Sources:**
- Human Mortality Database (HMD) - 45 countries
- UN World Population Prospects 2024
- Japan population data (fmsb R package)

---

## Current Status

### Completed Stages

| Stage | Status | Commit | Description |
|-------|--------|--------|-------------|
| A | ✅ Complete | `ccbfc5d` | Repository infrastructure (monorepo, Docker, Makefile) |
| B | ✅ Complete | `5f204f9` | Python pipeline refactoring (modular structure) |
| C | ✅ Complete | `22ca4e7` | Astro frontend initialization (pages, layouts, types) |
| Testing | ✅ Complete | `b5a7ec3` | pytest + Vitest infrastructure |
| D | ✅ Complete | - | D3 heatmap components (42 tests passing) |

### Remaining Stages

| Stage | Status | Description |
|-------|--------|-------------|
| E | 🔲 Pending | Integration and testing |

---

## Stage D: D3 Heatmap Components (COMPLETED)

### Objective
Implement interactive D3.js heatmap visualization components based on the [d3-graph-gallery example](chart_example_from_d3-graph-gallery.html).

### Files to Create

```
frontend/src/
├── components/
│   ├── Heatmap.astro           # Astro wrapper component
│   ├── HeatmapD3.tsx           # React component with D3 rendering
│   ├── Tooltip.tsx             # Hover tooltip component
│   ├── ColorLegend.tsx         # Color scale legend
│   └── YearRangeFilter.tsx     # Year range slider
└── lib/
    ├── d3-heatmap.ts           # D3 heatmap rendering logic
    └── color-scales.ts         # Color scale utilities
```

### Implementation Tasks

1. **Core Heatmap Rendering** (`d3-heatmap.ts`)
   - Create SVG with responsive sizing
   - Build X scale (years) and Y scale (months)
   - Render colored rectangles for each cell
   - Handle null values (gray cells)

2. **Color Scales** (`color-scales.ts`)
   - Sequential scale for fertility (turbo scheme)
   - Diverging scale for seasonality (RdBu scheme)
   - Domain computation from data

3. **React Wrapper** (`HeatmapD3.tsx`)
   - Use `client:load` directive for hydration
   - Manage D3 instance lifecycle
   - Handle resize events
   - Expose props for data and configuration

4. **Tooltip** (`Tooltip.tsx`)
   - Follow cursor position
   - Show: year, month, value, births, source
   - Fade in/out animation

5. **Year Range Filter** (`YearRangeFilter.tsx`)
   - Dual range slider
   - Filter visible years
   - Update heatmap on change

6. **Color Legend** (`ColorLegend.tsx`)
   - Gradient bar
   - Tick marks with values
   - Match colorScale from data

### Reference Implementation

The example in `chart_example_from_d3-graph-gallery.html` shows:
```javascript
// Key patterns to follow:
var x = d3.scaleBand().domain(groups).range([0, width]).padding(0.05);
var y = d3.scaleBand().domain(vars).range([height, 0]).padding(0.05);
var myColor = d3.scaleSequential().interpolator(d3.interpolateInferno).domain([1,100]);

// Cell rendering
svg.selectAll()
  .data(data)
  .enter()
  .append("rect")
    .attr("x", d => x(d.group))
    .attr("y", d => y(d.variable))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .style("fill", d => myColor(d.value))
```

### Integration Points

- Update `fertility/[country].astro` to use `<HeatmapD3 client:load />`
- Update `seasonality/[country].astro` similarly
- Load JSON data and pass as props

---

## Stage E: Integration and Testing (IN PROGRESS)

### Objective
End-to-end integration of the data pipeline with the frontend, production deployment setup, and comprehensive testing.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose                            │
├─────────────────┬─────────────────┬─────────────────────────┤
│   pipeline      │   frontend-dev  │   nginx (production)    │
│   (micromamba)  │   (astro dev)   │   (static files)        │
├─────────────────┴─────────────────┴─────────────────────────┤
│                                                              │
│   data-pipeline/output/          →  nginx serves JSON       │
│   ├── countries.json                                         │
│   ├── fertility/{country}.json                               │
│   ├── seasonality/{country}.json                             │
│   └── charts/{country}/                                      │
│       ├── fertility_heatmap.png                              │
│       ├── seasonality_heatmap.png                            │
│       ├── monthly_fertility_chart.png                        │
│       └── ...                                                │
│                                                              │
│   frontend/src/content/charts/   →  Astro Image component   │
│   (copies from output for Vite optimization)                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Tasks

1. **VS Code Development Setup**
   - Create `.vscode/launch.json` for debugging
   - Configure Python and Node.js debug configurations

2. **Output Directory Structure**
   - JSON outputs go to `data-pipeline/output/` (git-ignored)
   - Chart PNG outputs go to `data-pipeline/output/charts/{country}/`
   - Update JSON exporter to use new output path
   - Update chart builder to output PNGs to new path

3. **Production Nginx Container**
   - Create `nginx/` directory with config
   - Serve static JSON files from `/data/` path
   - Build data files into image (infrequent changes)
   - Configure CORS headers for frontend

4. **Smoke Tests**
   - Docker compose build test
   - Pipeline execution test
   - Frontend build test
   - Nginx serving test

5. **Astro Content Collection for Charts**
   - Create `frontend/src/content/charts/` directory
   - Define content collection schema
   - Copy charts from pipeline output during build
   - Use Astro `<Image>` component for optimization

6. **Country Page Layout Enhancement**
   - Add chart sections to country pages:
     - Daily Fertility Rate Heatmap (D3 interactive)
     - Seasonality Heatmap (D3 interactive)
     - Monthly Fertility Rate Chart (PNG)
     - Monthly Fertility Boxplot (PNG)
     - Population Over Time (PNG)
     - Total Births Over Time (PNG)
   - Section headers with descriptions
   - Responsive grid layout

7. **Multi-Country Comparison (Future)**
   - Keep page structure flexible for comparison views
   - Consider shared state for country selection
   - Plan for overlay/side-by-side visualizations

### Files to Create/Modify

```
.vscode/
└── launch.json                    # VS Code debug config

data-pipeline/
├── output/                        # Git-ignored output directory
│   ├── countries.json
│   ├── fertility/
│   ├── seasonality/
│   └── charts/
└── src/
    └── exporters/
        └── chart_exporter.py      # PNG chart generation

frontend/
├── src/
│   ├── content/
│   │   └── charts/               # Astro content collection
│   │       └── config.ts
│   └── pages/
│       ├── fertility/[country].astro  # Enhanced layout
│       └── seasonality/[country].astro
└── astro.config.mjs              # Content collection config

nginx/
├── Dockerfile
├── nginx.conf
└── default.conf

docker-compose.yml                 # Add nginx service
Makefile                          # Add smoke test targets
```

---

## Project Structure

```
hmd-births-heatmaps/
├── data-pipeline/
│   ├── src/
│   │   ├── config/         # Settings, country definitions
│   │   ├── loaders/        # HMD, UN, Japan data loaders
│   │   ├── processors/     # Interpolation, fertility, seasonality
│   │   ├── exporters/      # JSON export for frontend
│   │   └── schemas/        # Pandera validation
│   ├── scripts/
│   │   └── run_pipeline.py # CLI entry point
│   ├── tests/              # pytest tests
│   ├── notebooks/          # Jupyter notebooks
│   ├── environment.yml     # Conda dependencies
│   ├── Dockerfile
│   └── pytest.ini
├── frontend/
│   ├── src/
│   │   ├── components/     # (Stage D) D3 heatmap components
│   │   ├── layouts/        # BaseLayout.astro
│   │   ├── lib/            # TypeScript types and utilities
│   │   ├── pages/          # index, fertility/[country], seasonality/[country], about
│   │   └── styles/         # global.css
│   ├── public/
│   │   └── data/           # Generated JSON from pipeline
│   ├── package.json
│   ├── astro.config.mjs
│   ├── tsconfig.json
│   └── vitest.config.ts
├── docker-compose.yml
├── Makefile
├── README.md
├── CHANGELOG.md
└── PLAN.md                 # This file
```

---

## Key Files Reference

### Data Pipeline

| File | Purpose |
|------|---------|
| `data-pipeline/scripts/run_pipeline.py` | Main CLI entry point |
| `data-pipeline/src/config/countries.py` | 45 HMD country codes |
| `data-pipeline/src/loaders/hmd.py` | HMD data loading |
| `data-pipeline/src/processors/fertility.py` | Fertility rate computation |
| `data-pipeline/src/exporters/json_exporter.py` | JSON output for frontend |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/lib/types.ts` | TypeScript interfaces (CountryHeatmapData, etc.) |
| `frontend/src/pages/fertility/[country].astro` | Dynamic route template |
| `frontend/public/data/countries.json` | Sample data (regenerate with pipeline) |

### Configuration

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Pipeline, Jupyter, frontend services |
| `Makefile` | Common commands (pipeline, build, dev) |
| `.gitignore` | Excludes raw data, node_modules, build artifacts |

---

## Testing Status

### Python Tests (require conda environment)
```bash
cd data-pipeline
conda activate hmd-pipeline
pytest -v
```

Test files verified for syntax:
- ✅ `tests/conftest.py` - Sample data fixtures
- ✅ `tests/test_config.py` - Config module (15 tests)
- ✅ `tests/test_processors.py` - Processing (10 tests)
- ✅ `tests/test_exporters.py` - Export (8 tests)

### Frontend Tests (passing)
```bash
cd frontend
npm test
```

Results:
- ✅ `src/lib/types.test.ts` - 7 tests passed
- ✅ `src/lib/data.test.ts` - 6 tests passed
- ✅ `src/lib/color-scales.test.ts` - 18 tests passed
- ✅ `src/lib/d3-heatmap.test.ts` - 2 tests passed
- **Total: 33 tests passing**

---

## Commands Quick Reference

```bash
# Data Pipeline
cd data-pipeline
conda env create -f environment.yml
conda activate hmd-pipeline
python scripts/run_pipeline.py --json    # Generate JSON for frontend
pytest                                    # Run tests

# Frontend
cd frontend
npm install
npm run dev                               # Development server (port 4321)
npm run build                             # Production build
npm test                                  # Run tests

# Docker
docker compose up jupyter                 # Jupyter at port 8888
docker compose run pipeline               # Run data pipeline
docker compose up frontend-dev            # Frontend at port 4321
```

---

## Notes for Next Agent

1. **Stage D is complete** - All D3 heatmap components are implemented
2. **Stage E (Integration) is ready to start** - Run full pipeline with real data
3. **42 frontend tests passing** - Run with `npm test` in frontend directory
4. **TypeScript strict mode** - 0 errors with `npx astro check`
5. **Components created:**
   - `HeatmapD3.tsx` - Main React wrapper with D3 rendering
   - `Tooltip.tsx` - Hover tooltip with cell details
   - `ColorLegend.tsx` - Gradient color scale legend
   - `YearRangeFilter.tsx` - Dual range slider for year filtering
   - `Heatmap.astro` - Astro wrapper for SSG integration
6. **Utilities created:**
   - `color-scales.ts` - Color scale creation and formatting
   - `d3-heatmap.ts` - Core D3 heatmap rendering logic
7. **To test with real data:** Run the data pipeline to generate JSON files, then rebuild the frontend

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Monorepo structure | Easier coordination between pipeline and frontend |
| Astro SSG | Pre-rendered HTML for SEO, partial hydration for D3 |
| D3 over chart library | Full control over heatmap appearance and interactions |
| Polars over Pandas | Better performance for large datasets |
| React for D3 wrapper | Familiar patterns for component lifecycle |
| Vitest over Jest | Faster, native ESM support |
