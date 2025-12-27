"""
Country codes and labels for HMD data.
"""
import unicodedata
import re
from typing import NamedTuple


class Country(NamedTuple):
    """Country code and label."""
    code: str
    name: str


# HMD country codes and labels
# Not all countries have enough data to be interesting;
# several will need births or population filled from other sources.
HMD_COUNTRIES = [
    Country('AUS', 'Australia'),
    Country('AUT', 'Austria'),
    Country('BEL', 'Belgium'),
    Country('BGR', 'Bulgaria'),
    Country('CAN', 'Canada'),
    Country('CHE', 'Switzerland'),
    Country('CHL', 'Chile'),
    Country('CZE', 'Czechia'),
    Country('DEUTE', 'East Germany'),
    Country('DEUTNP', 'Germany'),
    Country('DEUTW', 'West Germany'),
    Country('DNK', 'Denmark'),
    Country('ESP', 'Spain'),
    Country('EST', 'Estonia'),
    Country('FIN', 'Finland'),
    Country('FRATNP', 'France'),
    Country('GBR_NIR', 'Northern Ireland'),
    Country('GBRTENW', 'England and Wales'),
    Country('GBR_NP', 'United Kingdom'),
    Country('GBR_SCO', 'Scotland'),
    Country('GRC', 'Greece'),
    Country('HKG', 'Hong Kong'),
    Country('HRV', 'Croatia'),
    Country('HUN', 'Hungary'),
    Country('IRL', 'Ireland'),
    Country('ISL', 'Iceland'),
    Country('ISR', 'Israel'),
    Country('ITA', 'Italy'),
    Country('JPN', 'Japan'),
    Country('KOR', 'South Korea'),
    Country('LTU', 'Lithuania'),
    Country('LUX', 'Luxembourg'),
    Country('LVA', 'Latvia'),
    Country('NLD', 'Netherlands'),
    Country('NOR', 'Norway'),
    Country('NZL_NP', 'New Zealand'),
    Country('POL', 'Poland'),
    Country('PRT', 'Portugal'),
    Country('RUS', 'Russia'),
    Country('SVK', 'Slovakia'),
    Country('SVN', 'Slovenia'),
    Country('SWE', 'Sweden'),
    Country('UKR', 'Ukraine'),
    Country('USA', 'United States of America'),
]

# Code to name mapping for quick lookup
CODE_TO_NAME = {c.code: c.name for c in HMD_COUNTRIES}
NAME_TO_CODE = {c.name: c.code for c in HMD_COUNTRIES}


def normalize_country_name(country_name: str) -> str:
    """
    Normalize a country name to a standard format for filenames.
    Remove special characters and diacritics.
    Replace spaces with hyphens.
    """
    country_name = unicodedata.normalize('NFC', country_name)
    country_name = re.sub(r'[^a-zA-Z\s]', '', country_name)
    country_name = country_name.replace(' ', '-').lower()
    return country_name


def get_country_slug(country_name: str) -> str:
    """Get a URL-safe slug for a country name."""
    return normalize_country_name(country_name)
