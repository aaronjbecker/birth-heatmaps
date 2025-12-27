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

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import polars as pl
from config import HMD_DATA_DIR, UN_DATA_DIR, CSV_OUTPUT_DIR, OUTPUT_DIR
from loaders import hmd, un, japan
from processors import (
    interpolate_population,
    create_births_monthly_index,
    compute_fertility_rates,
    compute_seasonality,
    compute_births_extent_stats,
    compute_population_extent_stats,
)
from exporters import export_all_countries
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

    return births, population, stats


def validate_data(births: pl.DataFrame, population: pl.DataFrame, stats: pl.DataFrame):
    """Validate data against schemas."""
    print("\nValidating data schemas...")
    births = BirthsSchema.validate(births)
    population = PopulationSchema.validate(population)
    stats = StatsSchema.validate(stats)
    print("  All schemas validated successfully")
    return births, population, stats


def export_csv(births: pl.DataFrame, population: pl.DataFrame, stats: pl.DataFrame, output_dir: Path = None):
    """Export to CSV files (legacy format)."""
    if output_dir is None:
        output_dir = CSV_OUTPUT_DIR

    print(f"\nExporting CSV files to {output_dir}...")
    births.write_csv(output_dir / 'births_heatmap_data.csv')
    population.write_csv(output_dir / 'population_heatmap_data.csv')
    stats.write_csv(output_dir / 'stats_heatmap_data.csv')
    print("  CSV export complete")


def export_json(births: pl.DataFrame, output_dir: Path = None):
    """Export to JSON files for frontend."""
    if output_dir is None:
        output_dir = OUTPUT_DIR

    print(f"\nExporting JSON files to {output_dir}...")
    export_all_countries(births, output_dir)
    print("  JSON export complete")


def main():
    parser = argparse.ArgumentParser(description='HMD Births Heatmap Data Pipeline')
    parser.add_argument('--csv', action='store_true', help='Export CSV files (legacy format)')
    parser.add_argument('--json', action='store_true', help='Export JSON files for frontend')
    parser.add_argument('--all', action='store_true', help='Export both CSV and JSON')
    parser.add_argument('--hmd-dir', type=Path, help='HMD data directory')
    parser.add_argument('--un-dir', type=Path, help='UN data directory')
    parser.add_argument('--output-dir', type=Path, help='Output directory')
    args = parser.parse_args()

    # Default to --all if no format specified
    if not args.csv and not args.json and not args.all:
        args.all = True

    print("=" * 50)
    print("HMD Births Heatmap Data Pipeline")
    print("=" * 50)

    # Load data
    births, population = load_all_data(args.hmd_dir, args.un_dir)

    # Process data
    births, population, stats = process_data(births, population)

    # Validate
    births, population, stats = validate_data(births, population, stats)

    # Export
    if args.csv or args.all:
        export_csv(births, population, stats, args.output_dir)

    if args.json or args.all:
        export_json(births, args.output_dir)

    print("\n" + "=" * 50)
    print("Pipeline complete!")
    print("=" * 50)


if __name__ == "__main__":
    main()
