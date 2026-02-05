/**
 * global.antigravity.config.ts
 * Ver 2.0.5 (K-Dev Edition) - 시스템 전역 반중력 규칙 설정
 * Last Deploy: 2026-02-04
 */

export const GlobalAntigravityRules = {
    // 1. 물리 엔진 및 UI 설정
    physics: {
        isEnabled: true,
        gravityCoefficient: -5.0, // 부드러운 부유를 위해 -5.0으로 조정
        animation: {
            type: 'css-keyframes',
            duration: '3s',
            timingFunction: 'ease-in-out',
            infinite: true,
        },
        mobileOptimization: {
            reduceParticles: true,
            disableOnLowPowerMode: true,
        },
    },

    // 2. 적용 대상 (DOM 선택자)
    targets: {
        floatElements: [
            '.glass-card',
            '.modal-popup',
            '.toast-notification',
            '.task-card',
            '.calendar-event',
            '#loading-spinner',
        ],
        anchoredElements: [
            'footer',
            '.payment-button',
            '.legal-disclaimer',
            '.fixed-bottom-nav',
        ],
    },

    // 3. 개발자 보호 규칙
    devExperience: {
        legacySupport: {
            ie11: false,
            activeX: 'blocked',
        },
        deploymentSafety: {
            blockFridayDeploys: true,
            timezone: 'Asia/Seoul',
            alertMessage: '⚠️ 경고: 주말이라는 블랙홀에 빨려 들어갈 수 있습니다. 배포하시겠습니까?',
        },
        defaultTheme: 'dark',
    },

    // 4. 이스터 에그
    anomalies: [
        {
            trigger: 'konami-code',
            effect: 'invert-page',
        }
    ]
} as const;

export type AntigravityConfig = typeof GlobalAntigravityRules;

/**
 * 금요일 배포 여부 체크 유틸리티
 */
export const isDeploymentRiskTime = () => {
    const now = new Date();
    const day = now.getDay(); // 0(일) ~ 6(토)
    const hour = now.getHours();

    // 금요일(5) 오후 5시(17) 이후 체크
    return day === 5 && hour >= 17;
};
