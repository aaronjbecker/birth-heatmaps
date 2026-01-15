#!/usr/bin/env python3
"""
Detect anomalies in historical US state-level birth data.

Identifies months where the percentage of rolling 12-month births (forward)
deviates significantly from the same calendar month in surrounding years.
These anomalies have the biggest impact on seasonality heatmap visualizations.
"""

import argparse
from pathlib import Path

import polars as pl


def load_state_births(file_path: Path) -> pl.DataFrame:
    """
    Load US state birth data, filtering each state to its first non-null year.

    Args:
        file_path: Path to US_BIRTH_1915_2008.csv

    Returns:
        DataFrame with columns: state, stateid, year, month, births
    """
    df = pl.read_csv(file_path, infer_schema_length=100000)

    # Select relevant columns and rename mo -> month
    df = df.select(
        pl.col("state"),
        pl.col("stateid"),
        pl.col("year").cast(pl.Int32),
        pl.col("mo").alias("month").cast(pl.Int32),
        pl.col("births"),
    )

    # Convert births to numeric (na -> null)
    df = df.with_columns(
        pl.col("births").replace("na", None).cast(pl.Float64).alias("births")
    )

    # Filter out the header row artifact (state == "state")
    df = df.filter(pl.col("state") != "state")

    # For each state, find the first year with non-null births
    first_valid_year = (
        df.filter(pl.col("births").is_not_null())
        .group_by("state")
        .agg(pl.col("year").min().alias("first_year"))
    )

    # Join and filter to only include data from first valid year onward
    df = df.join(first_valid_year, on="state", how="left")
    df = df.filter(pl.col("year") >= pl.col("first_year"))
    df = df.drop("first_year")

    return df.sort("state", "year", "month")


def compute_forward_rolling_percentage(df: pl.DataFrame) -> pl.DataFrame:
    """
    Compute each month's percentage of the 12-month forward rolling sum.

    For month M: percentage = births[M] / sum(births[M:M+11]) * 100

    Skips the last 11 months per state where full forward window unavailable.
    """
    results = []

    for state in df.get_column("state").unique().sort().to_list():
        state_df = df.filter(pl.col("state") == state).sort("year", "month")

        births_list = state_df.get_column("births").to_list()
        n = len(births_list)

        # Compute 12-month forward sum for each position
        # Skip last 11 months (indices n-11 to n-1)
        forward_sums = []
        percentages = []

        for i in range(n):
            if i + 12 <= n:
                # Full 12-month window available
                window = births_list[i : i + 12]
                if None in window or any(v is None for v in window):
                    forward_sums.append(None)
                    percentages.append(None)
                else:
                    fwd_sum = sum(window)
                    forward_sums.append(fwd_sum)
                    if fwd_sum > 0:
                        percentages.append(births_list[i] / fwd_sum * 100)
                    else:
                        percentages.append(None)
            else:
                # Last 11 months - skip
                forward_sums.append(None)
                percentages.append(None)

        state_df = state_df.with_columns(
            pl.Series("rolling_12m_forward", forward_sums),
            pl.Series("pct_of_rolling_12m", percentages),
        )

        results.append(state_df)

    return pl.concat(results)


def compute_centered_baseline(
    df: pl.DataFrame, window_years: int = 3
) -> pl.DataFrame:
    """
    Compute baseline statistics for each month using ±N years centered window.

    For each (state, year, month), computes mean and std of pct_of_rolling_12m
    for the same calendar month in the surrounding years.

    Args:
        df: DataFrame with pct_of_rolling_12m column
        window_years: Number of years before and after to include (default: 3)
    """
    results = []

    for state in df.get_column("state").unique().sort().to_list():
        state_df = df.filter(pl.col("state") == state).sort("year", "month")

        # Get all year-month-percentage data for this state
        pct_data = (
            state_df.filter(pl.col("pct_of_rolling_12m").is_not_null())
            .select("year", "month", "pct_of_rolling_12m")
            .to_dicts()
        )

        # Build lookup: (year, month) -> percentage
        pct_lookup = {(r["year"], r["month"]): r["pct_of_rolling_12m"] for r in pct_data}

        # For each row, compute centered baseline
        baseline_means = []
        baseline_stds = []
        baseline_counts = []

        for row in state_df.iter_rows(named=True):
            year, month = row["year"], row["month"]

            # Collect same-month percentages from surrounding years (excluding current)
            comparison_values = []
            for y in range(year - window_years, year + window_years + 1):
                if y != year and (y, month) in pct_lookup:
                    comparison_values.append(pct_lookup[(y, month)])

            if len(comparison_values) >= 3:
                mean_val = sum(comparison_values) / len(comparison_values)
                variance = sum((v - mean_val) ** 2 for v in comparison_values) / len(
                    comparison_values
                )
                std_val = variance**0.5
                baseline_means.append(mean_val)
                baseline_stds.append(std_val if std_val > 0 else None)
                baseline_counts.append(len(comparison_values))
            else:
                baseline_means.append(None)
                baseline_stds.append(None)
                baseline_counts.append(len(comparison_values))

        state_df = state_df.with_columns(
            pl.Series("baseline_mean", baseline_means),
            pl.Series("baseline_std", baseline_stds),
            pl.Series("baseline_count", baseline_counts),
        )

        results.append(state_df)

    return pl.concat(results)


def detect_anomalies(
    df: pl.DataFrame,
    zscore_threshold: float = 3.0,
    suspicious_only: bool = False,
) -> pl.DataFrame:
    """
    Detect anomalies where month percentage deviates from baseline.

    Args:
        df: DataFrame with pct_of_rolling_12m, baseline_mean, baseline_std
        zscore_threshold: Flag if |zscore| exceeds this value
        suspicious_only: If True, only flag extreme cases (pct outside 5-12%)

    Returns:
        DataFrame with only anomalous rows, plus severity and detection info
    """
    # Filter to rows with valid percentage and baseline
    df = df.filter(
        pl.col("pct_of_rolling_12m").is_not_null()
        & pl.col("baseline_mean").is_not_null()
        & pl.col("baseline_std").is_not_null()
    )

    # Compute Z-score and deviation
    df = df.with_columns(
        (
            (pl.col("pct_of_rolling_12m") - pl.col("baseline_mean"))
            / pl.col("baseline_std")
        ).alias("zscore"),
        (
            (pl.col("pct_of_rolling_12m") - pl.col("baseline_mean"))
            / pl.col("baseline_mean")
            * 100
        ).alias("deviation_pct"),
    )

    # Flag anomalies
    df = df.with_columns(
        (pl.col("zscore").abs() > zscore_threshold).alias("is_anomaly")
    )

    # Compute severity
    df = df.with_columns(
        pl.when(pl.col("zscore").abs() > 5.0)
        .then(pl.lit("high"))
        .when(pl.col("zscore").abs() > 4.0)
        .then(pl.lit("medium"))
        .otherwise(pl.lit("low"))
        .alias("severity")
    )

    # Filter to anomalies only
    anomalies = df.filter(pl.col("is_anomaly"))

    # If suspicious_only, further filter to extreme percentages outside 5-12%
    if suspicious_only:
        anomalies = anomalies.filter(
            (pl.col("pct_of_rolling_12m") < 5) | (pl.col("pct_of_rolling_12m") > 12)
        )

    return anomalies


def add_context_columns(df: pl.DataFrame, full_df: pl.DataFrame) -> pl.DataFrame:
    """Add previous and next year percentages for context."""
    # Build lookup from full data
    pct_lookup = {}
    for row in full_df.iter_rows(named=True):
        key = (row["state"], row["year"], row["month"])
        pct_lookup[key] = row.get("pct_of_rolling_12m")

    prev_year_pcts = []
    next_year_pcts = []

    for row in df.iter_rows(named=True):
        state, year, month = row["state"], row["year"], row["month"]
        prev_year_pcts.append(pct_lookup.get((state, year - 1, month)))
        next_year_pcts.append(pct_lookup.get((state, year + 1, month)))

    return df.with_columns(
        pl.Series("prev_year_pct", prev_year_pcts),
        pl.Series("next_year_pct", next_year_pcts),
    )


def format_output(df: pl.DataFrame) -> pl.DataFrame:
    """Format and select columns for output CSV."""
    severity_order = {"high": 0, "medium": 1, "low": 2}

    df = df.with_columns(
        pl.col("severity").replace(severity_order).alias("severity_order")
    )

    df = df.sort("severity_order", "state", "year", "month")

    return df.select(
        "state",
        "stateid",
        "year",
        "month",
        pl.col("births").round(0).cast(pl.Int64),
        pl.col("pct_of_rolling_12m").round(3).alias("pct_of_12m"),
        pl.col("baseline_mean").round(3).alias("expected_pct"),
        pl.col("deviation_pct").round(1),
        pl.col("zscore").round(2),
        "severity",
        pl.col("prev_year_pct").round(3),
        pl.col("next_year_pct").round(3),
    )


def main():
    parser = argparse.ArgumentParser(
        description="Detect anomalies in US state birth data using rolling 12-month percentage"
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=Path(__file__).parent / "US_BIRTH_1915_2008.csv",
        help="Input CSV file path",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).parent / "anomalies.csv",
        help="Output CSV file path",
    )
    parser.add_argument(
        "--zscore-threshold",
        type=float,
        default=3.0,
        help="Z-score threshold for anomaly detection (default: 3.0)",
    )
    parser.add_argument(
        "--window-years",
        type=int,
        default=3,
        help="Years before/after for baseline comparison (default: 3, gives 6-year window)",
    )
    parser.add_argument(
        "--suspicious-only",
        action="store_true",
        help="Only flag extreme cases where percentage is outside 5-12%% range",
    )

    args = parser.parse_args()

    print(f"Loading data from {args.input}...")
    df = load_state_births(args.input)
    print(f"Loaded {len(df)} records for {df['state'].n_unique()} states")

    print("Computing forward rolling 12-month percentages...")
    df = compute_forward_rolling_percentage(df)

    valid_pct_count = df.filter(pl.col("pct_of_rolling_12m").is_not_null()).height
    print(f"  {valid_pct_count} months with valid percentages")

    print(f"Computing centered baseline (±{args.window_years} years)...")
    df = compute_centered_baseline(df, window_years=args.window_years)

    print(f"Detecting anomalies (|z-score| > {args.zscore_threshold})...")
    anomalies = detect_anomalies(
        df,
        zscore_threshold=args.zscore_threshold,
        suspicious_only=args.suspicious_only,
    )

    print("Adding context columns...")
    anomalies = add_context_columns(anomalies, df)

    output_df = format_output(anomalies)

    print(f"\nFound {len(output_df)} anomalies:")
    if len(output_df) > 0:
        severity_counts = output_df.group_by("severity").len().sort("severity")
        for row in severity_counts.iter_rows():
            print(f"  {row[0]}: {row[1]}")

    print(f"\nWriting results to {args.output}...")
    output_df.write_csv(args.output)
    print("Done.")


if __name__ == "__main__":
    main()
