import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://birth-heatmaps.aaronjbecker.com', // TODO: Update with your production URL
  output: 'static',
  integrations: [react(), sitemap()],
  build: {
    assets: 'assets'
  }
});
