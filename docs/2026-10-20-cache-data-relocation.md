# C 드라이브 데이터 D 이전

- 사용자 요청의 대안인 다른 데이터 이전으로 npm 다운로드 캐시를 D:\DevCaches\npm으로 이전했다. Docker VHD는 직접 이동하거나 변경하지 않았다.
- 원본 C:\Users\user\AppData\Local\npm-cache\_cacache를 복사했다. Robocopy 결과 20,961개 파일, 약 7.592GiB, 실패/불일치 0건. 후속 읽기 전용 비교 exit 0.
- D 복사본에서 npm cache verify 성공: 8,367개 콘텐츠 4,912,742,121바이트 검증, 미참조 콘텐츠 3,223,587,521바이트 정리. C 원본은 검증 완료까지 유지했다.
- npm 사용자 cache 설정을 D:\DevCaches\npm으로 변경한 뒤 조회값을 확인했다. 원본 절대경로·재분석지점 아님을 확인한 후 C의 _cacache만 정리했다. _npx 실행 도구는 C에 보존했다.
- 최종 C 여유 9,268,539,392바이트(약 8.63GiB), D 여유 563,611,168,768바이트. 파일 크기와 실제 디스크 확보량은 다를 수 있다.
- 프로젝트 소스/운영 DB/스키마/실제 계정/Vercel 예약 작업은 변경하지 않았다. Edge Runtime 재검증은 이번 이전 작업에서 수행하지 않았으며 정상 복구를 의미하지 않는다.
- Docker 자체 이전은 공식 Settings > Resources > Advanced의 Disk image location으로 수행해야 한다. 현재 제어 도구는 네이티브 Windows 앱 조작을 지원하지 않아 VHD 직접 이동/설정 파일 수정을 우회 수행하지 않았다.
