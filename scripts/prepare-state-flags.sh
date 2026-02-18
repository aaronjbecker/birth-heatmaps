#!/usr/bin/env bash
#
# prepare-state-flags.sh
#
# One-time dev tool: downloads US state flag SVGs from GitHub,
# converts them to optimized PNGs at 120px width, and outputs
# to frontend/src/assets/state-flags/.
#
# Requirements: git, inkscape, pngquant

set -euo pipefail

REPO_URL="https://github.com/nibsbin/us-state-flags-svg.git"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORK_DIR=$(mktemp -d)
SVG_DIR="$WORK_DIR/us-state-flags-svg/flags"
OUTPUT_DIR="$PROJECT_ROOT/frontend/src/assets/state-flags"
PNG_WIDTH=120

echo "==> Cloning SVG repo to $WORK_DIR..."
git clone --depth 1 "$REPO_URL" "$WORK_DIR/us-state-flags-svg"

echo "==> Preparing output directory: $OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Map SVG filenames to our slug format.
# Format: "SVG_basename|output_slug"
# Only the 50 states + DC; skip territories.
MAPPINGS=(
  "Flag_of_Alabama|alabama"
  "Flag_of_Alaska|alaska"
  "Flag_of_Arizona|arizona"
  "Flag_of_Arkansas|arkansas"
  "Flag_of_California|california"
  "Flag_of_Colorado_designed_by_Andrew_Carlisle_Carson|colorado"
  "Flag_of_Connecticut|connecticut"
  "Flag_of_Delaware|delaware"
  "Flag_of_the_District_of_Columbia|district-of-columbia"
  "Flag_of_Florida|florida"
  "Flag_of_Georgia_(U.S._state)|georgia"
  "Flag_of_Hawaii|hawaii"
  "Flag_of_Idaho|idaho"
  "Flag_of_Illinois|illinois"
  "Flag_of_Indiana|indiana"
  "Flag_of_Iowa|iowa"
  "Flag_of_Kansas|kansas"
  "Flag_of_Kentucky|kentucky"
  "Flag_of_Louisiana|louisiana"
  "Flag_of_Maine|maine"
  "Flag_of_Maryland|maryland"
  "Flag_of_Massachusetts|massachusetts"
  "Flag_of_Michigan|michigan"
  "Flag_of_Minnesota|minnesota"
  "Flag_of_Mississippi|mississippi"
  "Flag_of_Missouri|missouri"
  "Flag_of_Montana|montana"
  "Flag_of_Nebraska|nebraska"
  "Flag_of_Nevada|nevada"
  "Flag_of_New_Hampshire|new-hampshire"
  "Flag_of_New_Jersey|new-jersey"
  "Flag_of_New_Mexico|new-mexico"
  "Flag_of_New_York|new-york"
  "Flag_of_North_Carolina|north-carolina"
  "Flag_of_North_Dakota|north-dakota"
  "Flag_of_Ohio|ohio"
  "Flag_of_Oklahoma|oklahoma"
  "Flag_of_Oregon|oregon"
  "Flag_of_Pennsylvania|pennsylvania"
  "Flag_of_Rhode_Island|rhode-island"
  "Flag_of_South_Carolina|south-carolina"
  "Flag_of_South_Dakota|south-dakota"
  "Flag_of_Tennessee|tennessee"
  "Flag_of_Texas|texas"
  "Flag_of_Utah|utah"
  "Flag_of_Vermont|vermont"
  "Flag_of_Virginia|virginia"
  "Flag_of_Washington|washington"
  "Flag_of_West_Virginia|west-virginia"
  "Flag_of_Wisconsin|wisconsin"
  "Flag_of_Wyoming|wyoming"
)

echo "==> Converting ${#MAPPINGS[@]} SVGs to PNG (width=${PNG_WIDTH}px)..."

count=0
for mapping in "${MAPPINGS[@]}"; do
  svg_base="${mapping%%|*}"
  slug="${mapping##*|}"
  svg_file="$SVG_DIR/${svg_base}.svg"
  png_file="$OUTPUT_DIR/${slug}.png"

  if [[ ! -f "$svg_file" ]]; then
    echo "  WARNING: Missing SVG: $svg_file"
    continue
  fi

  # Convert SVG → PNG with Inkscape (width=120, preserve aspect ratio)
  inkscape "$svg_file" \
    --export-type=png \
    --export-filename="$png_file" \
    --export-width="$PNG_WIDTH" \
    2>/dev/null

  # Optimize with pngquant (lossy compression, overwrite in place)
  pngquant --force --quality=65-90 --output "$png_file" "$png_file" 2>/dev/null || true

  count=$((count + 1))
  printf "  [%2d/%d] %s\n" "$count" "${#MAPPINGS[@]}" "$slug"
done

echo "==> Cleaning up temp directory..."
rm -rf "$WORK_DIR"

echo ""
echo "==> Done! Generated $count PNGs in $OUTPUT_DIR"
total_size=$(du -sh "$OUTPUT_DIR" | cut -f1)
echo "    Total size: $total_size"
echo ""
ls -1 "$OUTPUT_DIR" | wc -l | xargs -I{} echo "    File count: {}"
