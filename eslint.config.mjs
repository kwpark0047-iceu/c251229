import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".next-e2e/**",
      ".next-admin-isolated/**",
      "node_modules/**",
      "scripts/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      ".omo/**",
      ".codegraph/**",
      ".playwright-mcp/**",
      "tmp/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
      "@typescript-eslint": tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "off",
      // 현재 코드베이스는 동적 스타일을 광범위하게 사용하므로 금지 대신 경고로 완화
      "react/forbid-dom-props": "off",
      // 레거시 UI에서 div 클릭 패턴이 많아 단계적 개선을 위해 경고로 완화
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      "react/prop-types": "off",
      "react/no-unknown-property": ["error", { "ignore": ["jsx", "global"] }],
      "react/react-in-jsx-scope": "off", // Next.js doesn't need it
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/role-supports-aria-props": "error",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];

export default eslintConfig;
