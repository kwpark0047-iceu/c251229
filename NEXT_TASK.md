# Next Task Guide

서울 지하철 광고 영업 Lead Manager 프로젝트의 현재 상태와 다음 작업 목록입니다. (기준일: 2026-11-02, 브랜치 `master`, 마지막 커밋 `d1dcd79`)

## 현재 상태

### 검증 결과

- `npx tsc --noEmit`: 오류 없음
- `npm run lint`: 오류 없음
- `npx vitest run`: 이전 측정 기준 556 통과 / 4 실패 / 21 건너뜀
  - 실패 파일: `tests/integration/redirect-credentials.test.ts` (특수문자 민감 헤더 `X-Api^Key`, `X-Api|Key` 제거 실패)
  - 측정 시점의 `node_modules`는 `package-lock.json`(follow-redirects 1.16.1)과 달랐음. 재설치 후 재측정 필요.

### 완료된 주요 작업 (2026-10-20 ~ 10-28)

- 회원 승인/보관, 저장 필터, 관리자 로그인 신원 검증 분리
- 리다이렉트 인증 헤더 보안 패치, 보관 회원 RLS 범위 축소
- 격리 회귀 테스트 및 릴리스 안전 도구 추가
- 상세 내역은 `CHANGELOG.md`의 `[Unreleased]` 참고

## 다음 작업 (우선순위 순)

1. **`redirect-credentials` 테스트 실패 해결** (높음)
   - `npm ci`로 `node_modules`를 lock과 맞춘 뒤 재실행
   - 여전히 실패하면 특수문자 헤더 처리 로직(follow-redirects의 `sensitiveHeaders`) 확인
2. **미추적 작업 파일 커밋 정리** (중간)
   - `docs/2026-10-15 ~ 10-19-*.md`, `docs/superpowers/plans/2026-10-19-*.md`, `scripts/*.sql` 등이 커밋되지 않은 상태
   - `scripts/restore-legacy-member-login.sql` 등 SQL 파일은 내용 검토 후 커밋 여부 결정
3. **Vercel 환경 변수 확인** (중간)
   - `/api/station-info`는 KRIC/DATAGOKR 계열 API 키가 없으면 HTTP 500 반환
   - 대상 키: `DATAGOKR_API_KEY`, `KRIC_API_KEY`, `NEXT_PUBLIC_KRIC_API_KEY`, `STATION_INFO_API_KEY`
4. **문서 현행화 유지** (낮음)
   - `HANDOVER.md`(v1.0.0 기준 문구), `ARCHITECTURE.md`/`DATABASE.md` 최신 스키마 반영 여부 점검
   - `개선작업_종합_보고서.md`, `summary_report_korean.md`는 과거 세션 기록이므로 상태 변경 시 최신 문서로 대체

## 운영 참고

- 커밋/푸시는 사용자 명시 요청이 있을 때만 수행
- `.env.local`은 `.gitignore`(`.env*.local`)로 추적 제외됨
- 타입 오류 억제(`as any`, `@ts-ignore`, `@ts-expect-error`) 금지
- WSL에서 vitest를 실행하려면 Linux용 네이티브 바인딩이 필요함. `node_modules`는 Windows Node로 설치/실행하는 것을 권장

## 폰트 관련 참고 (proposal PDF)

- 로그 확인 키워드:
  - `✅ 한글 폰트 로드 성공 (Google Fonts)`
  - `⚠️ 한글 폰트 Google Fonts 로드 실패 → 시스템 폴백 적용`
  - `🔚 한글 폰트 최종 폴백: 헬베티카 KSC 인코딩`
