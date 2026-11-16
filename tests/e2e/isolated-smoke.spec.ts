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

test('한글 가변 폰트를 외부 연결 없이 불러온다', async ({ page }) => {
  const failedFonts: string[] = [];
  page.on('requestfailed', request => {
    if (request.resourceType() === 'font') failedFonts.push(request.url());
  });
  await page.goto('/auth');
  const loaded = await page.evaluate(async () => {
    const family = getComputedStyle(document.body)
      .getPropertyValue('--font-noto-sans-kr').split(',')[0].trim();
    if (!family) return false;
    for (const weight of [400, 500, 700]) {
      const faces = await document.fonts.load(`${weight} 16px ${family}`, '가각한글힣');
      if (!faces.length || faces.some(face => face.status !== 'loaded')) return false;
    }
    return true;
  });
  expect(loaded).toBe(true);
  expect(failedFonts).toEqual([]);
});

test('실제 계정 없이 보호 페이지가 로그인으로 이동한다', async ({ page }) => {
  await page.goto('/lead-manager');
  await expect(page).toHaveURL(/\/auth(?:\?|$)/);
});

test('인증 없는 cron 요청은 차단된다', async ({ request }) => {
  const response = await request.get('/api/cron/sync');
  expect(response.status()).toBe(401);
});
