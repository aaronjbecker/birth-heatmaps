#!/usr/bin/env python3
"""
List files in Census Bureau FTP directories for state-level population data.

This script explores specific directories on the Census FTP server that contain
state population by age and sex data.
"""

from ftplib import FTP


def list_directory_files(ftp: FTP, path: str, max_show: int = 50) -> list[str]:
    """List files in a directory."""
    try:
        ftp.cwd(path)
        files = ftp.nlst()
        return sorted(files)
    except Exception as e:
        print(f"  Error: {e}")
        return []


def main():
    ftp = FTP('ftp2.census.gov')
    ftp.login()

    directories_to_explore = [
        # Historical data
        ("/programs-surveys/popest/tables/1980-1990/state/asrh", "1980-1990 state/asrh"),
        ("/programs-surveys/popest/tables/1990-2000/state/asrh", "1990-2000 state/asrh"),

        # Modern intercensal
        ("/programs-surveys/popest/datasets/2000-2010/intercensal/state", "2000-2010 intercensal state"),

        # 2010-2020 data
        ("/programs-surveys/popest/datasets/2010-2020/state/asrh", "2010-2020 state/asrh"),

        # Current data
        ("/programs-surveys/popest/datasets/2020-2024/state/asrh", "2020-2024 state/asrh"),
    ]

    for path, label in directories_to_explore:
        print(f"\n{'='*70}")
        print(f"{label}")
        print(f"Path: {path}")
        print('='*70)

        files = list_directory_files(ftp, path)
        print(f"Total files: {len(files)}")

        for f in files[:50]:
            print(f"  {f}")
        if len(files) > 50:
            print(f"  ... and {len(files) - 50} more")

    ftp.quit()
    print("\nDone.")


if __name__ == "__main__":
    main()
