"""
Chart exporter for generating PNG visualizations.

Exports matplotlib charts to PNG files for the Astro frontend.
Charts are organized by country in subdirectories.
"""
import os
import shutil
from pathlib import Path
from typing import Optional, List, Tuple, Dict, Any
from concurrent.futures import ProcessPoolExecutor, as_completed
import multiprocessing
import polars as pl
import pandas as pd
import numpy as np

import matplotlib as mpl
mpl.use('Agg')  # Non-interactive backend for batch generation
import matplotlib.pyplot as plt
from matplotlib import dates as mdates
from matplotlib import transforms

# Try to load aquarel theme if available
try:
    from aquarel import load_theme
    theme = load_theme("gruvbox_light")
    theme.apply()
except ImportError:
    pass

# Customize font in visualizations
mpl.rcParams['font.family'] = 'monospace'
mpl.rcParams['figure.facecolor'] = '#fafaf9'

from config import (
    MONTH_NAMES,
    DATA_SOURCE_LABELS,
    CHARTS_OUTPUT_DIR,
    FRONTEND_CONTENT_CHARTS_DIR,
    get_country_slug,
    ensure_output_dirs,
)


# Chart filenames for consistent naming
CHART_FILENAMES = {
    'fertility_heatmap': 'fertility_heatmap.png',
    'seasonality_heatmap': 'seasonality_heatmap.png',
    'monthly_fertility_chart': 'monthly_fertility_chart.png',
    'monthly_fertility_boxplot': 'monthly_fertility_boxplot.png',
    'population_chart': 'population_chart.png',
    'births_chart': 'births_chart.png',
    'daily_fertility_rate_chart': 'daily_fertility_rate_chart.png',
}


def get_country_output_dir(country_name: str, base_dir: Optional[Path] = None) -> Path:
    """Get the output directory for a country's charts."""
    if base_dir is None:
        base_dir = CHARTS_OUTPUT_DIR
    country_slug = get_country_slug(country_name)
    return base_dir / country_slug


def build_monthly_fertility_rate_chart(
    births: pl.DataFrame,
    country_name: str,
    output_dir: Optional[Path] = None,
    start_year: Optional[int] = None
) -> Path:
    """
    Build chart showing monthly fertility rates with most/least common birth months highlighted.

    Args:
        births: DataFrame with births data (already filtered to a single country)
        country_name: Name of the country
        output_dir: Output directory (defaults to CHARTS_OUTPUT_DIR/{country_slug})
        start_year: Optional start year to filter data

    Returns:
        Path to the generated chart
    """
    if output_dir is None:
        output_dir = get_country_output_dir(country_name)
    output_dir.mkdir(parents=True, exist_ok=True)

    if start_year is not None:
        births = births.filter(pl.col('Year') >= start_year)

    # Extract data sources
    data_sources = births['Source'].drop_nulls().unique().sort().to_list()
    data_source_labels = [DATA_SOURCE_LABELS.get(source, source) for source in data_sources]

    # Convert to pandas for plotting
    births_pd = births.to_pandas()

    # Compute yearly averages
    yearly_avg = births_pd.groupby('Year')['daily_fertility_rate'].mean().reset_index()
    yearly_avg.columns = ['Year', 'yearly_avg_rate']

    # Merge yearly averages
    births_with_avg = births_pd.merge(yearly_avg, on='Year', how='left')

    # Rank months by average ratio to annual average
    month_avg_ratios = births_pd.groupby('Month')['seasonality_ratio_annual'].mean().reset_index()
    month_avg_ratios.columns = ['Month', 'avg_seasonality_ratio_annual']

    top_ranked_month = month_avg_ratios.loc[month_avg_ratios['avg_seasonality_ratio_annual'].idxmax(), 'Month']
    bottom_ranked_month = month_avg_ratios.loc[month_avg_ratios['avg_seasonality_ratio_annual'].idxmin(), 'Month']

    # Create plot
    fig, ax = plt.subplots(figsize=(14, 8), dpi=150)

    # Plot each month's series
    for month in range(1, 13):
        month_data = births_with_avg[births_with_avg['Month'] == month].sort_values('Year')

        params = {'linewidth': 3, 'alpha': 0.9}

        if month == top_ranked_month:
            params['color'] = 'orangered'
            params['label'] = f"{MONTH_NAMES[month-1]} (highest birth rate)"
        elif month == bottom_ranked_month:
            params['color'] = 'royalblue'
            params['label'] = f"{MONTH_NAMES[month-1]} (lowest birth rate)"
        else:
            params['color'] = 'gray'
            params['linewidth'] = 1.5
            params['alpha'] = 0.5
            params['label'] = '_nolegend_'

        ax.plot(month_data['Year'], month_data['daily_fertility_rate'], **params)

    # Plot yearly average
    yearly_avg_sorted = yearly_avg.sort_values('Year')
    ax.plot(yearly_avg_sorted['Year'], yearly_avg_sorted['yearly_avg_rate'],
            color='black', linewidth=3, label='Annual Average', zorder=10)

    # Get year range
    years = births_with_avg['Year'].unique()
    min_year = int(np.min(years))
    max_year = int(np.max(years))

    # Formatting
    ax.set_xlabel('Year', fontsize=16)
    ax.set_ylabel('Daily Fertility Rate', fontsize=16)
    ax.set_title(f'Daily Births per 100k Women Age 15-44\n{country_name}, {min_year}-{max_year}',
                 fontsize=18, weight='bold')

    # Tick spacing
    year_range = max_year - min_year
    if year_range <= 30:
        major_tick_spacing = 5
    elif year_range <= 60:
        major_tick_spacing = 10
    else:
        major_tick_spacing = 10

    major_ticks = np.arange(min_year, max_year + 1, major_tick_spacing)
    if min_year not in major_ticks:
        major_ticks = np.append(min_year, major_ticks)
    if max_year not in major_ticks:
        major_ticks = np.append(major_ticks, max_year)
    major_ticks = np.sort(np.unique(major_ticks))

    ax.set_xticks(major_ticks)
    ax.grid(True, which='major', alpha=0.4, linestyle='-', linewidth=1)
    ax.grid(True, which='major', axis='y', alpha=0.3, linestyle='--', linewidth=0.5)
    ax.legend(loc='best', fontsize=12, framealpha=0.9)

    # Source notes
    fig.text(0.05, 0.02, 'Source: ' + ', '.join(data_source_labels),
             fontsize=10, color='black', ha='left', style='italic')

    plt.tight_layout()

    output_path = output_dir / CHART_FILENAMES['monthly_fertility_chart']
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

    return output_path


def build_monthly_fertility_boxplot(
    births: pl.DataFrame,
    country_name: str,
    output_dir: Optional[Path] = None,
    start_year: Optional[int] = None
) -> Path:
    """
    Build violin plot showing distribution of monthly fertility rates.

    Args:
        births: DataFrame with births data (already filtered to a single country)
        country_name: Name of the country
        output_dir: Output directory
        start_year: Optional start year to filter data

    Returns:
        Path to the generated chart
    """
    if output_dir is None:
        output_dir = get_country_output_dir(country_name)
    output_dir.mkdir(parents=True, exist_ok=True)

    if start_year is not None:
        births = births.filter(pl.col('Year') >= start_year)

    # Extract data sources
    data_sources = births['Source'].drop_nulls().unique().sort().to_list()
    data_source_labels = [DATA_SOURCE_LABELS.get(source, source) for source in data_sources]

    # Convert to pandas
    births_pd = births.to_pandas()

    # Filter for rows with valid seasonality data
    births_filtered = births_pd[births_pd['seasonality_ratio_t12m'].notna()].copy()

    if len(births_filtered) == 0:
        print(f"Warning: No seasonality data for {country_name}, skipping boxplot")
        return None

    min_year = int(births_filtered['Year'].min())
    max_year = int(births_filtered['Year'].max())

    # Prepare violin plot data
    violin_data = [births_filtered[births_filtered['Month'] == month]['seasonality_ratio_t12m'].values
                   for month in range(1, 13)]

    # Check if all months have data - if any month is empty, skip the violin plot
    months_with_data = [i + 1 for i, data in enumerate(violin_data) if len(data) > 0]
    if len(months_with_data) < 12:
        print(f"Warning: Not all months have data for {country_name}, skipping boxplot")
        return None

    # Create plot
    fig, ax = plt.subplots(figsize=(14, 6), dpi=150)

    vp = ax.violinplot(violin_data, positions=range(1, 13), widths=0.7,
                       showmeans=True, showmedians=True)

    # Style violins
    for pc in vp['bodies']:
        pc.set_facecolor('lightblue')
        pc.set_alpha(0.7)
        pc.set_edgecolor('black')
        pc.set_linewidth(1.5)

    for element in ['cmeans', 'cmedians', 'cbars']:
        if element in vp:
            vp[element].set_color('black')
            vp[element].set_linewidth(1.5)

    # Add strip plot
    np.random.seed(42)
    for month in range(1, 13):
        month_data = births_filtered[births_filtered['Month'] == month]['seasonality_ratio_t12m'].values
        if len(month_data) > 0:
            jitter = np.random.normal(0, 0.05, size=len(month_data))
            ax.scatter(month + jitter, month_data, color='black', alpha=0.4, s=20, zorder=10)

    # Reference line
    ax.axhline(y=1.0, color='red', linestyle='--', linewidth=2, alpha=0.7,
               label='Trailing 12-Month Average')

    # Formatting
    ax.set_xlabel('Month', fontsize=16)
    ax.set_ylabel('Ratio to Trailing 12-Month Average', fontsize=16)
    ax.set_title(f'Monthly Fertility Distribution\n{country_name} ({min_year}-{max_year})',
                 fontsize=18, weight='bold')
    ax.set_xticks(range(1, 13))
    ax.set_xticklabels(MONTH_NAMES)
    ax.grid(True, alpha=0.3, linestyle='--', axis='y')
    ax.legend(loc='best', fontsize=12, framealpha=0.9)

    # Source notes
    fig.text(0.05, 0.02, 'Source: ' + ', '.join(data_source_labels),
             fontsize=10, color='black', ha='left', style='italic')

    plt.tight_layout()

    output_path = output_dir / CHART_FILENAMES['monthly_fertility_boxplot']
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

    return output_path


def build_population_chart(
    population: pl.DataFrame,
    country_name: str,
    output_dir: Optional[Path] = None
) -> Path:
    """
    Build chart showing childbearing population over time.

    Args:
        population: DataFrame with population data (already filtered to a single country)
        country_name: Name of the country
        output_dir: Output directory

    Returns:
        Path to the generated chart
    """
    if output_dir is None:
        output_dir = get_country_output_dir(country_name)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Extract data sources
    data_sources = population['Source'].drop_nulls().unique().sort().to_list()
    data_source_labels = [DATA_SOURCE_LABELS.get(source, source) for source in data_sources]

    # Convert to pandas
    population_pd = population.to_pandas().sort_values('Date').reset_index(drop=True)

    min_year = int(population_pd['Year'].min())
    max_year = int(population_pd['Year'].max())
    year_range = max_year - min_year

    # Tick spacing
    if year_range <= 30:
        major_tick_interval = 5
    elif year_range <= 60:
        major_tick_interval = 10
    else:
        major_tick_interval = 20

    # Create plot
    fig, ax = plt.subplots(figsize=(12, 6), dpi=150)

    ax.plot(population_pd['Date'], population_pd['childbearing_population'], linewidth=1.5)

    ax.xaxis.set_major_locator(mdates.YearLocator(major_tick_interval))
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y'))

    ax.set_xlabel('Year', fontsize=16)
    ax.set_ylabel('Population (Women Age 15-44)', fontsize=16)
    ax.set_title(f'Childbearing Population\n{country_name} ({min_year}-{max_year})',
                 fontsize=18, weight='bold')
    ax.grid(True, alpha=0.3, linestyle='--')

    # Format y-axis
    max_population = np.nanmax(population_pd['childbearing_population'].values)
    if not np.isnan(max_population) and max_population > 1e6:
        ax.yaxis.set_major_formatter(mpl.ticker.FuncFormatter(lambda x, p: f'{x/1e6:.1f}M'))
    elif not np.isnan(max_population):
        ax.yaxis.set_major_formatter(mpl.ticker.FuncFormatter(lambda x, p: f'{x/1e3:.0f}K'))

    # Source notes
    fig.text(0.05, 0.02, 'Source: ' + ', '.join(data_source_labels),
             fontsize=10, color='black', ha='left', style='italic')

    plt.tight_layout()

    output_path = output_dir / CHART_FILENAMES['population_chart']
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

    return output_path


def build_births_chart(
    births: pl.DataFrame,
    country_name: str,
    output_dir: Optional[Path] = None
) -> Path:
    """
    Build chart showing total monthly births over time.

    Args:
        births: DataFrame with births data (already filtered to a single country)
        country_name: Name of the country
        output_dir: Output directory

    Returns:
        Path to the generated chart
    """
    if output_dir is None:
        output_dir = get_country_output_dir(country_name)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Extract data sources
    data_sources = births['Source'].drop_nulls().unique().sort().to_list()
    data_source_labels = [DATA_SOURCE_LABELS.get(source, source) for source in data_sources]

    # Convert to pandas
    births_pd = births.to_pandas().sort_values('Date').reset_index(drop=True)

    min_year = int(births_pd['Year'].min())
    max_year = int(births_pd['Year'].max())
    year_range = max_year - min_year

    # Tick spacing
    if year_range <= 30:
        major_tick_interval = 5
    elif year_range <= 60:
        major_tick_interval = 10
    else:
        major_tick_interval = 20

    # Create plot
    fig, ax = plt.subplots(figsize=(12, 6), dpi=150)

    ax.plot(births_pd['Date'], births_pd['Births'], linewidth=1.5)

    ax.xaxis.set_major_locator(mdates.YearLocator(major_tick_interval))
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y'))

    ax.set_xlabel('Year', fontsize=16)
    ax.set_ylabel('Monthly Births', fontsize=16)
    ax.set_title(f'Total Monthly Births\n{country_name} ({min_year}-{max_year})',
                 fontsize=18, weight='bold')
    ax.grid(True, alpha=0.3, linestyle='--')

    # Format y-axis
    max_births = np.nanmax(births_pd['Births'].values)
    if not np.isnan(max_births) and max_births > 1e6:
        ax.yaxis.set_major_formatter(mpl.ticker.FuncFormatter(lambda x, p: f'{x/1e6:.2f}M'))
    elif not np.isnan(max_births):
        ax.yaxis.set_major_formatter(mpl.ticker.FuncFormatter(lambda x, p: f'{x/1e3:.0f}K'))

    # Source notes
    fig.text(0.05, 0.02, 'Source: ' + ', '.join(data_source_labels),
             fontsize=10, color='black', ha='left', style='italic')

    plt.tight_layout()

    output_path = output_dir / CHART_FILENAMES['births_chart']
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

    return output_path


def build_daily_fertility_rate_chart(
    births: pl.DataFrame,
    country_name: str,
    output_dir: Optional[Path] = None
) -> Path:
    """
    Build chart showing daily fertility rate over time.

    Args:
        births: DataFrame with births data (already filtered to a single country)
        country_name: Name of the country
        output_dir: Output directory

    Returns:
        Path to the generated chart
    """
    if output_dir is None:
        output_dir = get_country_output_dir(country_name)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Extract data sources
    data_sources = births['Source'].drop_nulls().unique().sort().to_list()
    data_source_labels = [DATA_SOURCE_LABELS.get(source, source) for source in data_sources]

    # Convert to pandas
    births_pd = births.to_pandas().sort_values('Date').reset_index(drop=True)

    min_year = int(births_pd['Year'].min())
    max_year = int(births_pd['Year'].max())
    year_range = max_year - min_year

    # Tick spacing
    if year_range <= 30:
        major_tick_interval = 5
    elif year_range <= 60:
        major_tick_interval = 10
    else:
        major_tick_interval = 20

    # Create plot
    fig, ax = plt.subplots(figsize=(12, 6), dpi=150)

    ax.plot(births_pd['Date'], births_pd['daily_fertility_rate'], linewidth=1.5)

    ax.xaxis.set_major_locator(mdates.YearLocator(major_tick_interval))
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y'))

    ax.set_xlabel('Year', fontsize=16)
    ax.set_ylabel('Daily Fertility Rate (per 100k)', fontsize=16)
    ax.set_title(f'Daily Fertility Rate\n{country_name} ({min_year}-{max_year})',
                 fontsize=18, weight='bold')
    ax.grid(True, alpha=0.3, linestyle='--')
    ax.yaxis.set_major_formatter(mpl.ticker.FuncFormatter(lambda x, p: f'{x:.1f}'))

    # Source notes
    fig.text(0.05, 0.02, 'Source: ' + ', '.join(data_source_labels),
             fontsize=10, color='black', ha='left', style='italic')

    plt.tight_layout()

    output_path = output_dir / CHART_FILENAMES['daily_fertility_rate_chart']
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

    return output_path


def export_country_charts(
    births: pl.DataFrame,
    population: pl.DataFrame,
    country_name: str,
    output_dir: Optional[Path] = None,
    include_heatmaps: bool = True
) -> List[Path]:
    """
    Export all charts for a single country.

    Args:
        births: DataFrame with births data
        population: DataFrame with population data
        country_name: Name of the country
        output_dir: Base output directory (defaults to CHARTS_OUTPUT_DIR)
        include_heatmaps: Whether to include matplotlib heatmaps (D3 heatmaps are primary)

    Returns:
        List of paths to generated charts
    """
    if output_dir is None:
        output_dir = CHARTS_OUTPUT_DIR

    country_output_dir = get_country_output_dir(country_name, output_dir)
    country_output_dir.mkdir(parents=True, exist_ok=True)

    # Filter data for this country
    country_births = births.filter(pl.col('Country') == country_name)
    country_population = population.filter(pl.col('Country') == country_name)

    generated_paths = []

    # Generate line/bar charts
    print(f"  Generating charts for {country_name}...")

    path = build_monthly_fertility_rate_chart(country_births, country_name, country_output_dir)
    if path:
        generated_paths.append(path)

    path = build_monthly_fertility_boxplot(country_births, country_name, country_output_dir)
    if path:
        generated_paths.append(path)

    if len(country_population) > 0:
        path = build_population_chart(country_population, country_name, country_output_dir)
        if path:
            generated_paths.append(path)

    path = build_births_chart(country_births, country_name, country_output_dir)
    if path:
        generated_paths.append(path)

    path = build_daily_fertility_rate_chart(country_births, country_name, country_output_dir)
    if path:
        generated_paths.append(path)

    # Optionally generate heatmaps (these are supplementary to D3 interactive heatmaps)
    if include_heatmaps:
        try:
            # Import heatmap functions (may not be available in all environments)
            import sys
            sys.path.insert(0, str(Path(__file__).parent.parent))
            from fertility_heatmap_plotting import (
                build_fertility_heatmap_figure,
                build_seasonality_heatmap_figure
            )

            # Fertility heatmap
            build_fertility_heatmap_figure(
                country_births, country_name, country_output_dir,
                num_rows=1,
                filename_fn=lambda c: country_output_dir / CHART_FILENAMES['fertility_heatmap']
            )
            generated_paths.append(country_output_dir / CHART_FILENAMES['fertility_heatmap'])

            # Seasonality heatmap
            build_seasonality_heatmap_figure(
                country_births, country_name, country_output_dir,
                num_rows=1,
                filename_fn=lambda c: country_output_dir / CHART_FILENAMES['seasonality_heatmap']
            )
            generated_paths.append(country_output_dir / CHART_FILENAMES['seasonality_heatmap'])

        except ImportError as e:
            print(f"  Warning: Could not import heatmap functions: {e}")

    return generated_paths


def _export_country_charts_worker(args: Tuple[Dict, Dict, str, Path, bool]) -> Tuple[str, int]:
    """
    Worker function for parallel chart generation.

    Args:
        args: Tuple of (births_dict, population_dict, country_name, output_dir, include_heatmaps)

    Returns:
        Tuple of (country_name, num_charts_generated)
    """
    births_dict, population_dict, country_name, output_dir, include_heatmaps = args

    # Reconstruct DataFrames from dicts
    births = pl.DataFrame(births_dict)
    population = pl.DataFrame(population_dict)

    try:
        paths = export_country_charts(
            births, population, country_name,
            output_dir, include_heatmaps
        )
        # Close all matplotlib figures to free memory
        plt.close('all')
        return (country_name, len(paths))
    except Exception as e:
        plt.close('all')
        print(f"  Error generating charts for {country_name}: {e}")
        return (country_name, 0)


def export_all_charts(
    births: pl.DataFrame,
    population: pl.DataFrame,
    output_dir: Optional[Path] = None,
    countries: Optional[List[str]] = None,
    include_heatmaps: bool = True,
    max_workers: Optional[int] = None
) -> None:
    """
    Export charts for all countries in parallel.

    Args:
        births: DataFrame with all births data
        population: DataFrame with all population data
        output_dir: Base output directory (defaults to CHARTS_OUTPUT_DIR)
        countries: Optional list of countries to export (defaults to all)
        include_heatmaps: Whether to include matplotlib heatmaps
        max_workers: Maximum number of parallel workers (defaults to CPU count - 1)
    """
    if output_dir is None:
        output_dir = CHARTS_OUTPUT_DIR

    ensure_output_dirs()

    if countries is None:
        countries = sorted(births['Country'].unique().to_list())

    if max_workers is None:
        # Use fewer workers for chart generation (memory intensive)
        max_workers = max(1, (os.cpu_count() or 4) - 1)
        max_workers = min(max_workers, 4)  # Cap at 4 to avoid memory issues

    print(f"Exporting charts for {len(countries)} countries using {max_workers} workers...")

    # Convert DataFrames to dicts for serialization
    births_dict = births.to_dict()
    population_dict = population.to_dict()

    # Create args for each country
    export_args = [
        (births_dict, population_dict, country_name, output_dir, include_heatmaps)
        for country_name in countries
    ]

    total_charts = 0
    completed = 0

    # Use 'spawn' context to avoid issues with forking and matplotlib
    ctx = multiprocessing.get_context('spawn')

    with ProcessPoolExecutor(max_workers=max_workers, mp_context=ctx) as executor:
        futures = {executor.submit(_export_country_charts_worker, args): args[2] for args in export_args}

        for future in as_completed(futures):
            country_name = futures[future]
            try:
                _, num_charts = future.result()
                total_charts += num_charts
                completed += 1
                if completed % 10 == 0:
                    print(f"  Completed {completed}/{len(countries)} countries...")
            except Exception as e:
                print(f"  Error processing {country_name}: {e}")
                completed += 1

    print(f"\nExported {total_charts} charts to {output_dir}")

    # Copy charts to frontend content directory for Vite/Astro imports
    _copy_charts_to_frontend(output_dir, FRONTEND_CONTENT_CHARTS_DIR)


def _copy_charts_to_frontend(source_dir: Path, dest_dir: Path) -> None:
    """
    Copy generated charts to frontend content directory.

    This allows Astro to import charts using import.meta.glob() for
    optimized asset handling with Vite.

    Args:
        source_dir: Source directory with generated charts (organized by country)
        dest_dir: Destination directory (frontend/src/content/charts)
    """
    if not source_dir.exists():
        print(f"  Warning: Source directory {source_dir} does not exist, skipping frontend copy")
        return

    dest_dir.mkdir(parents=True, exist_ok=True)

    # Copy all country subdirectories
    copied_files = 0
    for country_dir in source_dir.iterdir():
        if country_dir.is_dir():
            dest_country_dir = dest_dir / country_dir.name
            dest_country_dir.mkdir(parents=True, exist_ok=True)

            # Copy all PNG files
            for chart_file in country_dir.glob('*.png'):
                dest_file = dest_country_dir / chart_file.name
                shutil.copy2(chart_file, dest_file)
                copied_files += 1

    print(f"  Copied {copied_files} charts to {dest_dir} for frontend imports")
