import { test, expect } from '@playwright/test';

test.describe('Final Admin Notification Integration Test', () => {
  const adminEmail = 'admin_tester_1776148931438@example.com';
  const newUserEmail = `new_reg_${Date.now()}@example.com`;
  const password = 'Password123!';

  test('admin should receive real-time notification when a new user signs up', async ({ browser }) => {
    // webkit 계열은 JS 실행이 느려 하이드레이션 대기 + 전체 플로우가 기본 30s 타임아웃을 초과함
    test.setTimeout(90000);
    // 1. 관리자용 브라우저 세션 (알림 관찰자)
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    
    await adminPage.goto('http://localhost:3000/auth');
    
    // 하이드레이션 대기: load 시점엔 카드가 opacity-0(서버 HTML)이고 mounted 이후에만 animate-fade-in-up이 붙음.
    // 하이드레이션 전 submit 클릭 시 onSubmit 미부착 → 네이티브 폼 제출(리로드)로 로그인 실패 (webkit 계열에서 재현).
    await expect(adminPage.locator('div.max-w-\\[440px\\]')).toHaveClass(/animate-fade-in-up/, { timeout: 15000 });
    
    // 이메일과 비밀번호 입력 (실제 placeholder 반영)
    await adminPage.fill('input[placeholder="example@email.com"]', adminEmail);
    await adminPage.fill('input[placeholder="••••••••"]', password);
    
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
    
    // SuperAdminDashboard 로드 확인 (관리자 탭 내 대시보드 헤딩/상태 문구)
    await expect(adminPage.locator('text=System Core Integrity Active')).toBeVisible({ timeout: 15000 });
    console.log('Super Admin Dashboard loaded and monitoring.');

    // 2. 신규 사용자용 브라우저 세션 (가입 수행자)
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    
    console.log('--- Registering New User ---');
    await userPage.goto('http://localhost:3000/auth');
    
    // 하이드레이션 완료 대기 (회원가입 탭/폼은 mounted 이후에만 렌더링됨 — 위 관리자 로그인과 동일한 이유)
    await expect(userPage.locator('div.max-w-\\[440px\\]')).toHaveClass(/animate-fade-in-up/, { timeout: 15000 });
    
    // 회원가입 탭 클릭
    await userPage.click('button:has-text("회원가입")');
    
    // 가입 폼 입력 (실제 placeholder 반영)
    await userPage.fill('input[placeholder="실명을 입력해 주세요"]', 'New Registrant');
    // 회원가입 폼의 이메일 input은 placeholder가 동일함
    await userPage.fill('form:has-text("회원가입 확인") input[placeholder="example@email.com"]', newUserEmail);
    await userPage.fill('input[placeholder="6자 이상"]', password);
    await userPage.fill('input[placeholder="비밀번호 재입력"]', password);
    
    // 가입 버튼 클릭
    // force: 가입 버튼에 animate-float-subtle(무한 float 애니메이션)이 적용되어
    // Playwright의 안정성(2 연속 프레임 bounding box 동일) 검사가 영원히 통과하지 못함.
    // 버튼은 가시·활성 상태이므로 force 클릭으로 actionability 검사를 우회해도 기능상 안전.
    await userPage.click('button:has-text("회원가입 확인")', { force: true });
    
    // 가입 완료 화면 대기 ("신청 완료" 메시지)
    await expect(userPage.locator('text=신청 완료')).toBeVisible({ timeout: 10000 });
    console.log(`New user (${newUserEmail}) signed up successfully.`);

    // 3. 관리자 페이지에서 실시간 토스트 알림 확인
    console.log('--- Verifying Real-time Notification ---');
    
    // "신규 회원가입 발생" 텍스트가 포함된 토스트 대기
    const toast = adminPage.locator('text=신규 회원가입 발생');
    await expect(toast).toBeVisible({ timeout: 15000 });
    
    // 토스트 내부에 이메일 정보가 포함되어 있는지 확인
    // text= 로케이터는 대시보드 테이블 셀과 중복 매칭되어 strict mode 위반 → 토스트 전용 span.text-emerald-300으로 스코프 (Mobile Safari 재현)
    const toastEmail = adminPage.locator('div.fixed.z-\\[100\\] span.text-emerald-300', { hasText: newUserEmail });
    await expect(toastEmail).toBeVisible();
    
    console.log('SUCCESS: Admin received the floating toast notification!');

    // 4. 알림 센터 목록 확인
    // unreadCount>0이면 벨 아이콘에 animate-bounce(무한)가 붙어 bounding box가 계속 변동 → actionability(stable) 영구 실패 (webkit 재현).
    // 가입 확인 버튼과 동일한 force 클릭 패턴 사용 (코드베이스 기존 관례).
    await adminPage.click('button[aria-label="시스템 알림"]', { force: true });
    // 알림 리스트에 해당 메시지가 표시되는지 확인
    await expect(adminPage.locator(`text=${newUserEmail} 사용자가 새롭게 가입했습니다.`)).toBeVisible();
    console.log('SUCCESS: Notification is also visible in the notification list.');
  });
});
