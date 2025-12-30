"""
Human Mortality Database data loaders.

These loaders make assumptions about the file structure.
HMD files can be downloaded in bulk from the HMD website.
"""
import polars as pl
from pathlib import Path
from typing import Optional

from config import HMD_DATA_DIR, HMD_COUNTRIES


def get_hmd_file_path(country_code: str, file_suffix: str, data_dir: Optional[Path] = None) -> Path:
    """
    Get the path to an HMD data file for a country.

    Checks for bulk download structure first (InputDB subdirectory),
    falls back to flat file structure for backwards compatibility.

    Args:
        country_code: HMD country code (e.g., 'USA', 'FRATNP')
        file_suffix: File suffix like 'birthbymonth.txt' or 'pop.txt'
        data_dir: Optional override for data directory

    Returns:
        Path to the data file
    """
    if data_dir is None:
        data_dir = HMD_DATA_DIR

    # Check for bulk download structure: {data_dir}/{country_code}/InputDB/{country_code}{suffix}
    bulk_path = data_dir / country_code / 'InputDB' / f'{country_code}{file_suffix}'
    if bulk_path.exists():
        return bulk_path

    # Fall back to flat structure: {data_dir}/{country_code}{suffix}
    return data_dir / f'{country_code}{file_suffix}'


def load_births_file(country_code: str, data_dir: Optional[Path] = None) -> pl.DataFrame:
    """Load raw births data for a single country from HMD."""
    file_path = get_hmd_file_path(country_code, 'birthbymonth.txt', data_dir)
    return pl.read_csv(file_path, infer_schema_length=100000)


def load_population_file(country_code: str, data_dir: Optional[Path] = None) -> pl.DataFrame:
    """Load raw population data for a single country from HMD."""
    file_path = get_hmd_file_path(country_code, 'pop.txt', data_dir)
    return pl.read_csv(file_path, infer_schema_length=100000)


def process_births_file(births: pl.DataFrame) -> pl.DataFrame:
    """
    Process raw births data from the Human Mortality Database.

    When there's more than one source per year and month, use the LDB flag
    to filter to the best source, but use data not included in the final
    life database if it's our only source.
    """
    # Filter out totals and select needed columns
    if not births['Month'].dtype.is_integer():
        # Some countries only have integer months, so filtering is unnecessary
        births = births.filter(~pl.col('Month').is_in(['TOT', 'UNK'])).with_columns(
            pl.col('Month').cast(pl.Int64)
        )

    births = (
        births.with_columns(
            pl.col('Births').count().over(['Year', 'Month']).alias('n_sources')
        )
        .filter(
            pl.when(pl.col('n_sources') > 1)
            .then(pl.col('LDB') == 1)
            .otherwise(pl.lit(True))
        )
        .select(
            pl.col('Year').cast(pl.Int64),
            pl.col('Month').cast(pl.Int64),
            pl.col('Births').cast(pl.Float64)
        )
        .group_by(['Year', 'Month'])
        .agg(
            # If we still have multiple sources, average them
            pl.col('Births').mean()
        )
        .sort(['Year', 'Month'])
    )
    return births


def process_population_file(population: pl.DataFrame) -> pl.DataFrame:
    """
    Process raw population data from the Human Mortality Database.

    When there's more than one source per year/month/age, use the LDB flag
    to filter to the best source.
    """
    if not population['Age'].dtype.is_integer():
        population = population.filter(~pl.col('Age').is_in(['TOT', 'UNK'])).with_columns(
            pl.col('Age').cast(pl.Int32)
        )

    population = (
        population.with_columns(
            pl.col('Population').count().over(['Year', 'Month', 'Age']).alias('n_sources')
        )
        .filter(
            pl.when(pl.col('n_sources') > 1)
            .then(pl.col('LDB') == 1)
            .otherwise(pl.lit(True))
        )
        .select(
            pl.col('Year').cast(pl.Int64),
            pl.col('Month').cast(pl.Int64),  # Month refers to timing of census/survey
            pl.col('Sex'),
            pl.col('Age').cast(pl.Int32),
            pl.col('Population').cast(pl.Float64)
        )
        .group_by(['Year', 'Month', 'Sex', 'Age'])
        .agg(pl.col('Population').mean())
        .sort(['Year', 'Month', 'Sex', 'Age'])
    )
    return population


def filter_population_for_fertility_rate(population: pl.DataFrame) -> pl.DataFrame:
    """
    Filter population data to only include female population of childbearing age (15-44)
    so we can calculate the general fertility rate.

    Returns total population of childbearing age by Country, Year, and Month.
    Assumes we're filtering all countries at once.
    """
    return (
        population.filter(pl.col('Sex') == 'f')
        .filter(pl.col('Age') >= 15, pl.col('Age') <= 44)
        .group_by(['Country', 'Year', 'Month'])
        .agg(pl.col('Population').sum().alias('childbearing_population'))
        .sort(['Country', 'Year', 'Month'])
    )


def load_all_births(data_dir: Optional[Path] = None) -> pl.DataFrame:
    """Load and process births data for all HMD countries."""
    births_all = []
    for country in HMD_COUNTRIES:
        try:
            births = load_births_file(country.code, data_dir)
            births = process_births_file(births)
            births = births.with_columns(pl.lit(country.name).alias('Country'))
            births_all.append(births)
        except FileNotFoundError:
            # Skip countries without data files
            continue
    return pl.concat(births_all) if births_all else pl.DataFrame()


def load_all_population(data_dir: Optional[Path] = None) -> pl.DataFrame:
    """Load and process population data for all HMD countries."""
    population_all = []
    for country in HMD_COUNTRIES:
        try:
            population = load_population_file(country.code, data_dir)
            population = process_population_file(population)
            population = population.with_columns(pl.lit(country.name).alias('Country'))
            population_all.append(population)
        except FileNotFoundError:
            # Skip countries without data files
            continue
    return pl.concat(population_all) if population_all else pl.DataFrame()
