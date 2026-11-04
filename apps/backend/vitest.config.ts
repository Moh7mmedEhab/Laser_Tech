import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // Neon test branch + cold compute can be slow; generous timeouts beat flakes.
    testTimeout: 90_000,
    hookTimeout: 90_000,
    // Files run one after another; per-file module isolation keeps the
    // in-memory rate limiters independent between suites.
    sequence: { concurrent: false },
  },
})
