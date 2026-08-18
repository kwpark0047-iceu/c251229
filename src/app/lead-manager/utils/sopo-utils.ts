/**
 * SOPO(소상공인시장진흥공단) 상가정보 API 유틸리티
 * 데이터.go.kr B553077 API 엔드포인트: https://apis.data.go.kr/B553077/api/open/sdsc2
 */

import { Lead } from '../types';

// SOPO API 기본 설정
const SOPO_API_BASE = 'https://apis.data.go.kr/B553077/api/open/sdsc2';

/**
 * SOPO API 요청 파라미터 타입
 */
export interface SopoRequestParams {
  /** 상가업소 관리번호 (건물 단위 조회 시 필수) */
  key: string;
  /** 서비스 키 - 우선순위: params.serviceKey > env.DATAGOKR_API_KEY */
  serviceKey?: string;
  /** 시도코드 (시/도) - 선택적 */
  ctprvnCd?: string;
  /** 시군구코드 (구/군) - 선택적 */
  signguCd?: string;
  /** 행정동코드 (동) - 선택적 */
  adongCd?: string;
  /** 시군구명 - 선택적 */
  sigunNm?: string;
  /** 페이지 번호 */
  pageNo?: number;
  /** 한 페이지 결과 수 */
  numOfRows?: number;
  /** 응답 형식 (json 또는 xml) */
  type?: 'json' | 'xml';
}

/**
 * SOPO API 응답 헤더 타입
 */
export interface SopoHeader {
  description: string;
  columns: string[];
  resultCode: string;
  resultMsg: string;
}

/**
 * SOPO API 응답 아이템(업소) 타입
 */
export interface SopoItem {
  bizesId: string;           // 상가업소번호
  bizesNm: string;           // 상호명
  brchNm: string;            // 지점명
  indsLclsCd: string;        // 대분류 업종코드
  indsLclsNm: string;        // 대분류 업종명
  indsMclsCd: string;        // 중분류 업종코드
  indsMclsNm: string;        // 중분류 업종명
  indsSclsCd: string;        // 소분류 업종코드
  indsSclsNm: string;        // 소분류 업종명
  ksicCd: string;            // 업종코드
  ksicNm: string;            // 업종명
  ctprvnCd: string;          // 시도코드
  ctprvnNm: string;          // 시도명
  signguCd: string;          // 시군구코드
  signguNm: string;          // 시군구명
  adongCd: string;           // 행정동코드
  adongNm: string;           // 행정동명
  ldongCd: string;           // 법정동코드
  ldongNm: string;           // 법정동명
  lnoCd: string;             // 관리번호
  lnoMnno: number;           // 건물본번지
  lnoSlno: string;           // 건물부번지
  lnoAdr: string;            // 주소
  rdnmCd: string;            // 도로명코드
  rdnm: string;              // 도로명
  bldMnno: number;           // 건물본번지
  bldSlno: string;           // 건물부번지
  bldMngNo: string;          // 건물관리번호
  bldNm: string;             // 건물명
  rdnmAdr: string;           // 도로명주소
  oldZipcd: string;          // 구우편번호
  newZipcd: string;          // 신우편번호
  dongNo: string;            // 동번호
  flrNo: string;             // 층수
  hoNo: string;            // 호수
  lon: number;               // 경도 (위도용, 실제는 lon)
  lat: number;               // 위도 (위도용, 실제는 lat)
  /** 조사연월 (YYYYMM 형식) */
  stdrYm: string;
}

type JsonObject = Record<string, unknown>;

function asJsonObject(value: unknown): JsonObject | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function readText(record: JsonObject, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

function readNumber(record: JsonObject, key: string): number {
  const value = record[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function parseSopoItem(value: unknown): SopoItem | null {
  const record = asJsonObject(value);
  if (!record) return null;

  const bizesId = readText(record, 'bizesId');
  const bizesNm = readText(record, 'bizesNm');
  const lnoCd = readText(record, 'lnoCd');
  if (!bizesId || !bizesNm || !lnoCd) return null;

  return {
    bizesId, bizesNm,
    brchNm: readText(record, 'brchNm'),
    indsLclsCd: readText(record, 'indsLclsCd'), indsLclsNm: readText(record, 'indsLclsNm'),
    indsMclsCd: readText(record, 'indsMclsCd'), indsMclsNm: readText(record, 'indsMclsNm'),
    indsSclsCd: readText(record, 'indsSclsCd'), indsSclsNm: readText(record, 'indsSclsNm'),
    ksicCd: readText(record, 'ksicCd'), ksicNm: readText(record, 'ksicNm'),
    ctprvnCd: readText(record, 'ctprvnCd'), ctprvnNm: readText(record, 'ctprvnNm'),
    signguCd: readText(record, 'signguCd'), signguNm: readText(record, 'signguNm'),
    adongCd: readText(record, 'adongCd'), adongNm: readText(record, 'adongNm'),
    ldongCd: readText(record, 'ldongCd'), ldongNm: readText(record, 'ldongNm'),
    lnoCd, lnoMnno: readNumber(record, 'lnoMnno'), lnoSlno: readText(record, 'lnoSlno'),
    lnoAdr: readText(record, 'lnoAdr'), rdnmCd: readText(record, 'rdnmCd'),
    rdnm: readText(record, 'rdnm'), bldMnno: readNumber(record, 'bldMnno'),
    bldSlno: readText(record, 'bldSlno'), bldMngNo: readText(record, 'bldMngNo'),
    bldNm: readText(record, 'bldNm'), rdnmAdr: readText(record, 'rdnmAdr'),
    oldZipcd: readText(record, 'oldZipcd'), newZipcd: readText(record, 'newZipcd'),
    dongNo: readText(record, 'dongNo'), flrNo: readText(record, 'flrNo'), hoNo: readText(record, 'hoNo'),
    lon: readNumber(record, 'lon'), lat: readNumber(record, 'lat'), stdrYm: readText(record, 'stdrYm'),
  };
}

function parseSopoResponse(value: unknown): SopoResponse {
  const root = asJsonObject(value);
  const header = root ? asJsonObject(root.header) : null;
  const body = root ? asJsonObject(root.body) : null;
  const rawItems = body?.items;
  if (!header || !body || typeof header.resultCode !== 'string' || !Array.isArray(rawItems)) {
    throw new Error('SOPO API 응답 형식이 올바르지 않습니다.');
  }

  const items = rawItems.map(parseSopoItem);
  if (items.some((item): item is null => item === null)) {
    throw new Error('SOPO API 응답 형식이 올바르지 않습니다.');
  }

  return {
    header: {
      description: readText(header, 'description'),
      columns: Array.isArray(header.columns)
        ? header.columns.filter((column): column is string => typeof column === 'string')
        : [],
      resultCode: header.resultCode,
      resultMsg: readText(header, 'resultMsg'),
    },
    body: {
      items: items.filter((item): item is SopoItem => item !== null),
      numOfRows: readNumber(body, 'numOfRows'),
      pageNo: readNumber(body, 'pageNo'),
      totalCount: readNumber(body, 'totalCount'),
    },
  };
}

/**
 * SOPO API 전체 응답 타입
 */
export interface SopoResponse {
  header: SopoHeader;
  body: {
    items: SopoItem[];
    numOfRows: number;
    pageNo: number;
    totalCount: number;
  };
}

/**
 * SOPO API 변환된 Lead 업데이트 타입
 */
export interface SopoLeadUpdate {
  /** Lead ID */
  leadId: string;
  /** SOPO 데이터 매핑 대상 필드 */
  updates: Partial<Lead> & {
    sopoBizesId?: string;
    sopoBizName?: string;
    sopoRoadAddress?: string;
    sopoLotAddress?: string;
    sopoLatitude?: number;
    sopoLongitude?: number;
    sopoCategoryLarge?: string;
    sopoCategoryLargeName?: string;
    sopoCategoryMiddle?: string;
    sopoCategoryMiddleName?: string;
    sopoCategorySmall?: string;
    sopoCategorySmallName?: string;
    sopoProvinceCode?: string;
    sopoProvinceName?: string;
    sopoDistrictCode?: string;
    sopoDistrictName?: string;
    sopoDongCode?: string;
    sopoDongName?: string;
    sopoStdYm?: string;
    sopoDataFetchedAt?: string;
  };
}

/**
 * SOPO API로부터 데이터를 조회하고 Lead 업데이트 객체로 변환합니다.
 *
 * @param params - 요청 파라미터 (key 필수)
 * @returns 변환된 Lead 업데이트 객체 또는 null
 * @throws {Error} API 호출 실패 시
 */
export async function fetchSopoData(params: SopoRequestParams): Promise<SopoItem[] | null> {
  try {
    // 필수 파라미터 검증
    if (!params.key) {
      throw new Error('SOPO API: "key" 파라미터가 필요합니다. (건물 관리번호)');
    }

    const serviceKey = params.serviceKey || process.env.DATAGOKR_API_KEY;
    if (!serviceKey) {
      throw new Error('SOPO API: DATAGOKR_API_KEY 환경변수가 설정되지 않았습니다.');
    }

    // 쿼리 파라미터 구성
    const queryParams = new URLSearchParams({
      serviceKey: serviceKey,
      key: params.key,
      numOfRows: (params.numOfRows ?? '100').toString(),
      pageNo: (params.pageNo ?? '1').toString(),
      type: params.type ?? 'json',
    });

    // 시도/시군구/동 코드가 있으면 추가
    if (params.ctprvnCd) queryParams.append('ctprvnCd', params.ctprvnCd);
    if (params.signguCd) queryParams.append('signguCd', params.signguCd);
    if (params.adongCd) queryParams.append('adongCd', params.adongCd);
    if (params.sigunNm) queryParams.append('sigunNm', params.sigunNm);

    // API 엔드포인트 구성
    const url = `${SOPO_API_BASE}/storeListInBuilding?${queryParams.toString()}`;

    // 외부 공공 API가 멈춰도 애플리케이션 요청이 무기한 대기하지 않도록 제한합니다.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SOPO API 요청 실패 (${response.status}): ${errorText}`);
    }

    const data = parseSopoResponse(await response.json());

    // 결과 코드 확인
    if (data.header.resultCode !== '00') {
      throw new Error(`SOPO API 오류: ${data.header.resultMsg} (코드: ${data.header.resultCode})`);
    }

    // items가 있으면 반환, 없으면 null 반환
    if (data.body.items && data.body.items.length > 0) {
      return data.body.items;
    }

    return null;
  } catch (error) {
    console.error('SOPO API wrapper error:', error);
    throw error;
  }
}

/**
 * SOPO API 응답을 Lead 인터페이스로 매핑합니다.
 *
 * @param items - SOPO API 응답 아이템 배열
 * @param existingLead - 기존 Lead 데이터 (선택적, 누락된 필드 보존용)
 * @returns Lead 인터페이스를 conform하는 객체
 */
export function mapSopoToLead(
  items: SopoItem[],
  existingLead?: Partial<Lead>
): Lead {
  if (items.length === 0) {
    throw new Error('매핑할 SOPO 데이터가 없습니다.');
  }

  const item = items[0]; // 첫 번째 아이템 사용 (일반적으로 유일한 매칭)

  return {
    ...existingLead,
    id: existingLead?.id || item.lnoCd || item.bizesId,
    bizName: existingLead?.bizName || item.bizesNm,
    roadAddress: existingLead?.roadAddress || item.rdnmAdr || item.lnoAdr,
    lotAddress: existingLead?.lotAddress || item.lnoAdr,
    latitude: existingLead?.latitude ?? item.lat,
    longitude: existingLead?.longitude ?? item.lon,
    status: existingLead?.status || 'NEW',
    sopoBizesId: item.bizesId,
    sopoBizName: item.bizesNm,
    sopoRoadAddress: item.rdnmAdr || item.lnoAdr,
    sopoLotAddress: item.lnoAdr,
    sopoLatitude: item.lat,
    sopoLongitude: item.lon,
    sopoCategoryLarge: item.indsLclsCd,
    sopoCategoryLargeName: item.indsLclsNm,
    sopoCategoryMiddle: item.indsMclsCd,
    sopoCategoryMiddleName: item.indsMclsNm,
    sopoCategorySmall: item.indsSclsCd,
    sopoCategorySmallName: item.indsSclsNm,
    sopoProvinceCode: item.ctprvnCd,
    sopoProvinceName: item.ctprvnNm,
    sopoDistrictCode: item.signguCd,
    sopoDistrictName: item.signguNm,
    sopoDongCode: item.adongCd,
    sopoDongName: item.adongNm,
    sopoStdYm: item.stdrYm,
    sopoDataFetchedAt: new Date().toISOString(),
  };
}

/**
 * 리드와 매칭될 SOPO 키(관리번호) 추출
 *
 * @param lead - 리드 객체
 * @returns SOPO key 값 또는 null
 */
export function extractSopoKeyFromLead(lead: Lead): string | null {
  return lead.mgtNo || null;
}

export default fetchSopoData;
