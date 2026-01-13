#!/usr/bin/env python3
"""
Idempotent downloader for Census Bureau FTP population data.

Downloads state-level population by age and sex data from Census Bureau.
Only downloads files that don't already exist locally.

Data coverage:
- 1970-1979: pe-19.csv (5-year age groups by state, race, sex)
- 1980-1990: s5yr8090.txt (5-year age groups by state)
- 1990-1999: sasrh90.txt - sasrh99.txt (single year of age)
- 2000-2010: st-est00int-agesex.csv (intercensal estimates)
- 2010-2020: SC-EST2020-AGESEX-CIV.csv (civilian population)
- 2020-2024: sc-est2024-agesex-civ.csv (civilian population)
"""

import os
import sys
from pathlib import Path
from urllib.request import urlretrieve
from urllib.error import URLError, HTTPError


# Census Bureau base URL
BASE_URL = "https://www2.census.gov/programs-surveys/popest"

# Files to download: (local_name, url_path)
CENSUS_FILES = [
    # 1970-1979: 5-year age groups by state, race, sex
    ("pe-19.csv", f"{BASE_URL}/tables/1900-1980/state/asrh/pe-19.csv"),

    # 1980-1990: 5-year age groups by state (total population, no sex breakdown)
    ("s5yr8090.txt", f"{BASE_URL}/tables/1980-1990/state/asrh/s5yr8090.txt"),

    # 1980-1990: State intercensal by age, sex, race, Hispanic (sex breakdown!)
    ("st_int_asrh.txt", f"{BASE_URL}/datasets/1980-1990/state/asrh/st_int_asrh.txt"),

    # 1990-1999: Single year of age by state (one file per year)
    ("sasrh90.txt", f"{BASE_URL}/tables/1990-2000/state/asrh/sasrh90.txt"),
    ("sasrh91.txt", f"{BASE_URL}/tables/1990-2000/state/asrh/sasrh91.txt"),
    ("sasrh92.txt", f"{BASE_URL}/tables/1990-2000/state/asrh/sasrh92.txt"),
    ("sasrh93.txt", f"{BASE_URL}/tables/1990-2000/state/asrh/sasrh93.txt"),
    ("sasrh94.txt", f"{BASE_URL}/tables/1990-2000/state/asrh/sasrh94.txt"),
    ("sasrh95.txt", f"{BASE_URL}/tables/1990-2000/state/asrh/sasrh95.txt"),
    ("sasrh96.txt", f"{BASE_URL}/tables/1990-2000/state/asrh/sasrh96.txt"),
    ("sasrh97.txt", f"{BASE_URL}/tables/1990-2000/state/asrh/sasrh97.txt"),
    ("sasrh98.txt", f"{BASE_URL}/tables/1990-2000/state/asrh/sasrh98.txt"),
    ("sasrh99.txt", f"{BASE_URL}/tables/1990-2000/state/asrh/sasrh99.txt"),

    # 2000-2010: Intercensal estimates
    ("st-est00int-agesex.csv", f"{BASE_URL}/datasets/2000-2010/intercensal/state/st-est00int-agesex.csv"),

    # 2010-2020: Civilian population by age/sex
    ("SC-EST2020-AGESEX-CIV.csv", f"{BASE_URL}/datasets/2010-2020/state/asrh/SC-EST2020-AGESEX-CIV.csv"),

    # 2020-2024: Current estimates (civilian)
    ("sc-est2024-agesex-civ.csv", f"{BASE_URL}/datasets/2020-2024/state/asrh/sc-est2024-agesex-civ.csv"),
]


def get_data_dir():
    """Get the data directory path."""
    return Path(__file__).parent / "data"


def download_file(filename: str, url: str, data_dir: Path, force: bool = False) -> bool:
    """
    Download a file if it doesn't exist locally.

    Args:
        filename: Local filename to save as
        url: URL to download from
        data_dir: Directory to save to
        force: If True, download even if file exists

    Returns:
        True if file was downloaded, False if already existed
    """
    filepath = data_dir / filename

    if filepath.exists() and not force:
        return False

    print(f"  Downloading {filename}...")
    try:
        urlretrieve(url, filepath)
        size_mb = filepath.stat().st_size / (1024 * 1024)
        print(f"    Saved: {filepath} ({size_mb:.2f} MB)")
        return True
    except HTTPError as e:
        print(f"    Error: HTTP {e.code} - {e.reason}")
        return False
    except URLError as e:
        print(f"    Error: {e.reason}")
        return False


def download_all(force: bool = False) -> dict:
    """
    Download all Census Bureau files.

    Args:
        force: If True, re-download existing files

    Returns:
        Dict with counts of downloaded, skipped, and failed files
    """
    data_dir = get_data_dir()
    data_dir.mkdir(exist_ok=True)

    results = {"downloaded": 0, "skipped": 0, "failed": 0}

    print("=" * 70)
    print("DOWNLOADING CENSUS BUREAU POPULATION DATA")
    print("=" * 70)
    print(f"Data directory: {data_dir}")
    print()

    for filename, url in CENSUS_FILES:
        filepath = data_dir / filename

        if filepath.exists() and not force:
            print(f"  {filename}: already exists, skipping")
            results["skipped"] += 1
        else:
            if download_file(filename, url, data_dir, force):
                results["downloaded"] += 1
            else:
                results["failed"] += 1

    print()
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Downloaded: {results['downloaded']}")
    print(f"Skipped (already exist): {results['skipped']}")
    print(f"Failed: {results['failed']}")

    return results


def check_files() -> dict:
    """
    Check which files exist locally.

    Returns:
        Dict mapping filename to (exists, size_mb)
    """
    data_dir = get_data_dir()
    status = {}

    for filename, _ in CENSUS_FILES:
        filepath = data_dir / filename
        if filepath.exists():
            size_mb = filepath.stat().st_size / (1024 * 1024)
            status[filename] = (True, size_mb)
        else:
            status[filename] = (False, 0)

    return status


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Download Census Bureau population data files"
    )
    parser.add_argument(
        "--force", "-f",
        action="store_true",
        help="Re-download files even if they exist"
    )
    parser.add_argument(
        "--check", "-c",
        action="store_true",
        help="Only check which files exist (don't download)"
    )

    args = parser.parse_args()

    if args.check:
        print("=" * 70)
        print("CENSUS BUREAU DATA FILE STATUS")
        print("=" * 70)
        status = check_files()
        for filename, (exists, size_mb) in status.items():
            if exists:
                print(f"  [OK] {filename} ({size_mb:.2f} MB)")
            else:
                print(f"  [--] {filename} (not downloaded)")

        existing = sum(1 for _, (e, _) in status.items() if e)
        print(f"\n{existing}/{len(status)} files present")
    else:
        download_all(force=args.force)


if __name__ == "__main__":
    main()
