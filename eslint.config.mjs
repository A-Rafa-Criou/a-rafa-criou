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
    files: [
      'src/emails/**/*.tsx',
      'src/components/ui/rich-text-editor.tsx',
      'src/components/**/*.tsx',
      'src/app/**/*.tsx',
    ],
    rules: {
      '@next/next/no-img-element': 'off',
      'react/no-unknown-property': 'off',
    },
  },
  {
    rules: {
      '@next/next/no-css-tags': 'off',
      '@next/next/no-html-link-for-pages': 'off',
      '@next/next/no-img-element': 'off',
      '@next/next/no-sync-scripts': 'off',
      '@next/next/no-css-inline': 'off',
      '@next/next/inline-script-id': 'off',
      'react/no-unknown-property': ['error', { ignore: ['style'] }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];

export default eslintConfig;
