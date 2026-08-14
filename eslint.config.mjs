import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import vitest from 'eslint-plugin-vitest'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // TS-01 (MUST): any を使わない。@ts-ignore ではなく @ts-expect-error + 理由。
  // as unknown as T は禁止。上流の既定値に依存せず、ここで確定させる。
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          minimumDescriptionLength: 10,
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression > TSAsExpression',
          message: 'as unknown as T は禁止 (TS-01)。型アサーションの前に検証を入れる。',
        },
      ],
    },
  },

  // TEST-04 (MUST): test.skip / test.only をコミットしない。
  {
    files: ['**/*.test.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    ignores: ['tests/e2e/**'],
    plugins: { vitest },
    rules: {
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'error',
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // このリポジトリ固有
    'rules/**',
    'playwright-report/**',
    'test-results/**',
  ]),
])

export default eslintConfig
