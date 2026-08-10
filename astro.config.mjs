// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// URL du site, surchargée en production (Cloudflare) via PUBLIC_SITE_URL.
const SITE = process.env.PUBLIC_SITE_URL ?? 'https://siba-portfolio.pages.dev';

// L'adapter Cloudflare ouvre un workerd local, inutile en dev (site statique) et
// bloquant sous Vitest. On ne l'active qu'au build et en preview.
const isVitest = process.env.VITEST === 'true';
const isDev = process.argv.includes('dev');

export default defineConfig({
  site: SITE,
  output: 'static',
  ...(isVitest || isDev ? {} : { adapter: cloudflare() }),
  integrations: [mdx(), sitemap()],
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
