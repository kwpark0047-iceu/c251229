'use client';

/**
 * AI 자동추천 페이지
 */

import React, { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
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
import { SUBWAY_STATIONS, METRO_LINE_COLORS as LINE_COLORS } from '@/lib/constants';

// Leaflet 동적 임포트 (SSR 비활성화)
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then(mod => mod.Polyline),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
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



// 서울 지하철 노선 좌표 (공공데이터포털 서울교통공사 역 좌표 기준)
const SUBWAY_LINE_ROUTES: Record<string, { color: string; coords: [number, number][] }> = {
  '1': {
    color: '#0052A4',
    coords: [
      [37.580702, 127.046989], // 청량리
      [37.571607, 126.991570], // 종로3가
      [37.570028, 126.982730], // 종각
      [37.565712, 126.977041], // 시청
      [37.554648, 126.970702], // 서울역
      [37.529849, 126.964561], // 용산
      [37.513294, 126.942526], // 노량진
    ],
  },
  '2': {
    color: '#00A84D',
    coords: [
      // 순환선 - 내선순환
      [37.565712, 126.977041], // 시청
      [37.566014, 126.982618], // 을지로입구
      [37.566512, 126.991806], // 을지로3가
      [37.567109, 126.998167], // 을지로4가
      [37.565138, 127.007896], // 동대문역사문화공원
      [37.561432, 127.037522], // 왕십리
      [37.544580, 127.055914], // 성수
      [37.540372, 127.070149], // 건대입구
      [37.535288, 127.086065], // 구의
      [37.534896, 127.094330], // 강변
      [37.521419, 127.102131], // 잠실나루
      [37.513282, 127.100150], // 잠실
      [37.511687, 127.086162], // 잠실새내
      [37.510997, 127.073642], // 종합운동장
      [37.508844, 127.063214], // 삼성
      [37.504503, 127.049008], // 선릉
      [37.500622, 127.036456], // 역삼
      [37.497945, 127.027621], // 강남
      [37.493415, 127.014626], // 교대
      [37.491897, 127.007917], // 서초
      [37.481426, 126.997596], // 방배
      [37.476538, 126.981544], // 사당
      [37.533547, 126.902556], // 당산
      [37.556823, 126.923778], // 홍대입구
      [37.555199, 126.936664], // 신촌
      [37.556896, 126.946317], // 이대
      [37.557157, 126.956019], // 아현
      [37.559762, 126.963531], // 충정로
      [37.565712, 126.977041], // 시청 (순환)
    ],
  },
  '3': {
    color: '#EF7C1C',
    coords: [
      [37.676407, 126.743806], // 대화
      [37.571607, 126.991570], // 종로3가
      [37.561457, 126.994217], // 충무로
      [37.527026, 127.028311], // 압구정
      [37.516778, 127.019998], // 신사
      [37.511369, 127.014213], // 잠원
      [37.504811, 127.004943], // 고속터미널
      [37.493415, 127.014626], // 교대
      [37.484926, 127.016158], // 남부터미널
      [37.484147, 127.034530], // 양재
      [37.486431, 127.046616], // 매봉
      [37.490856, 127.054434], // 도곡
      [37.494243, 127.063343], // 대치
      [37.496996, 127.071406], // 학여울
      [37.491810, 127.079372], // 대청
      [37.483681, 127.085689], // 일원
      [37.487425, 127.101899], // 수서
      [37.492522, 127.118234], // 가락시장
    ],
  },
  '4': {
    color: '#00A5DE',
    coords: [
      [37.655779, 127.061352], // 노원
      [37.613208, 127.030012], // 미아사거리
      [37.603407, 127.025189], // 길음
      [37.592703, 127.016539], // 성신여대입구
      [37.588447, 127.006314], // 한성대입구
      [37.582290, 127.001867], // 혜화
      [37.571197, 127.009305], // 동대문
      [37.565138, 127.007896], // 동대문역사문화공원
      [37.561457, 126.994217], // 충무로
      [37.560830, 126.985797], // 명동
      [37.554648, 126.970702], // 서울역
      [37.534847, 126.973135], // 삼각지
      [37.476538, 126.981544], // 사당
    ],
  },
  '5': {
    color: '#996CAC',
    coords: [
      [37.561863, 126.800941], // 김포공항
      [37.566961, 126.836445], // 마곡나루
      [37.544174, 126.951593], // 공덕
      [37.539165, 126.945731], // 마포
      [37.527026, 126.932750], // 여의나루
      [37.521433, 126.924388], // 여의도
      [37.571524, 126.976812], // 광화문
      [37.571607, 126.991570], // 종로3가
      [37.567109, 126.998167], // 을지로4가
      [37.565138, 127.007896], // 동대문역사문화공원
      [37.561432, 127.037522], // 왕십리
      [37.545069, 127.103038], // 광나루
      [37.538594, 127.123820], // 천호
      [37.535241, 127.132233], // 강동
    ],
  },
  '6': {
    color: '#CD7C2F',
    coords: [
      [37.576995, 126.899414], // 디지털미디어시티
      [37.539142, 126.961685], // 효창공원앞
      [37.534847, 126.973135], // 삼각지
      [37.534406, 126.994597], // 이태원
      [37.539680, 126.998352], // 한강진
      [37.544174, 126.951593], // 공덕
    ],
  },
  '7': {
    color: '#747F00',
    coords: [
      [37.655779, 127.061352], // 노원
      [37.540372, 127.070149], // 건대입구
      [37.531428, 127.066314], // 뚝섬유원지
      [37.519835, 127.053521], // 청담
      [37.517012, 127.041238], // 강남구청
      [37.514682, 127.031989], // 학동
      [37.511187, 127.021617], // 논현
      [37.504811, 127.004943], // 고속터미널
    ],
  },
  '8': {
    color: '#E6186C',
    coords: [
      [37.550388, 127.127475], // 암사
      [37.538594, 127.123820], // 천호
      [37.513282, 127.100150], // 잠실
      [37.505558, 127.106824], // 석촌
      [37.492522, 127.118234], // 가락시장
      [37.485266, 127.122645], // 문정
      [37.470048, 127.126609], // 복정
      [37.432882, 127.129009], // 모란
    ],
  },
  '9': {
    color: '#BDB092',
    coords: [
      [37.561863, 126.800941], // 김포공항
      [37.566961, 126.836445], // 마곡나루
      [37.550705, 126.865133], // 등촌
      [37.546937, 126.874916], // 염창
      [37.533547, 126.902556], // 당산
      [37.521433, 126.924388], // 여의도
      [37.513294, 126.942526], // 노량진
      [37.502192, 127.017827], // 사평
      [37.504856, 127.025174], // 신논현
      [37.507129, 127.034026], // 언주
      [37.510404, 127.043240], // 선정릉
      [37.510936, 127.044859], // 삼성중앙
      [37.514826, 127.057678], // 봉은사
      [37.510997, 127.073642], // 종합운동장
    ],
  },
};

// 기본 표시 노선
const DEFAULT_VISIBLE_LINES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

// 지하철역 아이콘 생성 함수
function createStationIcon(name: string, lines: string[], isRecommended: boolean = false) {
  if (typeof window === 'undefined') return undefined;

   
  const L = require('leaflet');
  const primaryColor = LINE_COLORS[lines[0]] || '#666';

  // 노선 뱃지 HTML 생성
  const linesHtml = lines
    .slice(0, 3)
    .map(
      line =>
        `<span class="line-badge" style="background-color: ${LINE_COLORS[line] || '#888'}">${line}</span>`
    )
    .join('');

  return L.divIcon({
    className: 'station-marker-wrapper',
    html: `
      <div class="station-icon-container">
        <div class="station-pin ${isRecommended ? 'recommended' : ''}">
          <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z" fill="${isRecommended ? '#00A5DE' : primaryColor}"/>
            <circle cx="12" cy="12" r="6" fill="white"/>
            <text x="12" y="15" text-anchor="middle" font-size="8" font-weight="bold" fill="${isRecommended ? '#00A5DE' : primaryColor}">${lines[0]}</text>
          </svg>
        </div>
        <div class="station-label ${isRecommended ? 'recommended' : ''}">
          <span class="station-name">${name}${isRecommended ? ' ⭐' : ''}</span>
          <div class="line-badges">${linesHtml}</div>
        </div>
      </div>
    `,
    iconSize: [100, 40],
    iconAnchor: [12, 32],
    popupAnchor: [0, -32],
  });
}

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
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [visibleLines] = useState<string[]>(DEFAULT_VISIBLE_LINES);

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

      if (data.success && data.proposal) {
        setProposal(data.proposal);
        setConfirmEmail(data.proposal.clientInfo.email || form.email);
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
    setIsDownloading(true);

    try {
      // 동적 import로 html2canvas와 jspdf 로드
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const element = proposalRef.current;

      // 폰트 로딩 대기
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // 폰트 완전 로딩을 위한 추가 대기
      await new Promise(resolve => setTimeout(resolve, 1500));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 30000,
        onclone: (clonedDoc) => {
          // Google Fonts CSS를 클론된 문서에 직접 삽입
          const style = clonedDoc.createElement('style');
          style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');
            * {
              font-family: 'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', -apple-system, BlinkMacSystemFont, sans-serif !important;
            }
          `;
          clonedDoc.head.appendChild(style);

          // 클론된 요소에 폰트 강제 적용
          const clonedElement = clonedDoc.body.querySelector('[data-proposal-content]');
          if (clonedElement instanceof HTMLElement) {
            clonedElement.style.cssText += `
              font-family: 'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', sans-serif !important;
              color: #1a1a1a !important;
            `;
            clonedElement.querySelectorAll('*').forEach((el) => {
              if (el instanceof HTMLElement) {
                el.style.fontFamily = "'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', sans-serif";
                // 텍스트 가독성을 위해 컬러 명시
                const color = window.getComputedStyle(el).color;
                if (color === 'rgba(0, 0, 0, 0)' || color === 'transparent') {
                   // Skip transparent
                } else {
                   // ensure some default if needed, but let's keep it mostly as is
                }
              }
            });
          }
        },
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // 첫 페이지
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // 추가 페이지
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      pdf.save(`AI추천_제안서_${proposal?.id || 'proposal'}.pdf`);
    } catch (error) {
      console.error('PDF 생성 중 오류 발생:', error);
      alert('PDF 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!proposal || !confirmEmail) return;

    // 이메일 유효성 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(confirmEmail)) {
      alert('올바른 이메일 주소를 입력해주세요.');
      return;
    }

    setIsSendingEmail(true);

    try {
      console.log('제안서 이메일 발송 시도:', confirmEmail);
      const response = await fetch('/api/contact/send-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proposal,
          email: confirmEmail,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setEmailSent(true);
        alert('제안서가 이메일로 성공적으로 발송되었습니다.');
      } else {
        console.error('이메일 발송 실패:', result.message);
        alert(result.message || '이메일 발송에 실패했습니다. 이메일 주소를 확인해주세요.');
      }
    } catch (error) {
      console.error('Email send error:', error);
      alert('이메일 발송 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSendingEmail(false);
    }
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
          className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15 bg-[radial-gradient(circle,_#00A5DE_0%,_transparent_70%)] blur-[80px]"
        />
        <div
          className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 bg-[radial-gradient(circle,_#00A84D_0%,_transparent_70%)] blur-[80px]"
        />
      </div>

      {/* 헤더 */}
      <header className="w-full border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 backdrop-blur-xl sticky top-0 z-40">
        <div className="w-full max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* 로고 & 타이틀 */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-[#00A5DE]/20 to-[#00A5DE]/10">
                <Train className="w-5 h-5 text-[#00A5DE]" />
              </div>
              <div>
                <h1 className="text-base font-bold text-[var(--text-primary)]">AI자동추천</h1>
                <p className="text-xs text-[var(--text-muted)]">서울교통공사</p>
              </div>
            </div>

            {/* 테마 토글 */}
            <ThemeToggle />

            {/* 메인페이지 버튼 */}
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:scale-105"
               
   
  /* stylelint-disable-next-line */
  // @ts-ignore
  // noinspection CssInlineStyle
  // NOSONAR
  style={{ background: 'linear-gradient(135deg, #00A5DE 0%, #0088CC 100%)' }}
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">메인페이지</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 w-full flex flex-row-reverse gap-20 relative z-10">
        {/* 오른쪽: 폼 영역 */}
        <div className="w-[calc(50%-2.5rem)] px-6 pt-4 pb-12 overflow-y-auto relative z-10">
          <div className="w-full max-w-xl mx-auto">
            {/* 타이틀 */}
            <div className="text-center mb-10">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                 
   
  /* stylelint-disable-next-line */
  // @ts-ignore
  // noinspection CssInlineStyle
  // NOSONAR
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
            <div className="p-10 rounded-3xl mb-8 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 기본 정보 */}
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      담당자명 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="홍길동"
                      className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#00A5DE] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      회사명
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={form.company}
                      onChange={handleChange}
                      placeholder="(주)회사명"
                      className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#00A5DE] transition-colors"
                    />
                  </div>
                </div>

                {/* 연락처 */}
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      연락처 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      required
                      placeholder="010-1234-5678"
                      className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#00A5DE] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      이메일 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      placeholder="email@example.com"
                      className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#00A5DE] transition-colors"
                    />
                  </div>
                </div>

                {/* 주소 & 업종 */}
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      주소
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="서울시 강남구 역삼동"
                      className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#00A5DE] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      업종
                    </label>
                    <select
                      name="businessType"
                      value={form.businessType}
                      onChange={handleChange}
                      title="업종 선택"
                      className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-gray-300 text-gray-900 focus:outline-none focus:border-[#00A5DE] transition-colors cursor-pointer"
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
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      희망 광고 유형
                    </label>
                    <select
                      name="adType"
                      value={form.adType}
                      onChange={handleChange}
                      title="희망 광고 유형 선택"
                      className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-gray-300 text-gray-900 focus:outline-none focus:border-[#00A5DE] transition-colors cursor-pointer"
                    >
                      <option value="">선택해주세요</option>
                      {adTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      예상 예산
                    </label>
                    <select
                      name="budget"
                      value={form.budget}
                      onChange={handleChange}
                      title="예상 예산 선택"
                      className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-gray-300 text-gray-900 focus:outline-none focus:border-[#00A5DE] transition-colors cursor-pointer"
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
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    추가 요청사항
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={3}
                    placeholder="추가 요청사항을 작성해주세요. (선택)"
                    className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#00A5DE] transition-colors resize-none"
                  />
                </div>

                {/* 제출 버튼 */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-3 px-8 py-5 rounded-xl text-white text-xl font-semibold disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98] bg-[linear-gradient(135deg,_#00A5DE_0%,_#0088CC_100%)] shadow-[0_8px_24px_rgba(0,165,222,0.3)]"
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
              <div
                ref={proposalRef}
                data-proposal-content="true"
                className="space-y-6"
                 
   
  /* stylelint-disable-next-line */
  // @ts-ignore
  // noinspection CssInlineStyle
  // NOSONAR
  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", "Malgun Gothic", "맑은 고딕", sans-serif' }}
              >
                {/* 제안서 헤더 */}
                <div className="p-8 rounded-3xl bg-[linear-gradient(135deg,_#00A5DE_0%,_#0088CC_100%)] shadow-[0_25px_50px_rgba(0,165,222,0.3)]">
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
                <div className="p-6 rounded-2xl bg-[var(--glass-bg)] backdrop-blur-[20px] border border-[var(--glass-border)]">
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
                <div className="p-6 rounded-2xl bg-[linear-gradient(135deg,_rgba(0,165,222,0.1)_0%,_rgba(0,168,77,0.1)_100%)] backdrop-blur-[20px] border border-[var(--glass-border)]">
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
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
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
                           
   
  /* stylelint-disable-next-line */
  // @ts-ignore
  // noinspection CssInlineStyle
  // NOSONAR
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
                <div className="p-6 rounded-2xl bg-[var(--glass-bg)] backdrop-blur-[20px] border border-[var(--glass-border)]">
                  <h4 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-[#EF7C1C] text-white text-sm font-bold flex items-center justify-center">④</span>
                    AI 추천 역 TOP 2
                  </h4>
                  <div className="space-y-6">
                    {proposal.topStations.map((station) => (
                      <div
                        key={station.rank}
                        className="p-4 rounded-xl border border-[var(--border-subtle)]"
                         
   
  /* stylelint-disable-next-line */
  // @ts-ignore
  // noinspection CssInlineStyle
  // NOSONAR
  style={{
                          background: station.rank === 1
                            ? 'linear-gradient(135deg, rgba(0, 165, 222, 0.15) 0%, rgba(0, 165, 222, 0.05) 100%)'
                            : 'var(--bg-tertiary)',
                        }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <span
                            className="w-10 h-10 rounded-full text-white text-lg font-bold flex items-center justify-center"
                             
   
  /* stylelint-disable-next-line */
  // @ts-ignore
  // noinspection CssInlineStyle
  // NOSONAR
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
                                   
   
  /* stylelint-disable-next-line */
  // @ts-ignore
  // noinspection CssInlineStyle
  // NOSONAR
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
                                    { }
                                    <img
                                      src={plan.imageUrl}
                                      alt={`${station.stationName} ${plan.planType}`}
                                      className="w-full h-full object-cover"
                                      crossOrigin="anonymous"
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
                <div className="p-6 rounded-2xl bg-[var(--glass-bg)] backdrop-blur-[20px] border border-[var(--glass-border)]">
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
                <div className="p-6 rounded-2xl bg-[linear-gradient(135deg,_rgba(0,168,77,0.2)_0%,_rgba(0,165,222,0.2)_100%)] border border-[rgba(0,168,77,0.3)]">
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
                  <div className="p-6 rounded-2xl bg-[var(--glass-bg)] backdrop-blur-[20px] border border-[var(--glass-border)]">
                    <h4 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                      <Train className="w-5 h-5 text-[#996CAC]" />
                      추천 노선
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {proposal.additionalInfo.recommendedLines.filter(l => /^\d+$/.test(l)).map(line => (
                        <div
                          key={line}
                          className="px-5 py-3 rounded-xl text-white font-bold text-lg"
                           
   
  /* stylelint-disable-next-line */
  // @ts-ignore
  // noinspection CssInlineStyle
  // NOSONAR
  style={{ background: LINE_COLORS[line] || '#666' }}
                        >
                          {line}호선
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 액션 버튼 */}
                <div className="mt-8 pt-8 border-t border-[var(--border-subtle)] space-y-6">
                  <div>
                    <p className="text-sm text-[var(--text-muted)] mb-3">제안서를 받으실 이메일 주소를 확인해주세요.</p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                        placeholder="예: contact@example.com"
                        className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#00A5DE] transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 relative z-50">
                    <button
                      type="button"
                      onClick={handleDownloadPDF}
                      disabled={isDownloading}
                      className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-white text-lg font-semibold transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50 bg-[linear-gradient(135deg,_#00A84D_0%,_#00C853_100%)] shadow-[0_8px_24px_rgba(0,168,77,0.3)] relative z-[100]"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          PDF 생성 중...
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          PDF 저장
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleSendEmail}
                      disabled={isSendingEmail || emailSent}
                      className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-white text-lg font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 ${
                        emailSent
                          ? 'bg-[linear-gradient(135deg,_#666_0%,_#888_100%)] shadow-none'
                          : 'bg-[linear-gradient(135deg,_#00A5DE_0%,_#0088CC_100%)] shadow-[0_8px_24px_rgba(0,165,222,0.3)]'
                      }`}
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
              </div>
            )}
          </div>
        </div>

        {/* Leaflet CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />

        {/* 지도 마커 스타일 */}
        <style>{`
            .station-marker-wrapper {
              background: transparent !important;
              border: none !important;
            }
            .station-icon-container {
              position: relative;
              display: flex;
              flex-direction: column;
              align-items: flex-start;
            }
            .station-pin {
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
              transition: transform 0.2s ease;
            }
            .station-pin:hover {
              transform: scale(1.1);
            }
            .station-pin.recommended {
              filter: drop-shadow(0 0 8px rgba(0, 165, 222, 0.8));
            }
            .station-label {
              position: absolute;
              left: 28px;
              top: 4px;
              background: rgba(30, 30, 50, 0.95);
              padding: 3px 8px;
              border-radius: 6px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
              display: flex;
              flex-direction: column;
              gap: 2px;
              min-width: max-content;
              border: 1px solid rgba(255,255,255,0.1);
            }
            .station-label.recommended {
              background: rgba(0, 165, 222, 0.2);
              border: 1px solid rgba(0, 165, 222, 0.5);
            }
            .station-name {
              font-size: 12px;
              font-weight: 700;
              color: #fff;
              white-space: nowrap;
            }
            .line-badges {
              display: flex;
              gap: 2px;
            }
            .line-badge {
              width: 16px;
              height: 16px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 9px;
              font-weight: bold;
            }
            .leaflet-popup-content-wrapper {
              background: rgba(30, 30, 50, 0.95) !important;
              border: 1px solid rgba(255,255,255,0.1) !important;
              color: white !important;
            }
            .leaflet-popup-tip {
              background: rgba(30, 30, 50, 0.95) !important;
            }
          `}</style>

        {/* 왼쪽: 서울 지하철 지도 */}
        <div className="w-[calc(50%-2.5rem)] sticky top-16 h-[calc(100vh-4rem)]"  
   
  /* stylelint-disable-next-line */
  // @ts-ignore
  // noinspection CssInlineStyle
  // NOSONAR
  style={{ zIndex: 1 }}>
          <div className="h-full rounded-r-3xl overflow-hidden border-r border-[var(--border-subtle)] relative"  
   
  /* stylelint-disable-next-line */
  // @ts-ignore
  // noinspection CssInlineStyle
  // NOSONAR
  style={{ zIndex: 1 }}>
            <MapContainer
              center={[37.52, 126.95]}
              zoom={11}
               
   
  /* stylelint-disable-next-line */
  // @ts-ignore
  // noinspection CssInlineStyle
  // NOSONAR
  style={{ height: '100%', width: '100%' }}
              zoomControl={true}
              minZoom={10}
              maxZoom={18}
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />

              {/* 지하철 노선 폴리라인 */}
              {Object.entries(SUBWAY_LINE_ROUTES).map(([lineNumber, route]) => (
                visibleLines.includes(lineNumber) && (
                  <Polyline
                    key={`line-${lineNumber}`}
                    positions={route.coords}
                    pathOptions={{
                      color: route.color,
                      weight: 5,
                      opacity: 0.8,
                    }}
                  />
                )
              ))}

              {/* AI 추천역만 표시 (제안서 생성 후) */}
              {proposal?.topStations?.map((topStation) => {
                const station = SUBWAY_STATIONS.find(
                  (s) => s.name === topStation.stationName || s.name + '역' === topStation.stationName
                );
                if (!station) return null;
                return (
                  <Marker
                    key={station.name}
                    position={[station.lat, station.lng]}
                    icon={createStationIcon(station.name, station.lines, true)}
                  >
                    <Popup>
                      <div className="text-center min-w-[120px]">
                        <strong className="text-white">{station.name}역</strong>
                        <div className="flex justify-center gap-1 mt-2">
                          {station.lines.map(line => (
                            <span
                              key={line}
                              className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold"
                               
   
  /* stylelint-disable-next-line */
  // @ts-ignore
  // noinspection CssInlineStyle
  // NOSONAR
  style={{ backgroundColor: LINE_COLORS[line] || '#888' }}
                            >
                              {line}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 text-xs text-[#00A5DE] font-bold">
                          ⭐ AI 추천역 #{topStation.rank}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>



            {/* 지도 범례 */}
            <div className="absolute bottom-4 left-4 p-3 rounded-xl z-[1000] bg-[var(--glass-bg)] backdrop-blur-[10px] border border-[var(--glass-border)]">
              <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">지도 범례</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-4 h-0.5 rounded bg-[#00A84D]" />
                <span className="text-[var(--text-secondary)]">지하철 노선</span>
              </div>
              {proposal && (
                <div className="flex items-center gap-2 text-xs mt-1">
                  <span className="w-3 h-3 rounded-full bg-[#00A5DE]"  
   
  /* stylelint-disable-next-line */
  // @ts-ignore
  // noinspection CssInlineStyle
  // NOSONAR
  style={{ boxShadow: '0 0 6px rgba(0, 165, 222, 0.8)' }} />
                  <span className="text-[var(--text-secondary)]">AI 추천역</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
