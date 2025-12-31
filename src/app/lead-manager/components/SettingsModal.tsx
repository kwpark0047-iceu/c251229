'use client';

/**
 * 설정 모달 컴포넌트 - Neo-Seoul Transit Design
 * API 키, CORS 프록시, 검색 기준 등 설정
 */

import React, { useState } from 'react';
import { X, Key, Globe, Search, MapPin, Eye, EyeOff, Settings } from 'lucide-react';

import { Settings as SettingsType, SearchType, REGION_CODES } from '../types';
import { CORS_PROXIES, DEFAULT_API_KEY } from '../constants';

interface SettingsModalProps {
  settings: SettingsType;
  onSave: (settings: SettingsType) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
  const [formData, setFormData] = useState<SettingsType>({ ...settings });
  const [showApiKey, setShowApiKey] = useState(false);
  const [customProxy, setCustomProxy] = useState('');

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
        className="relative w-full max-w-lg mx-4 rounded-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-300"
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
            className="p-2.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* 본문 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* API 인증키 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-3">
              <Key className="w-4 h-4 text-[var(--metro-line5)]" />
              API 인증키
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="metro-input pr-12"
                placeholder="LocalData API 인증키 입력"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, apiKey: DEFAULT_API_KEY })}
              className="mt-2 text-xs font-medium transition-colors"
              style={{ color: 'var(--metro-line4)' }}
            >
              기본 키 사용
            </button>
          </div>

          {/* CORS 프록시 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-3">
              <Globe className="w-4 h-4 text-[var(--metro-line2)]" />
              CORS 프록시
            </label>
            <select
              value={isPresetProxy ? formData.corsProxy : 'custom'}
              onChange={(e) => handleProxyChange(e.target.value)}
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
                type="text"
                value={formData.corsProxy}
                onChange={(e) => setFormData({ ...formData, corsProxy: e.target.value })}
                className="metro-input"
                placeholder="https://your-proxy.com/?"
              />
            )}
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              CORS 문제 해결을 위한 프록시 서버 URL
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
              value={formData.regionCode}
              onChange={(e) => setFormData({ ...formData, regionCode: e.target.value })}
              className="metro-input"
            >
              {Object.entries(REGION_CODES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>

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
