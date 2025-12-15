/**
 * @customize-pdf/vue
 *
 * Vue 3 集成层
 */

export { usePDFViewer } from './composables/usePDFViewer';
export type { UsePDFViewerOptions, UsePDFViewerReturn } from './composables/usePDFViewer';

// 重新导出viewer类型
export type { PDFViewerConfig, PDFPageInfo } from '@customize-pdf/viewer';
