/**
 * 도면 ZIP 다운로드 API
 * POST /api/floor-plans/download
 */

import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { planIds, zipFileName = 'floor-plans.zip' } = await request.json();

    if (!planIds || !Array.isArray(planIds) || planIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '다운로드할 도면을 선택하세요' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 도면 정보 조회
    const { data: plans, error: queryError } = await supabase
      .from('floor_plans')
      .select('*')
      .in('id', planIds);

    if (queryError) {
      return NextResponse.json(
        { success: false, error: queryError.message },
        { status: 500 }
      );
    }

    if (!plans || plans.length === 0) {
      return NextResponse.json(
        { success: false, error: '도면을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // ZIP 생성
    const zip = new JSZip();

    for (const plan of plans) {
      try {
        // 이미지 다운로드
        const response = await fetch(plan.image_url);
        if (!response.ok) {
          console.error(`이미지 다운로드 실패: ${plan.station_name}`);
          continue;
        }

        const buffer = await response.arrayBuffer();
        const fileName = `${plan.line_number}호선_${plan.station_name}_${plan.plan_type}.jpg`;

        zip.file(fileName, buffer);
      } catch (downloadError) {
        console.error(`이미지 처리 오류: ${plan.station_name}`, downloadError);
      }
    }

    // ZIP 생성
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    // 응답 반환
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(zipFileName)}"`,
      },
    });
  } catch (error) {
    console.error('다운로드 API 오류:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
