#!/usr/bin/env python3
"""
Direct NHGIS API exploration using raw requests.
"""

import os
import sys
import json
import requests
from pathlib import Path

# Load .env file if present
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ[key.strip()] = value.strip().strip('"').strip("'")


def get_api_key():
    """Get IPUMS API key."""
    key = os.environ.get("IPUMS_API_KEY")
    if key:
        return key
    key_file = os.path.expanduser("~/.ipums/api_key")
    if os.path.exists(key_file):
        with open(key_file) as f:
            return f.read().strip()
    return None


def fetch_all_pages(url, headers, params, max_pages=50):
    """Fetch all pages of paginated results."""
    all_data = []
    page = 1
    while page <= max_pages:
        params["pageNumber"] = page
        params["pageSize"] = 100
        resp = requests.get(url, headers=headers, params=params)
        if resp.status_code != 200:
            break
        result = resp.json()
        data = result.get("data", [])
        if not data:
            break
        all_data.extend(data)
        total = result.get("totalCount", 0)
        if len(all_data) >= total:
            break
        page += 1
    return all_data


def main():
    api_key = get_api_key()
    if not api_key:
        print("API key not found. Set IPUMS_API_KEY or save to ~/.ipums/api_key")
        sys.exit(1)

    print(f"Using API key: {api_key[:10]}...")

    headers = {"Authorization": api_key}
    base_url = "https://api.ipums.org"
    params = {"collection": "nhgis", "version": "2"}

    # List all datasets
    print("=" * 70)
    print("FETCHING ALL NHGIS DATASETS")
    print("=" * 70)

    datasets = fetch_all_pages(f"{base_url}/metadata/datasets", headers, params.copy())
    print(f"Total datasets: {len(datasets)}")

    # Filter for our target years
    target_years = ["1910", "1920", "1930", "1940", "1950", "1960"]

    print("\nDatasets for target census years:")
    target_datasets = []
    for ds in datasets:
        name = ds.get("name", "")
        for year in target_years:
            if year in name:
                target_datasets.append(ds)
                print(f"  {name}: {ds.get('description', '')}")
                break

    # List time series tables
    print("\n" + "=" * 70)
    print("FETCHING TIME SERIES TABLES")
    print("=" * 70)

    ts_tables = fetch_all_pages(f"{base_url}/metadata/time_series_tables", headers, params.copy())
    print(f"Total time series tables: {len(ts_tables)}")

    # Find age/sex related tables
    print("\nAge/Sex related time series tables:")
    age_sex_ts = []
    for ts in ts_tables:
        desc = ts.get("description", "").lower()
        name = ts.get("name", "")
        if "age" in desc or "sex" in desc:
            age_sex_ts.append(ts)
            print(f"\n  {name}: {ts.get('description', '')}")

            # Get more details
            detail_resp = requests.get(
                f"{base_url}/metadata/time_series_tables/{name}",
                headers=headers, params={"collection": "nhgis", "version": "2"}
            )
            if detail_resp.status_code == 200:
                detail = detail_resp.json()
                years = detail.get("years", [])
                geog = detail.get("geographicIntegration", "")
                print(f"    Years: {years}")
                print(f"    Geographic integration: {geog}")

    if not age_sex_ts:
        print("  No age/sex time series tables found")

    # For each target dataset, get data tables
    print("\n" + "=" * 70)
    print("DATA TABLES FOR TARGET DATASETS (with state-level data)")
    print("=" * 70)

    for ds in target_datasets:
        ds_name = ds.get("name", "")

        # Get dataset details
        detail_resp = requests.get(
            f"{base_url}/metadata/datasets/{ds_name}",
            headers=headers, params={"collection": "nhgis", "version": "2"}
        )

        if detail_resp.status_code == 200:
            detail = detail_resp.json()
            tables = detail.get("dataTables", [])
            geog_levels = detail.get("geogLevels", [])
            geog_names = [g.get("name", "") for g in geog_levels]

            # Only show if it has state-level data
            if "state" in geog_names or "State" in str(geog_names):
                print(f"\n{ds_name}:")
                print(f"  Geographic levels: {geog_names}")
                print(f"  Total tables: {len(tables)}")

                # Find age/sex tables
                age_sex = []
                for t in tables:
                    desc = t.get("description", "").lower()
                    if "age" in desc and "sex" in desc:
                        age_sex.append(t)

                # Also find age or sex tables separately
                age_only = []
                sex_only = []
                for t in tables:
                    desc = t.get("description", "").lower()
                    if "age" in desc and "sex" not in desc:
                        age_only.append(t)
                    elif "sex" in desc and "age" not in desc:
                        sex_only.append(t)

                if age_sex:
                    print(f"  Age × Sex tables ({len(age_sex)}):")
                    for t in age_sex[:15]:
                        print(f"    - {t.get('name')}: {t.get('description', '')}")

                if age_only:
                    print(f"  Age tables ({len(age_only)}):")
                    for t in age_only[:5]:
                        print(f"    - {t.get('name')}: {t.get('description', '')}")

                if sex_only:
                    print(f"  Sex tables ({len(sex_only)}):")
                    for t in sex_only[:5]:
                        print(f"    - {t.get('name')}: {t.get('description', '')}")

    print("\nDone.")


if __name__ == "__main__":
    main()
