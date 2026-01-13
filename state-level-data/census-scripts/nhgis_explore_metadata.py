#!/usr/bin/env python3
"""
Explore NHGIS metadata to find population by age and sex tables.

Requires an IPUMS API key. Set as environment variable:
    export IPUMS_API_KEY="your_key_here"

Or create a file at ~/.ipums/api_key with just the key.
"""

import os
import sys
from pathlib import Path

# Load .env file if present
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ[key.strip()] = value.strip().strip('"').strip("'")

try:
    from ipumspy import IpumsApiClient
    from ipumspy.api.metadata import (
        NhgisDatasetMetadata,
        NhgisDataTableMetadata,
        TimeSeriesTableMetadata,
    )
except ImportError:
    print("ipumspy not installed. Run: pip install ipumspy")
    sys.exit(1)


def get_api_key():
    """Get IPUMS API key from environment or file."""
    key = os.environ.get("IPUMS_API_KEY")
    if key:
        return key

    key_file = os.path.expanduser("~/.ipums/api_key")
    if os.path.exists(key_file):
        with open(key_file) as f:
            return f.read().strip()

    return None


def main():
    api_key = get_api_key()

    if not api_key:
        print("=" * 70)
        print("IPUMS API KEY REQUIRED")
        print("=" * 70)
        print("""
To use this script, you need an IPUMS API key:

1. Register for free at: https://uma.pop.umn.edu/nhgis/user/new
2. Get your API key at: https://account.ipums.org/api_keys
3. Set it as an environment variable or save to ~/.ipums/api_key
""")
        sys.exit(1)

    print("Connecting to NHGIS API...")
    client = IpumsApiClient(api_key)

    # Initialize counters
    age_sex_ts_tables = []
    found_datasets = []

    # Explore time series tables first
    print("\n" + "=" * 70)
    print("TIME SERIES TABLES (span multiple census years)")
    print("=" * 70)

    # Known time series table codes from NHGIS documentation
    ts_codes_to_check = [
        "A00",   # Total Population
        "A08",   # Persons by Sex
        "A35",   # Sex by Age
        "B18",   # Sex by Age
        "B57",   # Age
        "CL8",   # Sex by Age (detailed)
    ]

    for code in ts_codes_to_check:
        try:
            ts_meta = TimeSeriesTableMetadata(code)
            ts_info = client.get_metadata(ts_meta)
            desc = getattr(ts_info, 'description', 'N/A')
            years = getattr(ts_info, 'years', [])
            geog = getattr(ts_info, 'geographic_integration', 'N/A')

            print(f"\n  {code}: {desc}")
            print(f"    Years: {years}")
            print(f"    Geographic levels: {geog}")
            age_sex_ts_tables.append(code)
        except Exception as e:
            pass  # Table doesn't exist

    if not age_sex_ts_tables:
        print("\n  No predefined time series tables found via API.")
        print("  Check NHGIS web interface for available time series.")

    # Explore individual census datasets
    print("\n" + "=" * 70)
    print("DECENNIAL CENSUS DATASETS")
    print("=" * 70)

    # Try various dataset naming conventions
    dataset_patterns = [
        # Format: (name, description)
        ("1910_cPop", "1910 Census: Population"),
        ("1910_cPH", "1910 Census: Population & Housing"),
        ("1920_cPop", "1920 Census: Population"),
        ("1920_cPH", "1920 Census: Population & Housing"),
        ("1930_cPop", "1930 Census: Population"),
        ("1930_cPH", "1930 Census: Population & Housing"),
        ("1940_cPop", "1940 Census: Population"),
        ("1940_cPH", "1940 Census: Population & Housing"),
        ("1950_cPop", "1950 Census: Population"),
        ("1950_cPH", "1950 Census: Population & Housing"),
        ("1960_cPop", "1960 Census: Population"),
        ("1960_tPH", "1960 Census: Tracts"),
        ("1960_STF1", "1960 Census: STF1"),
    ]

    for ds_name, ds_desc in dataset_patterns:
        try:
            ds_meta = NhgisDatasetMetadata(ds_name)
            ds_info = client.get_metadata(ds_meta)

            actual_desc = getattr(ds_info, 'description', ds_desc)
            geog_levels = getattr(ds_info, 'geographic_levels', [])
            data_tables = getattr(ds_info, 'data_tables', [])

            print(f"\n  {ds_name}")
            print(f"    Description: {actual_desc}")
            print(f"    Geographic levels: {geog_levels}")
            print(f"    Number of tables: {len(data_tables)}")

            found_datasets.append({
                'name': ds_name,
                'description': actual_desc,
                'geog_levels': geog_levels,
                'data_tables': data_tables,
            })

        except Exception as e:
            pass  # Dataset doesn't exist with this name

    # For found datasets, look for age/sex tables
    print("\n" + "=" * 70)
    print("AGE/SEX TABLES IN FOUND DATASETS")
    print("=" * 70)

    for ds in found_datasets:
        print(f"\n{ds['name']}:")
        tables = ds.get('data_tables', [])

        age_tables = []
        sex_tables = []
        age_sex_tables = []

        for table in tables[:100]:  # Check up to 100 tables
            table_name = table if isinstance(table, str) else getattr(table, 'name', str(table))
            try:
                table_meta = NhgisDataTableMetadata(table_name)
                table_info = client.get_metadata(table_meta)
                table_desc = getattr(table_info, 'description', '').lower()

                if 'age' in table_desc and 'sex' in table_desc:
                    age_sex_tables.append((table_name, getattr(table_info, 'description', '')))
                elif 'age' in table_desc:
                    age_tables.append((table_name, getattr(table_info, 'description', '')))
                elif 'sex' in table_desc:
                    sex_tables.append((table_name, getattr(table_info, 'description', '')))
            except:
                pass

        if age_sex_tables:
            print(f"  Age × Sex tables ({len(age_sex_tables)}):")
            for tname, tdesc in age_sex_tables[:10]:
                print(f"    - {tname}: {tdesc[:60]}")
        if age_tables:
            print(f"  Age tables ({len(age_tables)}):")
            for tname, tdesc in age_tables[:5]:
                print(f"    - {tname}: {tdesc[:60]}")
        if sex_tables:
            print(f"  Sex tables ({len(sex_tables)}):")
            for tname, tdesc in sex_tables[:5]:
                print(f"    - {tname}: {tdesc[:60]}")

        if not (age_sex_tables or age_tables or sex_tables):
            print("  No age/sex tables found (may need to check more tables)")

    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"""
Found {len(age_sex_ts_tables)} time series tables.
Found {len(found_datasets)} decennial census datasets.

Datasets found: {[d['name'] for d in found_datasets]}

Next steps:
1. Use nhgis_download_age_sex.py to download specific tables
2. Or use the NHGIS web interface: https://data2.nhgis.org/
""")


if __name__ == "__main__":
    main()
