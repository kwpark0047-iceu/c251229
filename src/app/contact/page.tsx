'use client';

/**
 * AI 자동추천 페이지
 */

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Send,
  CheckCircle,
  Train,
  MessageSquare,
  Home,
  FileText,
  Mail,
  Download,
  MapPin,
  Package,
  Loader2,
  Sparkles,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

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

interface Proposal {
  id: string;
  createdAt: string;
  client: {
    name: string;
    company: string;
    phone: string;
    email: string;
  };
  request: {
    adType: string;
    budget: string;
    message: string;
  };
  recommendation: {
    lines: { number: string; name: string; stations: string[] }[];
    inventory: {
      id: string;
      stationName: string;
      lineNumber: string;
      mediaType: string;
      location: string;
      size: string;
      price: number;
      priceUnit: string;
    }[];
    floorPlans: {
      id: string;
      stationName: string;
      lineNumber: string;
      imageUrl: string;
      planType: string;
    }[];
    stationDetails?: {
      stationName: string;
      lineNumber: string;
      address: string;
      englishName: string;
      latitude: string;
      longitude: string;
    }[];
  };
  summary: {
    totalMedia: number;
    totalStations: number;
    estimatedBudget: string;
    recommendedPeriod: string;
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
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
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
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4">
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
      <main className="px-6 pt-4 pb-12 relative z-10">
        <div className="max-w-2xl mx-auto">
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

          {/* 제안서 표시 영역 */}
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
                  {proposal.client.company || proposal.client.name}님을 위한 맞춤 광고 제안
                </p>
              </div>

              {/* 고객 정보 */}
              <div
                className="p-6 rounded-2xl"
                style={{
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <h4 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#00A5DE]" />
                  고객 정보
                </h4>
                <div className="grid sm:grid-cols-2 gap-4 text-lg">
                  <div>
                    <span className="text-[var(--text-muted)]">담당자: </span>
                    <span className="text-[var(--text-primary)] font-medium">{proposal.client.name}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">회사: </span>
                    <span className="text-[var(--text-primary)] font-medium">{proposal.client.company || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">연락처: </span>
                    <span className="text-[var(--text-primary)] font-medium">{proposal.client.phone}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">이메일: </span>
                    <span className="text-[var(--text-primary)] font-medium">{proposal.client.email}</span>
                  </div>
                </div>
              </div>

              {/* 요청 사항 */}
              <div
                className="p-6 rounded-2xl"
                style={{
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <h4 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#00A84D]" />
                  요청 사항
                </h4>
                <div className="grid sm:grid-cols-2 gap-4 text-lg">
                  <div>
                    <span className="text-[var(--text-muted)]">광고 유형: </span>
                    <span className="text-[var(--text-primary)] font-medium">{proposal.request.adType || '미지정'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">예상 예산: </span>
                    <span className="text-[var(--text-primary)] font-medium">{proposal.request.budget || '미정'}</span>
                  </div>
                </div>
                {proposal.request.message && (
                  <div className="mt-4 p-4 rounded-xl bg-[var(--bg-tertiary)]/50">
                    <p className="text-[var(--text-secondary)]">{proposal.request.message}</p>
                  </div>
                )}
              </div>

              {/* 추천 노선 */}
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
                  {proposal.recommendation.lines.map(line => (
                    <div
                      key={line.number}
                      className="px-5 py-3 rounded-xl text-white font-bold text-lg"
                      style={{ background: LINE_COLORS[line.number] || '#666' }}
                    >
                      {line.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* 추천 매체 */}
              {proposal.recommendation.inventory.length > 0 && (
                <div
                  className="p-6 rounded-2xl"
                  style={{
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <h4 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#EF7C1C]" />
                    추천 광고매체
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)]">
                          <th className="py-3 px-4 text-[var(--text-muted)] font-medium">노선</th>
                          <th className="py-3 px-4 text-[var(--text-muted)] font-medium">역명</th>
                          <th className="py-3 px-4 text-[var(--text-muted)] font-medium">매체유형</th>
                          <th className="py-3 px-4 text-[var(--text-muted)] font-medium">위치</th>
                          <th className="py-3 px-4 text-[var(--text-muted)] font-medium">규격</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposal.recommendation.inventory.map((item, idx) => (
                          <tr key={idx} className="border-b border-[var(--border-subtle)]/50">
                            <td className="py-3 px-4">
                              <span
                                className="px-2 py-1 rounded text-white text-sm font-medium"
                                style={{ background: LINE_COLORS[item.lineNumber] || '#666' }}
                              >
                                {item.lineNumber}호선
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[var(--text-primary)] font-medium">{item.stationName}</td>
                            <td className="py-3 px-4 text-[var(--text-secondary)]">{item.mediaType}</td>
                            <td className="py-3 px-4 text-[var(--text-secondary)]">{item.location || '-'}</td>
                            <td className="py-3 px-4 text-[var(--text-secondary)]">{item.size || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 역사 상세 정보 (KRIC API) */}
              {proposal.recommendation.stationDetails && proposal.recommendation.stationDetails.length > 0 && (
                <div
                  className="p-6 rounded-2xl"
                  style={{
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <h4 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <Train className="w-5 h-5 text-[#0052A4]" />
                    역사 상세정보
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)]">
                          <th className="py-3 px-4 text-[var(--text-muted)] font-medium">노선</th>
                          <th className="py-3 px-4 text-[var(--text-muted)] font-medium">역명</th>
                          <th className="py-3 px-4 text-[var(--text-muted)] font-medium">영문명</th>
                          <th className="py-3 px-4 text-[var(--text-muted)] font-medium">주소</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposal.recommendation.stationDetails.map((station, idx) => (
                          <tr key={idx} className="border-b border-[var(--border-subtle)]/50">
                            <td className="py-3 px-4">
                              <span
                                className="px-2 py-1 rounded text-white text-sm font-medium"
                                style={{ background: LINE_COLORS[station.lineNumber] || '#666' }}
                              >
                                {station.lineNumber}호선
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[var(--text-primary)] font-medium">{station.stationName}</td>
                            <td className="py-3 px-4 text-[var(--text-secondary)]">{station.englishName || '-'}</td>
                            <td className="py-3 px-4 text-[var(--text-secondary)] text-sm">{station.address || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 추천 도면 */}
              {proposal.recommendation.floorPlans.length > 0 && (
                <div
                  className="p-6 rounded-2xl"
                  style={{
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <h4 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#E6186C]" />
                    역사 도면
                  </h4>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {proposal.recommendation.floorPlans.map((plan, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl overflow-hidden border border-[var(--border-subtle)]"
                      >
                        <div className="aspect-[4/3] bg-[var(--bg-tertiary)] relative">
                          <img
                            src={plan.imageUrl}
                            alt={`${plan.stationName} 도면`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-3 bg-[var(--bg-tertiary)]/50">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-2 py-0.5 rounded text-white text-xs font-medium"
                              style={{ background: LINE_COLORS[plan.lineNumber] || '#666' }}
                            >
                              {plan.lineNumber}호선
                            </span>
                            <span className="text-[var(--text-primary)] font-medium">{plan.stationName}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 요약 */}
              <div
                className="p-6 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 168, 77, 0.2) 0%, rgba(0, 165, 222, 0.2) 100%)',
                  border: '1px solid rgba(0, 168, 77, 0.3)',
                }}
              >
                <h4 className="text-xl font-bold text-[var(--text-primary)] mb-4">제안 요약</h4>
                <div className="grid sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-[#00A5DE]">{proposal.recommendation.lines.length}</p>
                    <p className="text-[var(--text-muted)]">추천 노선</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-[#00A84D]">{proposal.summary.totalStations}</p>
                    <p className="text-[var(--text-muted)]">추천 역</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-[#EF7C1C]">{proposal.recommendation.inventory.length}</p>
                    <p className="text-[var(--text-muted)]">추천 매체</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-[#996CAC]">{proposal.recommendation.floorPlans.length}</p>
                    <p className="text-[var(--text-muted)]">도면</p>
                  </div>
                </div>
              </div>

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
      </main>
    </div>
  );
}
