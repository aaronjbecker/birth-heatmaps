## State Flags — Done

SVGs sourced from https://github.com/nibsbin/us-state-flags-svg, converted to optimized PNGs at 120px width using Inkscape + pngquant.

**Assets:** `frontend/src/assets/state-flags/` (51 PNGs, ~200KB total)

**Preparation script:** `scripts/prepare-state-flags.sh` — one-time dev tool that clones the SVG repo, renames/converts/optimizes.

**Frontend integration:**
- `src/lib/state-flags.ts` — Vite glob import + `getStateFlagUrl()` lookup
- `src/components/StateFlag.astro` — Astro component for build-time rendering
- Flags displayed in: homepage state cards, state detail page headers, StateDropdown, StateMultiSelect
- Reuses existing `CountryFlag.svelte` for Svelte contexts (generic img component)
