'use client';

/**
 * 설정 모달 컴포넌트 - Neo-Seoul Transit Design
 * CORS 프록시, 검색 기준 등 설정
 *
 * 참고: API 키는 서버에서 환경변수로 관리됩니다 (보안 강화)
 */

import React, { useState } from 'react';
import { X, Globe, Search, MapPin, Settings, Shield, Trash2, Loader2 } from 'lucide-react';
import RoleGuard from '@/components/RoleGuard';

import { Settings as SettingsType, SearchType, REGION_CODES } from '../types';
import { CORS_PROXIES } from '../constants';
import { deleteDuplicateLeadsFromDB } from '../supabase-service';

interface SettingsModalProps {
  settings: SettingsType;
  onSave: (settings: SettingsType) => void;
  onClose: () => void;
  onDataChanged?: () => void;
}

export default function SettingsModal({ settings, onSave, onClose, onDataChanged }: SettingsModalProps) {
  const [formData, setFormData] = useState<SettingsType>({ ...settings });
  const [customProxy] = useState('');
  const [isRemovingDuplicates, setIsRemovingDuplicates] = useState(false);
  const [duplicateResult, setDuplicateResult] = useState<string | null>(null);

  // 프록시가 기본 목록에 있는지 확인
  const isPresetProxy = CORS_PROXIES.some(p => p.value === formData.corsProxy);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleProxyChange = (value: string) => {
    if (value === 'custom') {
      setFormData({ ...formData, corsProxy: customProxy });
    } else {
      setFormData({ ...formData, corsProxy: value });
    }
  };

  const handleRemoveDuplicates = async () => {
    if (!confirm('중복된 리드를 삭제하시겠습니까?\n(같은 업체명+주소 조합 중 가장 먼저 등록된 데이터만 유지됩니다)')) {
      return;
    }

    setIsRemovingDuplicates(true);
    setDuplicateResult(null);

    try {
      const result = await deleteDuplicateLeadsFromDB();
      setDuplicateResult(result.message);
      if (result.success && result.removedCount > 0) {
        onDataChanged?.();
      }
    } catch (error) {
      setDuplicateResult(`오류: ${(error as Error).message}`);
    } finally {
      setIsRemovingDuplicates(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 백드롭 */}
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{ background: 'rgba(8, 8, 12, 0.8)' }}
        onClick={onClose}
      />

      {/* 모달 */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-300 modal-popup"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--metro-line4) 0%, var(--metro-line2) 100%)',
                boxShadow: '0 4px 15px rgba(50, 164, 206, 0.3)',
              }}
            >
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">설정</h2>
          </div>
          <button
            onClick={onClose}
            title="닫기"
            className="p-2.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* 본문 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* API 키 안내 (보안) */}
          <div
            className="flex items-start gap-3 p-4 rounded-xl border"
            style={{
              background: 'rgba(60, 181, 74, 0.1)',
              borderColor: 'rgba(60, 181, 74, 0.3)',
            }}
          >
            <Shield className="w-5 h-5 text-[var(--metro-line2)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[var(--metro-line2)]">
                API 키 보안 강화
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                API 키는 서버에서 안전하게 관리됩니다. 환경변수 LOCALDATA_API_KEY로 설정하세요.
              </p>
            </div>
          </div>

          {/* CORS 프록시 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-3">
              <Globe className="w-4 h-4 text-[var(--metro-line2)]" />
              CORS 프록시
            </label>
            <select
              id="cors-proxy-select"
              name="corsProxySelect"
              value={isPresetProxy ? formData.corsProxy : 'custom'}
              onChange={(e) => handleProxyChange(e.target.value)}
              title="CORS 프록시 선택"
              className="metro-input mb-2"
            >
              {CORS_PROXIES.map(proxy => (
                <option key={proxy.value} value={proxy.value}>
                  {proxy.label}
                </option>
              ))}
              <option value="custom">직접 입력</option>
            </select>
            {!isPresetProxy && (
              <input
                id="custom-proxy-input"
                name="corsProxy"
                type="text"
                value={formData.corsProxy}
                onChange={(e) => setFormData({ ...formData, corsProxy: e.target.value })}
                className="metro-input"
                placeholder="https://your-proxy.com/?"
              />
            )}
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              서버사이드 API를 사용하므로 프록시는 선택 사항입니다
            </p>
          </div>

          {/* 검색 기준 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-3">
              <Search className="w-4 h-4 text-[var(--metro-line3)]" />
              검색 기준
            </label>
            <div className="flex gap-4">
              <label
                className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-300"
                style={{
                  background: formData.searchType === 'license_date' ? 'rgba(50, 164, 206, 0.15)' : 'var(--bg-tertiary)',
                  borderColor: formData.searchType === 'license_date' ? 'var(--metro-line4)' : 'var(--border-subtle)',
                }}
              >
                <input
                  id="search-type-license"
                  type="radio"
                  name="searchType"
                  value="license_date"
                  checked={formData.searchType === 'license_date'}
                  onChange={(e) => setFormData({ ...formData, searchType: e.target.value as SearchType })}
                  className="w-4 h-4 accent-[var(--metro-line4)]"
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: formData.searchType === 'license_date' ? 'var(--metro-line4)' : 'var(--text-secondary)' }}
                >
                  인허가일
                </span>
              </label>
              <label
                className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-300"
                style={{
                  background: formData.searchType === 'modified_date' ? 'rgba(50, 164, 206, 0.15)' : 'var(--bg-tertiary)',
                  borderColor: formData.searchType === 'modified_date' ? 'var(--metro-line4)' : 'var(--border-subtle)',
                }}
              >
                <input
                  id="search-type-modified"
                  type="radio"
                  name="searchType"
                  value="modified_date"
                  checked={formData.searchType === 'modified_date'}
                  onChange={(e) => setFormData({ ...formData, searchType: e.target.value as SearchType })}
                  className="w-4 h-4 accent-[var(--metro-line4)]"
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: formData.searchType === 'modified_date' ? 'var(--metro-line4)' : 'var(--text-secondary)' }}
                >
                  데이터 수정일
                </span>
              </label>
            </div>
          </div>

          {/* 지역 코드 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-3">
              <MapPin className="w-4 h-4 text-[var(--metro-line7)]" />
              지역
            </label>
            <select
              id="region-code-select"
              name="regionCode"
              value={formData.regionCode}
              onChange={(e) => setFormData({ ...formData, regionCode: e.target.value })}
              title="지역 선택"
              className="metro-input"
            >
              {Object.entries(REGION_CODES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* 데이터 관리 - 관리자/오너 전용 */}
          <RoleGuard allowedRoles={['owner', 'admin']}>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-3">
                <Trash2 className="w-4 h-4 text-red-400" />
                데이터 관리
              </label>
              <button
                type="button"
                onClick={handleRemoveDuplicates}
                disabled={isRemovingDuplicates}
                title="중복 리드 삭제"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-medium transition-all duration-300 hover:bg-red-500/10 disabled:opacity-50"
                style={{
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                }}
              >
                {isRemovingDuplicates ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    중복 제거 중...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    중복 리드 삭제
                  </>
                )}
              </button>
              {duplicateResult && (
                <p className={`mt-2 text-sm ${duplicateResult.includes('오류') ? 'text-red-400' : 'text-[var(--metro-line2)]'}`}>
                  {duplicateResult}
                </p>
              )}
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                같은 업체명+주소 조합의 중복 데이터를 삭제합니다
              </p>
            </div>
          </RoleGuard>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 rounded-xl border font-semibold transition-all duration-300 hover:bg-[var(--bg-secondary)]"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-5 py-3 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, var(--metro-line2) 0%, var(--metro-line4) 100%)',
                boxShadow: '0 4px 15px rgba(60, 181, 74, 0.3)',
              }}
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
