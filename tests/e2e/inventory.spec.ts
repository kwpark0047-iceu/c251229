/**
 * 인벤토리 관리 E2E 테스트
 * 광고 인벤토리 CRUD, 가격 관리, 재고 추적 테스트
 */

import { test, expect } from '@playwright/test';

test.describe('인벤토리 관리', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/lead-manager');
    
    // 인벤토리 탭으로 이동
    await page.click('[data-testid="inventory-tab"]');
  });

  test('인벤토리 목록이 표시된다', async ({ page }) => {
    // 인벤토리 목록 확인
    await expect(page.locator('[data-testid="inventory-list"]')).toBeVisible();
    
    // 인벤토리 아이템 확인
    await expect(page.locator('[data-testid="inventory-item"]')).toHaveCount.greaterThan(0);
    
    // 필터링 옵션 확인
    await expect(page.locator('[data-testid="station-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="type-filter"]')).toBeVisible();
  });

  test('역사별로 인벤토리를 필터링할 수 있다', async ({ page }) => {
    // 역사 필터 선택
    await page.selectOption('select[name="station"]', '강남역');
    
    // 필터링된 결과 확인
    await expect(page.locator('[data-testid="inventory-item"]')).toHaveCount.greaterThan(0);
    
    // 필터링된 인벤토리가 선택된 역사인지 확인
    const items = page.locator('[data-testid="inventory-item"]');
    for (let i = 0; i < await items.count(); i++) {
      await expect(items.nth(i)).toContainText('강남역');
    }
  });

  test('광고 유형별로 필터링할 수 있다', async ({ page }) => {
    // 광고 유형 필터 선택
    await page.selectOption('select[name="adType"]', '포스터');
    
    // 필터링된 결과 확인
    await expect(page.locator('[data-testid="inventory-item"]')).toHaveCount.greaterThan(0);
    
    // 필터링된 인벤토리가 선택된 유형인지 확인
    const items = page.locator('[data-testid="inventory-item"]');
    for (let i = 0; i < await items.count(); i++) {
      await expect(items.nth(i)).toContainText('포스터');
    }
  });

  test('새로운 인벤토리를 추가할 수 있다', async ({ page }) => {
    // 인벤토리 추가 버튼 클릭
    await page.click('[data-testid="add-inventory"]');
    
    // 인벤토리 추가 모달 확인
    await expect(page.locator('[data-testid="add-inventory-modal"]')).toBeVisible();
    
    // 폼 필드 작성
    await page.selectOption('select[name="station"]', '강남역');
    await page.selectOption('select[name="adType"]', '디지털 사이니지');
    await page.fill('input[name="location"]', '1번 출구');
    await page.fill('input[name="size"]', 'A0');
    await page.fill('input[name="price"]', '3000000');
    await page.fill('input[name="stock"]', '5');
    
    // 저장 버튼 클릭
    await page.click('text=저장');
    
    // 성공 메시지 확인
    await expect(page.locator('text=인벤토리가 추가되었습니다')).toBeVisible();
    
    // 새로운 인벤토리가 목록에 추가되었는지 확인
    await expect(page.locator('text=강남역')).toBeVisible();
    await expect(page.locator('text=디지털 사이니지')).toBeVisible();
  });

  test('인벤토리 정보를 수정할 수 있다', async ({ page }) => {
    // 첫 번째 인벤토리 아이템 클릭
    await page.click('[data-testid="inventory-item"]').first();
    
    // 수정 버튼 클릭
    await page.click('[data-testid="edit-inventory"]');
    
    // 수정 모달 확인
    await expect(page.locator('[data-testid="edit-inventory-modal"]')).toBeVisible();
    
    // 가격 수정
    await page.fill('input[name="price"]', '3500000');
    
    // 저장 버튼 클릭
    await page.click('text=저장');
    
    // 성공 메시지 확인
    await expect(page.locator('text=인벤토리가 수정되었습니다')).toBeVisible();
    
    // 수정된 가격 확인
    await expect(page.locator('text=3,500,000원')).toBeVisible();
  });

  test('인벤토리 재고를 관리할 수 있다', async ({ page }) => {
    // 첫 번째 인벤토리 아이템 클릭
    await page.click('[data-testid="inventory-item"]').first();
    
    // 재고 관리 버튼 클릭
    await page.click('[data-testid="manage-stock"]');
    
    // 재고 관리 모달 확인
    await expect(page.locator('[data-testid="stock-modal"]')).toBeVisible();
    
    // 재고 추가
    await page.fill('input[name="quantity"]', '10');
    await page.selectOption('select[name="action"]', 'add');
    await page.click('text=적용');
    
    // 성공 메시지 확인
    await expect(page.locator('text=재고가 업데이트되었습니다')).toBeVisible();
    
    // 변경된 재고 확인
    await expect(page.locator('[data-testid="stock-quantity"]')).toContainText('15');
  });

  test('인벤토리를 삭제할 수 있다', async ({ page }) => {
    // 첫 번째 인벤토리 아이템 선택
    await page.click('[data-testid="inventory-item"]').first();
    
    // 삭제 버튼 클릭
    await page.click('[data-testid="delete-inventory"]');
    
    // 확인 모달에서 삭제 확인
    await expect(page.locator('[data-testid="confirm-delete-modal"]')).toBeVisible();
    await page.click('text=삭제');
    
    // 성공 메시지 확인
    await expect(page.locator('text=인벤토리가 삭제되었습니다')).toBeVisible();
  });

  test('인벤토리 통계를 확인할 수 있다', async ({ page }) => {
    // 통계 탭 클릭
    await page.click('[data-testid="inventory-stats-tab"]');
    
    // 통계 정보 확인
    await expect(page.locator('[data-testid="inventory-stats"]')).toBeVisible();
    
    // 차트 확인
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="occupancy-chart"]')).toBeVisible();
    
    // 기간 필터링
    await page.selectOption('select[name="period"]', 'month');
    
    // 필터링된 통계 확인
    await expect(page.locator('[data-testid="inventory-stats"]')).toBeVisible();
  });

  test('인벤토리를 예약할 수 있다', async ({ page }) => {
    // 첫 번째 인벤토리 아이템 클릭
    await page.click('[data-testid="inventory-item"]').first();
    
    // 예약 버튼 클릭
    await page.click('[data-testid="reserve-inventory"]');
    
    // 예약 모달 확인
    await expect(page.locator('[data-testid="reservation-modal"]')).toBeVisible();
    
    // 예약 정보 작성
    await page.selectOption('select[name="leadId"]', '1');
    await page.fill('input[name="startDate"]', '2024-02-01');
    await page.fill('input[name="endDate"]', '2024-02-28');
    await page.fill('textarea[name="notes"]', '2월 광고 예약');
    
    // 예약 버튼 클릭
    await page.click('text=예약');
    
    // 성공 메시지 확인
    await expect(page.locator('text=인벤토리가 예약되었습니다')).toBeVisible();
    
    // 예약 상태 확인
    await expect(page.locator('[data-testid="reservation-status"]')).toContainText('예약됨');
  });

  test('인벤토리 데이터를 내보낼 수 있다', async ({ page }) => {
    // 내보내기 버튼 클릭
    await page.click('[data-testid="export-inventory"]');
    
    // 내보내기 옵션 선택
    await page.selectOption('select[name="format"]', 'excel');
    await page.check('input[name="includeReservations"]');
    
    // 내보내기 버튼 클릭
    await page.click('text=내보내기');
    
    // 다운로드 시작 확인
    const downloadPromise = page.waitForEvent('download');
    await downloadPromise;
  });
});
