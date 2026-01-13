#!/usr/bin/env python3
"""
Download sample Census Bureau files for inspection.

Downloads small sample files from each time period to understand their structure.
"""

import requests
from pathlib import Path


def download_file(url: str, output_dir: Path) -> Path:
    """Download a file if it doesn't exist."""
    filename = url.split('/')[-1]
    output_path = output_dir / filename

    if output_path.exists():
        print(f"  Already exists: {filename}")
        return output_path

    print(f"  Downloading: {filename}")
    response = requests.get(url)
    response.raise_for_status()
    output_path.write_bytes(response.content)
    print(f"  Saved: {output_path}")
    return output_path


def show_file_head(path: Path, lines: int = 30):
    """Show first N lines of a file."""
    print(f"\n--- First {lines} lines of {path.name} ---")
    try:
        content = path.read_text(errors='replace')
        for i, line in enumerate(content.split('\n')[:lines]):
            print(f"  {i+1:3d}: {line[:120]}")
    except Exception as e:
        print(f"  Error reading file: {e}")


def main():
    output_dir = Path(__file__).parent / 'sample_data'
    output_dir.mkdir(exist_ok=True)

    base_url = "https://www2.census.gov/programs-surveys/popest"

    # Key sample files from each period
    files_to_download = [
        # 1900-1980: Historical state data
        f"{base_url}/tables/1900-1980/state/asrh/pe-19.csv",

        # 1980-1990: 5-year age groups
        f"{base_url}/tables/1980-1990/state/asrh/s5yr8090.txt",

        # 1990-2000: State age-sex-race-hispanic
        f"{base_url}/tables/1990-2000/state/asrh/sasrh99.txt",

        # 2000-2010: Intercensal state age-sex
        f"{base_url}/datasets/2000-2010/intercensal/state/st-est00int-agesex.csv",

        # 2020-2024: Current state age-sex
        f"{base_url}/datasets/2020-2024/state/asrh/sc-est2024-agesex-civ.csv",
    ]

    print("Downloading sample Census files...")
    print(f"Output directory: {output_dir}")

    downloaded = []
    for url in files_to_download:
        try:
            path = download_file(url, output_dir)
            downloaded.append(path)
        except Exception as e:
            print(f"  Error downloading {url}: {e}")

    print("\n" + "="*70)
    print("FILE STRUCTURE INSPECTION")
    print("="*70)

    for path in downloaded:
        show_file_head(path)
        print()


if __name__ == "__main__":
    main()
