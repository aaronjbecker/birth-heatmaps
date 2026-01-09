#!/usr/bin/env python3
"""
Explore Census Bureau FTP for historical state population data (pre-1970).

Looking for data going back to 1910 if possible.
"""

from ftplib import FTP


def list_dir_recursive(ftp: FTP, path: str, depth: int = 0, max_depth: int = 3):
    """Recursively list directory contents."""
    indent = "  " * depth
    try:
        ftp.cwd(path)
        items = ftp.nlst()

        for item in sorted(items):
            # Skip hidden files
            if item.startswith('.'):
                continue

            full_path = f"{path}/{item}"

            # Check if it's a directory or file
            is_dir = '.' not in item or item.endswith('.d')

            if is_dir and depth < max_depth:
                print(f"{indent}📁 {item}/")
                try:
                    list_dir_recursive(ftp, full_path, depth + 1, max_depth)
                except Exception:
                    pass
            else:
                print(f"{indent}  {item}")

    except Exception as e:
        print(f"{indent}Error: {e}")


def main():
    ftp = FTP('ftp2.census.gov')
    ftp.login()

    # Explore 1900-1980 directory structure
    print("=" * 70)
    print("EXPLORING 1900-1980 STATE DATA")
    print("=" * 70)

    base_path = "/programs-surveys/popest/tables/1900-1980"
    print(f"\nPath: {base_path}")

    ftp.cwd(base_path)
    items = ftp.nlst()
    print(f"Top-level directories: {sorted(items)}")

    # Explore each subdirectory
    for subdir in sorted(items):
        print(f"\n--- {subdir} ---")
        subpath = f"{base_path}/{subdir}"
        try:
            ftp.cwd(subpath)
            subitems = ftp.nlst()
            for item in sorted(subitems):
                print(f"  {item}")
                # If it's a directory, show its contents too
                if '.' not in item:
                    try:
                        ftp.cwd(f"{subpath}/{item}")
                        files = ftp.nlst()
                        for f in sorted(files)[:20]:
                            print(f"    {f}")
                        if len(files) > 20:
                            print(f"    ... and {len(files) - 20} more files")
                    except:
                        pass
        except Exception as e:
            print(f"  Error: {e}")

    # Check for national-level data that might have state breakdowns
    print("\n" + "=" * 70)
    print("EXPLORING NATIONAL DATA (may contain state breakdowns)")
    print("=" * 70)

    national_path = f"{base_path}/national"
    try:
        ftp.cwd(national_path)
        items = ftp.nlst()
        print(f"\nNational directory contents:")
        for item in sorted(items):
            print(f"  {item}")
            if '.' not in item:
                try:
                    ftp.cwd(f"{national_path}/{item}")
                    files = ftp.nlst()
                    for f in sorted(files)[:15]:
                        print(f"    {f}")
                    if len(files) > 15:
                        print(f"    ... and {len(files) - 15} more")
                except:
                    pass
    except Exception as e:
        print(f"Error exploring national: {e}")

    # Check for any decade-specific directories
    print("\n" + "=" * 70)
    print("CHECKING FOR OTHER HISTORICAL DATASETS")
    print("=" * 70)

    # Check datasets directory for historical data
    datasets_path = "/programs-surveys/popest/datasets"
    ftp.cwd(datasets_path)
    items = ftp.nlst()
    historical = [i for i in items if any(y in i for y in ['1900', '1910', '1920', '1930', '1940', '1950', '1960', '1970', '1980'])]
    print(f"\nHistorical datasets directories: {sorted(historical)}")

    for hist_dir in sorted(historical):
        print(f"\n--- {hist_dir} ---")
        try:
            ftp.cwd(f"{datasets_path}/{hist_dir}")
            subitems = ftp.nlst()
            for item in sorted(subitems):
                print(f"  {item}")
        except Exception as e:
            print(f"  Error: {e}")

    # Check decennial census data
    print("\n" + "=" * 70)
    print("CHECKING DECENNIAL CENSUS DATA")
    print("=" * 70)

    dec_paths = [
        "/programs-surveys/decennial",
        "/programs-surveys/decennial-census",
    ]

    for dec_path in dec_paths:
        try:
            ftp.cwd(dec_path)
            items = ftp.nlst()
            print(f"\n{dec_path}:")
            for item in sorted(items)[:20]:
                print(f"  {item}")
        except Exception as e:
            print(f"\n{dec_path}: Not found or error - {e}")

    ftp.quit()
    print("\nDone.")


if __name__ == "__main__":
    main()
