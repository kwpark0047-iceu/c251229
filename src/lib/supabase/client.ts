/**
 * 클라이언트 측 Supabase 클라이언트
 * 브라우저에서 실행되는 컴포넌트에서 사용합니다.
 */
import { createBrowserClient } from '@supabase/ssr'

// 환경 변수 가져오기 (빌드 타임에 인라인됨)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 환경 변수 유효성 검사
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

/**
 * 브라우저용 Supabase 클라이언트를 생성합니다.
 * 클라이언트 컴포넌트('use client')에서 사용하세요.
 */
export function createClient() {
  // 환경 변수가 없으면 에러 throw
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase 환경 변수가 설정되지 않았습니다.')
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다. Vercel 환경변수를 확인해주세요.')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
