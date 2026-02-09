import React from 'react';
import './BackgroundEffect.css';

/**
 * 메인 페이지 배경 효과 컴포넌트
 * 그라디언트 오브와 메트로 패턴을 포함
 */
export default function BackgroundEffect() {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden bg-gradient-overlay">
            {/* 그라디언트 오브 */}
            <div
                className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full animate-float opacity-15 bg-orb-green"
            />
            <div
                className="absolute bottom-[-30%] left-[-10%] w-[800px] h-[800px] rounded-full animate-float-subtle opacity-10 bg-orb-blue"
                style={{ animationDelay: '-2s' }}
            />
            <div
                className="absolute top-[20%] left-[20%] w-[400px] h-[400px] rounded-full animate-pulse-glow opacity-5 bg-orb-purple"
                style={{ animationDuration: '8s' }}
            />

            {/* 메트로 패턴 */}
            <div
                className="absolute inset-0 bg-pattern opacity-[0.02] bg-metro-pattern"
            />
        </div>
    );
}
