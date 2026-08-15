'use client';

/**
 * 설정 모달 컴포넌트 - Neo-Seoul Transit Design (Premium Layout)
 * CORS 프록시, 검색 기준 및 API Vault (등록, 삭제, 검증) 기능 지원
 */

import React, { useState } from 'react';
import {
  X, Globe, Search, MapPin, Settings, Shield, Trash2,
  Loader2, Eye, EyeOff, CheckCircle2, XCircle, Key, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
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
  const [activeTab, setActiveTab] = useState<'general' | 'apiVault'>('general');
  const [formData, setFormData] = useState<SettingsType>({ ...settings });
  const [isRemovingDuplicates, setIsRemovingDuplicates] = useState(false);
  const [duplicateResult, setDuplicateResult] = useState<string | null>(null);

  // 다중 API 키 개별 상태
  const [apiKeys, setApiKeys] = useState<{
    localdata: string;
    seoul: string;
    kric: string;
    resend: string;
  }>(() => {
    try {
      const parsed = JSON.parse(settings.apiKey || '{}');
      return {
        localdata: parsed.localdata || '',
        seoul: parsed.seoul || '',
        kric: parsed.kric || '',
        resend: parsed.resend || '',
      };
    } catch (e) {
      if (settings.apiKey && !settings.apiKey.startsWith('{')) {
        return {
          localdata: settings.apiKey,
          seoul: '',
          kric: '',
          resend: '',
        };
      }
      return {
        localdata: '',
        seoul: '',
        kric: '',
        resend: '',
      };
    }
  });

  // 입력 필드 비밀번호 노출 여부
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({
    localdata: false,
    seoul: false,
    kric: false,
    resend: false,
  });

  // API 연결 테스트 결과 상태
  const [verifyStatus, setVerifyStatus] = useState<Record<string, {
    loading: boolean;
    success: boolean | null;
    message?: string;
    latency?: number;
  }>>({
    localdata: { loading: false, success: null },
    seoul: { loading: false, success: null },
    kric: { loading: false, success: null },
    resend: { loading: false, success: null },
  });

  // 프록시가 기본 목록에 있는지 확인
  const isPresetProxy = CORS_PROXIES.some(p => p.value === formData.corsProxy);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSettings = {
      ...formData,
      apiKey: JSON.stringify(apiKeys)
    };
    onSave(finalSettings);
  };

  const handleProxyChange = (value: string) => {
    if (value !== 'custom') {
      setFormData({ ...formData, corsProxy: value });
    }
  };

  const handleRegisterKey = (type: keyof typeof apiKeys, val: string) => {
    const nextApiKeys = { ...apiKeys, [type]: val };
    setApiKeys(nextApiKeys);
    
    // 설정 상태 즉시 반영
    const nextSettings = {
      ...formData,
      apiKey: JSON.stringify(nextApiKeys)
    };
    setFormData(nextSettings);
  };

  const handleDeleteKey = (type: keyof typeof apiKeys) => {
    if (!confirm('해당 API 키 설정을 삭제하고 시스템 기본값(Fallback)으로 초기화하시겠습니까?')) {
      return;
    }
    const nextApiKeys = { ...apiKeys, [type]: '' };
    setApiKeys(nextApiKeys);
    
    const nextSettings = {
      ...formData,
      apiKey: JSON.stringify(nextApiKeys)
    };
    setFormData(nextSettings);

    // 연결 검증 결과도 리셋
    setVerifyStatus(prev => ({
      ...prev,
      [type]: { loading: false, success: null }
    }));
  };

  const handleVerifyKey = async (type: keyof typeof apiKeys) => {
    const key = apiKeys[type];
    if (!key) {
      toast.warning('연결을 확인하려면 먼저 API 키를 입력해 주세요.');
      return;
    }

    setVerifyStatus(prev => ({
      ...prev,
      [type]: { ...prev[type], loading: true, success: null, message: undefined }
    }));

    try {
      const response = await fetch('/api/api-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiType: type,
          apiKey: key,
        }),
      });

      const resData = await response.json();
      if (resData.success) {
        setVerifyStatus(prev => ({
          ...prev,
          [type]: {
            loading: false,
            success: true,
            message: resData.message,
            latency: resData.latency,
          }
        }));
      } else {
        setVerifyStatus(prev => ({
          ...prev,
          [type]: {
            loading: false,
            success: false,
            message: resData.error || '연결 테스트 실패',
          }
        }));
      }
    } catch (err) {
      setVerifyStatus(prev => ({
        ...prev,
        [type]: {
          loading: false,
          success: false,
          message: (err as Error).message || '네트워크 응답 오류',
        }
      }));
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
        className="absolute inset-0 backdrop-blur-md bg-[#08080C]/80"
        onClick={onClose}
      />

      {/* 모달 (반중력 물리효과 부여 class: modal-popup animate-float) */}
      <div
        className="relative w-full max-w-2xl mx-4 rounded-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-300 modal-popup animate-float bg-[var(--glass-bg)] border-[var(--glass-border)] shadow-[0_25px_50px_rgba(0,0,0,0.6)]"
        style={{ animationDuration: '6s' }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[var(--metro-line4)] to-[var(--metro-line2)] shadow-[0_4px_15px_rgba(50,164,206,0.3)]">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">시스템 설정</h2>
              <p className="text-xs text-[var(--text-muted)]">영업 관리 및 데이터 동기화 옵션</p>
            </div>
          </div>
          <button
            onClick={onClose}
            title="닫기"
            className="p-2.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* 프리미엄 탭 버튼 */}
        <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 px-4">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'general' ? 'border-[var(--metro-line4)] text-[var(--metro-line4)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
          >
            <Settings className="w-4 h-4" />
            일반 설정
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('apiVault')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'apiVault' ? 'border-[var(--metro-line2)] text-[var(--metro-line2)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
          >
            <Key className="w-4 h-4" />
            API 키 Vault
            {(apiKeys.localdata || apiKeys.seoul) && (
              <span className="w-2 h-2 rounded-full bg-[var(--metro-line2)] animate-pulse" />
            )}
          </button>
        </div>

        {/* 본문 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto">
          {activeTab === 'general' ? (
            <div className="space-y-6">
              {/* CORS 프록시 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-3">
                  <Globe className="w-4 h-4 text-[var(--metro-line2)]" />
                  CORS 프록시 설정
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
                  <option value="custom">사용자 정의 프록시</option>
                </select>
                {!isPresetProxy && (
                  <input
                    id="custom-proxy-input"
                    name="corsProxy"
                    type="text"
                    value={formData.corsProxy}
                    onChange={(e) => setFormData({ ...formData, corsProxy: e.target.value })}
                    className="metro-input"
                    aria-label="사용자 지정 프록시 URL"
                    placeholder="https://your-proxy.com/?"
                  />
                )}
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  서버사이드 API 동기화를 사용하므로 특수한 개발 목적 외에는 설정하지 않아도 무방합니다.
                </p>
              </div>

              {/* 검색 기준 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-3">
                  <Search className="w-4 h-4 text-[var(--metro-line3)]" />
                  실시간 수집 검색 기준
                </label>
                <div className="flex gap-4">
                  <label
                    className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-300 ${formData.searchType === 'license_date' ? 'bg-[#32A4CE]/10 border-[var(--metro-line4)] shadow-[0_0_15px_rgba(50,164,206,0.15)]' : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]'}`}
                  >
                    <input
                      id="search-type-license"
                      type="radio"
                      name="searchType"
                      value="license_date"
                      checked={formData.searchType === 'license_date'}
                      aria-label="인허가일 기준 검색"
                      onChange={(e) => setFormData({ ...formData, searchType: e.target.value as SearchType })}
                      className="w-4 h-4 accent-[var(--metro-line4)]"
                    />
                    <span className={`text-sm font-semibold ${formData.searchType === 'license_date' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      인허가일 기준
                    </span>
                  </label>
                  <label
                    className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-300 ${formData.searchType === 'modified_date' ? 'bg-[#32A4CE]/10 border-[var(--metro-line4)] shadow-[0_0_15px_rgba(50,164,206,0.15)]' : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]'}`}
                  >
                    <input
                      id="search-type-modified"
                      type="radio"
                      name="searchType"
                      value="modified_date"
                      checked={formData.searchType === 'modified_date'}
                      aria-label="데이터 수정일 기준 검색"
                      onChange={(e) => setFormData({ ...formData, searchType: e.target.value as SearchType })}
                      className="w-4 h-4 accent-[var(--metro-line4)]"
                    />
                    <span className={`text-sm font-semibold ${formData.searchType === 'modified_date' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      최종 수정일 기준
                    </span>
                  </label>
                </div>
              </div>

              {/* 지역 코드 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-3">
                  <MapPin className="w-4 h-4 text-[var(--metro-line7)]" />
                  기본 동기화 지역
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
                    <option key={code} value={code} id={`region-opt-${code}`}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 데이터 관리 - 관리자/오너 전용 */}
              <RoleGuard allowedRoles={['owner', 'admin']}>
                <div className="border-t border-[var(--border-subtle)] pt-5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-3">
                    <Trash2 className="w-4 h-4 text-red-400" />
                    데이터 무결성 관리
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveDuplicates}
                    disabled={isRemovingDuplicates}
                    title="중복 리드 삭제"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-semibold transition-all duration-300 hover:bg-red-500/10 disabled:opacity-50 border-red-500/30 text-red-500"
                  >
                    {isRemovingDuplicates ? (
                      <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      데이터베이스 중복 스캔 중...
                      </>
                    ) : (
                      <>
                      <Trash2 className="w-4 h-4" />
                      중복 리드 일괄 정리
                      </>
                    )}
                  </button>
                  {duplicateResult && (
                    <p className={`mt-2 text-xs font-semibold ${duplicateResult.includes('오류') ? 'text-red-400' : 'text-[var(--metro-line2)]'}`}>
                      {duplicateResult}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    업체명과 주소가 동일하게 입수된 중복 리드를 지능적으로 정리하여 영업 활동의 혼선을 방지합니다.
                  </p>
                </div>
              </RoleGuard>
            </div>
          ) : (
            <div className="space-y-6">
              {/* API 키 보안 알림 */}
              <div className="flex items-start gap-3 p-4 rounded-xl border bg-[#3CB54A]/10 border-[#3CB54A]/30">
                <Shield className="w-5 h-5 text-[var(--metro-line2)] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[var(--metro-line2)]">
                    개인 API 인증키 암호화 보관소 (Vault)
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    여기 등록된 개인 인증키는 사용자의 데이터 조회를 위해서만 안전하게 사용됩니다. 입력하지 않은 경우 서버의 기본 인증키(Fallback)로 동작합니다.
                  </p>
                </div>
              </div>

              {/* API 키 리스트 */}
              <div className="space-y-5">
                {/* 1. LocalData API Key */}
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--metro-line4)] shadow-[0_0_8px_var(--metro-line4)]" />
                      <span className="text-sm font-bold text-[var(--text-primary)]">공공데이터포털 LocalData 키</span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">의원, 병원, 체육시설 (전국)</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKeys.localdata ? 'text' : 'password'}
                        value={apiKeys.localdata}
                        onChange={(e) => handleRegisterKey('localdata', e.target.value)}
                        placeholder="인증키(authKey)를 입력하세요"
                        className="metro-input pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys(prev => ({ ...prev, localdata: !prev.localdata }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      >
                        {showKeys.localdata ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {apiKeys.localdata && (
                      <button
                        type="button"
                        onClick={() => handleDeleteKey('localdata')}
                        className="p-3 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
                        title="키 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => handleVerifyKey('localdata')}
                      disabled={verifyStatus.localdata.loading || !apiKeys.localdata}
                      className="text-xs font-semibold px-3 py-1.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      {verifyStatus.localdata.loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--metro-line4)]" />}
                      연결 확인
                    </button>
                    
                    {verifyStatus.localdata.success !== null && (
                      <div className="flex items-center gap-1.5 text-xs">
                        {verifyStatus.localdata.success ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-[var(--metro-line2)]" />
                            <span className="text-[var(--metro-line2)] font-semibold">연결 성공 ({verifyStatus.localdata.latency}ms)</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-red-400 font-semibold" title={verifyStatus.localdata.message}>인증 실패 (클릭하여 오류 확인)</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {verifyStatus.localdata.success === false && verifyStatus.localdata.message && (
                    <p className="text-xs text-red-400 bg-red-500/5 p-2 rounded border border-red-500/10">
                      {verifyStatus.localdata.message}
                    </p>
                  )}
                </div>

                {/* 2. Seoul Data Portal API Key */}
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--metro-line2)] shadow-[0_0_8px_var(--metro-line2)]" />
                      <span className="text-sm font-bold text-[var(--text-primary)]">서울시 열린데이터 광장 키</span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">서울 지역 실시간 신규 의원 데이터</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKeys.seoul ? 'text' : 'password'}
                        value={apiKeys.seoul}
                        onChange={(e) => handleRegisterKey('seoul', e.target.value)}
                        placeholder="서울시 공공 API 인증키를 입력하세요"
                        className="metro-input pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys(prev => ({ ...prev, seoul: !prev.seoul }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      >
                        {showKeys.seoul ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {apiKeys.seoul && (
                      <button
                        type="button"
                        onClick={() => handleDeleteKey('seoul')}
                        className="p-3 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
                        title="키 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => handleVerifyKey('seoul')}
                      disabled={verifyStatus.seoul.loading || !apiKeys.seoul}
                      className="text-xs font-semibold px-3 py-1.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      {verifyStatus.seoul.loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--metro-line2)]" />}
                      연결 확인
                    </button>
                    
                    {verifyStatus.seoul.success !== null && (
                      <div className="flex items-center gap-1.5 text-xs">
                        {verifyStatus.seoul.success ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-[var(--metro-line2)]" />
                            <span className="text-[var(--metro-line2)] font-semibold">연결 성공 ({verifyStatus.seoul.latency}ms)</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-red-400 font-semibold" title={verifyStatus.seoul.message}>인증 실패</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {verifyStatus.seoul.success === false && verifyStatus.seoul.message && (
                    <p className="text-xs text-red-400 bg-red-500/5 p-2 rounded border border-red-500/10">
                      {verifyStatus.seoul.message}
                    </p>
                  )}
                </div>

                {/* 3. KRIC / Resend (향후 연동 카드 확장 영역) */}
                <div className="p-4 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/10 flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--metro-line2)]" />
                    <span>KRIC 역사 편의시설 / Resend 발송용 API</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs">자동 연동 대기</span>
                </div>
              </div>
            </div>
          )}

          {/* 버튼 영역 */}
          <div className="flex gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 rounded-xl border font-semibold transition-all duration-300 hover:bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
            >
              닫기
            </button>
            <button
              type="submit"
              className="flex-1 px-5 py-3 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 bg-gradient-to-br from-[var(--metro-line2)] to-[var(--metro-line4)] shadow-[0_4px_15px_rgba(60,181,74,0.3)] flex items-center justify-center gap-1.5"
            >
              설정 저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
