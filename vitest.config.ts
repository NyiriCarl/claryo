import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: [
      // The edge function imports Deno-style `npm:pkg@version/sub`; map to node_modules.
      { find: /^npm:((?:@[^/@]+\/)?[^/@]+)(?:@[^/]+)?(\/.*)?$/, replacement: '$1$2' },
      { find: '@shared', replacement: path.resolve(__dirname, './supabase/functions/server/shared') },
    ],
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})
