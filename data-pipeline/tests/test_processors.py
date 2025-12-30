"""Tests for the processors module."""
import pytest
import polars as pl
from processors import (
    interpolate_population,
    create_births_monthly_index,
    compute_fertility_rates,
    compute_seasonality,
    compute_conception_rates,
)


class TestInterpolatePopulation:
    """Tests for population interpolation."""

    def test_fills_missing_months(self, sample_population_data):
        """Should fill in missing months between data points."""
        result = interpolate_population(sample_population_data)

        # Should have 24 months per country (2 years * 12 months)
        france_data = result.filter(pl.col('Country') == 'France')
        assert len(france_data) == 24

    def test_interpolates_values(self, sample_population_data):
        """Interpolated values should be between original values."""
        result = interpolate_population(sample_population_data)

        france_data = result.filter(pl.col('Country') == 'France')
        march_2020 = france_data.filter(
            (pl.col('Year') == 2020) & (pl.col('Month') == 3)
        )['childbearing_population'][0]

        # March should be between January (8.5M) and July (8.48M)
        assert 8_480_000 <= march_2020 <= 8_500_000

    def test_adds_date_column(self, sample_population_data):
        """Should add a Date column."""
        result = interpolate_population(sample_population_data)
        assert 'Date' in result.columns


class TestCreateBirthsMonthlyIndex:
    """Tests for births monthly index creation."""

    def test_preserves_all_months(self, sample_births_data):
        """Should preserve all months in the data."""
        result = create_births_monthly_index(sample_births_data)

        france_data = result.filter(pl.col('Country') == 'France')
        assert len(france_data) == 24  # 2 years * 12 months

    def test_adds_days_in_month(self, sample_births_data):
        """Should add days_in_month column."""
        result = create_births_monthly_index(sample_births_data)
        assert 'days_in_month' in result.columns

        # February should have 28 or 29 days
        feb_2020 = result.filter(
            (pl.col('Year') == 2020) & (pl.col('Month') == 2)
        )['days_in_month'][0]
        assert feb_2020 in [28, 29]

    def test_adds_date_column(self, sample_births_data):
        """Should add Date column."""
        result = create_births_monthly_index(sample_births_data)
        assert 'Date' in result.columns


class TestComputeFertilityRates:
    """Tests for fertility rate computation."""

    def test_computes_births_per_day(self, sample_births_data, sample_population_data):
        """Should compute births_per_day column."""
        births = create_births_monthly_index(sample_births_data)
        population = interpolate_population(sample_population_data)

        result = compute_fertility_rates(births, population)
        assert 'births_per_day' in result.columns

        # births_per_day should be births / days_in_month
        row = result.filter(
            (pl.col('Country') == 'France') &
            (pl.col('Year') == 2020) &
            (pl.col('Month') == 1)
        )
        expected = 62000 / 31  # January has 31 days
        assert abs(row['births_per_day'][0] - expected) < 1

    def test_computes_daily_fertility_rate(self, sample_births_data, sample_population_data):
        """Should compute daily_fertility_rate column."""
        births = create_births_monthly_index(sample_births_data)
        population = interpolate_population(sample_population_data)

        result = compute_fertility_rates(births, population)
        assert 'daily_fertility_rate' in result.columns

        # Rate should be positive
        assert result['daily_fertility_rate'].drop_nulls().min() > 0


class TestComputeSeasonality:
    """Tests for seasonality computation."""

    def test_computes_seasonality_columns(self, sample_births_data, sample_population_data):
        """Should compute seasonality columns."""
        births = create_births_monthly_index(sample_births_data)
        population = interpolate_population(sample_population_data)
        births = compute_fertility_rates(births, population)

        result = compute_seasonality(births)

        expected_columns = [
            'dfr_t12m_ma',
            'seasonality_ratio_t12m',
            'seasonality_ratio_annual',
            'seasonality_percentage_annual',
            'seasonality_percentage_normalized',
        ]
        for col in expected_columns:
            assert col in result.columns

    def test_seasonality_percentage_sums_to_one(self, sample_births_data, sample_population_data):
        """Seasonality percentages should approximately sum to 1 per year."""
        births = create_births_monthly_index(sample_births_data)
        population = interpolate_population(sample_population_data)
        births = compute_fertility_rates(births, population)
        result = compute_seasonality(births)

        # For each complete year, percentages should sum to ~1
        for country in ['France', 'Japan']:
            for year in [2020, 2021]:
                year_data = result.filter(
                    (pl.col('Country') == country) &
                    (pl.col('Year') == year) &
                    (pl.col('seasonality_percentage_annual').is_not_null())
                )
                if len(year_data) == 12:
                    total = year_data['seasonality_percentage_annual'].sum()
                    assert 0.99 <= total <= 1.01


class TestComputeConceptionRates:
    """Tests for conception rate computation."""

    def test_computes_conception_columns(self, sample_births_data, sample_population_data):
        """Should compute conception rate columns."""
        births = create_births_monthly_index(sample_births_data)
        population = interpolate_population(sample_population_data)
        births = compute_fertility_rates(births, population)
        births = compute_seasonality(births)

        result = compute_conception_rates(births)

        assert 'future_births' in result.columns
        assert 'future_days_in_month' in result.columns
        assert 'future_births_per_day' in result.columns
        assert 'daily_conception_rate' in result.columns

    def test_conception_rate_is_positive_where_valid(self, sample_births_data, sample_population_data):
        """Conception rate should be positive where data exists."""
        births = create_births_monthly_index(sample_births_data)
        population = interpolate_population(sample_population_data)
        births = compute_fertility_rates(births, population)
        births = compute_seasonality(births)
        result = compute_conception_rates(births)

        valid = result.filter(pl.col('daily_conception_rate').is_not_null())
        if len(valid) > 0:
            assert valid['daily_conception_rate'].min() > 0

    def test_future_births_align_correctly(self, sample_births_data, sample_population_data):
        """Future births should align with births 10 months later."""
        births = create_births_monthly_index(sample_births_data)
        population = interpolate_population(sample_population_data)
        births = compute_fertility_rates(births, population)
        births = compute_seasonality(births)
        result = compute_conception_rates(births)

        # For France Jan 2020, future births should be Nov 2020 births
        jan_2020 = result.filter(
            (pl.col('Country') == 'France') &
            (pl.col('Year') == 2020) &
            (pl.col('Month') == 1)
        )

        nov_2020 = result.filter(
            (pl.col('Country') == 'France') &
            (pl.col('Year') == 2020) &
            (pl.col('Month') == 11)
        )

        if len(jan_2020) > 0 and len(nov_2020) > 0:
            future_births = jan_2020['future_births'][0]
            actual_births = nov_2020['Births'][0]
            if future_births is not None:
                assert future_births == actual_births

    def test_last_months_have_null_conception_rate(self, sample_births_data, sample_population_data):
        """Months without 10-month-future data should have null conception rate."""
        births = create_births_monthly_index(sample_births_data)
        population = interpolate_population(sample_population_data)
        births = compute_fertility_rates(births, population)
        births = compute_seasonality(births)
        result = compute_conception_rates(births)

        # The last 10 months should have null conception rate (no future data)
        # For data ending Dec 2021, Mar-Dec 2021 should have no future births
        france_late_2021 = result.filter(
            (pl.col('Country') == 'France') &
            (pl.col('Year') == 2021) &
            (pl.col('Month') >= 3)  # Mar 2021 + 10 months = Jan 2022 (doesn't exist)
        )

        # All should have null conception rate
        assert france_late_2021['daily_conception_rate'].is_null().all()
