'use client';

/**
 * 모바일 하단 네비게이션 바
 * 모바일 환경에서 주요 탭으로 빠르게 이동할 수 있는 고정 탭 바
 */

import React from 'react';
import { Users, Package, Calendar, Map, Settings } from 'lucide-react';

type MainTab = 'leads' | 'inventory' | 'schedule';

interface MobileNavBarProps {
    activeTab: MainTab | 'map' | 'settings';
    onTabChange: (tab: MainTab) => void;
    onViewModeChange?: (mode: 'map' | 'list') => void;
    onSettingsClick: () => void;
    className?: string;
}

export default function MobileNavBar({
    activeTab,
    onTabChange,
    onViewModeChange,
    onSettingsClick,
    className = ''
}: MobileNavBarProps) {
    return (
        <div
            className={`md:hidden fixed bottom-0 left-0 right-0 z-50 px-6 py-2 border-t backdrop-blur-xl ${className}`}
            style={{
                background: 'var(--glass-bg)',
                borderColor: 'var(--border-subtle)',
                paddingBottom: 'calc(8px + env(safe-area-inset-bottom))'
            }}
        >
            <div className="relative flex items-center justify-between max-w-sm mx-auto">
                {/* 슬라이딩 인디케이터 */}
                <div
                    className="absolute h-full rounded-xl bg-[var(--bg-tertiary)] -z-10 transition-all duration-300 ease-out sm:hidden"
                    style={{
                        width: 'calc(100% / 5)',
                        left: activeTab === 'leads' ? '0%' :
                            activeTab === 'inventory' ? '20%' :
                                activeTab === 'map' ? '40%' :
                                    activeTab === 'schedule' ? '60%' : '80%'
                    }}
                />
                <NavButton
                    icon={Users}
                    label="리드"
                    isActive={activeTab === 'leads'}
                    onClick={() => onTabChange('leads')}
                />
                <NavButton
                    icon={Package}
                    label="인벤토리"
                    isActive={activeTab === 'inventory'}
                    onClick={() => onTabChange('inventory')}
                />
                {/* 중앙 강조 버튼 (지도) */}
                <button
                    onClick={() => onViewModeChange?.('map')}
                    title="지도 보기"
                    className="relative -top-6 p-4 rounded-full shadow-lg transition-all duration-500 hover:scale-110 active:scale-95 group animate-float"
                    style={{
                        background: 'linear-gradient(135deg, var(--metro-line2) 0%, var(--metro-line4) 100%)',
                        boxShadow: activeTab === 'map' ? 'var(--glow-green)' : '0 8px 25px rgba(60, 181, 74, 0.4)'
                    }}
                >
                    <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity blur-md" />
                    <Map className={`w-6 h-6 text-white relative z-10 ${activeTab === 'map' ? 'scale-110' : ''} transition-transform`} />
                </button>
                <NavButton
                    icon={Calendar}
                    label="스케줄"
                    isActive={activeTab === 'schedule'}
                    onClick={() => onTabChange('schedule')}
                />
                <NavButton
                    icon={Settings}
                    label="설정"
                    isActive={activeTab === 'settings'}
                    onClick={onSettingsClick}
                />
            </div>
        </div>
    );
}

function NavButton({
    icon: Icon,
    label,
    isActive,
    onClick
}: {
    icon: React.ElementType,
    label: string,
    isActive: boolean,
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            title={label}
            className={`relative flex flex-col items-center gap-1 p-2 transition-all duration-300 ${isActive ? 'text-[var(--metro-line4)] scale-110' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:scale-105'
                }`}
        >
            <div className={`transition-all duration-500 ${isActive ? 'drop-shadow-[0_0_8px_var(--metro-line4)]' : ''}`}>
                <Icon className={`w-6 h-6 ${isActive ? 'fill-current opacity-20' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-bold transition-all ${isActive ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
            {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-[var(--metro-line4)] shadow-[0_0_8px_var(--metro-line4)]" />
            )}
        </button>
    );
}
