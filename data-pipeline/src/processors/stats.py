"""
Data coverage statistics computation.
"""
import polars as pl


def compute_births_extent_stats(births: pl.DataFrame) -> pl.DataFrame:
    """
    Compute statistics on the extent of births data (time coverage by country).

    Counts number of missing periods within range as well.

    Args:
        births: DataFrame with Country, Source, Date, Births

    Returns:
        DataFrame with coverage statistics
    """
    births_stats = (
        births.group_by('Country', 'Source')
        .agg(
            pl.col('Date').min().alias('earliest_date'),
            pl.col('Date').max().alias('latest_date'),
            pl.col('Date').count().cast(pl.Int32).alias('periods_total'),
            pl.col('Births').is_not_null().sum().cast(pl.Int32).alias('periods_present'),
        )
        .with_columns(
            (pl.col('periods_total') - pl.col('periods_present')).cast(pl.Int32).alias('periods_missing')
        )
        .with_columns(
            pl.col('earliest_date').min().over('Country').alias('earliest_date_country'),
            pl.col('latest_date').max().over('Country').alias('latest_date_country'),
            pl.col('periods_present').sum().over('Country').cast(pl.Int32).alias('periods_present_country'),
            pl.col('periods_total').sum().over('Country').cast(pl.Int32).alias('periods_total_country'),
            pl.col('periods_missing').sum().over('Country').cast(pl.Int32).alias('periods_missing_country')
        )
        .sort('Country', 'Source')
    )
    return births_stats


def compute_population_extent_stats(population: pl.DataFrame) -> pl.DataFrame:
    """
    Compute statistics on the extent of population data (time coverage by country).

    Because we interpolate population between census/survey dates,
    we won't have any missing periods.

    Args:
        population: DataFrame with Country, Source, Date

    Returns:
        DataFrame with coverage statistics
    """
    population_stats = (
        population.group_by('Country', 'Source')
        .agg(
            pl.col('Date').min().alias('earliest_date'),
            pl.col('Date').max().alias('latest_date'),
        )
        .with_columns(
            pl.col('earliest_date').min().over('Country').alias('earliest_date_country'),
            pl.col('latest_date').max().over('Country').alias('latest_date_country'),
        )
        .sort('Country', 'Source')
    )
    return population_stats
