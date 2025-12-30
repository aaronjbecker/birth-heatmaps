"""
Pytest configuration and fixtures for the data pipeline tests.
"""
import sys
from pathlib import Path
import pytest
import polars as pl

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


@pytest.fixture
def sample_births_data() -> pl.DataFrame:
    """Sample births data for testing.

    Includes daily_fertility_rate column since compute_complete_years
    filters on this to ensure months have valid fertility data.
    """
    births = [
        # France 2020
        62000, 58000, 60000, 55000, 58000, 60000,
        62000, 63000, 61000, 60000, 58000, 60000,
        # France 2021
        61000, 57000, 59000, 54000, 57000, 59000,
        61000, 62000, 60000, 59000, 57000, 59000,
        # Japan 2020
        73000, 68000, 72000, 65000, 70000, 72000,
        75000, 76000, 74000, 73000, 70000, 72000,
        # Japan 2021
        72000, 67000, 71000, 64000, 69000, 71000,
        74000, 75000, 73000, 72000, 69000, 71000,
    ]
    # Generate realistic daily fertility rates (births per day per 100k women)
    daily_fertility_rates = [b / 30 / 85000 * 100000 for b in births]

    return pl.DataFrame({
        'Country': ['France'] * 24 + ['Japan'] * 24,
        'Year': [2020] * 12 + [2021] * 12 + [2020] * 12 + [2021] * 12,
        'Month': list(range(1, 13)) * 4,
        'Births': births,
        'Source': ['HMD'] * 48,
        'daily_fertility_rate': daily_fertility_rates,
    })


@pytest.fixture
def sample_population_data() -> pl.DataFrame:
    """Sample population data for testing."""
    return pl.DataFrame({
        'Country': ['France'] * 4 + ['Japan'] * 4,
        'Year': [2020, 2020, 2021, 2021, 2020, 2020, 2021, 2021],
        'Month': [1, 7, 1, 7, 1, 7, 1, 7],
        'childbearing_population': [
            # France
            8_500_000.0, 8_480_000.0, 8_450_000.0, 8_430_000.0,
            # Japan
            12_000_000.0, 11_950_000.0, 11_900_000.0, 11_850_000.0,
        ],
        'Source': ['HMD'] * 8,
    })


@pytest.fixture
def sample_heatmap_cell_data() -> dict:
    """Sample heatmap cell data matching JSON schema."""
    return {
        'year': 2020,
        'month': 1,
        'value': 7.85,
        'births': 62000,
        'population': 8500000,
        'source': 'HMD',
    }


@pytest.fixture
def sample_country_meta() -> dict:
    """Sample country metadata matching JSON schema."""
    return {
        'code': 'france',
        'name': 'France',
        'sources': ['HMD'],
        'fertility': {'yearRange': [1946, 2023], 'hasData': True},
        'seasonality': {'yearRange': [1946, 2023], 'hasData': True},
    }


@pytest.fixture
def sample_births_partial_years() -> pl.DataFrame:
    """Sample births data with varying completeness for testing min_years filtering.

    - CountryA: 3 complete years (2019, 2020, 2021) - all 12 months each with valid fertility rates
    - CountryB: 1 complete year (2020) + 1 partial year (2021 with only 6 months)

    Includes daily_fertility_rate column since compute_complete_years
    filters on this to ensure months have valid fertility data.
    """
    country_a_data = []
    for year in [2019, 2020, 2021]:
        for month in range(1, 13):
            country_a_data.append({
                'Country': 'CountryA',
                'Year': year,
                'Month': month,
                'Births': 10000,
                'Source': 'HMD',
                'daily_fertility_rate': 7.5,  # Valid fertility rate
            })

    country_b_data = []
    # 2020 complete
    for month in range(1, 13):
        country_b_data.append({
            'Country': 'CountryB',
            'Year': 2020,
            'Month': month,
            'Births': 5000,
            'Source': 'HMD',
            'daily_fertility_rate': 6.0,  # Valid fertility rate
        })
    # 2021 partial (only 6 months)
    for month in range(1, 7):
        country_b_data.append({
            'Country': 'CountryB',
            'Year': 2021,
            'Month': month,
            'Births': 5000,
            'Source': 'HMD',
            'daily_fertility_rate': 6.0,  # Valid fertility rate
        })

    return pl.DataFrame(country_a_data + country_b_data)
