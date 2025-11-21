import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
  },
  {
    rules: {
      '@next/next/no-css-tags': 'off',
      '@next/next/no-html-link-for-pages': 'off',
      '@next/next/no-img-element': 'off',
      '@next/next/no-sync-scripts': 'off',
      '@next/next/no-css-inline': 'off', // Desabilitar erro de CSS inline
    },
  },
];

export default eslintConfig;
