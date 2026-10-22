# 실시간 계정 표시 연결 및 수명주기 고도화

## 승인 설계와 범위
- 승인받은 연결 상태 UI 포함 방식으로 구현했다. 다중 탭 계정 중복 제거, 마지막 탭 이탈, 재접속 재등록, 늦은 응답 무시, 로그아웃/계정 전환 정리를 포함한다.
- 기존 소스 변경/스테이징은 되돌리거나 커밋하지 않았다. 현재 루트의 SOPO/제안서 변경도 보존했다.
- 검증 후보 D:\c251229\tmp\presence-release-20261020은 앞 단계 ci-foundation-release-20261020에 이번 Presence 변경만 추가했다. 메인 page.tsx는 SOPO 변경을 제외한 Presence 관련 hunk만 반영했다.

## 구현
- online-presence.ts: Presence 키는 SDK의 탭별 기본 키를 사용하고 표시 계정은 user_id로 중복 제거한다. 등록 확인 및 sync 이후에만 connected가 된다.
- 연결 상태: connecting/connected/reconnecting/unavailable/disconnected. 오류 때 목록을 비우되 연결 상태를 따로 전달하여 실제 0명과 확인 불가를 구분한다.
- 등록 시도별 generation 및 disposed로 이전 연결의 늦은 성공/실패와 종료 후 이벤트를 무시한다. 정리는 멱등이며 비동기 제거 실패가 미처리 예외가 되지 않게 한다.
- 설치된 SDK가 같은 topic의 채널을 재사용함을 확인했다. WeakMap으로 해당 클라이언트의 이전 removeChannel 완료를 기다려 StrictMode/빠른 재마운트의 채널 재사용 경쟁을 막는다.
- use-online-presence.ts: 메인/관리자 페이지가 같은 훅을 사용한다. 계정별 snapshot과 active 수명주기를 확인해 이전 계정 목록/콜백이 새 계정에 표시되지 않게 한다.
- PresenceIndicator.tsx와 관리자 카드: 정상 연결만 인원을 표시하고 비정상 상태는 '—'와 한글 상태를 표시한다. 정상/비정상 배지 색상을 구분하고 인원 안내에 live region을 적용했다.
- 기존 공개 online-users topic을 유지했다. Presence는 클라이언트가 보고한 접속 추정치이며 권한/감사 근거가 아니다. 이번에 Realtime 정책이나 운영 DB 스키마를 변경하지 않았다.

## 테스트 및 실연동
- RED: tmp/presence-red.log에서 신규 수명주기 5건 실패를 확인한 뒤 구현했다. 같은 클라이언트 재마운트 경쟁도 tmp/presence-remount-red.log에서 추가 실패를 확인했다.
- 최종 집중 테스트 12건 통과: 여러 탭 중복 제거/마지막 탭 이탈, track+sync 대기, 재접속 재등록, 이전 연결의 늦은 실패, 정리 후 늦은 성공, 등록 예외, 멱등 정리, 같은 클라이언트 재마운트, 로그아웃/재로그인, 다른 계정 전환, UI의 0명/확인 불가 구분 등.
- 실제 로컬 Realtime 전송도 검증했다. sopo-isolated만 데이터 보존 기본 stop/start로 재기동해 누락된 Realtime을 시작했다. --all/--no-backup/볼륨 삭제/공장 초기화는 사용하지 않았다.
- tmp/verify-presence-local.cjs는 로컬 컨테이너 프로젝트 라벨과 127.0.0.1:54321을 확인한 뒤 로컬 익명 키를 메모리에서만 사용한다. 회원 가입/로그인이나 Auth 계정 생성 없이 3개 클라이언트에 합성 user_id를 전송했다.
- 실전송 통과: 3탭=2계정, 소켓 disconnect/connect 후 재등록, 한 탭 이탈 시 계정 유지, 마지막 탭 이탈 시 제거, 같은 클라이언트의 비동기 정리 직후 재마운트. 로그: tmp/presence-local-transport-final.log. finally에서 채널 정리 및 연결 종료를 수행했다.

## 최종 순차 검증
- 재마운트 경쟁 수정 후 확정된 후보로 type-check → lint → 격리 DB 포함 전체 test → build를 다시 순서대로 실행했다.
- 모두 exit 0. lint 경고/오류 출력 없음. 전체 46개 파일, 347건 통과, 실패/스킵 0건. 합성 SQL/RLS 계약 DB 테스트 11건 포함.
- 로그: tmp/presence-verified-type-check.log, tmp/presence-verified-lint.log, tmp/presence-verified-test.log, tmp/presence-verified-build.log. 실제 전송 검증과 목 기반 상태 경합 테스트는 서로 다른 증거로 기록했다.
- 빌드 기반 격리 Chromium 스모크 3건도 통과했다(랜딩/보호 경로/미인증 cron 차단). 로그: tmp/presence-verified-browser.log.
- 검토 에이전트의 읽기 전용 독립 검토에서 이번 Presence 범위의 구체적인 추가 결함이 보고되지 않았다. 이는 테스트를 대체하지 않는다.

## 운영 안전 및 제한
- 운영 DB/스키마/실제 계정/환경변수/예약 작업을 변경하지 않았다. vercel.json의 crons=[] 유지. 배포/커밋/push는 하지 않았다.
- 현재 작업 폴더 전체 미반영 기능의 검증 결과가 아니다. 이전 CI 보강과 이번 Presence 기능만 포함한 후보에 대한 결과다.
- DB 계약 11건은 실행별 합성 스키마 테스트이며 운영 RLS 정책 동일성을 입증하지 않는다. 실전송도 로컬 익명 키/합성 ID로 확인했으며 실제 운영 계정을 사용하지 않았다.
- 로컬 Realtime 서버가 이탈을 전파한 뒤 화면에 반영된다. 강제 종료/네트워크 단절은 서버의 heartbeat 감지 지연이 있을 수 있어 즉시 이탈을 보장하지 않는다.
- 종료 시 DB/Realtime healthy 및 Edge Runtime running을 확인했다. 부가 로그 수집기 vector는 Restarting 상태로 관측됐으며 이번 Presence 범위에서 원인/복구를 검증하지 않았다. 이를 해결하려고 Docker API를 외부에 노출하거나 운영 설정을 변경하지 않았다.
