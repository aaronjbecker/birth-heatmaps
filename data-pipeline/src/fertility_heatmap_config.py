"""
Configuration constants and helper functions for fertility heatmap plotting.
"""
import unicodedata
import re

# Import from main config to avoid duplication
from config import MONTH_NAMES, DATA_SOURCE_LABELS


def normalize_country_name(country_name: str) -> str:
    """
    Normalize a country name to a standard format. Remove special characters and diacritics.
    Remove any non-letter characters and replace spaces with hyphens.
    """
    country_name = unicodedata.normalize('NFC', country_name)
    country_name = re.sub(r'[^a-zA-Z\s]', '', country_name)
    country_name = country_name.replace(' ', '-')
    return country_name

