# 커밋·푸시 및 운영 배포 시도

- 커밋 작성자: wemarket (이번 커밋에만 적용, 전역 설정 변경 없음).
- 기능 커밋: 3580fe8.
- 품질 커밋: 1ad51bf.
- GitHub: kwpark0047-iceu/c251229, master 일반 푸시 완료.
- tmp, 환경 파일, 키 보관 파일, 운영 DB·스키마·실제 계정은 변경/업로드하지 않았다.

## 첫 후보 배포 실패와 수정

프로젝트 c251229, 팀 park-kang-wons-projects에 `--prod --skip-domain`으로 배포했다.
후보 URL: https://c251229-mw67md904-park-kang-wons-projects.vercel.app

빌드가 소스 디렉터리를 찾지 못해 실패했다. 기존 `.vercelignore`의 `!/src/`는
파일 경로 자체에는 허용처럼 보였으나 업로더가 조회하는 부모 경로 `src`를 허용하지
못했다. public도 동일했다. 8개 루트 파일만 전달된 것이 빌드 로그에서 확인됐다.

공식 allowlist 예시에 맞춰 `!src`, `!public`로 부모 탐색을 허용하고 하위 허용과
환경 파일/테스트/키/로그 제외를 유지했다. release-policy 템플릿도 동기화했다.
https://vercel.com/docs/deployments/vercel-ignore

회귀 테스트: 최초 6개 실패/15개 통과에서 수정 후 21개 전체 통과.
타입 검사, 변경 테스트 린트, 로컬 도구 29개도 통과했다.

## 보안 감사로 운영 전환 보류

Vercel npm install의 경고를 확인해 lockfile 기준 production-only npm audit를 실행했다.
직접 운영 의존성의 전이 패키지 follow-redirects 1.16.0이 높은 등급 1개 패키지로
보고됐으며 다음 두 advisory가 연결된다. 실제 운영에서 악용됐다는 의미는 아니다.

- https://github.com/advisories/GHSA-q3jh-wrc6-jgq8
- https://github.com/advisories/GHSA-8r9p-f939-6h3c

두 advisory 모두 영향 범위는 >=1.16.0 <1.16.1, 수정 버전은 1.16.1이다.
의존성 변경은 아직 적용하지 않았고 보안 패치·격리 재검증 후 배포를 요청했다.
수정 검증 완료 전 운영 도메인을 새 후보로 전환하지 않는다.
이 감사는 전체 개발 의존성 경고가 0이라는 뜻이 아니다.

운영 도메인 wemarketad.vercel.app의 기존 기준 배포:
dpl_HLk4z6AoFknUZeMBrUedFL9wK6Sr. 예약 작업 definitions는 빈 배열이다.
격리 DB 11건의 Docker 무응답 문제도 기존 미검증 위험으로 남아 있다.
