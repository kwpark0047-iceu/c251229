/**
 * CRM 기능 E2E 테스트
 * 통화 기록, 제안서 생성, 영업 진행상황 관리 테스트
 */

import { test, expect } from '@playwright/test';

test.describe('CRM 기능', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/lead-manager');
  });

  test('통화 기록을 추가할 수 있다', async ({ page }) => {
    // 첫 번째 리드 선택
    await page.click('[data-testid="lead-card"]').first();
    
    // 통화 기록 탭 클릭
    await page.click('[data-testid="call-logs-tab"]');
    
    // 통화 기록 추가 버튼 클릭
    await page.click('[data-testid="add-call-log"]');
    
    // 통화 기록 폼 작성
    await page.selectOption('select[name="callType"]', 'INCOMING');
    await page.fill('input[name="duration"]', '300');
    await page.fill('textarea[name="summary"]', '초기 상담 진행');
    await page.fill('textarea[name="nextAction"]', '제안서 발송 예정');
    
    // 저장 버튼 클릭
    await page.click('text=저장');
    
    // 성공 메시지 확인
    await expect(page.locator('text=통화 기록이 추가되었습니다')).toBeVisible();
    
    // 추가된 통화 기록 확인
    await expect(page.locator('text=초기 상담 진행')).toBeVisible();
  });

  test('제안서를 생성할 수 있다', async ({ page }) => {
    // 첫 번째 리드 선택
    await page.click('[data-testid="lead-card"]').first();
    
    // 제안서 생성 버튼 클릭
    await page.click('[data-testid="create-proposal"]');
    
    // 제안서 생성 모달 확인
    await expect(page.locator('[data-testid="proposal-modal"]')).toBeVisible();
    
    // 제안서 내용 작성
    await page.fill('input[name="title"]', '강남역 광고 제안서');
    await page.selectOption('select[name="adType"]', '포스터');
    await page.fill('input[name="duration"]', '3');
    await page.fill('input[name="price"]', '5000000');
    await page.fill('textarea[name="description"]', '효과적인 광고 솔루션을 제안합니다...');
    
    // AI 제안서 생성 버튼 클릭
    await page.click('[data-testid="ai-generate"]');
    
    // AI 생성 확인
    await expect(page.locator('[data-testid="ai-loading"]')).toBeVisible();
    
    // AI 생성 완료 확인
    await expect(page.locator('text=AI 제안서 생성이 완료되었습니다')).toBeVisible({ timeout: 10000 });
    
    // 제안서 저장
    await page.click('text=제안서 저장');
    
    // 성공 메시지 확인
    await expect(page.locator('text=제안서가 생성되었습니다')).toBeVisible();
  });

  test('제안서를 이메일로 발송할 수 있다', async ({ page }) => {
    // 첫 번째 리드 선택
    await page.click('[data-testid="lead-card"]').first();
    
    // 제안서 탭 클릭
    await page.click('[data-testid="proposals-tab"]');
    
    // 첫 번째 제안서 선택
    await page.click('[data-testid="proposal-item"]').first();
    
    // 이메일 발송 버튼 클릭
    await page.click('[data-testid="send-email"]');
    
    // 이메일 발송 모달 확인
    await expect(page.locator('[data-testid="email-modal"]')).toBeVisible();
    
    // 이메일 정보 작성
    await page.fill('input[name="to"]', 'client@example.com');
    await page.fill('input[name="subject"]', '광고 제안서 드립니다');
    await page.selectOption('select[name="template"]', 'standard');
    
    // 발송 버튼 클릭
    await page.click('text=발송');
    
    // 성공 메시지 확인
    await expect(page.locator('text=이메일이 발송되었습니다')).toBeVisible();
  });

  test('영업 진행상황을 관리할 수 있다', async ({ page }) => {
    // 첫 번째 리드 선택
    await page.click('[data-testid="lead-card"]').first();
    
    // 진행상황 탭 클릭
    await page.click('[data-testid="progress-tab"]');
    
    // 진행상황 확인
    await expect(page.locator('[data-testid="progress-steps"]')).toBeVisible();
    
    // 진행 단계 완료 처리
    await page.click('[data-testid="step-initial-contact"]');
    await page.click('[data-testid="complete-step"]');
    
    // 완료 확인
    await expect(page.locator('text=진행단계가 완료되었습니다')).toBeVisible();
    
    // 완료된 단계 확인
    await expect(page.locator('[data-testid="step-initial-contact"]')).toHaveClass(/completed/);
  });

  test('일정을 관리할 수 있다', async ({ page }) => {
    // 스케줄 탭 클릭
    await page.click('[data-testid="schedule-tab"]');
    
    // 캘린더 뷰 확인
    await expect(page.locator('[data-testid="calendar"]')).toBeVisible();
    
    // 일정 추가 버튼 클릭
    await page.click('[data-testid="add-task"]');
    
    // 일정 추가 모달 확인
    await expect(page.locator('[data-testid="task-modal"]')).toBeVisible();
    
    // 일정 정보 작성
    await page.fill('input[name="title"]', '고객 미팅');
    await page.selectOption('select[name="type"]', 'MEETING');
    await page.fill('input[name="date"]', '2024-01-20');
    await page.fill('input[name="time"]', '14:00');
    await page.fill('textarea[name="description"]', '제안서 협의 미팅');
    
    // 저장 버튼 클릭
    await page.click('text=저장');
    
    // 성공 메시지 확인
    await expect(page.locator('text=일정이 추가되었습니다')).toBeVisible();
    
    // 캘린더에 일정 표시 확인
    await expect(page.locator('text=고객 미팅')).toBeVisible();
  });

  test('태스크 보드에서 작업을 관리할 수 있다', async ({ page }) => {
    // 스케줄 탭 클릭
    await page.click('[data-testid="schedule-tab"]');
    
    // 보드 뷰 버튼 클릭
    await page.click('[data-testid="view-board"]');
    
    // 태스크 보드 확인
    await expect(page.locator('[data-testid="task-board"]')).toBeVisible();
    
    // 컬럼 확인 (할 일, 진행 중, 완료)
    await expect(page.locator('[data-testid="column-todo"]')).toBeVisible();
    await expect(page.locator('[data-testid="column-in-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="column-done"]')).toBeVisible();
    
    // 할 일 컬럼의 첫 번째 태스크 드래그
    const task = page.locator('[data-testid="column-todo"] [data-testid="task-card"]').first();
    const inProgressColumn = page.locator('[data-testid="column-in-progress"]');
    
    await task.dragTo(inProgressColumn);
    
    // 상태 변경 확인
    await expect(task.locator('[data-testid="task-status"]')).toContainText('진행 중');
  });

  test('CRM 통계를 확인할 수 있다', async ({ page }) => {
    // 통계 탭 클릭
    await page.click('[data-testid="stats-tab"]');
    
    // CRM 통계 확인
    await expect(page.locator('[data-testid="crm-stats"]')).toBeVisible();
    
    // 통계 차트 확인
    await expect(page.locator('[data-testid="call-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="proposal-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-chart"]')).toBeVisible();
    
    // 기간 필터링
    await page.selectOption('select[name="period"]', 'month');
    
    // 필터링된 통계 확인
    await expect(page.locator('[data-testid="crm-stats"]')).toBeVisible();
  });
});
