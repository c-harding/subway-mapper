import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, PluginOption } from 'vite';

import { joinPathSegments } from './src/util/path';

declare module 'vite/types/customEvent.d.ts' {
  interface CustomEventMap {
    'reload-public-assets:asset': { path: string };
  }
}

function reloadPublicAssets(): PluginOption {
  return {
    name: 'reload-public-assets',
    handleHotUpdate({ file, server }) {
      const publicDir = server.config.publicDir.replace(/\/?$/, '');
      if (file.endsWith('.json') && file.startsWith(publicDir + '/')) {
        const absolutePath = joinPathSegments(server.config.base, file.slice(publicDir.length));
        server.ws.send('reload-public-assets:asset', { path: absolutePath });
        return [];
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE,
  plugins: [vue(), reloadPublicAssets()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5200,
  },
});
