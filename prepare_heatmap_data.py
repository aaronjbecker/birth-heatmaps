"""
Step 2: after loading and combining data from various sources,
compute fertility rates, seasonality, and other metrics.
"""
import polars as pl
import pandera.polars as pa
from pathlib import Path
from typing import Optional

# ===============================
# OUTPUT DATA SCHEMAS
# ===============================

BirthsSchema = pa.DataFrameSchema({
    "Country": pa.Column(pl.Utf8),
    "Year": pa.Column(pl.Int32),
    "Month": pa.Column(pl.Int8),
    "days_in_month": pa.Column(pl.Int8),
    "Date": pa.Column(pl.Date),
    "Births": pa.Column(pl.Float64, nullable=True),
    "Source": pa.Column(pl.Utf8),
    "childbearing_population": pa.Column(pl.Float64, nullable=True),
    "Source_population": pa.Column(pl.Utf8, nullable=True),
    "Date_population": pa.Column(pl.Date, nullable=True),
    "births_per_day": pa.Column(pl.Float64, nullable=True),
    "daily_fertility_rate": pa.Column(pl.Float64, nullable=True),
    "dfr_t12m_ma": pa.Column(pl.Float64, nullable=True),
    "seasonality_ratio_t12m": pa.Column(pl.Float64, nullable=True),
    "seasonality_ratio_annual": pa.Column(pl.Float64, nullable=True),
    # "fertility_rate_30d": pa.Column(pl.Float64, nullable=True),
    # "seasonality_percentage_30d": pa.Column(pl.Float64, nullable=True),
    "seasonality_percentage_annual": pa.Column(pl.Float64, nullable=True),
    # normalized seasonality (normalize year to 360 days, normalize month to 30 days)
    "seasonality_percentage_normalized": pa.Column(pl.Float64, nullable=True),
})


PopulationSchema = pa.DataFrameSchema({
    "Country": pa.Column(pl.Utf8),
    "Year": pa.Column(pl.Int32),
    "Month": pa.Column(pl.Int8),
    "childbearing_population": pa.Column(pl.Float64, nullable=True),
    "Source": pa.Column(pl.Utf8),
    "Date": pa.Column(pl.Date),
})


StatsSchema = pa.DataFrameSchema({
    "Country": pa.Column(pl.Utf8),
    "Source": pa.Column(pl.Utf8),
    "earliest_date": pa.Column(pl.Date),
    "latest_date": pa.Column(pl.Date),
    "periods_total": pa.Column(pl.Int32),
    "periods_present": pa.Column(pl.Int32),
    "periods_missing": pa.Column(pl.Int32),
    "earliest_date_country": pa.Column(pl.Date),
    "latest_date_country": pa.Column(pl.Date),
    "periods_present_country": pa.Column(pl.Int32),
    "periods_total_country": pa.Column(pl.Int32),
    "periods_missing_country": pa.Column(pl.Int32),
    "earliest_date_population": pa.Column(pl.Date, nullable=True),
    "latest_date_population": pa.Column(pl.Date, nullable=True),
    "earliest_date_country_population": pa.Column(pl.Date, nullable=True),
    "latest_date_country_population": pa.Column(pl.Date, nullable=True),
})


# ===============================
# PATH SETTINGS
# ===============================
# Input paths
births_fn = Path(__file__).parent / 'combined_births_data.csv'
population_fn = Path(__file__).parent / 'combined_population_data.csv'

# Output paths
births_output_fn = Path(__file__).parent / 'births_heatmap_data.csv'
population_output_fn = Path(__file__).parent / 'population_heatmap_data.csv'
stats_output_fn = Path(__file__).parent / 'stats_heatmap_data.csv'


# ===============================
# LOAD PARSED DATA
# ===============================
def load_data():
    births = pl.read_csv(births_fn).with_columns([
        pl.col('Year').cast(pl.Int32),
        pl.col('Month').cast(pl.Int8),
        pl.col('Births').cast(pl.Float64),
    ])
    population = pl.read_csv(population_fn).with_columns([
        pl.col('Year').cast(pl.Int32),
        pl.col('Month').cast(pl.Int8),
        pl.col('childbearing_population').cast(pl.Float64),
    ])
    return births, population

# ===============================
# INTERPOLATION AND INDEXING
# ===============================
def interpolate_population(population: pl.DataFrame) -> pl.DataFrame:
    # assume we can cover entire year of any population data being present 
    #    (backfill if census/survey happened later in year)
    country_index = population.group_by('Country').agg(
        pl.int_range(pl.col('Year').min(), pl.col('Year').max() + 1).alias('Year')
    ).with_columns(
        pl.int_ranges(1, 13).alias('Month')
    ).explode('Month').explode('Year').with_columns([
        pl.col('Year').cast(pl.Int32),
        pl.col('Month').cast(pl.Int8),
    ]).sort('Country', 'Year', 'Month')
    country_index = country_index.join(population, on=['Country', 'Year', 'Month'], how='left')\
        .sort(['Country', 'Year', 'Month'])\
        .with_columns(
            pl.col('childbearing_population').interpolate(method='linear').over(['Country']),
            pl.col('Source').fill_null(strategy='forward').fill_null(strategy='backward').over(['Country'])
        ).sort(['Country', 'Year', 'Month'])\
        .with_columns(
            pl.col('childbearing_population').fill_null(strategy='forward').fill_null(strategy='backward').over(['Country']),
            pl.date(pl.col('Year'), pl.col('Month'), 1).alias('Date')
        )
    return country_index


def births_monthly_index(births: pl.DataFrame) -> pl.DataFrame:
    """"""
    births_index = births.sort(['Country', 'Year', 'Month'])\
        .with_columns(
            pl.date(pl.col('Year'), pl.col('Month'), 1).alias('Date')
        ).group_by('Country').agg(
            pl.date_range(pl.col('Date').min(), pl.col('Date').max(), interval='1mo').alias('Date')
        ).explode('Date').select(
            'Country',
            pl.col('Date').dt.year().cast(pl.Int32).alias('Year'),
            pl.col('Date').dt.month().cast(pl.Int8).alias('Month'),
            pl.col('Date').dt.days_in_month().cast(pl.Int8).alias('days_in_month'),
            'Date'
        )
    # forward fill the source column
    births_index = births_index.join(births, on=['Country', 'Year', 'Month'], how='left')\
        .sort(['Country', 'Year', 'Month'])\
        .with_columns(pl.col('Source').fill_null(strategy='forward').over(['Country']))
    return births_index


# ===============================
# DATA COVERAGE STATISTICS
# ===============================
def compute_births_extent_stats(births: pl.DataFrame) -> pl.DataFrame:
    """
    Compute statistics on the extent of the data (time coverage by country).
    Count number of missing periods within range as well.
    """
    births_variable = 'Births'
    births_stats = births.group_by('Country', 'Source').agg(
        pl.col('Date').min().alias('earliest_date'),
        pl.col('Date').max().alias('latest_date'),
        pl.col('Date').count().cast(pl.Int32).alias('periods_total'),
        pl.col(births_variable).is_not_null().sum().cast(pl.Int32).alias('periods_present'),
    ).with_columns(
        (pl.col('periods_total') - pl.col('periods_present')).cast(pl.Int32).alias('periods_missing')
    ).with_columns(
        pl.col('earliest_date').min().over('Country').alias('earliest_date_country'),
        pl.col('latest_date').max().over('Country').alias('latest_date_country'),
        pl.col('periods_present').sum().over('Country').cast(pl.Int32).alias('periods_present_country'),
        pl.col('periods_total').sum().over('Country').cast(pl.Int32).alias('periods_total_country'),
        pl.col('periods_missing').sum().over('Country').cast(pl.Int32).alias('periods_missing_country')
    ).sort('Country', 'Source')
    return births_stats


def compute_population_extent_stats(population: pl.DataFrame) -> pl.DataFrame:
    """
    Compute statistics on the extent of the data (time coverage by country).
    Count number of missing periods within range as well.
    Because we interpolate population between census/survey dates, we won't have any missing periods.
    """
    population_stats = population.group_by('Country', 'Source').agg(
        pl.col('Date').min().alias('earliest_date'),
        pl.col('Date').max().alias('latest_date'),        
    ).with_columns(
        pl.col('earliest_date').min().over('Country').alias('earliest_date_country'),
        pl.col('latest_date').max().over('Country').alias('latest_date_country'),
    ).sort('Country', 'Source')
    return population_stats


# ===============================
# COMPUTE FERTILITY RATES
# ===============================
def compute_fertility_rates(births: pl.DataFrame, population: pl.DataFrame) -> pl.DataFrame:
    """
    Compute fertility rates from births and population data.
    """
    births = births.join(population, on=['Country', 'Year', 'Month'], how='left', suffix='_population')
    births = births.with_columns(
        (pl.col('Births') / pl.col('days_in_month')).alias('births_per_day')
    )
    births = births.with_columns(
        (pl.col('births_per_day') / pl.col('childbearing_population') * 1e5).alias('daily_fertility_rate')
    )    
    return births


# ===============================
# COMPUTE SEASONALITY
# ===============================
def compute_seasonality(births: pl.DataFrame) -> pl.DataFrame:
    """
    Compute measures of the seasonality (i.e. monthly distribution) of births for each country.
    """
    births_t12m_ma = births.group_by('Country', maintain_order=True).agg(        
        pl.col('Date'),
        pl.col('daily_fertility_rate').rolling_mean(window_size=12).alias('dfr_t12m_ma')        
    ).explode('Date', 'dfr_t12m_ma')
    births = births.join(births_t12m_ma, on=['Country', 'Date'], how='left')
    births = births.with_columns(
        # this ratio is probably not simple enough for casual viewers to understand.
        (pl.col('daily_fertility_rate') / pl.col('dfr_t12m_ma')).alias('seasonality_ratio_t12m'),
        (pl.col('daily_fertility_rate') / pl.col('daily_fertility_rate').mean().over(['Country', 'Year'])).alias('seasonality_ratio_annual'),
    )
    # seasonality in terms of percentage of births in each month-- 
    #     lazier viewers can understand this more easily.
    # we need to limit this to years in which we have data for every month.
    full_year_births = births.filter(pl.col('Month').count().over(['Country', 'Year']) == 12)
    full_year_births = full_year_births.group_by('Country', 'Year').agg(
        pl.col('Births').sum().alias('annual_births'),
        pl.col('days_in_month').sum().alias('days_in_year'),
    ).with_columns(
        (pl.col('annual_births') / (pl.col('days_in_year') / 360)).alias('annual_births_normalized'),
    )
    births_calc = births.select('Country', 'Year', 'Month', 'Births', 'days_in_month').with_columns(
        (pl.col('Births') / (pl.col('days_in_month') / 30)).alias('births_normalized'),
    )
    births_calc = births_calc.join(full_year_births.select('Country', 'Year', 'annual_births_normalized'), on=['Country', 'Year'], how='left')\
        .with_columns(
            (pl.col('births_normalized') / pl.col('annual_births_normalized')).alias('seasonality_percentage_normalized'),
        )
    births = births.join(births_calc.select('Country', 'Year', 'Month', 'seasonality_percentage_normalized'), on=['Country', 'Year', 'Month'], how='left')    
    births = births.join(full_year_births.select('Country', 'Year', 'annual_births'), on=['Country', 'Year'], how='left')\
        .with_columns(
            (pl.col('Births') / pl.col('annual_births')).alias('seasonality_percentage_annual'),
        )
    # # first, adjust the number of births in each month to a standard 30-day month.
    # full_year_births = full_year_births.with_columns(
    #     (pl.col('daily_fertility_rate') * 30).alias('fertility_rate_30d'),
    # )
    # # then, compute the seasonality as the ratio of the number of births in each month to the total number of births in the year.
    # full_year_births = full_year_births.with_columns(
    #     (pl.col('fertility_rate_30d') / pl.col('fertility_rate_30d').sum().over(['Country', 'Year'])).alias('seasonality_percentage_30d'),
    # ).select('Country', 'Year', 'Month', 'fertility_rate_30d', 'seasonality_percentage_30d')
    # births = births.join(full_year_births, on=['Country', 'Year', 'Month'], how='left')\
    #     .sort(['Country', 'Year', 'Month'])
    return births


# ===============================
# MAIN FUNCTION
# ===============================
def main(
    births_output_path: Optional[Path] = None,
    population_output_path: Optional[Path] = None,
    stats_output_path: Optional[Path] = None
) -> None:
    """
    Main function to process births and population data, compute metrics, and save output files.
    
    Args:
        births_output_path: Path to save births data CSV. Defaults to births_output_fn.
        population_output_path: Path to save population data CSV. Defaults to population_output_fn.
        stats_output_path: Path to save stats data CSV. Defaults to stats_output_fn.
    """
    # Use default paths if not provided
    if births_output_path is None:
        births_output_path = births_output_fn
    if population_output_path is None:
        population_output_path = population_output_fn
    if stats_output_path is None:
        stats_output_path = stats_output_fn
    
    # Load and process data
    births, population = load_data()
    population = interpolate_population(population)
    population_stats = compute_population_extent_stats(population)
    births = births_monthly_index(births)
    births_stats = compute_births_extent_stats(births)
    stats = births_stats.join(population_stats, on=['Country', 'Source'], how='left', suffix='_population')
    births = compute_fertility_rates(births, population)
    births = compute_seasonality(births)
    
    # Validate dataframes against schemas before saving
    births = BirthsSchema.validate(births)
    population = PopulationSchema.validate(population)
    stats = StatsSchema.validate(stats)
    
    # Write output data to CSV files
    births.write_csv(births_output_path)
    population.write_csv(population_output_path)
    stats.write_csv(stats_output_path)


if __name__ == '__main__':
    main()
