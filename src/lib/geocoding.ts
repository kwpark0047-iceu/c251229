/**
 * 간단한 지연 함수 (Rate Limit 방지용)
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface GeocodeResult {
  lat: number;
  lng: number;
}

/**
 * 카카오 로컬 API를 사용하여 도로명/지번 주소를 위경도(WGS84)로 변환합니다.
 * @param address 검색할 주소
 * @returns 변환된 위경도 객체 또는 null
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim() === '') return null;

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    // API 키가 없으면 로깅만 하고 무시
    console.warn('[Geocoding] KAKAO_REST_API_KEY is not set. Skipping geocoding.');
    return null;
  }

  try {
    const url = new URL('https://dapi.kakao.com/v2/local/search/address.json');
    url.searchParams.append('query', address);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.warn(`[Geocoding] API Error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (data.documents && data.documents.length > 0) {
      // 가장 정확도가 높은 첫 번째 결과 사용
      const document = data.documents[0];
      return {
        lat: parseFloat(document.y), // 카카오 API는 y가 위도(lat)
        lng: parseFloat(document.x), // x가 경도(lng)
      };
    }

    return null;
  } catch (error) {
    console.error('[Geocoding] Exception during geocoding:', error);
    return null;
  }
}
