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
                className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-effect-green"
                style={{
                    background: 'radial-gradient(circle, var(--metro-line2) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                }}
            />
            <div
                className="absolute bottom-[-30%] left-[-10%] w-[800px] h-[800px] rounded-full bg-effect-blue"
                style={{
                    background: 'radial-gradient(circle, var(--metro-line4) 0%, transparent 70%)',
                    filter: 'blur(100px)',
                }}
            />

            {/* 메트로 패턴 */}
            <div
                className="absolute inset-0 bg-pattern"
                style={{
                    backgroundImage: `
              linear-gradient(var(--border-subtle) 1px, transparent 1px),
              linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)
            `,
                    backgroundSize: '60px 60px',
                }}
            />
        </div>
    );
}
