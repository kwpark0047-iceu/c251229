# 배포 포장 안전성과 로컬 도구 분리

## 범위

남은 변경 반영 계획의 0~1단계만 구현한다. SOPO 저장, 공공데이터 엔진 변경,
제안서 상태/삭제 등 미반영 업무 기능은 이번 후보에 가져오지 않는다.
기존 작업의 스테이징 상태와 내용은 보존하고 운영 DB·스키마·실제 계정·Vercel
환경변수·예약 작업은 변경하지 않는다. 이번 작업은 운영 배포를 포함하지 않는다.

## 구현

- `.vercelignore`: 기본 제외 후 src/public과 필수 빌드 파일만 허용한다.
  환경 파일, 테스트, 로컬 도구, 릴리스 명세, 문서, tmp, Supabase 마이그레이션,
  백업·로그는 웹 배포 대상이 아니다. npm build에 필요한 설정은 유지한다.
- `release/baseline.json`: 검증된 운영 배포 ID, 프로젝트/팀, 이전 배포 ID 및
  소스 940개 파일의 SHA-256을 고정한다. 명세의 목록 해시도 도구에 고정한다.
  운영 DB 값이나 API 키는 포함하지 않는다.
- `scripts/release-safety.mjs`: 기준선 검증, 새 후보 준비, 후보 검사와 순차 검증.
  고정된 도구/테스트 overlay만 허용한다. 업무 코드·의존성·lifecycle script
  변경은 허용하지 않는다. 가변 candidate.json만 신뢰하지 않고 실제 파일 목록과
  독립 기준선/검토된 overlay 해시를 대조한다.
- 기존 Vector 래퍼와 native 회귀 테스트는 별도 `test:local-tools` 명령 및
  Docker 접근이 없는 CI 작업으로 분리한다. Vitest에서는 scripts를 제외하지만
  native 테스트는 별도 필수 gate로 실행한다. 앱 테스트를 건너뛰는 변경이 아니다.
- 후보의 의존성은 공유 junction이 아닌 lockfile 기반 `npm ci --ignore-scripts`
  설치로 준비한다. 후보 전용 설치 트리의 해시를 별도 로컬 상태에 기록하고 검사한다.
  `.vite`와 `.cache`는 생성 캐시 내용만 해시에서 제외하고, 캐시 링크 및 중첩 외부
  링크는 먼저 검사하여 거부한다. 기존 설치 트리가 바뀌었으면
  덮어쓰지 않고 새 후보를 요구한다. 재검증은 원래 도구가 소유한 설치를 전체 해시로
  확인한 경우에만 재사용하며 lifecycle script는 실행하지 않는다. 해시는 제한된
  병렬 파일 읽기로 계산하고 기존 정렬/바이트 기준과 동일함을 회귀 테스트한다.
- 출력 폴더의 외부 junction/symlink는 중첩 경로까지 거부한다. Next.js가 생성하는
  후보 내부 node_modules/빌드 출력 참조만 허용하며 최상위 출력 링크는 거부한다.
  설치 상태 기록은 임시 파일 후
  atomic rename으로 갱신하고 링크를 따라 쓰지 않는다. 후보별 exclusive lock과
  실행별 UUID 로그를 사용한다. npm 캐시와 임시 파일은 D: 작업 폴더의
  `.local-state/` 아래에 둔다.

## 명령

저장소 루트에서 실행한다. prepare 이름은 새 이름이어야 한다.

```powershell
npm run release:check
npm run test:local-tools
npm run release:prepare -- release-safety-my-candidate
node scripts/release-safety.mjs inspect release-safety-my-candidate
npm run release:verify -- release-safety-my-candidate
```

prepare는 `tmp/presence-release-20261020` 기준 사본이 보존돼 있어야 한다.
원본이나 기존 후보를 자동 수정/삭제하지 않는다. 기준 사본이 없거나 해시가 다르면
운영 파일을 자동 다운로드하지 않고 중단한다. CI의 check/native 작업은 이 사본이나
Docker가 없어도 실행된다.

verify는 환경 파일이 없는 후보에서 type-check → lint → native test →
격리 DB 포함 Vitest → build → 격리 Chromium 순서로 실행한다. 로컬 DB 연결은
`tmp/sopo-isolated/.env.local`의 loopback 설정만 사용하며 테스트 fixture가 Docker
프로젝트/포트/DB 신원을 추가 확인한다. 운영 환경 파일은 읽지 않는다.

예약 작업은 명시적으로 `crons: []`여야 한다. 자동 배포/승격/마이그레이션 명령은
도구에 없다. Vector 복구는 이 검증기가 자동 실행하지 않으며, 기존에 승인된 로컬
Unix socket 권한 범위도 확대하지 않는다.

## 검증 기록

- RED: 새 도구 모듈 부재, overlay/명세/출력 링크 방어 추가 전 실패 기록을 보존했다.
- Native 테스트 29건 통과. 새 정책 모듈 커버리지: 라인/함수 100%, 분기 98.44%.
- 별도 합성 후보에서 6건의 실제 거부 동작 통과: config+명세 위조, 추가 테스트,
  환경 파일, 중첩 출력 junction, 기존 후보 덮어쓰기, 동시 실행. 외부 sentinel 보존.
- 탐색 후보에서 Vitest가 node:test 파일을 잘못 수집하는 문제를 발견하여 두 실행
  대상을 명시적으로 분리했다. 최종 후보에서는 순차 검증을 다시 실행한다.
- 첫 최종 후보의 타입/린트/347건/빌드/브라우저는 통과했으나 마지막 출력 검사가
  Next.js의 정상 내부 의존성 링크를 거부했다. 업무 코드와 설치물은 보존한 채 이
  작업이 만든 도구 overlay 세 파일만 갱신하고 새 명세로 다시 검증한다.
- 최종 후보: `tmp/release-safety-foundation-20261020-v6`.
- 순차 검증 결과/로그: `tmp/release-safety-foundation-20261020-v6-logs/<UUID>/`.
  완료 여부는 해당 실행의 results.json과 프로세스 종료 결과로 확인한다.
- 최종 성공 실행: `5cc76def-276c-447e-8ba0-f32c0cf63964`.
  type-check → lint → native 29건 → 격리 DB 11건 포함 Vitest 347건 → build →
  Chromium 3건 모두 통과했다. 소스/설치 트리 사후 검사도 통과했고 verifier는
  `verified: true`, 종료 코드 0으로 완료됐다. 건너뛴 앱 테스트는 없다.

최초 무샌드박스 권한이 없는 junction 준비 실패와 탐색 후보는 자동 삭제하지 않고
보존했다. 이전 후보의 결과를 최종 검증 성공으로 대체하지 않는다.

## 제한 및 주의

- 로컬 Node 24.12.0에 대해 jsdom 30.0.1이 24.15.0 이상을 요구하는 engine 경고가
  발생한다. 이번 단계에서는 검증된 의존성/런타임 기준선을 임의 업그레이드하지 않았다.
  npm의 기존 deprecated 경고는 새 보안 감사 결과와 다르며 이번에 취약점 감사를
  실행했다고 해석하면 안 된다.
- 검증 lock이 남은 경우 실행 중인 verifier가 없는지 먼저 확인하고 해당 lock만
  사람이 정리한다. 자동 stale-lock 제거나 볼륨/캐시 정리는 하지 않는다.
- `.local-state` 및 npm 설치 로그는 공개하지 않는다. 삭제/초기화하지 않았으며,
  설치가 실패해 소유권 기록이 없는 후보는 새 이름으로 준비한다.
- 커밋/푸시는 수행하지 않는다. 기존 staged 변경과 새 변경을 묶어 커밋하지 않는다.
