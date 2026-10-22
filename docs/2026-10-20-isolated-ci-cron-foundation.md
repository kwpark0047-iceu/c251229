# 격리 CI·테스트 기반 및 cron 인증 보강

## 범위
- 기존 작업 폴더의 변경을 되돌리거나 스테이징하지 않았다. CI workflow는 기존 e2e 항목을 유지하면서 운영 Supabase secret 참조를 제거했다.
- 검증 후보: D:\c251229\tmp\ci-foundation-release-20261020. 운영 기준 dpl_DdqZT7FJtZFgCDy9YPAZZMdJaKhq의 로컬 배포 사본에 이번 단계 파일만 추가했다. SOPO/동기화/제안서 삭제 등 미반영 기능은 포함하지 않았다.

## 구현
- cron 인증을 src/lib/cron-auth.ts로 분리했다. 미설정/빈 값/공백 전용 키와 잘못된 Bearer를 거부한다. 실패 요청은 DB 클라이언트 생성 전에 401을 반환한다. 인증 정상 경로는 실제 DB 대신 빈 조직 목으로 검사한다.
- CI의 Supabase 주소/키를 실제 비밀값이 아닌 루프백 가짜 값으로 변경했다. 독립 isolated-db job은 임시 프로젝트 sopo-isolated만 시작하며 root 마이그레이션을 재생하지 않는다. DB 계약 job도 build 선행 조건에 포함했다.
- 전용 playwright.isolated.config.ts를 추가했다. 127.0.0.1:3117에서만 실행하며 기존 서버를 재사용하지 않는다.
- scripts/run-isolated-smoke.mjs는 .env.example 이외 환경 파일이 있으면 서버 시작 전에 거부한다. 허용한 OS 환경만 전달하고 DB URL/키는 가짜 로컬 값으로 고정한다. 실제 키/메일/cron 비밀값은 상속하지 않는다.
- E2E는 빌드된 Next start를 사용한다. 브라우저의 외부 HTTP 요청은 차단하고 service worker도 막는다. 랜딩, 미인증 보호 페이지 이동, 미인증 cron 401을 확인한다. 실제 로그인·승인·삭제·저장은 하지 않는다.
- 기존 범용 playwright.config.ts 및 기존 스모크 파일은 보존했다. 안전한 전용 실행 경로는 새 config를 명시해야 한다. 환경 파일이 있는 현재 루트에서 전용 서버를 실행하면 의도적으로 거부된다.

## 검증 증거
- RED: tmp/ci-foundation-red.log. 기존 workflow의 운영 secret 참조 검사 실패 및 아직 없는 cron 인증 모듈 import 실패를 확인했다.
- 신규 목 기반 단위 테스트는 현재 루트에서도 통과했다. 최종 전체 검증은 별도 후보에 한정된다.
- 최종 순서: type-check exit 0 → lint exit 0(경고/오류 출력 없음) → 격리 DB 포함 test exit 0 → build exit 0.
- 최종 전체 테스트: 42개 파일, 335건 통과, 실패/스킵 0건. 실제 로컬 DB 계약 11건이 포함되며 실행별 합성 스키마 정리 확인도 통과했다.
- Chromium 전용 스모크: 3건 통과. 해당 Playwright 버전의 브라우저가 없어 D:\DevCaches\playwright에 필요한 headless shell을 설치했다. 프로젝트 의존성 버전은 변경하지 않았다.
- 최초 개발 서버 스모크는 Google 폰트 요청 시간 초과로 실패했다. 이를 숨기지 않고 빌드 기반 시작으로 수정한 후 type-check→lint→test→build 전체를 다시 실행하고 브라우저까지 재검증했다.
- 최종 로그: tmp/ci-foundation-final-type-check.log, tmp/ci-foundation-final-lint.log, tmp/ci-foundation-final-test.log, tmp/ci-foundation-final-build.log, tmp/ci-foundation-final-browser.log.

## 제한과 운영 안전
- GitHub Actions 원격 실행/coverage 임계값 검증은 이번 로컬 결과에 포함되지 않는다. 새 job 구성의 원격 성공을 주장하지 않는다.
- 후보가 workspace/tmp 아래 있어 Next가 여러 lockfile의 루트를 추론했다는 경고가 있다. 이를 없애려고 기존 Next 설정을 바꾸거나 lockfile을 삭제하지 않았다. 빌드 및 브라우저 검증은 성공했다.
- 현재 작업 폴더 전체 미반영 기능의 테스트 통과를 의미하지 않는다. DB 11건은 합성 SQL/RLS 계약이며 운영 스키마/정책 복제 또는 제품 전체 E2E 검증이 아니다.
- 운영 DB/스키마/실제 계정/환경변수/Vercel 설정을 변경하지 않았다. vercel.json의 crons=[]를 유지했다. 배포/커밋/push는 실행하지 않았다.
