# 보안 및 유지보수 가이드 (Security & Maintenance Guide)

본 문서는 서울 지하철 광고 영업 관리 시스템의 보안 정책과 유지보수 절차를 정의합니다.

## 1. 보안 가이드 (Security)

### 1.1 인증 및 권한 관리 (Authentication & Authorization)
- **Supabase Auth**: 모든 사용자 인증은 Supabase Auth를 통해 처리되며, 이메일/비밀번호 방식을 기본으로 합니다.
- **Row Level Security (RLS)**: 데이터베이스 수준에서 사용자별 접근 권한을 제어합니다.
  - `leads`: 영업 담당자는 자신에게 배정된 리드만 수정할 수 있습니다 (기본 정책).
  - `user_settings`: 사용자는 자신의 설정만 조회/수정할 수 있습니다.
- **Role Guard**: 클라이언트 측에서 `RoleGuard` 컴포넌트를 사용하여 관리자/매니저 전용 UI(예: 데이터 삭제 버튼) 접근을 제한합니다.

### 1.2 API 키 및 환경 변수 (API Key Management)
- **서버 사이드 처리**: 공공데이터포털 API Key 등 민감한 키는 브라우저에 노출되지 않도록 Next.js API Routes(`src/app/api/`)를 통해서만 호출합니다.
- **환경 변수 (.env.local)**: 모든 비밀 키는 환경 변수로 관리하며, 소스 코드 저장소에 업로드하지 않습니다.
  - `LOCALDATA_API_KEY`: 인허가 데이터 조회용
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 클라이언트용 (제한적 권한)
  - `SUPABASE_SERVICE_ROLE_KEY`: 서버용 (관리자 권한, **절대 노출 금지**)

### 1.3 네트워크 보안
- **HTTPS**: 모든 통신은 HTTPS(TLS)를 통해 암호화됩니다.
- **CORS (Cross-Origin Resource Sharing)**: API 서버는 허용된 도메인에서의 요청만 수락하도록 설정합니다.

## 2. 유지보수 가이드 (Maintenance)

### 2.1 데이터 백업 및 복구 (Backup & Recovery)
- **자동 백업**: Supabase Pro 플랜 사용 시 매일 자동 백업이 수행됩니다. (Free 플랜의 경우 수동 백업 권장)
- **수동 백업**:
  ```bash
  # Supabase CLI를 이용한 데이터 덤프
  supabase db dump --db-url "YOUR_DB_URL" > backup_YYYYMMDD.sql
  ```
- **복구**: SQL Editor 또는 CLI를 통해 덤프 파일을 실행하여 복구합니다.

### 2.2 정기 점검 항목 (Routine Checkups)
1. **중복 데이터 정리**:
   - 주 1회 관리자 메뉴의 **[데이터 관리 > 중복 리드 삭제]** 기능을 실행하여 DB 정합성을 유지합니다.
2. **API 연결 상태 확인**:
   - 설정 메뉴의 **[API 연결 테스트]** 기능을 통해 공공데이터포털 API가 정상 응답하는지 확인합니다.
3. **인벤토리 최신화**:
   - 지하철 역사 광고 매체 변경 시, 엑셀 업로드 기능을 통해 `ad_inventory` 테이블을 최신화합니다.

### 2.3 트러블슈팅 (Troubleshooting)

| 증상 | 예상 원인 | 조치 방법 |
|---|---|---|
| **로그인 실패** | 이메일/비번 오류 또는 계정 미승인 | Supabase Auth 대시보드에서 계정 상태 확인 |
| **데이터 조회 안됨** | RLS 정책 차단 또는 API 키 만료 | 1. 사용자 Role 확인<br>2. 서버 로그에서 API 오류 메시지 확인 |
| **제안서 PDF 생성 실패** | 이미지 로딩 타임아웃 (CORS) | `next.config.js`의 이미지 도메인 허용 설정 확인 |
| **지도 표시 오류** | 좌표 변환 실패 (GRS80 -> WGS84) | 입력된 주소가 올바른지 확인하고 좌표 재변환 시도 |

### 2.4 로그 모니터링
- **Vercel Logs**: 배포 환경에서의 런타임 에러(500) 및 API 호출 로그를 확인합니다.
- **Supabase Logs**: 데이터베이스 쿼리 성능 및 Auth 관련 로그를 모니터링합니다.
