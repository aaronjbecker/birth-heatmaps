"""
Configuration constants and helper functions for fertility heatmap plotting.
"""
import unicodedata
import re


# Month names for labels in charts
MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

# Data sources for labels in charts
DATA_SOURCE_LABELS = {
    'HMD': 'Human Mortality Database (https://www.mortality.org/)',
    'UN': 'United Nations (https://population.un.org/wpp/)',
    'JPOP': 'Minato Nakazawa (fmsb R package)',
}


def normalize_country_name(country_name: str) -> str:
    """
    Normalize a country name to a standard format. Remove special characters and diacritics.
    Remove any non-letter characters and replace spaces with hyphens.
    """
    country_name = unicodedata.normalize('NFC', country_name)
    country_name = re.sub(r'[^a-zA-Z\s]', '', country_name)
    country_name = country_name.replace(' ', '-')
    return country_name

