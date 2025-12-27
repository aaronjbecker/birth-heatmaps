#!/usr/bin/env python3
"""
Parse R data.frame definition and convert to CSV.
Reads from jpop.r in the same directory and outputs jpop.csv
Age groups (0-84, 85+) become column headers.
Each row represents a sex/year combination.
"""

import re
import pandas as pd
from pathlib import Path

def parse_r_dataframe(file_path):
    """Parse R data.frame definition and return a pandas DataFrame."""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove the assignment part (Jpop <- data.frame)
    content = re.sub(r'^\w+\s*<-\s*data\.frame\s*\(', '', content, flags=re.MULTILINE)
    content = re.sub(r'\)\s*$', '', content.strip(), flags=re.MULTILINE)
    
    # Dictionary to store column data
    columns = {}
    
    # Pattern to match column definitions: ColumnName = c(...)
    # Handle multi-line c() definitions
    column_pattern = r'(\w+)\s*=\s*c\(([^)]+(?:\)[^)]*)*)\)'
    
    # First, let's extract all column definitions more carefully
    # Split by lines and process
    lines = content.split('\n')
    current_col = None
    current_values = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Check if this line starts a new column definition
        col_match = re.match(r'(\w+)\s*=\s*c\(', line)
        if col_match:
            # Save previous column if exists
            if current_col:
                columns[current_col] = current_values
            current_col = col_match.group(1)
            # Extract values from this line
            values_str = line[col_match.end():]
            current_values = []
            # Extract numbers or strings from this line
            if current_col == 'Age':
                # Handle Age column specially
                if 'sprintf' in values_str:
                    sprintf_match = re.search(r'sprintf\("%d",(\d+):(\d+)\)', values_str)
                    if sprintf_match:
                        start = int(sprintf_match.group(1))
                        end = int(sprintf_match.group(2))
                        age_values = [str(i) for i in range(start, end + 1)]
                        # Check for "85+" after sprintf
                        remaining = values_str[sprintf_match.end():]
                        if '"85+"' in remaining or "'85+'" in remaining:
                            age_values.append('85+')
                        columns['Age'] = age_values
                        current_col = None
                        current_values = []
                        continue
            else:
                # Extract numbers from the line
                numbers = re.findall(r'\b(\d+)\b', values_str)
                current_values.extend([int(n) for n in numbers])
        elif current_col and line.endswith(')'):
            # Last line of a column definition
            values_str = line.rstrip(')')
            numbers = re.findall(r'\b(\d+)\b', values_str)
            current_values.extend([int(n) for n in numbers])
            columns[current_col] = current_values
            current_col = None
            current_values = []
        elif current_col:
            # Continuation line
            numbers = re.findall(r'\b(\d+)\b', line)
            current_values.extend([int(n) for n in numbers])
    
    # Save last column if exists
    if current_col:
        columns[current_col] = current_values
    
    # Get age headers from Age column
    age_headers = columns.pop('Age', [])
    
    # Build the output DataFrame
    rows = []
    
    for col_name, values in columns.items():
        # Parse column name: M1888 -> sex='M', year=1888
        match = re.match(r'^([MF])(\d+)(J?)$', col_name)
        if match:
            sex = match.group(1)
            year = int(match.group(2))
            # Create row dictionary
            row = {'sex': sex, 'year': year}
            # Add age group values
            for i, age in enumerate(age_headers):
                if i < len(values):
                    row[age] = values[i]
                else:
                    row[age] = None
            rows.append(row)
    
    # Create DataFrame
    df = pd.DataFrame(rows)
    
    # Sort by year, then sex
    df = df.sort_values(['year', 'sex']).reset_index(drop=True)
    
    # Reorder columns: sex, year, then age groups
    col_order = ['sex', 'year'] + [str(age) for age in age_headers]
    df = df[col_order]
    
    return df


def main():
    # Get script directory
    script_dir = Path(__file__).parent
    
    # Input and output paths
    input_file = script_dir / 'jpop.r'
    output_file = script_dir / 'jpop.csv'
    
    if not input_file.exists():
        print(f"Error: {input_file} not found!")
        return
    
    print(f"Reading from {input_file}...")
    df = parse_r_dataframe(input_file)
    
    print(f"Parsed {len(df)} rows and {len(df.columns)} columns")
    print(f"Columns: {', '.join(df.columns[:5])}... (showing first 5)")
    print(f"\nFirst few rows:")
    print(df.head())
    
    # Save to CSV
    df.to_csv(output_file, index=False)
    print(f"\nSaved to {output_file}")


if __name__ == '__main__':
    main()