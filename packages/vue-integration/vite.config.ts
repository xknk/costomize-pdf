import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CustomizePDFVue',
      fileName: (format) => `vue.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['vue', '@customize-pdf/viewer'],
      output: {
        globals: {
          'vue': 'Vue',
          '@customize-pdf/viewer': 'CustomizePDFViewer'
        }
      }
    },
    sourcemap: true,
    minify: 'esbuild'
  }
});
