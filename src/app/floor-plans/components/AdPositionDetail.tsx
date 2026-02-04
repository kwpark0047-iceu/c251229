import React from 'react';
import {
    X,
    MapPin,
    ExternalLink,
    TrendingUp,
    Layout,
    CreditCard,
    Maximize2,
    Users,
    BarChart3,
    Info,
    CheckCircle2,
    Clock,
    AlertCircle
} from 'lucide-react';
import { AdPosition } from '../types';
import { AVAILABILITY_LABELS, AVAILABILITY_COLORS } from '../../lead-manager/types';

interface AdPositionDetailProps {
    position: AdPosition | null;
    onClose: () => void;
}

export default function AdPositionDetail({ position, onClose }: AdPositionDetailProps) {
    if (!position) return null;

    const inventory = position.inventory;
    const status = inventory?.availabilityStatus || 'AVAILABLE';
    const statusColor = AVAILABILITY_COLORS[status];

    return (
        <div className="absolute top-6 right-6 z-30 w-85 animate-float-subtle">
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
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    {position.label || position.adCode}
                                </h3>
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                                    {status === 'AVAILABLE' && <CheckCircle2 className="w-2.5 h-2.5" />}
                                    {status === 'RESERVED' && <Clock className="w-2.5 h-2.5" />}
                                    {status === 'OCCUPIED' && <AlertCircle className="w-2.5 h-2.5" />}
                                    {AVAILABILITY_LABELS[status]}
                                </div>
                            </div>
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
                <div className="p-5 space-y-4">
                    {/* 가격 정보 */}
                    <div className="group relative p-4 rounded-2xl bg-white/5 border border-white/5 transition-all hover:bg-white/[0.08]">
                        <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                            <CreditCard className="w-3 h-3" />
                            월 광고 비용
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-[var(--metro-line2)] tracking-tight">
                                {(inventory?.priceMonthly || 0).toLocaleString()}
                            </span>
                            <span className="text-xs font-bold text-[var(--text-muted)]">원 / 월</span>
                        </div>
                    </div>

                    {/* 상세 정보 그리드 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <TrendingUp className="w-3 h-3 text-[var(--metro-line4)]" />
                                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">타입</span>
                            </div>
                            <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">
                                {inventory?.adType || '정보 없음'}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Maximize2 className="w-3 h-3 text-[var(--metro-line3)]" />
                                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">규격</span>
                            </div>
                            <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">
                                {inventory?.adSize || '표준 규격'}
                            </p>
                        </div>
                    </div>

                    {/* 통계 정보 */}
                    <div className="space-y-3 pt-1">
                        <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-lg bg-[var(--metro-line2)]/10">
                                <BarChart3 className="w-3.5 h-3.5 text-[var(--metro-line2)]" />
                            </div>
                            <div>
                                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase mb-0.5">일일 유동인구</p>
                                <p className="text-xs font-semibold text-[var(--text-primary)]">
                                    {inventory?.trafficDaily ? `${inventory.trafficDaily.toLocaleString()} 명` : '통계 데이터 분석중'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-lg bg-purple-500/10">
                                <Users className="w-3.5 h-3.5 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase mb-0.5">주요 타겟</p>
                                <p className="text-xs font-semibold text-[var(--text-primary)]">
                                    {inventory?.demographics || '전 연령대 다양'}
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

                    {/* 상세 설명 */}
                    {inventory?.description && (
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                            <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-[var(--text-muted)] uppercase">
                                <Info className="w-3 h-3" />
                                특징 및 설명
                            </div>
                            <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                                {inventory.description}
                            </p>
                        </div>
                    )}

                    {/* 액션 버튼 */}
                    <button
                        className="w-full group mt-2 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-xs text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[var(--metro-line4)]/20"
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
