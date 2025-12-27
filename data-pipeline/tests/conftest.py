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
    """Sample births data for testing."""
    return pl.DataFrame({
        'Country': ['France'] * 24 + ['Japan'] * 24,
        'Year': [2020] * 12 + [2021] * 12 + [2020] * 12 + [2021] * 12,
        'Month': list(range(1, 13)) * 4,
        'Births': [
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
        ],
        'Source': ['HMD'] * 48,
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
