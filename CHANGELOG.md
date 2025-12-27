# Changelog

All notable changes to the HMD Births Heatmaps project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added - Testing Infrastructure
- Python testing with pytest
  - `pytest.ini` configuration
  - `tests/conftest.py` with fixtures for sample data
  - `tests/test_config.py` for configuration module
  - `tests/test_processors.py` for data processing
  - `tests/test_exporters.py` for JSON export
- Frontend testing with Vitest
  - `vitest.config.ts` configuration
  - `src/lib/types.test.ts` for TypeScript types
  - `src/lib/data.test.ts` for data utilities

---

## Stage C - Astro Frontend Initialization

**Commit:** `22ca4e7`

### Added
- **Astro project setup**
  - `package.json` with Astro 4, React 18, D3 7, TypeScript
  - `astro.config.mjs` with SSG output and React integration
  - `tsconfig.json` with strict mode and path aliases
  - `Dockerfile` for containerized development

- **Layout and styling**
  - `src/layouts/BaseLayout.astro` - Header, footer, navigation
  - `src/styles/global.css` - CSS variables, responsive grid, utility classes

- **TypeScript types**
  - `src/lib/types.ts` - Interfaces for CountriesIndex, CountryHeatmapData, HeatmapCell
  - `src/lib/data.ts` - Data loading and formatting utilities

- **Pages**
  - `src/pages/index.astro` - Country grid with links
  - `src/pages/fertility/[country].astro` - Dynamic route for fertility heatmaps
  - `src/pages/seasonality/[country].astro` - Dynamic route for seasonality heatmaps
  - `src/pages/about.astro` - Project documentation

- **Assets**
  - `public/favicon.svg` - Heatmap-inspired icon
  - `public/data/countries.json` - Sample data for development

---

## Stage B - Python Pipeline Refactoring

**Commit:** `5f204f9`

### Added
- **Config module** (`src/config/`)
  - `settings.py` - Directory paths, constants, data source labels
  - `countries.py` - HMD country codes (45 countries) and normalization helpers

- **Loaders module** (`src/loaders/`)
  - `hmd.py` - Human Mortality Database births and population loaders
  - `un.py` - UN Population Division data loader
  - `japan.py` - Japan population data (fmsb R package) loader

- **Processors module** (`src/processors/`)
  - `interpolation.py` - Population interpolation between census dates
  - `fertility.py` - Daily fertility rate computation
  - `seasonality.py` - Birth seasonality metrics (ratios, percentages)
  - `stats.py` - Data coverage statistics

- **Exporters module** (`src/exporters/`)
  - `json_exporter.py` - JSON export for Astro frontend
    - `countries.json` - Country index with metadata
    - `fertility/{country}.json` - Per-country fertility data
    - `seasonality/{country}.json` - Per-country seasonality data

- **Schemas module** (`src/schemas/`)
  - Pandera validation schemas: BirthsSchema, PopulationSchema, StatsSchema

- **Pipeline orchestration**
  - `scripts/run_pipeline.py` - CLI with `--json`, `--csv`, `--all` options

### Changed
- Moved Python scripts from root to `data-pipeline/src/`
- Modularized monolithic scripts into separate concerns

---

## Stage A - Repository Infrastructure

**Commit:** `ccbfc5d`

### Added
- **Monorepo structure**
  - `data-pipeline/` - Python data preparation
  - `frontend/` - Astro static site (placeholder)

- **Data pipeline containerization**
  - `data-pipeline/environment.yml` - Conda environment (polars, pandas, numpy, matplotlib, pandera)
  - `data-pipeline/Dockerfile` - Micromamba-based container

- **Docker orchestration**
  - `docker-compose.yml` - Services for pipeline, jupyter, frontend-dev

- **Build automation**
  - `Makefile` - Commands for pipeline, build, dev, jupyter, clean

- **Git configuration**
  - `.gitignore` - Extended for monorepo (data dirs, node_modules, build artifacts)
  - `.gitattributes` - Line ending normalization

- **Documentation**
  - `README.md` - Project overview, quick start, metrics explanation

### Changed
- Moved Jupyter notebooks to `data-pipeline/notebooks/`

---

## Pre-Stage - Original Implementation

The original project consisted of Python scripts for analyzing Human Mortality Database data:

- `load_heatmap_data.py` - Combined HMD, UN, and Japan data sources
- `prepare_heatmap_data.py` - Computed fertility rates and seasonality
- `fertility_heatmap_plotting.py` - Matplotlib heatmap visualization
- `build_fertility_charts.py` - Chart generation orchestration
- `fertility_heatmap_config.py` - Configuration constants
- `tick_spacing_helpers.py` - Chart tick utilities
- `parse_jpop.py` - Japan population data parser

**Data sources:**
- Human Mortality Database (HMD) - 45 countries
- UN World Population Prospects 2024
- Japan population via fmsb R package

**Metrics computed:**
- Daily fertility rate (births per 100k women age 15-44)
- Seasonality ratio (12-month moving average)
- Seasonality percentage (normalized to 30-day months)
