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
)
from exporters import (
    export_countries_index,
    export_fertility_data,
    export_seasonality_data,
    export_all_countries,
)


@pytest.fixture
def processed_births_data(sample_births_data, sample_population_data):
    """Fully processed births data for testing exports."""
    births = create_births_monthly_index(sample_births_data)
    population = interpolate_population(sample_population_data)
    births = compute_fertility_rates(births, population)
    births = compute_seasonality(births)
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


class TestExportAllCountries:
    """Tests for exporting all countries."""

    def test_creates_all_files(self, processed_births_data):
        """Should create index and per-country files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            export_all_countries(processed_births_data, output_dir)

            # Should create countries.json
            assert (output_dir / 'countries.json').exists()

            # Should create fertility and seasonality directories
            assert (output_dir / 'fertility').is_dir()
            assert (output_dir / 'seasonality').is_dir()

            # Should create files for each country
            assert (output_dir / 'fertility' / 'france.json').exists()
            assert (output_dir / 'fertility' / 'japan.json').exists()
            assert (output_dir / 'seasonality' / 'france.json').exists()
            assert (output_dir / 'seasonality' / 'japan.json').exists()
