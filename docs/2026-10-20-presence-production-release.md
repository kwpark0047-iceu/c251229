# 실시간 활성 계정 표시 운영 반영

## 배포 대상

- 프로젝트: `park-kang-wons-projects/c251229`
- 프로젝트 ID: `prj_RIVAmMIalvSUfp0tBweZuywMsawj`
- 배포 ID: `dpl_HLk4z6AoFknUZeMBrUedFL9wK6Sr`
- 운영 주소: https://wemarketad.vercel.app
- 유지된 기존 주소: https://c251229-three.vercel.app
- 롤백 기준 이전 배포: `dpl_DdqZT7FJtZFgCDy9YPAZZMdJaKhq`
- 검증 사본: `D:/c251229/tmp/presence-release-20261020`
- 소스 명세 SHA-256: `5245c6d3e2dfa6e9abbdb08dad8f37a49715534b5c5429e1e3c17f66c76f835b`

현재 작업 폴더의 미반영 변경을 한꺼번에 배포하지 않았다. 직전 운영 릴리스에서
분리한 CI·cron 인증 보강 및 Presence 개선 사본을 검증하고 배포했다.
로컬 Vector 복구 도구나 DB 마이그레이션은 이번 웹 배포에 포함하지 않았다.

## 검증 결과

- 실제 격리 Realtime: 3개 클라이언트/2개 합성 계정 중복 제거, 연결 해제·재접속과
  재등록, 일부 탭 이탈 시 유지, 마지막 탭 이탈 시 제거, 같은 클라이언트 재마운트 통과.
- 격리 DB: 저장·재조회, 상태 변경, 인벤토리, 통화 기록, 제안서, 조직별 접근 제한,
  익명·일반 회원 제한 및 제약조건 검증 11건 통과.
- 최종 실행 순서: type-check → lint → test → build, 모두 종료 코드 0.
- 전체 테스트: 46개 파일, 347건 통과. 격리 DB 11건 포함, 건너뛴 테스트 없음.
- Chromium 격리 스모크: 랜딩·보호 페이지 리다이렉트·cron 인증 차단 3건 통과.
- 단계 배포: READY/production, 소스 명세 해시 일치, cron 배열 0건 확인 후 승격.
- 승격 후 두 도메인 모두 새 배포 ID 연결 확인.
- 운영 HTTPS GET 8건: 로그인 화면 200, 미인증 보호 페이지 307,
  두 cron 경로 미인증 요청 401 확인.
- 별도 빈 Chromium 세션에서 외부 API 및 GET 외 요청을 차단한 채 두 도메인의
  로그인 버튼 렌더링과 페이지 오류 0건 확인. 실제 계정 로그인은 하지 않았다.
- Vercel 프로젝트의 cron 배포 ID가 새 배포와 일치하고 정의는 0건이다.

## 진단 및 제한

최초 전체 테스트는 다중 워커에서 ESLint 정책 검사 1건이 30초 제한을 초과했다.
해당 파일을 단일 워커로 실행하자 7건이 통과했고, 전체도 단일 워커에서 347건이
통과했다. 제한 시간·검사 규칙·검증 대상을 완화하거나 테스트를 건너뛰지 않았다.

브라우저의 기본 C: 캐시 경로에는 실행 파일이 없어 기존 D: 캐시
`D:/DevCaches/playwright`를 명시했다. 재설치나 캐시 삭제는 하지 않았다.
로그인 페이지는 클라이언트 렌더링이므로 HTML 문자열 검사가 아닌 실제 브라우저로
UI를 확인했다. 로컬 빌드의 다중 lockfile 루트 추론 경고는 비치명적이며,
분리 소스를 업로드한 Vercel 원격 빌드도 통과했다.

DB 테스트는 실행별 소유권 표식이 있는 전용 합성 스키마/정책을 사용하고 정리한다.
운영 DB 정책이나 실제 계정에 대한 실검증을 의미하지 않는다. 운영 DB·스키마·계정,
환경변수는 변경하지 않았고, 실제 로그인/승인/삭제/동기화는 실행하지 않았다.
기존 작업 폴더 변경은 보존했고 커밋·푸시는 하지 않았다.

## 검증 기록

- `tmp/presence-redeploy-{db,type-check,lint,test,build,browser}.log`
- `tmp/presence-redeploy-source-manifest.json`
- `tmp/presence-redeploy-staged.json`
- `tmp/presence-redeploy-{stage,promote}.log`
- `tmp/presence-redeploy-http.json`

기록 파일은 로컬 확인 용도이며 전체를 외부에 공개하지 않는다.
