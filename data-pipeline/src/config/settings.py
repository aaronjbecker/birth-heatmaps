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

# Output directory (git-ignored, contains all generated files)
# Can be overridden via OUTPUT_DIR environment variable
OUTPUT_DIR = Path(os.environ.get('OUTPUT_DIR', DATA_PIPELINE_ROOT / 'output'))

# JSON output directories
JSON_OUTPUT_DIR = OUTPUT_DIR
FERTILITY_OUTPUT_DIR = OUTPUT_DIR / 'fertility'
SEASONALITY_OUTPUT_DIR = OUTPUT_DIR / 'seasonality'
CONCEPTION_OUTPUT_DIR = OUTPUT_DIR / 'conception'

# Chart output directory
CHARTS_OUTPUT_DIR = OUTPUT_DIR / 'charts'

# Frontend assets data (for Vite imports with cache-busting)
# This is the PREFERRED location for JSON data - allows proper imports in Astro/Vite
# Can be overridden via FRONTEND_ASSETS_DATA_DIR environment variable for Docker
FRONTEND_ASSETS_DATA_DIR = Path(os.environ.get('FRONTEND_ASSETS_DATA_DIR', PROJECT_ROOT / 'frontend' / 'src' / 'assets' / 'data'))
FRONTEND_ASSETS_FERTILITY_DIR = FRONTEND_ASSETS_DATA_DIR / 'fertility'
FRONTEND_ASSETS_SEASONALITY_DIR = FRONTEND_ASSETS_DATA_DIR / 'seasonality'
FRONTEND_ASSETS_CONCEPTION_DIR = FRONTEND_ASSETS_DATA_DIR / 'conception'

# Frontend assets charts (for Astro Image component with Vite asset handling)
# Charts are imported using import.meta.glob() for optimization
# Can be overridden via FRONTEND_CONTENT_CHARTS_DIR environment variable for Docker
FRONTEND_CONTENT_CHARTS_DIR = Path(os.environ.get('FRONTEND_CONTENT_CHARTS_DIR', PROJECT_ROOT / 'frontend' / 'src' / 'assets' / 'charts'))

# Frontend public data (for client-side fetch() in Compare page and similar dynamic features)
# Data is served directly by the web server without Vite processing
# Can be overridden via FRONTEND_PUBLIC_DATA_DIR environment variable for Docker
FRONTEND_PUBLIC_DATA_DIR = Path(os.environ.get('FRONTEND_PUBLIC_DATA_DIR', PROJECT_ROOT / 'frontend' / 'public' / 'data'))
FRONTEND_PUBLIC_FERTILITY_DIR = FRONTEND_PUBLIC_DATA_DIR / 'fertility'
FRONTEND_PUBLIC_SEASONALITY_DIR = FRONTEND_PUBLIC_DATA_DIR / 'seasonality'
FRONTEND_PUBLIC_CONCEPTION_DIR = FRONTEND_PUBLIC_DATA_DIR / 'conception'

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
    'HMD': 'Human Mortality Database (https://www.mortality.org/)',
    'UN': 'United Nations (https://population.un.org/wpp/)',
    'JPOP': 'Minato Nakazawa (fmsb R package)',
}

DATA_SOURCE_URLS = {
    'HMD': 'https://www.mortality.org/',
    'UN': 'https://population.un.org/wpp/',
    'JPOP': None,
}


def ensure_output_dirs() -> None:
    """Create output directories if they don't exist."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    FERTILITY_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    SEASONALITY_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    CONCEPTION_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    CHARTS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_ASSETS_DATA_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_ASSETS_FERTILITY_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_ASSETS_SEASONALITY_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_ASSETS_CONCEPTION_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_CONTENT_CHARTS_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_PUBLIC_FERTILITY_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_PUBLIC_SEASONALITY_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_PUBLIC_CONCEPTION_DIR.mkdir(parents=True, exist_ok=True)
