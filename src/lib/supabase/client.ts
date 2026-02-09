/**
 * 클라이언트 측 Supabase 클라이언트
 * 브라우저에서 실행되는 컴포넌트에서 사용합니다.
 */
import { createBrowserClient } from '@supabase/ssr'

/**
 * 브라우저용 Supabase 클라이언트를 생성합니다.
 * 클라이언트 컴포넌트('use client')에서 사용하세요.
 */
export function createClient() {
  // 환경 변수 가져오기 (호출 시점에 평가)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 환경 변수가 없으면 에러 로그 출력 (앱 중단 방지)
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase 환경 변수가 설정되지 않았습니다. .env 파일을 확인하거나 Vercel 환경변수를 설정해주세요.')
  }

  return createBrowserClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
  )
}
