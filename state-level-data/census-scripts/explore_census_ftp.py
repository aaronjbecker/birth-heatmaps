#!/usr/bin/env python3
"""
Explore Census Bureau FTP site for state-level population by age and sex data.

This script systematically explores the Census Bureau's FTP server to find
data sources that could provide state population by age group and sex,
useful for computing fertility rates per woman of childbearing age (15-44).

Usage:
    python scripts/explore_census_ftp.py
"""

from ftplib import FTP
import re
from pathlib import Path


class CensusFTPExplorer:
    """Explorer for Census Bureau FTP site."""

    def __init__(self, host: str = "ftp2.census.gov"):
        self.host = host
        self.ftp = None
        self.findings = []

    def connect(self):
        """Connect to Census FTP server."""
        print(f"Connecting to {self.host}...")
        self.ftp = FTP(self.host)
        self.ftp.login()
        print(f"Connected: {self.ftp.getwelcome()}")
        return self

    def close(self):
        """Close connection."""
        if self.ftp:
            try:
                self.ftp.quit()
            except:
                pass

    def list_dir(self, path: str) -> list[str]:
        """List directory contents."""
        try:
            self.ftp.cwd(path)
            return self.ftp.nlst()
        except Exception as e:
            print(f"  Error listing {path}: {e}")
            return []

    def list_dir_details(self, path: str) -> list[str]:
        """List directory with details (like ls -l)."""
        try:
            self.ftp.cwd(path)
            lines = []
            self.ftp.retrlines('LIST', lines.append)
            return lines
        except Exception as e:
            print(f"  Error listing {path}: {e}")
            return []

    def explore_popest(self):
        """Explore the population estimates (popest) program directories."""
        base_path = "/programs-surveys/popest"

        print("\n" + "="*70)
        print("EXPLORING POPULATION ESTIMATES (POPEST) DATA")
        print("="*70)

        # First, list the main popest directory structure
        print(f"\n--- Main popest directory: {base_path} ---")
        items = self.list_dir(base_path)
        for item in items:
            print(f"  {item}")

        # Explore datasets vs tables
        for subdir in ['datasets', 'tables']:
            path = f"{base_path}/{subdir}"
            print(f"\n--- {path} ---")
            items = self.list_dir(path)
            for item in sorted(items):
                print(f"  {item}")

        # Focus on state-level data directories
        self._explore_state_data_by_decade()

    def _explore_state_data_by_decade(self):
        """Explore state-level data for each decade."""
        base = "/programs-surveys/popest"

        # Known time periods for state data
        periods = [
            ("1900-1980", "tables"),
            ("1980-1990", "tables"),
            ("1990-2000", "tables"),
            ("2000-2010", "datasets"),
            ("2010-2020", "datasets"),
            ("2020-2024", "datasets"),
        ]

        print("\n" + "="*70)
        print("STATE-LEVEL DATA BY TIME PERIOD")
        print("="*70)

        for period, subtype in periods:
            path = f"{base}/{subtype}/{period}"
            print(f"\n>>> Period: {period} ({subtype}) <<<")

            # List top-level directories
            items = self.list_dir(path)

            # Look for state-related directories
            state_dirs = [i for i in items if 'state' in i.lower()]
            if state_dirs:
                print(f"  State directories found: {state_dirs}")
                for state_dir in state_dirs:
                    state_path = f"{path}/{state_dir}"
                    print(f"\n  --- {state_path} ---")

                    # List contents
                    sub_items = self.list_dir(state_path)
                    for item in sub_items[:20]:
                        print(f"    {item}")
                    if len(sub_items) > 20:
                        print(f"    ... and {len(sub_items) - 20} more items")

                    # Explore further for age/sex data
                    self._find_age_sex_files(state_path, sub_items)
            else:
                print(f"  All directories: {items}")

    def _find_age_sex_files(self, path: str, items: list[str]):
        """Look for files or directories related to age and sex breakdown."""
        age_sex_patterns = [
            r'asrh',      # Age/Sex/Race/Hispanic
            r'agesex',    # Age/Sex
            r'age',       # Age
            r'sex',       # Sex
            r'single',    # Single year of age
            r'5yr',       # 5-year age groups
            r'char',      # Characteristics
            r'detail',    # Detailed
        ]

        pattern = '|'.join(age_sex_patterns)
        matches = [i for i in items if re.search(pattern, i.lower())]

        if matches:
            print(f"\n    ** Age/Sex related items found: **")
            for match in matches:
                match_path = f"{path}/{match}"
                print(f"      - {match}")
                self.findings.append({
                    'path': match_path,
                    'type': 'directory' if '.' not in match else 'file'
                })

                # If it's a directory, explore it
                if '.' not in match:
                    sub_items = self.list_dir(match_path)
                    # Show files that might have age/sex data
                    relevant = [s for s in sub_items if any(p in s.lower() for p in ['age', 'sex', 'asrh', 'char'])]
                    if relevant:
                        print(f"        Relevant files: {relevant[:10]}")
                    else:
                        print(f"        Files: {sub_items[:10]}")

    def explore_specific_paths(self):
        """Explore specific paths known to have state age/sex data."""
        print("\n" + "="*70)
        print("EXPLORING SPECIFIC KNOWN PATHS FOR STATE AGE/SEX DATA")
        print("="*70)

        # Known paths from notebook research
        known_paths = [
            # Historical state data with age/sex/race
            "/programs-surveys/popest/tables/1900-1980/state/asrh",
            "/programs-surveys/popest/tables/1980-1990/state/asrh",
            "/programs-surveys/popest/tables/1990-2000/state/asrh",
            # Datasets with age-sex detail
            "/programs-surveys/popest/datasets/2000-2010/intercensal/state",
            "/programs-surveys/popest/datasets/2010-2020/state",
            "/programs-surveys/popest/datasets/2020-2024/state",
        ]

        for path in known_paths:
            print(f"\n--- {path} ---")
            items = self.list_dir(path)

            # Group by type
            files = [i for i in items if '.' in i]
            dirs = [i for i in items if '.' not in i]

            if dirs:
                print(f"  Subdirectories: {dirs}")

            if files:
                # Show relevant files
                age_sex_files = [f for f in files if any(p in f.lower() for p in ['age', 'sex', 'asrh', 'char', 'single'])]
                if age_sex_files:
                    print(f"  Age/Sex files ({len(age_sex_files)}):")
                    for f in age_sex_files[:15]:
                        print(f"    {f}")
                    if len(age_sex_files) > 15:
                        print(f"    ... and {len(age_sex_files) - 15} more")
                else:
                    print(f"  All files ({len(files)}):")
                    for f in files[:15]:
                        print(f"    {f}")

    def print_findings_summary(self):
        """Print summary of findings."""
        print("\n" + "="*70)
        print("SUMMARY OF POTENTIAL DATA SOURCES")
        print("="*70)

        print("""
KEY FINDINGS FOR STATE POPULATION BY AGE AND SEX:

1. HISTORICAL (pre-2000):
   - /programs-surveys/popest/tables/1900-1980/state/asrh/
     Files like pe-19.csv have state data with age-sex-race

   - /programs-surveys/popest/tables/1980-1990/state/asrh/
     Files like s5yr8090.txt have 5-year age groups
     Files like stiag4XX.txt have individual age by state

   - /programs-surveys/popest/tables/1990-2000/state/asrh/
     Files like sasrh90.txt have individual age by race

2. 2000-2010 INTERCENSAL:
   - /programs-surveys/popest/datasets/2000-2010/intercensal/state/
     st-est00int-agesex.csv - State estimates with age and sex

3. 2010-2020:
   - /programs-surveys/popest/datasets/2010-2020/state/
     Look for files with 'agesex' or 'char' (characteristics)

4. 2020-PRESENT:
   - /programs-surveys/popest/datasets/2020-2024/state/
     sc-est2024-* files likely have age/sex detail

HTTP ACCESS (easier than FTP):
   https://www2.census.gov/programs-surveys/popest/

DOCUMENTATION:
   https://www.census.gov/data/datasets/time-series/demo/popest/2020s-state-detail.html
""")


def main():
    explorer = CensusFTPExplorer()

    try:
        explorer.connect()
        explorer.explore_popest()
        explorer.explore_specific_paths()
        explorer.print_findings_summary()
    except KeyboardInterrupt:
        print("\nInterrupted by user")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        explorer.close()


if __name__ == "__main__":
    main()
