from pathlib import Path
import polars as pl
import pandas as pd
# unless I'm interpolating datetime values or working with time series data, polars is better.
import numpy as np
# data fetching
import matplotlib as mpl
mpl.use('Agg') # don't show interactive windows while generating figures
import matplotlib.pyplot as plt
from matplotlib import dates as mdates
from matplotlib import transforms
# matplotlib theming
from aquarel import load_theme
theme = load_theme("gruvbox_light")
theme.apply()
# customize font in visualizations
mpl.rcParams['font.family'] = 'monospace'
mpl.rcParams['figure.facecolor'] = '#fafaf9'

# Import from new modules
from fertility_heatmap_config import MONTH_NAMES, DATA_SOURCE_LABELS, normalize_country_name
from fertility_heatmap_plotting import build_fertility_heatmap_figure, build_seasonality_heatmap_figure


# ===============================
# DIRECTORY AND PATH SETTINGS
# ===============================
output_dir = Path(__file__).parent / 'output'
output_dir.mkdir(parents=True, exist_ok=True)

births_fn = Path(__file__).parent / 'births_heatmap_data.csv'
population_fn = Path(__file__).parent / 'population_heatmap_data.csv'
stats_fn = Path(__file__).parent / 'stats_heatmap_data.csv'



# ===============================
# LOAD AND VALIDATE INPUT DATA
# ===============================
from prepare_heatmap_data import BirthsSchema, PopulationSchema, StatsSchema
def load_data():
    births = pl.read_csv(births_fn).with_columns([
        pl.col('Year').cast(pl.Int32),
        pl.col('Month').cast(pl.Int8),
        pl.col('days_in_month').cast(pl.Int8),
        pl.col('Date').str.to_date(),
        pl.col('Births').cast(pl.Float64),
        pl.col('childbearing_population').cast(pl.Float64),
        pl.col('Date_population').str.to_date(),
    ]).pipe(BirthsSchema.validate)
    
    population = pl.read_csv(population_fn).with_columns([
        pl.col('Year').cast(pl.Int32),
        pl.col('Month').cast(pl.Int8),
        pl.col('Date').str.to_date(),
        pl.col('childbearing_population').cast(pl.Float64),
    ]).pipe(PopulationSchema.validate)
    
    stats = pl.read_csv(stats_fn).with_columns([
        pl.col('earliest_date').str.to_date(),
        pl.col('latest_date').str.to_date(),
        pl.col('periods_total').cast(pl.Int32),
        pl.col('periods_present').cast(pl.Int32),
        pl.col('periods_missing').cast(pl.Int32),
        pl.col('earliest_date_country').str.to_date(),
        pl.col('latest_date_country').str.to_date(),
        pl.col('periods_present_country').cast(pl.Int32),
        pl.col('periods_total_country').cast(pl.Int32),
        pl.col('periods_missing_country').cast(pl.Int32),
        pl.col('earliest_date_population').str.to_date(),
        pl.col('latest_date_population').str.to_date(),
        pl.col('earliest_date_country_population').str.to_date(),
        pl.col('latest_date_country_population').str.to_date(),
    ]).pipe(StatsSchema.validate)
    
    return births, population, stats


# ===============================
# monthly fertility rate charts with ranking and yearly average
# ===============================
def build_monthly_fertility_rate_chart(births: pl.DataFrame, country_name: str, start_year=None) -> None:
    """
    Assumes that births have already been filtered to a single country.
    Plots the monthly fertility rates over time with a yearly average and highlights the most and least common birth months in each year.
    """
    country_fn_part = normalize_country_name(country_name)
    if start_year is not None:
        births = births.filter(pl.col('Year') >= start_year)
    # extract data sources
    data_sources = births['Source'].drop_nulls().unique().sort().to_list()
    data_source_labels = [DATA_SOURCE_LABELS[source] for source in data_sources]
    # convert to pandas for compatibility with previous notebook version's code
    births = births.to_pandas()
    # Compute yearly averages
    yearly_avg = births.groupby('Year')['daily_fertility_rate'].mean().reset_index()
    yearly_avg.columns = ['Year', 'yearly_avg_rate']

    # Merge yearly averages back to births dataframe
    births_with_avg = births.merge(yearly_avg, on='Year', how='left')

    # rank months by average ratio to annual average fertility rate
    month_avg_ratios = births.groupby('Month')['seasonality_ratio_annual'].mean().reset_index()
    month_avg_ratios.columns = ['Month', 'avg_seasonality_ratio_annual']
    month_avg_ratios = month_avg_ratios.sort_values('avg_seasonality_ratio_annual', ascending=False)
    # Identify months to highlight
    # Lowest total rank = best overall performer (highlight in red)
    # Highest total rank = worst overall performer (highlight in blue)
    top_ranked_month = month_avg_ratios.loc[month_avg_ratios['avg_seasonality_ratio_annual'].idxmax(), 'Month']
    bottom_ranked_month = month_avg_ratios.loc[month_avg_ratios['avg_seasonality_ratio_annual'].idxmin(), 'Month']

    # Create the plot
    fig, ax = plt.subplots(figsize=(14, 8), dpi=150)

    # Plot each month's series
    for month in range(1, 13):
        month_data = births_with_avg[births_with_avg['Month'] == month].sort_values('Year')
        
        params = {
            'linewidth': 3,
            'alpha': 0.9
        }
        # Determine color based on total rank
        if month == top_ranked_month:
            params['color'] = 'orangered'        
            params['label'] = f"{MONTH_NAMES[month-1]} (most often has the highest birth rate)"
        elif month == bottom_ranked_month:
            params['color'] = 'royalblue'
            params['label'] = f"{MONTH_NAMES[month-1]} (most often has the lowest birth rate)"
        else:
            params['color'] = 'gray'
            params['linewidth'] = 1.5
            params['alpha'] = 0.5
            params['label'] = '_nolegend_'  # Exclude from legend
        
        ax.plot(month_data['Year'], month_data['daily_fertility_rate'], 
                **params)

    # Plot yearly average as darker line
    yearly_avg_sorted = yearly_avg.sort_values('Year')
    ax.plot(yearly_avg_sorted['Year'], yearly_avg_sorted['yearly_avg_rate'], 
            color='black', linewidth=3, label='Annual Average Daily Birth Rate (per 100k)', zorder=10)

    # Format x-axis with year ticks and labels
    # Get the range of years in the data
    years = births_with_avg['Year'].unique()
    years = np.sort(years)
    min_year = years.min()
    max_year = years.max()

    # Formatting
    ax.set_xlabel('Year', fontsize=16)
    ax.set_ylabel('Daily Fertility Rate', fontsize=16)
    text = ax.set_title('Daily Births per 100k Women Age 15-44 in Each Month vs. Yearly Average', fontsize=16, loc='left')
    ex = text.get_window_extent()
    x, y = text.get_position()
    t = transforms.offset_copy(text._transform, y=ex.height + 20, units='dots')
    ax.text(x, y, f'Most and Least Common Birth Months in Each Year:\n    {country_name}, {min_year}-{max_year}', fontsize=20, weight='bold', transform=t, va='bottom')


    # Determine tick spacing based on data range
    year_range = max_year - min_year
    if year_range <= 30:
        major_tick_spacing = 5
        minor_tick_spacing = 1
    elif year_range <= 60:
        major_tick_spacing = 10
        minor_tick_spacing = 2
    else:
        major_tick_spacing = 10
        minor_tick_spacing = 5

    # Set major ticks (every N years)
    major_ticks = np.arange(min_year, max_year + 1, major_tick_spacing)
    # Ensure first and last years are included
    first_off_cycle = False
    last_off_cycle = False
    if min_year not in major_ticks:
        major_ticks = np.append(min_year, major_ticks)
        first_off_cycle = True
    if max_year not in major_ticks:
        major_ticks = np.append(major_ticks, max_year)
        last_off_cycle = True
    major_ticks = np.sort(np.unique(major_ticks))

    # Set minor ticks (every M years)
    minor_ticks = np.arange(min_year, max_year + 1, minor_tick_spacing)

    ax.set_xticks(major_ticks)
    ax.set_xticks(minor_ticks, minor=True)
    tick_labels = ax.set_xticklabels(major_ticks, fontsize=12)
    if first_off_cycle:
        tick_labels[0].set_horizontalalignment('right')
    if last_off_cycle:
        tick_labels[-1].set_horizontalalignment('left')

    # Add grid lines (major and minor)
    ax.grid(True, which='major', alpha=0.4, linestyle='-', linewidth=1)
    ax.grid(True, which='minor', alpha=0.2, linestyle='--', linewidth=0.5)
    ax.grid(True, which='major', axis='y', alpha=0.3, linestyle='--', linewidth=0.5)

    # Add legend
    ax.legend(loc='best', fontsize=14, framealpha=0.9)

    # Source notes
    fig.text(0.05, 0, 'Source: ' + '\n    '.join(data_source_labels), fontsize=14, color='black', ha='left', va='top', style='italic')

    # website link
    fig.text(0.95, 0, 'aaronjbecker.com', fontsize=18, weight='bold', color='black', ha='right', va='top')

    plt.tight_layout()
    
    # save to file
    output_fn = output_dir / f'{country_fn_part}_monthly_fertility_rate_chart_{min_year}.png'
    plt.savefig(output_fn, dpi=300, bbox_inches='tight')
    plt.close()


def build_monthly_fertility_boxplot(births: pl.DataFrame, country_name: str, start_year=None) -> None:
    """
    Assumes that births have already been filtered to a single country.
    Creates a violin plot with strip plot overlay showing the distribution of monthly fertility rates relative to trailing 12-month average.
    Uses the pre-computed seasonality_ratio_t12m from the schema.
    """
    country_fn_part = normalize_country_name(country_name)
    if start_year is not None:
        births = births.filter(pl.col('Year') >= start_year)
    # extract data sources
    data_sources = births['Source'].drop_nulls().unique().sort().to_list()
    data_source_labels = [DATA_SOURCE_LABELS[source] for source in data_sources]
    # convert to pandas for compatibility with matplotlib plotting
    births = births.to_pandas()
    
    # Filter out rows where seasonality_ratio_t12m is null (where we don't have a full 12-month average)
    births_filtered = births[births['seasonality_ratio_t12m'].notna()].copy()
    
    # Get year range for title
    min_year = births_filtered['Year'].min()
    max_year = births_filtered['Year'].max()
    
    # Prepare data for violin plot: create list of ratios for each month
    violin_data = [births_filtered[births_filtered['Month'] == month]['seasonality_ratio_t12m'].values 
                   for month in range(1, 13)]
    
    # Create the plot
    fig, ax = plt.subplots(figsize=(14, 6), dpi=150)
    
    # Create violin plot
    vp = ax.violinplot(violin_data, positions=range(1, 13), widths=0.7, showmeans=True, showmedians=True)
    
    # Style the violins
    for pc in vp['bodies']:
        pc.set_facecolor('lightblue')
        pc.set_alpha(0.7)
        pc.set_edgecolor('black')
        pc.set_linewidth(1.5)
    
    # Style other elements
    for element in ['cmeans', 'cmedians', 'cbars']:
        if element in vp:
            vp[element].set_color('black')
            vp[element].set_linewidth(1.5)
    
    # Add strip plot on top (scatter with jitter)
    # Set random seed for reproducible jitter
    np.random.seed(42)
    for month in range(1, 13):
        month_data = births_filtered[births_filtered['Month'] == month]['seasonality_ratio_t12m'].values
        if len(month_data) > 0:
            # Add jitter to x positions
            jitter = np.random.normal(0, 0.05, size=len(month_data))
            x_positions = month + jitter
            ax.scatter(x_positions, month_data, color='black', alpha=0.4, s=20, zorder=10)
    
    # Add horizontal line at 1.0 (trailing 12-month average)
    ax.axhline(y=1.0, color='red', linestyle='--', linewidth=2, alpha=0.7, label='Trailing 12-Month Average (1.0)')
    
    # Formatting
    ax.set_xlabel('Month', fontsize=16)
    ax.set_ylabel('Ratio to Trailing 12-Month Average', fontsize=16)
    ax.set_title(f'Distribution of Monthly Fertility Rates Relative to Trailing 12-Month Average\n    {country_name} ({min_year}-{max_year})', fontsize=20, weight='bold')
    ax.set_xticks(range(1, 13))
    ax.set_xticklabels(MONTH_NAMES)
    
    # Add grid
    ax.grid(True, alpha=0.3, linestyle='--', axis='y')
    
    # Add legend
    ax.legend(loc='best', fontsize=14, framealpha=0.9)
    
    # Source notes
    fig.text(0.05, 0, 'Source: ' + '\n    '.join(data_source_labels), fontsize=14, color='black', ha='left', va='top', style='italic')
    
    # website link
    fig.text(0.95, 0, 'aaronjbecker.com', fontsize=18, weight='bold', color='black', ha='right', va='top')
    
    plt.tight_layout()
    
    # save to file
    output_fn = output_dir / f'{country_fn_part}_monthly_fertility_boxplot_{min_year}.png'
    plt.savefig(output_fn, dpi=300, bbox_inches='tight')
    plt.close()


def build_population_chart(population: pl.DataFrame, country_name: str) -> None:
    """
    Assumes that population has already been filtered to a single country.
    Plots the childbearing population (women age 15-44) over time.
    """
    country_fn_part = normalize_country_name(country_name)
    # extract data sources
    data_sources = population['Source'].drop_nulls().unique().sort().to_list()
    data_source_labels = [DATA_SOURCE_LABELS[source] for source in data_sources]
    # convert to pandas for compatibility with matplotlib plotting
    population = population.to_pandas()
    
    # Sort by date for proper time series plotting
    population = population.sort_values('Date').reset_index(drop=True)
    
    # Get year range for title
    min_year = population['Year'].min()
    max_year = population['Year'].max()
    year_range = max_year - min_year
    
    # Determine tick spacing based on year range
    if year_range <= 30:
        major_tick_interval = 5
        minor_tick_interval = 1
    elif year_range <= 60:
        major_tick_interval = 10
        minor_tick_interval = 2
    elif year_range <= 150:
        major_tick_interval = 20
        minor_tick_interval = 5
    else:
        major_tick_interval = 20
        minor_tick_interval = 5
    
    # Create the plot
    fig, ax = plt.subplots(figsize=(12, 6), dpi=150)
    
    # Plot population over time
    # Matplotlib will automatically break the line at NaN values
    ax.plot(population['Date'], population['childbearing_population'], linewidth=1.5)
    
    # Format x-axis as dates with dynamic tick spacing
    ax.xaxis.set_major_locator(mdates.YearLocator(major_tick_interval))
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y'))
    ax.xaxis.set_minor_locator(mdates.YearLocator(minor_tick_interval))
    
    # Add labels and title
    ax.set_xlabel('Year', fontsize=16)
    ax.set_ylabel('Population (Women Age 15-44)', fontsize=16)
    ax.set_title(f'Population, Women Age 15-44, {country_name} ({min_year}-{max_year})', fontsize=20, weight='bold')
    
    # Add grid
    ax.grid(True, alpha=0.3, linestyle='--')
    
    # Format y-axis to show values in millions or thousands
    # Use nanmax to handle NaN values properly
    max_population = np.nanmax(population['childbearing_population'].values)
    if not np.isnan(max_population) and max_population > 1e6:
        ax.yaxis.set_major_formatter(mpl.ticker.FuncFormatter(lambda x, p: f'{x/1e6:.1f}M'))
    elif not np.isnan(max_population):
        ax.yaxis.set_major_formatter(mpl.ticker.FuncFormatter(lambda x, p: f'{x/1e3:.0f}K'))
    
    # Source notes
    fig.text(0.05, 0, 'Source: ' + '\n    '.join(data_source_labels), fontsize=14, color='black', ha='left', va='top', style='italic')
    
    # website link
    fig.text(0.95, 0, 'aaronjbecker.com', fontsize=18, weight='bold', color='black', ha='right', va='top')
    
    plt.tight_layout()
    
    # save to file
    output_fn = output_dir / f'{country_fn_part}_population_chart.png'
    plt.savefig(output_fn, dpi=300, bbox_inches='tight')
    plt.close()


def build_births_chart(births: pl.DataFrame, country_name: str) -> None:
    """
    Assumes that births have already been filtered to a single country.
    Plots the total monthly births over time.
    """
    country_fn_part = normalize_country_name(country_name)
    # extract data sources
    data_sources = births['Source'].drop_nulls().unique().sort().to_list()
    data_source_labels = [DATA_SOURCE_LABELS[source] for source in data_sources]
    # convert to pandas for compatibility with matplotlib plotting
    births = births.to_pandas()
    
    # Sort by date for proper time series plotting
    births = births.sort_values('Date').reset_index(drop=True)
    
    # Get year range for title
    min_year = births['Year'].min()
    max_year = births['Year'].max()
    year_range = max_year - min_year
    
    # Determine tick spacing based on year range
    if year_range <= 30:
        major_tick_interval = 5
        minor_tick_interval = 1
    elif year_range <= 60:
        major_tick_interval = 10
        minor_tick_interval = 2
    elif year_range <= 150:
        major_tick_interval = 20
        minor_tick_interval = 5
    else:
        major_tick_interval = 20
        minor_tick_interval = 5
    
    # Create the plot
    fig, ax = plt.subplots(figsize=(12, 6), dpi=150)
    
    # Plot births over time
    # Matplotlib will automatically break the line at NaN values
    ax.plot(births['Date'], births['Births'], linewidth=1.5)
    
    # Format x-axis as dates with dynamic tick spacing
    ax.xaxis.set_major_locator(mdates.YearLocator(major_tick_interval))
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y'))
    ax.xaxis.set_minor_locator(mdates.YearLocator(minor_tick_interval))
    
    # Add labels and title
    ax.set_xlabel('Year', fontsize=16)
    ax.set_ylabel('Monthly Births', fontsize=16)
    ax.set_title(f'Total Monthly Births - {country_name} ({min_year}-{max_year})', fontsize=20, weight='bold')
    
    # Add grid
    ax.grid(True, alpha=0.3, linestyle='--')
    
    # Format y-axis to show values in thousands or millions
    # Use nanmax to handle NaN values properly
    max_births = np.nanmax(births['Births'].values)
    if not np.isnan(max_births) and max_births > 1e6:
        ax.yaxis.set_major_formatter(mpl.ticker.FuncFormatter(lambda x, p: f'{x/1e6:.2f}M'))
    elif not np.isnan(max_births):
        ax.yaxis.set_major_formatter(mpl.ticker.FuncFormatter(lambda x, p: f'{x/1e3:.0f}K'))
    
    # Source notes
    fig.text(0.05, 0, 'Source: ' + '\n    '.join(data_source_labels), fontsize=14, color='black', ha='left', va='top', style='italic')
    
    # website link
    fig.text(0.95, 0, 'aaronjbecker.com', fontsize=18, weight='bold', color='black', ha='right', va='top')
    
    plt.tight_layout()
    theme.apply_transforms()
    
    # save to file
    output_fn = output_dir / f'{country_fn_part}_births_chart.png'
    plt.savefig(output_fn, dpi=300, bbox_inches='tight')
    plt.close()


def build_daily_fertility_rate_chart(births: pl.DataFrame, country_name: str) -> None:
    """
    Assumes that births have already been filtered to a single country.
    Plots the daily fertility rate over time.
    """
    country_fn_part = normalize_country_name(country_name)
    # extract data sources
    data_sources = births['Source'].drop_nulls().unique().sort().to_list()
    data_source_labels = [DATA_SOURCE_LABELS[source] for source in data_sources]
    # convert to pandas for compatibility with matplotlib plotting
    births = births.to_pandas()
    
    # Sort by date for proper time series plotting
    births = births.sort_values('Date').reset_index(drop=True)
    
    # Get year range for title
    min_year = births['Year'].min()
    max_year = births['Year'].max()
    year_range = max_year - min_year
    
    # Determine tick spacing based on year range
    if year_range <= 30:
        major_tick_interval = 5
        minor_tick_interval = 1
    elif year_range <= 60:
        major_tick_interval = 10
        minor_tick_interval = 2
    elif year_range <= 150:
        major_tick_interval = 20
        minor_tick_interval = 5
    else:
        major_tick_interval = 20
        minor_tick_interval = 5
    
    # Create the plot
    fig, ax = plt.subplots(figsize=(12, 6), dpi=150)
    
    # Plot daily fertility rate over time
    # Matplotlib will automatically break the line at NaN values
    ax.plot(births['Date'], births['daily_fertility_rate'], linewidth=1.5)
    
    # Format x-axis as dates with dynamic tick spacing
    ax.xaxis.set_major_locator(mdates.YearLocator(major_tick_interval))
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y'))
    ax.xaxis.set_minor_locator(mdates.YearLocator(minor_tick_interval))
    
    # Add labels and title
    ax.set_xlabel('Year', fontsize=16)
    ax.set_ylabel('Daily Fertility Rate (per 100k)', fontsize=16)
    ax.set_title(f'Daily Fertility Rate - {country_name} ({min_year}-{max_year})', fontsize=20, weight='bold')
    
    # Add grid
    ax.grid(True, alpha=0.3, linestyle='--')
    
    # Format y-axis to show values appropriately (fertility rates are typically small numbers)
    ax.yaxis.set_major_formatter(mpl.ticker.FuncFormatter(lambda x, p: f'{x:.1f}'))
    
    # Source notes
    fig.text(0.05, 0, 'Source: ' + ',\n    '.join(data_source_labels), fontsize=14, color='black', ha='left', va='top', style='italic')
    
    # website link
    fig.text(0.95, 0, 'aaronjbecker.com', fontsize=18, weight='bold', color='black', ha='right', va='top')
    
    plt.tight_layout()
    theme.apply_transforms()
    
    # save to file
    output_fn = output_dir / f'{country_fn_part}_daily_fertility_rate_chart.png'
    plt.savefig(output_fn, dpi=300, bbox_inches='tight')
    plt.close()


def build_fertility_charts(births: pl.DataFrame, population: pl.DataFrame, stats: pl.DataFrame,
recent_chart_cutoffs: list[int] = None) -> None:
    """
    Build charts of the fertility rates by country.
    """
    if recent_chart_cutoffs is None:
        recent_chart_cutoffs = [1970, 1975, 1980] #, 1990, 2000
    # for country in births['Country'].unique().sort().to_list():
    for country in ['Netherlands', 'Spain', 'Italy', 'Japan', 'United States of America', 'Sweden', 'France', 'United Kingdom', 'Germany', 'Switzerland', 'Iceland']:
    # for country in ['France']:
        country_data = births.filter(pl.col('Country') == country)
        # Diagnostic plot: Monthly fertility rates over time with ranking analysis
        build_monthly_fertility_rate_chart(country_data, country)
        build_monthly_fertility_rate_chart(country_data, country, start_year=1975)
        build_monthly_fertility_boxplot(country_data, country)
        build_monthly_fertility_boxplot(country_data, country, start_year=1975)
        build_population_chart(population.filter(pl.col('Country') == country), country)
        build_births_chart(country_data, country)
        build_daily_fertility_rate_chart(country_data, country)        
        # Heatmap of monthly fertility rates        
        build_fertility_heatmap_figure(country_data, country, output_dir=output_dir, num_rows=3, filename_fn=lambda c: output_dir / f'{c}_fertility_heatmap_wrapped.png')
        build_fertility_heatmap_figure(country_data, country, output_dir=output_dir, num_rows=1, filename_fn=lambda c: output_dir / f'{c}_fertility_heatmap_continuous.png')
        min_year, max_year = country_data.select('Year', 'daily_fertility_rate').filter(pl.col('daily_fertility_rate').is_not_null()).unique().select(pl.col('Year').min().alias('min_year'), pl.col('Year').max().alias('max_year')).row(0, named=False)
        # isolate recent trends (after defined cutoff date)
        for recent_chart_cutoff in recent_chart_cutoffs:
            if min_year <= recent_chart_cutoff:
                recent_country_data = country_data.filter(pl.col('Year') >= recent_chart_cutoff)
                build_fertility_heatmap_figure(recent_country_data, country, output_dir=output_dir, num_rows=1, filename_fn=lambda c: output_dir / f'{c}_fertility_heatmap_since_{recent_chart_cutoff}.png')
        
        # Heatmap of birth seasonality
        build_seasonality_heatmap_figure(country_data, country, output_dir=output_dir, num_rows=3, filename_fn=lambda c: output_dir / f'{c}_seasonality_heatmap_wrapped.png')
        build_seasonality_heatmap_figure(country_data, country, output_dir=output_dir, num_rows=1, filename_fn=lambda c: output_dir / f'{c}_seasonality_heatmap_continuous.png')
        # isolate recent seasonality trends (after defined cutoff date)
        for recent_chart_cutoff in recent_chart_cutoffs:
            if min_year <= recent_chart_cutoff:
                recent_country_data = country_data.filter(pl.col('Year') >= recent_chart_cutoff)
                build_seasonality_heatmap_figure(recent_country_data, country, output_dir=output_dir, num_rows=1, filename_fn=lambda c: output_dir / f'{c}_seasonality_heatmap_since_{recent_chart_cutoff}.png')            



if __name__ == '__main__':
    births, population, stats = load_data()
    build_fertility_charts(births, population, stats)