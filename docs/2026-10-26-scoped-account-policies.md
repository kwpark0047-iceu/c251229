# 2026-10-26 c251229 권한 범위 제한

## 서비스 경계
사용자가 매장 서비스는 별도 프로젝트라고 확인했다. c251229 로컬 설정은 yreoeqmcebnosmtlyump, 사용자 제공 매장 프로젝트 ID는 kdisbvhofkyoijnawszp다. 실제 운영 배포 환경변수의 일치는 이번에 재검증하지 않았다. 과거 731MB/157,163건과 18MB/14건 조회 결과를 동일 DB의 현재 결과로 혼용하지 않는다.

## 수정
회원 보관 준비 마이그레이션의 public 전체 순회를 광고 영업용 18개 테이블 명시 목록으로 제한했다. 목록은 src의 실제 Supabase 테이블 참조를 기준으로 작성했다. 알려지지 않은 테이블은 자동으로 가드 대상에 추가하지 않는다.

storage.objects의 추가 restrictive 정책은 floor-plans/proposals 버킷만 계정 상태를 확인한다. 다른 버킷은 기존 permissive/restrictive 정책을 그대로 따른다. 이 변경은 다른 버킷에 새 접근 권한을 부여하지 않는다.

기존 마이그레이션은 운영 적용을 수행하지 않았던 준비본을 수정한 것이다. 사용자가 별도 실행한 DB까지 미적용이라고 단정하지 않는다. 이미 전체 정책을 적용한 환경에는 이번 파일 재실행이 아닌 별도의 정책 대조·보정 계획이 필요하다. 과거 20260323 보안 마이그레이션은 변경하거나 재실행하지 않았다.

## 회귀 검증
- 기존 SQL에서 오프라인 범위 테스트 실패를 재현한 후 수정본 5건 통과.
- 다른 앱 합성 테이블 stores의 RLS 비활성/정책 미생성과 별도 버킷의 기존 접근 유지를 확인하는 실제 DB 테스트 1건 추가.
- DB 필수 최소값을 20건에서 21건(일반 11 + 회원 보관 10)으로 올렸다. 신규 격리 테스트가 빠진 과거 증거는 배포 승인에 사용할 수 없다.
- 게이트·readiness 관련 14건 통과.
- Docker API timeout으로 격리 DB 연결 전 실패했다. 합성 DB 테스트 10건은 실행되지 않았다. SQL이 실제 PostgreSQL에서 통과했다고 주장하지 않는다.
- 비파괴 버전 조회도 12초에 timeout됐다. 강제 재시작·WSL 종료·볼륨 삭제·초기화는 하지 않았다.
- 최신 오프라인 순차 기록: .local-state/scoped-release-20261026/results.json. SQL/fixture/게이트/테스트 해시도 별도 고정한다. DB 게이트를 통과하지 못하면 build/deploy 미검증으로 남긴다.

## 남은 단계
Docker 엔진 준비 후 격리 DB 전체 21건의 실제 실행과 정책 범위 검증, 그 뒤 build 및 실제 앱 브라우저 확인. 운영 프로젝트의 컬럼·RPC·기존 RLS 확인은 별도 접근 권한이 필요하다. 이번 작업에서 운영 DB/계정/Storage/매장 데이터와 예약 작업은 변경하지 않는다. 크론은 로컬 vercel.json의 []를 유지한다.

## 최신 검증 결과
2026-10-26: type-check/lint 통과, 오프라인 Vitest 543건 통과/실패 0/격리 DB 21건 건너뜀, 로컬 도구 50건 통과. DB 게이트는 의도대로 exit 1이며 databaseVerified=false/buildVerified=false다. 빌드·배포는 실행하지 않았다.

사용자 Docker 실행 완료 안내 후 재조회했으나 docker version은 20초 timeout이었다. context는 desktop-linux이고 endpoint는 npipe:////./pipe/dockerDesktopLinuxEngine으로 올바르며 UI/backend 프로세스가 존재한다. UI 실행 여부와 엔진 API 정상 응답은 다르다. C: 여유 공간은 약 0.83GB로 추가 위험이지만 엔진 무응답의 직접 원인으로 확정하지 않았다. 강제 복구는 수행하지 않았다.

## 승인된 Docker 전용 재시작 결과
Docker 설치 경로의 전용 프로세스만 종료하고 wsl --terminate docker-desktop만 실행한 뒤 Desktop을 숨김으로 시작했다. 첫 종료 확인은 정리 지연으로 실패했으나 후속 읽기 확인에서 프로세스 종료를 확인하고 다음 단계를 완료했다. Ubuntu/전체 WSL 종료 명령은 실행하지 않았다.

새 시작 로그(2026-10-26)에서 backend crashed: initializing Inference manager / Docker\\run\\dockerInference / The file cannot be accessed by the system 오류를 확인했다. 엔진 버전 조회는 계속 timeout이다. C: 여유는 당시 약 3.11GB. 임시 통신 폴더의 비삭제 백업·재생성은 별도 승인을 요청했으며 아직 실행하지 않았다. DB 손상이라고 단정하지 않는다. 격리 DB 테스트는 계속 보류다.

## 2026-10-28 runtime folder recovery and verification
- Approved runtime-only repair completed. Original run directory preserved as run.backup-20261028-fb850fdb; replacement inherited the original ACL. No volume deletion or Ubuntu/whole-WSL shutdown was performed.
- Docker engine returned 28.3.3; isolated DB initially reported running/healthy.
- New pipeline evidence: .local-state/scoped-release-20261028/release-final-results.json. Type-check and lint passed; local tools passed (50 tests). Vitest reported 543 passed, 21 skipped, and both isolated DB suites failed during setup. No successful DB verification is claimed. Build was not run after the failed test stage.
- Subsequent Docker inspect did not promptly return. Backend log records insufficient disk space when writing the VM init log. Read-only capacity check reported C: 1,069,776,896 bytes free and D: 551,915,003,904 bytes free. This indicates continuing storage pressure, but does not alone establish the exact DB setup exception.
- Production DB/schema/accounts and cron settings were not changed. Further retries and destructive cleanup were not performed. More C: headroom or a separately approved Docker data-disk relocation is recommended before resuming isolated tests.

## 2026-10-28 verification after user disk relocation
User reported Docker data disk moved to D:. C: free capacity was 20,164,878,336 bytes at the initial read-only check. Docker engine 28.3.3 responded. The isolated database initially rejected connections while startup fsync was running; after waiting without restarting it became healthy.

Fresh evidence: .local-state/scoped-release-20261028-after-disk-move/release-final-results.json and release-final-vitest.json. Type-check, lint, local-tools, test, DB gate and production build all exited 0. Vitest: 564 passed, 0 failed, 0 skipped. DB gate: 21 passed across 2 suites (11 data-contract cases plus 10 archive-policy cases). Local tools: 50 passed. Source snapshot and the eight reviewed SQL/test/gate input hashes were checked during the pipeline in the patched dependency verification copy.

No production database/schema/account changes, emails, deployment, volume deletion, factory reset or Ubuntu/whole-WSL shutdown were performed in this verification. Existing workspace changes were preserved; cron configuration remains empty. Actual production schema compatibility and browser E2E behavior are not established by this local verification.
