#!/usr/bin/env python3
"""
Main entry point for the HMD births heatmap data pipeline.

This script orchestrates:
1. Loading data from HMD, UN, and Japan sources
2. Processing (interpolation, fertility rates, seasonality)
3. Exporting to JSON for frontend consumption
4. Optionally exporting to CSV for legacy compatibility
"""
import sys
import argparse
from pathlib import Path
from typing import List, Optional

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import polars as pl
import shutil
from config import (
    HMD_DATA_DIR, UN_DATA_DIR, CSV_OUTPUT_DIR, OUTPUT_DIR, MIN_YEARS_DATA, MIN_MONTHLY_BIRTHS,
    JSON_OUTPUT_DIR, FERTILITY_OUTPUT_DIR, SEASONALITY_OUTPUT_DIR, CONCEPTION_OUTPUT_DIR,
    CHARTS_OUTPUT_DIR, FRONTEND_ASSETS_DATA_DIR, FRONTEND_ASSETS_FERTILITY_DIR,
    FRONTEND_ASSETS_SEASONALITY_DIR, FRONTEND_ASSETS_CONCEPTION_DIR, FRONTEND_CONTENT_CHARTS_DIR
)
from loaders import hmd, un, japan, states
from processors import (
    interpolate_population,
    create_births_monthly_index,
    compute_fertility_rates,
    compute_seasonality,
    compute_conception_rates,
    compute_births_extent_stats,
    compute_population_extent_stats,
)
from exporters import export_all_countries, export_all_charts, export_all_states
from schemas import BirthsSchema, PopulationSchema, StatsSchema


def load_all_data(hmd_dir: Path = None, un_dir: Path = None):
    """
    Load and combine data from all sources.

    Returns:
        Tuple of (births DataFrame, population DataFrame)
    """
    if hmd_dir is None:
        hmd_dir = HMD_DATA_DIR
    if un_dir is None:
        un_dir = UN_DATA_DIR

    print("Loading HMD births data...")
    hmd_births = hmd.load_all_births(hmd_dir)
    hmd_births = hmd_births.select('Country', 'Year', 'Month', 'Births').with_columns(
        pl.lit('HMD').alias('Source')
    )
    print(f"  Loaded {len(hmd_births)} HMD births records")

    print("Loading UN births data...")
    un_births = un.load_births(un_dir)
    un_births = un_births.select('Country', 'Year', 'Month', 'Births').with_columns(
        pl.lit('UN').alias('Source')
    )
    print(f"  Loaded {len(un_births)} UN births records")

    # Prefer HMD over UN when both available
    new_un_births = un_births.join(hmd_births, on=['Country', 'Year', 'Month'], how='anti')
    all_births = pl.concat([hmd_births, new_un_births]).with_columns([
        pl.col('Year').cast(pl.Int64),
        pl.col('Month').cast(pl.Int64),
        pl.col('Births').cast(pl.Float64),
    ]).sort(['Country', 'Year', 'Month'])
    print(f"  Combined: {len(all_births)} total births records")

    births_countries = all_births['Country'].unique().to_list()

    print("\nLoading HMD population data...")
    hmd_population = hmd.load_all_population(hmd_dir)
    hmd_population = hmd.filter_population_for_fertility_rate(hmd_population)
    hmd_population = hmd_population.with_columns(pl.lit('HMD').alias('Source'))
    print(f"  Loaded {len(hmd_population)} HMD population records")

    print("Loading Japan population data...")
    jpn_pop = japan.load_population()
    jpn_pop = japan.filter_population_for_fertility_rate(jpn_pop)
    jpn_pop = jpn_pop.with_columns(pl.lit('JPOP').alias('Source'))
    # Remove JPOP rows already in HMD
    new_jpn_pop = jpn_pop.join(hmd_population, on=['Country', 'Year', 'Month'], how='anti')
    hmd_population = pl.concat([hmd_population, new_jpn_pop]).sort(['Country', 'Year', 'Month'])
    print(f"  Combined with Japan: {len(hmd_population)} records")

    print("Loading UN population data...")
    un_population = un.load_population(births_countries, un_dir)
    un_population = un.filter_population_for_fertility_rate(un_population)
    un_population = un_population.with_columns(pl.lit('UN').alias('Source'))
    # Prefer HMD/JPOP over UN
    new_un_pop = un_population.join(hmd_population, on=['Country', 'Year'], how='anti')
    all_population = pl.concat([hmd_population, new_un_pop]).with_columns([
        pl.col('Year').cast(pl.Int64),
        pl.col('Month').cast(pl.Int64),
        pl.col('childbearing_population').cast(pl.Float64),
    ]).sort(['Country', 'Year', 'Month'])
    print(f"  Combined: {len(all_population)} total population records")

    return all_births, all_population


def process_data(births: pl.DataFrame, population: pl.DataFrame):
    """
    Process births and population data.

    Returns:
        Tuple of (processed births, processed population, stats)
    """
    print("\nInterpolating population data...")
    population = interpolate_population(population)

    print("Computing population statistics...")
    population_stats = compute_population_extent_stats(population)

    print("Creating births monthly index...")
    births = create_births_monthly_index(births)

    print("Computing births statistics...")
    births_stats = compute_births_extent_stats(births)
    stats = births_stats.join(population_stats, on=['Country', 'Source'], how='left', suffix='_population')

    print("Computing fertility rates...")
    births = compute_fertility_rates(births, population)

    print("Computing seasonality metrics...")
    births = compute_seasonality(births)

    print("Computing conception rates...")
    births = compute_conception_rates(births)

    return births, population, stats


def validate_data(births: pl.DataFrame, population: pl.DataFrame, stats: pl.DataFrame):
    """Validate data against schemas."""
    print("\nValidating data schemas...")
    births = BirthsSchema.validate(births)
    population = PopulationSchema.validate(population)
    stats = StatsSchema.validate(stats)
    print("  All schemas validated successfully")
    return births, population, stats


def clear_directory_contents(directory: Path, description: str = None):
    """
    Clear all contents of a directory while preserving the directory itself.
    
    Args:
        directory: Directory to clear
        description: Optional description for logging
    """
    if not directory.exists():
        return
    
    desc = description or str(directory)
    print(f"  Clearing {desc}...")
    
    # Remove all contents
    for item in directory.iterdir():
        if item.is_file():
            item.unlink()
        elif item.is_dir():
            shutil.rmtree(item)
    
    print(f"    Cleared {desc}")


def clear_csv_output(output_dir: Path = None):
    """Clear CSV output files."""
    if output_dir is None:
        output_dir = CSV_OUTPUT_DIR
    
    print(f"\nClearing CSV output directory ({output_dir})...")
    
    # Clear specific CSV files that will be regenerated (matching export_csv logic)
    csv_files = [
        'births_heatmap_data.csv',
        'population_heatmap_data.csv',
        'stats_heatmap_data.csv'
    ]
    
    for csv_file in csv_files:
        file_path = output_dir / csv_file
        if file_path.exists():
            file_path.unlink()
            print(f"  Removed {csv_file}")
    
    print("  CSV output cleared")


def clear_json_output(output_dir: Path = None):
    """Clear JSON output directories."""
    if output_dir is None:
        output_dir = JSON_OUTPUT_DIR
    
    print(f"\nClearing JSON output directories...")
    
    # Clear main JSON output subdirectories (matching export_all_countries logic)
    directories_to_clear = [
        (output_dir / 'fertility', "fertility data"),
        (output_dir / 'seasonality', "seasonality data"),
        (output_dir / 'conception', "conception data"),
    ]
    
    for directory, desc in directories_to_clear:
        clear_directory_contents(directory, desc)
    
    # Clear countries.json from main output
    countries_json = output_dir / 'countries.json'
    if countries_json.exists():
        countries_json.unlink()
        print(f"  Removed countries.json from {output_dir}")
    
    # Clear frontend assets directories (always cleared regardless of output_dir)
    frontend_dirs_to_clear = [
        (FRONTEND_ASSETS_FERTILITY_DIR, "frontend fertility assets"),
        (FRONTEND_ASSETS_SEASONALITY_DIR, "frontend seasonality assets"),
        (FRONTEND_ASSETS_CONCEPTION_DIR, "frontend conception assets"),
    ]
    
    for directory, desc in frontend_dirs_to_clear:
        clear_directory_contents(directory, desc)
    
    # Clear countries.json from frontend assets
    frontend_countries_json = FRONTEND_ASSETS_DATA_DIR / 'countries.json'
    if frontend_countries_json.exists():
        frontend_countries_json.unlink()
        print(f"  Removed countries.json from frontend assets")
    
    print("  JSON output cleared")


def clear_charts_output(output_dir: Path = None):
    """Clear charts output directories."""
    if output_dir is None:
        output_dir = OUTPUT_DIR / 'charts'
    else:
        output_dir = output_dir / 'charts'
    
    print(f"\nClearing charts output directories...")
    
    # Clear charts output directory (contains country subdirectories)
    # Matching export_charts logic: uses OUTPUT_DIR / 'charts' or output_dir / 'charts'
    clear_directory_contents(output_dir, "charts output")
    
    # Clear frontend content charts directory (always cleared regardless of output_dir)
    clear_directory_contents(FRONTEND_CONTENT_CHARTS_DIR, "frontend charts content")
    
    print("  Charts output cleared")


def export_csv(births: pl.DataFrame, population: pl.DataFrame, stats: pl.DataFrame, output_dir: Path = None):
    """Export to CSV files (legacy format)."""
    if output_dir is None:
        output_dir = CSV_OUTPUT_DIR

    print(f"\nExporting CSV files to {output_dir}...")
    births.write_csv(output_dir / 'births_heatmap_data.csv')
    population.write_csv(output_dir / 'population_heatmap_data.csv')
    stats.write_csv(output_dir / 'stats_heatmap_data.csv')
    print("  CSV export complete")


def export_json(
    births: pl.DataFrame,
    output_dir: Path = None,
    min_years: Optional[int] = None,
    min_monthly_births: Optional[int] = None
) -> List[str]:
    """Export to JSON files for frontend.

    Args:
        births: DataFrame with all births data
        output_dir: Output directory (defaults to OUTPUT_DIR)
        min_years: Minimum complete years required (defaults to MIN_YEARS_DATA)
        min_monthly_births: Minimum births in every month (defaults to MIN_MONTHLY_BIRTHS)

    Returns:
        List of country names that were exported (passed all filters)
    """
    if output_dir is None:
        output_dir = OUTPUT_DIR
    if min_years is None:
        min_years = MIN_YEARS_DATA
    if min_monthly_births is None:
        min_monthly_births = MIN_MONTHLY_BIRTHS

    print(f"\nExporting JSON files to {output_dir}...")
    print(f"  Minimum complete years required: {min_years}")
    print(f"  Minimum monthly births required: {min_monthly_births}")
    countries = export_all_countries(births, output_dir, min_years=min_years, min_monthly_births=min_monthly_births)
    print("  JSON export complete")
    return countries


def export_charts(
    births: pl.DataFrame,
    population: pl.DataFrame,
    output_dir: Path = None,
    countries: Optional[List[str]] = None
):
    """Export PNG charts for frontend.

    Args:
        births: DataFrame with all births data
        population: DataFrame with all population data
        output_dir: Output directory (defaults to OUTPUT_DIR/charts)
        countries: Optional list of countries to export (defaults to all)
    """
    if output_dir is None:
        output_dir = OUTPUT_DIR / 'charts'

    print(f"\nExporting charts to {output_dir}...")
    if countries:
        print(f"  Exporting charts for {len(countries)} filtered countries")
    export_all_charts(births, population, output_dir, countries=countries, include_heatmaps=True)
    print("  Chart export complete")


def load_and_process_state_data() -> pl.DataFrame:
    """
    Load and process US state-level data.

    This loads state birth and population data, then computes fertility rates,
    seasonality metrics, and conception rates.

    Returns:
        Processed births DataFrame with all metrics computed.
    """
    print("\n" + "=" * 50)
    print("Loading US State-Level Data")
    print("=" * 50)

    print("Loading state births and population data...")
    state_births = states.load_births_with_fertility()
    print(f"  Loaded {len(state_births)} state records")

    # The loader already adds Date and Source columns
    # Now compute seasonality and conception rates using the same processors

    print("Computing state seasonality metrics...")
    state_births = compute_seasonality(state_births)

    print("Computing state conception rates...")
    state_births = compute_conception_rates(state_births)

    return state_births


def export_state_json(
    births: pl.DataFrame,
    output_dir: Path = None,
    min_years: Optional[int] = None,
    min_monthly_births: Optional[int] = None
) -> List[str]:
    """Export state data to JSON files for frontend.

    Args:
        births: DataFrame with state data
        output_dir: Output directory (defaults to OUTPUT_DIR)
        min_years: Minimum complete years required (defaults to MIN_YEARS_DATA)
        min_monthly_births: Minimum births in every month (defaults to MIN_MONTHLY_BIRTHS)

    Returns:
        List of state names that were exported (passed all filters)
    """
    if output_dir is None:
        output_dir = OUTPUT_DIR
    if min_years is None:
        min_years = MIN_YEARS_DATA
    if min_monthly_births is None:
        min_monthly_births = MIN_MONTHLY_BIRTHS

    print(f"\nExporting state JSON files to {output_dir}...")
    print(f"  Minimum complete years required: {min_years}")
    print(f"  Minimum monthly births required: {min_monthly_births}")
    exported_states = export_all_states(births, output_dir, min_years=min_years, min_monthly_births=min_monthly_births)
    print("  State JSON export complete")
    return exported_states


def main():
    parser = argparse.ArgumentParser(description='HMD Births Heatmap Data Pipeline')
    parser.add_argument('--csv', action='store_true', help='Export CSV files (legacy format)')
    parser.add_argument('--json', action='store_true', help='Export JSON files for frontend')
    parser.add_argument('--charts', action='store_true', help='Export PNG charts for frontend')
    parser.add_argument('--states', action='store_true', help='Include US state-level data')
    parser.add_argument('--states-only', action='store_true', help='Process only US states (skip country data)')
    parser.add_argument('--all', action='store_true', help='Export CSV, JSON, and charts')
    parser.add_argument('--hmd-dir', type=Path, help='HMD data directory')
    parser.add_argument('--un-dir', type=Path, help='UN data directory')
    parser.add_argument('--output-dir', type=Path, help='Output directory')
    parser.add_argument('--min-years', type=int, default=None,
                        help=f'Minimum complete years required for country inclusion (default: {MIN_YEARS_DATA})')
    parser.add_argument('--min-monthly-births', type=int, default=None,
                        help=f'Minimum births required in every month for country inclusion (default: {MIN_MONTHLY_BIRTHS})')
    args = parser.parse_args()

    # Default to --all if no format specified (unless states-only mode)
    if not args.csv and not args.json and not args.charts and not args.all and not args.states_only:
        args.all = True

    # states-only implies states flag
    if args.states_only:
        args.states = True

    # Resolve filter thresholds
    min_years = args.min_years if args.min_years is not None else MIN_YEARS_DATA
    min_monthly_births = args.min_monthly_births if args.min_monthly_births is not None else MIN_MONTHLY_BIRTHS

    print("=" * 50)
    print("HMD Births Heatmap Data Pipeline")
    print("=" * 50)
    print(f"Minimum complete years threshold: {min_years}")
    print(f"Minimum monthly births threshold: {min_monthly_births}")

    # Track filtered countries for chart export
    filtered_countries = None
    births = None
    population = None

    # Skip country data loading if states-only mode
    if not args.states_only:
        # Load data
        births, population = load_all_data(args.hmd_dir, args.un_dir)

        # Process data
        births, population, stats = process_data(births, population)

        # Validate
        births, population, stats = validate_data(births, population, stats)

        # Clear output directories before exporting (only for formats that will be generated)
        if args.csv or args.all:
            clear_csv_output(args.output_dir)

        if args.json or args.all:
            clear_json_output(args.output_dir)

        if args.charts or args.all:
            clear_charts_output(args.output_dir)

        # Export
        if args.csv or args.all:
            export_csv(births, population, stats, args.output_dir)

        if args.json or args.all:
            filtered_countries = export_json(births, args.output_dir, min_years, min_monthly_births)

        if args.charts or args.all:
            # Use filtered countries from JSON export if available
            export_charts(births, population, args.output_dir, countries=filtered_countries)

    # Process US state-level data if requested
    if args.states:
        state_births = load_and_process_state_data()
        if args.json or args.all:
            # States bypass filtering - include all 50 states + DC for completeness
            export_state_json(state_births, args.output_dir, min_years=0, min_monthly_births=0)

        # Export state charts when charts flag is set
        if args.charts or args.all:
            from exporters import export_all_state_charts
            export_all_state_charts(
                state_births,
                include_heatmaps=True
            )

    print("\n" + "=" * 50)
    print("Pipeline complete!")
    print("=" * 50)


if __name__ == "__main__":
    main()
