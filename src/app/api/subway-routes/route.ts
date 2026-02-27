import { NextRequest, NextResponse } from 'next/server';
import { getKricCodes } from '@/lib/kric-codes';

/**
 * KRIC 도시철도 전체노선정보 API 프록시
 * 서비스ID: subwayRouteInfo
 * 오퍼레이션ID: subwayRouteInfo
 */

// 캐시 유효 시간 (초) - 24시간 (역사 정보는 자주 변하지 않음)
const CACHE_TTL = 86400;

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const line = searchParams.get('line') || '1';

    // API 키 확인
    const apiKey = process.env.KRIC_API_KEY ||
        process.env.NEXT_PUBLIC_KRIC_API_KEY ||
        process.env.STATION_INFO_API_KEY;

    if (!apiKey) {
        console.error('[Subway Route API] Error: No API Key found');
        return NextResponse.json(
            { error: 'API 키가 설정되지 않았습니다.' },
            { status: 500 }
        );
    }

    try {
        // kric-codes.ts를 통해 운영기관코드와 노선코드 변환
        const { railOprIsttCd, lnCd } = getKricCodes(line);

        const baseUrl = 'https://openapi.kric.go.kr/openapi/trainUseInfo/subwayRouteInfo';
        const params = new URLSearchParams({
            serviceKey: apiKey,
            format: 'JSON',
            railOprIsttCd,
            lnCd,
        });

        const apiUrl = `${baseUrl}?${params.toString()}`;

        console.log(`[Subway Route API] Request: line=${line} (railOprIsttCd=${railOprIsttCd}, lnCd=${lnCd})`);

        const response = await fetch(apiUrl, {
            headers: {
                'Accept': 'application/json',
            },
            next: {
                revalidate: CACHE_TTL,
                tags: ['kric-subway-routes', `route-${line}`]
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Subway Route API] Upstream Error (${line}):`, response.status, errorText);
            return NextResponse.json(
                { success: false, error: `KRIC API 요청 실패 (${response.status})` },
                { status: 200 }
            );
        }

        const textData = await response.text();
        let data;
        try {
            data = JSON.parse(textData);
        } catch (e) {
            console.error(`[Subway Route API] JSON Parse Error (${line}):`, textData.substring(0, 200));
            return NextResponse.json(
                { success: false, error: 'API 응답 형식이 올바르지 않습니다.' },
                { status: 200 }
            );
        }

        // 결과 확인
        if (data.header && data.header.resultCode !== '00') {
            console.error(`[Subway Route API] KRIC Error (${line}):`, data.header.resultMsg);
            return NextResponse.json(
                { success: false, error: `KRIC API 오류: ${data.header.resultMsg}` },
                { status: 200 }
            );
        }

        // 결과 반환 (배열 보장)
        const rawData = data.body || [];
        const formattedData = Array.isArray(rawData) ? rawData : [rawData];

        return NextResponse.json({
            success: true,
            data: formattedData,
            _metadata: {
                cached_at: new Date().toISOString(),
                count: formattedData.length
            }
        });

    } catch (error) {
        console.error('[Subway Route API] Internal Exception:', error);
        return NextResponse.json(
            { success: false, error: '서버 내부 오류가 발생했습니다.' },
            { status: 200 }
        );
    }
}
