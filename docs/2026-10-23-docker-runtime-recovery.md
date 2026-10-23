# Docker 런타임 소켓 복구

## 원인과 승인 범위

사용자 오류 화면은 Inference manager가 `run/dockerInference`를 제거하지 못해 Desktop 시작이 중단됨을 보여줬다. 해당 경로는 접근 불가 재분석 지점이었으며 일반 파일 삭제나 볼륨 초기화로 처리하지 않았다. 이것만으로 DB 파일 손상을 판단하지 않는다.

사용자가 승인한 런타임 폴더 백업/재생성만 수행했다. 정상 종료 명령이 시간 초과여서 이전에 승인된 Docker 전용 프로세스 종료 범위에서 설치 경로와 프로세스 이름을 검증한 뒤 종료했다. WSL/Ubuntu 종료 명령은 실행하지 않았다.

## 수행 결과

- 원본: `C:\Users\user\AppData\Local\Docker\run`
- 보존된 백업: `C:\Users\user\AppData\Local\Docker\run.backup-20261023-a74595d7`
- 기존 폴더와 모든 상위 경로에 링크가 없는지 확인하고 같은 부모 안에서 이름만 변경했다. 소켓이나 폴더는 삭제하지 않았다.
- 빈 새 run 폴더를 생성했고 원본 ACL 일치를 확인했다.
- Docker Desktop 재실행 후 엔진 버전 28.3.3 조회가 성공했다.
- Docker CLI 연결은 기존 로컬 named pipe이며 TCP 포트/설정은 변경하지 않았다.
- DB 컨테이너 `/supabase_db_sopo-isolated`, 프로젝트 라벨 `sopo-isolated`, 포트 54322 및 healthy 상태를 확인했다. 테스트 연결 주소는 127.0.0.1로 제한했다.
- 확인 시 Ubuntu와 docker-desktop 모두 Running이었다. Ubuntu 별도 시작/종료 명령은 실행하지 않았다.

## 실검증

- 실행별 합성 스키마에서 기존 DB 11건 + 회원 보관 9건 모두 통과, 건너뜀 0건.
- 실제 JSON 보고서에 DB 게이트를 적용해 `{suites:2, passed:20, skipped:0}`을 확인했다.
- 결과: `.local-state/recovered-db-tests-20261023.json`, `.local-state/recovered-db-tests-20261023.log`.
- 격리 DB를 포함한 전체 순차 검증은 `.local-state/release-20261022/recovered-results.json`에 별도로 기록한다. 운영 데이터/스키마/실제 계정/메일/배포/예약 작업은 변경하지 않았다.
- 최종 type-check → lint → 격리 DB 포함 전체 test → build 모두 종료 코드 0. Vitest 548건 통과, 실패/건너뜀 0건이며 로컬 도구 테스트 41건도 통과했다.
- 전체 테스트 JSON의 DB 게이트도 통과했고 `databaseVerified=true`를 기록했다. 소스 해시는 `16e567da8cf8245f9b398fde2a80f2a28d61ecddf8044b0f05c6af9424e57839`이며 검증 전후 동일함을 검사했다.
- 마지막 재확인에서도 엔진 28.3.3, 격리 DB running/healthy, 원본 런타임 백업 보존, crons=[]를 확인했다.

## 별도 확인 사항

격리 스택의 DB, Vector, Auth 등은 실행 중이었다. Edge Runtime은 Exited(255)였으며 최근 60줄에서 Bus error/SIGBUS/디스크 I/O 오류는 탐지되지 않았다. 이것은 Edge 정상 동작을 뜻하지 않는다. 이번 승인 범위를 넓혀 해당 컨테이너를 재생성하거나 재시작하지 않았다.
