import { defineConfig } from 'vitest/config';

// Tests unitaires (fonctions pures : i18n, contenu, SEO).
// Les tests bout en bout vivent dans tests/e2e et relèvent de Playwright.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
