# 단계별 반영 현황 및 운영 호환성 경계

## 적용 단위
1. 로컬 도구·CI: release-readiness 게이트, 소스 인벤토리, DB 테스트 누락 차단. 운영 코드와 분리한다.
2. UI: page.tsx, GridView.tsx, lead-actions.module.css. 헤더 자연 높이와 카드 버튼 줄바꿈·최소 터치 영역 수정. 단, 전체 작업 폴더에는 계정 기능이 포함되므로 전체 폴더 일괄 배포는 금지한다.
3. 백업·테마: 독립 회귀 검증 후 별도 후보로 묶는다.
4. 회원 보관·권한: 운영 스키마 호환성 검토와 명시적 적용 승인 후에만 반영한다.

## 회원 보관 기능의 필수 계약
- profiles: account_status(PENDING/ACTIVE/SUSPENDED/ARCHIVED), archived_at, archived_by, archived_reason.
- organization_members: is_active.
- RPC: transition_member_archive 및 can_access_app/can_access_organization 등 권한 함수.
- 조직·업무·Storage의 RLS와 기존 승인 이력 함수/트리거의 상호작용.
- 기존 SECURITY DEFINER 뷰/함수, 역할별 grants, 마지막 조직 관리자 보호, 동시 승인/보관 경쟁을 운영 구조에 맞춰 검토해야 한다.
- 보관 복원은 SUSPENDED이며 자동 승인·조직 권한 복구·메일 발송이 아니다.

이 목록은 소스 기반 계약 목록이며 운영 스키마 확인 결과가 아니다. 이번 작업은 운영 연결이나 마이그레이션 실행을 하지 않는다.

## 검증 증거의 의미
- scripts/source-snapshot.mjs: 비밀값을 제외한 배포 대상 경로와 해시, 배포 성공 증명 아님.
- scripts/release-readiness.mjs: 현재 해시와 순차 파이프라인 영수증의 일치 검사. 서명/신뢰 실행기 검증은 아니며 운영 배포/브라우저 E2E 성공을 주장하지 않는다.
- scripts/lead-layout.browser.mjs: 실제 CSS를 네트워크 차단 합성 화면에서 폭 220/280/360/680, 확대 100%/200%로 검사. 실제 앱의 인증·상단 헤더·버튼 API 동작 검증을 대신하지 않는다.
- 과거 검증 영수증은 최신 UI 소스 해시와 달라 readiness 게이트에서 거부됨을 확인했다.
- 원래 release/baseline.json은 변경하지 않았다.

## 실행 방법
```powershell
node scripts/source-snapshot.mjs . tmp/security-patch-20261022
node --test scripts/release-readiness.test.mjs scripts/lead-layout.test.mjs
node scripts/release-readiness.mjs . .local-state/release-20261022/staged-results.json
# 설치된 Playwright 브라우저가 기본 리비전과 다르면, 신뢰한 로컬 실행 파일만 지정한다.
$env:LAYOUT_BROWSER_EXECUTABLE='설치된 Chromium 실행 파일의 절대 경로'
node scripts/lead-layout.browser.mjs
```

## 남은 단계
전체 파이프라인 완료 후 아래 결과를 갱신한다. 실제 애플리케이션 브라우저 E2E, 운영 스키마 확인·적용, 단계별 운영 배포는 별도 미완료다. 운영 DB·계정·메일과 cron=[]는 변경하지 않는다.

## 최종 결과
- 소스 해시: ee79ee104d08934f36a67a6dd8db9547c9038400218e0ac90fd5c2f822c88d3c.
- type-check → lint → 격리 DB 포함 test → build 모두 종료 코드 0.
- Vitest 548건 통과, 실패/건너뜀 0건. 필수 DB 2개 스위트 20건 모두 실행·통과.
- 로컬 도구 48건 통과(신규 readiness/레이아웃 7건 포함).
- Chromium CSS 합성 화면 8개 폭/확대 조합 통과. 실제 앱 전체 E2E는 미실행.
- 최신 소스/검증 영수증 대조 게이트 통과. pipelineVerified=true, deploymentVerified=false, browserVerified=false.
- 결과: .local-state/release-20261022/staged-results.json, staged-vitest.json, .local-state/layout-browser-20261023/results.json.
- 운영 변경·메일·배포·기존 배포 기준선 갱신은 수행하지 않았고 cron=[] 유지.
