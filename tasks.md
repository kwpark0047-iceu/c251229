# Economy News — 진행 상황 추적 (Tasks)

> **목적**: AI가 세션 간 전환 시에도 정확히 어디까지 진행했는지 파악하기 위한 기록  
> **마지막 갱신**: 2026-08-13  
> **다음 작업**: Phase 9 완료 — 테스트 타입 오류 정리, ignoreBuildErrors 제거, 문서 갱신

---

## 상태 범례

| 기호 | 의미 |
|---|---|
| ✅ | 완료 |
| 🔄 | 진행 중 |
| ⬜ | 미시작 |
| ❌ | 문제 있음 |
| 🚫 | 보류 |

---

## Git History

```
c174a18 (HEAD -> main) chore: add .env* to gitignore
e37e973 chore: fix Vercel Hobby cron + deploy config
79eafdc chore: add aider conventions (CONVENTIONS.md + .aider.conf.yml)
62c2824 chore: add daily cleanup cron at midnight
11af2c4 chore: switch to Vercel deployment, update repo to kwpark0047/news
aa984c2 revert: remove ci.yml schema-drift job (requires workflow scope)
fd6d1a9 feat: add RAM measurement pipeline and optimize Playwright memory usage
f7be167 fix: stop infinite Redis reconnect attempts when Upstash unreachable
75e7926 feat: Phase 7 -- test coverage, error monitoring, DB indexes, i18n and OOH section
```

---

## Phase 0-5: 완료

모든 Phase 0-5 작업은 `cab3577`에서 완료되었습니다. 총 239개 파일, 30,519 LOC.  
상세: `require.md` Phase 0-5 참조.

---

## Phase 6: 고도화 (완료)

### 6a — 뉴스레터 시스템

| 작업 ID | 작업명 | 파일 | 상태 | 비고 |
|---|---|---|---|---|
| 6a-1 | NewsletterSubscription 모델 확인 | prisma/schema.prisma | ✅ | 이미 존재 |
| 6a-1s | 동일 모델 SQLite 스키마에도 반영 | prisma/schema.sqlite.prisma | ✅ | 이미 존재 |
| 6a-2 | 구독 API 구현 | src/app/api/newsletter/subscribe/route.ts | ✅ | interests/alertKeywords 확장됨 |
| 6a-3 | 구독 해지 API (unsubscribe) | src/app/api/newsletter/unsubscribe/route.ts | ✅ | POST + GET (템플릿 링크 지원) |
| 6a-4 | 관리자 구독자 페이지 | src/app/admin/newsletter/page.tsx | ✅ | 다이제스트 카드 포함 |
| 6a-5 | 뉴스레터 발송 서비스 (nodemailer) | src/lib/services/newsletter/newsletter-service.ts | ✅ | `{{email}}` 개인화 치환 |
| 6a-6 | 뉴스레터 발송 API | src/app/api/admin/newsletter/send/route.ts | ✅ | test/send-all 액션 |
| 6a-7 | 관리자 nav + layout 추가 | src/app/admin/layout.tsx | ✅ | |
| 6a-8 | 자동 뉴스레터 스케줄러 | src/lib/scheduler/newsletter-scheduler.ts | ✅ | 매일 08:00, SMTP 설정 시 활성 |
| 6a-9 | 인증: verify-email API | src/app/api/auth/verify-email/route.ts | 🚫 | 이메일 인증 대신 전화번호 인증 사용 |

### 6b — AI 챗봇

| 작업 ID | 작업명 | 파일 | 상태 | 비고 |
|---|---|---|---|---|
| 6b-1 | 채팅 Q&A API | src/app/api/chat/route.ts | ✅ | 로그인 사용자 히스토리 포함 |
| 6b-2 | RAG 검색 유틸 (뉴스 기반 응답) | src/lib/services/chat/chat-service.ts | ✅ | searchRelevantArticles + buildRagContext |
| 6b-3 | 채팅 UI 컴포넌트 | src/components/chat/ChatWidget.tsx | ✅ | |
| 6b-4 | 메인 레이아웃에 채팅 위젯 추가 | src/app/layout.tsx | ✅ | |

### 6c — 소셜 로그인

| 작업 ID | 작업명 | 파일 | 상태 | 비고 |
|---|---|---|---|---|
| 6c-1 | SocialAccount 모델 추가 (schema.prisma) | prisma/schema.prisma | ✅ | |
| 6c-1s | 동일 모델 SQLite 스키마 | prisma/schema.sqlite.prisma | ✅ | |
| 6c-2 | Google OAuth API | src/app/api/auth/oauth/login/route.ts | ✅ | provider=google |
| 6c-3 | Google OAuth 콜백 | src/app/api/auth/google/callback/route.ts | ✅ | |
| 6c-4 | Kakao OAuth API | src/app/api/auth/oauth/login/route.ts | ✅ | provider=kakao |
| 6c-5 | Kakao OAuth 콜백 | src/app/api/auth/kakao/callback/route.ts | ✅ | |
| 6c-6 | OAuth 서비스 (토큰 교환, 계정 연결) | src/lib/services/auth/oauth-service.ts | ✅ | |
| 6c-7 | 로그인 페이지 소셜 버튼 | src/app/login/LoginPage.tsx | ✅ | Google/Kakao 버튼 존재 |

### 6d — 모바일 앱 (PWA)

| 작업 ID | 작업명 | 파일 | 상태 | 비고 |
|---|---|---|---|---|
| 6d-1 | 오프라인 페이지 (fallback) | src/app/offline/page.tsx | ✅ | |
| 6d-2 | SW 캐싱 전략 개선 | public/sw.js | ✅ | network-first + 캐시 fallback |
| 6d-3 | InstallPrompt 컴포넌트 | src/components/layout/InstallPrompt.tsx | ✅ | |
| 6d-4 | 모바일 하단 네비게이션 | src/components/layout/MobileNav.tsx | ✅ | |
| 6d-5 | Root layout에 모바일 nav 추가 | src/app/layout.tsx | ✅ | |

---

## Phase 7: 완료 (HEAD 75e7926)

- 테스트 커버리지 확대 (98개 테스트 추가, 331개 전체 통과 → 현재 499개 통과)
- 에러 모니터링 (error-log 시스템, 관리자 error-logs 페이지)
- DB 인덱스 추가 (sourceType/publishedAt, category/publishedAt 등)
- i18n 다국어 지원 프레임워크
- OOH (옥외광고) 섹션 — 4개 하위 카테고리
- 스포츠 피드 오염 필터 (b33a58f/e19feeb)
- 금융 스케줄러 빈도 축소 — OOM 방지 (eb023c4)

---

## Phase 8: 신규 기능 (이번 세션, 미커밋)

| 작업 | 파일 | 상태 | 비고 |
|---|---|---|---|
| P0: ooh 페이지 회귀 수정 (fetch → getArticles) | src/app/ooh/page.tsx | ✅ | 타입에러+상대경로 fetch 제거 |
| 번역 파이프라인 검증 | src/lib/rss/db-service.ts 외 | ✅ | 이미 연결됨 (문서만 정정) |
| Jest 타이머 누수 수정 | rss-helper/base-crawler/llm-fallback/cache/session/playwright-crawler | ✅ | unref + 테스트 가드, 경고 제거 |
| 뉴스레터 `{{email}}` 개인화 | newsletter-service.ts | ✅ | 구독자별 해지 링크 치환 |
| 뉴스레터 unsubscribe GET 지원 | api/newsletter/unsubscribe/route.ts | ✅ | 이메일 템플릿 링크용 |
| **맞춤형 뉴스 다이제스트** | digest-service + newsletter-digest-scheduler + subscribe API + 위젯 + 관리자 카드 | ✅ | 관심 분야 7종·키워드, 매일 07:00 |
| **오늘의 경제 브리핑** | briefing-service + /api/briefing + /briefing 페이지 + nav | ✅ | 조회수 랭킹+섹션+키워드, 5분 캐시 |
| **DB 백업 스크립트** | scripts/backup-db.ts + `npm run db:backup` | ✅ | PG pg_dump/SQLite, 14개 보존 |
| 문서 갱신 | README/tasks/NEXT_TASK | ✅ | 499 tests/33 suites 반영 |

---

## Phase 9: 완료 (2026-08-13, 미커밋)

| 작업 | 파일 | 상태 | 비고 |
|---|---|---|---|
| AI-IT db-service 테스트 11건 수정 | src/lib/ai-it/__tests__/db-service.test.ts | ✅ | mock 타입/필드 정합, 26개 전부 통과 |
| scripts/validate-env.ts import 경로 수정 | scripts/validate-env.ts | ✅ | `./src/` → `../src/` |
| next.config.ts에서 `ignoreBuildErrors` 제거 | next.config.js | ✅ | 빌드 타입 체크 강제 |
| 문서 갱신 (Vercel 배포 반영, 테스트 499개) | DOCUMENTATION.md / tasks.md | ✅ | 499 tests/33 suites 반영 |

---

## 테스트 현황

| 영역 | Suite 수 | 테스트 수 | 통과 | 비고 |
|---|---|---|---|---|
| 전체 | 33 | 499 | 499 | ✅ |
| Jest 단위/통합 | 33 | 499 | 499 | ✅ 타이머 누수 경고 없음 |
| Playwright E2E | — | — | — | 로컬 dev 서버 필요 |

## 커버리지 현황 (목표: 70%)

| 모듈 | Coverage | 상태 |
|---|---|---|
| stock-service | 24% | ⬜ |
| cache-service | 38% | ⬜ |
| financial-service | 40% | ⬜ |
| auth | 26% | ⬜ |
| session-store | 14% | ⬜ |
| playwright-crawler | 39% | ⬜ |
| utils | 37% | ⬜ |

---

## Vercel 배포 정보

| 항목 | 값 |
|---|---|
| 프로젝트 | kwpark0047/news (GitHub) |
| 플랫폼 | Vercel (Next.js 프레임워크, 리전 icn1) |
| 빌드 | `npm run vercel-build` (`next build`) |
| Cron | `/api/cron` 매일 02:00, `/api/cron/cleanup` 매일 03:00 (KST) |
| DB | PostgreSQL (외부 프로바이더, `DATABASE_URL`) |
| 배포 방식 | GitHub Push → Vercel 자동 배포 |
