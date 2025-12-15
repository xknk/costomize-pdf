import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CustomizePDFAnnotations',
      fileName: (format) => `canvas-annotations.${format}.js`,
      formats: ['es', 'umd']
    },
    sourcemap: true,
    minify: 'esbuild'
  }
});
