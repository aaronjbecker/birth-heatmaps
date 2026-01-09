#!/usr/bin/env python3
"""
Explore Census FTP for pre-1980 state-level population data by age/sex.
"""

from ftplib import FTP


def main():
    ftp = FTP('ftp2.census.gov')
    ftp.login()

    # Check pre-1980 state estimates
    print("=" * 70)
    print("EXPLORING PRE-1980 STATE ESTIMATES")
    print("=" * 70)

    # Check popest tables for various decades
    base_tables = "/programs-surveys/popest/tables"

    decades = ['1900-1980', '1940-1969', '1950-1960', '1940-1950']
    for decade in decades:
        path = f"{base_tables}/{decade}"
        try:
            ftp.cwd(path)
            items = ftp.nlst()
            print(f"\n{decade}: {sorted(items)}")
        except Exception as e:
            print(f"\n{decade}: Not found")

    # Explore 1900-1980 more thoroughly
    print("\n" + "=" * 70)
    print("DETAILED 1900-1980 STATE DIRECTORY")
    print("=" * 70)

    state_path = "/programs-surveys/popest/tables/1900-1980/state"
    try:
        ftp.cwd(state_path)
        items = ftp.nlst()
        print(f"\nState directory contents: {sorted(items)}")

        for subdir in items:
            subpath = f"{state_path}/{subdir}"
            try:
                ftp.cwd(subpath)
                files = ftp.nlst()
                print(f"\n  {subdir}/:")
                for f in sorted(files):
                    print(f"    {f}")
            except:
                pass
    except Exception as e:
        print(f"Error: {e}")

    # Check datasets directory structure
    print("\n" + "=" * 70)
    print("PRE-1980 DATASETS")
    print("=" * 70)

    datasets_path = "/programs-surveys/popest/datasets"
    ftp.cwd(datasets_path)
    items = ftp.nlst()

    # Filter for pre-1980 directories
    pre1980 = [d for d in items if any(y in d for y in ['1940', '1950', '1960', '1970', '1900'])]
    print(f"Pre-1980 dataset directories: {sorted(pre1980)}")

    for d in sorted(pre1980):
        dpath = f"{datasets_path}/{d}"
        try:
            ftp.cwd(dpath)
            subitems = ftp.nlst()
            print(f"\n  {d}/: {sorted(subitems)}")

            # Check for state subdirectory
            if 'state' in subitems:
                ftp.cwd(f"{dpath}/state")
                state_files = ftp.nlst()
                print(f"    state/: {sorted(state_files)[:10]}")
        except:
            pass

    # Check national estimates directory for pre-1980
    print("\n" + "=" * 70)
    print("PRE-1980 NATIONAL ESTIMATES (may include state)")
    print("=" * 70)

    national_path = "/programs-surveys/popest/tables/1900-1980/national"
    try:
        ftp.cwd(national_path)
        items = ftp.nlst()
        print(f"National directory: {sorted(items)}")

        for subdir in items:
            subpath = f"{national_path}/{subdir}"
            try:
                ftp.cwd(subpath)
                files = ftp.nlst()
                csv_files = [f for f in files if f.endswith('.csv')]
                print(f"\n  {subdir}/: {len(files)} files, {len(csv_files)} CSVs")

                # Show structure of a few files
                if csv_files:
                    print(f"    Sample files: {sorted(csv_files)[:5]}")
            except:
                pass
    except Exception as e:
        print(f"Error: {e}")

    # Check specifically for intercensal state estimates
    print("\n" + "=" * 70)
    print("INTERCENSAL STATE DIRECTORIES")
    print("=" * 70)

    for decade in ['1940-1950', '1950-1960', '1960-1970']:
        path = f"/programs-surveys/popest/datasets/{decade}"
        try:
            ftp.cwd(path)
            items = ftp.nlst()
            print(f"\n{decade}: {sorted(items)}")

            if 'state' in items:
                ftp.cwd(f"{path}/state")
                state_items = ftp.nlst()
                print(f"  state/: {sorted(state_items)}")
        except Exception as e:
            print(f"\n{decade}: Not found or error")

    ftp.quit()
    print("\nDone.")


if __name__ == "__main__":
    main()
