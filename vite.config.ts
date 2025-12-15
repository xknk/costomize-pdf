import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@customize-pdf/viewer': resolve(__dirname, 'packages/viewer/src'),
      '@customize-pdf/vue': resolve(__dirname, 'packages/vue-integration/src')
    }
  },
  server: {
    port: 8080,
    open: true
  },
  build: {
    outDir: 'dist-app'
  }
});
