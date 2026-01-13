#!/usr/bin/env python3
"""
Parse NHGIS data to extract female population aged 15-44 by state.

This script reads the downloaded NHGIS decennial census data and computes
the total female population of childbearing age (15-44) for each state.
"""

import csv
from pathlib import Path


def parse_1920(data_dir):
    """Parse 1920 data - Note: only has 18-44, not 15-44."""
    file_path = data_dir / "nhgis0001_csv/nhgis0001_csv/nhgis0001_ds43_1920_state.csv"
    results = []

    with open(file_path, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            state = row.get('STATE', row.get('"STATE"', '')).strip('"')
            # A7R002 = Female 18-44 (not 15-44!)
            female_18_44 = int(row.get('A7R002', 0) or 0)
            if state and female_18_44 > 0:
                results.append({
                    'year': 1920,
                    'state': state,
                    'female_15_44': None,  # Not available
                    'female_18_44': female_18_44,
                    'note': 'Only 18-44 available'
                })
    return results


def parse_1930(data_dir):
    """Parse 1930 data - has 5-year age groups (35-44 combined)."""
    file_path = data_dir / "nhgis0002_csv/nhgis0002_csv/nhgis0002_ds53_1930_state.csv"
    results = []

    with open(file_path, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            state = row.get('STATE', row.get('"STATE"', '')).strip('"')
            # BDF017-021 = Female 15-19, 20-24, 25-29, 30-34, 35-44
            female_15_44 = sum([
                int(row.get('BDF017', 0) or 0),
                int(row.get('BDF018', 0) or 0),
                int(row.get('BDF019', 0) or 0),
                int(row.get('BDF020', 0) or 0),
                int(row.get('BDF021', 0) or 0),
            ])
            if state and female_15_44 > 0:
                results.append({
                    'year': 1930,
                    'state': state,
                    'female_15_44': female_15_44,
                    'note': '35-44 combined'
                })
    return results


def parse_1940(data_dir):
    """Parse 1940 data - has full 5-year age groups."""
    file_path = data_dir / "nhgis0003_csv/nhgis0003_csv/nhgis0003_ds77_1940_state.csv"
    results = []

    with open(file_path, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            state = row.get('STATE', row.get('"STATE"', '')).strip('"')
            # BVX020-025 = Female 15-19, 20-24, 25-29, 30-34, 35-39, 40-44
            female_15_44 = sum([
                int(row.get('BVX020', 0) or 0),
                int(row.get('BVX021', 0) or 0),
                int(row.get('BVX022', 0) or 0),
                int(row.get('BVX023', 0) or 0),
                int(row.get('BVX024', 0) or 0),
                int(row.get('BVX025', 0) or 0),
            ])
            if state and female_15_44 > 0:
                results.append({
                    'year': 1940,
                    'state': state,
                    'female_15_44': female_15_44,
                    'note': ''
                })
    return results


def parse_1950(data_dir):
    """Parse 1950 data - has full 5-year age groups (NT8/B16)."""
    file_path = data_dir / "nhgis0004_csv/nhgis0004_csv/nhgis0004_ds83_1950_state.csv"
    results = []

    with open(file_path, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            state = row.get('STATE', row.get('"STATE"', '')).strip('"')
            # B16021-026 = Female 15-19, 20-24, 25-29, 30-34, 35-39, 40-44
            female_15_44 = sum([
                int(row.get('B16021', 0) or 0),
                int(row.get('B16022', 0) or 0),
                int(row.get('B16023', 0) or 0),
                int(row.get('B16024', 0) or 0),
                int(row.get('B16025', 0) or 0),
                int(row.get('B16026', 0) or 0),
            ])
            if state and female_15_44 > 0:
                results.append({
                    'year': 1950,
                    'state': state,
                    'female_15_44': female_15_44,
                    'note': ''
                })
    return results


def parse_1960(data_dir):
    """Parse 1960 data - has full 5-year age groups."""
    file_path = data_dir / "nhgis0005_csv/nhgis0005_csv/nhgis0005_ds89_1960_state.csv"
    results = []

    with open(file_path, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            state = row.get('STATE', row.get('"STATE"', '')).strip('"')
            # B5F022-027 = Female 15-19, 20-24, 25-29, 30-34, 35-39, 40-44
            female_15_44 = sum([
                int(row.get('B5F022', 0) or 0),
                int(row.get('B5F023', 0) or 0),
                int(row.get('B5F024', 0) or 0),
                int(row.get('B5F025', 0) or 0),
                int(row.get('B5F026', 0) or 0),
                int(row.get('B5F027', 0) or 0),
            ])
            if state and female_15_44 > 0:
                results.append({
                    'year': 1960,
                    'state': state,
                    'female_15_44': female_15_44,
                    'note': ''
                })
    return results


def main():
    data_dir = Path(__file__).parent / "nhgis_data"

    print("=" * 70)
    print("NHGIS HISTORICAL DATA: FEMALE POPULATION 15-44 BY STATE")
    print("=" * 70)

    all_results = []

    for year, parser in [
        (1920, parse_1920),
        (1930, parse_1930),
        (1940, parse_1940),
        (1950, parse_1950),
        (1960, parse_1960),
    ]:
        try:
            results = parser(data_dir)
            all_results.extend(results)
            print(f"\n{year}: {len(results)} states/territories")

            # Show sample
            for r in results[:3]:
                pop = r.get('female_15_44') or r.get('female_18_44', 'N/A')
                note = r.get('note', '')
                print(f"  {r['state']}: {pop:,}" + (f" ({note})" if note else ""))
            if len(results) > 3:
                print(f"  ... and {len(results) - 3} more")
        except FileNotFoundError:
            print(f"\n{year}: Data file not found")
        except Exception as e:
            print(f"\n{year}: Error - {e}")

    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    years = sorted(set(r['year'] for r in all_results))
    print(f"Years covered: {years}")

    # Note about 1920
    print("\nNotes:")
    print("- 1920: Only 18-44 age range available (not 15-44)")
    print("- 1930: Age 35-44 combined in single group")
    print("- 1940-1960: Full 5-year age groups available")

    # Write combined CSV
    output_file = data_dir / "female_15_44_by_state_historical.csv"
    with open(output_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['year', 'state', 'female_15_44', 'female_18_44', 'note'])
        for r in all_results:
            writer.writerow([
                r['year'],
                r['state'],
                r.get('female_15_44', ''),
                r.get('female_18_44', ''),
                r.get('note', '')
            ])
    print(f"\nCombined data saved to: {output_file}")


if __name__ == "__main__":
    main()
