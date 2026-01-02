'use client';

import Link from 'next/link';
import {
  Users,
  MapPin,
  Phone,
  BarChart3,
  Shield,
  Zap,
  ArrowRight,
  Train,
  Building2,
  Target,
  ChevronRight
} from 'lucide-react';

export default function Home() {
  const features = [
    { icon: Users, title: '리드 관리', description: '잠재 고객을 체계적으로 관리하고 영업 상태를 실시간으로 추적', color: '#00A5DE' },
    { icon: MapPin, title: '위치 기반 분석', description: '지하철역 인근 병원, 상가 정보를 지도에서 한눈에 확인', color: '#00A84D' },
    { icon: Phone, title: '통화 기록', description: '고객별 통화 이력과 메모를 기록하고 팔로업 관리', color: '#EF7C1C' },
    { icon: BarChart3, title: '영업 현황', description: '영업 파이프라인과 성과를 시각적으로 분석', color: '#9B6DD6' },
    { icon: Shield, title: '안전한 데이터', description: '조직별 데이터 분리와 역할 기반 접근 제어', color: '#E6186C' },
    { icon: Zap, title: '실시간 동기화', description: '팀원들과 실시간으로 데이터를 공유하고 협업', color: '#00A5DE' }
  ];

  const steps = [
    { step: 1, icon: Target, title: '리드 발굴', desc: '지역 데이터 API로 잠재 고객을 자동 수집', color: '#00A5DE' },
    { step: 2, icon: Building2, title: '영업 관리', desc: '상태 추적, 통화 기록, 메모로 체계적 관리', color: '#00A84D' },
    { step: 3, icon: BarChart3, title: '성과 분석', desc: '파이프라인 분석으로 전환율 향상', color: '#EF7C1C' },
  ];

  const stats = [
    { value: '9호선', label: '서울 지하철', color: '#00A5DE' },
    { value: '300+', label: '지하철역', color: '#00A84D' },
    { value: '실시간', label: '데이터 동기화', color: '#EF7C1C' },
    { value: '100%', label: '클라우드 기반', color: '#9B6DD6' },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col items-center" style={{ background: 'var(--bg-primary)' }}>
      {/* 네비게이션 */}
      <nav className="w-full sticky top-0 z-50 backdrop-blur-md border-b" style={{
        borderColor: 'var(--border-primary)',
        background: 'rgba(255,255,255,0.9)'
      }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #00A5DE 0%, #0088CC 100%)',
                boxShadow: '0 4px 12px rgba(0, 165, 222, 0.3)'
              }}>
              <Train size={18} color="white" />
            </div>
            <span className="font-bold text-lg sm:text-xl" style={{ color: 'var(--text-primary)' }}>
              Metro CRM
            </span>
          </div>
          <Link
            href="/auth"
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium text-sm sm:text-base"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)'
            }}
          >
            로그인
            <ChevronRight size={16} />
          </Link>
        </div>
      </nav>

      {/* 히어로 섹션 */}
      <section className="w-full px-4 sm:px-6 py-12 sm:py-20 text-center"
        style={{ background: 'linear-gradient(180deg, rgba(0,165,222,0.05) 0%, transparent 100%)' }}>
        <div className="max-w-3xl mx-auto">
          {/* 호선 배지 */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-6 sm:mb-8">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((line) => (
              <div
                key={line}
                className={`line-badge line-badge-${line}`}
                style={{ fontSize: '11px', minWidth: '24px', height: '24px' }}
              >
                {line}
              </div>
            ))}
          </div>

          {/* 메인 타이틀 */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight"
            style={{ color: 'var(--text-primary)' }}>
            <span className="text-gradient-accent">지하철 광고</span> 영업의
            <br />새로운 기준
          </h1>

          {/* 서브 타이틀 */}
          <p className="text-base sm:text-lg md:text-xl mb-8 sm:mb-10 leading-relaxed px-2"
            style={{ color: 'var(--text-secondary)' }}>
            서울 지하철역 주변 잠재 고객을 발굴하고,
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            체계적인 영업 관리로 성과를 높이세요.
          </p>

          {/* CTA 버튼 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/auth"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-semibold text-base sm:text-lg text-white"
              style={{
                background: 'linear-gradient(135deg, #00A5DE 0%, #0088CC 100%)',
                boxShadow: '0 8px 24px rgba(0, 165, 222, 0.3)'
              }}
            >
              시작하기
              <ArrowRight size={20} />
            </Link>
            <Link
              href="/lead-manager"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-semibold text-base sm:text-lg"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)'
              }}
            >
              데모 보기
            </Link>
          </div>
        </div>
      </section>

      {/* 통계 섹션 */}
      <section className="w-full px-4 sm:px-6 py-8 sm:py-10">
        <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)'
          }}>
          {stats.map((stat, index) => (
            <div key={index} className="text-center py-2">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-1" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 기능 섹션 */}
      <section className="w-full px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4" style={{ color: 'var(--text-primary)' }}>
              강력한 기능
            </h2>
            <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              지하철 광고 영업에 필요한 모든 도구를 한 곳에서
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-5 sm:p-6 rounded-2xl"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)'
                }}
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4"
                  style={{ background: `${feature.color}15` }}>
                  <feature.icon size={22} color={feature.color} />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 워크플로우 섹션 */}
      <section className="w-full px-4 sm:px-6 py-12 sm:py-16" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4" style={{ color: 'var(--text-primary)' }}>
              간단한 3단계
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
            {steps.map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mx-auto mb-4 sm:mb-5 flex items-center justify-center relative"
                  style={{ background: `${item.color}15`, border: `2px solid ${item.color}30` }}>
                  <item.icon size={28} color={item.color} />
                  <div className="absolute -top-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: item.color }}>
                    {item.step}
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="w-full px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-xl mx-auto p-8 sm:p-12 rounded-3xl text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 165, 222, 0.1) 0%, rgba(0, 168, 77, 0.1) 100%)',
            border: '1px solid rgba(0, 165, 222, 0.2)'
          }}>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4" style={{ color: 'var(--text-primary)' }}>
            지금 바로 시작하세요
          </h2>
          <p className="text-sm sm:text-base mb-6 sm:mb-8" style={{ color: 'var(--text-secondary)' }}>
            무료로 가입하고 지하철 광고 영업의 효율을 높여보세요.
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-semibold text-base sm:text-lg text-white"
            style={{
              background: 'linear-gradient(135deg, #00A5DE 0%, #0088CC 100%)',
              boxShadow: '0 8px 24px rgba(0, 165, 222, 0.3)'
            }}
          >
            무료로 시작하기
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="w-full px-4 sm:px-6 py-6 sm:py-8 border-t" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #00A5DE 0%, #0088CC 100%)' }}>
              <Train size={16} color="white" />
            </div>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Metro CRM
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((line) => (
              <div
                key={line}
                className={`line-badge line-badge-${line}`}
                style={{ fontSize: '8px', minWidth: '16px', height: '16px', opacity: 0.6 }}
              >
                {line}
              </div>
            ))}
          </div>

          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            © 2024 Seoul Metro Advertising Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
