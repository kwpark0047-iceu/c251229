# 📰 위마켓_뉴스 (economy-news) - 프로젝트 공식 기술 문서

본 문서는 최신 Next.js 16.2.10 및 React 19.2.4 환경하에 설계 및 가동되는 최상급 뉴스 애그리게이터이자 실시간 시황 플랫폼인 **위마켓_뉴스 (economy-news)**의 공식 아키텍처 및 시스템 세부 가이드라인입니다.

---

## 🏛️ 1. 시스템 전역 아키텍처 (Global Architecture)

위마켓_뉴스는 프레임워크의 성능을 최대화하고, 데이터 수집 안정성과 사용자 경험을 통합 수렴하도록 설계된 4레이어 아키텍처를 가집니다.

```
+--------------------------------------------------------------+
| 1. 프레젠테이션 레이어 (Presentation Layer)                    |
|    - Next.js 16 App Router (국내/해외/AI/IT 뉴스 지면)        |
|    - gHacks 스타일의 고대비 2단 독립형 헤더 및 카드 UI          |
|    - Recharts 기반 실시간 금융 모달 차트                     |
+--------------------------------------------------------------+
                               │
+--------------------------------------------------------------+
| 2. 비즈니스 서비스 레이어 (Business Service Layer)            |
|    - KIS / Upbit / Manana 금융 지표 API 수집 & 가상 폴백     |
|    - ioredis 및 메모리 캐싱 쉴드                              |
|    - OpenAI gpt-4o-mini 기반 국문 번역 및 3줄 요약           |
+--------------------------------------------------------------+
                               │
+--------------------------------------------------------------+
| 3. 지능형 수집/크롤러 레이어 (Scraper & Crawler Layer)       |
|    - Playwright 기반 우회 스텔스 및 휴리스틱 자가치유 파서   |
|    - 공용 RSS 헬퍼 모듈 (Exponential Backoff + Jitter)       |
|    - 전역 핫키워드 감지 Discord/Slack 웹훅 자동 타전 비서     |
+--------------------------------------------------------------+
                               │
+--------------------------------------------------------------+
| 4. 데이터 액세스 레이어 (Data Access Layer)                   |
|    - Prisma ORM v6.19.3 (PostgreSQL / SQLite)                |
|    - DB-backed Distributed Lock (동시성 다중 파드 락 제어)   |
|    - SaaS 개인화 차단/노출 쿼리 격리 쉴드                    |
+--------------------------------------------------------------+
```

---

## 📂 2. 핵심 아키텍처 모듈 명세 (Key System Modules)

### 👥 2-1. 암호화 기반 보안 로그인 & 개인 설정 시스템
*   **컴파일-프리 보안 인증 (`src/lib/utils/auth.ts`)**:
    *   기하급수적으로 느린 C++ 빌드를 수반하는 bcrypt 대신, Node.js 내장 크립토의 `crypto.scryptSync`를 기반으로 단방향 해싱 패스워드(형식: `scrypt$salt$hash`)와 `HMAC SHA-256` 서명 기반의 보안 `session` 쿠키 발급 모듈을 이식하여 고속 세션 검증을 통제합니다.
*   **지능형 수집원 격리 필터링 (`src/lib/rss/db-service.ts` & `src/lib/ai-it/db-service.ts`)**:
    *   사용자가 제외하고 싶은 수집 채널을 설정에서 선택하면, 뉴스 조회 쿼리에 `excludeSourceIds: { notIn: [hiddenIds] }`를 이식하여 데이터베이스 수준에서 기사를 사전에 완전 차단하는 SaaS 개인화 기능입니다.

### 🪙 2-2. 한국투자증권 시세 미인증 극복: 가상 시황 엔진 (`src/lib/services/financial/financial-service.ts`)
*   **문제**: KIS(한국투자증권) API 키가 유실되거나 로컬 개발 시 인증 오류가 나면 주식 면이 500에러로 폭사하는 취약점이 있었습니다.
*   **해결**: `appKey`가 미설정되거나 API 에러 발생 시 자동 기동되는 **자가발생 가상 지표 시뮬레이터(Self-Sustaining Financial Mock Service)**를 구축했습니다.
    *   **KOSPI/KOSDAQ 실시간 모사**: 사인/코사인 주기 시간값(`Math.sin(Date.now() / 10000)`)을 대입해 실시간으로 지수가 부드럽게 진동합니다.
    *   **국내 8대 우량주 자동 생성**: 삼성전자, SK하이닉스 등 주요 8대 종목의 현재가, 전일대비, 거래량을 실제 주식 개장 틱처럼 자연스럽게 60초 주기로 갱신하여 렌더링 및 DB 적재합니다.

### 🔒 2-3. Redis 유실 대응: 데이터베이스 무장애 분산 락 (`src/lib/services/cache/cache-service.ts`)
*   **문제**: 다중 복제 컨테이너(Scale-out 파드) 가동 시 Redis가 부재하면 메모리 캐시 싱글톤이 분할되어 다중 컨테이너가 수집 cron에 동시 진입, DB 충돌이 생깁니다.
*   **해결**: 데이터베이스의 고유 제약 조건(`lockName @unique`)과 자동 만료 세션 삭제(`deleteMany`)를 매개로 작동하는 **DB-backed Distributed Lock**을 구현했습니다.
    *   동일 락에 먼저 진입한 파드만 레코드를 생성할 수 있으며(True), 뒤늦게 진입한 파드는 unique constraint 에러에 부딪혀 차단(False)되므로 다중 노드 간 완벽한 동기화가 달성됩니다.

### 🤖 2-4. AI 한글 번역 기사 큐레이션 (`src/lib/ai/llm-service.ts` & `src/components/ai-it/NewsCard.tsx`)
*   **영-한 번역 & 3줄 자가요약**:
    *   OpenAI `gpt-4o-mini` API를 호출하는 프롬프트를 튜닝하여 영문 기사(OpenAI, Anthropic 등)가 포착되면 국문 타이틀 번역 및 3줄 핵심 요약을 생성해 `NewsSummary` 테이블에 적재합니다.
*   **프리미엄 2열 다국어 카드**:
    *   기사 언어가 영어(`en`)이면 지면에 굵은 한글 번역 제목을 우선 표기하고 오리지널 영문 제목을 작은 자막으로 아래에 바인딩하여, 외국어 기사를 막힘없이 독파하도록 디자인 정합성을 높였습니다.

### 📱 2-5. 전역 핫키워드 Discord / Slack Webhook 타전 비서 (`src/lib/utils.ts`)
*   **동작 원리**: 뉴스 수집 완료와 동시에 가동되는 백엔드 트리거 비서입니다. 기사 제목 중 **금리, 연준, Fed, 비트코인, OpenAI, ChatGPT, 엔비디아, 시총** 등 실시간 중대 키워드를 감지하면 즉시 Slack 및 Discord 웹훅 API로 뉴스 카드와 요약 Embed 데이터를 전송합니다.

### 🧠 2-6. 지능형 휴리스틱 자가치유 크롤러 (`src/lib/ai-it/playwright-crawler.ts`)
*   **작동 메커니즘**: 정적 셀렉터 매칭 실패 시 우회 가동되어 표준적인 포스트 카드 HTML 구조를 스스로 분석(Heuristic), **제목(첫 번째 h1~h6), 링크(href가 있는 a), 설명(첫 번째 p), 썸네일(src img)을 스스로 역설계**하여 크롤링 정합성을 수호합니다.

---

## 🎨 3. UI.UX 및 성능 최적화 명세 (UI.UX Tuning)

1.  **독립형 2단 헤더 구조화 (`Header.tsx`)**:
    *   로고 영역에 `whitespace-nowrap shrink-0`를 기입해 줄바꿈을 완전 봉쇄하고, 9개 메뉴들을 하단 2열 카테고리 바로 하강 배치하여 어떠한 해상도에서도 글자가 찌그러지거나 잘리지 않도록 비주얼 밀도를 가중시켰습니다.
2.  **누적 레이아웃 이동(CLS) 제거 (`articles/[id]/page.tsx` & `ai-it/articles/[id]/page.tsx`)**:
    *   상세 이미지 로드 시 본문이 갑자기 툭 떨어지는 현상을 박멸하기 위해, 이미지 컨테이너에 뉴스/미디어 공식 가독 종횡비인 **`aspect-[16/9]`** 스켈레톤 공간을 사전 예약하고 절대 위치 containment로 이미지를 로드합니다. (CLS Score = 0)
3.  **Reflow 연산 제거 및 GPU 가속화 (`NewsCard.tsx`)**:
    *   Hover 반응 시 불필요한 기하학적 연산을 유도하던 `transition-all`을 GPU Repaint 가속만 관장하는 **`transition-colors duration-200`**으로 정밀 대체하여 저사양 기기 스크롤 흔들림을 소거했습니다.
4.  **이미지 프록시 도메인 해제**:
    *   수백 개의 다양한 크롤링 이미지 도메인을 매번 config에 등록할 수 없는 구조를 타개하기 위해, AI/IT 카드 지면에 Next.js `<Image>` 대신 HTML 표준 **`<img>`**를 도입했습니다. 400 Bad Request 차단 에러를 완벽 박멸함과 동시에, 서버 메모리 누수 위험을 극적으로 예방했습니다.

---

## ⌨️ 4. 로컬 환경 구성 가이드 (Development Setup)

```bash
# 1. 저장소 클론 및 패키지 인스톨
npm install

# 2. 로컬 개발 환경 변수 이식 (SQLite 모드 가동)
cp .env.development .env.local

# 3. 데이터베이스 생성 및 소스 시딩
npm run db:push
npm run db:seed

# 4. 로컬 통합 테스트 가동
npm test

# 5. 로컬 개발 서버 구동
npm run dev
```

---

## 🚀 5. 상용 배포 가이드 (Vercel Production Setup)

### 5-1. 환경 변수 구성 (Variables)
Vercel 프로젝트에 다음 환경 변수를 기입합니다 (`vercel.json`의 `env` 맵이 참조):

| 변수명 | 권장 설정값 | 비고 |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://...` | 상용 PostgreSQL 커넥션 URL |
| `CRON_SECRET` | *(임의의 긴 문자열)* | cron 트리거 인증용 |
| `NEXT_PUBLIC_BASE_URL` | `https://...` | 공개 베이스 URL |
| `LLM_PROVIDER` | `gemini` | 요약/번역 LLM 공급자 (`gemini`/`openai`) |
| `OPENAI_API_KEY` | `sk-proj-...` | OpenAI GPT-4o-mini 요약/번역 API 키 |
| `GEMINI_API_KEY` | `AIza...` | Gemini LLM API 키 |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | *(선택 사항)* | 네이버 검색/뉴스 API |
| `JWT_SECRET` | `economy-news-super-secret-key-123!` | 암호화 서명 보안 소금 키 |
| `SMS_PROVIDER` | `mock` | 알림 SMS 공급자 (mock=미사용) |
| `DISABLE_SCHEDULERS` | `1` | Vercel 서버리스 환경에서 node-cron 비활성화 |

### 5-2. 빌드 및 배포 (`vercel.json`)
*   빌드 커맨드: `npm run vercel-build` (`next build`), 설치: `npm run vercel-install`.
*   프레임워크: `nextjs`, 리전 `icn1` (서울), API 함수 `maxDuration` 60s.
*   **Cron 스케줄** (Vercel Cron — Hobby 이상에서 활성):
    *   `GET /api/cron` — 매일 02:00 (KST) RSS/AI/IT 수집
    *   `GET /api/cron/cleanup` — 매일 03:00 (KST) 중복/오래된 데이터 정리
*   빌드 실패 시 이전 배포로 자동 롤백됩니다.

---

본 위마켓_뉴스 프로젝트는 기술적 가독성 향상부터 예외 격리 분산 락, 지능형 자가치유 파서까지 구축되어 가장 완벽하고 무결한 서비스 가용성을 보장합니다.
