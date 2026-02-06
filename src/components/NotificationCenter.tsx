'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Zap, Trash2, Check, Clock } from 'lucide-react';
import { useNotification, Notification } from '@/context/NotificationContext';

export default function NotificationCenter() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotification();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 외부 클릭 시 닫기
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return '방금 전';
        if (minutes < 60) return `${minutes}분 전`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}시간 전`;
        return new Date(date).toLocaleDateString();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* 알림 벨 아이콘 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-lg transition-all relative ${isOpen ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                    }`}
                title="알림 센터"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[var(--bg-primary)] animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* 드롭다운 패널 */}
            {isOpen && (
                <div
                    className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-[var(--glass-border)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300 shadow-2xl toast-notification"
                    style={{
                        background: 'var(--glass-bg)',
                        backdropFilter: 'blur(24px)',
                    }}
                >
                    {/* 헤더 */}
                    <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-white/5">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">알림</h3>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-[var(--metro-line2)]/20 text-[var(--metro-line2)] text-[10px] font-bold">
                                    NEW {unreadCount}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {notifications.length > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="p-1.5 hover:bg-white/10 rounded-lg text-[var(--text-muted)] hover:text-[var(--metro-line2)] transition-colors"
                                    title="모두 읽음"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={clearAll}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-[var(--text-muted)] hover:text-red-400 transition-colors"
                                title="전체 삭제"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* 알림 목록 */}
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? (
                            <div className="divide-y divide-[var(--border-subtle)]/30">
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => markAsRead(n.id)}
                                        className={`px-5 py-4 flex gap-4 transition-colors cursor-pointer group ${n.isRead ? 'opacity-60 grayscale-[0.5]' : 'bg-white/5'
                                            } hover:bg-white/10`}
                                    >
                                        <div className="flex-shrink-0 mt-1">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
                                                background: n.type === 'success' ? 'rgba(60, 181, 74, 0.15)' :
                                                    n.type === 'error' ? 'rgba(239, 68, 68, 0.15)' :
                                                        'rgba(50, 164, 206, 0.15)'
                                            }}>
                                                {n.type === 'success' && <CheckCircle className="w-4 h-4 text-[var(--metro-line2)]" />}
                                                {n.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                                                {n.type === 'info' && <Zap className="w-4 h-4 text-[var(--metro-line4)]" />}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm leading-snug break-words ${n.isRead ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)] font-medium'}`}>
                                                {n.message}
                                            </p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatTime(n.timestamp)}
                                                </span>
                                                {!n.isRead && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--metro-line2)]" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                                <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-4">
                                    <Bell className="w-8 h-8 text-[var(--text-muted)] opacity-20" />
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] font-medium">새로운 알림이 없습니다</p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">업무 관련 소식이 여기에 표시됩니다</p>
                            </div>
                        )}
                    </div>

                    {/* 하단 푸터 */}
                    <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-white/5">
                        <button className="w-full text-center text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-secondary)] uppercase tracking-widest transition-colors">
                            VIEW ALL ACTIVITY
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
