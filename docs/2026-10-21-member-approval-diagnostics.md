# 회원 승인 실패 진단 보강

## 승인된 변경

회원 승인 PATCH 저장 오류와 예외에 비식별 진단을 추가했다.
권한 검사, 본인/최고관리자 보호, 동시 수정 조건, 승인 저장 payload는 유지했다.
실패 시 서비스 권한 재시도, 컬럼 생략, 자동 재시도는 추가하지 않았다.

서버 로그는 `[AdminMemberPatch]`와 다음 필드만 기록한다.

- event: member_status_failed
- stage: save 또는 unexpected
- category: SCHEMA_CONFIGURATION / PERMISSION_CONFIGURATION /
  DATA_CONFLICT / DATABASE_UNAVAILABLE / UNKNOWN
- databaseCode: 명시적으로 허용한 PostgreSQL·PostgREST 코드 또는 UNKNOWN
- requestId: 서버가 새로 발급한 UUID (회원 ID나 요청 헤더를 사용하지 않음)

이메일, 회원 ID, 인증키, 오류 message/details/hint/stack, 요청 본문은 기록하지 않는다.
응답에는 안전한 한글 안내, errorCode, requestId와 X-Request-ID 헤더를 넣는다.
기존 확인창은 message의 문의번호를 표시한다. 알려지지 않은 코드도 원문 대신
UNKNOWN으로 처리하며, 결과 불확실 시 재승인보다 목록 상태 확인을 안내한다.

일반 사용자 권한 실패는 기존 403, 미로그인은 401 등 기존 사전 검사를 유지한다.
저장 설정/권한 설정 및 연결 장애는 503, 참조·제약 충돌은 409, 미분류는 500이다.
설정 오류 분류는 운영 DB의 실제 원인을 확정했다는 의미가 아니다.

## 검증

- 최초 회귀 테스트 RED: 기존 17건 통과, 새 7건 실패 확인.
- 이후 알려진 코드 전체와 미등록/프로토타입 코드까지 테스트를 확대했다.
- 전체 타입 검사 통과.
- 변경한 소스/테스트 4개 파일의 ESLint 통과 (규칙 완화 없음).
- 회원 API·인증 서비스·승인 확인창·최고관리자 화면 4개 파일, 84건 통과.
- 로그: `tmp/functional-audit-20261021/approved-results.json` 및 approved-*.log.
- 문의번호 표시, 실패 시 메일/감사 후속 처리 없음, 자동 재시도 없음,
  DB 원문/이메일/사용자 ID 비노출을 검증했다.

## 미완료와 운영 경계

배포, 운영 DB·스키마·실제 계정 변경, Docker 재시작은 수행하지 않았다.
예약 작업은 기존 crons 빈 배열을 유지한다.
운영 500의 원인은 새 진단이 운영에 반영되고 실제 코드가 확인되기 전까지 미확정이다.
이번 검증은 mock 기반이며 격리 DB 실연동 성공이나 전체 build 성공을 주장하지 않는다.
이전 전체 검사에서 발견된 생성물 lint 오류, 제안서 접근성 2건,
Docker ETIMEDOUT과 격리 DB 11건 미실행은 별도 미해결 항목이다.
