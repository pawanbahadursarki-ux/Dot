import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

const CRITICAL_GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;700;800&family=Figtree:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';

function preloadCriticalFontsPlugin(): Plugin {
  return {
    name: 'dot-preload-critical-fonts',
    transformIndexHtml(html, ctx) {
      const preloadTags: Array<{
        tag: string;
        attrs: Record<string, string | boolean>;
        injectTo: 'head-prepend';
      }> = [];

      // Preload bundled local woff2 fonts if emitted during Vite build
      if (ctx?.bundle) {
        for (const fileName of Object.keys(ctx.bundle)) {
          if (fileName.endsWith('.woff2')) {
            preloadTags.push({
              tag: 'link',
              attrs: {
                rel: 'preload',
                as: 'font',
                type: 'font/woff2',
                href: `./${fileName.replace(/^\//, '')}`,
                crossorigin: true,
              },
              injectTo: 'head-prepend',
            });
          }
        }
      }

      // Ensure critical font stylesheet preload exists if not already present in index.html
      if (!html.includes('rel="preload" as="style"')) {
        preloadTags.push({
          tag: 'link',
          attrs: {
            rel: 'preload',
            as: 'style',
            href: CRITICAL_GOOGLE_FONTS_URL,
            crossorigin: true,
          },
          injectTo: 'head-prepend',
        });
      }

      return preloadTags.length > 0 ? {html, tags: preloadTags} : html;
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), preloadCriticalFontsPlugin()],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      assetsInlineLimit: 4096,
      chunkSizeWarningLimit: 800,
      modulePreload: {
        polyfill: false,
        resolveDependencies: (_filename, deps) =>
          deps.filter(
            (dep) =>
              !dep.includes('charts') &&
              !dep.includes('ocr-vendor') &&
              !dep.includes('confetti') &&
              !dep.includes('AdminPanel') &&
              !dep.includes('CompanyView') &&
              !dep.includes('ConsumerView')
          ),
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/node_modules/firebase/') || id.includes('/node_modules/@firebase/')) {
              return 'firebase-vendor';
            }
            if (id.includes('/node_modules/tesseract.js')) return 'ocr-vendor';
            if (id.includes('/node_modules/lucide-react/')) return 'icons-vendor';
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
