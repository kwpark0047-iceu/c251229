import type { SupabaseClient } from '@supabase/supabase-js'

function isSupabaseStorageKey(key: string) {
  return key.startsWith('sb-') || key.toLowerCase().includes('supabase')
}

function getSupabaseProjectRef() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return null

  try {
    return new URL(supabaseUrl).hostname.split('.')[0]
  } catch {
    return null
  }
}

function removeMatchingStorage(storage: Storage) {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => !!key && isSupabaseStorageKey(key))

  keys.forEach((key) => storage.removeItem(key))
}

function expireCookie(name: string, domain?: string) {
  const domainPart = domain ? `; domain=${domain}` : ''
  document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${domainPart}`
}

function getCookieDomains() {
  const hostname = window.location.hostname

  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return [undefined]
  }

  const parts = hostname.split('.')
  const domains: Array<string | undefined> = [undefined, hostname, `.${hostname}`]

  if (parts.length > 2) {
    const parentDomain = parts.slice(-2).join('.')
    domains.push(parentDomain, `.${parentDomain}`)
  }

  return Array.from(new Set(domains))
}

export function clearSupabaseBrowserState() {
  if (typeof window === 'undefined') return

  removeMatchingStorage(window.localStorage)
  removeMatchingStorage(window.sessionStorage)

  const cookieNames = new Set(document.cookie
    .split(';')
    .map((cookie) => cookie.trim().split('=')[0])
    .filter((name) => name && (name.startsWith('sb-') || name.toLowerCase().includes('supabase'))))

  const projectRef = getSupabaseProjectRef()
  if (projectRef) {
    cookieNames.add(`sb-${projectRef}-auth-token`)
    cookieNames.add(`sb-${projectRef}-auth-token.0`)
    cookieNames.add(`sb-${projectRef}-auth-token.1`)
    cookieNames.add(`sb-${projectRef}-code-verifier`)
  }

  const domains = getCookieDomains()
  cookieNames.forEach((name) => {
    domains.forEach((domain) => expireCookie(name, domain))
  })
}

export async function resetSupabaseBrowserSession(supabase?: SupabaseClient | null) {
  if (supabase) {
    await supabase.auth.signOut().catch(() => undefined)
  }

  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
  }).catch(() => undefined)

  clearSupabaseBrowserState()
}
