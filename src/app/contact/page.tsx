'use client';

/**
 * AI 자동추천 페이지
 */

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  Train,
  Home,
  Mail,
  Download,
  MapPin,
  Loader2,
  Sparkles,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { SUBWAY_STATIONS } from '@/app/lead-manager/constants';

// Leaflet 동적 임포트 (SSR 비활성화)
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then(mod => mod.CircleMarker),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('react-leaflet').then(mod => mod.Tooltip),
  { ssr: false }
);

interface ContactForm {
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  businessType: string;
  adType: string;
  budget: string;
  message: string;
}

// 새로운 6개 섹션 제안서 구조
interface Proposal {
  id: string;
  createdAt: string;

  // ① 광고주 정보 요약
  clientInfo: {
    company: string;
    businessType: string;
    location: string;
    contactPerson: string;
    phone: string;
    email: string;
  };

  // ② 광고 목적 분석
  purposeAnalysis: {
    industry: string;
    purposes: string[];
    targetAudience: string;
  };

  // ③ 추천 매체
  recommendedMedia: {
    mediaTypes: string[];
    keyPoints: string[];
    adType: string;
  };

  // ④ AI 추천 역 TOP 2
  topStations: {
    rank: number;
    stationName: string;
    dailyTraffic: number;
    characteristics: string;
    lineNumbers: string[];
    floorPlans: { imageUrl: string; planType: string }[];
  }[];

  // ⑤ 예산 기반 구성안
  budgetPlan: {
    inputBudget: string;
    monthlyEstimate: string;
    recommendation: string[];
    contractTip: string;
  };

  // ⑥ 기대 효과
  expectedEffects: string[];

  // 추가 정보
  additionalInfo: {
    nearestDistrict: string | null;
    recommendedLines: string[];
    userMessage: string;
  };
}

const LINE_COLORS: Record<string, string> = {
  '1': '#0052A4',
  '2': '#00A84D',
  '5': '#996CAC',
  '7': '#747F00',
  '8': '#E6186C',
};

export default function ContactPage() {
  const proposalRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<ContactForm>({
    name: '',
    company: '',
    phone: '',
    email: '',
    address: '',
    businessType: '',
    adType: '',
    budget: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/ai-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (data.success) {
        setProposal(data.proposal);
        // 제안서로 스크롤
        setTimeout(() => {
          proposalRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      }
    } catch (error) {
      console.error('제안서 생성 오류:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!proposalRef.current) return;

    // 동적 import로 html2canvas와 jspdf 로드
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const element = proposalRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#1a1a2e',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= 297;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
    }

    pdf.save(`AI추천_제안서_${proposal?.id || 'proposal'}.pdf`);
  };

  const handleSendEmail = async () => {
    if (!proposal) return;

    setIsSendingEmail(true);

    // 실제 이메일 발송 API 호출 (시뮬레이션)
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsSendingEmail(false);
    setEmailSent(true);
  };

  const adTypes = [
    '역사 내 포스터',
    '스크린도어 광고',
    '전동차 내부 광고',
    '디지털 사이니지',
    '역사 래핑',
    '기타',
  ];

  const budgetRanges = [
    '100만원 미만',
    '100만원 ~ 500만원',
    '500만원 ~ 1,000만원',
    '1,000만원 ~ 5,000만원',
    '5,000만원 이상',
    '미정',
  ];

  const businessTypes = [
    '의료/병원',
    '학원/교육',
    '부동산',
    '음식점/카페',
    '소매/유통',
    '금융/보험',
    '뷰티/미용',
    '법률/세무',
    '기타',
  ];

  return (
    <div className="min-h-screen w-full bg-[var(--bg-primary)] flex flex-col items-center">
      {/* 배경 효과 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, #00A5DE 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, #00A84D 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* 헤더 */}
      <header className="w-full border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 backdrop-blur-xl sticky top-0 z-40">
        <div className="w-full max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2.5 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-all hover:scale-105"
              >
                <ArrowLeft className="w-5 h-5 text-[var(--text-muted)]" />
              </Link>
              <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #00A5DE20 0%, #00A5DE10 100%)' }}
              >
                <Train className="w-5 h-5" style={{ color: '#00A5DE' }} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[var(--text-primary)]">AI자동추천</h1>
                <p className="text-xs text-[var(--text-muted)]">서울교통공사</p>
              </div>
            </div>
            </div>

            {/* 테마 토글 */}
            <ThemeToggle />

            {/* 메인페이지 버튼 */}
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #00A5DE 0%, #0088CC 100%)' }}
            >
              <Home className="w-5 h-5" />
              <span className="text-sm">메인페이지</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 w-full flex flex-row relative z-10">
        {/* 왼쪽: 폼 영역 */}
        <div className="w-1/2 px-6 pt-4 pb-12 overflow-y-auto">
          <div className="w-full max-w-xl mx-auto">
          {/* 타이틀 */}
          <div className="text-center mb-10">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
              style={{ background: 'linear-gradient(135deg, #00A5DE 0%, #0088CC 100%)' }}
            >
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-4">
              AI자동추천
            </h2>
            <p className="text-xl text-[var(--text-secondary)]">
              AI자동추천 제안서를 발송합니다.
            </p>
          </div>

          {/* 문의 폼 */}
          <div
            className="p-10 rounded-3xl mb-8"
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.1)',
            }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-lg font-medium text-[var(--text-secondary)] mb-3">
                    담당자명 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="홍길동"
                    className="w-full px-5 py-4 text-lg rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#00A5DE] focus:ring-2 focus:ring-[#00A5DE]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-[var(--text-secondary)] mb-3">
                    회사명
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    placeholder="(주)회사명"
                    className="w-full px-5 py-4 text-lg rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#00A5DE] focus:ring-2 focus:ring-[#00A5DE]/20 transition-all"
                  />
                </div>
              </div>

              {/* 연락처 */}
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-lg font-medium text-[var(--text-secondary)] mb-3">
                    연락처 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    placeholder="010-1234-5678"
                    className="w-full px-5 py-4 text-lg rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#00A5DE] focus:ring-2 focus:ring-[#00A5DE]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-[var(--text-secondary)] mb-3">
                    이메일 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="email@example.com"
                    className="w-full px-5 py-4 text-lg rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#00A5DE] focus:ring-2 focus:ring-[#00A5DE]/20 transition-all"
                  />
                </div>
              </div>

              {/* 주소 & 업종 */}
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-lg font-medium text-[var(--text-secondary)] mb-3">
                    주소
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="서울시 강남구 역삼동"
                    className="w-full px-5 py-4 text-lg rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#00A5DE] focus:ring-2 focus:ring-[#00A5DE]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-[var(--text-secondary)] mb-3">
                    업종
                  </label>
                  <select
                    name="businessType"
                    value={form.businessType}
                    onChange={handleChange}
                    className="w-full px-5 py-4 text-lg rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#00A5DE] focus:ring-2 focus:ring-[#00A5DE]/20 transition-all"
                  >
                    <option value="">선택해주세요</option>
                    {businessTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 광고 정보 */}
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-lg font-medium text-[var(--text-secondary)] mb-3">
                    희망 광고 유형
                  </label>
                  <select
                    name="adType"
                    value={form.adType}
                    onChange={handleChange}
                    className="w-full px-5 py-4 text-lg rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#00A5DE] focus:ring-2 focus:ring-[#00A5DE]/20 transition-all"
                  >
                    <option value="">선택해주세요</option>
                    {adTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-lg font-medium text-[var(--text-secondary)] mb-3">
                    예상 예산
                  </label>
                  <select
                    name="budget"
                    value={form.budget}
                    onChange={handleChange}
                    className="w-full px-5 py-4 text-lg rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#00A5DE] focus:ring-2 focus:ring-[#00A5DE]/20 transition-all"
                  >
                    <option value="">선택해주세요</option>
                    {budgetRanges.map(range => (
                      <option key={range} value={range}>{range}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 문의 내용 */}
              <div>
                <label className="block text-lg font-medium text-[var(--text-secondary)] mb-3">
                  추가 요청사항
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={3}
                  placeholder="추가 요청사항을 작성해주세요. (선택)"
                  className="w-full px-5 py-4 text-lg rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#00A5DE] focus:ring-2 focus:ring-[#00A5DE]/20 transition-all resize-none"
                />
              </div>

              {/* 제출 버튼 */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 px-8 py-5 rounded-xl text-white text-xl font-semibold disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #00A5DE 0%, #0088CC 100%)',
                  boxShadow: '0 8px 24px rgba(0, 165, 222, 0.3)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    AI 분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    AI추천요청
                  </>
                )}
              </button>
            </form>
          </div>

          {/* 제안서 표시 영역 - 6개 섹션 */}
          {proposal && (
            <div ref={proposalRef} className="space-y-6">
              {/* 제안서 헤더 */}
              <div
                className="p-8 rounded-3xl"
                style={{
                  background: 'linear-gradient(135deg, #00A5DE 0%, #0088CC 100%)',
                  boxShadow: '0 25px 50px rgba(0, 165, 222, 0.3)',
                }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-white/70 text-sm mb-1">제안서 번호</p>
                    <p className="text-white text-2xl font-bold">{proposal.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/70 text-sm mb-1">생성일시</p>
                    <p className="text-white font-medium">
                      {new Date(proposal.createdAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-white mb-2">
                  AI 자동추천 제안서
                </h3>
                <p className="text-white/80 text-lg">
                  {proposal.clientInfo.company}님을 위한 맞춤 광고 제안
                </p>
              </div>

              {/* ① 광고주 정보 요약 */}
              <div
                className="p-6 rounded-2xl"
                style={{
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <h4 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#00A5DE] text-white text-sm font-bold flex items-center justify-center">①</span>
                  광고주 정보 요약
                </h4>
                <div className="grid sm:grid-cols-2 gap-4 text-lg">
                  <div>
                    <span className="text-[var(--text-muted)]">업체명: </span>
                    <span className="text-[var(--text-primary)] font-medium">{proposal.clientInfo.company}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">업종: </span>
                    <span className="text-[var(--text-primary)] font-medium">{proposal.clientInfo.businessType}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">담당자: </span>
                    <span className="text-[var(--text-primary)] font-medium">{proposal.clientInfo.contactPerson}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">연락처: </span>
                    <span className="text-[var(--text-primary)] font-medium">{proposal.clientInfo.phone}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[var(--text-muted)]">주소: </span>
                    <span className="text-[var(--text-primary)] font-medium">{proposal.clientInfo.location}</span>
                  </div>
                </div>
              </div>

              {/* ② 광고 목적 분석 */}
              <div
                className="p-6 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 165, 222, 0.1) 0%, rgba(0, 168, 77, 0.1) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <h4 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#00A84D] text-white text-sm font-bold flex items-center justify-center">②</span>
                  광고 목적 분석 ({proposal.purposeAnalysis.industry})
                </h4>
                <div className="space-y-4">
                  <div>
                    <p className="text-[var(--text-muted)] mb-2">주요 목적</p>
                    <ul className="list-disc list-inside space-y-1">
                      {proposal.purposeAnalysis.purposes.map((purpose, idx) => (
                        <li key={idx} className="text-[var(--text-primary)]">{purpose}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-3 border-t border-[var(--border-subtle)]">
                    <p className="text-[var(--text-muted)]">타겟 고객층</p>
                    <p className="text-[var(--text-primary)] font-medium text-lg mt-1">{proposal.purposeAnalysis.targetAudience}</p>
                  </div>
                </div>
              </div>

              {/* ③ 추천 매체 */}
              <div
                className="p-6 rounded-2xl"
                style={{
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <h4 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#996CAC] text-white text-sm font-bold flex items-center justify-center">③</span>
                  추천 매체
                </h4>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    {proposal.recommendedMedia.mediaTypes.map((media, idx) => (
                      <span
                        key={idx}
                        className="px-4 py-2 rounded-xl text-white font-medium"
                        style={{ background: 'linear-gradient(135deg, #996CAC 0%, #7E5B99 100%)' }}
                      >
                        {media}
                      </span>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-[var(--border-subtle)]">
                    <p className="text-[var(--text-muted)] mb-2">핵심 포인트</p>
                    <ul className="list-disc list-inside space-y-1">
                      {proposal.recommendedMedia.keyPoints.map((point, idx) => (
                        <li key={idx} className="text-[var(--text-secondary)]">{point}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* ④ AI 추천 역 TOP 2 */}
              <div
                className="p-6 rounded-2xl"
                style={{
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <h4 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#EF7C1C] text-white text-sm font-bold flex items-center justify-center">④</span>
                  AI 추천 역 TOP 2
                </h4>
                <div className="space-y-6">
                  {proposal.topStations.map((station) => (
                    <div
                      key={station.rank}
                      className="p-4 rounded-xl border border-[var(--border-subtle)]"
                      style={{
                        background: station.rank === 1
                          ? 'linear-gradient(135deg, rgba(0, 165, 222, 0.15) 0%, rgba(0, 165, 222, 0.05) 100%)'
                          : 'var(--bg-tertiary)',
                      }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span
                          className="w-10 h-10 rounded-full text-white text-lg font-bold flex items-center justify-center"
                          style={{ background: station.rank === 1 ? '#00A5DE' : '#666' }}
                        >
                          {station.rank}
                        </span>
                        <div>
                          <h5 className="text-xl font-bold text-[var(--text-primary)]">{station.stationName}역</h5>
                          <div className="flex gap-2 mt-1">
                            {station.lineNumbers.filter(l => /^\d+$/.test(l)).slice(0, 3).map(line => (
                              <span
                                key={line}
                                className="px-2 py-0.5 rounded text-white text-xs font-medium"
                                style={{ background: LINE_COLORS[line] || '#666' }}
                              >
                                {line}호선
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="ml-auto text-right">
                          <p className="text-2xl font-bold text-[#00A5DE]">{station.dailyTraffic.toLocaleString()}</p>
                          <p className="text-sm text-[var(--text-muted)]">일 평균 유동인구</p>
                        </div>
                      </div>
                      <p className="text-[var(--text-secondary)] mb-4">{station.characteristics}</p>

                      {/* 도면 이미지 */}
                      {station.floorPlans && station.floorPlans.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                          <p className="text-sm text-[var(--text-muted)] mb-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            역사 도면
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            {station.floorPlans.map((plan, idx) => (
                              <div key={idx} className="rounded-lg overflow-hidden border border-[var(--border-subtle)]">
                                <div className="aspect-[4/3] bg-[var(--bg-tertiary)] relative">
                                  <img
                                    src={plan.imageUrl}
                                    alt={`${station.stationName} ${plan.planType}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="p-2 bg-[var(--bg-tertiary)]/50 text-center">
                                  <span className="text-sm text-[var(--text-secondary)]">{plan.planType}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ⑤ 예산 기반 구성안 */}
              <div
                className="p-6 rounded-2xl"
                style={{
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <h4 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#00A84D] text-white text-sm font-bold flex items-center justify-center">⑤</span>
                  예산 기반 구성안
                </h4>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[var(--text-muted)]">요청 예산</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{proposal.budgetPlan.inputBudget}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">예상 월 비용</p>
                    <p className="text-2xl font-bold text-[#00A84D] mt-1">{proposal.budgetPlan.monthlyEstimate}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                  <p className="text-[var(--text-muted)] mb-2">추천 구성</p>
                  <div className="flex flex-wrap gap-2">
                    {proposal.budgetPlan.recommendation.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-4 p-4 rounded-xl bg-[#00A84D]/10 border border-[#00A84D]/30">
                  <p className="text-[#00A84D] font-medium">💡 {proposal.budgetPlan.contractTip}</p>
                </div>
              </div>

              {/* ⑥ 기대 효과 */}
              <div
                className="p-6 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 168, 77, 0.2) 0%, rgba(0, 165, 222, 0.2) 100%)',
                  border: '1px solid rgba(0, 168, 77, 0.3)',
                }}
              >
                <h4 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#E6186C] text-white text-sm font-bold flex items-center justify-center">⑥</span>
                  기대 효과
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {proposal.expectedEffects.map((effect, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/10"
                    >
                      <CheckCircle className="w-5 h-5 text-[#00A84D] flex-shrink-0" />
                      <span className="text-[var(--text-primary)]">{effect}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 추천 노선 */}
              {proposal.additionalInfo.recommendedLines.length > 0 && (
                <div
                  className="p-6 rounded-2xl"
                  style={{
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <h4 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <Train className="w-5 h-5 text-[#996CAC]" />
                    추천 노선
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {proposal.additionalInfo.recommendedLines.filter(l => /^\d+$/.test(l)).map(line => (
                      <div
                        key={line}
                        className="px-5 py-3 rounded-xl text-white font-bold text-lg"
                        style={{ background: LINE_COLORS[line] || '#666' }}
                      >
                        {line}호선
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleDownloadPDF}
                  className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-white text-lg font-semibold transition-all hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, #00A84D 0%, #00C853 100%)',
                    boxShadow: '0 8px 24px rgba(0, 168, 77, 0.3)',
                  }}
                >
                  <Download className="w-5 h-5" />
                  PDF 저장
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || emailSent}
                  className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-white text-lg font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
                  style={{
                    background: emailSent
                      ? 'linear-gradient(135deg, #666 0%, #888 100%)'
                      : 'linear-gradient(135deg, #00A5DE 0%, #0088CC 100%)',
                    boxShadow: emailSent ? 'none' : '0 8px 24px rgba(0, 165, 222, 0.3)',
                  }}
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      발송 중...
                    </>
                  ) : emailSent ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      발송 완료
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      이메일 발송
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* 오른쪽: 서울 지하철 지도 */}
        <div className="w-1/2 sticky top-16 h-[calc(100vh-4rem)]">
          <div className="h-full rounded-l-3xl overflow-hidden border-l border-[var(--border-subtle)]">
            <MapContainer
              center={[37.5665, 126.9780]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {/* 지하철 역 마커 */}
              {SUBWAY_STATIONS.map((station) => {
                const isRecommended = proposal?.topStations?.some(
                  (s) => s.stationName === station.name || s.stationName === station.name + '역'
                );
                return (
                  <CircleMarker
                    key={station.name}
                    center={[station.lat, station.lng]}
                    radius={isRecommended ? 12 : 6}
                    pathOptions={{
                      color: isRecommended ? '#00A5DE' : '#666',
                      fillColor: isRecommended ? '#00A5DE' : '#444',
                      fillOpacity: isRecommended ? 0.9 : 0.6,
                      weight: isRecommended ? 3 : 1,
                    }}
                  >
                    <Tooltip
                      direction="top"
                      offset={[0, -10]}
                      permanent={isRecommended}
                      className={isRecommended ? 'recommended-station-tooltip' : ''}
                    >
                      <div className="text-center">
                        <div className="font-bold">{station.name}역</div>
                        <div className="text-xs text-gray-400">
                          {station.lines.join(', ')}호선
                        </div>
                        {isRecommended && (
                          <div className="text-xs text-[#00A5DE] font-bold mt-1">
                            ⭐ AI 추천
                          </div>
                        )}
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>

            {/* 지도 범례 */}
            <div
              className="absolute bottom-4 left-4 p-3 rounded-xl z-[1000]"
              style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(10px)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <p className="text-xs text-[var(--text-muted)] mb-2">지도 범례</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-[#00A5DE]" />
                <span className="text-[var(--text-secondary)]">AI 추천역</span>
              </div>
              <div className="flex items-center gap-2 text-xs mt-1">
                <span className="w-2 h-2 rounded-full bg-[#666]" />
                <span className="text-[var(--text-secondary)]">지하철역</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
