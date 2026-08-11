import { defineConfig, devices } from '@playwright/test';

// Serveur de test : le dev server Astro sert nativement les routes /en
// (l'adapter Cloudflare n'est actif qu'au build/preview).
// Prérequis local : `npx playwright install chromium` pour les navigateurs.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    // 127.0.0.1 explicite : sous Windows, Chromium résout « localhost » en
    // IPv6 (::1) alors qu'astro dev n'écoute qu'en IPv4, d'où des ERR_ABORTED.
    baseURL: 'http://127.0.0.1:4321',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
