/**
 * 통합 데이터 동기화 API
 * 경기데이터드림 + 서울 열린광장 API를 한 번에 처리하여 Supabase DB에 저장
 * 실제 페치/맵핑/저장 로직은 공용 엔진(./sync-engine.ts)을 사용
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireSyncAuth, getOrgScoringConfig } from '@/app/api/sync-utils';
import { syncSource, getAllSourceKeys, getSourceList, SyncSourceResult } from '@/app/api/sync-engine';

export const dynamic = 'force-dynamic';
// 대량 데이터 처리를 위해 타임아웃 연장 (import-csv 선례: Vercel Hobby 최대 300초)
export const maxDuration = 300;

// POST - 통합 동기화 실행
export async function POST(request: NextRequest) {
  // ── 인증 + 소속 조직 확인 (공통 가드) ───────────────────────
  const supabase = await createClient();
  const auth = await requireSyncAuth(supabase);
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  // ── 권한 확인: owner 또는 admin만 동기화 가능 ──────────────
  const orgId = auth.orgId;
  const scoringConfig = await getOrgScoringConfig(supabase, orgId);
  if (!['owner', 'admin'].includes(auth.role ?? '')) {
    return NextResponse.json({ error: '동기화 권한이 없습니다. owner 또는 admin만 가능합니다.' }, { status: 403 });
  }

  const body = await request.json();
  const {
    sources = ['all'],   // 'all' 또는 소스 키 배열
    apiKeys = {},        // { 'GG_CLINIC_API_KEY': '...', ... }
    sigunNm,             // 경기도 시군구 필터
    sync = true,         // DB 저장 여부
  } = body;

  // 처리할 소스 결정
  const allSources = getAllSourceKeys();
  const targetSources: string[] = sources.includes('all') ? allSources : sources;

  // ── 소스별 동기화 작업 정의 (병렬 실행) ─────────────────────
  const tasks: Promise<SyncSourceResult>[] = targetSources.map(sourceKey =>
    syncSource(supabase, sourceKey, orgId, { apiKeys, sigunNm, sync, scoringConfig })
  );

  const settled = await Promise.allSettled(tasks);
  const results: SyncSourceResult[] = settled.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    const key = targetSources[i];
    const cfg = getSourceList().find(s => s.key === key);
    return { source: key, label: cfg?.label || key, total: 0, fetched: 0, saved: 0, error: '예기치 못한 오류' };
  });

  const totalSaved = results.reduce((sum, r) => sum + r.saved, 0);
  const hasError = results.some(r => r.error);

  return NextResponse.json({
    success: !hasError || totalSaved > 0,
    results,
    totalSaved,
  });
}

// GET - 사용 가능한 소스 목록 반환
export async function GET() {
  return NextResponse.json({ sources: getSourceList() });
}