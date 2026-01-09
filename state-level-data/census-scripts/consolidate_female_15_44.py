#!/usr/bin/env python3
"""
Consolidate female population aged 15-44 from all data sources.

Combines:
- NHGIS historical data (1920-1960, decennial only)
- Census Bureau FTP data (1970-2024, annual)

Output: Single CSV with columns: year, state_fips, state_name, female_15_44
"""

import csv
import re
from pathlib import Path
from typing import Optional

import pandas as pd


# FIPS state codes
FIPS_TO_NAME = {
    1: "Alabama", 2: "Alaska", 4: "Arizona", 5: "Arkansas", 6: "California",
    8: "Colorado", 9: "Connecticut", 10: "Delaware", 11: "District of Columbia",
    12: "Florida", 13: "Georgia", 15: "Hawaii", 16: "Idaho", 17: "Illinois",
    18: "Indiana", 19: "Iowa", 20: "Kansas", 21: "Kentucky", 22: "Louisiana",
    23: "Maine", 24: "Maryland", 25: "Massachusetts", 26: "Michigan",
    27: "Minnesota", 28: "Mississippi", 29: "Missouri", 30: "Montana",
    31: "Nebraska", 32: "Nevada", 33: "New Hampshire", 34: "New Jersey",
    35: "New Mexico", 36: "New York", 37: "North Carolina", 38: "North Dakota",
    39: "Ohio", 40: "Oklahoma", 41: "Oregon", 42: "Pennsylvania",
    44: "Rhode Island", 45: "South Carolina", 46: "South Dakota",
    47: "Tennessee", 48: "Texas", 49: "Utah", 50: "Vermont", 51: "Virginia",
    53: "Washington", 54: "West Virginia", 55: "Wisconsin", 56: "Wyoming",
}

NAME_TO_FIPS = {v.lower(): k for k, v in FIPS_TO_NAME.items()}

# Historical name variants
NAME_VARIANTS = {
    "district of columbia": 11,
    "d.c.": 11,
    "alaska territory": 2,
    "hawaii territory": 15,
}


def normalize_state_name(name: str) -> Optional[int]:
    """Convert state name to FIPS code."""
    name = name.strip().lower()
    name = re.sub(r'\s+', ' ', name)

    if name in NAME_TO_FIPS:
        return NAME_TO_FIPS[name]
    if name in NAME_VARIANTS:
        return NAME_VARIANTS[name]

    # Try partial match
    for key, fips in NAME_TO_FIPS.items():
        if key in name or name in key:
            return fips

    return None


def get_data_dir() -> Path:
    """Get data directory."""
    return Path(__file__).parent / "data"


def get_nhgis_dir() -> Path:
    """Get NHGIS data directory."""
    return Path(__file__).parent / "nhgis_data"


def load_nhgis_historical() -> pd.DataFrame:
    """
    Load NHGIS historical data (1920-1960).

    Returns DataFrame with: year, state_fips, state_name, female_15_44
    """
    nhgis_file = get_nhgis_dir() / "female_15_44_by_state_historical.csv"

    if not nhgis_file.exists():
        print(f"  Warning: NHGIS data not found at {nhgis_file}")
        return pd.DataFrame()

    df = pd.read_csv(nhgis_file)

    records = []
    for _, row in df.iterrows():
        state_name = row['state']
        fips = normalize_state_name(state_name)

        if fips is None:
            continue

        # Use female_15_44 if available, otherwise female_18_44
        pop = row.get('female_15_44')
        if pd.isna(pop) or pop == '':
            pop = row.get('female_18_44')

        if pd.notna(pop) and pop != '':
            records.append({
                'year': int(row['year']),
                'state_fips': fips,
                'state_name': FIPS_TO_NAME[fips],
                'female_15_44': int(float(pop)),
                'source': 'nhgis',
                'note': row.get('note', ''),
            })

    return pd.DataFrame(records)


def load_pe19_1970s() -> pd.DataFrame:
    """
    Load 1970-1979 data from pe-19.csv.

    Format: CSV with 5-year age groups, by race/sex
    """
    data_file = get_data_dir() / "pe-19.csv"

    if not data_file.exists():
        print(f"  Warning: 1970s data not found at {data_file}")
        return pd.DataFrame()

    records = []

    with open(data_file, newline='') as f:
        reader = csv.reader(f)

        # Skip header rows until we find the column headers
        for row in reader:
            if row and row[0] == 'Year of Estimate':
                headers = row
                break

        # Age group columns (indices)
        age_cols = {
            '15 to 19 years': 7,
            '20 to 24 years': 8,
            '25 to 29 years': 9,
            '30 to 34 years': 10,
            '35 to 39 years': 11,
            '40 to 44 years': 12,
        }

        # Group by year and state, sum female populations
        state_year_totals = {}

        for row in reader:
            if len(row) < 13:
                continue

            try:
                year = int(row[0])
                fips = int(row[1])
                race_sex = row[3].lower()
            except (ValueError, IndexError):
                continue

            # Only include female rows
            if 'female' not in race_sex:
                continue

            key = (year, fips)
            if key not in state_year_totals:
                state_year_totals[key] = 0

            # Sum 15-44 age groups
            for col_idx in age_cols.values():
                try:
                    val = row[col_idx].replace(',', '').replace('"', '')
                    state_year_totals[key] += int(val)
                except (ValueError, IndexError):
                    pass

        for (year, fips), total in state_year_totals.items():
            if fips in FIPS_TO_NAME and total > 0:
                records.append({
                    'year': year,
                    'state_fips': fips,
                    'state_name': FIPS_TO_NAME[fips],
                    'female_15_44': total,
                    'source': 'census_pe19',
                    'note': '',
                })

    return pd.DataFrame(records)


def load_st_int_asrh_1980s() -> pd.DataFrame:
    """
    Load 1980-1989 data from st_int_asrh.txt.

    Format: Fixed-width with code SSYRS where:
    - SS = state FIPS
    - Y = year (1-9 = 1981-1989)
    - R = race/origin combo (1-8)
    - S = sex (1=Male, 2=Female)

    Columns are 5-year age groups: 0-4, 5-9, 10-14, 15-19, 20-24, 25-29,
    30-34, 35-39, 40-44, 45-49, 50-54, 55-59, 60-64, 65-69, 70-74, 75-79, 80-84, 85+
    """
    data_file = get_data_dir() / "st_int_asrh.txt"

    if not data_file.exists():
        print(f"  Warning: 1980s ASRH data not found at {data_file}")
        return pd.DataFrame()

    # Year mapping (position 3 value -> year)
    year_map = {str(i): 1980 + i for i in range(1, 10)}  # 1->1981, 2->1982, ..., 9->1989

    # Age group column indices (0-based, after splitting)
    # Columns 0=code, 1=0-4, 2=5-9, 3=10-14, 4=15-19, 5=20-24, 6=25-29, 7=30-34, 8=35-39, 9=40-44
    age_15_44_cols = [4, 5, 6, 7, 8, 9]  # 15-19 through 40-44

    # Aggregate by state, year (sum across all races, female only)
    state_year_totals = {}

    with open(data_file) as f:
        for line in f:
            parts = line.split()
            if len(parts) < 10:
                continue

            code = parts[0]
            if len(code) != 5:
                continue

            try:
                state_fips = int(code[0:2])
                year_code = code[2]
                sex_code = code[4]
            except (ValueError, IndexError):
                continue

            # Skip if not female (sex_code != '2')
            if sex_code != '2':
                continue

            # Skip if year code not in map
            if year_code not in year_map:
                continue

            year = year_map[year_code]
            key = (year, state_fips)

            if key not in state_year_totals:
                state_year_totals[key] = 0

            # Sum 15-44 age groups
            for col_idx in age_15_44_cols:
                try:
                    state_year_totals[key] += int(parts[col_idx])
                except (ValueError, IndexError):
                    pass

    records = []
    for (year, fips), total in state_year_totals.items():
        if fips in FIPS_TO_NAME and total > 0:
            records.append({
                'year': year,
                'state_fips': fips,
                'state_name': FIPS_TO_NAME[fips],
                'female_15_44': total,
                'source': 'census_1980s',
                'note': '',
            })

    return pd.DataFrame(records)


def load_sasrh_1990s() -> pd.DataFrame:
    """
    Load 1990-1999 data from sasrh90.txt - sasrh99.txt.

    Format: Fixed-width text with single year of age by race/sex
    """
    data_dir = get_data_dir()
    records = []

    for year in range(1990, 2000):
        filename = f"sasrh{str(year)[2:]}.txt"
        data_file = data_dir / filename

        if not data_file.exists():
            print(f"  Warning: {filename} not found")
            continue

        with open(data_file) as f:
            lines = f.readlines()

        # Parse the fixed-width format
        # Columns: Year(4) State(2) Age(4) then race/sex columns
        # We need to sum Female columns for ages 15-44

        state_totals = {}

        for line in lines:
            if len(line) < 20:
                continue

            try:
                line_year = int(line[0:4].strip())
                state_code = int(line[5:7].strip())
                age = int(line[8:11].strip())
            except ValueError:
                continue

            if line_year != year or age < 15 or age > 44:
                continue

            # Parse female columns (positions vary, but pattern is consistent)
            # White Female, Black Female, AIAN Female, API Female (Non-Hispanic)
            # + Hispanic categories
            # Approximate column positions based on file structure
            try:
                # The columns are approximately:
                # Non-Hispanic: White M/F, Black M/F, AIAN M/F, API M/F
                # Hispanic: White M/F, Black M/F, AIAN M/F, API M/F
                # Each value is ~8 chars wide

                # Split by whitespace and sum female values
                parts = line[11:].split()
                if len(parts) >= 16:
                    # Female columns are at indices 1, 3, 5, 7, 9, 11, 13, 15
                    female_total = sum([
                        int(parts[1]),   # White Female Non-Hispanic
                        int(parts[3]),   # Black Female Non-Hispanic
                        int(parts[5]),   # AIAN Female Non-Hispanic
                        int(parts[7]),   # API Female Non-Hispanic
                        int(parts[9]),   # White Female Hispanic
                        int(parts[11]),  # Black Female Hispanic
                        int(parts[13]),  # AIAN Female Hispanic
                        int(parts[15]),  # API Female Hispanic
                    ])

                    if state_code not in state_totals:
                        state_totals[state_code] = 0
                    state_totals[state_code] += female_total

            except (ValueError, IndexError):
                continue

        for fips, total in state_totals.items():
            if fips in FIPS_TO_NAME and total > 0:
                records.append({
                    'year': year,
                    'state_fips': fips,
                    'state_name': FIPS_TO_NAME[fips],
                    'female_15_44': total,
                    'source': 'census_sasrh',
                    'note': '',
                })

    return pd.DataFrame(records)


def load_intercensal_2000s(filename: str, year_cols: list, source: str) -> pd.DataFrame:
    """
    Load 2000s-2020s intercensal data (clean CSV format).

    Args:
        filename: CSV filename
        year_cols: List of (column_name, year) tuples
        source: Source identifier

    Returns DataFrame with female 15-44 by state/year
    """
    data_file = get_data_dir() / filename

    if not data_file.exists():
        print(f"  Warning: {filename} not found")
        return pd.DataFrame()

    df = pd.read_csv(data_file)

    # Filter to:
    # - STATE != 0 (exclude US total)
    # - SEX == 2 (female)
    # - AGE 15-44
    df = df[(df['STATE'] != 0) & (df['SEX'] == 2) & (df['AGE'] >= 15) & (df['AGE'] <= 44)]

    records = []

    for col_name, year in year_cols:
        if col_name not in df.columns:
            continue

        # Group by state, sum population
        state_totals = df.groupby(['STATE', 'NAME'])[col_name].sum().reset_index()

        for _, row in state_totals.iterrows():
            fips = int(row['STATE'])
            if fips in FIPS_TO_NAME:
                records.append({
                    'year': year,
                    'state_fips': fips,
                    'state_name': row['NAME'],
                    'female_15_44': int(row[col_name]),
                    'source': source,
                    'note': '',
                })

    return pd.DataFrame(records)


def load_all_sources() -> pd.DataFrame:
    """Load and combine all data sources."""
    print("Loading data sources...")

    dfs = []

    # NHGIS historical (1920-1960)
    print("  Loading NHGIS historical data (1920-1960)...")
    df_nhgis = load_nhgis_historical()
    if not df_nhgis.empty:
        print(f"    Found {len(df_nhgis)} records")
        dfs.append(df_nhgis)

    # 1970-1979
    print("  Loading 1970s data (pe-19.csv)...")
    df_1970s = load_pe19_1970s()
    if not df_1970s.empty:
        print(f"    Found {len(df_1970s)} records")
        dfs.append(df_1970s)

    # 1980-1989 (st_int_asrh.txt has sex breakdown)
    print("  Loading 1980s data (st_int_asrh.txt)...")
    df_1980s = load_st_int_asrh_1980s()
    if not df_1980s.empty:
        print(f"    Found {len(df_1980s)} records")
        dfs.append(df_1980s)

    # 1990-1999
    print("  Loading 1990s data (sasrh files)...")
    df_1990s = load_sasrh_1990s()
    if not df_1990s.empty:
        print(f"    Found {len(df_1990s)} records")
        dfs.append(df_1990s)

    # 2000-2010
    print("  Loading 2000-2010 data (st-est00int-agesex.csv)...")
    year_cols_2000 = [(f'POPESTIMATE{y}', y) for y in range(2000, 2011)]
    df_2000s = load_intercensal_2000s('st-est00int-agesex.csv', year_cols_2000, 'census_2000s')
    if not df_2000s.empty:
        print(f"    Found {len(df_2000s)} records")
        dfs.append(df_2000s)

    # 2010-2020
    print("  Loading 2010-2020 data (SC-EST2020-AGESEX-CIV.csv)...")
    year_cols_2010 = [(f'POPEST{y}_CIV', y) for y in range(2010, 2021)]
    df_2010s = load_intercensal_2000s('SC-EST2020-AGESEX-CIV.csv', year_cols_2010, 'census_2010s')
    if not df_2010s.empty:
        print(f"    Found {len(df_2010s)} records")
        dfs.append(df_2010s)

    # 2020-2024
    print("  Loading 2020-2024 data (sc-est2024-agesex-civ.csv)...")
    year_cols_2020 = [(f'POPEST{y}_CIV', y) for y in range(2020, 2025)]
    df_2020s = load_intercensal_2000s('sc-est2024-agesex-civ.csv', year_cols_2020, 'census_2020s')
    if not df_2020s.empty:
        print(f"    Found {len(df_2020s)} records")
        dfs.append(df_2020s)

    if not dfs:
        print("No data loaded!")
        return pd.DataFrame()

    # Combine all sources
    combined = pd.concat(dfs, ignore_index=True)

    # Remove duplicates (prefer newer sources for overlapping years)
    # Sort by source preference and drop duplicates
    source_priority = {
        'census_2020s': 1,
        'census_2010s': 2,
        'census_2000s': 3,
        'census_sasrh': 4,
        'census_1980s': 5,
        'census_pe19': 6,
        'nhgis': 7,
    }
    combined['source_priority'] = combined['source'].map(source_priority)
    combined = combined.sort_values('source_priority')
    combined = combined.drop_duplicates(subset=['year', 'state_fips'], keep='first')
    combined = combined.drop(columns=['source_priority'])

    # Sort by year and state
    combined = combined.sort_values(['year', 'state_fips']).reset_index(drop=True)

    return combined


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Consolidate female 15-44 population data from all sources"
    )
    parser.add_argument(
        "--output", "-o",
        default="female_15_44_consolidated.csv",
        help="Output CSV filename (default: female_15_44_consolidated.csv)"
    )
    parser.add_argument(
        "--summary", "-s",
        action="store_true",
        help="Print summary statistics"
    )

    args = parser.parse_args()

    df = load_all_sources()

    if df.empty:
        print("No data to consolidate!")
        return

    # Save to CSV
    output_path = get_data_dir() / args.output
    df.to_csv(output_path, index=False)
    print(f"\nSaved consolidated data to: {output_path}")
    print(f"Total records: {len(df)}")

    if args.summary:
        print("\n" + "=" * 70)
        print("SUMMARY")
        print("=" * 70)

        print(f"\nYear range: {df['year'].min()} - {df['year'].max()}")
        print(f"States: {df['state_fips'].nunique()}")
        print(f"Total records: {len(df)}")

        print("\nRecords by source:")
        print(df['source'].value_counts().to_string())

        print("\nRecords by decade:")
        df['decade'] = (df['year'] // 10) * 10
        print(df.groupby('decade').size().to_string())

        print("\nSample data (first 10 rows):")
        print(df.head(10).to_string(index=False))

        # Check for gaps
        print("\nYears with data:")
        years = sorted(df['year'].unique())
        gaps = []
        for i in range(len(years) - 1):
            if years[i+1] - years[i] > 1:
                gaps.append(f"{years[i]+1}-{years[i+1]-1}")
        if gaps:
            print(f"  Gaps: {', '.join(gaps)}")
        else:
            print(f"  Continuous from {years[0]} to {years[-1]}")


if __name__ == "__main__":
    main()
