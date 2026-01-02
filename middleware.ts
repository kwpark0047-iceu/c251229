import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log('[Middleware] pathname:', pathname)

  // 랜딩 페이지는 항상 통과 (리다이렉트 없음)
  if (pathname === '/') {
    console.log('[Middleware] Landing page - passing through')
    return NextResponse.next()
  }

  // 환경 변수 확인
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('[Middleware] No env vars, passing through')
    return NextResponse.next()
  }

  try {
    let supabaseResponse = NextResponse.next({
      request,
    })

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
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

    console.log('[Middleware] user:', user ? user.email : 'null')

    // 보호된 라우트 목록
    const protectedRoutes = ['/lead-manager']
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

    // 인증 페이지 (로그인된 사용자는 리다이렉트) - /auth만 포함 (랜딩 페이지 제외)
    const isAuthRoute = pathname === '/auth' || pathname.startsWith('/auth/')

    console.log('[Middleware] isProtectedRoute:', isProtectedRoute, 'isAuthRoute:', isAuthRoute)

    // 보호된 라우트에 미인증 사용자 접근 시 → 로그인 페이지로
    if (isProtectedRoute && !user) {
      console.log('[Middleware] Redirecting to /auth (unauthenticated)')
      const url = request.nextUrl.clone()
      url.pathname = '/auth'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    // 인증 페이지에 로그인된 사용자 접근 시 → 대시보드로
    if (isAuthRoute && user) {
      console.log('[Middleware] Redirecting to /lead-manager (authenticated)')
      const url = request.nextUrl.clone()
      const redirect = url.searchParams.get('redirect') || '/lead-manager'
      url.pathname = redirect
      url.searchParams.delete('redirect')
      return NextResponse.redirect(url)
    }

    console.log('[Middleware] Passing through')
    return supabaseResponse
  } catch (error) {
    console.error('[Middleware] Error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
