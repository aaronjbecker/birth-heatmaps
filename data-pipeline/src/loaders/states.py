"""
US state-level birth and population data loaders.

Data sources:
- CDC WONDER: Monthly births by state (2003-2024)
- Historical: US births by state (1915-2008)
- Census Bureau/NHGIS: Female population 15-44 by state (1920-2024)

Note: This loader produces a separate dataset from country-level data.
The 'Country' column contains US state names for format consistency,
but states should not be intermingled with countries in downstream processing.
"""
import polars as pl
import numpy as np
from pathlib import Path
from typing import Optional

from config import STATES_DATA_DIR


# FIPS code to state name mapping (for population data)
FIPS_TO_STATE = {
    1: "Alabama", 2: "Alaska", 4: "Arizona", 5: "Arkansas", 6: "California",
    8: "Colorado", 9: "Connecticut", 10: "Delaware", 11: "District of Columbia",
    12: "Florida", 13: "Georgia", 15: "Hawaii", 16: "Idaho", 17: "Illinois",
    18: "Indiana", 19: "Iowa", 20: "Kansas", 21: "Kentucky", 22: "Louisiana",
    23: "Maine", 24: "Maryland", 25: "Massachusetts", 26: "Michigan",
    27: "Minnesota", 28: "Mississippi", 29: "Missouri", 30: "Montana",
    31: "Nebraska", 32: "Nevada", 33: "New Hampshire", 34: "New Jersey",
    35: "New Mexico", 36: "New York", 37: "North Carolina", 38: "North Dakota",
    39: "Ohio", 40: "Oklahoma", 41: "Oregon", 42: "Pennsylvania",
    44: "Rhode Island", 45: "South Carolina", 46: "South Dakota",
    47: "Tennessee", 48: "Texas", 49: "Utah", 50: "Vermont", 51: "Virginia",
    53: "Washington", 54: "West Virginia", 55: "Wisconsin", 56: "Wyoming",
}


def _load_cdc_wonder_file(file_path: Path) -> pl.DataFrame:
    """
    Load a CDC WONDER format file.

    Expected columns: Notes, State, State Code, Year, Year Code, Month, Month Code, Births

    Filters out:
    - "Total" rows (aggregates by year/state)
    - Rows with empty Births values
    """
    df = pl.read_csv(file_path, infer_schema_length=10000)

    # Filter out Total rows (Notes column contains "Total")
    df = df.filter(
        pl.col('Notes').is_null() | ~pl.col('Notes').str.contains('Total')
    )

    # Filter rows where Month Code is not null (excludes aggregate rows)
    df = df.filter(pl.col('Month Code').is_not_null())

    # Select and rename columns
    df = df.select(
        pl.col('State').alias('Country'),
        pl.col('Year').cast(pl.Int64),
        pl.col('Month Code').cast(pl.Int64).alias('Month'),
        pl.col('Births').cast(pl.Float64),
    )

    return df


def _load_historical_file(file_path: Path) -> pl.DataFrame:
    """
    Load the historical US births file (1915-2008).

    This file has:
    - CR-only line endings (not standard LF/CRLF)
    - "na" string for missing birth values
    - No District of Columbia data
    - Columns: year, month, num, mo, state, kid, stateid, births, ...

    Filters out rows with "na" births.
    """
    # Read with CR line endings
    df = pl.read_csv(
        file_path,
        infer_schema_length=100000,
        eol_char='\r',
    )

    # Filter out rows with "na" births
    df = df.filter(pl.col('births') != 'na')

    # Select and rename columns
    df = df.select(
        pl.col('state').alias('Country'),
        pl.col('year').cast(pl.Int64).alias('Year'),
        pl.col('mo').cast(pl.Int64).alias('Month'),
        pl.col('births').cast(pl.Float64).alias('Births'),
    )

    return df


def load_births(data_dir: Optional[Path] = None) -> pl.DataFrame:
    """
    Load and consolidate US state-level birth data from multiple sources.

    Combines three data files:
    - CDC WONDER 2003-2006
    - CDC WONDER 2007-2024
    - Historical 1915-2008

    For overlapping years (2003-2008), CDC WONDER data is preferred.

    Args:
        data_dir: Directory containing the data files. Defaults to STATES_DATA_DIR.

    Returns:
        DataFrame with columns: Country (state name), Year, Month, Births
        Sorted by Country, Year, Month.
    """
    if data_dir is None:
        data_dir = STATES_DATA_DIR

    # Load CDC WONDER files (preferred source for 2003-2024)
    cdc_2003_2006 = _load_cdc_wonder_file(
        data_dir / 'monthly-births-by-state-2003-2006.csv'
    )
    cdc_2007_2024 = _load_cdc_wonder_file(
        data_dir / 'monthly-births-by-state-2007-2024.csv'
    )
    cdc_all = pl.concat([cdc_2003_2006, cdc_2007_2024])

    # Load historical file
    historical = _load_historical_file(data_dir / 'US_BIRTH_1915_2008.csv')

    # Use anti-join to get historical rows NOT in CDC data
    # This gives us pre-2003 data from the historical file
    historical_only = historical.join(
        cdc_all.select('Country', 'Year', 'Month'),
        on=['Country', 'Year', 'Month'],
        how='anti',
    )

    # Combine: CDC data (preferred) + historical-only data
    combined = pl.concat([cdc_all, historical_only])

    # Sort for consistency
    combined = combined.sort(['Country', 'Year', 'Month'])

    return combined


def load_population(data_dir: Optional[Path] = None) -> pl.DataFrame:
    """
    Load consolidated female 15-44 population data by state.

    This loads the pre-consolidated CSV containing population data from:
    - NHGIS (1920-1960, decennial census only)
    - Census Bureau (1970-2024, annual estimates)

    Args:
        data_dir: Directory containing census-scripts/data/. Defaults to STATES_DATA_DIR.

    Returns:
        DataFrame with columns: Country (state name), Year, female_15_44, Source
        Sorted by Country, Year.
    """
    if data_dir is None:
        data_dir = STATES_DATA_DIR

    pop_file = data_dir / 'census-scripts' / 'data' / 'female_15_44_consolidated.csv'

    if not pop_file.exists():
        raise FileNotFoundError(
            f"Population data not found at {pop_file}. "
            f"Run census-scripts/download_census_ftp.py and consolidate_female_15_44.py first."
        )

    df = pl.read_csv(pop_file)

    # Select and rename columns to match pipeline conventions
    df = df.select(
        pl.col('state_name').alias('Country'),
        pl.col('year').cast(pl.Int64).alias('Year'),
        pl.col('female_15_44').cast(pl.Float64).alias('childbearing_population'),
        pl.col('source').alias('Source'),
        pl.col('note').alias('Note'),
    )

    return df.sort(['Country', 'Year'])


def interpolate_population(population: pl.DataFrame) -> pl.DataFrame:
    """
    Interpolate population data to fill gaps between census years.

    For pre-1970 data (decennial only), uses linear interpolation between
    census years. For 1970+ data (annual), fills any minor gaps.

    Args:
        population: DataFrame with Country, Year, childbearing_population, Source

    Returns:
        DataFrame with interpolated annual population estimates.
        Adds 'interpolated' column (True if value was interpolated).
    """
    # Get year range per state
    year_ranges = population.group_by('Country').agg([
        pl.col('Year').min().alias('min_year'),
        pl.col('Year').max().alias('max_year'),
    ])

    # Create complete year index for each state
    all_years = []
    for row in year_ranges.iter_rows(named=True):
        state = row['Country']
        for year in range(row['min_year'], row['max_year'] + 1):
            all_years.append({'Country': state, 'Year': year})

    year_index = pl.DataFrame(all_years)

    # Join with actual data
    interpolated = year_index.join(
        population.select('Country', 'Year', 'childbearing_population', 'Source'),
        on=['Country', 'Year'],
        how='left'
    )

    # Mark which rows are interpolated
    interpolated = interpolated.with_columns(
        pl.col('childbearing_population').is_null().alias('interpolated')
    )

    # Sort and interpolate within each state
    interpolated = (
        interpolated
        .sort(['Country', 'Year'])
        .with_columns([
            pl.col('childbearing_population')
            .interpolate(method='linear')
            .over('Country'),
            pl.col('Source')
            .fill_null(strategy='forward')
            .fill_null(strategy='backward')
            .over('Country'),
        ])
    )

    # Mark interpolated sources
    interpolated = interpolated.with_columns(
        pl.when(pl.col('interpolated'))
        .then(pl.lit('interpolated'))
        .otherwise(pl.col('Source'))
        .alias('Source')
    )

    return interpolated.sort(['Country', 'Year'])


def expand_population_to_monthly(population: pl.DataFrame) -> pl.DataFrame:
    """
    Expand annual population data to monthly estimates.

    Uses linear interpolation between years to create monthly values.

    Args:
        population: DataFrame with Country, Year, childbearing_population, Source

    Returns:
        DataFrame with columns: Country, Year, Month, childbearing_population, Source
    """
    # Create monthly index for each state-year
    monthly = (
        population
        .with_columns(pl.int_ranges(1, 13).alias('Month'))
        .explode('Month')
        .with_columns(pl.col('Month').cast(pl.Int64))
    )

    # Sort and interpolate monthly values
    monthly = (
        monthly
        .sort(['Country', 'Year', 'Month'])
        .with_columns(
            pl.col('childbearing_population')
            .interpolate(method='linear')
            .over('Country')
        )
    )

    return monthly


def load_population_monthly(data_dir: Optional[Path] = None) -> pl.DataFrame:
    """
    Load and prepare state population data at monthly frequency.

    This is the main entry point for population data. It:
    1. Loads the consolidated population CSV
    2. Interpolates gaps between census years
    3. Expands to monthly frequency

    Args:
        data_dir: Directory containing census-scripts/data/. Defaults to STATES_DATA_DIR.

    Returns:
        DataFrame with columns: Country, Year, Month, childbearing_population, Source
        Ready for joining with births data for fertility rate computation.
    """
    # Load raw population data
    population = load_population(data_dir)

    # Interpolate gaps
    population = interpolate_population(population)

    # Expand to monthly
    population = expand_population_to_monthly(population)

    return population


def compute_state_fertility_rates(
    births: pl.DataFrame,
    population: pl.DataFrame,
) -> pl.DataFrame:
    """
    Compute fertility rates for US states.

    Daily fertility rate = (births per day) / (childbearing population) * 100,000

    Args:
        births: DataFrame with Country (state), Year, Month, Births
        population: DataFrame with Country (state), Year, Month, childbearing_population

    Returns:
        DataFrame with births_per_day and daily_fertility_rate added
    """
    # Add days_in_month to births
    births = births.with_columns(
        pl.date(pl.col('Year'), pl.col('Month'), 1).dt.days_in_month().alias('days_in_month')
    )

    # Join births with population
    combined = births.join(
        population.select('Country', 'Year', 'Month', 'childbearing_population'),
        on=['Country', 'Year', 'Month'],
        how='left'
    )

    # Compute births per day
    combined = combined.with_columns(
        (pl.col('Births') / pl.col('days_in_month')).alias('births_per_day')
    )

    # Compute daily fertility rate (per 100k women of childbearing age)
    combined = combined.with_columns(
        (pl.col('births_per_day') / pl.col('childbearing_population') * 1e5)
        .alias('daily_fertility_rate')
    )

    return combined


def load_births_with_fertility(data_dir: Optional[Path] = None) -> pl.DataFrame:
    """
    Load state births data with fertility rates computed.

    This is a convenience function that loads both births and population,
    interpolates population, and computes fertility rates.

    Args:
        data_dir: Directory containing data files. Defaults to STATES_DATA_DIR.

    Returns:
        DataFrame with columns:
        - Country (state name)
        - Year, Month
        - Births
        - childbearing_population
        - births_per_day
        - daily_fertility_rate
    """
    # Load births
    births = load_births(data_dir)

    # Load and prepare population
    population = load_population_monthly(data_dir)

    # Compute fertility rates
    result = compute_state_fertility_rates(births, population)

    return result
