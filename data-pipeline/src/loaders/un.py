"""
United Nations data loaders.

Data sources:
- UN Population Division births by month
- World Population Prospects (WPP) population by single age and sex
"""
import polars as pl
from pathlib import Path
from typing import Optional, List

from config import UN_DATA_DIR, MONTH_NAMES_FULL, MONTH_NAME_TO_NUMBER


def load_births(data_dir: Optional[Path] = None) -> pl.DataFrame:
    """
    Load UN births by month data.

    Source: https://data.un.org/Data.aspx?d=POP&f=tableCode%3A55
    Data must be manually downloaded, unzipped, moved and renamed.
    """
    if data_dir is None:
        data_dir = UN_DATA_DIR
    file_path = data_dir / 'un_births_by_month_data_raw.csv'
    df = pl.read_csv(file_path, infer_schema_length=1000000)
    # exclude provisional data (it's generally lower quality data)
    df = df.filter(~pl.col('Reliability').str.contains('Provisional figure'))

    # Average multiple sources per country/year/month when they exist
    df = (
        df.filter(pl.col('Month').str.strip_chars().is_in(MONTH_NAMES_FULL))
        .select(
            pl.col('Country or Area').alias('Country'),
            pl.col('Year').cast(pl.Int64),
            pl.col('Month')
            .str.strip_chars()
            .replace_strict(MONTH_NAME_TO_NUMBER, return_dtype=pl.Int64)
            .alias('Month'),
            pl.col('Value').cast(pl.Float64).alias('Births')
        )
        .group_by(['Country', 'Year', 'Month'])
        .agg(pl.col('Births').mean())
        .sort(['Country', 'Year', 'Month'])
    )
    return df


def load_population(
    births_countries: List[str],
    data_dir: Optional[Path] = None
) -> pl.DataFrame:
    """
    Load UN World Population Prospects population data.

    This is the historical part of the dataset (1950-2023).
    Source: https://population.un.org/wpp/downloads

    Args:
        births_countries: List of country names to filter to (for efficiency).
        data_dir: Directory containing the data file.
    """
    if data_dir is None:
        data_dir = UN_DATA_DIR
    fn = 'WPP2024_PopulationBySingleAgeSex_Medium_1950-2023.csv'
    file_path = data_dir / fn

    df = (
        pl.read_csv(file_path, infer_schema_length=1000000)
        .filter(
            pl.col('Location').is_in(births_countries),
            pl.col('AgeGrpSpan') == 1  # Only single age groups
        )
        .select(
            pl.col('Location').alias('Country'),
            pl.col('Time').cast(pl.Int64).alias('Year'),
            pl.lit(1).cast(pl.Int64).alias('Month'),  # Assume January 1st
            pl.col('AgeGrpStart').cast(pl.Int32).alias('Age'),
            pl.col('PopMale'),
            pl.col('PopFemale')
        )
        .unpivot(
            on=['PopMale', 'PopFemale'],
            index=['Country', 'Year', 'Month', 'Age'],
            variable_name='Sex',
            value_name='Population'
        )
        .with_columns(
            # File is in thousands, scale to actual count
            pl.col('Population') * 1000,
            pl.col('Sex').replace_strict({'PopMale': 'm', 'PopFemale': 'f'})
        )
    )
    return df


def filter_population_for_fertility_rate(population: pl.DataFrame) -> pl.DataFrame:
    """
    Filter population data to only include female population of childbearing age (15-44).

    Returns total childbearing population by Country, Year, and Month.
    """
    return (
        population.filter(pl.col('Sex') == 'f')
        .filter(pl.col('Age') >= 15, pl.col('Age') <= 44)
        .group_by(['Country', 'Year', 'Month'])
        .agg(pl.col('Population').sum().alias('childbearing_population'))
        .sort(['Country', 'Year', 'Month'])
    )
