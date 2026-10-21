import { defineConfig, type Plugin } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { brand, logoMarkSvg } from './src/brand.config'

/** Injects the configurable brand into index.html and emits the web app manifest and icon. */
function brandPlugin(): Plugin {
  const name = process.env.VITE_BRAND_NAME || brand.name
  const shortName = process.env.VITE_BRAND_SHORT_NAME || process.env.VITE_BRAND_NAME || brand.shortName
  // Public base path ('/' by default, './' for sub-path hosting such as GitHub Pages).
  let base = '/'
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  const manifest = () =>
    JSON.stringify({
      name,
      short_name: shortName,
      description: brand.description,
      // Relative to the manifest, so the app works from any base path.
      start_url: '.',
      scope: '.',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#F8FAFC',
      theme_color: brand.primaryColor,
      icons: [
        { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
      ],
    })
  const files: Record<string, () => string> = {
    'manifest.webmanifest': manifest,
    'icon.svg': () => (brand.logo.kind === 'builtin' ? logoMarkSvg({ size: 512 }) : ''),
    // Maskable icons need the mark inside a safe zone; the square background fills the rest.
    'icon-maskable.svg': () =>
      brand.logo.kind === 'builtin'
        ? logoMarkSvg({ size: 512 }).replace('rx="16"', 'rx="0"').replace('<rect x="14"', '<g transform="translate(6.4 6.4) scale(0.8)"><rect x="14"').replace('</svg>', '</g></svg>')
        : '',
  }
  return {
    name: 'brand',
    configResolved(config) {
      base = config.base
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = req.url?.split('?')[0].split('/').pop() ?? ''
        if (!files[file]) return next()
        res.setHeader('Content-Type', file.endsWith('.svg') ? 'image/svg+xml' : 'application/manifest+json')
        res.end(files[file]())
      })
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(files)) {
        const content = source()
        if (content) this.emitFile({ type: 'asset', fileName, source: content })
      }
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return {
          html: html
            .replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(name)}</title>`)
            // The Figma Make wrapper adds a default og:title; point it at the brand.
            .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escape(name)}">`),
          tags: [
            { tag: 'meta', attrs: { name: 'description', content: brand.description }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'theme-color', content: brand.primaryColor }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
            { tag: 'link', attrs: { rel: 'manifest', href: `${base}manifest.webmanifest` }, injectTo: 'head' },
            { tag: 'link', attrs: { rel: 'icon', href: `${base}icon.svg`, type: 'image/svg+xml' }, injectTo: 'head' },
          ],
        }
      },
    },
  }
}

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    brandPlugin(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
      // Code shared with the edge function (plan schema, validation, demo planner)
      '@shared': path.resolve(__dirname, './supabase/functions/server/shared'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
