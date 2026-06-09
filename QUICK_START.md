# 서울 지하철 광고 영업 시스템

## 빠른 시작 (Docker 사용)

### 1. Docker 설치
- Windows: [Docker Desktop](https://www.docker.com/products/docker-desktop/) 다운로드 및 설치

### 2. 환경 변수 설정
프로젝트 루트에 `.env` 파일 생성:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
LOCALDATA_API_KEY=your_localdata_api_key
RESEND_API_KEY=your_resend_api_key
KRIC_API_KEY=your_kric_api_key
```

### 3. Docker로 실행
```powershell
docker-compose up --build
```

### 4. 브라우저에서 확인
http://localhost:3000

## 일반적인 시작 방법

### 1. Node.js 설치
- [Node.js LTS 버전](https://nodejs.org/) 설치 (18.x.x 권장)

### 2. 의존성 설치
```powershell
npm install
```

### 3. 개발 서버 시작
```powershell
npm run dev
```

## 주요 기능

### 🔐 인증
- 이메일/비밀번호 로그인
- 조직 기반 멀티테넌시
- 세션 관리

### 📊 리드 관리
- 대용량 데이터 처리 (가상화, 무한 스크롤)
- 검색 및 필터링
- 상태 관리
- 지도 뷰 (클러스터링)

### 📈 CRM 기능
- 통화 기록 관리
- 영업 진행상황 추적
- 제안서 생성 및 발송
- 일정 관리

### 🗺️ 인벤토리
- 광고 매체 관리
- 재고 추적
- 예약 시스템

### 📱 반응형 디자인
- 모바일, 태블릿, 데스크톱 최적화
- 다크모드 지원
- 접근성 준수 (WCAG 2.1)

### 🎨 지하철 노선 테마
- 1-9호선 색상 시스템
- 역사 도면 뷰어
- 타일링 및 캐싱

## 테스트

### 단위 테스트
```powershell
npm run test
```

### E2E 테스트
```powershell
npm run test:e2e
```

### 테스트 커버리지
```powershell
npm run test:coverage
```

## 빌드 및 배포

### 프로덕션 빌드
```powershell
npm run build
```

### 프로덕션 시작
```powershell
npm run start
```

## 개발 도구

### ESLint
```powershell
npm run lint
```

### 타입 체크
```powershell
npm run type-check
```

### 전체 CI/CD 테스트
```powershell
npm run ci
```

## 기술 스택

- **프레임워크**: Next.js 16 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS 4
- **데이터베이스**: Supabase (PostgreSQL)
- **인증**: Supabase Auth
- **지도**: Leaflet + react-leaflet
- **테스트**: Vitest + Playwright
- **이미지**: WebP/AVIF 최적화
- **배포**: Vercel, Docker

## 구조

```
src/
├── app/
│   ├── lead-manager/          # 메인 애플리케이션
│   ├── floor-plans/           # 역사 도면
│   ├── auth/                 # 인증
│   └── api/                  # API 라우트
├── shared/
│   ├── components/           # 공용 컴포넌트
│   ├── hooks/                # 커스텀 훅
│   └── utils/                # 유틸리티
└── tests/
    ├── e2e/                  # E2E 테스트
    └── integration/          # 통합 테스트
```

## 지원

문제가 있으시면 [GitHub Issues](https://github.com/your-repo/issues)에 등록해주세요.
