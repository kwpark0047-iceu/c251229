# 소스코드 및 자산 문서 (Source Code & Assets)

본 문서는 프로젝트의 소스코드 관리 현황과 사용되는 디지털 자산(이미지, 데이터 등)의 위치 및 관리 방법을 기술합니다.

## 1. 소스코드 관리 (Source Code)

### 1.1 저장소 (Repository)
- **플랫폼**: GitHub
- **주소**: [https://github.com/kwpark0047-iceu/c251229](https://github.com/kwpark0047-iceu/c251229)
- **기본 브랜치**: `master` (배포 브랜치)

### 1.2 주요 디렉토리 구조
```
/
├── src/                # 소스코드 메인
│   ├── app/            # Next.js App Router 페이지 및 API
│   ├── components/     # 재사용 가능한 UI 컴포넌트
│   └── lib/            # 유틸리티 함수 및 라이브러리 설정
├── public/             # 정적 자산 (파비콘, 기본 아이콘 등)
├── supabase/           # 데이터베이스 마이그레이션 스크립트
├── scripts/            # 개발 및 테스트용 유틸리티 스크립트
└── docs/               # 프로젝트 문서 (파이프라인 가이드 등)
```

## 2. 자산 관리 (Assets)

### 2.1 정적 자산 (Static Assets)
웹 애플리케이션에 포함되어 배포되는 파일들입니다.
- **위치**: `/public` 디렉토리
- **내용**:
  - `next.svg`, `vercel.svg`: 프레임워크 로고
  - `globe.svg`, `file.svg`, `window.svg`: 기본 아이콘
  - `favicon.ico`: 웹사이트 파비콘

### 2.2 동적 자산 (Dynamic Assets)
애플리케이션 운영 중 생성되거나 외부에서 참조하는 자산입니다.

#### 2.2.1 이미지 및 도면
- **역사 도면 (Floor Plans)**:
  - 저장소: 외부 CDN 또는 Supabase Storage (현재 URL 참조 방식 사용)
  - 관리 테이블: `floor_plans`
- **리드 관련 이미지**: 필요 시 Supabase Storage `lead-attachments` 버킷 사용

#### 2.2.2 생성된 문서
- **제안서 PDF**:
  - 생성 방식: 클라이언트 사이드(`jspdf`)에서 실시간 생성
  - 저장: 생성된 PDF 파일은 Supabase Storage `proposals` 버킷에 저장되고 URL이 `proposals` 테이블에 기록됩니다.

#### 2.2.3 업로드 데이터
- **엑셀 파일**:
  - 인벤토리 일괄 등록을 위해 관리자가 업로드하는 파일
  - 저장소: 임시 처리 후 폐기 또는 Supabase Storage `temp-uploads` 버킷 저장

## 3. 라이브러리 및 저작권 (Libraries & Licenses)
본 프로젝트는 다음의 오픈 소스 라이브러리를 사용합니다. (`package.json` 참조)

- **UI Framework**: React, Next.js (MIT License)
- **Styling**: Tailwind CSS (MIT License)
- **Icon Set**: Lucide React (ISC License)
- **Chart**: Recharts (MIT License)
- **Map**: Leaflet, React-Leaflet (BSD-2-Clause)
- **PDF**: jsPDF (MIT License), html2canvas (MIT License)

## 4. 보안 자산 (Security Assets)
- **환경 변수**: `.env.local` 등 환경 변수 파일은 git에 포함되지 않으며 별도 관리됩니다.
- **인증 키**: 공공데이터포털 API Key, Supabase Service Key 등은 보안 저장소(Vercel Env Vars 등)에서 관리합니다.
