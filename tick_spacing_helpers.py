"""
Helper functions for generating nicely spaced tick values for charts.
"""
import numpy as np


def get_rounded_ticks(vmin, vmax, target_num_ticks=5):
    """
    Generate nicely rounded tick values (multiples of 2, 5, or 10) 
    between vmin and vmax, aiming for approximately target_num_ticks ticks.
    """
    data_range = vmax - vmin
    # Estimate step size for target number of ticks
    rough_step = data_range / (target_num_ticks - 1)
    
    # Find the order of magnitude
    magnitude = 10 ** np.floor(np.log10(rough_step))
    normalized_step = rough_step / magnitude
    
    # Try different step sizes (2, 5, 10) and choose the one that gives
    # the best number of ticks closest to target_num_ticks
    best_step = None
    best_num_ticks = 0
    best_tick_values = None
    
    for nice_multiplier in [2, 5, 10]:
        step = nice_multiplier * magnitude
        
        # Round vmin down to nearest multiple of step
        tick_min = np.floor(vmin / step) * step
        
        # Round vmax up to nearest multiple of step
        tick_max = np.ceil(vmax / step) * step
        
        # Generate ticks
        candidate_ticks = np.arange(tick_min, tick_max + step/2, step)
        
        # Filter to only include ticks within [vmin, vmax]
        candidate_ticks = candidate_ticks[(candidate_ticks >= vmin) & (candidate_ticks <= vmax)]
        
        # Sort and remove duplicates
        candidate_ticks = np.unique(np.sort(candidate_ticks))
        num_ticks = len(candidate_ticks)
        
        # Prefer steps that give us a good number of ticks (3-7 ticks)
        # Prefer smaller steps (5 over 10) when they give similar results
        if num_ticks >= 3 and num_ticks <= 7:
            if best_step is None:
                best_step = step
                best_num_ticks = num_ticks
                best_tick_values = candidate_ticks
            elif abs(num_ticks - target_num_ticks) < abs(best_num_ticks - target_num_ticks):
                # Better match to target
                best_step = step
                best_num_ticks = num_ticks
                best_tick_values = candidate_ticks
            elif abs(num_ticks - target_num_ticks) == abs(best_num_ticks - target_num_ticks):
                # Same distance from target, prefer smaller step (5 over 10)
                if nice_multiplier < (best_step / magnitude):
                    best_step = step
                    best_num_ticks = num_ticks
                    best_tick_values = candidate_ticks
    
    # If no good step found, use the default logic
    if best_step is None:
        if normalized_step <= 2:
            nice_multiplier = 2
        elif normalized_step <= 5:
            nice_multiplier = 5
        else:
            nice_multiplier = 10
        step = nice_multiplier * magnitude
        tick_min = np.floor(vmin / step) * step
        tick_max = np.ceil(vmax / step) * step
        best_tick_values = np.arange(tick_min, tick_max + step/2, step)
        best_tick_values = best_tick_values[(best_tick_values >= vmin) & (best_tick_values <= vmax)]
        best_tick_values = np.unique(np.sort(best_tick_values))
    
    return best_tick_values


def get_first_even_year(first_yr, spacing):
    """
    Find the first even year for tick spacing.
    
    Args:
        first_yr: The first year in the data
        spacing: The tick spacing (2, 5, or 10)
    
    Returns:
        The first year that should be used for tick marks
    """
    if spacing == 2:
        return first_yr if first_yr % 2 == 0 else first_yr + 1
    elif spacing == 5:
        remainder = first_yr % 10
        if remainder == 0 or remainder == 5:
            return first_yr
        elif remainder < 5:
            return first_yr - remainder + 5
        else:
            return first_yr - remainder + 10
    else:  # spacing == 10
        remainder = first_yr % 10
        if remainder == 0:
            return first_yr
        else:
            return ((first_yr // 10) + 1) * 10

