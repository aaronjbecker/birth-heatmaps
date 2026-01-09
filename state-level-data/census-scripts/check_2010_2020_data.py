#!/usr/bin/env python3
"""
Check for combined 2010-2020 state age/sex data files.
"""

from ftplib import FTP


def main():
    ftp = FTP('ftp2.census.gov')
    ftp.login()

    # Check asrh directory for combined files
    print("=== 2010-2020 state/asrh directory ===")
    ftp.cwd('/programs-surveys/popest/datasets/2010-2020/state/asrh')
    files = ftp.nlst()

    # Look for files that might have all states combined
    print("All files:")
    for f in sorted(files):
        print(f"  {f}")

    # The PRC- files are Puerto Rico specific, SC- are state-specific
    # Look for any file that might have combined data
    combined = [f for f in files if not f.startswith('SC-') and not f.startswith('PRC-')]
    if combined:
        print(f"\nPossible combined files: {combined}")

    # Also check the intercensal directory for 2010-2020
    print("\n=== Looking for 2010-2020 intercensal ===")
    try:
        ftp.cwd('/programs-surveys/popest/datasets/2010-2020/intercensal/state')
        files = ftp.nlst()
        print(f"Files: {files}")
    except Exception as e:
        print(f"  No intercensal directory for 2010-2020: {e}")

    # Check the main 2010-2020/state directory
    print("\n=== 2010-2020 state directory ===")
    ftp.cwd('/programs-surveys/popest/datasets/2010-2020/state')
    files = ftp.nlst()
    print(f"Subdirectories/files: {files}")

    ftp.quit()


if __name__ == "__main__":
    main()
