# Change Log

## [Unreleased] - 2026-08-26 ~ 2026-10-28

### Security

- follow-redirects 인증 헤더 제거 패치 (`8ee0853`, 2026-10-22)
- 보관(archived) 회원 RLS 정책 범위 축소 (`d1dff87`, 2026-10-28)
- 리다이렉트 시 Authorization/Cookie 등 민감 헤더 유지 여부에 대한 회귀 테스트 추가 (`tests/integration/redirect-credentials.test.ts`)

### Added

- 회원 승인/거절 흐름, 승인 이력(`approval_history`), 회원 보관 기능
- 저장 필터(saved filters), 경기도 리드 노출 개선
- 인벤토리 계약 기간 입력(`available_from`, `available_to`) (`ca21dea`)
- MapDataCache LRU/TTL, LeadWithCRM 표시 필드 (`d323a58`)
- 격리 회귀 테스트 및 릴리스 안전 도구 (`scripts/release-safety.mjs`, `release-readiness.mjs`)

### Fixed

- 관리자 로그인: 검증된 신원과 조직 조회 실패를 분리 (`d1dcd79`, `54d396d`)
- 인증 쿠키 갱신 보존
- 할 일 날짜 보존 및 재오픈 시 완료 시각 초기화 (`6736d5d`)
- 다중 조직 소속 사용자 리드 미표시 (PGRST116) (`b2b3cfb`)
- Node 20(EOL) → Node 24 전환으로 CI 단위 테스트 실패 해결 (`6810c0b`)
- 인벤토리 업로드 모달 스크롤/버튼 가시성 (`f06950d`)

### Changed

- 아카이브/복원 기능 no-op 처리: `leads` 테이블에 `archived` 컬럼이 없음 (`c417f2e`)

## [1.0.0] - 2026-08-22

### Fixed

- Korean font encoding in proposal PDF generation
  - Fixed Base64 encoding bug: `btoa(new Uint8Array().reduce(...))` → `String.fromCharCode(...bytes)`
  - Added 3-step fallback system: Google Fonts NanumGothic → DotumChe → helvetica KSC
  - Resolution confirmed by user: '해결 되엇는데 테스트하셔요.'

## [Previous] - ...

- Other previous changes...
