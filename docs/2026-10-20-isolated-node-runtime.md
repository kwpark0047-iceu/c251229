# 로컬 Node 엔진 경고 해소

## 원인과 적용 범위

- 전역 Node 24.12.0은 jsdom 30.0.1의 Node 요구사항
  `^22.22.2 || ^24.15.0 || >=26.0.0`을 충족하지 못한다.
- 공식 Node 24.22.0 Windows x64 ZIP을 공식 SHASUMS256.txt와 대조한 뒤
  `.local-state/runtimes`에 압축 해제했다. 설치 프로그램은 실행하지 않았다.
- 다운로드 출처: https://nodejs.org/dist/v24.22.0/
- 아카이브 SHA256과 런타임 경로는 해당 폴더의 `node-verified.json`에 기록한다.
- 전역 Node, 사용자/시스템 PATH, npm 설정, 의존성 버전 및 lockfile은 변경하지 않는다.

## 재실행

```powershell
& D:\c251229\scripts\verify-local-runtime.ps1
```

이 명령은 기존에 독립 설치와 무결성이 확인된
`tmp/release-safety-foundation-20261020-v6` 후보를 사용한다. 작업 폴더의
미반영 업무 기능 전체를 검증했다는 의미는 아니다.

검증 프로세스에만 portable Node 경로를 우선 적용하고 finally에서 복원한다.
실제 설치된 lockfile 패키지의 모든 Node engine 범위를 먼저 검사한다.
다른 아키텍처 전용으로 설치되지 않은 선택 의존성은 대상에서 제외한다.
엔진 요구사항을 완화하거나 경고를 숨기지 않는다.

기존 검증기가 type-check → lint → 로컬 도구 테스트 → 격리 DB 포함 test →
build → Chromium 순서로 실행하고 소스/의존성 무결성을 다시 검사한다.
DB는 고정된 로컬 sopo-isolated만 사용하며 합성 데이터 외 실제 계정은 사용하지 않는다.
운영 DB와 Vercel 설정에 접근하는 명령은 없고 예약 작업 `crons: []`를 유지한다.

이번 실행 로그: `tmp/release-safety-foundation-20261020-v6-logs/6f0f89b6-65cd-4862-9821-96687d592a1f/`.
최종 결과는 해당 results.json 및 검증 프로세스의 최종 종료 상태를 함께 확인한다.

## 최종 결과

- 검증기 종료 코드 0, `verified: true`. 사후 소스/설치 의존성 무결성 검사 통과.
- type-check, lint, build 통과. 로컬 도구 29건, 앱 테스트 347건
  (격리 DB 11건 포함), Chromium 3건 통과. 앱 테스트 건너뛰기 없음.
- 실제 설치 패키지 engine 불일치 0건, 이번 실행 로그의 EBADENGINE 경고 0건.
- 하위 `node` 실행 경로가 portable 디렉터리임을 확인했고 전역 Node는 24.12.0 유지.
- 기존 스냅샷에서 앞선 foundation 변경 4개 파일을 제외한 968개 파일 해시 모두 일치.
- 격리 DB의 잔여 `codex_test_%` 스키마 0개, Vector 실행 중/재시작 0회.
- 예약 작업 0개 유지. 운영 DB·스키마·실제 계정 변경 및 배포는 수행하지 않았다.
