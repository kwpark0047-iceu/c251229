# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소의 코드를 작업할 때 참고하는 가이드입니다.

## 프로젝트 개요

서울 지하철 광고 영업 시스템 - 지하철 광고 영업을 위한 리드 관리 애플리케이션. Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase로 구축됨.

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
- **외부 API**: LocalData.go.kr (사업자 인허가 데이터)

### 주요 디렉토리
```
src/
├── app/
│   ├── lead-manager/       # 메인 애플리케이션
│   │   ├── page.tsx        # 대시보드 (리드 + 인벤토리 탭)
│   │   ├── types.ts        # 모든 타입 정의
│   │   ├── api.ts          # LocalData API 연동
│   │   ├── supabase-service.ts   # 리드 CRUD 작업
│   │   ├── crm-service.ts        # CRM 기능 (통화, 제안서)
│   │   ├── inventory-service.ts  # 광고 인벤토리 관리
│   │   ├── auth-service.ts       # 인증 헬퍼
│   │   └── components/     # UI 컴포넌트
│   ├── auth/               # 인증 페이지
│   └── api/proxy/          # LocalData API용 CORS 프록시
├── lib/supabase/
│   ├── client.ts           # 브라우저용 Supabase 클라이언트
│   └── server.ts           # 서버용 Supabase 클라이언트
```

### 데이터베이스 스키마
스키마는 `supabase-schema.sql`에 정의됨. 주요 테이블:
- `leads` - 사업장 리드 (위치, 상태, 인근역 정보)
- `ad_inventory` - 광고매체 인벤토리 (역, 유형, 가격)
- `proposals` - 리드에 연결된 제안서
- `call_logs` - CRM 통화 기록
- `sales_progress` - 영업 파이프라인 단계
- `user_settings` - 사용자별 API 설정

### 데이터 흐름
1. LocalData.go.kr API에서 사업자 인허가 데이터 조회
2. proj4를 사용하여 GRS80 (한국 TM) 좌표를 WGS84로 변환
3. 각 리드에 대해 가장 가까운 지하철역 계산
4. 중복 체크 (biz_name + road_address) 후 Supabase에 저장
5. RLS 정책을 통한 조직별 데이터 격리

### 업종 카테고리
LocalData 서비스 ID가 매핑된 7개 카테고리:
- HEALTH (건강): 병원, 의원, 약국, 안경점
- ANIMAL (동물): 동물병원, 펫샵, 미용
- FOOD (식품): 음식점, 식품제조
- CULTURE (문화): 공연장, 게임장, 노래방
- LIVING (생활): 숙박, 미용실, 체육시설
- ENVIRONMENT (자원환경): 환경시설
- OTHER (기타)

### 리드 상태 흐름
`NEW (신규)` -> `PROPOSAL_SENT (제안 발송)` -> `CONTACTED (컨택 완료)` -> `CONTRACTED (계약 성사)`

## 환경 변수

`.env.local`에 필요한 변수:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
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

### API 처리
- LocalData API 호출을 위한 CORS 프록시 (`/api/proxy`)
- 다중 폴백 CORS 프록시 설정
- Rate Limiting 방지를 위한 API 호출 간 200ms 지연
