/**
 * 서버 측 Supabase 클라이언트
 * 서버 컴포넌트, API 라우트, 서버 액션에서 사용합니다.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 환경 변수 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * 서버용 Supabase 클라이언트를 생성합니다.
 * 서버 컴포넌트, Route Handlers, Server Actions에서 사용하세요.
 */
export async function createClient() {
  const cookieStore = await cookies()

  // 환경 변수가 없으면 더미 클라이언트 반환
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase 환경 변수가 설정되지 않았습니다.')
    return createServerClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        cookies: {
          getAll() { return [] },
          setAll() {},
        },
      }
    )
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // 서버 컴포넌트에서 호출 시 무시됨
            // 미들웨어에서 세션 갱신이 필요할 경우 처리됨
          }
        },
      },
    }
  )
}
