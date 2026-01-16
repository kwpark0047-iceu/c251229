# 기술 스택 및 아키텍처 문서

## 1. 기술 스택 (Technology Stack)

### Frontend
- **Framework**: [Next.js 16.1.1](https://nextjs.org/) (App Router 사용)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **UI System**:
  - **Icons**: `lucide-react`
  - **Visualization**: `recharts` (차트), `react-leaflet` (지도)
  - **Components**: `react-window` (대용량 리스트 가상화)

### Backend & Database
- **BaaS (Backend as a Service)**: [Supabase](https://supabase.com/)
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Client Library**: `@supabase/ssr`, `@supabase/supabase-js`

### External APIs
- **LocalData API**: 공공데이터포털 인허가 데이터 연동 (병원, 약국 등)
- **Kakao Map / OpenStreetMap**: 지도 및 위치 기반 서비스 (`leaflet` 활용)

### Utilities
- **PDF Generation**: `jspdf`, `html2canvas` (제안서 자동 생성)
- **Excel Processing**: `exceljs` (데이터 업로드/다운로드)
- **Date Handling**: `date-fns`
- **Email Service**: `resend` (이메일 발송)

### Testing & Quality Assurance
- **Unit Testing**: `vitest`, `@testing-library/react`
- **E2E Testing**: `playwright`
- **Linting**: `eslint`

## 2. 시스템 아키텍처 (System Architecture)

### 전체 구조도
```mermaid
graph TD
    Client[Web Client (Next.js)]
    Supabase[Supabase Platform]
    ExtAPI[External APIs]

    subgraph ClientLayer [Client Layer]
        Auth[Auth Module]
        UI[UI Components]
        Services[Service Modules]
    end

    subgraph SupabaseLayer [Supabase Layer]
        AuthSvc[Auth Service]
        DB[(PostgreSQL)]
        Storage[Storage]
    end

    Client -->|API Requests| Supabase
    Client -->|Fetch Data| ExtAPI
    Auth --> AuthSvc
    Services --> DB
    Services --> Storage
```

### 데이터 흐름 (Data Flow)
1. **리드 수집**:
   - `fetchLocalDataAPI`: 공공데이터포털에서 인허가 데이터를 조회합니다.
   - `saveLeads`: 조회된 데이터를 Supabase DB에 저장하며, 이 과정에서 **중복 데이터 필터링**(`deduplication-utils`)이 수행됩니다.
2. **영업 관리**:
   - 사용자는 대시보드에서 리드 목록을 조회하고 상태(`NEW` -> `CONTACTED` 등)를 변경합니다.
   - 위치 기반(`leaflet`)으로 리드를 시각화하고, 가까운 지하철역 정보를 매칭합니다.
3. **제안 및 계약**:
   - `proposal-service`: 리드 정보와 도면 이미지를 결합하여 PDF 제안서를 생성합니다.
   - 생성된 제안서 및 계약 정보는 DB에 기록됩니다.

## 3. 폴더 구조 (Folder Structure)

```
src/
├── app/                      # Next.js App Router root
│   ├── lead-manager/         # 핵심 비즈니스 로직(Lead Manager)
│   │   ├── admin/            # 관리자 기능
│   │   ├── components/       # 도메인 전용 컴포넌트
│   │   │   ├── crm/          # CRM 관련 (LeadDetailPanel 등)
│   │   │   ├── inventory/    # 인벤토리 관리
│   │   │   └── schedule/     # 일정 관리
│   │   ├── api.ts            # 외부 API 연동
│   │   ├── supabase-service.ts # DB CRUD 서비스
│   │   ├── inventory-service.ts # 인벤토리 서비스
│   │   └── types.ts          # 타입 정의
│   ├── layout.tsx            # 루트 레이아웃
│   └── page.tsx              # 홈 페이지
├── components/               # 공통 UI 컴포넌트 (버튼, 모달 등)
├── lib/                      # 유틸리티 라이브러리 (Supabase client 등)
└── ...
```

## 4. 핵심 모듈 설명

- **`LeadDetailPanel.tsx`**: 리드의 상세 정보를 표시하는 핵심 컴포넌트입니다. 최근 리팩토링을 통해 `StationFloorPlans`(도면 보기) 컴포넌트가 분리되었습니다.
- **`inventory-service.ts`**: 지하철 역사 광고 인벤토리와 도면 데이터를 관리합니다.
- **`supabase-service.ts`**: 리드 데이터의 저장, 조회, 중복 제거 등 DB와 직접 상호작용하는 로직을 담당합니다.
