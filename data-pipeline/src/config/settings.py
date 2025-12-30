"""
Configuration settings for the HMD births heatmap data pipeline.
"""
from pathlib import Path
import os

# ===============================
# DIRECTORY SETTINGS
# ===============================

# Base directories - can be overridden via environment variables for Docker
# When running in Docker, /app is the working directory
DATA_PIPELINE_ROOT = Path(os.environ.get('DATA_PIPELINE_ROOT', Path(__file__).parent.parent.parent))

# Project root (parent of data-pipeline, for accessing frontend directory)
PROJECT_ROOT = DATA_PIPELINE_ROOT.parent

# Raw data directories (can be overridden via environment variables)
# Default paths work for Docker (data mounted to /app/hmd_data and /app/data)
# For local development, set HMD_DATA_DIR and UN_DATA_DIR env vars to point to project root
# (e.g., in .vscode/launch.json or shell: export HMD_DATA_DIR=/path/to/project/hmd_data)
HMD_DATA_DIR = Path(os.environ.get('HMD_DATA_DIR', DATA_PIPELINE_ROOT / 'hmd_data'))
UN_DATA_DIR = Path(os.environ.get('UN_DATA_DIR', DATA_PIPELINE_ROOT / 'data'))

# Output directory (git-ignored, contains all generated files)
# Can be overridden via OUTPUT_DIR environment variable
OUTPUT_DIR = Path(os.environ.get('OUTPUT_DIR', DATA_PIPELINE_ROOT / 'output'))

# JSON output directories
JSON_OUTPUT_DIR = OUTPUT_DIR
FERTILITY_OUTPUT_DIR = OUTPUT_DIR / 'fertility'
SEASONALITY_OUTPUT_DIR = OUTPUT_DIR / 'seasonality'

# Chart output directory
CHARTS_OUTPUT_DIR = OUTPUT_DIR / 'charts'

# Frontend assets data (for Vite imports with cache-busting)
# This is the PREFERRED location for JSON data - allows proper imports in Astro/Vite
# Can be overridden via FRONTEND_ASSETS_DATA_DIR environment variable for Docker
FRONTEND_ASSETS_DATA_DIR = Path(os.environ.get('FRONTEND_ASSETS_DATA_DIR', PROJECT_ROOT / 'frontend' / 'src' / 'assets' / 'data'))
FRONTEND_ASSETS_FERTILITY_DIR = FRONTEND_ASSETS_DATA_DIR / 'fertility'
FRONTEND_ASSETS_SEASONALITY_DIR = FRONTEND_ASSETS_DATA_DIR / 'seasonality'

# Frontend content charts (for Astro Image component with Vite asset handling)
# Charts are imported using import.meta.glob() for optimization
# Can be overridden via FRONTEND_CONTENT_CHARTS_DIR environment variable for Docker
FRONTEND_CONTENT_CHARTS_DIR = Path(os.environ.get('FRONTEND_CONTENT_CHARTS_DIR', PROJECT_ROOT / 'frontend' / 'src' / 'content' / 'charts'))

# Legacy: Frontend public data (for nginx serving in production)
# Note: For local dev, use FRONTEND_ASSETS_DATA_DIR instead to enable proper imports
FRONTEND_DATA_DIR = PROJECT_ROOT / 'frontend' / 'public' / 'data'

# Legacy CSV output (for compatibility during transition)
CSV_OUTPUT_DIR = DATA_PIPELINE_ROOT / 'src'

# ===============================
# DATA FILTERING SETTINGS
# ===============================

# Minimum number of complete years required for a country to be included in exports
# A "complete year" means all 12 months have data for that year
MIN_YEARS_DATA = 25

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
    CHARTS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_ASSETS_DATA_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_ASSETS_FERTILITY_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_ASSETS_SEASONALITY_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_CONTENT_CHARTS_DIR.mkdir(parents=True, exist_ok=True)
