/**
 * 인증 E2E 테스트
 * 로그인, 로그아웃, 세션 관리 기능 테스트
 */

import { test, expect } from '@playwright/test';

test.describe('인증 기능', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('랜딩 페이지에서 로그인 페이지로 이동할 수 있다', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('서울 지하철 광고 영업 시스템');
    
    // 로그인 버튼 클릭
    await page.click('text=로그인');
    
    // 로그인 페이지로 이동 확인
    await expect(page).toHaveURL('/auth');
    await expect(page.locator('h1')).toContainText('로그인');
  });

  test('이메일과 비밀번호로 로그인할 수 있다', async ({ page }) => {
    await page.goto('/auth');
    
    // 이메일 입력
    await page.fill('input[name="email"]', 'test@example.com');
    
    // 비밀번호 입력
    await page.fill('input[name="password"]', 'password123');
    
    // 로그인 버튼 클릭
    await page.click('button[type="submit"]');
    
    // 대시보드로 리다이렉트 확인
    await expect(page).toHaveURL('/lead-manager');
    await expect(page.locator('h1')).toContainText('리드 관리');
  });

  test('잘못된 자격증명으로 로그인하면 에러 메시지가 표시된다', async ({ page }) => {
    await page.goto('/auth');
    
    // 잘못된 이메일/비밀번호 입력
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    // 로그인 버튼 클릭
    await page.click('button[type="submit"]');
    
    // 에러 메시지 확인
    await expect(page.locator('text=이메일 또는 비밀번호가 올바르지 않습니다')).toBeVisible();
  });

  test('로그아웃할 수 있다', async ({ page }) => {
    // 먼저 로그인
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // 대시보드로 이동 확인
    await expect(page).toHaveURL('/lead-manager');
    
    // 로그아웃 버튼 클릭
    await page.click('button[aria-label="로그아웃"]');
    
    // 랜딩 페이지로 리다이렉트 확인
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=로그인')).toBeVisible();
  });

  test('보호된 페이지에 접근하면 로그인 페이지로 리다이렉트된다', async ({ page }) => {
    // 직접 대시보드 URL 접근
    await page.goto('/lead-manager');
    
    // 로그인 페이지로 리다이렉트 확인
    await expect(page).toHaveURL('/auth');
  });

  test('세션이 만료되면 자동으로 로그아웃된다', async ({ page }) => {
    // 로그인
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // 대시보드로 이동 확인
    await expect(page).toHaveURL('/lead-manager');
    
    // 세션 만료 시뮬레이션 (쿠키 삭제)
    await page.context().clearCookies();
    
    // 페이지 새로고침
    await page.reload();
    
    // 로그인 페이지로 리다이렉트 확인
    await expect(page).toHaveURL('/auth');
  });
});
