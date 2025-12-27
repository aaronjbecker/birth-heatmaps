"""
Birth seasonality computation.

Calculates various measures of birth seasonality (monthly distribution).
"""
import polars as pl


def compute_seasonality(births: pl.DataFrame) -> pl.DataFrame:
    """
    Compute measures of birth seasonality for each country.

    Metrics computed:
    - dfr_t12m_ma: 12-month trailing moving average of daily fertility rate
    - seasonality_ratio_t12m: ratio to 12-month moving average
    - seasonality_ratio_annual: ratio to annual mean
    - seasonality_percentage_annual: percentage of annual births
    - seasonality_percentage_normalized: normalized to 30-day months and 360-day years

    Args:
        births: DataFrame with Country, Year, Month, Date, Births, days_in_month,
                daily_fertility_rate

    Returns:
        DataFrame with seasonality metrics added
    """
    # Compute 12-month trailing moving average
    births_t12m_ma = (
        births.group_by('Country', maintain_order=True)
        .agg(
            pl.col('Date'),
            pl.col('daily_fertility_rate').rolling_mean(window_size=12).alias('dfr_t12m_ma')
        )
        .explode('Date', 'dfr_t12m_ma')
    )

    births = births.join(births_t12m_ma, on=['Country', 'Date'], how='left')

    # Compute seasonality ratios
    births = births.with_columns(
        # Ratio to 12-month trailing moving average
        (pl.col('daily_fertility_rate') / pl.col('dfr_t12m_ma')).alias('seasonality_ratio_t12m'),
        # Ratio to annual mean
        (pl.col('daily_fertility_rate') / pl.col('daily_fertility_rate').mean().over(['Country', 'Year'])).alias('seasonality_ratio_annual'),
    )

    # Compute seasonality percentage (only for complete years)
    # First, identify years with all 12 months of data
    full_year_births = births.filter(
        pl.col('Month').count().over(['Country', 'Year']) == 12
    )

    full_year_births = (
        full_year_births.group_by('Country', 'Year')
        .agg(
            pl.col('Births').sum().alias('annual_births'),
            pl.col('days_in_month').sum().alias('days_in_year'),
        )
        .with_columns(
            # Normalize to 360-day year
            (pl.col('annual_births') / (pl.col('days_in_year') / 360)).alias('annual_births_normalized'),
        )
    )

    # Compute normalized births (30-day months)
    births_calc = (
        births.select('Country', 'Year', 'Month', 'Births', 'days_in_month')
        .with_columns(
            (pl.col('Births') / (pl.col('days_in_month') / 30)).alias('births_normalized'),
        )
    )

    # Join and compute normalized seasonality percentage
    births_calc = (
        births_calc.join(
            full_year_births.select('Country', 'Year', 'annual_births_normalized'),
            on=['Country', 'Year'],
            how='left'
        )
        .with_columns(
            (pl.col('births_normalized') / pl.col('annual_births_normalized')).alias('seasonality_percentage_normalized'),
        )
    )

    # Add normalized percentage to main dataframe
    births = births.join(
        births_calc.select('Country', 'Year', 'Month', 'seasonality_percentage_normalized'),
        on=['Country', 'Year', 'Month'],
        how='left'
    )

    # Add simple annual percentage
    births = (
        births.join(
            full_year_births.select('Country', 'Year', 'annual_births'),
            on=['Country', 'Year'],
            how='left'
        )
        .with_columns(
            (pl.col('Births') / pl.col('annual_births')).alias('seasonality_percentage_annual'),
        )
    )

    return births
