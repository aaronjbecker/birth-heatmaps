#!/usr/bin/env python3
"""
Explore time-series and historical population data.
"""

from ftplib import FTP


def main():
    ftp = FTP('ftp2.census.gov')
    ftp.login()

    # Explore time-series directory
    print("=" * 70)
    print("EXPLORING TIME-SERIES DATA")
    print("=" * 70)

    ts_path = "/programs-surveys/decennial/tables/time-series"
    try:
        ftp.cwd(ts_path)
        items = ftp.nlst()
        print(f"\nTime-series directory contents:")
        for item in sorted(items):
            print(f"  {item}")

            # Explore subdirectories
            if '.' not in item:
                try:
                    ftp.cwd(f"{ts_path}/{item}")
                    files = ftp.nlst()
                    for f in sorted(files)[:10]:
                        print(f"    {f}")
                    if len(files) > 10:
                        print(f"    ... and {len(files) - 10} more")
                except:
                    pass
    except Exception as e:
        print(f"Error: {e}")

    # Check the 1790-1990 population file
    print("\n" + "=" * 70)
    print("EXPLORING 1790-1990 POPULATION DATA")
    print("=" * 70)

    pop_path = "/programs-surveys/decennial/tables/1990/population-of-states-and-counties-us-1790-1990"
    try:
        ftp.cwd(pop_path)
        items = ftp.nlst()
        print(f"\n1790-1990 state/county population files:")
        for item in sorted(items):
            print(f"  {item}")
    except Exception as e:
        print(f"Error: {e}")

    # Check for any age-related tables in 1990 decennial
    print("\n" + "=" * 70)
    print("EXPLORING 1990 STATE TABLES")
    print("=" * 70)

    state_table_path = "/programs-surveys/decennial/tables/1990/state-table-1990"
    try:
        ftp.cwd(state_table_path)
        items = ftp.nlst()
        print(f"\n1990 state tables:")
        for item in sorted(items):
            print(f"  {item}")
    except Exception as e:
        print(f"Error: {e}")

    # Check 1960-1980 census by county files
    print("\n" + "=" * 70)
    print("CHECKING HISTORICAL CENSUS BY COUNTY/STATE FILES")
    print("=" * 70)

    for year in ['1960', '1970', '1980']:
        year_path = f"/programs-surveys/decennial/tables/{year}"
        try:
            ftp.cwd(year_path)
            items = ftp.nlst()
            print(f"\n{year} tables:")
            for item in sorted(items):
                print(f"  {item}")
        except Exception as e:
            print(f"  {year}: Error - {e}")

    # Check national pe-11 files (1900-1979)
    print("\n" + "=" * 70)
    print("NATIONAL PE-11 FILES (for understanding structure)")
    print("=" * 70)

    pe11_path = "/programs-surveys/popest/tables/1900-1980/national/asrh"
    ftp.cwd(pe11_path)
    items = ftp.nlst()
    # Filter to just CSV files
    csv_files = sorted([f for f in items if f.endswith('.csv')])
    print(f"\nPE-11 CSV files (national age/sex/race, {len(csv_files)} files):")
    print(f"  First: {csv_files[0] if csv_files else 'none'}")
    print(f"  Last: {csv_files[-1] if csv_files else 'none'}")

    # List years covered
    years = sorted(set(f.split('-')[2].split('.')[0] for f in csv_files if f.startswith('pe-11-')))
    print(f"  Years covered: {years[0]} to {years[-1]}" if years else "  No years found")

    ftp.quit()
    print("\nDone.")


if __name__ == "__main__":
    main()
