"""
Population interpolation utilities.

Interpolates population data between census/survey dates to provide
monthly estimates for fertility rate calculations.
"""
import polars as pl


def interpolate_population(population: pl.DataFrame) -> pl.DataFrame:
    """
    Interpolate population data to monthly frequency.

    Assumes we can cover the entire year of any population data being present
    (backfill if census/survey happened later in year).

    Uses linear interpolation between data points and forward/backward fill
    for source attribution.

    Args:
        population: DataFrame with Country, Year, Month, childbearing_population, Source

    Returns:
        DataFrame with monthly population estimates
    """
    # Create full monthly index for each country
    country_index = (
        population.group_by('Country')
        .agg(pl.int_range(pl.col('Year').min(), pl.col('Year').max() + 1).alias('Year'))
        .with_columns(pl.int_ranges(1, 13).alias('Month'))
        .explode('Month')
        .explode('Year')
        .with_columns([
            pl.col('Year').cast(pl.Int32),
            pl.col('Month').cast(pl.Int8),
        ])
        .sort('Country', 'Year', 'Month')
    )

    # Join with actual data and interpolate
    country_index = (
        country_index.join(population, on=['Country', 'Year', 'Month'], how='left')
        .sort(['Country', 'Year', 'Month'])
        .with_columns(
            pl.col('childbearing_population').interpolate(method='linear').over(['Country']),
            pl.col('Source').fill_null(strategy='forward').fill_null(strategy='backward').over(['Country'])
        )
        .sort(['Country', 'Year', 'Month'])
        .with_columns(
            pl.col('childbearing_population').fill_null(strategy='forward').fill_null(strategy='backward').over(['Country']),
            pl.date(pl.col('Year'), pl.col('Month'), 1).alias('Date')
        )
    )
    return country_index


def create_births_monthly_index(births: pl.DataFrame) -> pl.DataFrame:
    """
    Create a complete monthly index for births data.

    Fills in missing months within the data range for each country,
    forward-filling the source column.

    Args:
        births: DataFrame with Country, Year, Month, Births, Source

    Returns:
        DataFrame with complete monthly index and days_in_month
    """
    births_index = (
        births.sort(['Country', 'Year', 'Month'])
        .with_columns(pl.date(pl.col('Year'), pl.col('Month'), 1).alias('Date'))
        .group_by('Country')
        .agg(pl.date_range(pl.col('Date').min(), pl.col('Date').max(), interval='1mo').alias('Date'))
        .explode('Date')
        .select(
            'Country',
            pl.col('Date').dt.year().cast(pl.Int32).alias('Year'),
            pl.col('Date').dt.month().cast(pl.Int8).alias('Month'),
            pl.col('Date').dt.days_in_month().cast(pl.Int8).alias('days_in_month'),
            'Date'
        )
    )

    # Join with actual births data and forward-fill source
    births_index = (
        births_index.join(births, on=['Country', 'Year', 'Month'], how='left')
        .sort(['Country', 'Year', 'Month'])
        .with_columns(pl.col('Source').fill_null(strategy='forward').over(['Country']))
    )
    return births_index
