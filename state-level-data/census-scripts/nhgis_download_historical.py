#!/usr/bin/env python3
"""
Download NHGIS historical state population by age and sex data.

Downloads state-level Sex by Age tables for 1920-1960 decennial censuses.
"""

import os
import sys
import time
import requests
import json
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


def submit_extract(headers, extract_request):
    """Submit an NHGIS extract request."""
    url = "https://api.ipums.org/extracts"
    params = {"collection": "nhgis", "version": "2"}

    response = requests.post(url, headers=headers, params=params, json=extract_request)
    if response.status_code not in [200, 201]:
        print(f"  Error submitting extract: {response.status_code}")
        print(f"  Response: {response.text[:500]}")
        return None

    return response.json()


def check_extract_status(headers, extract_number):
    """Check the status of an extract."""
    url = f"https://api.ipums.org/extracts/{extract_number}"
    params = {"collection": "nhgis", "version": "2"}

    response = requests.get(url, headers=headers, params=params)
    if response.status_code != 200:
        return None

    return response.json()


def download_extract(headers, extract_info, output_dir):
    """Download a completed extract."""
    download_links = extract_info.get("downloadLinks", {})

    for link_type, link_info in download_links.items():
        url = link_info.get("url")
        if url:
            filename = url.split("/")[-1]
            output_path = output_dir / filename

            print(f"  Downloading {filename}...")
            response = requests.get(url, headers=headers, stream=True)

            if response.status_code == 200:
                with open(output_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                print(f"  Saved to: {output_path}")
            else:
                print(f"  Error downloading: {response.status_code}")


def main():
    api_key = get_api_key()
    if not api_key:
        print("API key not found. Set IPUMS_API_KEY or save to ~/.ipums/api_key")
        sys.exit(1)

    headers = {
        "Authorization": api_key,
        "Content-Type": "application/json",
    }

    output_dir = Path(__file__).parent / "nhgis_data"
    output_dir.mkdir(exist_ok=True)

    # Historical datasets with Sex by Age tables
    # Format: (dataset, table, description)
    extracts_to_request = [
        # 1920 - Population 18-44 by Sex (childbearing age!)
        {
            "description": "1920 Population 18-44 by Sex",
            "datasets": {
                "1920_cPHAM": {
                    "dataTables": ["NT18"],
                    "geogLevels": ["state"],
                }
            },
            "dataFormat": "csv_no_header",
        },
        # 1930 - Sex by Age
        {
            "description": "1930 Sex by Age",
            "datasets": {
                "1930_cAge30": {
                    "dataTables": ["NT2B"],
                    "geogLevels": ["state"],
                }
            },
            "dataFormat": "csv_no_header",
        },
        # 1940 - Sex by Age
        {
            "description": "1940 Sex by Age",
            "datasets": {
                "1940_cAge": {
                    "dataTables": ["NT2B"],
                    "geogLevels": ["state"],
                }
            },
            "dataFormat": "csv_no_header",
        },
        # 1950 - Sex by Age (two tables available)
        {
            "description": "1950 Sex by Age",
            "datasets": {
                "1950_cAge": {
                    "dataTables": ["NT7", "NT8"],
                    "geogLevels": ["state"],
                }
            },
            "dataFormat": "csv_no_header",
        },
        # 1960 - Sex by Age
        {
            "description": "1960 Sex by Age",
            "datasets": {
                "1960_cAge1": {
                    "dataTables": ["NT5"],
                    "geogLevels": ["state"],
                }
            },
            "dataFormat": "csv_no_header",
        },
    ]

    submitted_extracts = []

    print("=" * 70)
    print("SUBMITTING NHGIS EXTRACT REQUESTS")
    print("=" * 70)

    for extract_request in extracts_to_request:
        desc = extract_request["description"]
        print(f"\nSubmitting: {desc}")

        result = submit_extract(headers, extract_request)
        if result:
            extract_num = result.get("number")
            print(f"  Extract #{extract_num} submitted")
            submitted_extracts.append((desc, extract_num))
        else:
            print(f"  Failed to submit")

    if not submitted_extracts:
        print("\nNo extracts were submitted successfully.")
        sys.exit(1)

    print("\n" + "=" * 70)
    print("WAITING FOR EXTRACTS TO COMPLETE")
    print("=" * 70)

    completed = []
    max_wait = 600  # 10 minutes max
    wait_interval = 10

    start_time = time.time()
    while submitted_extracts and (time.time() - start_time) < max_wait:
        time.sleep(wait_interval)

        for desc, extract_num in submitted_extracts[:]:
            status_info = check_extract_status(headers, extract_num)
            if status_info:
                status = status_info.get("status")
                print(f"  Extract #{extract_num} ({desc}): {status}")

                if status == "completed":
                    submitted_extracts.remove((desc, extract_num))
                    completed.append((desc, extract_num, status_info))
                elif status == "failed":
                    print(f"    Error: {status_info.get('message', 'Unknown error')}")
                    submitted_extracts.remove((desc, extract_num))

    print("\n" + "=" * 70)
    print("DOWNLOADING COMPLETED EXTRACTS")
    print("=" * 70)

    for desc, extract_num, status_info in completed:
        print(f"\nDownloading: {desc} (Extract #{extract_num})")
        download_extract(headers, status_info, output_dir)

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Completed: {len(completed)}")
    print(f"Still pending: {len(submitted_extracts)}")
    print(f"Output directory: {output_dir}")

    if submitted_extracts:
        print("\nPending extracts (check status later):")
        for desc, extract_num in submitted_extracts:
            print(f"  Extract #{extract_num}: {desc}")


if __name__ == "__main__":
    main()
