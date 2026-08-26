# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: final_integration.spec.ts >> Final Admin Notification Integration Test >> admin should receive real-time notification when a new user signs up
- Location: tests/e2e/final_integration.spec.ts:8:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /.*lead-manager/
Received string:  "http://localhost:3000/auth"
Timeout: 15000ms

Call log:
  - Expect "toHaveURL" with timeout 15000ms
    12 × locator resolved to <html lang="ko" data-theme="light">…</html>
       - unexpected value "http://localhost:3000/auth"
    - waiting for "http://localhost:3000/lead-manager" navigation to finish...

```

```yaml
- img
- img
- heading "지하철 광고 영업" [level=1]
- paragraph: SEOUL METRO ADVERTISING PLATFORM
- button "로그인"
- button "회원가입"
- button "조직 가입"
- text: 이메일
- textbox "이메일":
  - /placeholder: example@email.com
  - text: admin_tester_1776148931438@example.com
- text: 비밀번호
- textbox "비밀번호":
  - /placeholder: ••••••••
  - text: Password123!
- button "로그인 중..." [disabled]:
  - img
  - text: 로그인 중...
- text: 1 2 3 4 5
- paragraph: Seoul Metro Lead Management System
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Final Admin Notification Integration Test', () => {
  4  |   const adminEmail = 'admin_tester_1776148931438@example.com';
  5  |   const newUserEmail = `new_reg_${Date.now()}@example.com`;
  6  |   const password = 'Password123!';
  7  | 
  8  |   test('admin should receive real-time notification when a new user signs up', async ({ browser }) => {
  9  |     // webkit 계열은 JS 실행이 느려 하이드레이션 대기 + 전체 플로우가 기본 30s 타임아웃을 초과함
  10 |     test.setTimeout(90000);
  11 |     // 1. 관리자용 브라우저 세션 (알림 관찰자)
  12 |     const adminContext = await browser.newContext();
  13 |     const adminPage = await adminContext.newPage();
  14 |     
  15 |     await adminPage.goto('http://localhost:3000/auth');
  16 |     
  17 |     // 하이드레이션 대기: load 시점엔 카드가 opacity-0(서버 HTML)이고 mounted 이후에만 animate-fade-in-up이 붙음.
  18 |     // 하이드레이션 전 submit 클릭 시 onSubmit 미부착 → 네이티브 폼 제출(리로드)로 로그인 실패 (webkit 계열에서 재현).
  19 |     await expect(adminPage.locator('div.max-w-\\[440px\\]')).toHaveClass(/animate-fade-in-up/, { timeout: 15000 });
  20 |     
  21 |     // 이메일과 비밀번호 입력 (실제 placeholder 반영)
  22 |     await adminPage.fill('input[placeholder="example@email.com"]', adminEmail);
  23 |     await adminPage.fill('input[placeholder="••••••••"]', password);
  24 |     
  25 |     // 로그인 제출 버튼 클릭 (탭 버튼과 구분을 위해 type="submit" 사용)
  26 |     console.log('Clicking login submit button...');
  27 |     await adminPage.click('form button[type="submit"]:has-text("로그인")');    
  28 |     // 대시보드 진입 확인
> 29 |     await expect(adminPage).toHaveURL(/.*lead-manager/, { timeout: 15000 });
     |                             ^ Error: expect(page).toHaveURL(expected) failed
  30 |     console.log('Admin logged in.');
  31 | 
  32 |     // 관리자 탭으로 이동 (Shield 아이콘 또는 "관리" 텍스트 클릭)
  33 |     console.log('Switching to Admin tab...');
  34 |     const adminTab = adminPage.locator('button:has-text("관리")');
  35 |     await adminTab.click();
  36 |     
  37 |     // SuperAdminDashboard 로드 확인 (관리자 탭 내 대시보드 헤딩/상태 문구)
  38 |     await expect(adminPage.locator('text=System Core Integrity Active')).toBeVisible({ timeout: 15000 });
  39 |     console.log('Super Admin Dashboard loaded and monitoring.');
  40 | 
  41 |     // 2. 신규 사용자용 브라우저 세션 (가입 수행자)
  42 |     const userContext = await browser.newContext();
  43 |     const userPage = await userContext.newPage();
  44 |     
  45 |     console.log('--- Registering New User ---');
  46 |     await userPage.goto('http://localhost:3000/auth');
  47 |     
  48 |     // 하이드레이션 완료 대기 (회원가입 탭/폼은 mounted 이후에만 렌더링됨 — 위 관리자 로그인과 동일한 이유)
  49 |     await expect(userPage.locator('div.max-w-\\[440px\\]')).toHaveClass(/animate-fade-in-up/, { timeout: 15000 });
  50 |     
  51 |     // 회원가입 탭 클릭
  52 |     await userPage.click('button:has-text("회원가입")');
  53 |     
  54 |     // 가입 폼 입력 (실제 placeholder 반영)
  55 |     await userPage.fill('input[placeholder="실명을 입력해 주세요"]', 'New Registrant');
  56 |     // 회원가입 폼의 이메일 input은 placeholder가 동일함
  57 |     await userPage.fill('form:has-text("회원가입 확인") input[placeholder="example@email.com"]', newUserEmail);
  58 |     await userPage.fill('input[placeholder="6자 이상"]', password);
  59 |     await userPage.fill('input[placeholder="비밀번호 재입력"]', password);
  60 |     
  61 |     // 가입 버튼 클릭
  62 |     // force: 가입 버튼에 animate-float-subtle(무한 float 애니메이션)이 적용되어
  63 |     // Playwright의 안정성(2 연속 프레임 bounding box 동일) 검사가 영원히 통과하지 못함.
  64 |     // 버튼은 가시·활성 상태이므로 force 클릭으로 actionability 검사를 우회해도 기능상 안전.
  65 |     await userPage.click('button:has-text("회원가입 확인")', { force: true });
  66 |     
  67 |     // 가입 완료 화면 대기 ("신청 완료" 메시지)
  68 |     await expect(userPage.locator('text=신청 완료')).toBeVisible({ timeout: 10000 });
  69 |     console.log(`New user (${newUserEmail}) signed up successfully.`);
  70 | 
  71 |     // 3. 관리자 페이지에서 실시간 토스트 알림 확인
  72 |     console.log('--- Verifying Real-time Notification ---');
  73 |     
  74 |     // "신규 회원가입 발생" 텍스트가 포함된 토스트 대기
  75 |     const toast = adminPage.locator('text=신규 회원가입 발생');
  76 |     await expect(toast).toBeVisible({ timeout: 15000 });
  77 |     
  78 |     // 토스트 내부에 이메일 정보가 포함되어 있는지 확인
  79 |     // text= 로케이터는 대시보드 테이블 셀과 중복 매칭되어 strict mode 위반 → 토스트 전용 span.text-emerald-300으로 스코프 (Mobile Safari 재현)
  80 |     const toastEmail = adminPage.locator('div.fixed.z-\\[100\\] span.text-emerald-300', { hasText: newUserEmail });
  81 |     await expect(toastEmail).toBeVisible();
  82 |     
  83 |     console.log('SUCCESS: Admin received the floating toast notification!');
  84 | 
  85 |     // 4. 알림 센터 목록 확인
  86 |     // unreadCount>0이면 벨 아이콘에 animate-bounce(무한)가 붙어 bounding box가 계속 변동 → actionability(stable) 영구 실패 (webkit 재현).
  87 |     // 가입 확인 버튼과 동일한 force 클릭 패턴 사용 (코드베이스 기존 관례).
  88 |     await adminPage.click('button[aria-label="시스템 알림"]', { force: true });
  89 |     // 알림 리스트에 해당 메시지가 표시되는지 확인
  90 |     await expect(adminPage.locator(`text=${newUserEmail} 사용자가 새롭게 가입했습니다.`)).toBeVisible();
  91 |     console.log('SUCCESS: Notification is also visible in the notification list.');
  92 |   });
  93 | });
  94 | 
```