"""
JSON exporter for frontend consumption.

Exports processed data to JSON files for the Astro frontend.
"""
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
import polars as pl

from ..config import (
    MONTH_NAMES,
    DATA_SOURCE_URLS,
    get_country_slug,
    FERTILITY_OUTPUT_DIR,
    SEASONALITY_OUTPUT_DIR,
    OUTPUT_DIR,
)


def export_countries_index(
    births: pl.DataFrame,
    output_dir: Optional[Path] = None
) -> None:
    """
    Export countries.json with metadata about available countries.

    Args:
        births: DataFrame with all births data
        output_dir: Output directory (defaults to OUTPUT_DIR)
    """
    if output_dir is None:
        output_dir = OUTPUT_DIR

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


def export_all_countries(births: pl.DataFrame, output_dir: Optional[Path] = None) -> None:
    """
    Export all data for all countries.

    Args:
        births: DataFrame with all births data
        output_dir: Base output directory (defaults to OUTPUT_DIR)
    """
    if output_dir is None:
        output_dir = OUTPUT_DIR

    # Export countries index
    export_countries_index(births, output_dir)

    # Export per-country data
    countries = births['Country'].unique().to_list()
    for country_name in countries:
        export_fertility_data(
            births,
            country_name,
            output_dir / 'fertility'
        )
        export_seasonality_data(
            births,
            country_name,
            output_dir / 'seasonality'
        )

    print(f"\nExported data for {len(countries)} countries")
