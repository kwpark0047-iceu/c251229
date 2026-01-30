'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Zap, X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
    id: string;
    type: NotificationType;
    message: string;
}

interface NotificationContextType {
    showNotification: (type: NotificationType, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const showNotification = useCallback((type: NotificationType, message: string) => {
        const id = Math.random().toString(36).substring(2, 9);
        setNotifications((prev) => [...prev, { id, type, message }]);

        // 5초 후 자동 삭제
        setTimeout(() => {
            removeNotification(id);
        }, 5000);
    }, [removeNotification]);

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}

            {/* 알림 렌더링 영역 */}
            <div className="fixed top-24 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {notifications.map((n) => (
                    <div
                        key={n.id}
                        className="pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl animate-float border min-w-[320px] max-w-[450px]"
                        style={{
                            background: n.type === 'success'
                                ? 'linear-gradient(135deg, rgba(60, 181, 74, 0.95) 0%, rgba(60, 181, 74, 0.8) 100%)'
                                : n.type === 'error'
                                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(239, 68, 68, 0.8) 100%)'
                                    : 'linear-gradient(135deg, rgba(50, 164, 206, 0.95) 0%, rgba(50, 164, 206, 0.8) 100%)',
                            backdropFilter: 'blur(12px)',
                            borderColor: n.type === 'success' ? 'var(--metro-line2)' : n.type === 'error' ? '#ef4444' : 'var(--metro-line4)',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                        }}
                    >
                        <div className="flex-shrink-0">
                            {n.type === 'success' && <CheckCircle className="w-5 h-5 text-white" />}
                            {n.type === 'error' && <AlertCircle className="w-5 h-5 text-white" />}
                            {n.type === 'info' && <Zap className="w-5 h-5 text-white" />}
                        </div>

                        <div className="flex-1">
                            <p className="text-white font-bold tracking-tight text-sm">{n.message}</p>
                        </div>

                        <button
                            onClick={() => removeNotification(n.id)}
                            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4 text-white/70" />
                        </button>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}
