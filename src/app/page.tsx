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
import ThemeToggle from '@/components/ThemeToggle';

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
    { value: '서울교통공사', label: '광고 매체', color: '#00A5DE' },
    { value: '한국철도공사', label: '광고 매체', color: '#003DA5' },
    { value: '300+', label: '지하철역', color: '#00A84D' },
    { value: '실시간', label: '데이터 동기화', color: '#EF7C1C' },
    { value: '100%', label: '클라우드 기반', color: '#9B6DD6' },
  ];

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: 'var(--bg-primary)' }}>
      {/* 네비게이션 */}
      <nav style={{
        width: '100%',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--glass-bg)'
      }}>
        <div style={{
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #00A5DE 0%, #0088CC 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 165, 222, 0.3)'
            }}>
              <Train size={20} color="white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '20px', color: 'var(--text-primary)' }}>
              위마켓
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ThemeToggle />
            <Link
              href="/auth"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '12px',
                fontWeight: 500,
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                textDecoration: 'none'
              }}
            >
              로그인
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* 히어로 섹션 */}
      <section style={{
        width: '100%',
        padding: '60px 16px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(0,165,222,0.05) 0%, transparent 100%)',
        boxSizing: 'border-box'
      }}>
        <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
          {/* 호선 배지 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((line) => (
              <div
                key={line}
                className={`line-badge line-badge-${line}`}
                style={{ fontSize: '12px', minWidth: '28px', height: '28px' }}
              >
                {line}
              </div>
            ))}
          </div>

          {/* 메인 타이틀 */}
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 52px)',
            fontWeight: 700,
            marginBottom: '20px',
            lineHeight: 1.3,
            color: 'var(--text-primary)'
          }}>
            <span className="text-gradient-accent">당신에게 맞는</span> 광고를
            <br />확인하세요
          </h1>

          {/* 서브 타이틀 */}
          <p style={{
            fontSize: 'clamp(14px, 3vw, 18px)',
            marginBottom: '32px',
            lineHeight: 1.7,
            color: 'var(--text-secondary)'
          }}>
            당신에게 맞는 광고매체를 찾아드리고 매칭하겠습니다.
          </p>

          {/* CTA 버튼 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
            <Link
              href="/contact"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '16px',
                color: 'white',
                background: 'linear-gradient(135deg, #00A5DE 0%, #0088CC 100%)',
                boxShadow: '0 8px 24px rgba(0, 165, 222, 0.3)',
                textDecoration: 'none'
              }}
            >
              AI자동추천
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/lead-manager"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '16px',
                color: 'var(--text-primary)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                textDecoration: 'none'
              }}
            >
              데모 보기
            </Link>
          </div>
        </div>
      </section>

      {/* 통계 섹션 */}
      <section style={{ width: '100%', padding: '40px 16px', boxSizing: 'border-box' }}>
        <div style={{
          maxWidth: '900px',
          width: '100%',
          margin: '0 auto',
          padding: '24px',
          borderRadius: '16px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '16px',
          boxSizing: 'border-box'
        }}>
          {stats.map((stat, index) => (
            <div key={index} style={{ textAlign: 'center', padding: '8px' }}>
              <div style={{ fontSize: 'clamp(14px, 3vw, 20px)', fontWeight: 700, marginBottom: '4px', color: stat.color, whiteSpace: 'nowrap' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 기능 섹션 */}
      <section style={{ width: '100%', padding: '48px 16px', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
              강력한 기능
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
              지하철 광고 영업에 필요한 모든 도구를 한 곳에서
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px'
          }}>
            {features.map((feature) => (
              <div
                key={feature.title}
                style={{
                  padding: '24px',
                  borderRadius: '16px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  background: `${feature.color}20`
                }}>
                  <feature.icon size={24} color={feature.color} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 워크플로우 섹션 */}
      <section style={{ width: '100%', padding: '48px 16px', background: 'var(--bg-secondary)', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
              간단한 3단계
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '32px'
          }}>
            {steps.map((item) => (
              <div key={item.step} style={{ textAlign: 'center' }}>
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '18px',
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  background: `${item.color}15`,
                  border: `2px solid ${item.color}30`
                }}>
                  <item.icon size={28} color={item.color} />
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '13px',
                    background: item.color
                  }}>
                    {item.step}
                  </div>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section style={{ width: '100%', padding: '60px 16px', boxSizing: 'border-box' }}>
        <div style={{
          maxWidth: '560px',
          width: '100%',
          margin: '0 auto',
          padding: '40px 24px',
          borderRadius: '20px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(0, 165, 222, 0.1) 0%, rgba(0, 168, 77, 0.1) 100%)',
          border: '1px solid rgba(0, 165, 222, 0.2)',
          boxSizing: 'border-box'
        }}>
          <h2 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
            광고 문의하기
          </h2>
          <p style={{ fontSize: '15px', marginBottom: '24px', color: 'var(--text-secondary)' }}>
            서울교통공사 지하철 광고에 대해 문의해 주세요.
          </p>
          <Link
            href="/contact"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '16px',
              color: 'white',
              background: 'linear-gradient(135deg, #00A5DE 0%, #0088CC 100%)',
              boxShadow: '0 8px 24px rgba(0, 165, 222, 0.3)',
              textDecoration: 'none'
            }}
          >
            광고문의하기
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* 푸터 */}
      <footer style={{
        width: '100%',
        padding: '24px 16px',
        borderTop: '1px solid var(--border-subtle)',
        boxSizing: 'border-box'
      }}>
        <div style={{
          maxWidth: '1000px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #00A5DE 0%, #0088CC 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Train size={14} color="white" />
            </div>
            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
              위마켓
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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

          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            © 2024 Seoul Metro Advertising Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
