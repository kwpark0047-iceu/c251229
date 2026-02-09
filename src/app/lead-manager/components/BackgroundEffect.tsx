import React from 'react';

/**
 * 메인 페이지 배경 효과 컴포넌트
 * 그라디언트 오브와 메트로 패턴을 포함
 */
export default function BackgroundEffect() {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden bg-gradient-overlay">
            {/* 그라디언트 오브 */}
            <div
                className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full animate-float opacity-15"
                style={{
                    background: 'radial-gradient(circle, var(--metro-line2) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                }}
            />
            <div
                className="absolute bottom-[-30%] left-[-10%] w-[800px] h-[800px] rounded-full animate-float-subtle opacity-10"
                style={{
                    background: 'radial-gradient(circle, var(--metro-line4) 0%, transparent 70%)',
                    filter: 'blur(100px)',
                    animationDelay: '-2s',
                }}
            />
            <div
                className="absolute top-[20%] left-[20%] w-[400px] h-[400px] rounded-full animate-pulse-glow opacity-5"
                style={{
                    background: 'radial-gradient(circle, var(--metro-line5) 0%, transparent 70%)',
                    filter: 'blur(120px)',
                    animationDuration: '8s',
                }}
            />

            {/* 메트로 패턴 */}
            <div
                className="absolute inset-0 bg-pattern opacity-[0.02]"
                style={{
                    backgroundImage: 'linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)',
                    backgroundSize: '60px 60px',
                }}
            />
        </div>
    );
}
