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
  ChevronRight,
  Sparkles,
  MousePointer2
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import AiRecommendWidget from '@/components/AiRecommendWidget';
import SubwayNetworkMap from '@/components/SubwayNetworkMap';

export default function Home() {
  const features = [
    { icon: Users, title: '리드 관리', description: '잠재 고객을 체계적으로 관리하고 영업 상태를 실시간으로 추적', color: '#00A5DE' },
    { icon: MapPin, title: '위치 기반 분석', description: '지하철역 인근 병원, 상가 정보를 지도에서 한눈에 확인', color: '#00A84D' },
    { icon: Phone, title: '통화 기록', description: '고객별 통화 이력과 메모를 기록하고 팔로업 관리', color: '#EF7C1C' },
    { icon: BarChart3, title: '영업 현황', description: '영업 파이프라인과 성과를 시각적으로 분석', color: '#9B6DD6' },
  ];

  const stats = [
    { value: '서울교통공사', label: '공식 광고 매체', color: '#00A5DE' },
    { value: '300+', label: '지하철 역사 데이터', color: '#00A84D' },
    { value: 'AI 자동화', label: '광고주 맞춤 추천', color: '#EF7C1C' },
    { value: '실시간', label: '유동인구 분석', color: '#9B6DD6' },
  ];

  return (
    <div className="min-h-screen w-full bg-void overflow-x-hidden">
      {/* 프리미엄 네비게이션 */}
      <nav className="header-blur sticky top-0 z-50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Train size={22} className="text-white" />
            </div>
            <span className="font-display text-2xl tracking-tight text-white group-hover:text-blue-400 transition-colors">
              WE MARKET
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
              <Link href="#features" className="hover:text-blue-400 transition-colors">기능소개</Link>
              <Link href="#subway-map" className="hover:text-blue-400 transition-colors">실시간 데이터</Link>
              <Link href="#ai-recommend" className="hover:text-blue-400 transition-colors">AI 추천</Link>
            </div>
            <div className="h-6 w-px bg-white/10 hidden md:block" />
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link
                href="/auth"
                className="metro-btn-ghost px-5 py-2 text-sm flex items-center gap-2 group"
              >
                관리자 로그인
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 히어로 섹션 (Antigravity Zero-G) */}
      <section className="relative pt-24 pb-32 px-6 overflow-hidden">
        {/* 배경 애니메이션 오브 */}
        <div className="gradient-orb orb-green top-20 -left-40 w-[500px] h-[500px] opacity-20 animate-pulse" />
        <div className="gradient-orb orb-blue bottom-0 -right-40 w-[600px] h-[600px] opacity-10" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold mb-8 animate-fade-in-down">
            <Sparkles size={16} />
            AI 기반 데이터 플랫폼 위마켓 2.0 정식 출시
          </div>
          
          <h1 className="text-display-lg mb-8 animate-fade-in-up">
            지하철 광고의 표준,<br />
            <span className="text-gradient-metro">데이터로 증명합니다.</span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in-up delay-100">
            서울교통공사 실시간 유동인구와 업종별 타겟 분석을 바탕으로 <br />
            당신의 비즈니스에 가장 완벽한 지하철 광고를 추천합니다.
          </p>

          <div className="flex flex-wrap justify-center gap-6 animate-fade-in-up delay-200">
            <Link href="#ai-recommend" className="metro-btn-primary px-10 py-5 text-lg group">
              AI 자동 추천 시작하기
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/contact" className="glass-card flex items-center gap-3 px-10 py-5 text-lg font-semibold text-white hover:bg-white/5 border border-white/10">
              광고 매체 문의
              <MousePointer2 size={18} className="text-blue-400" />
            </Link>
          </div>
        </div>
      </section>

      {/* 통계 섹션 (Floating Cards) */}
      <section className="max-w-7xl mx-auto px-6 -mt-16 relative z-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="glass-card p-8 animate-float-subtle" style={{ animationDelay: `${i * 150}ms` }}>
              <div className="text-3xl font-black mb-2" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 스마트 노선도 섹션 */}
      <section id="subway-map" className="pt-32 pb-20">
        <SubwayNetworkMap />
      </section>

      {/* AI 추천 위젯 섹션 (핵심 영역) */}
      <section id="ai-recommend" className="py-24 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center mb-12 px-6">
          <h2 className="text-display text-4xl mb-4 text-white">데이터가 말해주는 최적의 위치</h2>
          <p className="text-gray-400">간단한 정보 입력만으로 서울교통공사 1-8호선의 수만 가지 데이터 중 <br />귀하의 업체에 가장 적합한 TOP 2 역사를 제안합니다.</p>
        </div>
        <AiRecommendWidget />
      </section>

      {/* 기능 하이라이트 */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div className="max-w-xl">
              <h2 className="text-display text-4xl mb-4 text-white">압도적인 비즈니스 툴</h2>
              <p className="text-gray-400 text-lg">단순한 광고 집행을 넘어, 영업 파이프라인 관리와 성과 분석까지 하나의 플랫폼에서 해결하세요.</p>
            </div>
            <div className="text-blue-400 font-bold flex items-center gap-2 cursor-pointer hover:underline">
              모든 기능 상세히 보기 <ArrowRight size={18} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="glass-card-elevated p-8 group hover:scale-[1.03] transition-transform duration-500"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8" style={{ background: `${feature.color}15` }}>
                  <feature.icon size={28} style={{ color: feature.color }} />
                </div>
                <h3 className="text-xl font-bold mb-4 text-white group-hover:text-blue-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 최종 CTA */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-3xl" />
        <div className="max-w-4xl mx-auto glass-card p-16 text-center animate-float relative z-10 border-blue-500/20">
          <h2 className="text-display text-4xl mb-6 text-white">서울교통공사 공식 광고 대행 시스템</h2>
          <p className="text-xl text-gray-400 mb-10">귀하의 브랜드 가치를 올바른 장소에서 증명하세요.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/contact" className="metro-btn-primary px-12 py-5 text-lg">
              광고 상담 받기
            </Link>
            <Link href="/auth" className="metro-btn-ghost px-12 py-5 text-lg border border-white/10">
              이미 계정이 있으신가요?
            </Link>
          </div>
        </div>
      </section>

      {/* 푸터 (Anchored) */}
      <footer className="footer-copyright py-12 border-t border-white/5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Train size={16} className="text-blue-400" />
            </div>
            <span className="font-display text-lg text-white">WE MARKET</span>
          </div>
          
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(l => (
              <div key={l} className={`line-badge line-badge-${l} opacity-40 hover:opacity-100 transition-opacity`}>
                {l}
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-500">
            © 2026 WeMarket Platform for Seoul Metro Advertising. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
