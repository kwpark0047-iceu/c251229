# KRIC API 환경변수 설정 예시

철도산업정보센터 API를 사용하기 위해 다음 환경변수를 설정해야 합니다.

## 환경변수 설정

### 1. .env.local 파일 생성
```bash
# KRIC API 설정
KRIC_API_KEY=$2a$10$Y6y/8NTiO.CF9g/c9s0JPeXXyNNmZUNZeSN1DmmAWoTKCms4NL68y
NEXT_PUBLIC_KRIC_API_KEY=$2a$10$Y6y/8NTiO.CF9g/c9s0JPeXXyNNmZUNZeSN1DmmAWoTKCms4NL68y

# 기존 환경변수
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
LOCALDATA_API_KEY=your_localdata_api_key
RESEND_API_KEY=your_resend_api_key
```

### 2. API 정보
- **서비스 ID**: convenientInfo
- **오퍼레이션 ID**: stationInfo
- **서비스 키**: $2a$10$Y6y/8NTiO.CF9g/c9s0JPeXXyNNmZUNZeSN1DmmAWoTKCms4NL68y
- **사용기간**: 2026.01.07 ~ 2027.01.07

### 3. API 엔드포인트
- 노선 정보: `https://openapi.kric.go.kr/openapi/trainUseInfo/subwayRouteInfo`
- 역사 정보: `https://openapi.kric.go.kr/openapi/convenientInfo/stationInfo`

## 사용 방법

### KRIC API 초기화
```typescript
import { initializeSubwayData } from './kric-data-manager';

// 앱 시작 시 초기화
await initializeSubwayData();
```

### 실시간 데이터 가져오기
```typescript
import { getRealtimeSubwayData } from './kric-data-manager';

// 최신 지하철 데이터 가져오기
const subwayData = await getRealtimeSubwayData();
console.log(`${subwayData.stations.length}개 역 정보 로드됨`);
```

## 주요 기능

### 1. 실시간 노선 정보
- 철도산업정보센터 API로 최신 노선 데이터 가져오기
- 30분마다 자동 업데이트
- 캐싱으로 성능 최적화

### 2. 정확한 좌표 정보
- TM128 좌표계에서 WGS84로 정확한 변환
- 오차 없는 역 위치 정보
- 실제 운영기관 표준 좌표 사용

### 3. 상세 역사 정보
- 역 주소, 전화번호, 시설 정보
- 노선별 환승 정보
- 실시간 운영 정보

### 4. 자동 Fallback
- API 장애 시 기존 데이터로 자동 전환
- 오프라인 모드 지원
- 안정적인 서비스 제공

## 데이터 구조

### 역 정보 타입
```typescript
interface StationInfo {
  name: string;           // 역명
  lat: number;           // 위도
  lng: number;           // 경도
  lines: string[];       // 경유 노선
  address?: string;      // 역 주소
  phone?: string;        // 역 전화번호
  facilities?: string;   // 역시설정보
}
```

### 노선 정보 타입
```typescript
interface LineRoute {
  color: string;                    // 노선 색상
  coords: [number, number][];        // 좌표 배열
}
```

## 주의사항

1. **API 키 보안**: 서비스키를 공개 저장소에 커밋하지 마세요
2. **사용량 제한**: API 호출량을 모니터링하고 적절한 캐싱 사용
3. **에러 처리**: API 장애 시 fallback 메커니즘 활용
4. **좌표 변환**: TM128에서 WGS84로 변환 시 정확성 검증

## 트러블슈팅

### API 키 만료
- 콘솔에서 "Invalid KRIC API service key" 에러 확인
- 새로운 API 키로 환경변수 업데이트

### 데이터 로딩 실패
- 네트워크 연결 상태 확인
- API 엔드포인트 접근 가능 여부 확인

### 좌표 오차
- proj4 라이브러리로 정확한 좌표 변환 사용
- 실제 위치와 비교하여 정확성 검증
