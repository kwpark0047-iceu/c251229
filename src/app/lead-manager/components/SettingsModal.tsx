'use client';

/**
 * 설정 모달 컴포넌트
 * API 키, CORS 프록시, 검색 기준 등 설정
 */

import React, { useState } from 'react';
import { X, Key, Globe, Search, MapPin, Eye, EyeOff } from 'lucide-react';

import { Settings, SearchType, REGION_CODES } from '../types';
import { CORS_PROXIES, DEFAULT_API_KEY } from '../constants';

interface SettingsModalProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
  const [formData, setFormData] = useState<Settings>({ ...settings });
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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">설정</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* 본문 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* API 인증키 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Key className="w-4 h-4" />
              API 인증키
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-20"
                placeholder="LocalData API 인증키 입력"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, apiKey: DEFAULT_API_KEY })}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700"
            >
              기본 키 사용
            </button>
          </div>

          {/* CORS 프록시 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Globe className="w-4 h-4" />
              CORS 프록시
            </label>
            <select
              value={isPresetProxy ? formData.corsProxy : 'custom'}
              onChange={(e) => handleProxyChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
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
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://your-proxy.com/?"
              />
            )}
            <p className="mt-1 text-xs text-slate-500">
              CORS 문제 해결을 위한 프록시 서버 URL
            </p>
          </div>

          {/* 검색 기준 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Search className="w-4 h-4" />
              검색 기준
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="searchType"
                  value="license_date"
                  checked={formData.searchType === 'license_date'}
                  onChange={(e) => setFormData({ ...formData, searchType: e.target.value as SearchType })}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">인허가일</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="searchType"
                  value="modified_date"
                  checked={formData.searchType === 'modified_date'}
                  onChange={(e) => setFormData({ ...formData, searchType: e.target.value as SearchType })}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">데이터 수정일</span>
              </label>
            </div>
          </div>

          {/* 지역 코드 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <MapPin className="w-4 h-4" />
              지역
            </label>
            <select
              value={formData.regionCode}
              onChange={(e) => setFormData({ ...formData, regionCode: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
