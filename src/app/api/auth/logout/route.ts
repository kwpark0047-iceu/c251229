import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function getSupabaseProjectRef() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return null

  try {
    return new URL(supabaseUrl).hostname.split('.')[0]
  } catch {
    return null
  }
}

function isSupabaseCookie(name: string) {
  return name.startsWith('sb-') || name.toLowerCase().includes('supabase')
}

function expireAuthCookie(response: NextResponse, name: string) {
  response.cookies.set(name, '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    sameSite: 'lax',
  })
}

function expireSupabaseCookies(request: NextRequest, response: NextResponse) {
  const projectRef = getSupabaseProjectRef()
  const cookieNames = new Set(
    request.cookies
      .getAll()
      .map((cookie) => cookie.name)
      .filter(isSupabaseCookie)
  )

  if (projectRef) {
    cookieNames.add(`sb-${projectRef}-auth-token`)
    cookieNames.add(`sb-${projectRef}-auth-token.0`)
    cookieNames.add(`sb-${projectRef}-auth-token.1`)
    cookieNames.add(`sb-${projectRef}-code-verifier`)
  }

  cookieNames.forEach((name) => expireAuthCookie(response, name))
}

async function logout(request: NextRequest) {
  const response = NextResponse.json({ success: true }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    await supabase.auth.signOut().catch(() => undefined)
  }

  expireSupabaseCookies(request, response)
  return response
}

export async function POST(request: NextRequest) {
  return logout(request)
}

export async function GET(request: NextRequest) {
  return logout(request)
}
