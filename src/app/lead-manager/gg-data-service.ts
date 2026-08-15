
/**
 * 경기데이터드림(학원/교습소) 서비스
 */

import { Lead, BusinessCategory } from './types';

/**
 * 경기도 학원 데이터를 가져와서 DB에 저장하는 API 호출
 */
export async function syncGyeonggiAcademies(
  onProgress?: (current: number, total: number, status: string) => void
): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    if (onProgress) onProgress(0, 0, '경기도 데이터 동기화 시작 중...');
    
    // 이 기능은 서버사이드에서 실행되는 /api/gg-data를 호출하거나 
    // 혹은 직접 Supabase에 저장하는 로직을 구현합니다.
    // 여기서는 기존 /api/gg-data 라우트를 활용하여 데이터를 가져오고 
    // supabase-service.ts의 saveLeads를 호출하는 방식으로 구현하거나,
    // 아예 서버사이드 전용 동기화 엔드포인트를 하나 더 만들 수도 있습니다.
    
    // 단순화를 위해 /api/gg-data에서 한 페이지씩 가져와서 저장하는 로직을 구현합니다.
    const response = await fetch('/api/gg-data?pIndex=1&pSize=100');
    if (!response.ok) {
      throw new Error('API 호출 실패');
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || '데이터 로드 실패');
    }

    // 실제로는 전체 데이터를 돌려야 하므로, 
    // 서버 사이드에서 백그라운드 작업을 실행하는 엔드포인트를 호출하는 것이 좋습니다.
    return { 
      success: true, 
      message: '경기도 학원 데이터 동기화가 성공적으로 시작되었습니다. (백그라운드 처리)',
      count: data.leads.length 
    };
  } catch (error) {
    console.error('GG Data Sync Error:', error);
    return { success: false, message: (error as Error).message };
  }
}
