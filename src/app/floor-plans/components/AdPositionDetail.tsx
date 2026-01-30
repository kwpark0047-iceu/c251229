'use client';

import React from 'react';
import {
    X,
    MapPin,
    ExternalLink,
    TrendingUp,
    Layout,
    CreditCard,
    Maximize2
} from 'lucide-react';
import { AdPosition } from '../types';

interface AdPositionDetailProps {
    position: AdPosition | null;
    onClose: () => void;
}

export default function AdPositionDetail({ position, onClose }: AdPositionDetailProps) {
    if (!position) return null;

    const inventory = position.inventory;

    return (
        <div className="absolute top-6 right-6 z-30 w-80 animate-float-subtle">
            <div
                className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl backdrop-blur-2xl"
                style={{
                    background: 'var(--glass-bg)',
                }}
            >
                {/* 상단 컬러 바 */}
                <div
                    className="h-1.5 w-full"
                    style={{ background: position.markerColor }}
                />

                {/* 헤더 */}
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <div className="flex items-center gap-2.5">
                        <div
                            className="p-2 rounded-xl"
                            style={{ background: `${position.markerColor}20` }}
                        >
                            <Layout className="w-4 h-4" style={{ color: position.markerColor }} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                {position.label || position.adCode}
                            </h3>
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">상세 광고 구좌 정보</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <X className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                </div>

                {/* 본문 */}
                <div className="p-5 space-y-5">
                    {/* 가격 정보 */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                            <CreditCard className="w-3 h-3" />
                            광고 비용
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-[var(--metro-line2)]">
                                {(inventory?.priceMonthly || 0).toLocaleString()}
                            </span>
                            <span className="text-xs font-bold text-[var(--text-muted)]">원 / 월</span>
                        </div>
                    </div>

                    {/* 주요 정보 리스트 */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-lg bg-[var(--metro-line4)]/10">
                                <TrendingUp className="w-3.5 h-3.5 text-[var(--metro-line4)]" />
                            </div>
                            <div>
                                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase mb-0.5">매체 타입</p>
                                <p className="text-xs font-semibold text-[var(--text-primary)]">
                                    {inventory?.adType || '정보 없음'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-lg bg-[var(--metro-line3)]/10">
                                <Maximize2 className="w-3.5 h-3.5 text-[var(--metro-line3)]" />
                            </div>
                            <div>
                                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase mb-0.5">규격</p>
                                <p className="text-xs font-semibold text-[var(--text-primary)]">
                                    {inventory?.adSize || '표준 규격'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-lg bg-orange-500/10">
                                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase mb-0.5">상세 위치</p>
                                <p className="text-xs font-semibold text-[var(--text-primary)]">
                                    {inventory?.locationCode || position.adCode || '역내 지정 위치'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 액션 버튼 */}
                    <button
                        className="w-full group flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[var(--metro-line4)]/20"
                        style={{
                            background: 'linear-gradient(135deg, var(--metro-line4) 0%, #2563eb 100%)'
                        }}
                    >
                        제안서에 추가
                        <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}
