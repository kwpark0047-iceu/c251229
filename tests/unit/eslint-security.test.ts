// @vitest-environment node
import { readFileSync } from 'node:fs';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const baseline = JSON.parse(readFileSync(new URL('../fixtures/eslint-policy-baseline.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'));

describe('ESLint 보안 의존 경로 제거와 검사 정책 보존', () => {
  it('격리 관리자 빌드 출력은 검사하지 않고 소스는 계속 검사한다', async () => {
    const eslint = new ESLint();
    expect(await eslint.isPathIgnored('.next-admin-isolated/dev/server/chunks/runtime.js')).toBe(true);
    expect(await eslint.isPathIgnored('src/app/lead-manager/components/ProposalsView.tsx')).toBe(false);
  }, 60000);
  it('사용하지 않는 Next 린트와 취약 glob 의존 경로를 제거한다', () => {
    for (const name of ['eslint-config-next', '@next/eslint-plugin-next', 'fast-glob', 'micromatch', 'braces']) {
      expect(Object.keys(lock.packages).filter(path => path.endsWith(`/node_modules/${name}`) || path === `node_modules/${name}`), name).toEqual([]);
    }
  });

  it('실제로 사용하는 검사 플러그인을 같은 버전의 직접 의존성으로 선언한다', () => {
    for (const [name, version] of Object.entries({
      '@typescript-eslint/parser': '8.67.0',
      '@typescript-eslint/eslint-plugin': '8.67.0',
      'eslint-plugin-react': '7.37.5',
      'eslint-plugin-react-hooks': '7.1.1',
      'eslint-plugin-jsx-a11y': '6.10.2',
    })) expect(manifest.devDependencies[name], name).toBe(version);
  });

  it.each(Object.entries(baseline))('%s의 기존 검사 규칙·파서·설정을 보존한다', async (file, expected) => {
    const config = await new ESLint().calculateConfigForFile(file);
    expect(config).toBeDefined();
    expect({
      rules: config.rules,
      settings: config.settings,
      ecmaVersion: config.languageOptions.ecmaVersion,
      sourceType: config.languageOptions.sourceType,
      parserOptions: config.languageOptions.parserOptions,
      parser: config.languageOptions.parser.meta,
      activePlugins: Object.keys(config.plugins).filter(name => !['next', '@next/next'].includes(name)).sort(),
    }).toEqual(expected);
  });

  it('조건부 Hook 호출과 필수 접근성 속성 누락을 계속 탐지한다', async () => {
    const [result] = await new ESLint().lintText(
      "import { useState } from 'react'; export default function Example({ flag }: { flag: boolean }) { if (flag) useState(0); return <div role=\"checkbox\" />; }",
      { filePath: 'src/lint-security-fixture.tsx' },
    );
    expect(result.messages.map(message => message.ruleId)).toEqual(expect.arrayContaining([
      'react-hooks/rules-of-hooks', 'jsx-a11y/role-has-required-aria-props',
    ]));
  });

  it('정상 React 컴포넌트는 오류 없이 검사한다', async () => {
    const [result] = await new ESLint().lintText(
      "import { useState } from 'react'; export default function Example() { const [value] = useState(0); return <button type=\"button\">{value}</button>; }",
      { filePath: 'src/lint-security-fixture.tsx' },
    );
    expect(result.messages).toEqual([]);
  });
});
