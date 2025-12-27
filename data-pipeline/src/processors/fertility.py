"""
Fertility rate computation.

Calculates daily fertility rates from births and population data.
"""
import polars as pl


def compute_fertility_rates(births: pl.DataFrame, population: pl.DataFrame) -> pl.DataFrame:
    """
    Compute fertility rates from births and population data.

    Daily fertility rate = (births per day) / (childbearing population) * 100,000

    Args:
        births: DataFrame with Country, Year, Month, Births, days_in_month, Date, Source
        population: DataFrame with Country, Year, Month, childbearing_population, Date, Source

    Returns:
        DataFrame with births_per_day and daily_fertility_rate added
    """
    # Join births with population
    births = births.join(
        population,
        on=['Country', 'Year', 'Month'],
        how='left',
        suffix='_population'
    )

    # Compute births per day
    births = births.with_columns(
        (pl.col('Births') / pl.col('days_in_month')).alias('births_per_day')
    )

    # Compute daily fertility rate (per 100k women of childbearing age)
    births = births.with_columns(
        (pl.col('births_per_day') / pl.col('childbearing_population') * 1e5).alias('daily_fertility_rate')
    )

    return births
