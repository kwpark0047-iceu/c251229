/**
 * 리드 관리 E2E 테스트
 * 리드 CRUD, 검색, 필터링, 상태 변경 기능 테스트
 */

import { test, expect } from '@playwright/test';

test.describe('리드 관리', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/lead-manager');
  });

  test('리드 목록이 표시된다', async ({ page }) => {
    // 그리드 뷰 확인
    await expect(page.locator('[data-testid="lead-grid"]')).toBeVisible();
    
    // 리드 카드 확인
    await expect(page.locator('[data-testid="lead-card"]')).toHaveCount.greaterThan(0);
    
    // 상태별 통계 확인
    await expect(page.locator('[data-testid="stats-bar"]')).toBeVisible();
  });

  test('리드를 검색할 수 있다', async ({ page }) => {
    // 검색 입력 필드에 텍스트 입력
    await page.fill('input[placeholder="사업장명 검색..."]', '테스트');
    
    // 검색 결과 확인
    await expect(page.locator('[data-testid="lead-card"]')).toHaveCount.greaterThan(0);
    
    // 검색된 리드에 검색어가 포함되어 있는지 확인
    const firstCard = page.locator('[data-testid="lead-card"]').first();
    await expect(firstCard).toContainText('테스트');
  });

  test('리드 상태별로 필터링할 수 있다', async ({ page }) => {
    // 통계 바의 신규 상태 클릭
    await page.click('[data-testid="status-new"]');
    
    // 필터링된 결과 확인
    await expect(page.locator('[data-testid="lead-card"]')).toHaveCount.greaterThan(0);
    
    // 필터링된 리드들이 신규 상태인지 확인
    const statusBadges = page.locator('[data-testid="lead-status-badge"]');
    for (let i = 0; i < await statusBadges.count(); i++) {
      await expect(statusBadges.nth(i)).toContainText('신규');
    }
  });

  test('뷰 모드를 전환할 수 있다', async ({ page }) => {
    // 리스트 뷰 버튼 클릭
    await page.click('[data-testid="view-list"]');
    
    // 리스트 뷰 확인
    await expect(page.locator('[data-testid="lead-table"]')).toBeVisible();
    
    // 지도 뷰 버튼 클릭
    await page.click('[data-testid="view-map"]');
    
    // 지도 뷰 확인
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible();
  });

  test('리드 상세 정보를 확인할 수 있다', async ({ page }) => {
    // 첫 번째 리드 카드 클릭
    await page.click('[data-testid="lead-card"]').first();
    
    // 리드 상세 모달 확인
    await expect(page.locator('[data-testid="lead-detail-modal"]')).toBeVisible();
    
    // 상세 정보 확인
    await expect(page.locator('[data-testid="lead-biz-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="lead-address"]')).toBeVisible();
    await expect(page.locator('[data-testid="lead-phone"]')).toBeVisible();
  });

  test('리드 상태를 변경할 수 있다', async ({ page }) => {
    // 첫 번째 리드 카드 클릭
    await page.click('[data-testid="lead-card"]').first();
    
    // 상태 변경 드롭다운 클릭
    await page.click('[data-testid="status-dropdown"]');
    
    // '제안서 발송' 선택
    await page.click('text=제안서 발송');
    
    // 확인 버튼 클릭
    await page.click('text=확인');
    
    // 상태 변경 확인
    await expect(page.locator('text=상태가 변경되었습니다')).toBeVisible();
    
    // 모달 닫기
    await page.click('[data-testid="close-modal"]');
    
    // 변경된 상태 확인
    const firstCard = page.locator('[data-testid="lead-card"]').first();
    await expect(firstCard.locator('[data-testid="lead-status-badge"]')).toContainText('제안서 발송');
  });

  test('새로운 리드를 추가할 수 있다', async ({ page }) => {
    // 리드 추가 버튼 클릭
    await page.click('[data-testid="add-lead"]');
    
    // 리드 추가 모달 확인
    await expect(page.locator('[data-testid="add-lead-modal"]')).toBeVisible();
    
    // 폼 필드 작성
    await page.fill('input[name="bizName"]', '새로운 테스트 상점');
    await page.fill('input[name="roadAddress"]', '서울시 강남구 테헤란로 999');
    await page.fill('input[name="bizType"]', '카페');
    await page.fill('input[name="phoneNumber"]', '02-1234-5678');
    
    // 저장 버튼 클릭
    await page.click('text=저장');
    
    // 성공 메시지 확인
    await expect(page.locator('text=리드가 추가되었습니다')).toBeVisible();
    
    // 새로운 리드가 목록에 추가되었는지 확인
    await expect(page.locator('text=새로운 테스트 상점')).toBeVisible();
  });

  test('리드를 삭제할 수 있다', async ({ page }) => {
    // 첫 번째 리드 카드 선택
    await page.click('[data-testid="lead-card"]').first();
    
    // 삭제 버튼 클릭
    await page.click('[data-testid="delete-lead"]');
    
    // 확인 모달에서 삭제 확인
    await expect(page.locator('[data-testid="confirm-delete-modal"]')).toBeVisible();
    await page.click('text=삭제');
    
    // 성공 메시지 확인
    await expect(page.locator('text=리드가 삭제되었습니다')).toBeVisible();
  });

  test('대량 리드를 가져올 수 있다', async ({ page }) => {
    // 데이터 가져오기 버튼 클릭
    await page.click('[data-testid="fetch-leads"]');
    
    // 가져오기 모달 확인
    await expect(page.locator('[data-testid="fetch-modal"]')).toBeVisible();
    
    // 업종 선택
    await page.selectOption('select[name="category"]', 'FOOD');
    
    // 지역 선택
    await page.selectOption('select[name="region"]', '서울');
    
    // 가져오기 버튼 클릭
    await page.click('text=데이터 가져오기');
    
    // 진행 상황 표시 확인
    await expect(page.locator('[data-testid="fetch-progress"]')).toBeVisible();
    
    // 완료 메시지 확인 (시간이 걸릴 수 있음)
    await expect(page.locator('text=데이터 가져오기가 완료되었습니다')).toBeVisible({ timeout: 30000 });
  });

  test('데이터를 내보낼 수 있다', async ({ page }) => {
    // 내보내기 버튼 클릭
    await page.click('[data-testid="export-data"]');
    
    // 내보내기 옵션 선택
    await page.selectOption('select[name="format"]', 'excel');
    
    // 내보내기 버튼 클릭
    await page.click('text=내보내기');
    
    // 다운로드 시작 확인
    const downloadPromise = page.waitForEvent('download');
    await downloadPromise;
  });
});
