import { test, expect } from '@playwright/test';

test.describe('i18n · routing bilingue', () => {
  test('la home française est servie en français', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr-FR');
    await expect(page.getByRole('link', { name: 'Travaux', exact: true }).first()).toBeVisible();
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

  test('la navigation EN conserve le préfixe /en', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('link', { name: 'Research', exact: true }).first().click();
    await expect(page).toHaveURL(/\/en\/travaux/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  });

  test('chaque page déclare ses alternates hreflang', async ({ page }) => {
    await page.goto('/en/travaux');
    await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute(
      'href',
      /\/travaux$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      'href',
      /\/en\/travaux$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      'href',
      /\/travaux$/,
    );
  });
});
