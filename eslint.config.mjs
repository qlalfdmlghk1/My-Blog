import { FlatCompat } from '@eslint/eslintrc';

/**
 * Next 15.5 부터 `next lint` 가 deprecated 라 ESLint CLI 를 직접 쓴다.
 * eslint-config-next 는 아직 eslintrc 형식이라 FlatCompat 으로 감싼다.
 */
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'next-env.d.ts'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // 설정 파일은 익명 default export 가 관례다 (오탐)
    files: ['*.config.mjs', '*.config.ts'],
    rules: { 'import/no-anonymous-default-export': 'off' },
  },
  {
    rules: {
      // CLAUDE.md: 명시적 any 금지
      '@typescript-eslint/no-explicit-any': 'error',
      // 미사용 변수는 _ prefix 로만 의도적 무시 허용
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
