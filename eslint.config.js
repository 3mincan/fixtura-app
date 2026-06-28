// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/**',
      'ios/**',
      'android/**',
      'node_modules/**',
      'scripts/**',
      'src/i18n/catalog.generated.ts',
    ],
  },
  {
    rules: {
      // Reanimated shared values and imperative native module handles are valid mutation targets.
      'react-hooks/immutability': 'off',
      // Syncing local form state when a match id changes is intentional in these screens.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-redeclare': 'off',
    },
  },
  {
    files: ['src/ads/native-ads.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
