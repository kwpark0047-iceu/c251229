import { test, expect } from '@playwright/test';

test('랜딩 페이지가 오류 없이 표시된다', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('h1').first()).toBeVisible();
});

test('비로그인 사용자는 리드 관리 페이지에서 로그인으로 이동한다', async ({ page }) => {
  await page.goto('/lead-manager');
  await expect(page).toHaveURL(/\/auth(?:\?|$)/);
});
