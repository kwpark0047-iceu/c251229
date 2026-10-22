# Docker 엔진 진단 (2026-10-20)

## 관측 증거
- Docker Server version 및 컨테이너 목록 조회가 각각 15초 제한에 응답하지 않았다. 로컬 Supabase 포트 54321/54322는 연결 거부 상태다.
- WSL 상태/목록 조회는 정상이며 Ubuntu 및 docker-desktop이 Running으로 표시된다.
- docker-desktop 내부 echo, 프로세스 목록, 디스크 및 커널 로그 조회는 정상이다. dockerd와 containerd가 존재하며 디스크는 약 13GB 사용, 942GB 여유다.
- Windows Docker 백엔드 두 프로세스는 10월 16일 시작된 상태다. 백엔드 파일 로그도 오래된 기록이며, Desktop 로그에는 종료 요청 시간 초과와 남아 있는 백엔드/WSL 프로세스 목록이 기록돼 있다.
- 이번 공식 `docker desktop restart --timeout 60`도 종료 대기에서 즉시 회복되지 않았다. WSL 명령 실행 자체는 정상이다.

## 판단과 안전 경계
Docker Desktop 백엔드/엔진 연결이 정상 종료되지 않는 상태로 추정한다. WSL 전체 장애 또는 디스크 용량 부족으로 단정할 증거는 없다. 내부 잠금의 정확한 근본 원인은 미확정이다.

Docker 전용 배포판 종료 및 Desktop 프로세스 재기동은 로컬 컨테이너의 진행 중 작업을 중단할 수 있으므로 별도 사용자 승인을 요청했다. 전체 WSL 종료, Ubuntu 종료, 볼륨 삭제, 공장 초기화, VHD 변경은 하지 않았다.

운영 DB/스키마/실제 계정 및 Vercel 설정을 변경하지 않았다. 저장소 vercel.json의 crons는 빈 배열이다. 격리 DB 테스트 11건은 엔진 복구 및 연결 대상 확인 전에는 실행하지 않는다.

## 승인 후 복구 시도 결과
- 사용자가 Docker 전용 강제 재기동을 승인했다. `wsl --terminate docker-desktop` 성공 후 Docker 설치 경로에 속하는 Desktop/backend/build 프로세스만 종료하고 Desktop을 재실행했다. Ubuntu는 Running 상태를 유지했다.
- 새 백엔드 로그에서 기동 차단 원인이 구체화됐다: `starting services: initializing Inference manager ... run\\dockerInference ... The file cannot be accessed by the system.`
- 해당 항목은 0바이트 reparse 속성의 런타임 소켓이다. Docker 프로세스를 중지한 상태에서 삭제 대신 이름 변경으로 보존하려 했으나 Windows 오류 1920(파일 접근 불가)으로 실패했다. 항목 변경은 이뤄지지 않았다.
- Desktop을 다시 실행했으나 동일 오류가 재현됐다. 공식 `docker desktop disable model-runner`도 20초 제한에 응답하지 않아 비활성화 적용 여부를 확인할 수 없다.
- 더 이상의 소켓 강제 삭제, reparse 메타데이터 제거, 전체 WSL 종료, 호스트 재부팅은 실행하지 않았다. Windows 재부팅은 다른 작업에 영향을 주므로 사용자가 저장 후 직접 수행하는 것이 다음 안전한 경계다. 재부팅 후 엔진과 소켓 상태를 다시 확인해야 한다.
- DB 테스트 11건은 여전히 미실행이다. 운영 DB/스키마/실제 계정에는 접속하거나 변경하지 않았고 `crons: []`를 확인했다.

## 사용자 재부팅 완료 통보 후 재확인
- Desktop 시작을 요청하고 엔진을 재조회했지만 `dockerDesktopLinuxEngine` named pipe가 생성되지 않았다.
- 새 백엔드 기동 로그에서도 `initializing Inference manager ... dockerInference ... The file cannot be accessed by the system` 오류와 backend crashed 기록이 재현됐다. 단순 기동 대기가 아니라 초기화 실패다.
- WSL 목록은 Ubuntu Running, docker-desktop Stopped다. 재부팅이 실제 호스트에 반영됐는지는 별도로 검증하지 않았으며 사용자 완료 통보에 따른 재확인 결과만 기록한다.
- DB 테스트는 실행하지 않았다. 이번 확인 중 볼륨/소켓/설정 변경이나 운영 DB 접속은 하지 않았다. 저장소 예약 작업 빈 배열도 다시 확인했다.

## 런타임 디렉터리 보존 복구 및 새 장애
- 부모 run 디렉터리는 일반 폴더이며 사용자/SYSTEM/Administrators FullControl이었다. 소켓만 직접 변경할 때 오류가 발생했다.
- Docker 프로세스를 중지하고 정확한 run 경로를 검증한 뒤 부모 폴더를 `C:\Users\user\AppData\Local\Docker\run-preserved-bfdcc7beabb44aec9d25ae990f71577f`로 이름 변경해 보존했다. 빈 run 폴더 생성 후 Docker 기동 성공: Server 28.3.3, 컨테이너 목록 조회 성공. 기존 sopo-isolated DB/Storage 볼륨 존재를 확인했다.
- 전용 `tmp/sopo-isolated`에서 Supabase start를 실행했다. 해당 폴더에 migrations/seed 파일은 없었다. 이미지 준비 후 `Starting database from backup` 시점에 엔진이 실패했고 시작 명령 exit 1이었다. 시작 로그는 tmp/docker-recovery-supabase-start.log에 있으며 로컬 키가 포함될 수 있어 전체 공개하지 않는다.
- 새 오류는 `service snapshotter failed: panic detected in stargz-snapshotter` 및 SIGBUS다. WSL 커널 로그에도 fatal signal 7 및 `DetachScsiDisk ... Failed to flush block device`가 관측됐다. 정확한 저장장치/가상메모리 근본 원인은 미확정이다.
- 이 상태에서 VHD/볼륨 변경, 파일시스템 수리, 저장소 엔진 전환, 반복 재시작은 하지 않는다. 소켓 기동 장애는 우회됐지만 엔진 안정 복구는 미완료이며 격리 DB 테스트 11건도 미실행이다. 운영 DB/스키마/실제 계정/Vercel 설정을 변경하지 않았다.

## 전체 WSL 종료 승인 후 최종 결과
- 사용자의 작업 저장 및 전체 WSL 종료 승인을 받은 뒤 `wsl --shutdown` 성공을 확인했다. 충돌 후 재생성된 접근 불가 소켓 폴더는 `run-preserved-29998794c7e2416db6a40c20dec95ca4`로 추가 보존하고 빈 run으로 Docker를 기동했다. 기존 DB/Storage 볼륨은 보존했다.
- 첫 전체 스택 시작 중 Edge Runtime이 Bus error로 실패하여 CLI가 컨테이너를 중지했다. 시작 완료 전 실행된 DB 테스트는 5건 통과 후 연결 중단으로 6건 실패했다. 안전장치 13건은 통과했다. 실패를 제품 오류 또는 성공으로 처리하지 않았다.
- Edge Runtime을 제외하는 공식 start 옵션으로 전용 스택을 다시 시작했고 exit 0 및 DB healthy를 확인한 뒤 테스트를 재실행했다. Edge Runtime 자체의 장애는 해결된 것이 아니며 이번 DB SQL 검증 범위에서 제외했다.
- 최종 결과: DB 계약 11건 + 안전장치 13건 = 24건 통과, 0건 실패, 0건 스킵. 로그: `tmp/wsl-recovery-db-tests-final.log`.
- DB 검증은 실행별 합성 스키마에서 실제 PostgreSQL 저장/재조회 및 authenticated/anon 역할·auth.uid 컨텍스트 기반 조직 RLS를 검증한다. 운영 스키마/정책 복제, JWT 발급, REST/Storage/Edge Runtime 전체 E2E 검증은 아니다.
- 성공 실행은 자체 정리를 통과했다. 첫 중단 실행의 `codex_test_3272b92bc0b34a82aa8ac2059a414029`만 컨테이너 신원·로컬 주소 및 정확한 UUID 소유 마커 일치를 확인한 후 정리했다. 이후 테스트 스키마 잔여 0건이다.
- 최종 Docker Server 28.3.3 응답 및 전용 DB healthy를 확인했다. 운영 DB/스키마/실제 계정에는 접속·변경하지 않았으며 Vercel 설정도 변경하지 않았다. 저장소 crons는 0건이다. 이번에는 애플리케이션 코드 수정·재배포를 하지 않았다.
