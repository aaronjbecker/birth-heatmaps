"""
Japan population data loader.

Source: fmsb R package by Minato Nakazawa, who processed data from:
    Statistics Bureau, Ministry of Internal Affairs and Communications: Population Census, 1888-2020.
"""
import polars as pl
import polars.selectors as cs
from pathlib import Path
from typing import Optional

from config import DATA_PIPELINE_ROOT


def load_population(data_dir: Optional[Path] = None) -> pl.DataFrame:
    """
    Load Japan population data from CSV.

    The CSV file was parsed from R source code and is in wide format,
    which we'll melt into long format.

    Census date is October 1st of each year.
    """
    if data_dir is None:
        # Default to data-pipeline root where jpop.csv is stored
        data_dir = DATA_PIPELINE_ROOT

    file_path = data_dir / 'jpop.csv'
    df = pl.read_csv(file_path, infer_schema_length=100000)

    # Melt from wide to long format
    df = (
        df.unpivot(
            on=cs.numeric().exclude('Year'),
            index=['Year', 'Sex'],
            variable_name='Age',
            value_name='Population'
        )
        .filter(pl.col('Age') != '85+')
        .with_columns(
            # Convert to lowercase for consistency
            pl.col('Sex').str.to_lowercase(),
            pl.col('Age').cast(pl.Int32),
            pl.col('Year').cast(pl.Int64),
            pl.lit('Japan').alias('Country'),
            # October 1st census date
            pl.lit(10).cast(pl.Int64).alias('Month')
        )
        .group_by(['Country', 'Year', 'Month', 'Sex', 'Age'])
        .agg(pl.col('Population').mean())
        .sort(['Country', 'Year', 'Month', 'Sex', 'Age'])
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
