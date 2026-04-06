'use client';

import React, { useState } from 'react';
import { 
  Zap, 
  MapPin, 
  Target, 
  BarChart3, 
  ChevronRight, 
  Sparkles,
  TrendingUp,
  Image as ImageIcon,
  Loader2,
  DollarSign,
  Building
} from 'lucide-react';

interface RecommendedStation {
  rank: number;
  stationName: string;
  dailyTraffic: number;
  characteristics: string;
  lineNumbers: string[];
  floorPlans: { imageUrl: string; planType: string }[];
}

interface ProposalData {
  id: string;
  clientInfo: {
    businessType: string;
  };
  purposeAnalysis: {
    purposes: string[];
    targetAudience: string;
  };
  recommendedMedia: {
    mediaTypes: string[];
    keyPoints: string[];
  };
  topStations: RecommendedStation[];
  budgetPlan: {
    monthlyEstimate: string;
    recommendation: string[];
  };
  expectedEffects: string[];
}

export default function AiRecommendWidget() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProposalData | null>(null);
  const [step, setStep] = useState(0); // 0: Form, 1: Result

  const [formData, setFormData] = useState({
    businessType: '의료/병원',
    budget: '100만원 ~ 500만원',
    address: '강남구',
    adType: '조명광고'
  });

  const businessTypes = ['의료/병원', '학원/교육', '부동산', '음식점/카페', '소매/유통', '금융/보험', '뷰티/미용', '법률/세무', '기타'];
  const budgets = ['100만원 미만', '100만원 ~ 500만원', '500만원 ~ 1,000만원', '1,000만원 ~ 5,000만원', '5,000만원 이상'];
  const districts = ['강남구', '서초구', '송파구', '마포구', '영등포구', '용산구', '종로구', '중구', '성동구', '광진구', '강서구', '강동구', '노원구'];

  const handleRecommend = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          name: '잠재 광고주',
          company: '신규 업체',
          phone: '-',
          email: '-',
          message: `${formData.address} ${formData.businessType} 광고 추천 요청`
        })
      });
      const data = await response.json();
      if (data.success) {
        setResult(data.proposal);
        setStep(1);
      }
    } catch (error) {
      console.error('AI 추천 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setStep(0);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12 relative">
      {/* 반중력 배경 효과 */}
      <div className="gradient-orb orb-blue top-0 -left-20 w-64 h-64 opacity-20" />
      <div className="gradient-orb orb-green bottom-0 -right-20 w-64 h-64 opacity-20" />

      <div className="glass-card p-8 md:p-12 relative overflow-hidden backdrop-blur-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-500/20 p-2 rounded-xl">
            <Sparkles className="text-blue-400" size={24} />
          </div>
          <h2 className="text-display text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            AI 광고 자동 추천 허브
          </h2>
        </div>

        {step === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in-up">
            <div className="space-y-6">
              <div>
                <label className="metro-input-label flex items-center gap-2">
                  <Building size={14} className="text-blue-400" />
                  업종 선택
                </label>
                <select 
                  className="metro-input appearance-none bg-void/50"
                  value={formData.businessType}
                  onChange={(e) => setFormData({...formData, businessType: e.target.value})}
                >
                  {businessTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>

              <div>
                <label className="metro-input-label flex items-center gap-2">
                  <DollarSign size={14} className="text-emerald-400" />
                  월간 예산
                </label>
                <select 
                  className="metro-input appearance-none bg-void/50"
                  value={formData.budget}
                  onChange={(e) => setFormData({...formData, budget: e.target.value})}
                >
                  {budgets.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label className="metro-input-label flex items-center gap-2">
                  <MapPin size={14} className="text-orange-400" />
                  희망 지역
                </label>
                <select 
                  className="metro-input appearance-none bg-void/50"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                >
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col justify-between p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all group">
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white">
                  <TrendingUp size={18} className="text-blue-400" />
                  분석 포인트
                </h3>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                    실시간 유동인구 기반 최고 효율 역사 추출
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
                    업종별 고객 동선 및 타겟층 자동 매칭
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5" />
                    예산 최적화 미디어 믹스(Mix) 구성
                  </li>
                </ul>
              </div>

              <button 
                onClick={handleRecommend}
                disabled={loading}
                className="metro-btn-primary w-full mt-8 group-hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    즉시 분석 결과 확인
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-scale-in space-y-8">
            {result && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 추천 역사 카드 */}
                  <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                      <Target className="text-red-400" /> AI 추천 타겟 역사
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {result.topStations.map((station) => (
                        <div key={station.stationName} className="stat-card hover:border-blue-400/50 group/station animate-float-subtle">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="text-blue-400 text-xs font-bold mb-1">RANK {station.rank}</div>
                              <div className="text-2xl font-bold text-white">{station.stationName}</div>
                            </div>
                            <div className="flex gap-1">
                              {station.lineNumbers.map(line => (
                                <span key={line} className={`line-badge line-badge-sm line-badge-${line}`}>{line}</span>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">일 평균 유동인구</span>
                              <span className="text-emerald-400 font-mono">{station.dailyTraffic.toLocaleString()}명</span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              {station.characteristics}
                            </p>
                          </div>
                          {station.floorPlans.length > 0 && (
                            <div className="relative h-24 rounded-lg overflow-hidden bg-void/50 group-hover/station:ring-2 ring-blue-500/30 transition-all">
                              <img 
                                src={station.floorPlans[0].imageUrl} 
                                alt={station.stationName}
                                className="w-full h-full object-cover opacity-60 group-hover/station:scale-110 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <span className="text-[10px] bg-blue-500/80 px-2 py-1 rounded text-white font-bold">도면 분석 완료</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 기대 효과 및 분석 */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                      <TrendingUp className="text-emerald-400" /> 전략 요약
                    </h3>
                    <div className="glass-card-elevated p-6 space-y-4">
                      <div>
                        <div className="text-xs text-blue-400 font-bold mb-2 uppercase tracking-wider">추천 매체</div>
                        <div className="flex flex-wrap gap-2">
                          {result.recommendedMedia.mediaTypes.map(m => (
                            <span key={m} className="badge badge-info text-[10px]">{m}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-emerald-400 font-bold mb-2 uppercase tracking-wider">기대 효과</div>
                        <ul className="text-xs text-gray-400 space-y-2">
                          {result.expectedEffects.slice(0, 3).map((effect, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-emerald-500" />
                              {effect}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="pt-4 border-t border-white/10">
                        <div className="text-xs text-gray-500 mb-1">월 예상 예산</div>
                        <div className="text-2xl font-bold text-white font-mono">{result.budgetPlan.monthlyEstimate}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-8 border-t border-white/10">
                  <button onClick={reset} className="metro-btn-ghost text-sm">
                    다시 분석하기
                  </button>
                  <button className="metro-btn-primary group">
                    전문 컨설팅 신청
                    <ChevronRight size={18} className="group-hover:translate-x-1" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
