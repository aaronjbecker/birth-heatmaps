#!/usr/bin/env python3
"""
Download 2010-2020 combined data files for inspection.
"""

import requests
from pathlib import Path
from ftplib import FTP


def main():
    output_dir = Path(__file__).parent / 'sample_data'
    output_dir.mkdir(exist_ok=True)

    base_url = "https://www2.census.gov/programs-surveys/popest"

    # Check FTP for intercensal data
    print("=== Checking 2010-2020 intercensal/state/asrh ===")
    ftp = FTP('ftp2.census.gov')
    ftp.login()

    try:
        ftp.cwd('/programs-surveys/popest/datasets/2010-2020/intercensal/state/asrh')
        files = ftp.nlst()
        print(f"Intercensal state/asrh files: {files}")
    except Exception as e:
        print(f"  Error: {e}")

    # Check for alldata file
    print("\n=== Checking for alldata files ===")
    ftp.cwd('/programs-surveys/popest/datasets/2010-2020/state/asrh')
    files = ftp.nlst()
    alldata = [f for f in files if 'alldata' in f.lower() or 'civ' in f.lower()]
    print(f"Alldata/CIV files: {alldata}")

    ftp.quit()

    # Download combined files
    files_to_download = [
        # 2010-2020 combined civilian file
        f"{base_url}/datasets/2010-2020/state/asrh/SC-EST2020-AGESEX-CIV.csv",
        # Sample state file to understand per-state format
        f"{base_url}/datasets/2010-2020/state/asrh/SC-EST2020-AGESEX-01.csv",
    ]

    print("\n=== Downloading sample files ===")
    for url in files_to_download:
        filename = url.split('/')[-1]
        output_path = output_dir / filename

        if output_path.exists():
            print(f"  Already exists: {filename}")
        else:
            print(f"  Downloading: {filename}")
            response = requests.get(url)
            response.raise_for_status()
            output_path.write_bytes(response.content)
            print(f"  Saved: {output_path}")

    # Show first lines of each
    print("\n=== File contents ===")
    for url in files_to_download:
        filename = url.split('/')[-1]
        path = output_dir / filename
        print(f"\n--- {filename} (first 20 lines) ---")
        content = path.read_text()
        for i, line in enumerate(content.split('\n')[:20]):
            print(f"  {i+1:3d}: {line[:100]}")


if __name__ == "__main__":
    main()
