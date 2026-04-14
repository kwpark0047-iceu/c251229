'use client'

import { useState, Suspense, useEffect, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

// 에러 메시지 변환 함수
function getErrorMessage(error: Error | unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  if (message.includes('Failed to fetch') || message.includes('failed to fetch')) {
    return '서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.'
  }
  if (message.includes('환경 변수')) {
    return '서버 설정 오류입니다. 관리자에게 문의해주세요.'
  }
  if (message.includes('User already registered')) {
    return '이미 등록된 이메일입니다. 해당 이메일로 로그인을 시도해 주세요.'
  }
  if (message.includes('Invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.'
  }
  if (message.includes('new row violates row-level security')) {
    return '권한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  }

  return message
}

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

function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/lead-manager'

  const [mode, setMode] = useState<AuthMode>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    // 초기값으로 Supabase 설정 오류 체크
    !isSupabaseConfigured ? '서버 설정 오류입니다. 관리자에게 문의해주세요.' : null
  )
  const [message, setMessage] = useState<string | null>(null)
  const mountedRef = useRef(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // 마운트 상태를 ref로 추적하고 state는 한 번만 업데이트
    if (!mountedRef.current) {
      mountedRef.current = true
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true)
    }
  }, [])

  const supabase = useMemo(() => {
    try {
      return createClient()
    } catch (e) {
      console.error('Supabase 클라이언트 생성 실패:', e)
      return null
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!supabase) {
      setError('서버 설정 오류입니다. 관리자에게 문의해주세요.')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(getErrorMessage(error))
        setLoading(false)
        return
      }

      router.push(redirect)
      router.refresh()
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  const [tier, setTier] = useState<'FREE' | 'DEMO' | 'MEDIA' | 'SALES'>('FREE')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!supabase) {
      setError('서버 설정 오류입니다. 관리자에게 문의해주세요.')
      setLoading(false)
      return
    }

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

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            tier,
            full_name: fullName || email.split('@')[0], 
            org_name: orgName || `${fullName || email.split('@')[0]}의 조직`,
          }
        },
      })
      
      if (signUpError) {
        const errorMsg = getErrorMessage(signUpError)
        // 중복 이메일 에러 발생 시 자동으로 로그인 모드로 전환
        if (errorMsg.includes('이미 등록된 이메일')) {
          setMode('login')
          setError(null)
          setMessage('이미 등록된 계정입니다. 해당 이메일로 로그인을 진행해 주세요.')
        } else {
          setError(errorMsg)
        }
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('회원가입에 실패했습니다.')
        setLoading(false)
        return
      }

      // [중요] 조직 및 멤버십 생성은 이제 DB 트리거(handle_new_user)가 담당함
      // 클라이언트 사이드 INSERT는 RLS 충돌 위험이 있어 제거됨

      const approvalMessage = (tier === 'MEDIA' || tier === 'SALES') 
        ? '회원가입 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다. 전송된 인증 메일을 확인해주세요.'
        : '회원가입이 성공적으로 완료되었습니다. 전송된 인증 메일을 확인하신 후 로그인해 주세요.';
        
      setMessage(approvalMessage)
      setLoading(false)
    } catch (err) {
      console.error('회원가입 오류:', err)
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!supabase) {
      setError('서버 설정 오류입니다. 관리자에게 문의해주세요.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }

    try {
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
          data: {
            tier, // 조직 가입 시에도 등급 적용 가능성 대비
            full_name: fullName || email.split('@')[0],
          }
        },
      })

      if (signUpError) {
        setError(getErrorMessage(signUpError))
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
        setError(getErrorMessage(memberError))
        setLoading(false)
        return
      }

      setMessage(`'${orgData.name}' 조직에 가입되었습니다. 이메일을 확인해주세요.`)
      setLoading(false)
    } catch (err) {
      console.error('조직 가입 오류:', err)
      setError(getErrorMessage(err))
      setLoading(false)
    }
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

          {/* Success State View */}
          {message ? (
            <div className="py-8 text-center animate-scale-in">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100">
                <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">신청 완료</h3>
              <p className="text-slate-600 mb-8 whitespace-pre-line leading-relaxed">
                {message}
              </p>
              <button
                onClick={() => { setMessage(null); setMode('login'); }}
                className="metro-btn metro-btn-primary w-full py-4 text-lg font-bold shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #00A84D 0%, #008840 100%)',
                  boxShadow: '0 8px 32px rgba(0, 168, 77, 0.3)'
                }}
              >
                확인
              </button>
            </div>
          ) : (
            <>
              {/* Login Form */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="animate-fade-in-up delay-100">
                    <label className="metro-input-label">이메일</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="metro-input text-slate-900"
                      placeholder="example@email.com"
                    />
                  </div>
                  <div className="animate-fade-in-up delay-200">
                    <label className="metro-input-label">비밀번호</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="metro-input text-slate-900"
                      placeholder="••••••••"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="metro-btn metro-btn-primary w-full mt-2 animate-fade-in-up delay-300"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2 justify-center">
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
                  <div className="animate-fade-in-up delay-75">
                    <label className="metro-input-label">사용자 이름</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="metro-input text-slate-900"
                      placeholder="실명을 입력해 주세요"
                    />
                  </div>
                  <div className="animate-fade-in-up delay-100">
                    <label className="metro-input-label">이메일</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="metro-input text-slate-900"
                      placeholder="example@email.com"
                    />
                  </div>
                  <div className="animate-fade-in-up delay-200">
                    <label className="metro-input-label">비밀번호</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="metro-input text-slate-900"
                      placeholder="6자 이상"
                    />
                  </div>
                  <div className="animate-fade-in-up delay-300">
                    <label className="metro-input-label">비밀번호 확인</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="metro-input text-slate-900"
                      placeholder="비밀번호 재입력"
                    />
                  </div>
                  <div className="animate-fade-in-up delay-[350ms]">
                    <label className="metro-input-label">가입 등급 선택</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {[
                        { id: 'FREE', label: '일반', desc: '즉시 승인' },
                        { id: 'DEMO', label: '데모', desc: '1주일 체험' },
                        { id: 'MEDIA', label: '매체사', desc: '관리자 승인' },
                        { id: 'SALES', label: '영업', desc: '관리자 승인' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTier(t.id as any)}
                          className={`p-3 rounded-xl border text-left transition-all duration-300 group ${tier === t.id
                              ? 'bg-emerald-50 border-emerald-500 shadow-sm shadow-emerald-200/50'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-bold ${tier === t.id ? 'text-emerald-700' : 'text-slate-700'}`}>
                              {t.label}
                            </span>
                            {tier === t.id && (
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            )}
                          </div>
                          <p className={`text-[10px] ${tier === t.id ? 'text-emerald-600/70' : 'text-slate-400'}`}>
                            {t.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="animate-fade-in-up delay-400">
                    <label className="metro-input-label">
                      조직명 <span style={{ color: 'var(--text-tertiary)' }}>(선택)</span>
                    </label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="metro-input text-slate-900"
                      placeholder="우리 회사"
                    />
                    <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      미입력시 자동으로 생성됩니다
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="metro-btn w-full mt-2 animate-float-subtle delay-500 scale-[1.02] hover:scale-[1.05]"
                    style={{
                      background: 'linear-gradient(135deg, #00A84D 0%, #008840 100%)',
                      color: 'white',
                      fontWeight: 'bold',
                      letterSpacing: '0.05em',
                      boxShadow: '0 8px 32px rgba(0, 168, 77, 0.4)'
                    }}
                  >
                    {loading ? '가입 신청 중...' : '회원가입 확인'}
                  </button>
                </form>
              )}

              {/* Join Org Form */}
              {mode === 'join-org' && (
                <form onSubmit={handleJoinOrg} className="space-y-5">
                  <div className="animate-fade-in-up delay-100">
                    <label className="metro-input-label">초대 코드</label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      required
                      className="metro-input font-mono tracking-wider text-slate-900"
                      placeholder="abc123def456"
                    />
                    <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      조직 관리자에게 초대 코드를 받으세요
                    </p>
                  </div>
                  <div className="animate-fade-in-up delay-150">
                    <label className="metro-input-label">사용자 이름</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="metro-input text-slate-900"
                      placeholder="실명을 입력해 주세요"
                    />
                  </div>
                  <div className="animate-fade-in-up delay-200">
                    <label className="metro-input-label">이메일</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="metro-input text-slate-900"
                      placeholder="example@email.com"
                    />
                  </div>
                  <div className="animate-fade-in-up delay-300">
                    <label className="metro-input-label">비밀번호</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="metro-input text-slate-900"
                      placeholder="6자 이상"
                    />
                  </div>
                  <div className="animate-fade-in-up delay-400">
                    <label className="metro-input-label">비밀번호 확인</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="metro-input text-slate-900"
                      placeholder="비밀번호 재입력"
                    />
                  </div>
                  <div className="animate-fade-in-up delay-[450ms]">
                    <label className="metro-input-label">가입 등급 선택</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {[
                        { id: 'FREE', label: '일반', desc: '즉시 승인' },
                        { id: 'DEMO', label: '데모', desc: '1주일 체험' },
                        { id: 'MEDIA', label: '매체사', desc: '관리자 승인' },
                        { id: 'SALES', label: '영업', desc: '관리자 승인' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTier(t.id as any)}
                          className={`p-3 rounded-xl border text-left transition-all duration-300 group ${tier === t.id
                              ? 'bg-orange-50 border-orange-500 shadow-sm shadow-orange-200/50'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-bold ${tier === t.id ? 'text-orange-700' : 'text-slate-700'}`}>
                              {t.label}
                            </span>
                            {tier === t.id && (
                              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                            )}
                          </div>
                          <p className={`text-[10px] ${tier === t.id ? 'text-orange-600/70' : 'text-slate-400'}`}>
                            {t.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="metro-btn w-full mt-2 animate-float-subtle delay-[500ms] scale-[1.02] hover:scale-[1.05]"
                    style={{
                      background: 'linear-gradient(135deg, #EF7C1C 0%, #D06A15 100%)',
                      color: 'white',
                      fontWeight: 'bold',
                      letterSpacing: '0.05em',
                      boxShadow: '0 8px 32px rgba(239, 124, 28, 0.4)'
                    }}
                  >
                    {loading ? '가입 신청 중...' : '회원가입 확인'}
                  </button>
                </form>
              )}
            </>
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
function AuthLoading() {
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
