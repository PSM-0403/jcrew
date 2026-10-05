import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'J-CREW 농구교실',
        short_name: 'J-CREW',
        description: '제이크루 농구교실 관리 시스템',
        theme_color: '#0F1729',
        background_color: '#0F1729',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    // /api/*(로그인, AI 챗봇)는 Vercel 서버 함수라 `vite` 개발 서버에는 없다.
    // 로컬 개발 중에는 배포된 사이트의 서버 함수로 넘긴다 (같은 Supabase DB 사용).
    proxy: {
      '/api': { target: 'https://jcrewbasketball.vercel.app', changeOrigin: true },
    },
  },
})
