/**
 * Supabase 유틸리티 함수
 * 공통으로 사용되는 Supabase 클라이언트 생성 함수
 */

import { createClient } from './client';

/**
 * Supabase 클라이언트 인스턴스 가져오기
 * 모든 서비스 레이어에서 공통으로 사용
 */
export function getSupabase() {
  return createClient();
}
