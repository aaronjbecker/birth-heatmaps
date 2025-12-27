#!/usr/bin/env python3
"""
Main entry point for the HMD births heatmap data pipeline.

This script orchestrates the data loading, processing, and JSON export
for the frontend visualization.

TODO (Stage B): Implement pipeline orchestration
"""

import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


def main():
    print("HMD Births Heatmap Data Pipeline")
    print("=" * 40)
    print()
    print("Pipeline not yet implemented.")
    print("This will be completed in Stage B.")
    print()
    print("For now, you can run the existing scripts directly:")
    print("  python src/load_heatmap_data.py")
    print("  python src/prepare_heatmap_data.py")
    print("  python src/build_fertility_charts.py")


if __name__ == "__main__":
    main()
