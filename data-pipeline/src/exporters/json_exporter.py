"""
JSON exporter for frontend consumption.

Exports processed data to JSON files for the Astro frontend.
"""
import json
import os
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
import polars as pl

from config import (
    MONTH_NAMES,
    DATA_SOURCE_URLS,
    get_country_slug,
    FERTILITY_OUTPUT_DIR,
    SEASONALITY_OUTPUT_DIR,
    JSON_OUTPUT_DIR,
    FRONTEND_ASSETS_DATA_DIR,
    FRONTEND_ASSETS_FERTILITY_DIR,
    FRONTEND_ASSETS_SEASONALITY_DIR,
    MIN_YEARS_DATA,
    ensure_output_dirs,
)


def compute_complete_years(births: pl.DataFrame, country_name: str) -> int:
    """
    Count the number of complete years (all 12 months have data) for a country.

    Args:
        births: DataFrame with all births data
        country_name: Name of the country

    Returns:
        Number of complete years
    """
    country_data = births.filter(pl.col('Country') == country_name)

    # Group by year and count unique months per year
    year_month_counts = (
        country_data
        .group_by('Year')
        .agg(pl.col('Month').n_unique().alias('month_count'))
    )

    # Count years with exactly 12 months
    complete_years = year_month_counts.filter(pl.col('month_count') == 12).height

    return complete_years


def filter_countries_by_min_years(
    births: pl.DataFrame,
    min_years: int = MIN_YEARS_DATA
) -> tuple[List[str], List[tuple[str, int]]]:
    """
    Filter countries based on minimum years of complete data.

    Args:
        births: DataFrame with all births data
        min_years: Minimum number of complete years required

    Returns:
        Tuple of (included_countries, excluded_countries_with_counts)
        - included_countries: List of country names that pass the filter
        - excluded_countries_with_counts: List of (country_name, complete_years) for excluded countries
    """
    all_countries = sorted(births['Country'].unique().to_list())
    included = []
    excluded = []

    for country_name in all_countries:
        complete_years = compute_complete_years(births, country_name)
        if complete_years >= min_years:
            included.append(country_name)
        else:
            excluded.append((country_name, complete_years))

    return included, excluded


def export_countries_index(
    births: pl.DataFrame,
    output_dir: Optional[Path] = None,
    min_years: int = MIN_YEARS_DATA
) -> List[str]:
    """
    Export countries.json with metadata about available countries.

    Countries with fewer than min_years complete years of data are excluded.

    Args:
        births: DataFrame with all births data
        output_dir: Output directory (defaults to JSON_OUTPUT_DIR)
        min_years: Minimum number of complete years required (default: MIN_YEARS_DATA)

    Returns:
        List of country names that were included (passed the filter)
    """
    if output_dir is None:
        output_dir = JSON_OUTPUT_DIR

    output_dir.mkdir(parents=True, exist_ok=True)

    # Filter countries by minimum years
    included_countries, excluded_countries = filter_countries_by_min_years(births, min_years)

    if excluded_countries:
        print(f"Excluding {len(excluded_countries)} countries with fewer than {min_years} complete years:")
        for country_name, years in excluded_countries:
            print(f"  - {country_name}: {years} complete years")

    countries = []
    for country_name in included_countries:
        country_data = births.filter(pl.col('Country') == country_name)

        # Get year range
        min_year = int(country_data['Year'].min())
        max_year = int(country_data['Year'].max())

        # Get sources used
        sources = country_data['Source'].unique().to_list()

        # Get complete years count for metadata
        complete_years = compute_complete_years(births, country_name)

        countries.append({
            'code': get_country_slug(country_name),
            'name': country_name,
            'sources': sources,
            'completeYears': complete_years,
            'fertility': {
                'yearRange': [min_year, max_year],
                'hasData': True
            },
            'seasonality': {
                'yearRange': [min_year, max_year],
                'hasData': True
            }
        })

    output = {
        'countries': countries,
        'dataSources': {
            source: {
                'name': source,
                'url': DATA_SOURCE_URLS.get(source)
            }
            for source in ['HMD', 'UN', 'JPOP']
        },
        'minYearsThreshold': min_years,
        'generatedAt': datetime.utcnow().isoformat() + 'Z'
    }

    output_path = output_dir / 'countries.json'
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)

    # Also export to frontend assets for Vite imports
    frontend_assets_path = FRONTEND_ASSETS_DATA_DIR / 'countries.json'
    frontend_assets_path.parent.mkdir(parents=True, exist_ok=True)
    with open(frontend_assets_path, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"Exported {len(included_countries)} countries to {output_path} and {frontend_assets_path}")

    return included_countries


def export_fertility_data(
    births: pl.DataFrame,
    country_name: str,
    output_dir: Optional[Path] = None
) -> None:
    """
    Export fertility heatmap data for a single country.

    Args:
        births: DataFrame with births data for the country
        country_name: Name of the country
        output_dir: Output directory (defaults to FERTILITY_OUTPUT_DIR)
    """
    if output_dir is None:
        output_dir = FERTILITY_OUTPUT_DIR

    output_dir.mkdir(parents=True, exist_ok=True)

    country_data = births.filter(pl.col('Country') == country_name)

    # Get metadata
    years = sorted(country_data['Year'].unique().to_list())
    sources = country_data['Source'].unique().to_list()

    # Compute color scale domain (absolute min/max to match Python heatmap plotting)
    # Apply floor of 1e-6 for log-scale compatibility
    valid_values = country_data.filter(pl.col('daily_fertility_rate').is_not_null())
    if len(valid_values) > 0:
        min_val = max(float(valid_values['daily_fertility_rate'].min()), 1e-6)
        max_val = float(valid_values['daily_fertility_rate'].max())
    else:
        min_val, max_val = 1e-6, 10

    # Build data array
    data = []
    for row in country_data.iter_rows(named=True):
        value = row['daily_fertility_rate']
        data.append({
            'year': int(row['Year']),
            'month': int(row['Month']),
            'value': round(value, 2) if value is not None else None,
            'births': int(row['Births']) if row['Births'] is not None else None,
            'population': int(row['childbearing_population']) if row['childbearing_population'] is not None else None,
            'source': row['Source']
        })

    output = {
        'country': {
            'code': get_country_slug(country_name),
            'name': country_name
        },
        'metric': 'daily_fertility_rate',
        'title': 'Daily Births Per 100k Women (Age 15-44)',
        'colorScale': {
            'type': 'sequential',
            'domain': [round(min_val, 1), round(max_val, 1)],
            'scheme': 'turbo'
        },
        'years': [int(y) for y in years],
        'months': MONTH_NAMES,
        'data': data,
        'sources': sources,
        'generatedAt': datetime.utcnow().isoformat() + 'Z'
    }

    output_path = output_dir / f'{get_country_slug(country_name)}.json'
    with open(output_path, 'w') as f:
        json.dump(output, f)

    print(f"Exported fertility data for {country_name} to {output_path}")


def export_seasonality_data(
    births: pl.DataFrame,
    country_name: str,
    output_dir: Optional[Path] = None
) -> None:
    """
    Export seasonality heatmap data for a single country.

    Args:
        births: DataFrame with births data for the country
        country_name: Name of the country
        output_dir: Output directory (defaults to SEASONALITY_OUTPUT_DIR)
    """
    if output_dir is None:
        output_dir = SEASONALITY_OUTPUT_DIR

    output_dir.mkdir(parents=True, exist_ok=True)

    country_data = births.filter(pl.col('Country') == country_name)

    # Get metadata
    years = sorted(country_data['Year'].unique().to_list())
    sources = country_data['Source'].unique().to_list()

    # Build data array
    data = []
    for row in country_data.iter_rows(named=True):
        value = row['seasonality_percentage_normalized']
        data.append({
            'year': int(row['Year']),
            'month': int(row['Month']),
            'value': round(value, 4) if value is not None else None,
            'formattedValue': f"{value * 100:.1f}%" if value is not None else None,
            'source': row['Source']
        })

    output = {
        'country': {
            'code': get_country_slug(country_name),
            'name': country_name
        },
        'metric': 'seasonality_percentage_normalized',
        'title': 'Percentage of Annual Live Births',
        'subtitle': 'Normalized to 30-day months and 360-day years',
        'colorScale': {
            'type': 'diverging',
            'domain': [0.065, 0.0833, 0.10],  # ~8.33% is expected for equal distribution
            'scheme': 'RdBu'
        },
        'years': [int(y) for y in years],
        'months': MONTH_NAMES,
        'data': data,
        'sources': sources,
        'generatedAt': datetime.utcnow().isoformat() + 'Z'
    }

    output_path = output_dir / f'{get_country_slug(country_name)}.json'
    with open(output_path, 'w') as f:
        json.dump(output, f)

    print(f"Exported seasonality data for {country_name} to {output_path}")


def _export_country_json(args: tuple) -> str:
    """Helper function to export JSON data for a single country (for parallel execution)."""
    births_dict, country_name, fertility_dir, seasonality_dir, frontend_fertility_dir, frontend_seasonality_dir = args

    # Reconstruct DataFrame from dict for this country
    births = pl.DataFrame(births_dict)
    country_data = births.filter(pl.col('Country') == country_name)

    # Export fertility data inline (avoid function call overhead)
    fertility_dir.mkdir(parents=True, exist_ok=True)
    years = sorted(country_data['Year'].unique().to_list())
    sources = country_data['Source'].unique().to_list()

    # Compute color scale domain (absolute min/max to match Python heatmap plotting)
    # Apply floor of 1e-6 for log-scale compatibility
    valid_values = country_data.filter(pl.col('daily_fertility_rate').is_not_null())
    if len(valid_values) > 0:
        min_val = max(float(valid_values['daily_fertility_rate'].min()), 1e-6)
        max_val = float(valid_values['daily_fertility_rate'].max())
    else:
        min_val, max_val = 1e-6, 10

    fertility_data = []
    for row in country_data.iter_rows(named=True):
        value = row['daily_fertility_rate']
        fertility_data.append({
            'year': int(row['Year']),
            'month': int(row['Month']),
            'value': round(value, 2) if value is not None else None,
            'births': int(row['Births']) if row['Births'] is not None else None,
            'population': int(row['childbearing_population']) if row['childbearing_population'] is not None else None,
            'source': row['Source']
        })

    fertility_output = {
        'country': {'code': get_country_slug(country_name), 'name': country_name},
        'metric': 'daily_fertility_rate',
        'title': 'Daily Births Per 100k Women (Age 15-44)',
        'colorScale': {'type': 'sequential', 'domain': [round(min_val, 1), round(max_val, 1)], 'scheme': 'turbo'},
        'years': [int(y) for y in years],
        'months': MONTH_NAMES,
        'data': fertility_data,
        'sources': sources,
        'generatedAt': datetime.utcnow().isoformat() + 'Z'
    }

    fertility_filename = f'{get_country_slug(country_name)}.json'
    with open(fertility_dir / fertility_filename, 'w') as f:
        json.dump(fertility_output, f)

    # Also export to frontend assets
    frontend_fertility_dir.mkdir(parents=True, exist_ok=True)
    with open(frontend_fertility_dir / fertility_filename, 'w') as f:
        json.dump(fertility_output, f)

    # Export seasonality data inline
    seasonality_dir.mkdir(parents=True, exist_ok=True)
    seasonality_data = []
    for row in country_data.iter_rows(named=True):
        value = row['seasonality_percentage_normalized']
        seasonality_data.append({
            'year': int(row['Year']),
            'month': int(row['Month']),
            'value': round(value, 4) if value is not None else None,
            'formattedValue': f"{value * 100:.1f}%" if value is not None else None,
            'source': row['Source']
        })

    seasonality_output = {
        'country': {'code': get_country_slug(country_name), 'name': country_name},
        'metric': 'seasonality_percentage_normalized',
        'title': 'Percentage of Annual Live Births',
        'subtitle': 'Normalized to 30-day months and 360-day years',
        'colorScale': {'type': 'diverging', 'domain': [0.065, 0.0833, 0.10], 'scheme': 'RdBu'},
        'years': [int(y) for y in years],
        'months': MONTH_NAMES,
        'data': seasonality_data,
        'sources': sources,
        'generatedAt': datetime.utcnow().isoformat() + 'Z'
    }

    seasonality_filename = f'{get_country_slug(country_name)}.json'
    with open(seasonality_dir / seasonality_filename, 'w') as f:
        json.dump(seasonality_output, f)

    # Also export to frontend assets
    frontend_seasonality_dir.mkdir(parents=True, exist_ok=True)
    with open(frontend_seasonality_dir / seasonality_filename, 'w') as f:
        json.dump(seasonality_output, f)

    return country_name


def export_all_countries(
    births: pl.DataFrame,
    output_dir: Optional[Path] = None,
    max_workers: Optional[int] = None,
    min_years: int = MIN_YEARS_DATA
) -> List[str]:
    """
    Export all data for all countries in parallel.

    Args:
        births: DataFrame with all births data
        output_dir: Base output directory (defaults to JSON_OUTPUT_DIR)
        max_workers: Maximum number of parallel workers (defaults to CPU count)
        min_years: Minimum number of complete years required (default: MIN_YEARS_DATA)

    Returns:
        List of country names that were exported (passed the filter)
    """
    if output_dir is None:
        output_dir = JSON_OUTPUT_DIR

    if max_workers is None:
        max_workers = min(os.cpu_count() or 4, 8)  # Cap at 8 workers

    # Ensure output directories exist
    ensure_output_dirs()

    # Export countries index and get filtered country list
    countries = export_countries_index(births, output_dir, min_years)

    # Prepare for parallel export (only for filtered countries)
    fertility_dir = output_dir / 'fertility'
    seasonality_dir = output_dir / 'seasonality'

    # Convert DataFrame to dict for pickling (needed for multiprocessing)
    births_dict = births.to_dict()

    # Create args for each country (including frontend assets directories)
    export_args = [
        (births_dict, country_name, fertility_dir, seasonality_dir,
         FRONTEND_ASSETS_FERTILITY_DIR, FRONTEND_ASSETS_SEASONALITY_DIR)
        for country_name in countries
    ]

    # Export in parallel using threads (I/O bound)
    print(f"Exporting JSON data for {len(countries)} countries using {max_workers} workers...")
    completed = 0
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(_export_country_json, args): args[1] for args in export_args}
        for future in as_completed(futures):
            country_name = futures[future]
            try:
                future.result()
                completed += 1
                if completed % 20 == 0:
                    print(f"  Exported {completed}/{len(countries)} countries...")
            except Exception as e:
                print(f"  Error exporting {country_name}: {e}")

    print(f"\nExported data for {len(countries)} countries")

    return countries
