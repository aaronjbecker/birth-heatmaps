"""
US state-level birth data loaders.

Data sources:
- CDC WONDER: Monthly births by state (2003-2024)
- Historical: US births by state (1915-2008)

Note: This loader produces a separate dataset from country-level data.
The 'Country' column contains US state names for format consistency,
but states should not be intermingled with countries in downstream processing.
"""
import polars as pl
from pathlib import Path
from typing import Optional

from config import STATES_DATA_DIR


def _load_cdc_wonder_file(file_path: Path) -> pl.DataFrame:
    """
    Load a CDC WONDER format file.

    Expected columns: Notes, State, State Code, Year, Year Code, Month, Month Code, Births

    Filters out:
    - "Total" rows (aggregates by year/state)
    - Rows with empty Births values
    """
    df = pl.read_csv(file_path, infer_schema_length=10000)

    # Filter out Total rows (Notes column contains "Total")
    df = df.filter(
        pl.col('Notes').is_null() | ~pl.col('Notes').str.contains('Total')
    )

    # Filter rows where Month Code is not null (excludes aggregate rows)
    df = df.filter(pl.col('Month Code').is_not_null())

    # Select and rename columns
    df = df.select(
        pl.col('State').alias('Country'),
        pl.col('Year').cast(pl.Int64),
        pl.col('Month Code').cast(pl.Int64).alias('Month'),
        pl.col('Births').cast(pl.Float64),
    )

    return df


def _load_historical_file(file_path: Path) -> pl.DataFrame:
    """
    Load the historical US births file (1915-2008).

    This file has:
    - CR-only line endings (not standard LF/CRLF)
    - "na" string for missing birth values
    - No District of Columbia data
    - Columns: year, month, num, mo, state, kid, stateid, births, ...

    Filters out rows with "na" births.
    """
    # Read with CR line endings
    df = pl.read_csv(
        file_path,
        infer_schema_length=100000,
        eol_char='\r',
    )

    # Filter out rows with "na" births
    df = df.filter(pl.col('births') != 'na')

    # Select and rename columns
    df = df.select(
        pl.col('state').alias('Country'),
        pl.col('year').cast(pl.Int64).alias('Year'),
        pl.col('mo').cast(pl.Int64).alias('Month'),
        pl.col('births').cast(pl.Float64).alias('Births'),
    )

    return df


def load_births(data_dir: Optional[Path] = None) -> pl.DataFrame:
    """
    Load and consolidate US state-level birth data from multiple sources.

    Combines three data files:
    - CDC WONDER 2003-2006
    - CDC WONDER 2007-2024
    - Historical 1915-2008

    For overlapping years (2003-2008), CDC WONDER data is preferred.

    Args:
        data_dir: Directory containing the data files. Defaults to STATES_DATA_DIR.

    Returns:
        DataFrame with columns: Country (state name), Year, Month, Births
        Sorted by Country, Year, Month.
    """
    if data_dir is None:
        data_dir = STATES_DATA_DIR

    # Load CDC WONDER files (preferred source for 2003-2024)
    cdc_2003_2006 = _load_cdc_wonder_file(
        data_dir / 'monthly-births-by-state-2003-2006.csv'
    )
    cdc_2007_2024 = _load_cdc_wonder_file(
        data_dir / 'monthly-births-by-state-2007-2024.csv'
    )
    cdc_all = pl.concat([cdc_2003_2006, cdc_2007_2024])

    # Load historical file
    historical = _load_historical_file(data_dir / 'US_BIRTH_1915_2008.csv')

    # Use anti-join to get historical rows NOT in CDC data
    # This gives us pre-2003 data from the historical file
    historical_only = historical.join(
        cdc_all.select('Country', 'Year', 'Month'),
        on=['Country', 'Year', 'Month'],
        how='anti',
    )

    # Combine: CDC data (preferred) + historical-only data
    combined = pl.concat([cdc_all, historical_only])

    # Sort for consistency
    combined = combined.sort(['Country', 'Year', 'Month'])

    return combined
