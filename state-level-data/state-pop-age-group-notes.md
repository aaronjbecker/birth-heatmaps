# State Population by Age Group Notes
Goal: find data sources with state population by age group and sex so we can compute fertility rates per woman of childbearing age (15-44).

## Census Bureau FTP data access
- FTP server: `ftp2.census.gov`
- HTTP access (easier): `https://www2.census.gov/programs-surveys/popest/`
- Docs on FTP usage: https://www.census.gov/programs-surveys/acs/data/data-via-ftp.html
- Population Estimates Program docs: https://www.census.gov/data/datasets/time-series/demo/popest/2020s-state-detail.html

## Key data sources by time period

### Pre-1970 Historical Data (1910-1969): NHGIS

**The Census Bureau FTP does NOT have state-level age×sex data before 1970.**

For historical data, use **NHGIS (National Historical Geographic Information System)**:
- **Website:** https://www.nhgis.org/
- **Data Finder:** https://data2.nhgis.org/
- **Free registration required**

NHGIS provides digitized aggregate census data from printed census publications:
- State and county population tables since 1790
- Persons by Sex tables since 1820
- Population by Age tables from decennial censuses (1910, 1920, 1930, 1940, 1950, 1960)

**Available Census Years in NHGIS:**
- **1910 Census:** 7 datasets with population data at state/county levels
- **1920 Census:** 8 datasets (data entered by Michael Haines, Colgate University)
- **1930 Census:** 22 datasets with population data
- **1940 Census:** Population and housing data
- **1950 Census:** 6 datasets with population data
- **1960 Census:** 4 datasets with population/housing data

**How to find Age×Sex tables:**

Option 1: Web interface
1. Go to https://data2.nhgis.org/
2. Filter by Topic: "Age" and "Sex"
3. Filter by Year: Select census year (1910, 1920, etc.)
4. Filter by Geographic Level: "State" or "County"
5. Download selected tables

Option 2: Python API (scripts in census-scripts/)
1. Register at https://uma.pop.umn.edu/nhgis/user/new
2. Get API key at https://account.ipums.org/api_keys
3. Set key: `export IPUMS_API_KEY="your_key"` or save to `~/.ipums/api_key`
4. Run: `python nhgis_explore_metadata.py` to see available tables
5. Run: `python nhgis_download_age_sex.py --download` to download data

**Alternative: IPUMS USA Microdata**
- Website: https://usa.ipums.org/
- Full-count census data available for 1900-1930
- Sample data for other years
- Requires aggregating microdata to get state totals by age/sex
- More work than NHGIS aggregate tables, but more flexible

### National-only data (1900-1979)
**File:** `pe-11-YYYY.csv` (e.g., `pe-11-1910.csv`)
**URL:** https://www2.census.gov/programs-surveys/popest/tables/1900-1980/national/asrh/
**Coverage:** 1900-1979 (one file per year)
**Format:** CSV with single year of age
**Breakdown:** Total, Male, Female by race (All races, White, Nonwhite)
**Note:** NATIONAL LEVEL ONLY - not state breakdowns

### 1970-1979: State data (Census Bureau)
**File:** `pe-19.csv`
**URL:** https://www2.census.gov/programs-surveys/popest/tables/1900-1980/state/asrh/pe-19.csv
**Format:** CSV with 5-year age groups
**Columns:** Year, FIPS State Code, State Name, Race/Sex Indicator, then age group columns (Under 5, 5-9, 10-14, 15-19, etc.)
**Breakdown:** By race (White, Black, Other) and sex

### 1980-1990: 5-year age groups
**File:** `s5yr8090.txt`
**URL:** https://www2.census.gov/programs-surveys/popest/tables/1980-1990/state/asrh/s5yr8090.txt
**Format:** Fixed-width text file
**Structure:** Each state has rows for total and 5-year age groups (Under 5, 5-9, ..., 85+)
**Columns:** 4/1/80, 7/1/80 through 7/1/89, 4/1/90
**Note:** Also has individual age files by state like `stiag4XX.txt`

### 1990-1999: Single year of age by race/sex/Hispanic
**Files:** `sasrh90.txt` through `sasrh99.txt`
**URL:** https://www2.census.gov/programs-surveys/popest/tables/1990-2000/state/asrh/
**Format:** Fixed-width text
**Breakdown:** State, Age (single year), by race (White, Black, AIAN, API) × sex × Hispanic origin
**Very detailed** - includes all demographic breakdowns

### 2000-2010: Intercensal state estimates
**File:** `st-est00int-agesex.csv`
**URL:** https://www2.census.gov/programs-surveys/popest/datasets/2000-2010/intercensal/state/st-est00int-agesex.csv
**Format:** CSV
**Columns:** REGION, DIVISION, STATE, NAME, SEX, AGE, ESTIMATESBASE2000, POPESTIMATE2000-2010
**Key features:**
- All states in one file
- Single year of age (0-85+)
- SEX: 0=Total, 1=Male, 2=Female
- STATE: FIPS code (0=US total)

### 2010-2020: Intercensal state estimates
**Combined file:** `sc-est2020int-alldata6.csv`
**URL:** https://www2.census.gov/programs-surveys/popest/datasets/2010-2020/intercensal/state/asrh/sc-est2020int-alldata6.csv
**Format:** CSV (large file)
**Columns:** SUMLEV, REGION, DIVISION, STATE, NAME, SEX, ORIGIN, RACE, AGE, ESTIMATESBASE2010, POPESTIMATE2010-2019, CENSUS2020POP
**Note:** Includes race and origin breakdown - filter to get totals

**Alternative (civilian only, simpler):** `SC-EST2020-AGESEX-CIV.csv`
**URL:** https://www2.census.gov/programs-surveys/popest/datasets/2010-2020/state/asrh/SC-EST2020-AGESEX-CIV.csv
**Columns:** SUMLEV, REGION, DIVISION, STATE, NAME, SEX, AGE, ESTBASE2010_CIV, POPEST2010_CIV-POPEST2020_CIV

### 2020-2024: Current state estimates
**File:** `sc-est2024-agesex-civ.csv`
**URL:** https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/state/asrh/sc-est2024-agesex-civ.csv
**Format:** CSV
**Columns:** SUMLEV, REGION, DIVISION, STATE, NAME, SEX, AGE, ESTBASE2020_CIV, POPEST2020_CIV-POPEST2024_CIV
**Note:** Civilian population only

## FIPS State Codes
- 01=Alabama, 02=Alaska, 04=Arizona, 05=Arkansas, 06=California...
- STATE=0 typically means US total
- SUMLEV=010 is national, SUMLEV=040 is state

## SEX codes (modern files)
- 0 = Total (both sexes)
- 1 = Male
- 2 = Female

## AGE codes
- Modern files: 0-85 (single year), with 85 being "85 years and over"
- Some files have 999 for total all ages

## Recommended data sources for fertility rate computation

For computing fertility rates per woman aged 15-44, the best sources are:

### Modern Era (1970-2024) - Census Bureau FTP
1. **1970-1979:** `pe-19.csv` - 5-year age groups by state, race, sex
2. **1980-1990:** `s5yr8090.txt` - 5-year age groups by state
3. **1990-1999:** `sasrh90.txt` through `sasrh99.txt` - single year of age
4. **2000-2010:** `st-est00int-agesex.csv` - clean CSV, all states, filter SEX=2 (female), AGE 15-44
5. **2010-2020:** `SC-EST2020-AGESEX-CIV.csv` - same format, civilian population
6. **2020-2024:** `sc-est2024-agesex-civ.csv` - same format, most recent

### Historical Era (1920-1969) - NHGIS
For pre-1970 data, use NHGIS (https://data2.nhgis.org/):
- Only decennial census years have detailed age×sex data
- No annual intercensal estimates before 1970 at state level
- Must download and process separately from Census Bureau data
- Free registration required at https://uma.pop.umn.edu/nhgis/registration/new

**NHGIS Downloaded Data (in census-scripts/nhgis_data/):**

| Year | Dataset | Table | Female Age Range | States |
|------|---------|-------|------------------|--------|
| 1920 | 1920_cPHAM | NT18 | 18-44 only* | 51 |
| 1930 | 1930_cAge30 | NT2B | 15-44 (35-44 combined) | 51 |
| 1940 | 1940_cAge | NT2B | 15-44 (5-year groups) | 49 |
| 1950 | 1950_cAge | NT8 | 15-44 (5-year groups) | 51 |
| 1960 | 1960_cAge1 | NT5 | 15-44 (5-year groups) | 51 |

*1920 only has 18-44, not 15-44 (missing ages 15-17)

**1910 Limitation:** The 1910 census (dataset 1910_cPHA) does NOT have age×sex tables at state level. Only total sex counts and limited age ranges (voting age, school age 6-20) are available.

**Output file:** `census-scripts/nhgis_data/female_15_44_by_state_historical.csv`

### Data Coverage Summary
| Period | Source | File | Age Detail | Notes |
|--------|--------|------|------------|-------|
| 1920-1960 | NHGIS | nhgis_data/*.csv | 5-year groups | Decennial only; 1920 is 18-44 |
| 1970-1979 | Census FTP | pe-19.csv | 5-year groups | Annual |
| 1981-1989 | Census FTP | st_int_asrh.txt | 5-year groups | Annual; no 1980 |
| 1990-1999 | Census FTP | sasrh90-99.txt | Single year | Annual |
| 2000-2010 | Census FTP | st-est00int-agesex.csv | Single year | Annual |
| 2010-2020 | Census FTP | SC-EST2020-AGESEX-CIV.csv | Single year | Annual, civilian |
| 2020-2024 | Census FTP | sc-est2024-agesex-civ.csv | Single year | Annual, civilian |

**Gaps in consolidated data:**
- 1921-1929, 1931-1939, 1941-1949, 1951-1959, 1961-1969 (pre-1970: decennial only)
- 1980 (st_int_asrh.txt starts at 1981)

## Related notebooks in aaronjbecker.com-blog
- `notebooks/state-population-by-age-group-over-time/state-population-by-age-group-over-time.ipynb` - Uses Census FTP data
- `notebooks/comparing-child-share-population-1990-vs-2024-by-state/` - Uses KIDS COUNT data (derived from Census)
- `notebooks/immigration-and-unemployment/download_census_ftp.py` - FTP download utility

## Sample exploration scripts
See `census-scripts/` directory:

**Census Bureau FTP scripts:**
- `explore_census_ftp.py` - Main FTP exploration script
- `list_census_ftp_files.py` - Lists available files in each time period
- `download_sample_files.py` - Downloads sample files for inspection
- `check_2010_2020_data.py` - Explores 2010-2020 data structure
- `explore_historical_data.py` - Explores pre-1970 historical data
- `explore_decennial_census.py` - Explores decennial census directories
- `explore_timeseries.py` - Explores time-series data
- `explore_pre1980_state.py` - Searches for pre-1980 state data

**NHGIS scripts (require API key):**
- `nhgis_explore_metadata.py` - Browse NHGIS tables and datasets (uses ipumspy library)
- `nhgis_api_explore.py` - Direct API exploration using raw requests
- `nhgis_download_historical.py` - Submit and download NHGIS extracts for 1920-1960
- `nhgis_parse_female_15_44.py` - Parse downloaded data to extract female 15-44 by state

**Data consolidation:**
- `download_census_ftp.py` - Idempotent downloader for all Census Bureau files
- `consolidate_female_15_44.py` - Combines all sources into single master DataFrame

**Output:**
- `census-scripts/data/female_15_44_consolidated.csv` - **Master file** with female 15-44 population by state/year (1920-2024)

Sample data files are in `census-scripts/sample_data/`
Downloaded Census data is in `census-scripts/data/`
Downloaded NHGIS data is in `census-scripts/nhgis_data/`

