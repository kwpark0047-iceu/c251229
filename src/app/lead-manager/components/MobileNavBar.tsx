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
}

export default function MobileNavBar({
    activeTab,
    onTabChange,
    onViewModeChange,
    onSettingsClick
}: MobileNavBarProps) {
    return (
        <div
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-6 py-2 border-t backdrop-blur-xl"
            style={{
                background: 'rgba(255, 255, 255, 0.85)',
                borderColor: 'var(--border-subtle)',
                paddingBottom: 'calc(8px + env(safe-area-inset-bottom))'
            }}
        >
            <div className="flex items-center justify-between max-w-sm mx-auto">
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
                    className="relative -top-5 p-4 rounded-full shadow-lg transition-transform active:scale-95"
                    style={{
                        background: 'linear-gradient(135deg, var(--metro-line2) 0%, var(--metro-line4) 100%)',
                        boxShadow: '0 4px 15px rgba(60, 181, 74, 0.4)'
                    }}
                >
                    <Map className="w-6 h-6 text-white" />
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
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive ? 'text-[var(--metro-line2)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
        >
            <Icon className={`w-6 h-6 ${isActive ? 'fill-current opacity-20' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    );
}
