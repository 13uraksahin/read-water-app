// =============================================================================
// Nuxt Configuration - Read Water Frontend
// =============================================================================

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // App configuration
  app: {
    head: {
      title: 'Read Water',
      titleTemplate: '%s | Read Water',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Remote Water Meter Reading Platform' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        // Leaflet CSS
        { rel: 'stylesheet', href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' },
      ],
    },
  },

  // Modules
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    '@vueuse/nuxt',
    '@nuxtjs/i18n',
  ],

  // I18n configuration
  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'tr', name: 'Türkçe', file: 'tr.json' },
      { code: 'fr', name: 'Français', file: 'fr.json' },
    ],
    defaultLocale: 'en',
    langDir: 'locales',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
    },
  },

  // Pinia configuration
  pinia: {
    storesDirs: ['./stores/**'],
  },

  // Tailwind configuration
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts',
  },

  // Color mode configuration
  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'dark',
  },

  // Runtime configuration (uses NUXT_ prefixed env vars automatically)
  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:4000',
      socketUrl: 'http://localhost:4000',
      // Cloudflare tunnel URLs (for production/testing)
      tunnelApiUrl: 'https://read-water-api.portall.com.tr',
      tunnelAppUrl: 'https://read-water-app.portall.com.tr',
      // Flag to determine if running through tunnel
      useTunnel: false,
    },
  },

  // Development server proxy
  nitro: {
    devProxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: true,
      },
    },
  },

  // TypeScript configuration
  typescript: {
    strict: true,
    typeCheck: false,
  },

  // CSS
  css: ['~/assets/css/main.css'],

  // Build configuration
  build: {
    transpile: ['vue3-apexcharts'],
  },

  // Vite configuration
  vite: {
    optimizeDeps: {
      include: ['apexcharts', 'vue3-apexcharts'],
    },
    server: {
      allowedHosts: [
        'read-water-app.portall.com.tr',
        'read-water-api.portall.com.tr',
        'localhost',
        '.portall.com.tr', // Allow all subdomains
      ],
      // HMR Configuration: Auto-detect based on page URL
      // This allows BOTH localhost and tunnel access to work simultaneously:
      // - localhost:3000 -> ws://localhost:3000/_nuxt/
      // - tunnel.com:443 -> wss://tunnel.com:443/_nuxt/
      hmr: {
        // Don't set protocol - auto-detect from page (http->ws, https->wss)
        // Don't set host - auto-detect from page hostname
        // Don't set clientPort - auto-detect from page port (defaults to protocol default)
        overlay: true,
      },
    },
  },

  // Dev server configuration
  devServer: {
    host: '0.0.0.0', // Listen on all network interfaces
  },
})
