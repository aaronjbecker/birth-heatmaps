"""
Conception rate computation.

Calculates daily conception rates by aligning births data shifted 10 months forward
with current population data.
"""
import polars as pl


def compute_conception_rates(births: pl.DataFrame) -> pl.DataFrame:
    """
    Compute conception rates from births data.

    Daily conception rate = (births 10 months in future per day) / (current population) * 100,000

    The conception rate uses the current month's childbearing population and births
    data from 10 months in the future (approximate gestation period).

    Months where 10-month-future births data doesn't exist will have null values
    for conception rate columns and should be excluded from exports.

    Args:
        births: DataFrame with Country, Year, Month, Births, days_in_month,
                childbearing_population, daily_fertility_rate, Date, Source

    Returns:
        DataFrame with future_births, future_days_in_month, future_births_per_day,
        and daily_conception_rate columns added. Rows without future births
        will have null values in these columns.
    """
    # Create a copy of births with shifted Year/Month to represent where these births
    # would align as "future births" relative to conception date.
    # Subtract 10 months: if births are in Jan 2021, conception was ~Mar 2020
    future_births = births.select([
        'Country',
        # Calculate conception year/month (10 months before birth)
        ((pl.col('Year') * 12 + pl.col('Month') - 1 - 10) // 12).cast(pl.Int64).alias('conception_year'),
        ((pl.col('Year') * 12 + pl.col('Month') - 1 - 10) % 12 + 1).cast(pl.Int64).alias('conception_month'),
        pl.col('Births').alias('future_births'),
        pl.col('days_in_month').alias('future_days_in_month'),
    ])

    # Join births with future births data.
    # This aligns each row with the births that will occur 10 months later.
    births = births.join(
        future_births,
        left_on=['Country', 'Year', 'Month'],
        right_on=['Country', 'conception_year', 'conception_month'],
        how='left'
    )

    # Compute future births per day
    births = births.with_columns(
        (pl.col('future_births') / pl.col('future_days_in_month')).alias('future_births_per_day')
    )

    # Compute daily conception rate (per 100k women of childbearing age)
    births = births.with_columns(
        (pl.col('future_births_per_day') / pl.col('childbearing_population') * 1e5).alias('daily_conception_rate')
    )

    return births
