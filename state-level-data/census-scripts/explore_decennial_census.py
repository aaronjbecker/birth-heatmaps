#!/usr/bin/env python3
"""
Explore decennial census data for historical state-level population by age/sex.
"""

from ftplib import FTP


def main():
    ftp = FTP('ftp2.census.gov')
    ftp.login()

    # Explore decennial census directories
    print("=" * 70)
    print("EXPLORING DECENNIAL CENSUS DATA")
    print("=" * 70)

    dec_path = "/programs-surveys/decennial"
    ftp.cwd(dec_path)
    items = ftp.nlst()

    # Focus on census years that might have age/sex data
    census_years = ['1870', '1920', '1940', '1950', '1960', '1970', '1980', '1990', '2000', '2010', '2020']

    for year in census_years:
        if year in items:
            print(f"\n{'='*50}")
            print(f"CENSUS YEAR: {year}")
            print('='*50)

            year_path = f"{dec_path}/{year}"
            try:
                ftp.cwd(year_path)
                year_items = ftp.nlst()
                print(f"Contents: {sorted(year_items)}")

                # Look for tables or datasets with age/population data
                for subdir in year_items:
                    if any(kw in subdir.lower() for kw in ['table', 'data', 'pop', 'age', 'state']):
                        subpath = f"{year_path}/{subdir}"
                        try:
                            ftp.cwd(subpath)
                            files = ftp.nlst()
                            print(f"\n  {subdir}/:")
                            for f in sorted(files)[:15]:
                                print(f"    {f}")
                            if len(files) > 15:
                                print(f"    ... and {len(files) - 15} more")
                        except:
                            pass
            except Exception as e:
                print(f"  Error: {e}")

    # Also check the decennial/tables directory
    print("\n" + "=" * 70)
    print("EXPLORING DECENNIAL/TABLES")
    print("=" * 70)

    tables_path = f"{dec_path}/tables"
    try:
        ftp.cwd(tables_path)
        items = ftp.nlst()
        print(f"Tables directory contents: {sorted(items)}")

        for subdir in sorted(items)[:10]:
            subpath = f"{tables_path}/{subdir}"
            try:
                ftp.cwd(subpath)
                files = ftp.nlst()
                print(f"\n  {subdir}/:")
                for f in sorted(files)[:10]:
                    print(f"    {f}")
                if len(files) > 10:
                    print(f"    ... and {len(files) - 10} more")
            except:
                print(f"  {subdir} (file)")
    except Exception as e:
        print(f"Error: {e}")

    # Check decennial/datasets
    print("\n" + "=" * 70)
    print("EXPLORING DECENNIAL/DATASETS")
    print("=" * 70)

    datasets_path = f"{dec_path}/datasets"
    try:
        ftp.cwd(datasets_path)
        items = ftp.nlst()
        print(f"Datasets directory contents: {sorted(items)}")
    except Exception as e:
        print(f"Error: {e}")

    ftp.quit()
    print("\nDone.")


if __name__ == "__main__":
    main()
