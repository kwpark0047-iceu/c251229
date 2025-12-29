/**
 * Supabase 미들웨어 유틸리티
 * 세션 갱신 및 인증 상태 관리를 처리합니다.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * 요청마다 Supabase 세션을 갱신합니다.
 * 이 함수는 middleware.ts에서 호출되어야 합니다.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 세션 갱신을 위해 getUser() 호출 (중요!)
  // 이 코드는 제거하지 마세요
  await supabase.auth.getUser()

  return supabaseResponse
}
