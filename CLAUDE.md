# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

서울 지하철 광고 영업 시스템 - 지하철 광고 영업을 위한 리드 관리 애플리케이션. Next.js 15, React 19, TypeScript, Tailwind CSS 4, Supabase로 구축됨.

## 명령어

```bash
npm run dev      # 개발 서버 시작 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 검사
npm run start    # 프로덕션 서버 시작
```

## 아키텍처

### 기술 스택
- **프레임워크**: Next.js 16 (App Router)
- **데이터베이스**: Supabase (PostgreSQL + RLS)
- **스타일링**: Tailwind CSS 4 + 지하철 노선 색상용 CSS 변수
- **인증**: Supabase Auth (조직 기반 멀티테넌시)
- **외부 API**: LocalData.go.kr (사업자 인허가 데이터), KRIC (역사 편의시설 정보)
- **지도**: Leaflet + react-leaflet
- **PDF 생성**: jspdf + html2canvas
- **엑셀 처리**: xlsx
- **이메일**: Resend

### 경로 별칭
`@/*` → `src/*` (tsconfig.json에 정의)

### 주요 디렉토리
```
src/
├── app/
│   ├── lead-manager/       # 메인 애플리케이션
│   │   ├── page.tsx        # 대시보드 (리드 + 인벤토리 + 일정 탭)
│   │   ├── types.ts        # 모든 타입 정의
│   │   ├── constants.ts    # 지하철역 데이터, 좌표 변환 상수
│   │   ├── api.ts          # LocalData API 연동
│   │   ├── utils.ts        # 유틸리티 (좌표 변환, 거리 계산)
│   │   ├── supabase-service.ts   # 리드 CRUD 작업
│   │   ├── crm-service.ts        # CRM 기능 (통화, 제안서)
│   │   ├── inventory-service.ts  # 광고 인벤토리 관리
│   │   ├── proposal-service.ts   # 제안서 생성/관리
│   │   ├── task-service.ts       # 업무/스케줄 CRUD
│   │   ├── auth-service.ts       # 인증 헬퍼
│   │   └── components/
│   │       ├── crm/        # CRM 컴포넌트 (통화기록, 리드상세, 진행체크리스트)
│   │       ├── inventory/  # 인벤토리 컴포넌트 (테이블, 업로드모달)
│   │       ├── schedule/   # 스케줄 컴포넌트 (캘린더, 태스크보드, 폼모달)
│   │       └── *.tsx       # 뷰 컴포넌트 (그리드뷰, 리스트뷰, 지도뷰, 제안서폼 등)
│   ├── floor-plans/        # 역사 도면 페이지 (노선별 도면 뷰어, ZIP 다운로드)
│   ├── auth/               # 인증 페이지 (콜백 포함)
│   ├── contact/            # 문의 페이지
│   └── api/
│       ├── proxy/          # LocalData API용 CORS 프록시
│       ├── localdata/      # LocalData API 직접 연동
│       ├── backup/         # 데이터 백업 API
│       ├── floor-plans/    # 도면 업로드/다운로드 API
│       ├── ai-proposal/    # AI 제안서 생성
│       ├── send-proposal/  # 이메일 제안서 발송 (Resend 사용)
│       └── station-info/   # KRIC 역사 편의시설 정보 API
├── components/             # 공통 컴포넌트
│   ├── Providers.tsx       # 루트 프로바이더 래퍼
│   ├── ThemeProvider.tsx   # 다크모드 테마 제공자
│   └── ThemeToggle.tsx     # 테마 토글 버튼
└── lib/supabase/
    ├── client.ts           # 브라우저용 Supabase 클라이언트
    └── server.ts           # 서버용 Supabase 클라이언트
scripts/
└── upload-floor-plans.js   # 도면 일괄 업로드 스크립트
supabase/migrations/        # DB 마이그레이션 파일
middleware.ts               # 인증 미들웨어 (세션 관리, 라우트 보호)
```

### 배포
- **플랫폼**: Vercel (리전: icn1/서울)
- **설정**: `vercel.json` 참조

### 인증 흐름
- `middleware.ts`가 모든 요청을 가로채서 세션 관리
- `/lead-manager/*` 경로는 보호됨 (미인증 시 `/auth`로 리다이렉트)
- `/auth`에서 로그인 후 원래 요청 경로로 리다이렉트

### 데이터베이스 스키마
스키마는 `supabase-schema.sql`에 정의됨. 마이그레이션은 `supabase/migrations/`에 위치.
- 마이그레이션 네이밍: `YYYYMMDDHHMMSS_description.sql`
- 새 마이그레이션 생성 시 timestamp 순서 유지 필수

주요 테이블:
- `leads` - 사업장 리드 (위치, 상태, 인근역 정보)
- `ad_inventory` - 광고매체 인벤토리 (역, 유형, 가격)
- `proposals` - 리드에 연결된 제안서
- `call_logs` - CRM 통화 기록
- `sales_progress` - 영업 파이프라인 단계
- `user_settings` - 사용자별 API 설정
- `floor_plans` - 역사 도면 (노선별, 층별)
- `floor_plan_ad_positions` - 도면 위 광고 위치 마커
- `tasks` - 업무/스케줄 관리 (전화, 미팅, 제안서, 후속, 계약)

### 데이터 흐름
1. LocalData.go.kr API에서 사업자 인허가 데이터 조회
2. proj4를 사용하여 EPSG:5174/5181 (한국 TM) 좌표를 WGS84로 변환
3. 각 리드에 대해 가장 가까운 지하철역 계산 (Haversine 공식)
4. 중복 체크 (biz_name + road_address) 후 Supabase에 저장
5. RLS 정책을 통한 조직별 데이터 격리

### 좌표 변환
`constants.ts`에 정의된 proj4 변환 설정:
- EPSG:5174 - 중부원점TM (Bessel 타원체, 서울/경기)
- EPSG:5181 - 중부원점TM (GRS80 타원체)
- WGS84 - 표준 GPS 좌표계

### 업종 카테고리
LocalData 서비스 ID가 매핑된 7개 카테고리 (`types.ts`의 `CATEGORY_SERVICE_IDS`):
- HEALTH (건강): 병원, 의원, 약국, 안경점
- ANIMAL (동물): 동물병원, 펫샵, 미용
- FOOD (식품): 음식점, 식품제조
- CULTURE (문화): 공연장, 게임장, 노래방
- LIVING (생활): 숙박, 미용실, 체육시설
- ENVIRONMENT (자원환경): 환경시설
- OTHER (기타)

### 리드 상태 흐름
`NEW (신규)` → `PROPOSAL_SENT (제안 발송)` → `CONTACTED (컨택 완료)` → `CONTRACTED (계약 성사)`

## 환경 변수

`.env.local`에 필요한 변수:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
LOCALDATA_API_KEY=           # LocalData.go.kr API 키 (서버사이드 전용)
RESEND_API_KEY=              # 이메일 발송용 (선택)
STATION_INFO_API_KEY=        # KRIC 역사별 정보 API 키 (서버사이드 전용)
```

## 컨벤션

### 네이밍
- 코드베이스 전체에 한글 주석 사용
- DB 컬럼: snake_case
- TypeScript: camelCase
- 타입 정의는 `types.ts`에 모아서 관리

### 스타일링
- 지하철 노선 색상용 CSS 변수 (`--metro-line1` ~ `--metro-line9`)
- `glass-card` 클래스를 사용한 글래스모피즘 효과
- 디자인 테마: "Neo-Seoul Transit"
- 다크모드: ThemeProvider로 지원

### API 처리
- LocalData API 호출을 위한 CORS 프록시 (`/api/proxy`)
- 다중 폴백 CORS 프록시 설정 (constants.ts의 `CORS_PROXIES`)
- Rate Limiting 방지를 위한 API 호출 간 200ms 지연
- 배치 저장 시 50건씩 처리

### 서비스 레이어 패턴
각 기능별 서비스 파일 분리:
- DB↔TS 변환 헬퍼 함수 (`dbToXxx`, `xxxToDb`)
- snake_case (DB) ↔ camelCase (TS) 변환 일관성 유지
