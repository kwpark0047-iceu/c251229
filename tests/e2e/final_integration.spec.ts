import { test, expect } from '@playwright/test';

test.describe('Final Admin Notification Integration Test', () => {
  const adminEmail = 'admin_tester_1776148931438@example.com';
  const newUserEmail = `new_reg_${Date.now()}@example.com`;
  const password = 'Password123!';

  test('admin should receive real-time notification when a new user signs up', async ({ browser }) => {
    // 1. 관리자용 브라우저 세션 (알림 관찰자)
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    
    console.log('--- Navigating to Login as Admin ---');
    adminPage.on('console', msg => console.log('ADMIN PAGE CONSOLE:', msg.text()));
    await adminPage.goto('http://localhost:3000/auth');
    
    // 이메일과 비밀번호 입력 (실제 placeholder 반영)
    await adminPage.waitForSelector('input[placeholder="example@email.com"]');
    await adminPage.fill('input[placeholder="example@email.com"]', adminEmail);
    await adminPage.fill('input[placeholder="••••••••"]', password);
    
    // 약간의 대기 후 클릭 (애니메이션 대기)
    await adminPage.waitForTimeout(1000);
    
    // 로그인 제출 버튼 클릭 (탭 버튼과 구분을 위해 type="submit" 사용)
    console.log('Clicking login submit button...');
    await adminPage.click('form button[type="submit"]:has-text("로그인")');
    
    // 대시보드 진입 확인
    await expect(adminPage).toHaveURL(/.*lead-manager/, { timeout: 15000 });
    console.log('Admin logged in.');

    // 관리자 탭으로 이동 (Shield 아이콘 또는 "관리" 텍스트 클릭)
    console.log('Switching to Admin tab...');
    const adminTab = adminPage.locator('button:has-text("관리")');
    await adminTab.click();
    
    // Master Auth 텍스트 대기 (SuperAdminDashboard 로드 확인)
    await expect(adminPage.locator('text=Master Auth')).toBeVisible({ timeout: 15000 });
    console.log('Super Admin Dashboard loaded and monitoring.');

    // 2. 신규 사용자용 브라우저 세션 (가입 수행자)
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    
    console.log('--- Registering New User ---');
    await userPage.goto('http://localhost:3000/auth');
    
    // 회원가입 탭 클릭
    await userPage.click('button:has-text("회원가입")');
    
    // 가입 폼 입력 (실제 placeholder 반영)
    await userPage.fill('input[placeholder="실명을 입력해 주세요"]', 'New Registrant');
    // 회원가입 폼의 이메일 input은 placeholder가 동일함
    await userPage.fill('form:has-text("회원가입 확인") input[placeholder="example@email.com"]', newUserEmail);
    await userPage.fill('input[placeholder="6자 이상"]', password);
    await userPage.fill('input[placeholder="비밀번호 재입력"]', password);
    
    // 가입 버튼 클릭
    await userPage.click('button:has-text("회원가입 확인")');
    
    // 가입 완료 화면 대기 ("신청 완료" 메시지)
    await expect(userPage.locator('text=신청 완료')).toBeVisible({ timeout: 10000 });
    console.log(`New user (${newUserEmail}) signed up successfully.`);

    // 3. 관리자 페이지에서 실시간 토스트 알림 확인
    console.log('--- Verifying Real-time Notification ---');
    
    // "신규 회원가입 발생" 텍스트가 포함된 토스트 대기
    const toast = adminPage.locator('text=신규 회원가입 발생');
    await expect(toast).toBeVisible({ timeout: 15000 });
    
    // 토스트 내부에 이메일 정보가 포함되어 있는지 확인
    await expect(adminPage.locator(`text=${newUserEmail}`)).toBeVisible();
    
    console.log('SUCCESS: Admin received the floating toast notification!');

    // 4. 알림 센터 목록 확인
    await adminPage.click('button[aria-label="시스템 알림"]');
    // 알림 리스트에 해당 메시지가 표시되는지 확인
    await expect(adminPage.locator(`text=${newUserEmail} 사용자가 새롭게 합류했습니다.`)).toBeVisible();
    console.log('SUCCESS: Notification is also visible in the notification list.');
  });
});
