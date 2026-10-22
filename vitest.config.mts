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
            thresholds: {
                branches: 80,
                functions: 80,
                lines: 80,
                statements: 80,
            },
        },
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
});
