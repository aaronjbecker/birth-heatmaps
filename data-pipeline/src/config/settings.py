"""
Configuration settings for the HMD births heatmap data pipeline.
"""
from pathlib import Path

# ===============================
# DIRECTORY SETTINGS
# ===============================

# Base directories (relative to project root when running in Docker)
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
DATA_PIPELINE_ROOT = Path(__file__).parent.parent.parent

# Raw data directories
HMD_DATA_DIR = PROJECT_ROOT / 'hmd_data'
UN_DATA_DIR = PROJECT_ROOT / 'data'

# Output directories
OUTPUT_DIR = PROJECT_ROOT / 'frontend' / 'public' / 'data'
FERTILITY_OUTPUT_DIR = OUTPUT_DIR / 'fertility'
SEASONALITY_OUTPUT_DIR = OUTPUT_DIR / 'seasonality'

# Legacy CSV output (for compatibility during transition)
CSV_OUTPUT_DIR = DATA_PIPELINE_ROOT / 'src'

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
