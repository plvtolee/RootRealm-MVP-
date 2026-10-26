import { test, expect } from '@playwright/test';

/**
 * Unauthenticated journey: visitors land on login and are protected from
 * the app sections.
 */
test.describe('Authentication gate', () => {
  test('root redirects to login when signed out', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page shows GitHub sign-in', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /RootRealm/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in with GitHub/i })).toBeVisible();
  });

  test('protected sections redirect to login when signed out', async ({ page }) => {
    for (const path of ['/profile', '/shop', '/quests']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });
});