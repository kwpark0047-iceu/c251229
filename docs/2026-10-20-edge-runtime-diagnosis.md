# Edge Runtime 추가 진단

## 재현
- 전용 DB 등 기존 격리 컨테이너는 진단 시작 시 healthy였다.
- 공식 edge-runtime v1.74.1(amd64, sha256:ac1fdaad6d62b892f3309578006ce208f4150bf2c484113cf2c32655ec7e6893)을 네트워크/볼륨 없이 실행했다.
- `--help`, `--version` 모두 종료 코드 135(SIGBUS)로 실패했다. OOMKilled=false였다. 셸에서 바이너리를 직접 실행해도 Bus error였다. DB/함수 코드/인증과 무관하게 재현된다.
- 기존 바이너리 SHA256: d64445a6b7a9cbc8754a2966f90e4479fb1b43c46c3e186cce15c3e34938ed03. 공식 파일과 무결성 비교는 아직 하지 않았으므로 손상으로 단정하지 않는다.
- 인접 공식 패치 v1.74.2를 추가 다운로드해 비교하려 했으나 실행 준비 시 Docker가 `commit failed: write ... overlayfs/metadata.db: input/output error`를 반환했다. 기존 이미지/볼륨 삭제는 하지 않았다.

## 핵심 발견
- Windows 호스트 Get-PSDrive: C Free=0 bytes, D Free=568613982208 bytes.
- Linux overlay 내부는 약 940GB 여유로 보였지만 VHD를 저장하는 호스트 C 공간과 다르다.
- 엔진 로그에는 bbolt 메타데이터 접근 중 SIGBUS 및 dockerd panic도 나타난다. 호스트 공간 고갈이 현재 장애의 유력한 원인이다. Edge Runtime 버전 자체의 결함 또는 파일 손상 여부는 공간 확보 후 재검증해야 한다.

## 안전 경계 및 다음 단계
- 추가 이미지 다운로드/컨테이너 생성을 중단했다. 볼륨 삭제, prune, 공장 초기화, VHD 압축/이동/수리, 운영 DB/스키마/실제 계정 변경은 하지 않았다.
- C 공간 확보가 선행되어야 한다. 사용자 파일/캐시를 임의 삭제하지 않는다. 공식 Docker 디스크 위치 이동은 별도 승인 및 보존 절차가 필요하다.
- 이번 Edge Runtime 정상 동작 검증은 미완료다. 이전의 DB 11건 통과는 별도 기록이며 이번 환경 정상성을 대신하지 않는다.
- 진단용 중지 컨테이너 codex-edge-version-probe는 증거 보존을 위해 남겨뒀다. 운영/예약 작업 설정은 변경하지 않았다.

## 공간 확보 후 복구 결과
- npm 다운로드 캐시 D 이전 후 C 여유 약 8.6GiB를 확보한 상태에서 재검증했다. 충돌 후 남은 런타임 폴더는 `run-preserved-738d91da643f438fb7ae2e0f0ee2b1ff`로 보존하고 빈 run 폴더로 엔진을 재기동했다.
- 기존 v1.74.1 최소 실행은 여전히 exit 135였으나 신규 v1.74.2는 정상 실행됐다. 실패 v1.74.1 이미지를 `tmp/edge-runtime-v1.74.1-preserved.tar`(390,664,704바이트)에 백업했다.
- 볼륨이 없는 진단 컨테이너 codex-edge-version-probe 및 실패 이미지 v1.74.1 하나만 비강제 제거하고 동일 공식 태그를 다시 다운로드했다. prune/볼륨 삭제/공장 초기화/VHD 조작은 하지 않았다.
- 동일 digest ac1fdaad6d62b892f3309578006ce208f4150bf2c484113cf2c32655ec7e6893 및 동일 바이너리 SHA256에서 --version 정상 실행을 확인했다. 따라서 바이너리 내용 손상이나 버전 결함을 단정할 수 없으며, 공간 부족 이후 로컬 이미지/스냅샷 상태가 이미지 재구성으로 회복된 것으로 판단한다.
- 전용 로컬 스택 start exit 0. functions serve로 실제 Edge Runtime v1.74.1 컨테이너 기동 후 무부작용 합성 함수 codex-edge-probe를 호출했다. GET 200/정확한 scope, POST 200/정확한 echo, 잘못된 JSON 400, 미지원 DELETE 405, 인증 헤더 없음 401 모두 확인했다. 키는 로컬 전용 ANON_KEY만 메모리에서 사용했으며 출력하지 않았다. 함수는 DB/외부 API 호출을 하지 않는다.
- 격리 DB 11건 + 안전장치 13건 = 24건 통과(실패/스킵 0건). 로그: tmp/space-recovery-db-tests.log. 테스트는 실행별 합성 스키마 SQL/RLS 계약이며 운영 정책 동일성/실제 계정 전체 E2E 검증은 아니다.
- 최종 Edge 컨테이너 running, restarts=0, OOM=false. DB healthy, C 여유 9,233,477,632바이트를 확인했다. 운영 DB/스키마/실제 계정/Vercel 설정을 변경하지 않았으며 저장소 crons 0건을 확인했다. 앱 소스 수정·재배포는 하지 않았다.
