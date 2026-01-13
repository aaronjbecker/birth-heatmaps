#!/usr/bin/env python3
"""
Download NHGIS population by age and sex data for decennial censuses.

This script downloads state-level population by age and sex data for:
- 1910, 1920, 1930, 1940, 1950, 1960 decennial censuses

SETUP:
1. Register for free at: https://uma.pop.umn.edu/nhgis/user/new
2. Get your API key at: https://account.ipums.org/api_keys
3. Set the API key:
   export IPUMS_API_KEY="your_key_here"
   OR
   mkdir -p ~/.ipums && echo "your_key_here" > ~/.ipums/api_key

USAGE:
    python nhgis_download_age_sex.py [--explore] [--download]

    --explore   List available tables (don't download)
    --download  Download the data
"""

import os
import sys
import argparse
import time
from pathlib import Path

try:
    from ipumspy import IpumsApiClient, NhgisExtract
    from ipumspy.ddi import Codebook
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


def explore_tables(client):
    """Explore available NHGIS tables for age and sex data."""
    print("\n" + "=" * 70)
    print("EXPLORING NHGIS TABLES FOR POPULATION BY AGE AND SEX")
    print("=" * 70)

    # Get datasets
    print("\nFetching NHGIS datasets...")
    try:
        datasets_response = client.get_metadata("nhgis", "datasets")
        datasets = datasets_response if isinstance(datasets_response, list) else []
    except Exception as e:
        print(f"Error fetching datasets: {e}")
        datasets = []

    # Filter for decennial census years
    target_years = ["1910", "1920", "1930", "1940", "1950", "1960"]

    print(f"\nDatasets for decennial censuses ({', '.join(target_years)}):")
    census_datasets = []
    for ds in datasets:
        name = ds.get("name", "")
        desc = ds.get("description", "")

        for year in target_years:
            if year in name:
                census_datasets.append(ds)
                print(f"  {name}: {desc[:60]}...")
                break

    # Get time series tables (these span multiple years)
    print("\n" + "-" * 70)
    print("TIME SERIES TABLES (easier - span multiple census years):")
    print("-" * 70)

    try:
        ts_tables = client.get_metadata("nhgis", "time_series_tables")

        age_sex_ts = []
        for ts in ts_tables:
            name = ts.get("name", "")
            desc = ts.get("description", "").lower()

            # Look for age/sex tables
            if "sex" in desc and "age" in desc:
                age_sex_ts.append(ts)
                years = ts.get("years", [])
                geog = ts.get("geographic_integration", "")
                print(f"\n  {name}")
                print(f"    Description: {ts.get('description', '')}")
                print(f"    Years: {years}")
                print(f"    Geographic levels: {geog}")

        if not age_sex_ts:
            # If no age+sex combined, look for separate
            for ts in ts_tables:
                desc = ts.get("description", "").lower()
                if "age" in desc or "sex" in desc:
                    print(f"\n  {ts.get('name')}: {ts.get('description', '')[:70]}")

    except Exception as e:
        print(f"Error fetching time series tables: {e}")

    # Get data tables for each census year
    print("\n" + "-" * 70)
    print("DATA TABLES BY CENSUS YEAR:")
    print("-" * 70)

    try:
        data_tables = client.get_metadata("nhgis", "data_tables")

        for year in target_years:
            print(f"\n{year} Census:")
            year_tables = []

            for table in data_tables:
                name = table.get("name", "")
                desc = table.get("description", "").lower()
                datasets_list = table.get("datasets", [])

                # Check if table is for this year and has age/sex
                if any(year in d for d in datasets_list):
                    if "age" in desc and "sex" in desc:
                        year_tables.append(table)
                        print(f"    {name}: {table.get('description', '')[:50]}...")

            if not year_tables:
                print("    (No age×sex tables found - may need separate age and sex tables)")

    except Exception as e:
        print(f"Error fetching data tables: {e}")


def download_data(client, output_dir: Path):
    """Download NHGIS population by age and sex data."""
    print("\n" + "=" * 70)
    print("DOWNLOADING NHGIS DATA")
    print("=" * 70)

    output_dir.mkdir(parents=True, exist_ok=True)

    # First, let's try to use time series tables if available
    # These are the easiest since they span multiple years

    # Based on NHGIS documentation, common table codes for age/sex:
    # - A00: Total Population
    # - A08: Persons by Sex
    # - Tables with "NT" prefix are time series tables

    # Try to create an extract with time series data
    print("\nAttempting to create extract with time series tables...")

    # Time series table names for population by sex by age
    # (These may need adjustment based on actual NHGIS metadata)
    ts_tables_to_try = [
        "A35",   # Sex by Age (if available)
        "A08",   # Persons by Sex
        "B57",   # Age
    ]

    for ts_table in ts_tables_to_try:
        try:
            print(f"\nTrying time series table: {ts_table}")

            extract = NhgisExtract(
                time_series_tables=[ts_table],
                geographic_levels=["state"],
                years=["1910", "1920", "1930", "1940", "1950", "1960"],
            )

            # Submit the extract
            submitted = client.submit_extract(extract)
            print(f"  Extract submitted: {submitted.extract_id}")

            # Wait for completion
            print("  Waiting for extract to complete...")
            client.wait_for_extract(submitted, timeout=300)

            # Download
            print("  Downloading...")
            download_path = output_dir / f"nhgis_timeseries_{ts_table}.zip"
            client.download_extract(submitted, download_path)
            print(f"  Downloaded to: {download_path}")

        except Exception as e:
            print(f"  Error with {ts_table}: {e}")
            continue

    # Also try individual decennial census datasets
    print("\n" + "-" * 70)
    print("Trying individual decennial census extracts...")
    print("-" * 70)

    # Common dataset names for decennial censuses
    # Format is usually like "1910_cPH" or "1940_cPop"
    census_years = ["1910", "1920", "1930", "1940", "1950", "1960"]

    for year in census_years:
        try:
            print(f"\nTrying {year} census data...")

            # Dataset naming varies - we'll try common patterns
            # NT = Nominal Time Series, cPH = Census of Population & Housing
            possible_datasets = [
                f"{year}_cPH",
                f"{year}_cPop",
                f"{year}_STF1",  # Summary Tape File (later years)
            ]

            for dataset in possible_datasets:
                try:
                    extract = NhgisExtract(
                        datasets={
                            dataset: {
                                "data_tables": ["NT1"],  # Try basic population table
                                "geog_levels": ["state"],
                            }
                        }
                    )

                    submitted = client.submit_extract(extract)
                    print(f"  Extract submitted for {dataset}: {submitted.extract_id}")

                    client.wait_for_extract(submitted, timeout=300)

                    download_path = output_dir / f"nhgis_{year}_{dataset}.zip"
                    client.download_extract(submitted, download_path)
                    print(f"  Downloaded to: {download_path}")
                    break  # Success, move to next year

                except Exception as e:
                    print(f"  {dataset} failed: {str(e)[:50]}")
                    continue

        except Exception as e:
            print(f"Error with {year}: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Download NHGIS population by age and sex data"
    )
    parser.add_argument(
        "--explore",
        action="store_true",
        help="Explore available tables without downloading",
    )
    parser.add_argument(
        "--download",
        action="store_true",
        help="Download the data",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).parent / "nhgis_data",
        help="Output directory for downloads",
    )

    args = parser.parse_args()

    # Check for API key
    api_key = get_api_key()
    if not api_key:
        print("=" * 70)
        print("IPUMS API KEY REQUIRED")
        print("=" * 70)
        print("""
To use this script, you need an IPUMS API key:

1. Register for free at: https://uma.pop.umn.edu/nhgis/user/new
2. Get your API key at: https://account.ipums.org/api_keys
3. Set it:
   export IPUMS_API_KEY="your_key_here"
   OR
   mkdir -p ~/.ipums && echo "your_key_here" > ~/.ipums/api_key

Then run this script again with --explore or --download
""")
        sys.exit(1)

    # Connect to API
    print("Connecting to NHGIS API...")
    client = IpumsApiClient(api_key)

    if args.explore or (not args.explore and not args.download):
        explore_tables(client)

    if args.download:
        download_data(client, args.output_dir)

    print("\nDone.")


if __name__ == "__main__":
    main()
