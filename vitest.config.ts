import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',

    // Match test files in tests/ or any __tests__/ directory
    include: ['**/tests/**/*.test.ts', '**/__tests__/**/*.test.ts'],

    // Coverage — used with: npm run test:coverage
    // Requires @vitest/coverage-v8 devDependency
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
    },
  },
})
