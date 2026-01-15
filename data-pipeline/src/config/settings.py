"""
Configuration settings for the HMD births heatmap data pipeline.
"""
from pathlib import Path
import os
import re
from typing import Optional

# ===============================
# DIRECTORY SETTINGS
# ===============================

# Base directories - can be overridden via environment variables for Docker
# When running in Docker, /app is the working directory
DATA_PIPELINE_ROOT = Path(os.environ.get('DATA_PIPELINE_ROOT', Path(__file__).parent.parent.parent))

# Project root (parent of data-pipeline, for accessing frontend directory)
PROJECT_ROOT = DATA_PIPELINE_ROOT.parent


def find_latest_hmd_bulk_dir(data_dir: Path) -> Optional[Path]:
    """
    Find the latest HMD bulk download directory.

    Looks for directories named 'hmd_countries_YYYYMMDD' and returns
    the one with the most recent date.

    Returns None if no matching directory is found.
    """
    pattern = re.compile(r'^hmd_countries_(\d{8})$')
    matching_dirs = []

    if not data_dir.exists():
        return None

    for item in data_dir.iterdir():
        if item.is_dir():
            match = pattern.match(item.name)
            if match:
                date_str = match.group(1)
                matching_dirs.append((date_str, item))

    if not matching_dirs:
        return None

    # Sort by date string (YYYYMMDD sorts correctly as string)
    matching_dirs.sort(key=lambda x: x[0], reverse=True)
    return matching_dirs[0][1]


def _get_hmd_data_dir() -> Path:
    """
    Determine the HMD data directory.

    Priority:
    1. HMD_DATA_DIR environment variable (if set)
    2. Latest bulk download in PROJECT_ROOT/data (hmd_countries_YYYYMMDD)
    3. Legacy: PROJECT_ROOT/hmd_data (flat file structure)
    """
    # Check environment variable first
    env_dir = os.environ.get('HMD_DATA_DIR')
    if env_dir:
        return Path(env_dir)

    # Look for bulk download in PROJECT_ROOT/data
    data_dir = PROJECT_ROOT / 'data'
    bulk_dir = find_latest_hmd_bulk_dir(data_dir)
    if bulk_dir:
        return bulk_dir

    # Fall back to legacy location
    return PROJECT_ROOT / 'hmd_data'


# Raw data directories
# HMD data: prefers bulk download structure, falls back to legacy flat files
HMD_DATA_DIR = _get_hmd_data_dir()
UN_DATA_DIR = Path(os.environ.get('UN_DATA_DIR', PROJECT_ROOT / 'data'))
STATES_DATA_DIR = Path(os.environ.get('STATES_DATA_DIR', PROJECT_ROOT / 'state-level-data'))

# Output directory (git-ignored, contains all generated files)
# Can be overridden via OUTPUT_DIR environment variable
OUTPUT_DIR = Path(os.environ.get('OUTPUT_DIR', DATA_PIPELINE_ROOT / 'output'))

# JSON output directories
JSON_OUTPUT_DIR = OUTPUT_DIR
FERTILITY_OUTPUT_DIR = OUTPUT_DIR / 'fertility'
SEASONALITY_OUTPUT_DIR = OUTPUT_DIR / 'seasonality'
CONCEPTION_OUTPUT_DIR = OUTPUT_DIR / 'conception'
MONTHLY_FERTILITY_OUTPUT_DIR = OUTPUT_DIR / 'monthly-fertility'

# State-specific output directories (nested under existing dirs)
STATES_FERTILITY_OUTPUT_DIR = FERTILITY_OUTPUT_DIR / 'states'
STATES_SEASONALITY_OUTPUT_DIR = SEASONALITY_OUTPUT_DIR / 'states'
STATES_CONCEPTION_OUTPUT_DIR = CONCEPTION_OUTPUT_DIR / 'states'
STATES_MONTHLY_FERTILITY_OUTPUT_DIR = MONTHLY_FERTILITY_OUTPUT_DIR / 'states'

# Chart output directory
CHARTS_OUTPUT_DIR = OUTPUT_DIR / 'charts'

# State chart output directories (nested under charts/)
STATES_CHARTS_OUTPUT_DIR = CHARTS_OUTPUT_DIR / 'states'

# Frontend assets data (for Vite imports with cache-busting)
# This is the PREFERRED location for JSON data - allows proper imports in Astro/Vite
# Can be overridden via FRONTEND_ASSETS_DATA_DIR environment variable for Docker
FRONTEND_ASSETS_DATA_DIR = Path(os.environ.get('FRONTEND_ASSETS_DATA_DIR', PROJECT_ROOT / 'frontend' / 'src' / 'assets' / 'data'))
FRONTEND_ASSETS_FERTILITY_DIR = FRONTEND_ASSETS_DATA_DIR / 'fertility'
FRONTEND_ASSETS_SEASONALITY_DIR = FRONTEND_ASSETS_DATA_DIR / 'seasonality'
FRONTEND_ASSETS_CONCEPTION_DIR = FRONTEND_ASSETS_DATA_DIR / 'conception'
FRONTEND_ASSETS_MONTHLY_FERTILITY_DIR = FRONTEND_ASSETS_DATA_DIR / 'monthly-fertility'

# Frontend assets for states (nested under existing dirs)
FRONTEND_ASSETS_STATES_FERTILITY_DIR = FRONTEND_ASSETS_FERTILITY_DIR / 'states'
FRONTEND_ASSETS_STATES_SEASONALITY_DIR = FRONTEND_ASSETS_SEASONALITY_DIR / 'states'
FRONTEND_ASSETS_STATES_CONCEPTION_DIR = FRONTEND_ASSETS_CONCEPTION_DIR / 'states'
FRONTEND_ASSETS_STATES_MONTHLY_FERTILITY_DIR = FRONTEND_ASSETS_MONTHLY_FERTILITY_DIR / 'states'

# Frontend assets charts (for Astro Image component with Vite asset handling)
# Charts are imported using import.meta.glob() for optimization
# Can be overridden via FRONTEND_CONTENT_CHARTS_DIR environment variable for Docker
FRONTEND_CONTENT_CHARTS_DIR = Path(os.environ.get('FRONTEND_CONTENT_CHARTS_DIR', PROJECT_ROOT / 'frontend' / 'src' / 'assets' / 'charts'))

# Frontend charts for states (nested under existing dir)
FRONTEND_CONTENT_STATES_CHARTS_DIR = FRONTEND_CONTENT_CHARTS_DIR / 'states'

# Frontend public data (for client-side fetch() in Compare page and similar dynamic features)
# Data is served directly by the web server without Vite processing
# Can be overridden via FRONTEND_PUBLIC_DATA_DIR environment variable for Docker
FRONTEND_PUBLIC_DATA_DIR = Path(os.environ.get('FRONTEND_PUBLIC_DATA_DIR', PROJECT_ROOT / 'frontend' / 'public' / 'data'))
FRONTEND_PUBLIC_FERTILITY_DIR = FRONTEND_PUBLIC_DATA_DIR / 'fertility'
FRONTEND_PUBLIC_SEASONALITY_DIR = FRONTEND_PUBLIC_DATA_DIR / 'seasonality'
FRONTEND_PUBLIC_CONCEPTION_DIR = FRONTEND_PUBLIC_DATA_DIR / 'conception'
FRONTEND_PUBLIC_MONTHLY_FERTILITY_DIR = FRONTEND_PUBLIC_DATA_DIR / 'monthly-fertility'

# Frontend public for states (nested under existing dirs)
FRONTEND_PUBLIC_STATES_FERTILITY_DIR = FRONTEND_PUBLIC_FERTILITY_DIR / 'states'
FRONTEND_PUBLIC_STATES_SEASONALITY_DIR = FRONTEND_PUBLIC_SEASONALITY_DIR / 'states'
FRONTEND_PUBLIC_STATES_CONCEPTION_DIR = FRONTEND_PUBLIC_CONCEPTION_DIR / 'states'
FRONTEND_PUBLIC_STATES_MONTHLY_FERTILITY_DIR = FRONTEND_PUBLIC_MONTHLY_FERTILITY_DIR / 'states'

# Legacy CSV output (for compatibility during transition)
CSV_OUTPUT_DIR = DATA_PIPELINE_ROOT / 'src'

# ===============================
# DATA FILTERING SETTINGS
# ===============================

# Minimum number of complete years required for a country to be included in exports
# A "complete year" means all 12 months have data for that year
MIN_YEARS_DATA = 25

# This is used to exclude noisy countries, 
# which have at least one month with this many or fewer births in non-provisional data.
MIN_MONTHLY_BIRTHS = 200

# ===============================
# MONTH NAMES
# ===============================

MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December']

MONTH_NAME_TO_NUMBER = {name: i + 1 for i, name in enumerate(MONTH_NAMES_FULL)}

# ===============================
# DATA SOURCE LABELS
# ===============================

DATA_SOURCE_LABELS = {
    # Country data sources
    'HMD': 'Human Mortality Database (https://www.mortality.org/)',
    'UN': 'United Nations (https://population.un.org/wpp/)',
    'JPOP': 'Minato Nakazawa (fmsb R package)',
    # State birth data sources
    'CDC': 'CDC WONDER Natality Database',
    'Martinez-Bakker': 'Martinez-Bakker et al. (2018) via Dryad',
    # State population data sources
    'Census': 'U.S. Census Bureau Population Estimates',
    'NHGIS': 'IPUMS NHGIS',
    'interpolated': 'Interpolated from census data',
}

DATA_SOURCE_URLS = {
    'HMD': 'https://www.mortality.org/',
    'UN': 'https://population.un.org/wpp/',
    'JPOP': None,
}

# State data source URLs (for US state-level data)
STATES_DATA_SOURCE_URLS = {
    # Birth data sources
    'CDC': 'https://wonder.cdc.gov/natality-current.html',
    'Martinez-Bakker': 'https://doi.org/10.5061/dryad.3p008p4',
    # Population data sources (Census Bureau variants)
    'census_1980s': 'https://www.census.gov/programs-surveys/popest.html',
    'census_2000s': 'https://www.census.gov/programs-surveys/popest.html',
    'census_2010s': 'https://www.census.gov/programs-surveys/popest.html',
    'census_2020s': 'https://www.census.gov/programs-surveys/popest.html',
    'census_pe19': 'https://www.census.gov/programs-surveys/popest.html',
    'census_sasrh': 'https://www.census.gov/programs-surveys/popest.html',
    'nhgis': 'https://www.nhgis.org/',
    'interpolated': None,
}

# Full citations for state data sources
STATES_DATA_SOURCE_CITATIONS = {
    'CDC': (
        'Centers for Disease Control and Prevention, National Center for Health Statistics. '
        'National Vital Statistics System, Natality on CDC WONDER Online Database. '
        'http://wonder.cdc.gov/natality-current.html'
    ),
    'Martinez-Bakker': (
        'Martinez-Bakker M, Bakker KM, King AA, Rohani P (2018) Data from: Human birth seasonality: '
        'latitudinal gradient and interplay with childhood disease dynamics. Dryad Digital Repository. '
        'https://doi.org/10.5061/dryad.3p008p4'
    ),
    'census_1980s': 'U.S. Census Bureau, 1980 Population Estimates.',
    'census_2000s': 'U.S. Census Bureau, 2000 Population Estimates.',
    'census_2010s': 'U.S. Census Bureau, 2010 Population Estimates.',
    'census_2020s': 'U.S. Census Bureau, 2020 Population Estimates.',
    'census_pe19': 'U.S. Census Bureau, Population Estimates Program (2019).',
    'census_sasrh': 'U.S. Census Bureau, Surveillance, Epidemiology, and End Results (SEER) Program.',
    'nhgis': (
        'Steven Manson, Jonathan Schroeder, David Van Riper, Katherine Knowles, Tracy Kugler, '
        'Finn Roberts, and Steven Ruggles. IPUMS National Historical Geographic Information System: '
        'Version 18.0. Minneapolis, MN: IPUMS. 2023. http://doi.org/10.18128/D050.V18.0'
    ),
    'interpolated': 'Linear interpolation between census data points.',
}


def ensure_output_dirs() -> None:
    """Create output directories if they don't exist."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    FERTILITY_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    SEASONALITY_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    CONCEPTION_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    MONTHLY_FERTILITY_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    CHARTS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_ASSETS_DATA_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_ASSETS_FERTILITY_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_ASSETS_SEASONALITY_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_ASSETS_CONCEPTION_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_ASSETS_MONTHLY_FERTILITY_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_CONTENT_CHARTS_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_PUBLIC_FERTILITY_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_PUBLIC_SEASONALITY_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_PUBLIC_CONCEPTION_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_PUBLIC_MONTHLY_FERTILITY_DIR.mkdir(parents=True, exist_ok=True)
    # State output directories
    STATES_FERTILITY_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    STATES_SEASONALITY_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    STATES_CONCEPTION_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_ASSETS_STATES_FERTILITY_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_ASSETS_STATES_SEASONALITY_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_ASSETS_STATES_CONCEPTION_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_PUBLIC_STATES_FERTILITY_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_PUBLIC_STATES_SEASONALITY_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_PUBLIC_STATES_CONCEPTION_DIR.mkdir(parents=True, exist_ok=True)
    STATES_MONTHLY_FERTILITY_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_ASSETS_STATES_MONTHLY_FERTILITY_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_PUBLIC_STATES_MONTHLY_FERTILITY_DIR.mkdir(parents=True, exist_ok=True)
    # State chart directories
    STATES_CHARTS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_CONTENT_STATES_CHARTS_DIR.mkdir(parents=True, exist_ok=True)
