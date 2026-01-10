# US State-Level Birth Data

This document describes the state-level birth and population data available for the birth heatmaps project.

## Data Overview

| Metric | Coverage | Source |
|--------|----------|--------|
| Births by state/month | 1915-2024 | CDC WONDER + Historical |
| Female population 15-44 | 1920-2024 | Census Bureau + NHGIS |
| Fertility rates | 1920-2024 | Computed (98.4% coverage) |

## Data Sources

### Birth Data

**CDC WONDER (2003-2024)**
- Monthly births by state
- Files: `state-level-data/monthly-births-by-state-*.csv`
- High quality, preferred source for recent years

**Historical (1915-2008)**
- US births by state from academic dataset
- File: `state-level-data/US_BIRTH_1915_2008.csv`
- Used for years before CDC WONDER coverage

### Population Data

**Census Bureau FTP (1970-2024)**
- Annual intercensal estimates
- Female population by single year of age
- Files downloaded to: `state-level-data/census-scripts/data/`

**NHGIS (1920-1960)**
- Decennial census data only
- Digitized from historical census publications
- Requires IPUMS API key for download
- Files downloaded to: `state-level-data/census-scripts/nhgis_data/`

### Consolidated Output

All population data is consolidated into:
```
state-level-data/census-scripts/data/female_15_44_consolidated.csv
```

Columns: `year, state_fips, state_name, female_15_44, source, note`

## Data Pipeline Integration

State data is fully integrated into the main pipeline. Run with `--states` flag:

```bash
# Run pipeline with state data
python data-pipeline/scripts/run_pipeline.py --json --states

# Or include states with charts
python data-pipeline/scripts/run_pipeline.py --json --charts --states
```

### Loader Module

The state data loader is in `data-pipeline/src/loaders/states.py`:

```python
from loaders import states

# Load just births
births = states.load_births()

# Load births with fertility rates computed
df = states.load_births_with_fertility()
```

### Exporter Module

The state exporter is in `data-pipeline/src/exporters/states_exporter.py`:

```python
from exporters import export_all_states

# Export state JSON files (no filtering - all 51 states included)
export_all_states(state_births, output_dir, min_years=0, min_monthly_births=0)
```

### Output DataFrame Columns

| Column | Type | Description |
|--------|------|-------------|
| Country | str | State name (uses "Country" for format consistency) |
| Year | int | Year |
| Month | int | Month (1-12) |
| Date | date | First day of month |
| Births | float | Total births in month |
| childbearing_population | float | Female population 15-44 |
| days_in_month | int | Days in the month |
| births_per_day | float | Births / days in month |
| daily_fertility_rate | float | Births per day per 100k women |
| Source | str | Data source label |
| seasonality_percentage_normalized | float | Normalized % of annual births |
| daily_conception_rate | float | Conceptions per day per 100k women |

### Interpolation

Population data is interpolated to fill gaps:
- **Pre-1970**: Linear interpolation between decennial censuses
- **1980**: Missing (data starts at 1981)
- **Post-1970**: Annual data, minimal gaps

## Data Coverage by Period

| Period | Births | Population | Notes |
|--------|--------|------------|-------|
| 1915-1919 | ✓ | ✗ | No fertility rates |
| 1920-1969 | ✓ | Decennial | Interpolated between censuses |
| 1970-1979 | ✓ | Annual | Full coverage |
| 1980 | ✓ | ✗ | Gap in population data |
| 1981-2024 | ✓ | Annual | Full coverage |

## State Coverage

All 50 states plus District of Columbia (51 total) are included without data quality filtering.

Historical notes:
- Alaska/Hawaii: Limited pre-statehood data (became states in 1959)
- DC: Not in historical births file, available in CDC WONDER (2003-2024)

## Scripts

### Download Scripts (in `state-level-data/census-scripts/`)

```bash
# Download Census Bureau files (idempotent)
python download_census_ftp.py

# Check what's downloaded
python download_census_ftp.py --check

# Consolidate all sources
python consolidate_female_15_44.py --summary
```

### NHGIS Scripts (require API key)

```bash
# Set API key
export IPUMS_API_KEY="your_key"
# Or save to ~/.ipums/api_key

# Download historical census data
python nhgis_download_historical.py
```

## Frontend Integration

### Exported Data Structure

State data is exported to three locations (same as countries):

```
data-pipeline/output/              # Primary output
├── states.json                    # State metadata index
├── fertility/states/              # Fertility heatmap data
│   ├── california.json
│   └── ...
├── seasonality/states/            # Seasonality heatmap data
│   └── ...
└── conception/states/             # Conception rate data
    └── ...

frontend/src/assets/data/          # Build-time imports
└── (same structure)

frontend/public/data/              # Client-side fetch
└── (same structure)
```

### URL Pattern

Frontend pages use nested routes:
- `/fertility/states/california`
- `/seasonality/states/texas`
- `/conception/states/new-york`

Compare page supports state selection:
- `/compare?states=california,texas`
- `/compare?countries=japan&states=california` (mixed)

### State Coverage

All 51 states (50 states + District of Columbia) are included in the export.

Unlike countries, states bypass the data quality filters to ensure complete geographic coverage.

**Data completeness varies by state:**
- Most states: Data from 1915-2024 (100+ years)
- Alaska/Hawaii: Limited pre-statehood data (became states in 1959)
- DC: CDC WONDER data only (2003-2024)
- Some states have gaps in population data that affect fertility rate calculations

### Frontend Features

**Implemented:**

1. **State Heatmap Pages**: `/fertility/states/[state]` - Individual state heatmaps with metric tabs
2. **State Index Section**: Homepage includes state grid with navigation to all 51 states
3. **State Dropdown**: Navigation dropdown on state pages for quick state switching
4. **State Comparison**: Compare page supports selecting multiple US states
5. **Mixed Comparison**: Compare states alongside countries on the same page
6. **State OG Images**: OpenGraph images generated for all state/metric combinations
7. **URL Parameters**: States can be selected via URL (`/compare?states=california,texas`)
8. **E2E Tests**: Full Playwright test coverage for state pages and comparison features

**Pending:**

1. **Static Charts**: Generate PNG charts for states (like country chart galleries)
2. **Regional Analysis**: Group states by region (Northeast, South, etc.)

### Technical Notes

- State slugs use same slugification as countries: "New York" → `new-york`
- DC is included as "District of Columbia" → `district-of-columbia`
- Historical state boundaries unchanged since 1959 (AK/HI statehood)

## References

- CDC WONDER: https://wonder.cdc.gov/
- Census Population Estimates: https://www.census.gov/programs-surveys/popest.html
- NHGIS: https://www.nhgis.org/
- IPUMS API Docs: https://developer.ipums.org/docs/v2/
