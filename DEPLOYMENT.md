# 설치 및 배포 가이드 (Installation & Deployment Guide)

이 문서는 서울 지하철 광고 영업 관리 시스템(Lead Manager)의 로컬 설치 및 운영 환경 배포 방법을 설명합니다.

## 1. 사전 요구사항 (Prerequisites)

- **Node.js**: v18.17.0 이상 (v20 LTS 권장)
- **Package Manager**: npm, yarn, pnpm 중 택 1 (본 가이드는 npm 기준)
- **Supabase Account**: 백엔드 데이터베이스 구성을 위해 필요
- **Git**: 소스 코드 버전 관리

## 2. 로컬 개발 환경 설정 (Local Setup)

### 2.1 저장소 복제 (Clone Repository)

```bash
git clone https://github.com/kwpark0047-iceu/c251229.git
cd c251229
```

### 2.2 의존성 설치 (Install Dependencies)

```bash
npm install
```

### 2.3 환경 변수 설정 (Environment Variables)

루트 디렉토리에 `.env.local` 파일을 생성하고 다음 변수들을 설정합니다.

```env
# Supabase 설정 (필수)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 공공데이터포털 API 설정 (필수)
# 인허가 데이터 조회를 위해 필요합니다.
LOCALDATA_API_KEY=your-decoding-api-key

# 관리자 이메일 (선택)
# 시스템 초기 설정 시 관리자 권한 부여용
ADMIN_EMAIL=admin@example.com
```

### 2.4 데이터베이스 설정 (Database Setup)

이 프로젝트는 Supabase를 사용합니다.

1. [Supabase](https://supabase.com/)에서 새 프로젝트를 생성합니다.
2. 프로젝트 대시보드의 SQL Editor로 이동합니다.
3. `supabase/migrations/` 폴더 내의 SQL 파일들을 순서대로 실행하거나, `supabase-schema.sql` (통합 스키마) 내용을 복사하여 실행합니다.
   - 주요 테이블 생성 (`leads`, `ad_inventory` 등)
   - RLS(Row Level Security) 정책 설정
4. `supabase-auth-schema.sql`을 실행하여 사용자 권한 관련 트리거를 설정합니다.

### 2.5 개발 서버 실행 (Run Dev Server)

```bash
npm run dev
```
브라우저에서 `http://localhost:3000`으로 접속하여 확인합니다.

## 3. 배포 가이드 (Deployment)

이 프로젝트는 Next.js로 구축되었으므로 **Vercel** 배포를 권장합니다.

### 3.1 Vercel 배포 (Recommended)

1. [Vercel](https://vercel.com)에 로그인하고 **Add New > Project**를 클릭합니다.
2. GitHub 저장소(`kwpark0047-iceu/c251229`)를 연결하고 **Import**합니다.
3. **Environment Variables** 섹션에 `.env.local`의 내용을 등록합니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `LOCALDATA_API_KEY`
4. **Deploy** 버튼을 클릭합니다.

### 3.2 수동 빌드 및 실행 (Manual Build)

자체 서버(Linux/Docker)에 배포할 경우:

```bash
# 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## 4. 운영 관리 (Operations)

### 4.1 데이터베이스 마이그레이션
DB 스키마 변경이 필요할 경우 `supabase/migrations`에 새로운 SQL 파일을 추가하고 Supabase 웹 콘솔에서 실행합니다.

### 4.2 중복 데이터 관리
운영 중 리드 데이터 중복이 누적될 경우, 관리자 계정으로 로그인하여 **설정 > 데이터 관리 > 중복 리드 삭제** 기능을 실행하여 DB를 정리할 수 있습니다.
