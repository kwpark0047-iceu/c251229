'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Building2,
  Loader2,
  Handshake,
} from 'lucide-react';
import { Contract, ContractStatus } from '../types';
import { getContracts } from '../contract-service';

const CONTRACT_STATUS_META: { key: ContractStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'active', label: '진행 중' },
  { key: 'expiring', label: '30일 내 만료' },
  { key: 'expired', label: '만료됨' },
];

function formatWon(value?: number): string {
  if (value === undefined || value === null) return '-';
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억`;
  if (value >= 10000) return `${(value / 10000).toFixed(0)}만`;
  return `${value.toLocaleString()}원`;
}

function formatDate(date?: string): string {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getStatusBadge(status: ContractStatus) {
  switch (status) {
    case 'active':
      return { icon: <CheckCircle2 className="w-3.5 h-3.5" />, cls: 'bg-green-100 text-green-700', label: '진행 중' };
    case 'expiring':
      return { icon: <Clock className="w-3.5 h-3.5" />, cls: 'bg-amber-100 text-amber-700', label: '30일 내 만료' };
    case 'expired':
      return { icon: <AlertCircle className="w-3.5 h-3.5" />, cls: 'bg-red-100 text-red-700', label: '만료됨' };
    default:
      return { icon: <Clock className="w-3.5 h-3.5" />, cls: 'bg-slate-100 text-slate-500', label: '기간 미설정' };
  }
}

export default function ContractsView() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'ALL'>('ALL');

  useEffect(() => {
    const fetchContracts = async () => {
      setIsLoading(true);
      const result = await getContracts();
      if (result.success) {
        setContracts(result.contracts);
      }
      setIsLoading(false);
    };
    fetchContracts();
  }, []);

  const statusOf = (c: Contract): ContractStatus => {
    if (!c.endDate) return 'unknown';
    const end = new Date(c.endDate).getTime();
    if (Number.isNaN(end)) return 'unknown';
    const now = Date.now();
    if (end < now) return 'expired';
    if (end - now < 30 * 24 * 60 * 60 * 1000) return 'expiring';
    return 'active';
  };

  const counts = {
    total: contracts.length,
    active: contracts.filter((c) => statusOf(c) === 'active').length,
    expiring: contracts.filter((c) => statusOf(c) === 'expiring').length,
    expired: contracts.filter((c) => statusOf(c) === 'expired').length,
  };

  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      c.lead?.bizName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.proposalTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lead?.nearestStation?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || statusOf(c) === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--metro-line3)]" />
      </div>
    );
  }

  const summaryCards = [
    { label: '전체 계약', value: counts.total, icon: <Handshake className="w-5 h-5" />, cls: 'text-[var(--metro-line3)]' },
    { label: '진행 중', value: counts.active, icon: <CheckCircle2 className="w-5 h-5" />, cls: 'text-green-600' },
    { label: '30일 내 만료', value: counts.expiring, icon: <Clock className="w-5 h-5" />, cls: 'text-amber-600' },
    { label: '만료됨', value: counts.expired, icon: <AlertCircle className="w-5 h-5" />, cls: 'text-red-600' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="flex items-center gap-3 bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-subtle)] shadow-sm"
          >
            <div className={`p-2 rounded-xl bg-[var(--bg-tertiary)] ${card.cls}`}>{card.icon}</div>
            <div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">{card.value.toLocaleString()}</div>
              <div className="text-xs text-[var(--text-muted)] font-medium">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-subtle)] shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="업체명, 제안서, 역명 검색..."
            className="pl-10 pr-4 py-2 w-full bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--metro-line3)]/30 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CONTRACT_STATUS_META.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === key
                  ? 'bg-[var(--metro-line3)] text-white shadow-md'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg-tertiary)]/50 border-b border-[var(--border-subtle)]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">업체명</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">제안서</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">계약 금액</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">계약일</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">만료일</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                      <FileText className="w-8 h-8" />
                      <span className="text-sm font-medium">수락된 제안서가 없습니다.</span>
                      <span className="text-xs">제안서가 수락되면 계약 목록에 자동으로 표시됩니다.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((c) => {
                  const status = statusOf(c);
                  const badge = getStatusBadge(status);
                  return (
                    <tr key={c.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-[var(--text-primary)]">{c.lead?.bizName ?? '-'}</div>
                            <div className="text-xs text-[var(--text-muted)]">
                              {c.lead?.nearestStation || '역 미지정'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[var(--metro-line3)] shrink-0" />
                          <span className="text-sm text-[var(--text-secondary)]">{c.proposalTitle ?? '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-[var(--text-primary)]">{formatWon(c.finalPrice)}</span>
                        {c.discountRate ? (
                          <div className="text-xs text-[var(--text-muted)]">
                            할인 {c.discountRate}%
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                          <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          {formatDate(c.startDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                          <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          {formatDate(c.endDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
          총 {filteredContracts.length}건 표시 (전체 {contracts.length}건)
        </div>
      </div>
    </div>
  );
}