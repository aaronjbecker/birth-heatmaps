"""
Pandera schemas for data validation.
"""
import polars as pl
import pandera.polars as pa


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
    "seasonality_percentage_annual": pa.Column(pl.Float64, nullable=True),
    "seasonality_percentage_normalized": pa.Column(pl.Float64, nullable=True),
    "future_births": pa.Column(pl.Float64, nullable=True),
    "future_days_in_month": pa.Column(pl.Int8, nullable=True),
    "future_births_per_day": pa.Column(pl.Float64, nullable=True),
    "daily_conception_rate": pa.Column(pl.Float64, nullable=True),
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


__all__ = ['BirthsSchema', 'PopulationSchema', 'StatsSchema']
