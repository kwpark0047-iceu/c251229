'use client';

import React, { useState } from 'react';
import { Train, Users, ArrowUpRight, Info, Zap } from 'lucide-react';

interface LineInfo {
  line: string;
  name: string;
  color: string;
  trafficRank: number;
  mainStations: string[];
  description: string;
  peakStation: string;
}

const LINE_DATA: LineInfo[] = [
  { line: '1', name: '1호선', color: 'var(--metro-line1)', trafficRank: 3, mainStations: ['서울역', '종로3가', '청량리'], description: '대한민국 최초의 지하철, 전국 광역 철도망의 허브', peakStation: '서울역' },
  { line: '2', name: '2호선', color: 'var(--metro-line2)', trafficRank: 1, mainStations: ['강남', '홍대입구', '잠실'], description: '서울 대순환선, 유동인구와 광고 가치 최상위 노선', peakStation: '강남' },
  { line: '3', name: '3호선', color: 'var(--metro-line3)', trafficRank: 4, mainStations: ['고속터미널', '교대', '양재'], description: '강남과 강북을 잇는 핵심 주거·비즈니스 라인', peakStation: '고속터미널' },
  { line: '4', name: '4호선', color: 'var(--metro-line4)', trafficRank: 5, mainStations: ['명동', '혜화', '사당'], description: '서울 남북을 관통하며 대학가와 쇼핑 중심지 연결', peakStation: '명동' },
  { line: '5', name: '5호선', color: 'var(--metro-line5)', trafficRank: 2, mainStations: ['여의도', '광화문', '왕십리'], description: '금융·정치 중심지를 관통하는 골드 라인', peakStation: '여의도' },
  { line: '6', name: '6호선', color: 'var(--metro-line6)', trafficRank: 8, mainStations: ['이태원', '합정', '디지털미디어시티'], description: '문화 상권과 미디어 성지를 잇는 감각적 노선', peakStation: '합정' },
  { line: '7', name: '7호선', color: 'var(--metro-line7)', trafficRank: 6, mainStations: ['건대입구', '가산디지털단지', '논현'], description: '주거밀집 지역과 주요 업무지구를 연결하는 강남 핵심선', peakStation: '가산디지털단지' },
  { line: '8', name: '8호선', color: 'var(--metro-line8)', trafficRank: 9, mainStations: ['잠실', '천호', '문정'], description: '송파·강동 및 경기 남동부 주거 벨트의 핵심', peakStation: '잠실' },
];

export default function SubwayNetworkMap() {
  const [selectedLine, setSelectedLine] = useState<LineInfo | null>(null);

  return (
    <div className="w-full py-16 px-4 bg-void/30 relative overflow-hidden">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-display text-4xl mb-4 text-white">서울교통공사 스마트 노선도</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            1-8호선 핵심 노선별 유동인구 데이터와 광고 가치를 분석하여 최적의 비즈니스 인사이트를 제공합니다.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 mb-16">
          {LINE_DATA.map((line) => (
            <button
              key={line.line}
              onMouseEnter={() => setSelectedLine(line)}
              className={`
                relative w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center
                transition-all duration-300 transform hover:scale-110 active:scale-95
                ${selectedLine?.line === line.line ? 'shadow-[0_0_30px_var(--line-color)]' : 'opacity-70 hover:opacity-100'}
              `}
              style={{ 
                backgroundColor: line.color, 
                boxShadow: selectedLine?.line === line.line ? `0 0 30px ${line.color}80` : 'none',
                '--line-color': line.color 
              } as any}
            >
              <span className="text-2xl md:text-3xl font-black text-white drop-shadow-md">
                {line.line}
              </span>
              
              {/* 노선도 연장선 데코레이션 */}
              <div className="absolute top-1/2 -left-3 w-3 h-0.5 bg-white/20" />
              <div className="absolute top-1/2 -right-3 w-3 h-0.5 bg-white/20" />
            </button>
          ))}
        </div>

        {/* 상세 정보 카드 (부유 효과) */}
        <div className="min-h-[220px] flex justify-center">
          {selectedLine ? (
            <div className="glass-card w-full max-w-3xl p-8 flex flex-col md:flex-row gap-8 animate-float items-center border-t-2" 
                 style={{ borderTopColor: selectedLine.color }}>
              
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
                       style={{ backgroundColor: selectedLine.color }}>
                    {selectedLine.line}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{selectedLine.name} 인사이트</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-widest mt-1">
                      <Zap size={12} className="text-yellow-400" /> 유동인구 랭킹: TOP {selectedLine.trafficRank}
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-300 leading-relaxed">
                  {selectedLine.description}
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedLine.mainStations.map(station => (
                    <span key={station} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400">
                      #{station}
                    </span>
                  ))}
                </div>
              </div>

              <div className="w-full md:w-64 space-y-4 bg-void/50 p-6 rounded-2xl border border-white/5">
                <div className="space-y-1">
                  <div className="text-[10px] text-gray-500 font-bold uppercase">가장 붐비는 역</div>
                  <div className="text-xl font-bold text-white flex items-center gap-2">
                    {selectedLine.peakStation} <ArrowUpRight size={16} className="text-emerald-400" />
                  </div>
                </div>
                
                <div className="h-px bg-white/10" />
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase">사용자 선호도</div>
                    <div className="text-lg font-bold text-emerald-400">98.2%</div>
                  </div>
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <TrendingUp size={20} className="text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-500 animate-pulse">
              <Info size={48} className="mb-4 opacity-20" />
              <p>노선 번호를 클릭하여 상세 광고 데이터를 확인하세요</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .bg-grid-pattern {
          background-image: linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), 
                            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>
    </div>
  );
}

function TrendingUp(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
