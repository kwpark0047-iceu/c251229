/**
 * 도면 업로드 API
 * POST /api/floor-plans/upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  MetroLine,
  PlanType,
  parseFloorPlanPath,
  METRO_LINES,
} from '@/app/floor-plans/types';

const BUCKET_NAME = 'floor-plans';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const folderName = formData.get('folderName') as string;
    const lineNumber = formData.get('lineNumber') as MetroLine;
    const planType = formData.get('planType') as PlanType;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: '파일이 없습니다' },
        { status: 400 }
      );
    }

    // 노선 번호 유효성 검사
    if (lineNumber && !METRO_LINES.includes(lineNumber)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 노선 번호입니다' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const results: {
      fileName: string;
      success: boolean;
      publicUrl?: string;
      error?: string;
    }[] = [];

    for (const file of files) {
      try {
        // 파일명에서 정보 파싱
        const parsedInfo = folderName
          ? parseFloorPlanPath(folderName, file.name, file.name)
          : null;

        // 파싱 실패 시 전달된 lineNumber, planType 사용
        const finalLineNumber = parsedInfo?.lineNumber || lineNumber;
        const finalPlanType = parsedInfo?.planType || planType;
        const stationName = parsedInfo?.stationName || file.name.replace(/\.[^/.]+$/, '');
        const sortOrder = parsedInfo?.sortOrder || 0;

        if (!finalLineNumber || !finalPlanType) {
          results.push({
            fileName: file.name,
            success: false,
            error: '노선 번호 또는 도면 유형을 확인할 수 없습니다',
          });
          continue;
        }

        // Storage 경로 생성
        const typeFolder = finalPlanType === 'psd' ? 'psd' : 'station-layout';
        const storagePath = `line-${finalLineNumber}/${typeFolder}/${file.name}`;

        // 파일 버퍼 읽기
        const buffer = await file.arrayBuffer();

        // Storage 업로드
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, buffer, {
            contentType: file.type || 'image/jpeg',
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          results.push({
            fileName: file.name,
            success: false,
            error: uploadError.message,
          });
          continue;
        }

        // Public URL 가져오기
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath);

        // DB에 저장
        const { error: dbError } = await supabase
          .from('floor_plans')
          .upsert({
            station_name: stationName,
            line_number: finalLineNumber,
            plan_type: finalPlanType,
            floor_name: 'B1',
            image_url: urlData.publicUrl,
            storage_path: storagePath,
            file_name: file.name,
            file_size: file.size,
            sort_order: sortOrder,
          }, {
            onConflict: 'station_name,line_number,plan_type,floor_name',
          });

        if (dbError) {
          results.push({
            fileName: file.name,
            success: false,
            error: `DB 저장 오류: ${dbError.message}`,
          });
          continue;
        }

        results.push({
          fileName: file.name,
          success: true,
          publicUrl: urlData.publicUrl,
        });
      } catch (fileError) {
        results.push({
          fileName: file.name,
          success: false,
          error: (fileError as Error).message,
        });
      }
    }

    const uploaded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failed === 0,
      uploaded,
      failed,
      results,
    });
  } catch (error) {
    console.error('업로드 API 오류:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
