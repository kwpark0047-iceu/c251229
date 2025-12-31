import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  // 세션 갱신 (중요: 인증 상태 유지)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // 루트 경로는 /lead-manager로 리다이렉트
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/lead-manager'
    return NextResponse.redirect(url)
  }

  // 보호된 라우트 목록
  const protectedRoutes = ['/lead-manager']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // 인증 페이지 (로그인된 사용자는 리다이렉트)
  const authRoutes = ['/auth']
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // 보호된 라우트에 미인증 사용자 접근 시 → 로그인 페이지로
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // 인증 페이지에 로그인된 사용자 접근 시 → 메인 페이지로
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    const redirect = url.searchParams.get('redirect') || '/lead-manager'
    url.pathname = redirect
    url.searchParams.delete('redirect')
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * 다음 경로는 제외:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화 파일)
     * - favicon.ico (파비콘)
     * - public 폴더 파일들
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
