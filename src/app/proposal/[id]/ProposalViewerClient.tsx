'use client';

import React, { useEffect, useState } from 'react';
import { Proposal, AdInventory } from '@/app/lead-manager/types';
import { FileText, Download, Calendar, MapPin, Loader2, ArrowRight } from 'lucide-react';
import { formatDistance } from '@/app/lead-manager/utils';

interface ProposalViewerProps {
  proposal: Proposal;
  inventory: AdInventory[];
  bizName: string;
}

const formatCurrency = (amt: number) => {
  return new Intl.NumberFormat('ko-KR').format(amt) + '원';
};

export default function ProposalViewerClient({ proposal, inventory, bizName }: ProposalViewerProps) {
  const [viewLogged, setViewLogged] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // 페이지 접속 시 VIEW 로그 기록
    if (!viewLogged) {
      fetch(`/api/proposals/${proposal.id}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'VIEW', email: proposal.emailRecipient }),
      }).catch(err => console.error('Failed to log view:', err));
      setViewLogged(true);
    }
  }, [proposal.id, proposal.emailRecipient, viewLogged]);

  const handleDownload = async () => {
    if (!proposal.pdfUrl) return;
    
    setDownloading(true);
    try {
      // 1. DOWNLOAD 로그 기록
      await fetch(`/api/proposals/${proposal.id}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DOWNLOAD', email: proposal.emailRecipient }),
      });

      // 2. 파일 다운로드 (새 탭에서 열거나 직접 다운로드 연동)
      // 외부 URL (supabase storage 등)인 경우
      const response = await fetch(proposal.pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = proposal.originalFilename || `${bizName}_제안서.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('파일 다운로드 중 오류가 발생했습니다.');
    } finally {
      setDownloading(false);
    }
  };

  const getStatusBadge = () => {
    if (proposal.status === 'ACCEPTED') return <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-bold border border-green-500/30">수락됨</span>;
    if (proposal.status === 'REJECTED') return <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-bold border border-red-500/30">거부됨</span>;
    return <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-bold border border-blue-500/30">검토 중</span>;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 헤더 섹션 */}
      <div className="bg-[#111216] rounded-3xl p-6 md:p-10 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{proposal.title}</h1>
                <p className="text-blue-400 font-medium">{bizName} 원장님을 위한 맞춤 제안</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm text-slate-400 font-medium">
              <div className="flex items-center gap-1.5 bg-slate-800/50 px-3 py-1.5 rounded-lg">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>발송일: {proposal.sentAt ? new Date(proposal.sentAt).toLocaleDateString() : new Date(proposal.createdAt || '').toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/50 px-3 py-1.5 rounded-lg">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>추천 위치: {inventory.length}곳</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end justify-between">
            {getStatusBadge()}
            
            <button 
              onClick={handleDownload}
              disabled={downloading || !proposal.pdfUrl}
              className="mt-6 w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
            >
              {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              {downloading ? '다운로드 중...' : '제안서 PDF 다운로드'}
            </button>
          </div>
        </div>

        {/* 인사말 (커스텀 제안 전용) */}
        {proposal.greetingMessage && (
          <div className="mt-8 p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50 text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
            {proposal.greetingMessage}
          </div>
        )}
      </div>

      {/* 매체 리스트 영역 (자동 제안의 경우) */}
      {!proposal.isExternal && inventory.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 text-sm">✓</span>
            추천 매체 리스트
          </h2>
          
          <div className="grid gap-4">
            {inventory.map((item, idx) => (
              <div key={item.id} className="bg-[#111216] rounded-2xl p-5 border border-slate-800 flex flex-col md:flex-row items-center gap-6 hover:border-slate-700 transition-colors">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold shrink-0">
                  {idx + 1}
                </div>
                
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-xs font-bold text-slate-300">{item.stationName}역</span>
                    <h3 className="font-bold text-white text-lg truncate">{item.adType}</h3>
                  </div>
                  <p className="text-slate-400 text-sm">{item.locationCode} • {item.description}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-slate-500 text-xs font-bold mb-1">월 광고비</p>
                  <p className="text-xl font-black text-emerald-400">{formatCurrency(item.priceMonthly || 0)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4 mt-8">
            <div>
              <p className="text-slate-400 text-sm font-bold">총 월 예상 비용</p>
              <div className="flex items-end gap-3 mt-1">
                <p className="text-3xl font-black text-white">{formatCurrency(proposal.finalPrice || 0)}</p>
                {proposal.discountRate ? (
                  <p className="text-slate-500 line-through text-sm mb-1">{formatCurrency(proposal.totalPrice || 0)}</p>
                ) : null}
              </div>
            </div>
            {proposal.discountRate ? (
              <div className="bg-orange-500/20 text-orange-400 px-4 py-2 rounded-xl font-bold border border-orange-500/30">
                {proposal.discountRate}% 특별 할인 적용
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 하단 연락처 */}
      <div className="text-center py-10 opacity-60">
        <p className="text-slate-400 text-sm font-medium">제안서에 대해 궁금한 점이 있으신가요?</p>
        <p className="text-white font-bold mt-1">담당자에게 문의하기 &rarr; kwpark0047@gmail.com</p>
      </div>

    </div>
  );
}
