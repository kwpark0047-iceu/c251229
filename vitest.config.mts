import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        testTimeout: 30000, // increase timeout for long-running tests (crm-service 20s 초과 병행 케이스 대응)
        setupFiles: './vitest.setup.ts',
        exclude: [
            'scripts/**', // 로컬 도구는 별도 node:test 작업에서 검증합니다.
            '**/.next/**',
            '**/.next-e2e/**',
            '**/.omo/**',
            '**/tmp/**',
            '**/coverage/**',
            '**/node_modules/**',
            '**/dist/**',
            '**/cypress/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
            'tests/**/*.spec.ts',
            'tests/e2e/**/*.spec.ts',
            '**/*.tmp.test.ts',
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/test/',
                '**/*.d.ts',
                '**/*.config.*',
                '**/coverage/**',
                'tests/**/*.spec.ts',
            ],
            include: [
                'src/**/*.{ts,tsx}',
            ],
            // 현재 실측(구문 28%, 분기 28%, 함수 24%, 라인 28%) 바로 아래로 설정하고 단계적으로 상향한다.
            // 목표 80%까지 올리는 작업은 별도 테스트 보강 과제로 추적한다.
            thresholds: {
                branches: 25,
                functions: 22,
                lines: 26,
                statements: 26,
            },
        },
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
});
