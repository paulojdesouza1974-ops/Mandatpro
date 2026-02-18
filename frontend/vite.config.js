import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error',
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '5021ae81-6a09-4a51-aa0c-4b293b13ebec.preview.emergentagent.com',
      '5021ae81-6a09-4a51-aa0c-4b293b13ebec.cluster-9.preview.emergentcf.cloud',
      '.preview.emergentagent.com',
      '.emergentcf.cloud'
    ]
  },
  plugins: [
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      visualEditAgent: true
    }),
    react(),
  ]
});
