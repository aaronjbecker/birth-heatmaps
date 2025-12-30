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
    CONCEPTION_OUTPUT_DIR,
    JSON_OUTPUT_DIR,
    FRONTEND_ASSETS_DATA_DIR,
    FRONTEND_ASSETS_FERTILITY_DIR,
    FRONTEND_ASSETS_SEASONALITY_DIR,
    FRONTEND_ASSETS_CONCEPTION_DIR,
    MIN_YEARS_DATA,
    MIN_MONTHLY_BIRTHS,
    ensure_output_dirs,
)


def compute_complete_years(births: pl.DataFrame, country_name: str) -> int:
    """
    Count the number of complete years (all 12 months have valid fertility rate data) for a country.

    A complete year requires all 12 months to have non-null daily_fertility_rate values.
    This ensures we're counting years with actual usable data, not just rows that exist
    but have missing population data.

    Args:
        births: DataFrame with all births data
        country_name: Name of the country

    Returns:
        Number of complete years with valid fertility rate data
    """
    country_data = births.filter(pl.col('Country') == country_name)

    # Filter to only rows with valid fertility rate data
    valid_data = country_data.filter(pl.col('daily_fertility_rate').is_not_null())

    # Group by year and count unique months per year
    year_month_counts = (
        valid_data
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


def filter_countries_by_min_monthly_births(
    births: pl.DataFrame,
    min_monthly_births: int = MIN_MONTHLY_BIRTHS
) -> tuple[List[str], List[tuple[str, int]]]:
    """
    Filter countries based on minimum monthly births.

    Only countries with at least min_monthly_births in EVERY month of every year are included.
    This filters out small countries with noisy data due to low birth counts.

    Args:
        births: DataFrame with all births data (must have 'Country' and 'Births' columns)
        min_monthly_births: Minimum births required in every month

    Returns:
        Tuple of (included_countries, excluded_countries_with_min_births)
        - included_countries: List of country names that pass the filter
        - excluded_countries_with_min_births: List of (country_name, min_births) for excluded countries
    """
    all_countries = sorted(births['Country'].unique().to_list())
    included = []
    excluded = []

    for country_name in all_countries:
        country_data = births.filter(pl.col('Country') == country_name)

        # Find the minimum births in any month for this country
        min_births_value = country_data['Births'].min()

        if min_births_value is not None and min_births_value >= min_monthly_births:
            included.append(country_name)
        else:
            excluded.append((country_name, int(min_births_value) if min_births_value is not None else 0))

    return included, excluded


def export_countries_index(
    births: pl.DataFrame,
    output_dir: Optional[Path] = None,
    min_years: int = MIN_YEARS_DATA,
    min_monthly_births: int = MIN_MONTHLY_BIRTHS
) -> List[str]:
    """
    Export countries.json with metadata about available countries.

    Countries are excluded if they have:
    - Fewer than min_years complete years of data
    - Any month with fewer than min_monthly_births births

    Args:
        births: DataFrame with all births data
        output_dir: Output directory (defaults to JSON_OUTPUT_DIR)
        min_years: Minimum number of complete years required (default: MIN_YEARS_DATA)
        min_monthly_births: Minimum births required in every month (default: MIN_MONTHLY_BIRTHS)

    Returns:
        List of country names that were included (passed all filters)
    """
    if output_dir is None:
        output_dir = JSON_OUTPUT_DIR

    output_dir.mkdir(parents=True, exist_ok=True)

    # Filter countries by minimum years
    included_countries, excluded_by_years = filter_countries_by_min_years(births, min_years)

    if excluded_by_years:
        print(f"Excluding {len(excluded_by_years)} countries with fewer than {min_years} complete years:")
        for country_name, years in excluded_by_years:
            print(f"  - {country_name}: {years} complete years")

    # Filter remaining countries by minimum monthly births
    # Only check countries that passed the min_years filter
    births_filtered = births.filter(pl.col('Country').is_in(included_countries))
    included_countries, excluded_by_births = filter_countries_by_min_monthly_births(
        births_filtered, min_monthly_births
    )

    if excluded_by_births:
        print(f"Excluding {len(excluded_by_births)} countries with months below {min_monthly_births} births:")
        for country_name, min_births in excluded_by_births:
            print(f"  - {country_name}: minimum {min_births} births in a month")

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

        # Get conception year range (may differ due to edge case filtering)
        conception_data = country_data.filter(pl.col('daily_conception_rate').is_not_null())
        if len(conception_data) > 0:
            conception_min_year = int(conception_data['Year'].min())
            conception_max_year = int(conception_data['Year'].max())
            has_conception = True
        else:
            conception_min_year = min_year
            conception_max_year = max_year
            has_conception = False

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
            },
            'conception': {
                'yearRange': [conception_min_year, conception_max_year],
                'hasData': has_conception
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

    # Compute color scale domain from actual non-null values (excluding provisional data)
    # This ensures the color scale matches the actual data range
    valid_values = country_data.filter(pl.col('seasonality_percentage_normalized').is_not_null())
    if len(valid_values) > 0:
        min_val = float(valid_values['seasonality_percentage_normalized'].min())
        max_val = float(valid_values['seasonality_percentage_normalized'].max())
        center_val = 0.0833  # ~8.33% is expected for equal distribution (1/12)
        # Ensure center is between min and max for proper diverging scale
        if center_val < min_val:
            center_val = min_val
        elif center_val > max_val:
            center_val = max_val
    else:
        # Fallback to default values if no valid data
        min_val, center_val, max_val = 0.065, 0.0833, 0.10

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
            'domain': [round(min_val, 4), round(center_val, 4), round(max_val, 4)],
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


def export_conception_data(
    births: pl.DataFrame,
    country_name: str,
    output_dir: Optional[Path] = None
) -> None:
    """
    Export conception heatmap data for a single country.

    Only includes months where 10-month-future births data exists.

    Args:
        births: DataFrame with births data for the country
        country_name: Name of the country
        output_dir: Output directory (defaults to CONCEPTION_OUTPUT_DIR)
    """
    if output_dir is None:
        output_dir = CONCEPTION_OUTPUT_DIR

    output_dir.mkdir(parents=True, exist_ok=True)

    country_data = births.filter(pl.col('Country') == country_name)

    # Filter to only rows with valid conception rate (has future births data)
    valid_data = country_data.filter(pl.col('daily_conception_rate').is_not_null())

    if len(valid_data) == 0:
        print(f"  No valid conception data for {country_name}, skipping")
        return

    # Get metadata from valid data only
    years = sorted(valid_data['Year'].unique().to_list())
    sources = valid_data['Source'].unique().to_list()

    # Compute color scale domain (absolute min/max)
    # Apply floor of 1e-6 for log-scale compatibility
    min_val = max(float(valid_data['daily_conception_rate'].min()), 1e-6)
    max_val = float(valid_data['daily_conception_rate'].max())

    # Build data array (only valid rows)
    data = []
    for row in valid_data.iter_rows(named=True):
        value = row['daily_conception_rate']
        data.append({
            'year': int(row['Year']),
            'month': int(row['Month']),
            'value': round(value, 2) if value is not None else None,
            'futureBirths': int(row['future_births']) if row['future_births'] is not None else None,
            'population': int(row['childbearing_population']) if row['childbearing_population'] is not None else None,
            'source': row['Source']
        })

    output = {
        'country': {
            'code': get_country_slug(country_name),
            'name': country_name
        },
        'metric': 'daily_conception_rate',
        'title': 'Daily Conceptions Per 100k Women (Age 15-44)',
        'subtitle': 'Based on births 10 months later',
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

    print(f"Exported conception data for {country_name} to {output_path}")


def _export_country_json(args: tuple) -> str:
    """Helper function to export JSON data for a single country (for parallel execution)."""
    (births_dict, country_name, fertility_dir, seasonality_dir, conception_dir,
     frontend_fertility_dir, frontend_seasonality_dir, frontend_conception_dir) = args

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
    
    # Compute color scale domain from actual non-null values (excluding provisional data)
    valid_seasonality_values = country_data.filter(pl.col('seasonality_percentage_normalized').is_not_null())
    if len(valid_seasonality_values) > 0:
        seasonality_min_val = float(valid_seasonality_values['seasonality_percentage_normalized'].min())
        seasonality_max_val = float(valid_seasonality_values['seasonality_percentage_normalized'].max())
        seasonality_center_val = 0.0833  # ~8.33% is expected for equal distribution (1/12)
        # Ensure center is between min and max for proper diverging scale
        if seasonality_center_val < seasonality_min_val:
            seasonality_center_val = seasonality_min_val
        elif seasonality_center_val > seasonality_max_val:
            seasonality_center_val = seasonality_max_val
    else:
        # Fallback to default values if no valid data
        seasonality_min_val, seasonality_center_val, seasonality_max_val = 0.065, 0.0833, 0.10
    
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
        'colorScale': {
            'type': 'diverging',
            'domain': [
                round(seasonality_min_val, 4),
                round(seasonality_center_val, 4),
                round(seasonality_max_val, 4)
            ],
            'scheme': 'RdBu'
        },
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

    # Export conception data inline (only for rows with valid conception rate)
    valid_conception_data = country_data.filter(pl.col('daily_conception_rate').is_not_null())

    if len(valid_conception_data) > 0:
        conception_dir.mkdir(parents=True, exist_ok=True)
        conception_years = sorted(valid_conception_data['Year'].unique().to_list())

        # Compute color scale domain
        conception_min_val = max(float(valid_conception_data['daily_conception_rate'].min()), 1e-6)
        conception_max_val = float(valid_conception_data['daily_conception_rate'].max())

        conception_data = []
        for row in valid_conception_data.iter_rows(named=True):
            value = row['daily_conception_rate']
            conception_data.append({
                'year': int(row['Year']),
                'month': int(row['Month']),
                'value': round(value, 2) if value is not None else None,
                'futureBirths': int(row['future_births']) if row['future_births'] is not None else None,
                'population': int(row['childbearing_population']) if row['childbearing_population'] is not None else None,
                'source': row['Source']
            })

        conception_output = {
            'country': {'code': get_country_slug(country_name), 'name': country_name},
            'metric': 'daily_conception_rate',
            'title': 'Daily Conceptions Per 100k Women (Age 15-44)',
            'subtitle': 'Based on births 10 months later',
            'colorScale': {
                'type': 'sequential',
                'domain': [round(conception_min_val, 1), round(conception_max_val, 1)],
                'scheme': 'turbo'
            },
            'years': [int(y) for y in conception_years],
            'months': MONTH_NAMES,
            'data': conception_data,
            'sources': sources,
            'generatedAt': datetime.utcnow().isoformat() + 'Z'
        }

        conception_filename = f'{get_country_slug(country_name)}.json'
        with open(conception_dir / conception_filename, 'w') as f:
            json.dump(conception_output, f)

        # Also export to frontend assets
        frontend_conception_dir.mkdir(parents=True, exist_ok=True)
        with open(frontend_conception_dir / conception_filename, 'w') as f:
            json.dump(conception_output, f)

    return country_name


def export_all_countries(
    births: pl.DataFrame,
    output_dir: Optional[Path] = None,
    max_workers: Optional[int] = None,
    min_years: int = MIN_YEARS_DATA,
    min_monthly_births: int = MIN_MONTHLY_BIRTHS
) -> List[str]:
    """
    Export all data for all countries in parallel.

    Args:
        births: DataFrame with all births data
        output_dir: Base output directory (defaults to JSON_OUTPUT_DIR)
        max_workers: Maximum number of parallel workers (defaults to CPU count)
        min_years: Minimum number of complete years required (default: MIN_YEARS_DATA)
        min_monthly_births: Minimum births required in every month (default: MIN_MONTHLY_BIRTHS)

    Returns:
        List of country names that were exported (passed all filters)
    """
    if output_dir is None:
        output_dir = JSON_OUTPUT_DIR

    if max_workers is None:
        max_workers = min(os.cpu_count() or 4, 8)  # Cap at 8 workers

    # Ensure output directories exist
    ensure_output_dirs()

    # Export countries index and get filtered country list
    countries = export_countries_index(births, output_dir, min_years, min_monthly_births)

    # Prepare for parallel export (only for filtered countries)
    fertility_dir = output_dir / 'fertility'
    seasonality_dir = output_dir / 'seasonality'
    conception_dir = output_dir / 'conception'

    # Convert DataFrame to dict for pickling (needed for multiprocessing)
    births_dict = births.to_dict()

    # Create args for each country (including frontend assets directories)
    export_args = [
        (births_dict, country_name, fertility_dir, seasonality_dir, conception_dir,
         FRONTEND_ASSETS_FERTILITY_DIR, FRONTEND_ASSETS_SEASONALITY_DIR, FRONTEND_ASSETS_CONCEPTION_DIR)
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
