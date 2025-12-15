import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CustomizePDFCore',
      fileName: (format) => `core.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['pdfjs-dist', 'pdf-lib'],
      output: {
        globals: {
          'pdfjs-dist': 'pdfjsLib',
          'pdf-lib': 'PDFLib'
        }
      }
    },
    sourcemap: true,
    minify: 'esbuild'
  }
});
