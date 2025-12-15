import { defineConfig } from 'vite';
import { resolve } from 'path';

export const createBaseConfig = (packageName: string, entry: string) => {
  return defineConfig({
    build: {
      lib: {
        entry: resolve(__dirname, entry),
        name: packageName,
        fileName: (format) => `${packageName}.${format}.js`,
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
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src')
      }
    }
  });
};
