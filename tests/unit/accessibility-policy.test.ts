// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

describe('접근성 경고 재발 방지', () => {
  it('남은 화면을 검사 규칙 완화 없이 통과한다', async () => {
    const results = await new ESLint().lintFiles([
      'src/app/contact/page.tsx', 'src/app/floor-plans/components/*.tsx',
      'src/app/lead-manager/components/**/*.tsx', 'src/app/lead-manager/page.tsx',
      'src/app/shared/OptimizedImage.tsx', 'src/app/shared/responsive.tsx',
      'src/components/AiRecommendWidget.tsx', 'src/components/NotificationCenter.tsx',
    ]);
    expect(results.flatMap(file => file.messages.map(message => ({
      file: file.filePath, rule: message.ruleId, message: message.message,
    })))).toEqual([]);
  }, 60000);
});
