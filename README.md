# 서울 지하철 광고 영업 관리 시스템 (Lead Manager)

LocalData 기반의 병원/의원 인허가 데이터를 활용하여 지하철 광고 영업 리드를 관리하고, 제안서 작성 및 영업 활동을 지원하는 통합 대시보드 시스템입니다.

## 🚀 주요 기능

### 1. 리드 관리 (CRM)
- **LocalData 연동**: 공공데이터포털, 서울열린데이터광장, 경기도 공공데이터의 인허가 데이터를 실시간으로 조회하고 DB에 저장합니다.
- **중복 데이터 방지**: 상호명, 주소, 전화번호, 이메일주소, 사업자등록번호 등을 복합적으로 분석하여 중복 리드를 자동으로 필터링합니다.
- **다양한 뷰 모드**:
  - **그리드 뷰**: 카드 형태의 직관적인 리드 목록
  - **리스트 뷰**: 엑셀 스타일의 데이터 밀집형 뷰
  - **지도 뷰**: 위치 기반의 리드 분포 및 역세권 분석

### 2. 지하철 역사 데이터 연동
- **역세권 매칭**: 리드 위치를 기반으로 가장 가까운 지하철역을 자동 매칭합니다.
- **역사 도면 확인**: 각 역사의 광고 인벤토리 및 도면(Floor Plan)을 리드 상세 페이지에서 바로 확인할 수 있습니다.
- **시설 정보**: 역사의 편의시설 및 출구 정보를 제공합니다.

### 3. 영업 활동 지원
- **제안서 생성**: 리드 데이터를 기반으로 맞춤형 PDF 제안서를 자동 생성합니다. (도면 포함)
- **일정 관리**: 캘린더 및 칸반 보드 형태의 일정 관리 기능을 제공합니다.
- **통화/방문 기록**: 영업 활동 이력을 체계적으로 기록하고 관리합니다.

### 4. 관리자 기능
- **데이터 관리**: 중복 데이터 정리, 인벤토리 업로드(Excel) 등의 관리 기능을 제공합니다.
- **사용자 관리**: 영업 사원별 권한 및 활동을 관리할 수 있습니다.

## 🛠 기술 스택

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + RLS + Storage)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI/UX**: Antigravity Design System (Glassmorphism, Floating UI)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Testing**: [Vitest](https://vitest.dev/) (Unit/Integration Test)

## 🏁 시작하기

### 1. 환경 설정

`package.json`에 정의된 의존성을 설치합니다.

```bash
npm install
# or
yarn install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 필요한 환경 변수를 설정합니다. (`.env.example` 참조)

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
LOCALDATA_API_KEY=your_api_key
RESEND_API_KEY=your_resend_api_key
KRIC_API_KEY=your_kric_api_key
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하여 확인합니다.

## 📂 프로젝트 구조

```text
src/
├── app/
│   ├── lead-manager/       # 메인 애플리케이션 (Lead Manager)
│   │   ├── components/     # UI 컴포넌트 (CRM, Inventory, Schedule 등)
│   │   ├── api.ts          # LocalData API 연동
│   │   ├── supabase-service.ts # DB 서비스 로직
│   │   └── page.tsx        # 메인 대시보드 페이지
│   └── ...
├── components/             # 공통 UI 컴포넌트
├── lib/                    # 유틸리티 및 설정 (global.antigravity.config.ts 포함)
└── ... 생략 ...

scripts/
├── archive/                # 일회성 스크립트 보관 (수동 실행, 더 이상 사용 안 함)
└── (데이터 파이프라인 스크립트)  # 데이터 임포트/동기화/업로드/검증 (예: sync-gg-*.js, upload-*.js)
```

## 🧪 테스트 및 CI/CD

### 로컬 테스트

```bash
npm run test           # 전체 테스트 실행
npm run test:coverage  # 커버리지 확인
```

### CI/CD 파이프라인 (GitHub Actions)

이 프로젝트는 `.github/workflows/ci.yml`을 통해 **Lint, TypeCheck, Test, Build** 파이프라인을 자동화하고 있습니다.
메인 브랜치(또는 `develop`)에 푸시하거나 Pull Request를 생성할 때 파이프라인이 동작합니다.

---
© 2026 Neo-Seoul Transit Sales System. All rights reserved.
