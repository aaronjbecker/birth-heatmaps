"""
States exporter for frontend consumption.

Exports processed US state-level data to JSON files for the Astro frontend.
Maintains separate structure from country data (states.json vs countries.json).
Output directories are nested under /states/ subdirectories.
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
    MONTH_NAMES_FULL,
    STATES_DATA_SOURCE_URLS,
    get_country_slug,
    JSON_OUTPUT_DIR,
    STATES_FERTILITY_OUTPUT_DIR,
    STATES_SEASONALITY_OUTPUT_DIR,
    STATES_CONCEPTION_OUTPUT_DIR,
    STATES_MONTHLY_FERTILITY_OUTPUT_DIR,
    FRONTEND_ASSETS_DATA_DIR,
    FRONTEND_ASSETS_STATES_FERTILITY_DIR,
    FRONTEND_ASSETS_STATES_SEASONALITY_DIR,
    FRONTEND_ASSETS_STATES_CONCEPTION_DIR,
    FRONTEND_ASSETS_STATES_MONTHLY_FERTILITY_DIR,
    FRONTEND_PUBLIC_DATA_DIR,
    FRONTEND_PUBLIC_STATES_FERTILITY_DIR,
    FRONTEND_PUBLIC_STATES_SEASONALITY_DIR,
    FRONTEND_PUBLIC_STATES_CONCEPTION_DIR,
    FRONTEND_PUBLIC_STATES_MONTHLY_FERTILITY_DIR,
    MIN_YEARS_DATA,
    MIN_MONTHLY_BIRTHS,
    ensure_output_dirs,
)


def get_state_slug(state_name: str) -> str:
    """
    Get a URL-safe slug for a state name.

    Reuses the same normalization as countries for consistency.
    Examples: "California" -> "california", "New York" -> "new-york"
    """
    return get_country_slug(state_name)


def trim_leading_trailing_nulls(data: List[Dict[str, Any]], value_key: str = 'value') -> List[Dict[str, Any]]:
    """
    Remove leading and trailing entries with null values from data array.

    Like stripping whitespace from a string - null values in the middle are preserved,
    but null values at the beginning or end are removed.
    """
    if not data:
        return data

    sorted_data = sorted(data, key=lambda x: (x['year'], x['month']))

    first_valid = None
    for i, item in enumerate(sorted_data):
        if item.get(value_key) is not None:
            first_valid = i
            break

    if first_valid is None:
        return []

    last_valid = None
    for i in range(len(sorted_data) - 1, -1, -1):
        if sorted_data[i].get(value_key) is not None:
            last_valid = i
            break

    return sorted_data[first_valid:last_valid + 1]


def compute_complete_years(births: pl.DataFrame, state_name: str) -> int:
    """
    Count the number of complete years (all 12 months have valid fertility rate data) for a state.
    """
    state_data = births.filter(pl.col('Country') == state_name)
    valid_data = state_data.filter(pl.col('daily_fertility_rate').is_not_null())

    year_month_counts = (
        valid_data
        .group_by('Year')
        .agg(pl.col('Month').n_unique().alias('month_count'))
    )

    complete_years = year_month_counts.filter(pl.col('month_count') == 12).height
    return complete_years


def filter_states_by_min_years(
    births: pl.DataFrame,
    min_years: int = MIN_YEARS_DATA
) -> tuple[List[str], List[tuple[str, int]]]:
    """Filter states based on minimum years of complete data."""
    all_states = sorted(births['Country'].unique().to_list())
    included = []
    excluded = []

    for state_name in all_states:
        complete_years = compute_complete_years(births, state_name)
        if complete_years >= min_years:
            included.append(state_name)
        else:
            excluded.append((state_name, complete_years))

    return included, excluded


def filter_states_by_min_monthly_births(
    births: pl.DataFrame,
    min_monthly_births: int = MIN_MONTHLY_BIRTHS
) -> tuple[List[str], List[tuple[str, int]]]:
    """Filter states based on minimum monthly births."""
    all_states = sorted(births['Country'].unique().to_list())
    included = []
    excluded = []

    for state_name in all_states:
        state_data = births.filter(pl.col('Country') == state_name)
        min_births_value = state_data['Births'].min()

        if min_births_value is not None and min_births_value >= min_monthly_births:
            included.append(state_name)
        else:
            excluded.append((state_name, int(min_births_value) if min_births_value is not None else 0))

    return included, excluded


def export_states_index(
    births: pl.DataFrame,
    output_dir: Optional[Path] = None,
    min_years: int = MIN_YEARS_DATA,
    min_monthly_births: int = MIN_MONTHLY_BIRTHS
) -> List[str]:
    """
    Export states.json with metadata about available US states.

    Analogous to export_countries_index but for state-level data.

    Args:
        births: DataFrame with state data (Country column contains state names)
        output_dir: Output directory (defaults to JSON_OUTPUT_DIR)
        min_years: Minimum number of complete years required
        min_monthly_births: Minimum births required in every month

    Returns:
        List of state names that were included (passed all filters)
    """
    if output_dir is None:
        output_dir = JSON_OUTPUT_DIR

    output_dir.mkdir(parents=True, exist_ok=True)

    # Filter states by minimum years
    included_states, excluded_by_years = filter_states_by_min_years(births, min_years)

    if excluded_by_years:
        print(f"Excluding {len(excluded_by_years)} states with fewer than {min_years} complete years:")
        for state_name, years in excluded_by_years:
            print(f"  - {state_name}: {years} complete years")

    # Filter remaining states by minimum monthly births
    births_filtered = births.filter(pl.col('Country').is_in(included_states))
    included_states, excluded_by_births = filter_states_by_min_monthly_births(
        births_filtered, min_monthly_births
    )

    if excluded_by_births:
        print(f"Excluding {len(excluded_by_births)} states with months below {min_monthly_births} births:")
        for state_name, min_births in excluded_by_births:
            print(f"  - {state_name}: minimum {min_births} births in a month")

    states = []
    for state_name in included_states:
        state_data = births.filter(pl.col('Country') == state_name)

        # Get year range
        min_year = int(state_data['Year'].min())
        max_year = int(state_data['Year'].max())

        # Get sources used
        sources = state_data['Source'].unique().to_list()

        # Get complete years count
        complete_years = compute_complete_years(births, state_name)

        # Get conception year range (may differ due to edge case filtering)
        conception_data = state_data.filter(pl.col('daily_conception_rate').is_not_null())
        if len(conception_data) > 0:
            conception_min_year = int(conception_data['Year'].min())
            conception_max_year = int(conception_data['Year'].max())
            has_conception = True
        else:
            conception_min_year = min_year
            conception_max_year = max_year
            has_conception = False

        states.append({
            'code': get_state_slug(state_name),
            'name': state_name,
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
        'states': states,
        'dataSources': {
            source: {
                'name': source,
                'url': STATES_DATA_SOURCE_URLS.get(source)
            }
            for source in ['CDC', 'Historical', 'Census', 'NHGIS']
        },
        'minYearsThreshold': min_years,
        'generatedAt': datetime.utcnow().isoformat() + 'Z'
    }

    # Write to output directory
    output_path = output_dir / 'states.json'
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)

    # Write to frontend assets
    frontend_assets_path = FRONTEND_ASSETS_DATA_DIR / 'states.json'
    frontend_assets_path.parent.mkdir(parents=True, exist_ok=True)
    with open(frontend_assets_path, 'w') as f:
        json.dump(output, f, indent=2)

    # Write to frontend public
    frontend_public_path = FRONTEND_PUBLIC_DATA_DIR / 'states.json'
    frontend_public_path.parent.mkdir(parents=True, exist_ok=True)
    with open(frontend_public_path, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"Exported {len(included_states)} states to {output_path}, {frontend_assets_path}, and {frontend_public_path}")

    return included_states


def _export_state_json(args: tuple) -> str:
    """Helper function to export JSON data for a single state (for parallel execution)."""
    (births_dict, state_name, fertility_dir, seasonality_dir, conception_dir,
     monthly_fertility_dir,
     frontend_fertility_dir, frontend_seasonality_dir, frontend_conception_dir,
     frontend_monthly_fertility_dir,
     public_fertility_dir, public_seasonality_dir, public_conception_dir,
     public_monthly_fertility_dir) = args

    # Reconstruct DataFrame from dict for this state
    births = pl.DataFrame(births_dict)
    state_data = births.filter(pl.col('Country') == state_name)

    # Get metadata
    years = sorted(state_data['Year'].unique().to_list())
    sources = state_data['Source'].unique().to_list()
    state_slug = get_state_slug(state_name)

    # --- Export fertility data ---
    fertility_dir.mkdir(parents=True, exist_ok=True)

    valid_fertility = state_data.filter(pl.col('daily_fertility_rate').is_not_null())
    if len(valid_fertility) > 0:
        min_val = max(float(valid_fertility['daily_fertility_rate'].min()), 1e-6)
        max_val = float(valid_fertility['daily_fertility_rate'].max())
    else:
        min_val, max_val = 1e-6, 10

    fertility_data = []
    for row in state_data.iter_rows(named=True):
        value = row['daily_fertility_rate']
        fertility_data.append({
            'year': int(row['Year']),
            'month': int(row['Month']),
            'value': round(value, 2) if value is not None else None,
            'births': int(row['Births']) if row['Births'] is not None else None,
            'population': int(row['childbearing_population']) if row['childbearing_population'] is not None else None,
            'source': row['Source']
        })

    fertility_data = trim_leading_trailing_nulls(fertility_data, 'value')
    fertility_years = sorted(set(item['year'] for item in fertility_data)) if fertility_data else years

    fertility_output = {
        'state': {'code': state_slug, 'name': state_name},
        'metric': 'daily_fertility_rate',
        'title': 'Daily Births Per 100k Women (Age 15-44)',
        'colorScale': {'type': 'sequential', 'domain': [round(min_val, 1), round(max_val, 1)], 'scheme': 'turbo'},
        'years': [int(y) for y in fertility_years],
        'months': MONTH_NAMES,
        'data': fertility_data,
        'sources': sources,
        'generatedAt': datetime.utcnow().isoformat() + 'Z'
    }

    fertility_filename = f'{state_slug}.json'
    with open(fertility_dir / fertility_filename, 'w') as f:
        json.dump(fertility_output, f)

    frontend_fertility_dir.mkdir(parents=True, exist_ok=True)
    with open(frontend_fertility_dir / fertility_filename, 'w') as f:
        json.dump(fertility_output, f)

    public_fertility_dir.mkdir(parents=True, exist_ok=True)
    with open(public_fertility_dir / fertility_filename, 'w') as f:
        json.dump(fertility_output, f)

    # --- Export seasonality data ---
    seasonality_dir.mkdir(parents=True, exist_ok=True)

    valid_seasonality = state_data.filter(pl.col('seasonality_percentage_normalized').is_not_null())
    if len(valid_seasonality) > 0:
        seasonality_min_val = float(valid_seasonality['seasonality_percentage_normalized'].min())
        seasonality_max_val = float(valid_seasonality['seasonality_percentage_normalized'].max())
        seasonality_center_val = 0.0833
        if seasonality_center_val < seasonality_min_val:
            seasonality_center_val = seasonality_min_val
        elif seasonality_center_val > seasonality_max_val:
            seasonality_center_val = seasonality_max_val
    else:
        seasonality_min_val, seasonality_center_val, seasonality_max_val = 0.065, 0.0833, 0.10

    seasonality_data = []
    for row in state_data.iter_rows(named=True):
        value = row['seasonality_percentage_normalized']
        seasonality_data.append({
            'year': int(row['Year']),
            'month': int(row['Month']),
            'value': round(value, 4) if value is not None else None,
            'formattedValue': f"{value * 100:.1f}%" if value is not None else None,
            'source': row['Source']
        })

    seasonality_data = trim_leading_trailing_nulls(seasonality_data, 'value')
    seasonality_years = sorted(set(item['year'] for item in seasonality_data)) if seasonality_data else years

    seasonality_output = {
        'state': {'code': state_slug, 'name': state_name},
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
        'years': [int(y) for y in seasonality_years],
        'months': MONTH_NAMES,
        'data': seasonality_data,
        'sources': sources,
        'generatedAt': datetime.utcnow().isoformat() + 'Z'
    }

    seasonality_filename = f'{state_slug}.json'
    with open(seasonality_dir / seasonality_filename, 'w') as f:
        json.dump(seasonality_output, f)

    frontend_seasonality_dir.mkdir(parents=True, exist_ok=True)
    with open(frontend_seasonality_dir / seasonality_filename, 'w') as f:
        json.dump(seasonality_output, f)

    public_seasonality_dir.mkdir(parents=True, exist_ok=True)
    with open(public_seasonality_dir / seasonality_filename, 'w') as f:
        json.dump(seasonality_output, f)

    # --- Export conception data (only if valid data exists) ---
    valid_conception = state_data.filter(pl.col('daily_conception_rate').is_not_null())

    if len(valid_conception) > 0:
        conception_dir.mkdir(parents=True, exist_ok=True)
        conception_years = sorted(valid_conception['Year'].unique().to_list())

        conception_min_val = max(float(valid_conception['daily_conception_rate'].min()), 1e-6)
        conception_max_val = float(valid_conception['daily_conception_rate'].max())

        conception_data = []
        for row in valid_conception.iter_rows(named=True):
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
            'state': {'code': state_slug, 'name': state_name},
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

        conception_filename = f'{state_slug}.json'
        with open(conception_dir / conception_filename, 'w') as f:
            json.dump(conception_output, f)

        frontend_conception_dir.mkdir(parents=True, exist_ok=True)
        with open(frontend_conception_dir / conception_filename, 'w') as f:
            json.dump(conception_output, f)

        public_conception_dir.mkdir(parents=True, exist_ok=True)
        with open(public_conception_dir / conception_filename, 'w') as f:
            json.dump(conception_output, f)

    # --- Export monthly fertility timeseries data ---
    if len(valid_fertility) > 0:
        monthly_fertility_dir.mkdir(parents=True, exist_ok=True)

        # Compute month rankings based on average seasonality ratio
        month_avg = (
            state_data
            .filter(pl.col('seasonality_ratio_annual').is_not_null())
            .group_by('Month')
            .agg(pl.col('seasonality_ratio_annual').mean().alias('avg_ratio'))
            .sort('Month')
        )

        if len(month_avg) > 0:
            highest_row = month_avg.sort('avg_ratio', descending=True).head(1)
            lowest_row = month_avg.sort('avg_ratio').head(1)
            highest_month = int(highest_row['Month'][0])
            lowest_month = int(lowest_row['Month'][0])
        else:
            highest_month = 9
            lowest_month = 4

        # Build monthly series
        monthly_series = []
        for month in range(1, 13):
            month_data = valid_fertility.filter(pl.col('Month') == month).sort('Year')
            series_data = []
            for row in month_data.iter_rows(named=True):
                series_data.append({
                    'year': int(row['Year']),
                    'value': round(row['daily_fertility_rate'], 2)
                })
            monthly_series.append({
                'month': month,
                'monthName': MONTH_NAMES_FULL[month - 1],
                'data': series_data
            })

        # Build annual average series
        annual_avg = (
            valid_fertility
            .group_by('Year')
            .agg(pl.col('daily_fertility_rate').mean().alias('avg'))
            .sort('Year')
        )
        annual_average_series = []
        for row in annual_avg.iter_rows(named=True):
            annual_average_series.append({
                'year': int(row['Year']),
                'value': round(row['avg'], 2)
            })

        # Compute Y domain
        mf_min_val = float(valid_fertility['daily_fertility_rate'].min())
        mf_max_val = float(valid_fertility['daily_fertility_rate'].max())
        padding = (mf_max_val - mf_min_val) * 0.05
        y_domain = [round(max(0, mf_min_val - padding), 1), round(mf_max_val + padding, 1)]

        mf_years = sorted(valid_fertility['Year'].unique().to_list())
        monthly_fertility_output = {
            'state': {'code': state_slug, 'name': state_name},
            'metric': 'daily_fertility_rate',
            'title': 'Daily Births per 100k Women Age 15-44',
            'yearRange': [int(min(mf_years)), int(max(mf_years))],
            'monthRanking': {
                'highestAvg': highest_month,
                'lowestAvg': lowest_month
            },
            'monthlySeries': monthly_series,
            'annualAverageSeries': annual_average_series,
            'yDomain': y_domain,
            'sources': sources,
            'generatedAt': datetime.utcnow().isoformat() + 'Z'
        }

        monthly_fertility_filename = f'{state_slug}.json'
        with open(monthly_fertility_dir / monthly_fertility_filename, 'w') as f:
            json.dump(monthly_fertility_output, f)

        frontend_monthly_fertility_dir.mkdir(parents=True, exist_ok=True)
        with open(frontend_monthly_fertility_dir / monthly_fertility_filename, 'w') as f:
            json.dump(monthly_fertility_output, f)

        public_monthly_fertility_dir.mkdir(parents=True, exist_ok=True)
        with open(public_monthly_fertility_dir / monthly_fertility_filename, 'w') as f:
            json.dump(monthly_fertility_output, f)

    return state_name


def export_all_states(
    births: pl.DataFrame,
    output_dir: Optional[Path] = None,
    max_workers: Optional[int] = None,
    min_years: int = MIN_YEARS_DATA,
    min_monthly_births: int = MIN_MONTHLY_BIRTHS
) -> List[str]:
    """
    Export all data for all states in parallel.

    Args:
        births: DataFrame with all state data
        output_dir: Base output directory (defaults to JSON_OUTPUT_DIR)
        max_workers: Maximum number of parallel workers (defaults to CPU count)
        min_years: Minimum number of complete years required
        min_monthly_births: Minimum births required in every month

    Returns:
        List of state names that were exported (passed all filters)
    """
    if output_dir is None:
        output_dir = JSON_OUTPUT_DIR

    if max_workers is None:
        max_workers = min(os.cpu_count() or 4, 8)

    # Ensure output directories exist
    ensure_output_dirs()

    # Export states index and get filtered state list
    states = export_states_index(births, output_dir, min_years, min_monthly_births)

    # Prepare directory paths
    fertility_dir = STATES_FERTILITY_OUTPUT_DIR
    seasonality_dir = STATES_SEASONALITY_OUTPUT_DIR
    conception_dir = STATES_CONCEPTION_OUTPUT_DIR
    monthly_fertility_dir = STATES_MONTHLY_FERTILITY_OUTPUT_DIR

    # Convert DataFrame to dict for pickling (needed for multiprocessing)
    births_dict = births.to_dict()

    # Create args for each state
    export_args = [
        (births_dict, state_name, fertility_dir, seasonality_dir, conception_dir,
         monthly_fertility_dir,
         FRONTEND_ASSETS_STATES_FERTILITY_DIR, FRONTEND_ASSETS_STATES_SEASONALITY_DIR, FRONTEND_ASSETS_STATES_CONCEPTION_DIR,
         FRONTEND_ASSETS_STATES_MONTHLY_FERTILITY_DIR,
         FRONTEND_PUBLIC_STATES_FERTILITY_DIR, FRONTEND_PUBLIC_STATES_SEASONALITY_DIR, FRONTEND_PUBLIC_STATES_CONCEPTION_DIR,
         FRONTEND_PUBLIC_STATES_MONTHLY_FERTILITY_DIR)
        for state_name in states
    ]

    # Export in parallel using threads (I/O bound)
    print(f"Exporting JSON data for {len(states)} states using {max_workers} workers...")
    completed = 0
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(_export_state_json, args): args[1] for args in export_args}
        for future in as_completed(futures):
            state_name = futures[future]
            try:
                future.result()
                completed += 1
                if completed % 10 == 0:
                    print(f"  Exported {completed}/{len(states)} states...")
            except Exception as e:
                print(f"  Error exporting {state_name}: {e}")

    print(f"\nExported data for {len(states)} states")

    return states
