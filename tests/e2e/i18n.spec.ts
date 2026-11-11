import { test, expect } from '@playwright/test';

test.describe('i18n · routing bilingue', () => {
  test('la home française est servie en français', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr-FR');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('le sélecteur bascule vers l’anglais', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'English', exact: true }).click();
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  });

  test('le sélecteur revient au français', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('link', { name: 'Français', exact: true }).click();
    await expect(page).toHaveURL(/:4321\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr-FR');
  });

  test('chaque page déclare ses alternates hreflang', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute(
      'href',
      /\.io\/$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      'href',
      /\/en$/,
    );
  });
});
