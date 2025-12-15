import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CustomizePDFViewer',
      fileName: (format) => `viewer.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['@customize-pdf/core', '@customize-pdf/canvas-zoom', '@customize-pdf/canvas-annotations', 'pdfjs-dist', 'pdf-lib'],
      output: {
        globals: {
          '@customize-pdf/core': 'CustomizePDFCore',
          '@customize-pdf/canvas-zoom': 'CustomizePDFZoom',
          '@customize-pdf/canvas-annotations': 'CustomizePDFAnnotations',
          'pdfjs-dist': 'pdfjsLib',
          'pdf-lib': 'PDFLib'
        }
      }
    },
    sourcemap: true,
    minify: 'esbuild'
  }
});
