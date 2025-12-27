"""
Functions for creating fertility rate heatmap visualizations.
"""
from pathlib import Path
from typing import Optional, Callable
import polars as pl
import pandas as pd
import numpy as np
import matplotlib as mpl
import matplotlib.pyplot as plt
from matplotlib.colors import LogNorm, Normalize
from matplotlib import transforms
from matplotlib.gridspec import GridSpec

from fertility_heatmap_config import MONTH_NAMES, DATA_SOURCE_LABELS, normalize_country_name
from tick_spacing_helpers import get_rounded_ticks, get_first_even_year


def calculate_years_per_row(total_years: int, num_rows: int, min_years_per_row: int = 1) -> int:
    """
    Calculate the number of years per row, preferring multiples of 5 or 10 for cleaner displays.
    
    Args:
        total_years: Total number of years to display
        num_rows: Desired number of rows
        min_years_per_row: Minimum number of years per row (default: 1). 
                          The last row must have at least this many years.
        
    Returns:
        Number of years per row, rounded to nearest multiple of 5 (for spans <= 30) 
        or 10 (for larger spans), as long as the last row has at least min_years_per_row.
    """
    if num_rows <= 0:
        raise ValueError("num_rows must be positive")
    if min_years_per_row <= 0:
        raise ValueError("min_years_per_row must be positive")
    if total_years <= 0:
        return max(1, min_years_per_row)
    
    # Use ceiling division to calculate ideal years_per_row
    ideal_years_per_row = (total_years + num_rows - 1) // num_rows
    
    # Enforce minimum years per row first
    years_per_row = max(min_years_per_row, ideal_years_per_row)
    
    # Determine rounding multiple: 5 for spans <= 30, 10 for larger spans
    rounding_multiple = 5 if total_years <= 30 else 10
    
    # Round to nearest multiple
    rounded_down = (years_per_row // rounding_multiple) * rounding_multiple
    rounded_up = rounded_down + rounding_multiple
    
    # Check which rounded value to use
    # We want to prefer the rounded value, but ensure the last row has at least min_years_per_row
    def check_last_row(ypr):
        """Check if using ypr, the last row would have at least min_years_per_row."""
        if ypr >= total_years:
            return True  # Single row, all years
        # Calculate how many full rows we'd have
        num_full_rows = total_years // ypr
        remaining_years = total_years - num_full_rows * ypr
        # If there's a remainder, it becomes the last row
        if remaining_years > 0:
            return remaining_years >= min_years_per_row
        # If no remainder, the last full row is the last row (which has ypr years)
        return ypr >= min_years_per_row
    
    # Try rounded_up first (prefer larger values for cleaner multiples)
    if rounded_up >= min_years_per_row and check_last_row(rounded_up):
        return rounded_up
    
    # Try rounded_down
    if rounded_down >= min_years_per_row and check_last_row(rounded_down):
        return rounded_down
    
    # If neither rounded value works, fall back to the ideal (already enforced minimum)
    return years_per_row


def split_years_into_chunks(years: np.ndarray, years_per_row: int) -> list:
    """
    Split years into chunks for multi-row heatmap display.
    
    Args:
        years: numpy array of years (already sorted)
        years_per_row: Maximum number of years per row
        
    Returns:
        List of numpy arrays, each containing a chunk of years
    """
    num_years = len(years)
    
    if num_years > years_per_row:
        # Calculate number of chunks
        num_chunks = (num_years + years_per_row - 1) // years_per_row  # ceiling division
        
        # Create list of year ranges for each chunk
        year_chunks = []
        for i in range(num_chunks):
            start_idx = i * years_per_row
            end_idx = min((i + 1) * years_per_row, num_years)
            year_chunks.append(years[start_idx:end_idx])
    else:
        # Single subplot
        year_chunks = [years]
    
    return year_chunks


def shift_axes_by_points(ax, fig, dx_points, dy_points):
    """
    Shifts the position of a matplotlib axes by a specified offset in points.

    Args:
        ax (matplotlib.axes.Axes): The axes object to shift.
        fig (matplotlib.figure.Figure): The figure object containing the axes.
        dx_points (float): The horizontal shift amount in points (positive for right).
        dy_points (float): The vertical shift amount in points (positive for up).
    """
    # 1. Determine the transformation needed to convert points to figure coordinates (0-1)
    # This transform converts point values to the relative figure coordinates
    point_to_figure_coord = fig.dpi_scale_trans + fig.transFigure.inverted()
    
    # dpi_scale_trans is in figure-inches; 
    # cf. https://matplotlib.org/stable/users/explain/artists/transforms_tutorial.html#transformations-tutorial
    # a point is always 1/72 of an inch, so we need to convert our offsets to inches.
    dx_inches = dx_points/72.
    dy_inches = dy_points/72.

    # 2. Convert the desired point offset to the equivalent offset in figure coordinates
    # We find the difference in figure coordinates between the origin (0,0) and (dx, dy)
    origin_fig = point_to_figure_coord.transform((0, 0))
    offset_fig = point_to_figure_coord.transform((dx_inches, dy_inches))
    
    dx_figure_units = offset_fig[0] - origin_fig[0]
    dy_figure_units = offset_fig[1] - origin_fig[1]

    # 3. Get the current position of the axes (in figure coordinates [x0, y0, width, height])
    current_pos = ax.get_position()

    # 4. Create the new position with the applied offset
    # The width and height remain unchanged
    new_pos = [
        current_pos.x0 + dx_figure_units,
        current_pos.y0 + dy_figure_units,
        current_pos.width,
        current_pos.height
    ]

    # 5. Set the axes to the new position
    ax.set_position(new_pos)


def build_heatmap_figure(
    data: pl.DataFrame,
    output_path: Path,
    title: str,
    subtitle: str = None,
    colorbar_title: str = None,
    source_labels: list = None,
    years_per_row: int = 35,
    colormap: str = None,
    log_scale_colors: bool = False,
    value_column: str = 'daily_fertility_rate',
    y_axis_labels: list = None,
    website_label: str = 'aaronjbecker.com',
    colorbar_tick_formatter: Optional[Callable[[float], str]] = None,
) -> None:
    """
    Build a generic heatmap figure with months as rows and years as columns.
    
    Args:
        data: polars DataFrame with data (must have 'Month', 'Year', and value_column columns)
        output_path: Path, full path (including directory and filename with extension) to save the output figure
        title: str, main title for the figure
        subtitle: str, optional subtitle (displayed below main title)
        colorbar_title: str, optional title for the colorbar
        source_labels: list of str, optional list of source attribution labels
        years_per_row: int, Maximum number of years per row (subplot). If data exceeds this, it will wrap to new rows
        colormap: str, colormap name (default: 'turbo')
        log_scale_colors: bool, whether to use logarithmic color scale (default: False)
        value_column: str, name of the column containing values to plot
        y_axis_labels: list of str, labels for y-axis (months). Defaults to MONTH_NAMES
        website_label: str, website label to display at bottom right (default: 'aaronjbecker.com')
        colorbar_tick_formatter: callable, optional function that takes a float value and returns a formatted string.
                                If None, uses default formatting (integers when possible, otherwise 1 decimal place).
    """
    if colormap is None:
        colormap = 'turbo'
    
    if y_axis_labels is None:
        y_axis_labels = MONTH_NAMES
    
    # Convert to pandas for compatibility with pivot_table
    data = data.to_pandas()

    # Prepare data for heatmap: pivot to have months as rows, years as columns (horizontal orientation)
    heatmap_data = data.pivot_table(
        index='Month', 
        columns='Year', 
        values=value_column,
        dropna=False,
    )

    # Reorder months to match 1-12 order (Jan=1, Dec=12)
    heatmap_data = heatmap_data.reindex(index=range(1, 13))

    # Ensure years are sorted
    heatmap_data = heatmap_data.sort_index(axis=1)

    # ============================================================================
    # PLOTTING PARAMETERS
    # ============================================================================
    # Get min and max values for colorbar (use full dataset)
    # Ensure vmin is positive for logarithmic normalization
    vmin = max(np.nanmin(heatmap_data.values), 1e-6)  # use small positive value if min is too close to zero
    vmax = np.nanmax(heatmap_data.values)

    if log_scale_colors:
        color_norm = LogNorm(vmin=vmin, vmax=vmax)
    else:
        color_norm = Normalize(vmin=vmin, vmax=vmax)

    # Determine if we need to wrap into multiple subplots
    years = heatmap_data.columns.values
    num_years = len(years)
    first_year = years[0]
    last_year = years[-1]

    # Split years into chunks using helper function
    year_chunks = split_years_into_chunks(years, years_per_row)
    num_chunks = len(year_chunks)

    # Define aspect ratio (width:height ratio for a reference subplot)
    # Determine width based on number of years per row: we want approximately square heatmap cells
    base_width = max(5, years_per_row / 2.5)
    base_height = 5  # this is admittedly a magic number

    # Calculate figure dimensions
    # Each subplot row has base_height, plus space for title and margins
    num_rows = num_chunks
    total_height = num_rows * base_height + 2  # extra space for title and spacing

    # Total width: base width for reference years_per_row, plus space for colorbars
    total_width = base_width + 2  # extra space for colorbars on sides

    # Create figure with appropriate size
    fig = plt.figure(figsize=(total_width, total_height), dpi=150)

    # ============================================================================
    # FONT SCALING
    # ============================================================================
    # For single row cases, use larger base fonts and scale based on both width and height
    # For multi-row cases, scale based on figure dimensions
    if num_rows == 1:
        # Single row: use larger base fonts and scale based on width and height
        # Reference: assume ~15 inch width and ~7 inch height for typical single row
        ref_width = 7.0
        ref_height = 7.0
        
        # Scale based on both dimensions (geometric mean to balance width and height)
        width_scale = total_width / ref_width
        height_scale = total_height / ref_height
        font_scale = np.sqrt(width_scale * height_scale)  # geometric mean
        font_scale = max(1.0, font_scale)  # At least 1.0
        
        # Larger base fonts for single row (since figure is wide)
        base_font_title = 24
        base_font_subtitle = 18
        base_font_subplot_title = 14
        base_font_tick_labels = 11
        # cbar size is also used for x axis ticks
        base_font_cbar_tick = 11
        base_font_cbar_labels = 11
        base_font_cbar_title = 11
    else:
        # Multi-row: scale based on figure area
        ref_height = base_height + 2  # reference height for single row
        ref_area = base_width * ref_height  # reference figure area
        actual_area = total_width * total_height  # actual figure area
        
        # Scale factor based on area ratio (square root to maintain proportional scaling)
        font_scale = np.sqrt(actual_area / ref_area)
        
        # Base font sizes for multi-row case
        base_font_title = 20
        base_font_subtitle = 16
        base_font_subplot_title = 14
        base_font_tick_labels = 10
        # cbar size is also used for x axis ticks
        base_font_cbar_tick = 10
        base_font_cbar_labels = 10
        base_font_cbar_title = 10

    # Scaled font sizes
    font_title = base_font_title * font_scale
    font_subtitle = base_font_subtitle * font_scale
    font_subplot_title = base_font_subplot_title * font_scale
    font_tick_labels = base_font_tick_labels * font_scale
    font_cbar_tick = base_font_cbar_tick * font_scale
    font_cbar_labels = base_font_cbar_labels * font_scale
    font_cbar_title = base_font_cbar_title * font_scale

    # Define margins and spacing for GridSpec (GridSpec will handle the rest)
    left_margin = 0.1
    right_margin = 0.1
    top_margin = 0.15
    bottom_margin = 0.08
    hspace = 0.05 * num_rows + 0.1    
    # wspace is the horizontal space between subplots; needs to increase if the heatmaps are less wide?
    # since we're manually adjusting the colorbar location, we can probably dispense with gridspec spacing.
    wspace = 0.0

    # Function to determine label spacing for a given number of years
    # This controls how often labels appear on major ticks
    def get_label_spacing(num_years_chunk):
        if num_years_chunk <= 40:
            return 2
        elif num_years_chunk <= 100:
            return 5
        else:
            return 10
    
    # Function to determine major tick spacing (actual tick marks)
    # Major ticks appear every 5 years, or more often for shorter spans
    def get_major_tick_spacing(num_years_chunk):
        if num_years_chunk <= 10:
            return 1
        elif num_years_chunk <= 20:
            return 2
        else:
            return 5

    # Default tick formatter if none provided
    if colorbar_tick_formatter is None:
        def default_format_tick(x):
            if abs(x) < 1e-6:
                return '0'
            if abs(x - int(x)) < 1e-6:
                return f'{int(x)}'
            else:
                return f'{x:.1f}'
        colorbar_tick_formatter = default_format_tick
    
    # Function to plot colorbar
    def plot_cbar(cax, im, title=None):
        cb = plt.colorbar(im, cax=cax, orientation='vertical')
        cb.outline.set_edgecolor('black')
        
        # Generate nicely rounded tick values
        tick_values = get_rounded_ticks(vmin, vmax, target_num_ticks=7)
        
        # Set ticks and format using the provided formatter
        cb.set_ticks(tick_values)
        
        # Use custom formatter
        def format_tick(x, p):
            return colorbar_tick_formatter(x)
        
        cb.ax.yaxis.set_major_formatter(mpl.ticker.FuncFormatter(format_tick))
        cax.minorticks_off()
        
        cax.tick_params(which='major', labelsize=font_cbar_tick, length=4, width=1)
        cax.yaxis.set_ticks_position('left')
        cax.yaxis.set_label_position('left')
        cax.yaxis.tick_left()
        
        # Add min and max value labels at the ends
        cax.text(0.5, -0.02, colorbar_tick_formatter(vmin), 
                transform=cax.transAxes, ha='center', va='top',
                fontsize=font_cbar_labels, color='black')
        cax.text(0.5, 1.02, colorbar_tick_formatter(vmax), 
                transform=cax.transAxes, ha='center', va='bottom',
                fontsize=font_cbar_labels, color='black')
        
        if title:
            # Add vertical title to the right of the tick labels
            t = transforms.offset_copy(cax.transAxes, fig=fig, x=2*font_cbar_title, units='points')
            cax.text(1.0, 0.5, title,
                    ha='center', va='center',
                    fontsize=font_cbar_title, color='black', rotation=270, transform=t)

    # Find the maximum number of years in any chunk to size the heatmap column
    max_chunk_years = max(len(chunk) for chunk in year_chunks)

    # Calculate width ratios for GridSpec columns
    # Heatmap column width should be proportional to max years, colorbar is fixed narrow
    # Use relative ratios - GridSpec will normalize them within available space
    heatmap_width_ratio = max_chunk_years  # proportional to max years
    colorbar_width_ratio = 1 # fixed narrow column
    
    # Create main GridSpec with 2 columns: heatmap area + colorbar column
    # GridSpec handles all positioning, margins, and spacing automatically
    main_gs = GridSpec(num_rows, 2, figure=fig,
                       left=left_margin, right=1.0 - right_margin,
                       top=1.0 - top_margin, bottom=bottom_margin,
                       hspace=hspace, wspace=wspace,
                       width_ratios=[heatmap_width_ratio, colorbar_width_ratio])
    
    # Plot each chunk as a subplot
    axes = []
    images = []
    for row_idx, chunk_years in enumerate(year_chunks):
        # Extract data for this chunk
        chunk_data = heatmap_data[chunk_years]
        
        # Create heatmap subplot - GridSpec positions it automatically
        ax = fig.add_subplot(main_gs[row_idx, 0])
        
        # Adjust heatmap width to match actual data (left-aligned)
        # Calculate width ratio for this specific chunk
        chunk_width_ratio = len(chunk_years) / max_chunk_years
        if chunk_width_ratio < 1.0:
            pos = ax.get_position()
            new_width = pos.width * chunk_width_ratio
            ax.set_position([pos.x0, pos.y0, new_width, pos.height])
        
        axes.append(ax)
        
        # Set axes face color to show through for null values
        ax.set_facecolor('#a6a09b')
        
        # Create heatmap
        im = ax.imshow(chunk_data.values, interpolation='nearest', cmap=colormap, aspect='auto', 
                    norm=color_norm)
        images.append(im)
        
        # Styling
        ax.grid(False)
        for spine in ax.spines.values():
            spine.set_color('black')
        
        # Calculate tick spacing for this chunk
        chunk_num_years = len(chunk_years)
        label_spacing = get_label_spacing(chunk_num_years)  # Spacing for labels
        major_tick_spacing = get_major_tick_spacing(chunk_num_years)  # Spacing for major tick marks
        
        chunk_first_year = chunk_years[0]
        chunk_last_year = chunk_years[-1]
        
        if num_rows > 1:
            # Add left-aligned title showing year range for this subplot
            ax.set_title(f'{chunk_first_year}-{chunk_last_year}', 
                        fontsize=font_subplot_title, color='black', loc='left', pad=10, weight='bold')
        
        # Find first even year for major ticks
        first_even_year_major = get_first_even_year(chunk_first_year, major_tick_spacing)
        
        # Create major tick years (every 5 years, or more often for shorter spans)
        major_tick_years = np.arange(first_even_year_major, chunk_last_year + 1, major_tick_spacing)
        
        # Ensure first and last years are included in major ticks
        if chunk_first_year not in major_tick_years:
            major_tick_years = np.append(chunk_first_year, major_tick_years)
        if chunk_last_year not in major_tick_years:
            major_tick_years = np.append(major_tick_years, chunk_last_year)
        
        # Sort and filter major ticks to only include years that exist in this chunk
        major_tick_years = np.sort(major_tick_years)
        major_tick_years = major_tick_years[np.isin(major_tick_years, chunk_years)]
        major_tick_positions = [np.where(chunk_years == year)[0][0] for year in major_tick_years]
        
        # Find first even year for labels
        first_even_year_label = get_first_even_year(chunk_first_year, label_spacing)
        
        # Create label years (using label_spacing)
        label_years = np.arange(first_even_year_label, chunk_last_year + 1, label_spacing)
        
        # Sort and filter labels to only include years that exist in this chunk AND are major ticks
        label_years = np.sort(label_years)
        label_years = label_years[np.isin(label_years, chunk_years)]
        # Only show labels at positions that are also major ticks
        label_years = label_years[np.isin(label_years, major_tick_years)]
        
        # Track whether first and last years are at regular label intervals (after filtering)
        first_at_regular_interval = chunk_first_year in label_years
        last_at_regular_interval = chunk_last_year in label_years
        
        # Ensure first and last years are included in labels if they are major ticks
        if not first_at_regular_interval and chunk_first_year in major_tick_years:
            label_years = np.append(chunk_first_year, label_years)
        if not last_at_regular_interval and chunk_last_year in major_tick_years:
            label_years = np.append(label_years, chunk_last_year)
        
        # Final sort after adding first/last
        label_years = np.sort(label_years)
        label_positions = [np.where(chunk_years == year)[0][0] for year in label_years]
        
        # Set x-axis major ticks (all major tick positions)
        ax.set_xticks(major_tick_positions)
        
        # Create label list: empty strings for major ticks without labels, year strings for label positions
        tick_labels = []
        for pos in major_tick_positions:
            if pos in label_positions:
                label_idx = label_positions.index(pos)
                tick_labels.append(str(label_years[label_idx]))
            else:
                tick_labels.append('')
        
        # Set labels with proper formatting
        labels = ax.set_xticklabels(tick_labels, fontsize=font_cbar_labels, color='black', rotation=0, ha='center', va='top')
        
        # Adjust horizontal alignment for first/last labels if not at regular intervals
        if len(label_years) > 0 and not first_at_regular_interval:
            first_label_pos = label_positions[0]
            if first_label_pos in major_tick_positions:
                idx = major_tick_positions.index(first_label_pos)
                labels[idx].set_ha('right')
        if len(label_years) > 1 and not last_at_regular_interval:
            last_label_pos = label_positions[-1]
            if last_label_pos in major_tick_positions:
                idx = major_tick_positions.index(last_label_pos)
                labels[idx].set_ha('left')
        
        ax.xaxis.tick_bottom()
        
        # Set x-axis minor ticks (every year)
        minor_tick_positions = np.arange(0, len(chunk_years), 1)
        ax.set_xticks(minor_tick_positions, minor=True)
        
        # Configure tick parameters
        ax.tick_params(axis='x', which='major', length=4 * font_scale, width=1 * font_scale, bottom=True, top=False)
        ax.tick_params(axis='x', which='minor', length=2 * font_scale, width=0.5 * font_scale, bottom=True, top=False)
        
        # Set y-axis ticks and labels (month names)
        ax.set_yticks(np.arange(12))
        ax.set_yticklabels(y_axis_labels, fontsize=font_tick_labels, color='black', va='center')
        ax.tick_params(axis='y', labelleft=True, labelright=False, left=True, right=False)
        
        # Create colorbar subplot in the right column (aligned across all rows)
        cax = fig.add_subplot(main_gs[row_idx, 1])        
        shift_axes_by_points(cax, fig, dx_points=font_cbar_title * 5, dy_points=0.0)
        plot_cbar(cax, im, title=colorbar_title)
    
    # TOP TEXT
    # Place this relative to the first (top) axis, starting with bottom-most text and working upwards
    top_ax = axes[0]
    ex = top_ax.get_window_extent()
    # Use the bbox before it's transformed, since that's in figure coordinates rather than pixels.
    x, y = ex._bbox.x0, ex._bbox.y1
    t = transforms.offset_copy(fig.transFigure, fig=fig, y=40, units='points')
    
    # Subtitle (below main title) - only if provided
    if subtitle:
        text = fig.text(x, y,
                subtitle,
                fontsize=font_subtitle, color='black', ha='left', va='bottom', transform=t)
        ex = text.get_window_extent()
        x, y = text.get_position()
        height_in = fig.dpi_scale_trans.inverted().transform((0, ex.height))[1]
        t = transforms.offset_copy(text._transform, fig=fig, y=height_in + 10 / 72.0, units='inches')
    
    # Main title
    text = fig.text(x, y,
            title, 
            fontsize=font_title, color='black', weight='bold', ha='left', va='bottom', transform=t)

    # BOTTOM TEXT
    bottom_ax = axes[-1]
    ex = bottom_ax.get_window_extent()
    x, y = ex._bbox.x0, ex._bbox.y0
    space_from_bottom = -3 * font_tick_labels
    t = transforms.offset_copy(fig.transFigure, fig=fig, y=space_from_bottom, x=-20, units='points')
    # Source notes - only if provided
    if source_labels:
        fig.text(x, y, 'Source: ' + '\n    '.join(source_labels), fontsize=font_tick_labels, color='black', ha='left', va='top', style='italic', transform=t)
    # Website link: relative to last colorbar
    last_cbar = fig.axes[-1]
    ex = last_cbar.get_window_extent()
    x, y = ex._bbox.x1, ex._bbox.y0
    t = transforms.offset_copy(fig.transFigure, fig=fig, y=space_from_bottom, x=10, units='points')
    fig.text(x, y, website_label, fontsize=font_subtitle, weight='bold', color='black', ha='right', va='top', transform=t)
    
    if num_rows == 1:
        bbox_inches = 'tight'
        pad_inches = 0.5
    else:
        bbox_inches = None
        pad_inches = None
    
    # Save to file
    plt.savefig(output_path, dpi=150, bbox_inches=bbox_inches, pad_inches=pad_inches)
    plt.close()


def build_fertility_heatmap_figure(
    births: pl.DataFrame,
    country_name: str,
    output_dir: Path,
    num_rows: int = 3,
    min_years_per_row: int = 20,
    colormap: str = None,
    log_scale_colors: bool = False,
    value_column: str = 'daily_fertility_rate',
    filename_fn: Optional[Callable[[str], Path]] = None,
) -> None:
    """
    Build a heatmap of the daily fertility rate by month and year.
    This is a wrapper function that supplies fertility-specific arguments to the generic build_heatmap_figure.
    
    Args:
        births: polars DataFrame with births data (already filtered to a single country)
        country_name: str, the name of the country
        output_dir: Path, directory to save the output figure (used if filename_fn is None)
        num_rows: int, Desired number of rows for the heatmap (default: 3). Years will be evenly divided across rows.
        min_years_per_row: int, Minimum number of years per row (default: 20). If the calculated years_per_row
                          would be less than this, this value is used instead, resulting in fewer rows than requested.
        colormap: str, colormap name (default: 'turbo')
        log_scale_colors: bool, whether to use logarithmic color scale (default: False)
        value_column: str, name of the column containing values to plot (default: 'daily_fertility_rate')
        filename_fn: callable, optional function that takes normalized country name (str) and returns 
                    full output path (Path). If None, uses default behavior: output_dir / '{normalized_country}_fertility_heatmap.png'
    """
    # Extract data sources for labeling
    data_sources = births['Source'].drop_nulls().unique().sort().to_list()
    data_source_labels = [DATA_SOURCE_LABELS[source] for source in data_sources]
    
    # Remove leading and trailing years that are all null
    # Find years that have at least one non-null value
    years_with_data = (
        births
        .filter(pl.col(value_column).is_not_null())
        .select(pl.col('Year').unique().sort())
    )
    
    if years_with_data.height > 0:
        # Get first and last years with data
        first_year_with_data = years_with_data['Year'].min()
        last_year_with_data = years_with_data['Year'].max()
        
        # Filter to keep all years between first and last (inclusive), preserving any null years in between
        births = births.filter(
            (pl.col('Year') >= first_year_with_data) & 
            (pl.col('Year') <= last_year_with_data)
        )
    
    # Get year range for title (after filtering)
    years = births['Year'].unique().sort().to_list()
    first_year = years[0]
    last_year = years[-1]
    
    # Calculate years_per_row based on desired num_rows for even division
    num_years = len(years)
    years_per_row = calculate_years_per_row(num_years, num_rows, min_years_per_row)
    
    # Determine actual number of rows (may be less than requested if data is small)
    actual_num_rows = (num_years + years_per_row - 1) // years_per_row if num_years > years_per_row else 1
    linebreak = "\n    " if actual_num_rows > 1 else " "
    
    # Format titles
    title = f'Monthly Fertility Rate,{linebreak}{country_name}: {first_year} to {last_year}'
    subtitle = 'Daily Births Per 100k Women (Age 15-44)'
    colorbar_title = 'Daily Births\nper 100k Women Age 15-44'
    
    # Determine output path
    country_fn_part = normalize_country_name(country_name)
    if filename_fn is not None:
        output_path = filename_fn(country_fn_part)
    else:
        # Default behavior: use output_dir with standard filename
        output_path = output_dir / f'{country_fn_part}_fertility_heatmap.png'
    
    # Call the generic function
    build_heatmap_figure(
        data=births,
        output_path=output_path,
        title=title,
        subtitle=subtitle,
        colorbar_title=colorbar_title,
        source_labels=data_source_labels,
        years_per_row=years_per_row,
        colormap=colormap,
        log_scale_colors=log_scale_colors,
        value_column=value_column,
        y_axis_labels=MONTH_NAMES,
        website_label='aaronjbecker.com',
        colorbar_tick_formatter=None,  # Use default formatting
    )


def build_seasonality_heatmap_figure(
    births: pl.DataFrame,
    country_name: str,
    output_dir: Path,
    num_rows: int = 3,
    min_years_per_row: int = 20,
    filename_fn: Optional[Callable[[str], Path]] = None,
) -> None:
    """
    Build a heatmap of birth seasonality (percentage deviation from annual average) by month and year.
    This is a wrapper function that supplies seasonality-specific arguments to the generic build_heatmap_figure.
    
    Args:
        births: polars DataFrame with births data (already filtered to a single country)
        country_name: str, the name of the country
        output_dir: Path, directory to save the output figure (used if filename_fn is None)
        num_rows: int, Desired number of rows for the heatmap (default: 3). Years will be evenly divided across rows.
        min_years_per_row: int, Minimum number of years per row (default: 20). If the calculated years_per_row
                          would be less than this, this value is used instead, resulting in fewer rows than requested.
        colormap: str, colormap name (default: 'turbo')
        log_scale_colors: bool, whether to use logarithmic color scale (default: False)
        filename_fn: callable, optional function that takes normalized country name (str) and returns 
                    full output path (Path). If None, uses default behavior: output_dir / '{normalized_country}_seasonality_heatmap.png'
    """
    value_column = 'seasonality_percentage_normalized'
    
    # Extract data sources for labeling
    data_sources = births['Source'].drop_nulls().unique().sort().to_list()
    data_source_labels = [DATA_SOURCE_LABELS[source] for source in data_sources]
    
    # Remove leading and trailing years that are all null
    # Find years that have at least one non-null value
    years_with_data = (
        births
        .filter(pl.col(value_column).is_not_null())
        .select(pl.col('Year').unique().sort())
    )
    
    if years_with_data.height > 0:
        # Get first and last years with data
        first_year_with_data = years_with_data['Year'].min()
        last_year_with_data = years_with_data['Year'].max()
        
        # Filter to keep all years between first and last (inclusive), preserving any null years in between
        births = births.filter(
            (pl.col('Year') >= first_year_with_data) & 
            (pl.col('Year') <= last_year_with_data)
        )
    
    # Get year range for title (after filtering)
    years = births['Year'].unique().sort().to_list()
    first_year = years[0]
    last_year = years[-1]
    
    # Calculate years_per_row based on desired num_rows for even division
    num_years = len(years)
    years_per_row = calculate_years_per_row(num_years, num_rows, min_years_per_row)
    
    # Determine actual number of rows (may be less than requested if data is small)
    actual_num_rows = (num_years + years_per_row - 1) // years_per_row if num_years > years_per_row else 1
    linebreak = "\n    " if actual_num_rows > 1 else " "
    
    # Format titles
    title = f'Birth Seasonality,{linebreak}{country_name}: {first_year} to {last_year}'
    subtitle = 'Percentage of annual live births in each month,\n  normalized to a 30-day month and 360-day year.'
    colorbar_title = '% of annual births'
    
    # Determine output path
    country_fn_part = normalize_country_name(country_name)
    if filename_fn is not None:
        output_path = filename_fn(country_fn_part)
    else:
        # Default behavior: use output_dir with standard filename
        output_path = output_dir / f'{country_fn_part}_seasonality_heatmap.png'
    
    # Percentage formatter for seasonality values (one decimal place)
    def percentage_formatter(x: float) -> str:
        return f'{x * 100:.1f}%'
    
    # Call the generic function
    build_heatmap_figure(
        data=births,
        output_path=output_path,
        title=title,
        subtitle=subtitle,
        colorbar_title=colorbar_title,
        source_labels=data_source_labels,
        years_per_row=years_per_row,
        colormap='turbo',
        log_scale_colors=False,
        value_column=value_column,
        y_axis_labels=MONTH_NAMES,
        website_label='aaronjbecker.com',
        colorbar_tick_formatter=percentage_formatter,
    )

