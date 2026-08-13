# Handoff Document — economy-news v1.0.0

## 프로젝트 상태

**v1.0.0** — 최초 배포 완료. 40+ 소스 경제/AI/IT 뉴스 애그리게이터.

| 항목 | 상태 |
|------|------|
| Build | ✅ 통과 |
| TypeScript | ✅ tsc --noEmit 통과 |
| Lint | ✅ 통과 |
| Test (Jest) | ✅ 499/499 통과 |
| Test (Playwright E2E) | ✅ 통과 |
| Coverage | ⚠️ 54.5% (핵심 모듈 85-100%) |
| 배포 | ✅ Vercel (Production) |
| 모니터링 | ✅ /api/health |

## 핵심 아키텍처

### 데이터 모델 (Prisma — 통합 아키텍처)

```
Article (sourceType: RSS | AI_IT) → Source (sourceType)
  ├── NewsSummary (AI 요약)
  ├── NewsTag / NewsTagRelation
  └── NewsCategory

Financial (별도 도메인)
  ├── Stock / StockPrice
  ├── Cryptocurrency / CryptoTicker / CryptoCandle
  ├── ExchangeRate / GlobalIndex / PriceHistory
  └── DistributedLock
```

**중요**: Article/Source는 RSS와 AI/IT 모두 통합 사용. `sourceType`으로 구분. 두 개의 Prisma 스키마 파일 유지 필요 (`schema.prisma` = PostgreSQL prod, `schema.sqlite.prisma` = SQLite dev).

### 주요 모듈

| 모듈 | 위치 | 설명 |
|------|------|------|
| RSS Fetcher | `src/lib/rss/fetcher.ts` | RSS 피드 수집 + 재시도 로직 |
| RSS DB Service | `src/lib/rss/db-service.ts` | RSS 기사 CRUD + 통계 |
| AI-IT Fetcher | `src/lib/ai-it/fetcher.ts` | AI/IT 소스 RSS + Playwright 크롤러 |
| AI-IT DB Service | `src/lib/ai-it/db-service.ts` | AI/IT 기사 CRUD + 태그 |
| Summary Service | `src/lib/ai-it/summary-service.ts` | GPT-4o-mini 요약 + 규칙 기반 fallback |
| Translation Service | `src/lib/services/translation-service.ts` | 영문→한국어 요약 번역 |
| Scheduler | `src/lib/startup/schedulers.ts` | RSS/AI-IT/금융 통합 스케줄러 |
| Cache Service | `src/lib/services/cache/cache-service.ts` | Redis + in-memory fallback |
| SSE PubSub | `src/lib/sse/pubsub.ts` | 실시간 수집 진행률 스트리밍 |

### 페이지 구조 (App Router)

| Route | 설명 |
|-------|------|
| `/` | 국내 경제 뉴스 (기본) |
| `/overseas` | 해외 경제 뉴스 |
| `/all` | 전체 뉴스 (국내+해외+AI+IT) |
| `/ai-news` | AI 뉴스 |
| `/it-news` | IT 뉴스 |
| `/politics`, `/society`, `/culture` | 네이버 실시간 정치/사회/문화 |
| `/entertainment`, `/sports` | 네이버 실시간 연예/스포츠 |
| `/stocks` | 주식 대시보드 (KOSPI/KOSDAQ) |
| `/crypto` | 암호화폐 대시보드 |
| `/forex` | 환율 정보 |
| `/global` | 글로벌 지수 |
| `/search` | 키워드 검색 |
| `/bookmarks` | 북마크한 기사 |
| `/settings` | 사용자 설정 |
| `/admin` | 관리자 페이지 (보호) |
| `/login` | 로그인 |

## 최근 변경사항 (v1.0.0 RC)

### 타입 안전성 개선
- `src/lib/rss/db-service.ts`: 모든 `as ArticleWithSource[]` 캐스팅 → Prisma `ArticleGetPayload` 제네릭 타입으로 대체
- `src/lib/ai-it/translation-service.ts`: `as unknown as TranslationResult` → 명시적 필드 매핑
- `src/app/search/page.tsx`: AI-IT 기사 루프 unsafe 캐스팅 제거
- `src/components/news/NewsCard.tsx`: props 인터페이스 확장 (`ArticleBase` 타입)

### 메모리 누수 수정
- `src/lib/services/translation-service.ts`: `englishArticleIds[]` 무제한 배열 → `MAX_QUEUE_SIZE=5000` 제한 도입 (초과 시 오래된 항목 자동 제거)

### 공통 컴포넌트화
- `src/components/news/Pagination.tsx`: 페이지네이션 공통 컴포넌트 추출 (domestic/overseas/medical/smallbiz에서 재사용)
- `src/components/news/CategoryNewsPage.tsx`: 카테고리 뉴스 페이지 템플릿

### 인프라
- `package.json`: `typecheck` 스크립트 추가 (`tsc --noEmit`)

## 테스트 현황

### Jest (499 tests, 33 suites)
```
Test Suites: 33 passed, 33 total
Tests:       499 passed, 499 total
```

| 모듈 | 커버리지 | 비고 |
|------|---------|------|
| API 라우트 (articles) | 100% | ✅ |
| API 라우트 (financial) | 90% | ✅ |
| API 라우트 (health) | 90% | ✅ |
| RSS Fetcher | 100% | ✅ |
| AI-IT Fetcher | 93% | ✅ |
| Summary Service | 95% | ✅ |
| Crypto Service | 94% | ✅ |
| Market Service | 90% | ✅ |
| Naver News Service | 93% | ✅ |
| Auth | 85% | ✅ |
| Cache Service | 38% | ⚠️ 추가 필요 |
| Financial Service | 17% | ⚠️ 추가 필요 |
| Utils | 37% | ⚠️ 추가 필요 |
| Scheduler Service | 30% | ⚠️ 추가 필요 |
| **전체** | **54.5%** | ⚠️ |

### Playwright E2E
- `e2e/app.spec.ts` — 통과
- `e2e/crawler.spec.ts` — 통과

## 배포 정보

**Vercel**: Next.js 프레임워크, 리전 `icn1` (서울)
- `vercel.json` — buildCommand: `npm run vercel-build` (`next build`), installCommand: `npm run vercel-install`
- Cron: `GET /api/cron` (매일 02:00 KST), `GET /api/cron/cleanup` (매일 03:00 KST)
- API 함수 `maxDuration` 60s, 빌드 실패 시 자동 롤백
- 환경 변수는 Vercel Dashboard에서 관리

### 필요 환경 변수
```
DATABASE_URL (required)
CRON_SECRET (required)
NEXT_PUBLIC_BASE_URL (required)
LLM_PROVIDER (gemini)
OPENAI_API_KEY (optional — AI 요약/번역)
GEMINI_API_KEY (optional — Gemini LLM)
NAVER_CLIENT_ID / NAVER_CLIENT_SECRET (optional — 네이버 검색)
JWT_SECRET (required)
SMS_PROVIDER (mock)
DISABLE_SCHEDULERS (1 — Vercel 서버리스에서 node-cron 비활성화)
```

## NEXT_TASK

다음 개발자는 `NEXT_TASK.md`를 참조하세요.

---

## 연락처

- Repository: [GitHub Repository]
- Maintainer: [Maintainer Info]
