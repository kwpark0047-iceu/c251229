# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

서울 지하철 광고 영업 시스템 - 지하철 광고 영업을 위한 리드 관리 애플리케이션. Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase로 구축됨.

## 명령어

```bash
npm run dev      # 개발 서버 시작 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 검사
npm run start    # 프로덕션 서버 시작
npx tsc --noEmit # 타입 체크 (빌드 없이)
```

## 아키텍처

### 기술 스택
- **프레임워크**: Next.js 16 (App Router)
- **데이터베이스**: Supabase (PostgreSQL + RLS + Storage)
- **스타일링**: Tailwind CSS 4 + 지하철 노선 색상용 CSS 변수
- **인증**: Supabase Auth (조직 기반 멀티테넌시)
- **외부 API**: LocalData.go.kr (사업자 인허가 데이터), KRIC (역사 편의시설 정보)
- **지도**: Leaflet + react-leaflet
- **PDF 생성**: jspdf + html2canvas
- **엑셀 처리**: exceljs
- **ZIP 다운로드**: jszip
- **이메일**: Resend

### 경로 별칭
`@/*` → `src/*` (tsconfig.json에 정의)

### 주요 디렉토리
```
src/app/
├── lead-manager/           # 메인 애플리케이션 (인증 필요)
│   ├── page.tsx            # 대시보드 (리드 + 인벤토리 + 일정 탭)
│   ├── types.ts            # 모든 타입 정의
│   ├── constants.ts        # 지하철역 데이터, 좌표 변환 상수
│   ├── *-service.ts        # 기능별 서비스 레이어
│   └── components/
│       ├── crm/            # CRM (통화기록, 리드상세, 진행체크리스트)
│       ├── inventory/      # 광고 인벤토리 관리
│       └── schedule/       # 스케줄 (캘린더, 태스크보드, 폼모달)
├── floor-plans/            # 역사 도면 페이지 (노선별 도면 뷰어, ZIP 다운로드)
│   ├── types.ts               # 도면 관련 타입 정의
│   ├── floor-plan-service.ts  # 도면 메타데이터 CRUD
│   └── storage-service.ts     # Supabase Storage 파일 관리
├── contact/                # 문의 페이지
├── auth/                   # 인증 페이지
└── api/                    # API 라우트
    ├── proxy/              # LocalData API용 CORS 프록시
    ├── localdata/          # LocalData API 직접 호출
    ├── ai-proposal/        # AI 제안서 생성
    ├── send-proposal/      # 이메일 제안서 발송 (Resend)
    ├── station-info/       # KRIC 역사 편의시설 정보
    ├── backup/             # 데이터 백업/복원
    └── floor-plans/        # 도면 업로드/다운로드
src/lib/
├── supabase/
│   ├── client.ts           # 브라우저용 Supabase 클라이언트 (동기 createClient)
│   └── server.ts           # 서버용 Supabase 클라이언트 (비동기 await createClient)
└── kric-api.ts             # KRIC 역사 정보 API 래퍼
supabase/migrations/        # DB 마이그레이션 (YYYYMMDDHHMMSS_description.sql)
```

### Supabase 클라이언트 사용법
- **클라이언트 컴포넌트** (`'use client'`): `import { createClient } from '@/lib/supabase/client'` (동기 호출)
- **서버 컴포넌트/API 라우트**: `import { createClient } from '@/lib/supabase/server'` (비동기 `await createClient()`)

### 서비스 레이어 패턴
각 기능별 `*-service.ts` 파일이 Supabase CRUD 로직을 캡슐화:
- `supabase-service.ts` - 리드 CRUD, 설정, 통계
- `inventory-service.ts` - 광고 인벤토리 CRUD
- `crm-service.ts` - 통화 기록, 영업 진행상황
- `proposal-service.ts` - 제안서 CRUD
- `task-service.ts` - 업무/스케줄 CRUD
- `auth-service.ts` - 조직 멤버 조회, 사용자 정보
- `station-info-service.ts` - KRIC 역사 정보 캐싱

### 인증 및 멀티테넌시
- `middleware.ts`가 세션 관리 및 라우트 보호
- `/lead-manager/*` 보호됨 → 미인증 시 `/auth`로 리다이렉트
- 조직(organization) 기반 데이터 격리: 사용자는 `organization_id`로 그룹화
- RLS 정책이 조직별 데이터 접근 제어
- `get_user_organization_ids()` SQL 함수로 RLS 무한 재귀 방지

### 데이터베이스 주요 테이블
- `leads` - 사업장 리드 (위치, 상태, 인근역, assigned_to)
- `ad_inventory` - 광고매체 인벤토리 (역, 유형, 가격)
- `proposals` - 리드 연결 제안서
- `call_logs` - CRM 통화 기록
- `tasks` - 업무 스케줄 (유형: CALL, MEETING, PROPOSAL, FOLLOW_UP, CONTRACT)
- `floor_plans` / `floor_plan_ad_positions` - 역사 도면 및 광고 위치
- `organizations` / `organization_members` - 멀티테넌시 조직 관리

### Supabase Storage
- `floor-plans` 버킷: 역사 도면 이미지 저장 (노선/역명별 폴더 구조)

### 데이터 흐름
1. LocalData.go.kr API에서 사업자 인허가 데이터 조회
2. proj4로 EPSG:5174/5181 → WGS84 좌표 변환
3. Haversine 공식으로 가장 가까운 지하철역 계산
4. 중복 체크 (biz_name + road_address) 후 저장

### 리드 상태 흐름
`NEW` → `PROPOSAL_SENT` → `CONTACTED` → `CONTRACTED`

### 업종 카테고리
HEALTH, ANIMAL, FOOD, CULTURE, LIVING, ENVIRONMENT, OTHER - 각각 `CATEGORY_SERVICE_IDS`에 LocalData API 서비스 ID 매핑됨

## 환경 변수

`.env.local` 필수:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
LOCALDATA_API_KEY=           # LocalData.go.kr (서버사이드)
RESEND_API_KEY=              # 이메일 제안서 발송용
KRIC_API_KEY=                # KRIC 역사 정보 API (서버사이드)
```

## 컨벤션

- 한글 주석 사용
- DB: snake_case / TypeScript: camelCase
- 타입은 각 기능 폴더의 `types.ts`에 정의
- 서비스 레이어: DB 스키마(snake_case) ↔ TS 인터페이스(camelCase) 변환을 인라인으로 처리 (예: `row.biz_name` → `bizName`)
- 지하철 노선 색상: CSS 변수 `--metro-line1` ~ `--metro-line9`
- 글래스모피즘: `glass-card` 클래스
- 다크모드: ThemeProvider 지원
- LocalData API: Rate limiting 방지 200ms 지연, 배치 저장 50건씩
- 좌표계: `constants.ts`의 `PROJ4_DEFS`에 EPSG:5174, EPSG:5181, EPSG:5179, WGS84 정의
