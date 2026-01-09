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

The state data loader is in `data-pipeline/src/loaders/states.py`:

```python
from loaders import states

# Load just births
births = states.load_births()

# Load births with fertility rates computed
df = states.load_births_with_fertility()
```

### Output DataFrame Columns

| Column | Type | Description |
|--------|------|-------------|
| Country | str | State name (uses "Country" for format consistency) |
| Year | int | Year |
| Month | int | Month (1-12) |
| Births | float | Total births in month |
| childbearing_population | float | Female population 15-44 |
| births_per_day | float | Births / days in month |
| daily_fertility_rate | float | Births per day per 100k women |

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

All 50 states plus District of Columbia are included.

Historical notes:
- Alaska/Hawaii: Limited pre-statehood data (became states in 1959)
- DC: Not in historical births file, available in CDC WONDER

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

## Frontend Integration (TODO)

### Planned Features

1. **State Heatmaps**: Birth seasonality by state (similar to country heatmaps)
2. **State Comparison**: Compare seasonality patterns across states
3. **Regional Analysis**: Group states by region (Northeast, South, etc.)
4. **Fertility Trends**: Long-term fertility rate visualization

### Data Export

State data export should follow the same pattern as country data:
- JSON files in `frontend/src/assets/data/states/`
- Slug-based filenames (e.g., `california.json`, `new-york.json`)

### Considerations

- State names need slugification for URLs/filenames
- Consider FIPS codes as stable identifiers
- Historical state boundaries unchanged since 1959 (AK/HI statehood)
- DC is included but is not technically a state

## References

- CDC WONDER: https://wonder.cdc.gov/
- Census Population Estimates: https://www.census.gov/programs-surveys/popest.html
- NHGIS: https://www.nhgis.org/
- IPUMS API Docs: https://developer.ipums.org/docs/v2/
