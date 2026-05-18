import { SupabaseClient } from '@supabase/supabase-js';

/**
 * mgt_no (관리번호)를 기준으로 리드 데이터를 수동 병합(Upsert)하는 유틸리티
 * 
 * Supabase의 .upsert()는 테이블에 명시적인 UNIQUE 제약조건이 필요합니다.
 * leads 테이블은 mgt_no 대신 (biz_name_normalized, road_address_normalized, organization_id)의 
 * UNIQUE INDEX를 사용하므로, mgt_no로 .upsert() 호출 시 제약조건 예외가 발생합니다.
 * 이를 우회하여 기존 데이터를 조회 후 개별 update/insert 처리합니다.
 */
export async function upsertLeadsByMgtNo(supabase: SupabaseClient, leads: any[]) {
  if (!leads || leads.length === 0) return { error: null };
  
  const mgtNos = leads.map(l => l.mgt_no).filter(Boolean);
  
  try {
    // 1. 기존 mgt_no 데이터 조회
    const { data: existingLeads, error: fetchError } = await supabase
      .from('leads')
      .select('id, mgt_no')
      .in('mgt_no', mgtNos);
      
    if (fetchError) throw fetchError;
    
    const existingMap = new Map(existingLeads?.map(e => [e.mgt_no, e.id]) || []);
    
    const toInsert = [];
    const updatePromises = [];
    
    // 2. Insert 및 Update 분리
    for (const lead of leads) {
      if (!lead.mgt_no) {
        toInsert.push(lead);
        continue;
      }
      
      const existingId = existingMap.get(lead.mgt_no);
      if (existingId) {
        updatePromises.push(supabase.from('leads').update(lead).eq('id', existingId));
      } else {
        toInsert.push(lead);
      }
    }
    
    // 3. 병렬 업데이트 실행
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
    
    // 4. 개별 Insert 실행 (UNIQUE INDEX 충돌 시 해당 건만 무시되도록 allSettled 사용)
    if (toInsert.length > 0) {
      await Promise.allSettled(toInsert.map(lead => supabase.from('leads').insert(lead)));
    }
    
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}
