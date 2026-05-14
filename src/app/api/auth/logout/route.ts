import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  // Supabase 세션 종료
  await supabase.auth.signOut()

  const response = NextResponse.json({ success: true })

  // 응답 객체에 직접 쿠키 삭제 명령 설정 (브라우저에서 확실히 제거됨)
  const allCookies = cookieStore.getAll()
  for (const cookie of allCookies) {
    // Supabase 관련 모든 쿠키 타겟팅 (auth-token, refresh-token 등)
    if (cookie.name.includes('supabase') || cookie.name.startsWith('sb-')) {
      // 1. 응답 객체에서 쿠키 만료 처리 (secure 속성 생략하여 로컬/운영 모두 호환되도록)
      response.cookies.set(cookie.name, '', {
        path: '/',
        maxAge: 0,
        expires: new Date(0),
        sameSite: 'lax'
      });
      
      // 2. 혹시 모를 상황을 위해 delete 메서드로 명시적 삭제 병행
      response.cookies.delete(cookie.name);
    }
  }

  return response
}
