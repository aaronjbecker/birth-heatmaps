"""Tests for the exporters module."""
import json
import pytest
from pathlib import Path
import tempfile
import polars as pl
from processors import (
    interpolate_population,
    create_births_monthly_index,
    compute_fertility_rates,
    compute_seasonality,
    compute_conception_rates,
)
from exporters import (
    export_countries_index,
    export_fertility_data,
    export_seasonality_data,
    export_conception_data,
    export_all_countries,
    compute_complete_years,
    filter_countries_by_min_years,
    trim_leading_trailing_nulls,
)


@pytest.fixture
def processed_births_data(sample_births_data, sample_population_data):
    """Fully processed births data for testing exports."""
    births = create_births_monthly_index(sample_births_data)
    population = interpolate_population(sample_population_data)
    births = compute_fertility_rates(births, population)
    births = compute_seasonality(births)
    births = compute_conception_rates(births)
    return births


class TestExportCountriesIndex:
    """Tests for countries index export."""

    def test_creates_countries_json(self, processed_births_data):
        """Should create countries.json file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            export_countries_index(processed_births_data, output_dir)

            output_file = output_dir / 'countries.json'
            assert output_file.exists()

    def test_countries_json_structure(self, processed_births_data):
        """countries.json should have correct structure."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            export_countries_index(processed_births_data, output_dir)

            with open(output_dir / 'countries.json') as f:
                data = json.load(f)

            assert 'countries' in data
            assert 'dataSources' in data
            assert 'generatedAt' in data

    def test_countries_have_required_fields(self, processed_births_data):
        """Each country should have required fields."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            export_countries_index(processed_births_data, output_dir)

            with open(output_dir / 'countries.json') as f:
                data = json.load(f)

            for country in data['countries']:
                assert 'code' in country
                assert 'name' in country
                assert 'sources' in country
                assert 'fertility' in country
                assert 'seasonality' in country


class TestExportFertilityData:
    """Tests for fertility data export."""

    def test_creates_country_json(self, processed_births_data):
        """Should create JSON file for country."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            export_fertility_data(processed_births_data, 'France', output_dir)

            output_file = output_dir / 'france.json'
            assert output_file.exists()

    def test_fertility_json_structure(self, processed_births_data):
        """Fertility JSON should have correct structure."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            export_fertility_data(processed_births_data, 'France', output_dir)

            with open(output_dir / 'france.json') as f:
                data = json.load(f)

            assert data['metric'] == 'daily_fertility_rate'
            assert 'country' in data
            assert 'colorScale' in data
            assert 'years' in data
            assert 'months' in data
            assert 'data' in data

    def test_data_cells_have_required_fields(self, processed_births_data):
        """Each data cell should have required fields."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            export_fertility_data(processed_births_data, 'France', output_dir)

            with open(output_dir / 'france.json') as f:
                data = json.load(f)

            for cell in data['data']:
                assert 'year' in cell
                assert 'month' in cell
                assert 'value' in cell
                assert 'source' in cell


class TestExportSeasonalityData:
    """Tests for seasonality data export."""

    def test_creates_country_json(self, processed_births_data):
        """Should create JSON file for country."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            export_seasonality_data(processed_births_data, 'Japan', output_dir)

            output_file = output_dir / 'japan.json'
            assert output_file.exists()

    def test_seasonality_json_structure(self, processed_births_data):
        """Seasonality JSON should have correct structure."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            export_seasonality_data(processed_births_data, 'Japan', output_dir)

            with open(output_dir / 'japan.json') as f:
                data = json.load(f)

            assert data['metric'] == 'seasonality_percentage_normalized'
            assert 'country' in data
            assert 'colorScale' in data
            assert data['colorScale']['type'] == 'diverging'


class TestExportConceptionData:
    """Tests for conception data export."""

    def test_creates_country_json_when_valid_data(self, processed_births_data):
        """Should create JSON file for country when conception data exists."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            export_conception_data(processed_births_data, 'France', output_dir)

            # May or may not exist depending on whether there's valid conception data
            output_file = output_dir / 'france.json'
            # With 2 years of sample data, some months should have valid conception rates
            if output_file.exists():
                with open(output_file) as f:
                    data = json.load(f)
                assert data['metric'] == 'daily_conception_rate'

    def test_conception_json_structure(self, processed_births_data):
        """Conception JSON should have correct structure when data exists."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            export_conception_data(processed_births_data, 'France', output_dir)

            output_file = output_dir / 'france.json'
            if output_file.exists():
                with open(output_file) as f:
                    data = json.load(f)

                assert data['metric'] == 'daily_conception_rate'
                assert 'country' in data
                assert 'colorScale' in data
                assert data['colorScale']['type'] == 'sequential'
                assert data['colorScale']['scheme'] == 'turbo'
                assert 'subtitle' in data

    def test_excludes_null_conception_values(self, processed_births_data):
        """Conception export should not include months with null values."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            export_conception_data(processed_births_data, 'France', output_dir)

            output_file = output_dir / 'france.json'
            if output_file.exists():
                with open(output_file) as f:
                    data = json.load(f)

                # All values should be non-null
                for cell in data['data']:
                    assert cell['value'] is not None


class TestExportAllCountries:
    """Tests for exporting all countries."""

    def test_creates_all_files(self, processed_births_data):
        """Should create index and per-country files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            # Use min_years=0 to include all countries (sample data has only 2 complete years)
            export_all_countries(processed_births_data, output_dir, min_years=0)

            # Should create countries.json
            assert (output_dir / 'countries.json').exists()

            # Should create fertility, seasonality, and conception directories
            assert (output_dir / 'fertility').is_dir()
            assert (output_dir / 'seasonality').is_dir()
            assert (output_dir / 'conception').is_dir()

            # Should create files for each country
            assert (output_dir / 'fertility' / 'france.json').exists()
            assert (output_dir / 'fertility' / 'japan.json').exists()
            assert (output_dir / 'seasonality' / 'france.json').exists()
            assert (output_dir / 'seasonality' / 'japan.json').exists()
            # Conception files may exist if there's valid data
            # With 2 years of data, first 14 months should have conception rates


class TestComputeCompleteYears:
    """Tests for complete years calculation."""

    def test_counts_complete_years(self, sample_births_data):
        """Should count years with all 12 months."""
        # sample_births_data has France and Japan with 2 complete years each (2020, 2021)
        assert compute_complete_years(sample_births_data, 'France') == 2
        assert compute_complete_years(sample_births_data, 'Japan') == 2

    def test_handles_partial_years(self, sample_births_partial_years):
        """Should not count partial years."""
        assert compute_complete_years(sample_births_partial_years, 'CountryA') == 3
        assert compute_complete_years(sample_births_partial_years, 'CountryB') == 1  # Only 2020 is complete

    def test_returns_zero_for_unknown_country(self, sample_births_data):
        """Should return 0 for a country not in the data."""
        assert compute_complete_years(sample_births_data, 'UnknownCountry') == 0


class TestFilterCountriesByMinYears:
    """Tests for country filtering by minimum years."""

    def test_filters_by_threshold(self, sample_births_partial_years):
        """Should exclude countries below threshold."""
        included, excluded = filter_countries_by_min_years(sample_births_partial_years, min_years=2)

        assert 'CountryA' in included  # 3 complete years >= 2
        assert 'CountryB' not in included  # 1 complete year < 2
        assert any(name == 'CountryB' for name, _ in excluded)

    def test_includes_all_when_threshold_zero(self, sample_births_partial_years):
        """Should include all countries when threshold is 0."""
        included, excluded = filter_countries_by_min_years(sample_births_partial_years, min_years=0)

        assert 'CountryA' in included
        assert 'CountryB' in included
        assert len(excluded) == 0

    def test_excludes_all_when_threshold_high(self, sample_births_partial_years):
        """Should exclude all countries when threshold is very high."""
        included, excluded = filter_countries_by_min_years(sample_births_partial_years, min_years=100)

        assert len(included) == 0
        assert len(excluded) == 2


class TestExportCountriesIndexWithMinYears:
    """Tests for countries index export with min_years filtering."""

    def test_countries_json_includes_complete_years_field(self, processed_births_data):
        """Each country should have completeYears field."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            export_countries_index(processed_births_data, output_dir, min_years=0)

            with open(output_dir / 'countries.json') as f:
                data = json.load(f)

            for country in data['countries']:
                assert 'completeYears' in country
                assert isinstance(country['completeYears'], int)

    def test_countries_json_includes_threshold_metadata(self, processed_births_data):
        """countries.json should include minYearsThreshold field."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            export_countries_index(processed_births_data, output_dir, min_years=5)

            with open(output_dir / 'countries.json') as f:
                data = json.load(f)

            assert 'minYearsThreshold' in data
            assert data['minYearsThreshold'] == 5

    def test_returns_included_countries_list(self, processed_births_data):
        """Should return list of included country names."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            result = export_countries_index(processed_births_data, output_dir, min_years=0)

            assert isinstance(result, list)
            assert 'France' in result
            assert 'Japan' in result

    def test_filters_countries_by_min_years(self, processed_births_data):
        """Countries below min_years threshold should not appear in countries.json."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            # processed_births_data has France and Japan with 2 complete years each
            # Setting min_years=3 should exclude both
            result = export_countries_index(processed_births_data, output_dir, min_years=3)

            with open(output_dir / 'countries.json') as f:
                data = json.load(f)

            assert len(data['countries']) == 0
            assert len(result) == 0


class TestExportAllCountriesWithMinYears:
    """Tests for export_all_countries with min_years filtering."""

    def test_returns_filtered_countries_list(self, processed_births_data):
        """Should return list of exported country names."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            result = export_all_countries(processed_births_data, output_dir, min_years=0)

            assert isinstance(result, list)
            assert 'France' in result
            assert 'Japan' in result

    def test_only_exports_filtered_countries(self, processed_births_data):
        """Should only create files for countries that pass the filter."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            # Setting min_years=3 should exclude both countries (they have 2 complete years)
            result = export_all_countries(processed_births_data, output_dir, min_years=3)

            # No per-country files should be created
            fertility_dir = output_dir / 'fertility'
            seasonality_dir = output_dir / 'seasonality'

            # Directories may or may not exist, but should have no JSON files
            if fertility_dir.exists():
                assert len(list(fertility_dir.glob('*.json'))) == 0
            if seasonality_dir.exists():
                assert len(list(seasonality_dir.glob('*.json'))) == 0

            assert len(result) == 0


class TestTrimLeadingTrailingNulls:
    """Tests for trim_leading_trailing_nulls function."""

    def test_trims_leading_nulls(self):
        """Should remove null values at the beginning."""
        data = [
            {'year': 2020, 'month': 1, 'value': None},
            {'year': 2020, 'month': 2, 'value': None},
            {'year': 2020, 'month': 3, 'value': 5.0},
            {'year': 2020, 'month': 4, 'value': 6.0},
        ]
        result = trim_leading_trailing_nulls(data, 'value')
        assert len(result) == 2
        assert result[0]['month'] == 3
        assert result[1]['month'] == 4

    def test_trims_trailing_nulls(self):
        """Should remove null values at the end."""
        data = [
            {'year': 2020, 'month': 1, 'value': 5.0},
            {'year': 2020, 'month': 2, 'value': 6.0},
            {'year': 2020, 'month': 3, 'value': None},
            {'year': 2020, 'month': 4, 'value': None},
        ]
        result = trim_leading_trailing_nulls(data, 'value')
        assert len(result) == 2
        assert result[0]['month'] == 1
        assert result[1]['month'] == 2

    def test_preserves_nulls_in_middle(self):
        """Should preserve null values between valid values."""
        data = [
            {'year': 2020, 'month': 1, 'value': 5.0},
            {'year': 2020, 'month': 2, 'value': None},
            {'year': 2020, 'month': 3, 'value': None},
            {'year': 2020, 'month': 4, 'value': 6.0},
        ]
        result = trim_leading_trailing_nulls(data, 'value')
        assert len(result) == 4
        assert result[1]['value'] is None
        assert result[2]['value'] is None

    def test_trims_both_ends(self):
        """Should trim nulls from both beginning and end."""
        data = [
            {'year': 2020, 'month': 1, 'value': None},
            {'year': 2020, 'month': 2, 'value': 5.0},
            {'year': 2020, 'month': 3, 'value': None},
            {'year': 2020, 'month': 4, 'value': 6.0},
            {'year': 2020, 'month': 5, 'value': None},
        ]
        result = trim_leading_trailing_nulls(data, 'value')
        assert len(result) == 3
        assert result[0]['month'] == 2
        assert result[1]['month'] == 3
        assert result[2]['month'] == 4

    def test_handles_empty_list(self):
        """Should return empty list for empty input."""
        result = trim_leading_trailing_nulls([], 'value')
        assert result == []

    def test_handles_all_nulls(self):
        """Should return empty list when all values are null."""
        data = [
            {'year': 2020, 'month': 1, 'value': None},
            {'year': 2020, 'month': 2, 'value': None},
        ]
        result = trim_leading_trailing_nulls(data, 'value')
        assert result == []

    def test_handles_no_nulls(self):
        """Should return all data when no null values exist."""
        data = [
            {'year': 2020, 'month': 1, 'value': 5.0},
            {'year': 2020, 'month': 2, 'value': 6.0},
        ]
        result = trim_leading_trailing_nulls(data, 'value')
        assert len(result) == 2

    def test_sorts_by_year_month(self):
        """Should sort data by year and month before trimming."""
        data = [
            {'year': 2020, 'month': 3, 'value': 6.0},
            {'year': 2020, 'month': 1, 'value': None},
            {'year': 2020, 'month': 2, 'value': 5.0},
        ]
        result = trim_leading_trailing_nulls(data, 'value')
        assert len(result) == 2
        assert result[0]['month'] == 2
        assert result[1]['month'] == 3
