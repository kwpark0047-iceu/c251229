# Change Log

## [Unreleased]

### Security

- `POST /api/contact/send-proposal`: 동일 출처(Origin) 검사, IP당 1분 5회 레이트 리밋, 제안서 구조 검증 추가
- 이메일 HTML 템플릿의 모든 사용자 입력을 `escapeHtml`로 이스케이프 (HTML 주입 차단), 제목 줄바꿈 제거 (헤더 주입 차단)
- `POST /api/ai-proposal`: 동일 출처 검사, IP당 1분 20회 레이트 리밋 추가 (공개 위젯이므로 로그인은 요구하지 않음)
- `scripts/*.js`: 하드코딩된 Supabase URL·anon 키 제거, `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 환경변수 사용 및 누락 시 즉시 실패

### Fixed

- 인코딩 손상(모지바케)으로 깨진 한글 문구 복구: 제안서 작성 화면(`ProposalForm.tsx`) 제목·안내문·라벨, `api/gg-data`, `api/seoul-data`, `lead-status-validator.ts`, `scripts/upload-gyeongbu.js`(구문 오류 포함), `scripts/verify-floor-plans.js`
  - 원인: 해당 파일의 일부 줄이 올바르지 않은 인코딩으로 저장되며 한글이 한자·`?`로 치환됨 (`ProposalForm.tsx`는 `35ed8aa` 커밋에서 처음 확인)
  - 복구: 깨지지 않은 과거 커밋의 줄을 기준으로 복원, 기준이 없는 줄은 문맥에 맞춰 수동 작성
- 제안서 화면: "업로드 후 상태 설정" 라벨이 `aria-labelledby` 대상(`upload-status-heading`)과 연결되지 않던 문제 수정

### Added

- `tests/unit/encoding-guard.test.ts`: 소스 전체에서 모지바케 줄이 다시 들어오면 실패하는 회귀 테스트
- `src/lib/api-guard.ts`: `escapeHtml`, `isSameOrigin`, `getClientKey`, `createRateLimiter` 공용 유틸
- `tests/unit/api-guard.test.ts`, `tests/unit/contact-send-proposal.test.ts` (14개)

### Docs

- `CLAUDE.md`: 미들웨어 파일명을 실제 파일인 `src/proxy.ts`로 정정

## [1.0.0] - 2026-08-22

### Fixed

- Korean font encoding in proposal PDF generation
  - Fixed Base64 encoding bug: `btoa(new Uint8Array().reduce(...))` → `String.fromCharCode(...bytes)`
  - Added 3-step fallback system: Google Fonts NanumGothic → DotumChe → helvetica KSC
  - Resolution confirmed by user: '해결 되엇는데 테스트하셔요.'

## [Previous] - ...

- Other previous changes...
