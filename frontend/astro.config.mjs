import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  site: 'https://birth-heatmaps.aaronjbecker.com',
  output: 'static',
  integrations: [react(), sitemap(), icon()],
  build: {
    assets: 'assets',
    concurrency: 8,
  }
});
