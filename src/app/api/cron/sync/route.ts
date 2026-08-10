import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncSource, getAllSourceKeys, getSourceList } from '@/app/api/sync-engine';
import { getOrgScoringConfig } from '@/app/api/sync-utils';

export const dynamic = 'force-dynamic';
// Cron 작업은 오래 걸릴 수 있으므로 타임아웃 연장
// (조직 수 × 소스 수 전부 순회하므로 Vercel 최대 300초 확보)
export const maxDuration = 300;

/**
 * 크론 전용 Supabase 클라이언트.
 * 사용자 세션이 없는 일회성 작업이므로 서비스 롤 키로 RLS를 우회한다.
 * anon 키로 폴백하면 organization_id 없는 리드가 저장되어
 * 조직 뷰에서 보이지 않는 문제가 발생하므로 절대 폴백하지 않는다.
 */
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. Refusing to run with anon key.'
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET(request: Request) {
  // 1. Vercel Cron 요청 검증
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('[Cron] Unauthorized request to sync endpoint');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  console.log('[Cron] Starting daily 06:10 incremental sync...');

  let supabase;
  try {
    supabase = getSupabase();
  } catch (error) {
    console.error('[Cron] Supabase config error:', (error as Error).message);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }

  try {
    // 2. 동기화 대상 조직 목록 (서비스 롤 → RLS 무관 전체 조회)
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .order('created_at', { ascending: true });

    if (orgError) {
      console.error('[Cron] Failed to fetch organizations:', orgError.message);
      throw new Error(`조직 목록 조회 실패: ${orgError.message}`);
    }

    const orgList = orgs ?? [];
    const sourceKeys = getAllSourceKeys();
    const sourceLabels = getSourceList();
    const results: Array<{
      organization: string;
      source: string;
      label: string;
      total: number;
      fetched: number;
      saved: number;
      inserted?: number;
      updated?: number;
      skipped?: number;
      failed?: number;
      error?: string;
    }> = [];

    console.log(
      `[Cron] Syncing ${orgList.length} organization(s) × ${sourceKeys.length} source(s)`
    );

    // 3. 조직별 × 소스별 순차 동기화 (공공 API 과부하 방지)
    //    증분 동기화: mgt_no 기반 upsert가 신규(insert)/변경(update)만 반영하므로
    //    추가/수정된 데이터만 저장된다 (source_sync_logs에 실행 이력 기록).
    for (const org of orgList) {
      const scoringConfig = await getOrgScoringConfig(supabase, org.id);

      for (const sourceKey of sourceKeys) {
        const startedAt = new Date().toISOString();
        const result = await syncSource(supabase, sourceKey, org.id, {
          scoringConfig,
          // sync=true: 페치 데이터를 leads에 저장 (누락 시 페치만 하고 저장 안 함 — 과거 버그)
          sync: true,
        });
        const finishedAt = new Date().toISOString();

        results.push({
          organization: org.name,
          source: result.source,
          label: result.label,
          total: result.total,
          fetched: result.fetched,
          saved: result.saved,
          inserted: result.inserted,
          updated: result.updated,
          skipped: result.skipped,
          failed: result.failed,
          error: result.error,
        });

        // 4. 소스별 실행 이력 기록 (다음 실행 시 최신 상태 확인용)
        const { error: logError } = await supabase
          .from('source_sync_logs')
          .upsert(
            {
              organization_id: org.id,
              source_key: result.source,
              source_label:
                sourceLabels.find((s) => s.key === result.source)?.label ??
                result.label,
              status: result.error ? 'error' : 'success',
              total_count: result.total,
              fetched_count: result.fetched,
              inserted_count: result.inserted ?? 0,
              updated_count: result.updated ?? 0,
              skipped_count: result.skipped ?? 0,
              failed_count: result.failed ?? 0,
              error_message: result.error ?? null,
              started_at: startedAt,
              finished_at: finishedAt,
            },
            {
              onConflict: 'organization_id,source_key',
              ignoreDuplicates: false,
            }
          );

        if (logError) {
          console.error(
            `[Cron] Failed to log sync result for ${org.name}/${result.source}: ${logError.message}`
          );
        }

        const status = result.error ? 'FAILED' : 'OK';
        console.log(
          `[Cron] [${org.name}] ${result.label}: ${status} total=${result.total} fetched=${result.fetched} saved=${result.saved} inserted=${result.inserted ?? 0} updated=${result.updated ?? 0}${result.error ? ` error=${result.error}` : ''}`
        );
      }
    }

    const failedCount = results.filter((r) => r.error).length;
    return NextResponse.json({
      success: failedCount === 0,
      message: `Daily sync completed: ${orgList.length} organization(s), ${results.length} run(s), ${failedCount} failed`,
      orgCount: orgList.length,
      results,
    });
  } catch (error) {
    console.error('[Cron] Error during scheduled sync:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}