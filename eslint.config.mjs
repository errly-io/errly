import nx from '@nx/eslint-plugin';
import { includeIgnoreFile } from '@eslint/compat';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, '.gitignore');

export default [
  includeIgnoreFile(gitignorePath),
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],

  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@nx/enforce-module-boundaries': 'off',
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
    ],
    // Override or add rules here
    rules: {},
  },
];
