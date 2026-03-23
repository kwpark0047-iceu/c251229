'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  Search, 
  Filter,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  Activity,
  History,
  X,
  FileUp,
  Plus,
  Users as UsersIcon,
  Loader2,
  Eye
} from 'lucide-react';
import { Proposal, ProposalStatus, Lead, STATUS_METRO_COLORS } from '../types';
import { getProposals, getProposalLogs } from '../proposal-service';
import { getLeads } from '../supabase-service';
import ProposalForm from './ProposalForm';

export default function ProposalsView() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'ALL'>('ALL');
  
  // 로그 관련 상태
  const [selectedLogProposal, setSelectedLogProposal] = useState<Proposal | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  
  // 업로드 모달 관련 상태
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLeadSelectModal, setShowLeadSelectModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLeadsLoading, setIsLeadsLoading] = useState(false);

  useEffect(() => {
    const fetchProposals = async () => {
      setIsLoading(true);
      const result = await getProposals();
      if (result.success) {
        setProposals(result.proposals);
      }
      setIsLoading(false);
    };
    fetchProposals();
  }, []);

  const fetchLeadsForSelect = async (query: string) => {
    setIsLeadsLoading(true);
    const result = await getLeads({ searchQuery: query, pageSize: 10 });
    if (result.success) {
      setLeads(result.leads);
    }
    setIsLeadsLoading(false);
  };

  useEffect(() => {
    if (showLeadSelectModal) {
      const timer = setTimeout(() => {
        fetchLeadsForSelect(leadSearchQuery);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [leadSearchQuery, showLeadSelectModal]);

  const filteredProposals = proposals.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.originalFilename?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleShowLogs = async (proposal: Proposal) => {
    setSelectedLogProposal(proposal);
    setIsLogsLoading(true);
    setShowLogModal(true);
    
    const result = await getProposalLogs(proposal.id);
    if (result.success) {
      setLogs(result.logs);
    }
    setIsLogsLoading(false);
  };

  const getStatusIcon = (status: ProposalStatus) => {
    switch (status) {
      case 'ACCEPTED': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'VIEWED': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'SENT': return <ExternalLink className="w-4 h-4 text-purple-500" />;
      case 'DRAFT': return <FileText className="w-4 h-4 text-slate-400" />;
      case 'REJECTED': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: ProposalStatus) => {
    switch (status) {
      case 'DRAFT': return '임시저장';
      case 'SENT': return '발송완료';
      case 'VIEWED': return '열람함';
      case 'ACCEPTED': return '수락됨';
      case 'REJECTED': return '거절됨';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--metro-line3)]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 필터 및 검색 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-subtle)] shadow-sm">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input 
              type="text"
              placeholder="제안서 제목 또는 파일명 검색..."
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--metro-line3)]/30 transition-all font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-[var(--text-muted)] mr-1 shrink-0" />
          {(['ALL', 'DRAFT', 'SENT', 'VIEWED', 'ACCEPTED'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs rounded-xl transition-all whitespace-nowrap font-semibold ${
                statusFilter === status 
                ? 'bg-[var(--metro-line3)] text-white shadow-md' 
                : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border-subtle)]'
              }`}
            >
              {status === 'ALL' ? '전체 상태' : getStatusLabel(status)}
            </button>
          ))}
          
          <div className="h-6 w-px bg-[var(--border-subtle)] mx-2 hidden md:block" />
          
          <button
            onClick={() => {
              setSelectedLead(null);
              setShowUploadModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--metro-line4)] text-white text-xs font-bold rounded-xl shadow-lg shadow-[var(--metro-line4)]/20 hover:scale-105 active:scale-95 transition-all animate-float-subtle"
          >
            <FileUp className="w-4 h-4" />
            제안서 직접 업로드
          </button>
        </div>
      </div>

      {/* 제안서 목록 리스트 */}
      <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-tertiary)]/50 border-b border-[var(--border-subtle)]">
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">상태</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">제안서 정보</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">파일 타입</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">발송/생성일</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredProposals.length > 0 ? (
                filteredProposals.map((proposal) => (
                  <tr key={proposal.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(proposal.status)}
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {getStatusLabel(proposal.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--metro-line3)] transition-colors">
                          {proposal.title}
                        </span>
                        {proposal.originalFilename && (
                          <span className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {proposal.originalFilename}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                        proposal.isExternal ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {proposal.isExternal ? (proposal.fileType || 'FILE') : 'GENERATED'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col text-xs text-[var(--text-muted)] font-medium">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(proposal.createdAt || '').toLocaleDateString()}
                        </div>
                        {proposal.sentAt && (
                          <div className="flex items-center gap-1 mt-1 text-[var(--metro-line4)]">
                            <ExternalLink className="w-3 h-3" />
                            {new Date(proposal.sentAt).toLocaleDateString()} 발송
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {proposal.pdfUrl && (
                          <>
                            <a 
                              href={proposal.pdfUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--metro-line2)] transition-all"
                              title="미리보기"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            <a 
                              href={proposal.pdfUrl} 
                              download={proposal.originalFilename || 'proposal.pdf'}
                              className="p-2 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--metro-line3)] transition-all"
                              title="다운로드"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </>
                        )}
                        <button
                          onClick={() => handleShowLogs(proposal)}
                          className="p-2 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--metro-line4)] transition-all"
                          title="접근 로그 확인"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    {searchQuery || statusFilter !== 'ALL' ? '조건에 맞는 제안서가 없습니다.' : '등록된 제안서가 없습니다.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* 접근 로그 모달 */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-secondary)] w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--metro-line4)]/10 text-[var(--metro-line4)]">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--text-primary)]">접근 로그 확인</h3>
                  <p className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">{selectedLogProposal?.title}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLogModal(false)}
                className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors text-[var(--text-muted)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[400px] overflow-y-auto">
              {isLogsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--metro-line4)]"></div>
                  <p className="text-sm text-[var(--text-muted)]">로그를 불러오는 중...</p>
                </div>
              ) : logs.length > 0 ? (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 p-4 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-subtle)] hover:border-[var(--metro-line4)]/30 transition-all group">
                      <div className={`mt-1 p-2 rounded-lg ${
                        log.action_type === 'DOWNLOAD' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                      }`}>
                        {log.action_type === 'DOWNLOAD' ? <Download className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            {log.user_email || '익명 사용자'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                            {log.action_type === 'DOWNLOAD' ? '다운로드' : '열람함'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                          <Calendar className="w-3 h-3" />
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                  <Activity className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">아직 접근 기록이 없습니다.</p>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-[var(--bg-tertiary)]/30 border-t border-[var(--border-subtle)] flex justify-end">
              <button 
                onClick={() => setShowLogModal(false)}
                className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-all font-bold text-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 리드 선택 모달 */}
      {showLeadSelectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-secondary)] w-full max-w-md rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--metro-line2)]/10 text-[var(--metro-line2)]">
                  <UsersIcon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[var(--text-primary)]">업로드할 리드 선택</h3>
              </div>
              <button onClick={() => setShowLeadSelectModal(false)} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors text-[var(--text-muted)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input 
                  type="text"
                  placeholder="업체명 또는 지역 검색..."
                  className="w-full pl-10 pr-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--metro-line2)]/30 transition-all"
                  value={leadSearchQuery}
                  onChange={(e) => setLeadSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {isLeadsLoading ? (
                  <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--metro-line2)]" /></div>
                ) : leads.length > 0 ? (
                  leads.map(lead => (
                    <button
                      key={lead.id}
                      onClick={() => {
                        setSelectedLead(lead);
                        setShowLeadSelectModal(false);
                        setShowUploadModal(true);
                      }}
                      className="w-full text-left p-3 rounded-xl border border-transparent hover:border-[var(--metro-line2)]/30 hover:bg-[var(--metro-line2)]/5 transition-all group"
                    >
                      <div className="font-bold text-[var(--text-primary)] group-hover:text-[var(--metro-line2)]">{lead.bizName}</div>
                      <div className="text-xs text-[var(--text-muted)] mt-1 truncate">{lead.roadAddress || lead.lotAddress}</div>
                    </button>
                  ))
                ) : (
                  <div className="py-12 text-center text-sm text-[var(--text-muted)] italic">검색 결과가 없습니다.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 제안서 업로드 모달 */}
      {showUploadModal && selectedLead && (
        <ProposalForm 
          lead={selectedLead}
          onClose={() => {
            setShowUploadModal(false);
            setSelectedLead(null);
          }}
          onSuccess={async () => {
            const result = await getProposals();
            if (result.success) setProposals(result.proposals);
          }}
        />
      )}
    </div>
  );
}
