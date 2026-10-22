# 로컬 Vector 반복 재시작 복구

## 원인
- 대상은 sopo-isolated 로컬 스택의 supabase_vector_sopo-isolated다.
- CLI가 `DOCKER_HOST=http://host.docker.internal:2375`로 생성했으나 해당 TCP Docker API는 닫혀 있었다. Vector docker_logs 소스가 컨테이너 목록 조회에 ConnectionRefused를 받고 종료했으며 unless-stopped 정책 때문에 반복 재시작했다. 진단 시 RestartCount=29였다. OOM은 아니었다.
- Docker API를 열거나 건강 검사/재시작 정책만 무력화하는 방식으로 숨기지 않았다.

## 승인 및 복구
- 사용자가 내부 Unix 소켓 접근을 명시 승인했다. 소켓 read-only 마운트가 Docker API의 제어 권한까지 읽기 전용으로 제한하지 않는다는 점도 사전에 설명했다.
- 원본 설정: tmp/vector-original.yaml. 원본 메타데이터: tmp/vector-container-preserved.json. 로컬 설정에 민감한 값이 있을 수 있어 공개/커밋하지 않는다.
- 원본 컨테이너를 restart=no로 바꿔 정지한 뒤 supabase_vector_sopo-isolated-preserved-20261020으로 보존했다. DB/Storage 볼륨 및 다른 컨테이너는 삭제/재생성하지 않았다.
- 동일 공식 이미지 public.ecr.aws/supabase/vector:0.53.0-alpine으로 Vector만 재생성했다. 원본 구성의 변환·로컬 Analytics sink는 유지했다.
- 새 설정 tmp/vector-local.yaml의 docker_host는 unix:///var/run/docker.sock이다. include_labels를 com.supabase.cli.project=sopo-isolated로 제한했다. 이 필터는 수집 범위 제한이며 Docker API 권한 자체를 축소하는 장치는 아니다.
- 소켓과 설정 파일은 모두 read-only bind mount다. Vector 관찰 API는 컨테이너 내부 127.0.0.1:9001에만 바인딩하고 호스트 포트를 게시하지 않았다. 새로운 DOCKER_HOST TCP 환경변수도 넣지 않았다.
- `vector validate --no-environment` 성공. 기존 router._unmatched 경고는 미사용 로그 분기이며 복구 중 새로 만든 오류가 아니다.

## 검증
- Vector running/healthy, 2분 이상 관찰 후 RestartCount=0.
- 내부 GraphQL sink 전송 카운터에서 로컬 Realtime 로그 8건 전달을 확인했다.
- 로컬 /auth/v1/health에 합성 쿼리 표식을 붙여 GET 요청했다. 응답 200, vector tap의 logflare_kong 입력에서 같은 표식 확인, 실제 sink sentEventsTotal 1→2 증가를 확인했다. 결과: tmp/vector-delivery-result.json.
- 첫 tap 시도는 관찰 명령 기본 포트가 실제 API와 달라 exit 69였다. 실제 9001을 지정해 재실행한 결과 exit 0으로 표식·전달 검증이 통과했다.
- HostConfig.PortBindings={}, 호스트 2375/2376 Listen 개수 0. 소켓/설정 RW=false를 확인했다.
- 기존 격리 DB/Realtime/Analytics healthy 및 Edge Runtime running을 확인했다. vercel.json crons=[](0건) 유지.

## 유지 및 복구 범위
- 수정은 로컬 컨테이너/설정/문서에만 한정했다. 운영 DB/스키마/실제 계정/환경변수/예약 작업/앱 소스/기존 스테이징은 변경하지 않았다. 배포/커밋/push도 하지 않았다.
- 실행 중 tmp/vector-local.yaml을 삭제하거나 원본 설정 파일로 덮어쓰지 않는다. 현재 컨테이너 재시작에는 bind mount 설정이 유지된다.
- Supabase CLI가 스택을 제거 후 다시 생성하면 Windows 기본 TCP 연결 설정이 돌아올 수 있다. 현재 복구는 CLI 생성 규칙 자체를 바꾼 것이 아니므로 그 경우 이 로컬 Unix 소켓 설정을 다시 적용하고 건강/전달/미노출을 재검증해야 한다. 이를 자동화하는 새 예약 작업은 만들지 않았다.
- CLI stop/start가 같은 프로젝트 라벨의 보존 컨테이너까지 관리할 수 있으므로 원본 설정/메타데이터 파일도 보관한다. 롤백은 별도 승인 시 새 컨테이너만 중지·제거하고 원본 이름/정책을 복원하는 방식이며 볼륨 삭제는 필요 없다. 원본으로 되돌리면 기존 TCP 연결 오류도 다시 나타날 수 있다.

공식 참고: [Vector Docker logs 소스](https://vector.dev/docs/reference/configuration/sources/docker_logs/).
