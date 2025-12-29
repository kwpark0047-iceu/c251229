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
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
