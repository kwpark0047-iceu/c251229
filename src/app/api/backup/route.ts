/**
 * 데이터 백업 API
 * leads, proposals, ad_inventory 데이터를 JSON으로 내보내기
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 (서버용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tables = searchParams.get('tables')?.split(',') || ['leads', 'proposals', 'ad_inventory'];

    const backupData: Record<string, unknown[]> = {};
    const errors: string[] = [];

    // 각 테이블 데이터 조회
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        errors.push(`${table}: ${error.message}`);
        backupData[table] = [];
      } else {
        backupData[table] = data || [];
      }
    }

    // 백업 메타데이터 추가
    const backup = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      tables: tables,
      counts: Object.fromEntries(
        Object.entries(backupData).map(([key, value]) => [key, value.length])
      ),
      errors: errors.length > 0 ? errors : undefined,
      data: backupData,
    };

    // 날짜 포맷팅
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toISOString().slice(11, 16).replace(':', '');
    const filename = `backup_${dateStr}_${timeStr}.json`;

    // JSON 응답 (다운로드용)
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json(
      { success: false, message: `백업 실패: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// 복원 API (POST)
export async function POST(request: NextRequest) {
  try {
    const backup = await request.json();

    // 백업 데이터 유효성 검사
    if (!backup.version || !backup.data) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 백업 파일입니다.' },
        { status: 400 }
      );
    }

    const results: Record<string, { success: number; failed: number }> = {};

    // 각 테이블 데이터 복원
    for (const [table, records] of Object.entries(backup.data)) {
      if (!Array.isArray(records)) continue;

      results[table] = { success: 0, failed: 0 };

      for (const record of records) {
        // id, created_at, updated_at 제외하고 upsert
        const { id, created_at, updated_at, ...data } = record as Record<string, unknown>;

        const { error } = await supabase
          .from(table)
          .upsert({ id, ...data }, { onConflict: 'id' });

        if (error) {
          results[table].failed++;
        } else {
          results[table].success++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '복원이 완료되었습니다.',
      results,
    });
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json(
      { success: false, message: `복원 실패: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
