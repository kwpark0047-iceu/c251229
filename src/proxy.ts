import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next.js 16 Proxy (구 middleware)
 * 세션 관리 및 라우트 보호
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const logoutParam = request.nextUrl.searchParams.get('logout')

  // 환경 변수 확인 (상단으로 이동하여 로그아웃 로직에서 사용 가능하게 함)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 0. 최우선 순위: 로그아웃 파라미터 감지 시 즉시 세션 파기 및 리다이렉트
  if (logoutParam === '1' || request.url.includes('logout=1')) {
    console.log('[Middleware] Priority Logout Detected - Forcing session clearance')
    const response = NextResponse.next()
    
    // 서버 사이드 로그아웃 시도
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
          cookies: {
            getAll() { return request.cookies.getAll() },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options)
              })
            },
          },
        })
        await supabase.auth.signOut()
      } catch (e) {
        console.error('[Middleware] SignOut error:', e)
      }
    }

    // 쿠키 삭제 (가장 공격적인 방식: 모든 도메인/경로 명시)
    const hostname = request.headers.get('host')?.split(':')[0] || ''
    const cookieNames = request.cookies.getAll().map(c => c.name)
    
    // 명시적으로 알려진 Supabase 인증 관련 쿠키 패턴들
    const knownSupabasePatterns = ['sb-', 'supabase', 'auth-token', 'refresh-token', 'pkce']
    
    cookieNames.forEach((name) => {
      const lowerName = name.toLowerCase()
      if (knownSupabasePatterns.some(p => lowerName.includes(p))) {
        const options = { path: '/', maxAge: 0, expires: new Date(0), sameSite: 'lax' as const }
        
        // 1. 기본 경로 삭제
        response.cookies.set(name, '', options)
        
        // 2. 현재 호스트 삭제
        response.cookies.set(name, '', { ...options, domain: hostname })
        
        // 3. Vercel 등 배포 환경 도메인 처리 (.vercel.app 등)
        if (hostname.includes('.') && !hostname.startsWith('localhost')) {
          const parts = hostname.split('.')
          if (parts.length >= 2) {
            // .vercel.app 또는 .customdomain.com
            const rootDomain = `.${parts.slice(-2).join('.')}`
            response.cookies.set(name, '', { ...options, domain: rootDomain })
            
            // 만약 서브도메인이 더 있는 경우 (예: test.app.vercel.app)
            if (parts.length >= 3) {
              const subDomain = `.${parts.slice(-3).join('.')}`
              response.cookies.set(name, '', { ...options, domain: subDomain })
            }
          }
        }
      }
    })

    console.log('[Middleware] Cookies cleared, proceeding to /auth')
    return response
  }

  console.log('[Middleware] pathname:', pathname)

  // 랜딩 페이지는 항상 통과
  if (pathname === '/') {
    return NextResponse.next()
  }

  if (!supabaseUrl || !supabaseAnonKey) {
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

    // 인증 페이지에 로그인된 사용자 접근 시 → 대시보드로 (단, 로그아웃 요청 중인 경우 리다이렉트 차단)
    if (isAuthRoute && user && logoutParam !== '1') {
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
    console.error('[Middleware] Auth Error:', error)
    
    // 보호된 라우트에서 오류 발생 시 로그인 페이지로 강제 이동
    const protectedRoutes = ['/lead-manager']
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    
    if (isProtectedRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth'
      url.searchParams.set('redirect', pathname)
      url.searchParams.set('error', 'session_expired')
      return NextResponse.redirect(url)
    }
    
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
