import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' && url.port === '3117' ? route.continue() : route.abort();
  });
});

test('격리 랜딩 페이지가 표시된다', async ({ page }) => {
  expect((await page.goto('/'))?.status()).toBe(200);
  await expect(page.locator('h1').first()).toBeVisible();
});

test('실제 계정 없이 보호 페이지가 로그인으로 이동한다', async ({ page }) => {
  await page.goto('/lead-manager');
  await expect(page).toHaveURL(/\/auth(?:\?|$)/);
});

test('인증 없는 cron 요청은 차단된다', async ({ request }) => {
  const response = await request.get('/api/cron/sync');
  expect(response.status()).toBe(401);
});
