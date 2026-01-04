import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import tailwind from '@astrojs/tailwind';

// Production-only compression
// playformCompress is minification, cf. https://github.com/PlayForm/Compress
import playformCompress from '@playform/compress';
// compressor creates .br files, cf. https://github.com/sondr3/astro-compressor
import compressor from 'astro-compressor';

// Environment detection
const isProd = process.env.NODE_ENV === 'production';

// Helper to conditionally include production-only integrations
function prodOnly(integration) {
  return isProd ? integration : undefined;
}

// https://astro.build/config
export default defineConfig({
  site: 'https://birth-heatmaps.aaronjbecker.com',
  output: 'static',

  integrations: [
    svelte(),
    react(),
    sitemap(),
    icon(),
    tailwind({
      applyBaseStyles: false, // We have our own global styles
    }),
    // playformCompress is minification (HTML + SVG only since CSS/JS are already minified)
    prodOnly(
      playformCompress({
        CSS: false,      // Already minified by Vite
        HTML: true,      // Minify HTML
        Image: false,    // Images already optimized
        JavaScript: false, // Already minified by Vite
        SVG: true,       // Minify SVG
      })
    ),
    // compressor creates .br files for nginx brotli_static
    prodOnly(
      compressor({
        brotli: true,
        gzip: false,  // Container uses brotli_static only
      })
    ),
  ].filter(Boolean),

  build: {
    assets: 'assets',
    concurrency: 8,
  }
});