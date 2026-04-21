import { test, expect } from '@playwright/test';

test.describe('Auth and Notification Integration Test', () => {
  const adminEmail = `admin_tester_${Date.now()}@example.com`;
  const newUserEmail = `new_member_${Date.now()}@example.com`;
  const password = 'Password123!';

  test('should sign up, promote to admin, login, and receive real-time signup notification', async ({ browser }) => {
    // 1. 관리자용 계정 가입 (이후 SQL로 승격 예정)
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    
    console.log('--- Step 1: Admin User Signup ---');
    await adminPage.goto('http://localhost:3000/auth');
    
    // 회원가입 탭으로 전환 (텍스트로 버튼 찾기)
    await adminPage.click('button:has-text("회원가입")');
    
    await adminPage.fill('input[placeholder="이메일을 입력하세요"]', adminEmail);
    await adminPage.fill('input[placeholder="비밀번호를 입력하세요"]', password);
    await adminPage.fill('input[placeholder="성함을 입력하세요"]', 'Admin Tester');
    
    await adminPage.click('button:has-text("회원가입")');
    
    // 성공 화면 대기
    await expect(adminPage.locator('text=회원가입을 환영합니다')).toBeVisible({ timeout: 10000 });
    console.log('Admin signup success.');
    
    // 로그인 페이지로 복귀
    await adminPage.click('button:has-text("확인")');
    await expect(adminPage.locator('text=환영합니다')).toBeVisible();

    // 2. DB에서 이 계정을 Super Admin으로 승격 (외부 SQL 실행 필요)
    // 이 단계는 테스트 스크립트 실행 직후 또는 병렬로 Antigravity가 SQL을 쏴줘야 함.
    // 여기서는 수동 로그인이 가능하도록 대기
    console.log(`--- Step 2: PLEASE PROMOTE ${adminEmail} TO SUPER ADMIN NOW ---`);
    
    // 3. 관리자 로그인
    await adminPage.fill('input[placeholder="이메일을 입력하세요"]', adminEmail);
    await adminPage.fill('input[placeholder="비밀번호를 입력하세요"]', password);
    await adminPage.click('button:has-text("로그인")');
    
    // 대시보드 진입 확인
    await expect(adminPage.locator('text=Master Auth')).toBeVisible({ timeout: 15000 });
    console.log('Admin logged into dashboard.');

    // 4. 새로운 브라우저 컨텍스트로 신규 회원 가입 진행
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    
    console.log('--- Step 3: New User Signup ---');
    await userPage.goto('http://localhost:3000/auth');
    await userPage.click('button:has-text("회원가입")');
    await userPage.fill('input[placeholder="이메일을 입력하세요"]', newUserEmail);
    await userPage.fill('input[placeholder="비밀번호를 입력하세요"]', password);
    await userPage.fill('input[placeholder="성함을 입력하세요"]', 'New Member');
    await userPage.click('button:has-text("회원가입")');
    
    await expect(userPage.locator('text=회원가입을 환영합니다')).toBeVisible({ timeout: 10000 });
    console.log('New user signup sequence triggered.');

    // 5. 관리자 페이지에서 실시간 토스트 알림 확인
    console.log('--- Step 4: Verifying Real-time Notification on Admin Dashboard ---');
    
    // 토스트 메시지 확인 (알림 종 아이콘 뱃지나 토스트 팝업 텍스트)
    const toast = adminPage.locator('text=신규 회원가입 발생');
    await expect(toast).toBeVisible({ timeout: 10000 });
    
    const emailInToast = adminPage.locator(`text=${newUserEmail}`);
    await expect(emailInToast).toBeVisible();
    
    console.log('PASSED: Real-time notification received on admin dashboard!');

    // 6. 알림 센터 상세 확인
    await adminPage.click('button[aria-label="시스템 알림"]');
    await expect(adminPage.locator(`text=${newUserEmail} 사용자가 새롭게 합류했습니다.`)).toBeVisible();
    console.log('PASSED: Notification verified in the notification list.');
  });
});
