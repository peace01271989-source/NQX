import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.GITHUB_PAGES === 'true' ? '/NQX/' : '/';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'nqx-field-bg.webp'],
      manifest: {
        name: 'NQX',
        short_name: 'NQX',
        description: 'NQX — ABERRANT相互観測PWA',
        theme_color: '#050608',
        background_color: '#050608',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,webp,svg,woff2}'] }
    })
  ]
});
