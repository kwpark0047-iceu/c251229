/**
 * 파일명: global.antigravity.config.ts
 * 작성자: 시스템 관리자
 * 설명: 웹 애플리케이션 전역에 적용되는 '반중력(Antigravity)' 규칙 정의 파일입니다.
 * UI 요소의 부유 효과 및 개발자를 짓누르는 레거시 환경을 제어합니다.
 */

export const GlobalAntigravityRules = {
  // 1. 기본 물리 엔진 설정
  physics: {
    isEnabled: true, // 반중력 효과 켜짐
    gravityCoefficient: -5.0, // 공중부양 위로
    friction: 0.8, // 약간 느리게
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
      '.modal-popup',
      '.toast-message',
      '#loading-spinner',
      '.floating-banner'
    ],
    anchoredElements: [
      'footer',
      '.payment-btn',
      '.fixed-bottom-nav',
      '.legal-disclaimer'
    ],
  },

  // 3. 성능 최적화 (안전 장치)
  safetyProtocols: {
    maxFps: 60,
    pauseOnBackground: true,
  },

  // 4. 개발자 정신 건강 보호 규칙
  devExperience: {
    legacySupport: {
      ie11: false,
      activeX: 'blocked',
    },
    deploymentSafety: {
      blockFridayDeploys: true,
      alertMessage: "경고: 금요일 오후입니다. 지금 배포하면 주말이 사라질 수 있습니다.",
    },
    defaultTheme: 'dark', // 다크모드 강제
  },

  anomalies: [
    {
      trigger: 'konami-code',
      effect: 'invert-page',
    }
  ]
} as const;

export type AntigravityConfig = typeof GlobalAntigravityRules;
