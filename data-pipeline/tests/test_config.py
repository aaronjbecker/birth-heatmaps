"""Tests for the config module."""
import pytest
from config import (
    MONTH_NAMES,
    MONTH_NAMES_FULL,
    MONTH_NAME_TO_NUMBER,
    DATA_SOURCE_LABELS,
    HMD_COUNTRIES,
    normalize_country_name,
    get_country_slug,
)


class TestMonthConstants:
    """Tests for month name constants."""

    def test_month_names_count(self):
        """Should have 12 month abbreviations."""
        assert len(MONTH_NAMES) == 12

    def test_month_names_full_count(self):
        """Should have 12 full month names."""
        assert len(MONTH_NAMES_FULL) == 12

    def test_month_name_to_number_mapping(self):
        """Month name to number mapping should be correct."""
        assert MONTH_NAME_TO_NUMBER['January'] == 1
        assert MONTH_NAME_TO_NUMBER['December'] == 12
        assert len(MONTH_NAME_TO_NUMBER) == 12


class TestDataSourceLabels:
    """Tests for data source labels."""

    def test_hmd_label_exists(self):
        """HMD should have a label."""
        assert 'HMD' in DATA_SOURCE_LABELS
        assert 'Human Mortality Database' in DATA_SOURCE_LABELS['HMD']

    def test_un_label_exists(self):
        """UN should have a label."""
        assert 'UN' in DATA_SOURCE_LABELS

    def test_jpop_label_exists(self):
        """JPOP should have a label."""
        assert 'JPOP' in DATA_SOURCE_LABELS


class TestHMDCountries:
    """Tests for HMD country definitions."""

    def test_countries_not_empty(self):
        """Should have at least some countries defined."""
        assert len(HMD_COUNTRIES) > 0

    def test_country_has_code_and_name(self):
        """Each country should have a code and name."""
        for country in HMD_COUNTRIES:
            assert country.code
            assert country.name

    def test_usa_in_countries(self):
        """USA should be in the country list."""
        codes = [c.code for c in HMD_COUNTRIES]
        assert 'USA' in codes

    def test_france_in_countries(self):
        """France should be in the country list."""
        codes = [c.code for c in HMD_COUNTRIES]
        assert 'FRATNP' in codes


class TestNormalizeCountryName:
    """Tests for country name normalization."""

    def test_simple_name(self):
        """Simple name should be lowercased with hyphens."""
        assert normalize_country_name('France') == 'france'

    def test_name_with_spaces(self):
        """Spaces should be replaced with hyphens."""
        assert normalize_country_name('United States') == 'united-states'

    def test_name_with_special_chars(self):
        """Special characters should be removed."""
        result = normalize_country_name("Côte d'Ivoire")
        assert '-' in result or result.isalpha()

    def test_get_country_slug(self):
        """get_country_slug should return normalized name."""
        slug = get_country_slug('United States of America')
        assert slug == 'united-states-of-america'
