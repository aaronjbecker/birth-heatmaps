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
    ensure_output_dirs,
)


def export_countries_index(
    births: pl.DataFrame,
    output_dir: Optional[Path] = None
) -> None:
    """
    Export countries.json with metadata about available countries.

    Args:
        births: DataFrame with all births data
        output_dir: Output directory (defaults to JSON_OUTPUT_DIR)
    """
    if output_dir is None:
        output_dir = JSON_OUTPUT_DIR

    output_dir.mkdir(parents=True, exist_ok=True)

    countries = []
    for country_name in sorted(births['Country'].unique().to_list()):
        country_data = births.filter(pl.col('Country') == country_name)

        # Get year range
        min_year = int(country_data['Year'].min())
        max_year = int(country_data['Year'].max())

        # Get sources used
        sources = country_data['Source'].unique().to_list()

        countries.append({
            'code': get_country_slug(country_name),
            'name': country_name,
            'sources': sources,
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
        'generatedAt': datetime.utcnow().isoformat() + 'Z'
    }

    output_path = output_dir / 'countries.json'
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"Exported countries index to {output_path}")


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

    # Compute color scale domain (5th and 95th percentile)
    valid_values = country_data.filter(pl.col('daily_fertility_rate').is_not_null())
    if len(valid_values) > 0:
        min_val = float(valid_values['daily_fertility_rate'].quantile(0.05))
        max_val = float(valid_values['daily_fertility_rate'].quantile(0.95))
    else:
        min_val, max_val = 0, 10

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
    births_dict, country_name, fertility_dir, seasonality_dir = args

    # Reconstruct DataFrame from dict for this country
    births = pl.DataFrame(births_dict)
    country_data = births.filter(pl.col('Country') == country_name)

    # Export fertility data inline (avoid function call overhead)
    fertility_dir.mkdir(parents=True, exist_ok=True)
    years = sorted(country_data['Year'].unique().to_list())
    sources = country_data['Source'].unique().to_list()

    valid_values = country_data.filter(pl.col('daily_fertility_rate').is_not_null())
    if len(valid_values) > 0:
        min_val = float(valid_values['daily_fertility_rate'].quantile(0.05))
        max_val = float(valid_values['daily_fertility_rate'].quantile(0.95))
    else:
        min_val, max_val = 0, 10

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

    with open(fertility_dir / f'{get_country_slug(country_name)}.json', 'w') as f:
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

    with open(seasonality_dir / f'{get_country_slug(country_name)}.json', 'w') as f:
        json.dump(seasonality_output, f)

    return country_name


def export_all_countries(births: pl.DataFrame, output_dir: Optional[Path] = None, max_workers: Optional[int] = None) -> None:
    """
    Export all data for all countries in parallel.

    Args:
        births: DataFrame with all births data
        output_dir: Base output directory (defaults to JSON_OUTPUT_DIR)
        max_workers: Maximum number of parallel workers (defaults to CPU count)
    """
    if output_dir is None:
        output_dir = JSON_OUTPUT_DIR

    if max_workers is None:
        max_workers = min(os.cpu_count() or 4, 8)  # Cap at 8 workers

    # Ensure output directories exist
    ensure_output_dirs()

    # Export countries index (quick, do first)
    export_countries_index(births, output_dir)

    # Prepare for parallel export
    countries = births['Country'].unique().to_list()
    fertility_dir = output_dir / 'fertility'
    seasonality_dir = output_dir / 'seasonality'

    # Convert DataFrame to dict for pickling (needed for multiprocessing)
    births_dict = births.to_dict()

    # Create args for each country
    export_args = [
        (births_dict, country_name, fertility_dir, seasonality_dir)
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
