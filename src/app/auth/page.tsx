'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type AuthMode = 'login' | 'signup' | 'join-org'

// Metro Line SVG Pattern Component
function MetroPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="metro-grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <circle cx="30" cy="30" r="1.5" fill="currentColor" />
          <path d="M0 30h60M30 0v60" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#metro-grid)" />
    </svg>
  )
}

// Animated Metro Line
function MetroLine({ color, delay, position }: { color: string; delay: number; position: string }) {
  return (
    <div
      className={`absolute ${position} w-[2px] opacity-0`}
      style={{
        background: `linear-gradient(180deg, transparent 0%, ${color} 30%, ${color} 70%, transparent 100%)`,
        animation: `fadeIn 1s ease-out ${delay}s forwards`,
        height: '40%'
      }}
    />
  )
}

// Station Dot Animation
function StationDot({ color, delay, size = 8 }: { color: string; delay: number; size?: number }) {
  return (
    <div
      className="relative opacity-0"
      style={{ animation: `scaleIn 0.5s ease-out ${delay}s forwards` }}
    >
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: color,
          boxShadow: `0 0 ${size * 2}px ${color}40`
        }}
      />
      <div
        className="absolute inset-0 rounded-full animate-ping"
        style={{
          background: color,
          opacity: 0.4,
          animationDuration: '2s'
        }}
      />
    </div>
  )
}

export function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/lead-manager'

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? '이메일 또는 비밀번호가 올바르지 않습니다.'
        : error.message)
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      setLoading(false)
      return
    }

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (!authData.user) {
      setError('회원가입에 실패했습니다.')
      setLoading(false)
      return
    }

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: orgName || `${email.split('@')[0]}의 조직` })
      .select()
      .single()

    if (orgError) {
      setError('조직 생성에 실패했습니다.')
      setLoading(false)
      return
    }

    await supabase
      .from('organization_members')
      .insert({
        organization_id: orgData.id,
        user_id: authData.user.id,
        role: 'owner',
      })

    setMessage('회원가입이 완료되었습니다. 이메일을 확인해주세요.')
    setLoading(false)
  }

  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('invite_code', inviteCode.trim())
      .single()

    if (orgError || !orgData) {
      setError('유효하지 않은 초대 코드입니다.')
      setLoading(false)
      return
    }

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (!authData.user) {
      setError('회원가입에 실패했습니다.')
      setLoading(false)
      return
    }

    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: orgData.id,
        user_id: authData.user.id,
        role: 'member',
      })

    if (memberError) {
      setError('조직 가입에 실패했습니다.')
      setLoading(false)
      return
    }

    setMessage(`'${orgData.name}' 조직에 가입되었습니다. 이메일을 확인해주세요.`)
    setLoading(false)
  }

  const tabs = [
    { id: 'login' as AuthMode, label: '로그인', color: '#00A5DE' },
    { id: 'signup' as AuthMode, label: '회원가입', color: '#00A84D' },
    { id: 'join-org' as AuthMode, label: '조직 가입', color: '#EF7C1C' },
  ]

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
         style={{ background: 'var(--bg-primary)' }}>

      {/* Background Elements */}
      <div className="absolute inset-0 metro-grid-bg" />
      <MetroPattern />

      {/* Gradient Orbs */}
      <div className="gradient-orb gradient-orb-blue w-[500px] h-[500px] -top-[200px] -left-[200px]" />
      <div className="gradient-orb gradient-orb-green w-[400px] h-[400px] -bottom-[150px] -right-[150px]" />
      <div className="gradient-orb gradient-orb-orange w-[300px] h-[300px] top-1/2 -right-[100px] opacity-20" />

      {/* Decorative Metro Lines */}
      {mounted && (
        <>
          <MetroLine color="#00A5DE" delay={0.5} position="left-[10%] top-[10%]" />
          <MetroLine color="#00A84D" delay={0.7} position="right-[15%] top-[20%]" />
          <MetroLine color="#EF7C1C" delay={0.9} position="left-[20%] bottom-[15%]" />
        </>
      )}

      {/* Station Dots */}
      <div className="absolute top-[15%] left-[12%] hidden lg:block">
        <StationDot color="#00A5DE" delay={1.2} />
      </div>
      <div className="absolute top-[35%] left-[8%] hidden lg:block">
        <StationDot color="#00A5DE" delay={1.4} size={6} />
      </div>
      <div className="absolute bottom-[25%] right-[18%] hidden lg:block">
        <StationDot color="#00A84D" delay={1.6} />
      </div>

      {/* Main Content */}
      <div className={`relative z-10 w-full max-w-[440px] ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>

        {/* Header */}
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00A5DE] to-[#0088CC] flex items-center justify-center shadow-lg"
                   style={{ boxShadow: '0 8px 32px rgba(0, 165, 222, 0.3)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              {/* Pulse Ring */}
              <div className="absolute inset-0 rounded-2xl animate-ping opacity-20"
                   style={{ background: 'linear-gradient(135deg, #00A5DE 0%, #0088CC 100%)' }} />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-display mb-2" style={{ color: 'var(--text-primary)' }}>
            <span className="text-gradient-accent">지하철</span> 광고 영업
          </h1>
          <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>
            SEOUL METRO ADVERTISING PLATFORM
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass-card-elevated p-8">

          {/* Tab Navigation */}
          <div className="flex gap-1 p-1 rounded-xl mb-8" style={{ background: 'var(--bg-tertiary)' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setMode(tab.id); setError(null); setMessage(null); }}
                className="relative flex-1 py-3 text-sm font-semibold rounded-lg transition-all duration-300"
                style={{
                  color: mode === tab.id ? 'white' : 'var(--text-secondary)',
                  background: mode === tab.id ? tab.color : 'transparent',
                  boxShadow: mode === tab.id ? `0 4px 16px ${tab.color}40` : 'none'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl animate-scale-in"
                 style={{
                   background: 'rgba(230, 24, 108, 0.1)',
                   border: '1px solid rgba(230, 24, 108, 0.3)'
                 }}>
              <p className="text-sm font-medium" style={{ color: '#E6186C' }}>{error}</p>
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="mb-6 p-4 rounded-xl animate-scale-in"
                 style={{
                   background: 'rgba(0, 168, 77, 0.1)',
                   border: '1px solid rgba(0, 168, 77, 0.3)'
                 }}>
              <p className="text-sm font-medium" style={{ color: '#00A84D' }}>{message}</p>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="animate-fade-in-up delay-100" style={{ opacity: 0 }}>
                <label className="metro-input-label">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="metro-input"
                  placeholder="example@email.com"
                />
              </div>
              <div className="animate-fade-in-up delay-200" style={{ opacity: 0 }}>
                <label className="metro-input-label">비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="metro-input"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="metro-btn metro-btn-primary w-full mt-2 animate-fade-in-up delay-300"
                style={{ opacity: 0 }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    로그인 중...
                  </span>
                ) : '로그인'}
              </button>
            </form>
          )}

          {/* Signup Form */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="animate-fade-in-up delay-100" style={{ opacity: 0 }}>
                <label className="metro-input-label">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="metro-input"
                  placeholder="example@email.com"
                />
              </div>
              <div className="animate-fade-in-up delay-200" style={{ opacity: 0 }}>
                <label className="metro-input-label">비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="metro-input"
                  placeholder="6자 이상"
                />
              </div>
              <div className="animate-fade-in-up delay-300" style={{ opacity: 0 }}>
                <label className="metro-input-label">비밀번호 확인</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="metro-input"
                  placeholder="비밀번호 재입력"
                />
              </div>
              <div className="animate-fade-in-up delay-400" style={{ opacity: 0 }}>
                <label className="metro-input-label">
                  조직명 <span style={{ color: 'var(--text-tertiary)' }}>(선택)</span>
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="metro-input"
                  placeholder="우리 회사"
                />
                <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  미입력시 자동으로 생성됩니다
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="metro-btn w-full mt-2 animate-fade-in-up delay-500"
                style={{
                  opacity: 0,
                  background: 'linear-gradient(135deg, #00A84D 0%, #008840 100%)',
                  color: 'white',
                  boxShadow: '0 4px 16px rgba(0, 168, 77, 0.3)'
                }}
              >
                {loading ? '가입 중...' : '회원가입'}
              </button>
            </form>
          )}

          {/* Join Org Form */}
          {mode === 'join-org' && (
            <form onSubmit={handleJoinOrg} className="space-y-5">
              <div className="animate-fade-in-up delay-100" style={{ opacity: 0 }}>
                <label className="metro-input-label">초대 코드</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  className="metro-input font-mono tracking-wider"
                  placeholder="abc123def456"
                />
                <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  조직 관리자에게 초대 코드를 받으세요
                </p>
              </div>
              <div className="animate-fade-in-up delay-200" style={{ opacity: 0 }}>
                <label className="metro-input-label">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="metro-input"
                  placeholder="example@email.com"
                />
              </div>
              <div className="animate-fade-in-up delay-300" style={{ opacity: 0 }}>
                <label className="metro-input-label">비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="metro-input"
                  placeholder="6자 이상"
                />
              </div>
              <div className="animate-fade-in-up delay-400" style={{ opacity: 0 }}>
                <label className="metro-input-label">비밀번호 확인</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="metro-input"
                  placeholder="비밀번호 재입력"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="metro-btn w-full mt-2 animate-fade-in-up delay-500"
                style={{
                  opacity: 0,
                  background: 'linear-gradient(135deg, #EF7C1C 0%, #D06A15 100%)',
                  color: 'white',
                  boxShadow: '0 4px 16px rgba(239, 124, 28, 0.3)'
                }}
              >
                {loading ? '가입 중...' : '조직에 가입'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            {[1, 2, 3, 4, 5].map((line) => (
              <div key={line} className={`line-badge line-badge-${line}`} style={{ fontSize: 10, minWidth: 20, height: 20 }}>
                {line}
              </div>
            ))}
          </div>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Seoul Metro Lead Management System
          </p>
        </div>
      </div>

      {/* Noise Overlay */}
      <div className="noise-overlay" />
    </div>
  )
}

// Loading Fallback
export function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00A5DE] to-[#0088CC] flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>로딩 중...</p>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthContent />
    </Suspense>
  )
}
