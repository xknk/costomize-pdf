/**
 * Vue 3 Composable for PDFViewer
 */

import { ref, onUnmounted, type Ref } from 'vue';
import { PDFViewer, type PDFViewerConfig } from '@customize-pdf/viewer';

export interface UsePDFViewerOptions extends Omit<PDFViewerConfig, 'container'> {
  autoLoad?: boolean;
}

export interface UsePDFViewerReturn {
  viewer: Ref<PDFViewer | null>;
  isLoaded: Ref<boolean>;
  currentPage: Ref<number>;
  totalPages: Ref<number>;
  scale: Ref<number>;

  init: (container: HTMLElement) => Promise<void>;
  load: (url: string) => Promise<void>;
  loadData: (data: Uint8Array) => Promise<void>;

  // 缩放方法
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (scale: number) => void;
  fitWidth: () => void;
  fitPage: () => void;
  resetZoom: () => void;

  // 批注方法
  activateTool: (toolName: string, config?: any) => void;
  deactivateTool: () => void;
  getAnnotations: () => any[];
  exportAnnotations: (options?: any) => string;
  importAnnotations: (data: string | object, options?: any) => void;
  undo: () => void;
  redo: () => void;

  destroy: () => void;
}

export function usePDFViewer(options: UsePDFViewerOptions = {}): UsePDFViewerReturn {
  const viewer = ref<PDFViewer | null>(null);
  const isLoaded = ref(false);
  const currentPage = ref(1);
  const totalPages = ref(0);
  const scale = ref(options.scale || 1.0);

  /**
   * 初始化查看器
   */
  const init = async (container: HTMLElement): Promise<void> => {
    if (viewer.value) {
      viewer.value.destroy();
    }

    viewer.value = new PDFViewer({
      container,
      ...options
    });

    if (options.autoLoad && (options.url || options.data)) {
      await load(options.url!);
    }
  };

  /**
   * 加载PDF文档（URL）
   */
  const load = async (url: string): Promise<void> => {
    if (!viewer.value) {
      throw new Error('usePDFViewer: 查看器未初始化，请先调用init()');
    }

    await viewer.value.loadDocument(url);
    isLoaded.value = true;
    totalPages.value = viewer.value.getTotalPages();
    scale.value = viewer.value.getCurrentScale();
  };

  /**
   * 加载PDF文档（数据）
   */
  const loadData = async (data: Uint8Array): Promise<void> => {
    if (!viewer.value) {
      throw new Error('usePDFViewer: 查看器未初始化，请先调用init()');
    }

    await viewer.value.loadDocument(undefined, data);
    isLoaded.value = true;
    totalPages.value = viewer.value.getTotalPages();
    scale.value = viewer.value.getCurrentScale();
  };

  /**
   * 缩放方法
   */
  const zoomIn = (): void => {
    viewer.value?.zoomIn();
    scale.value = viewer.value?.getCurrentScale() || scale.value;
  };

  const zoomOut = (): void => {
    viewer.value?.zoomOut();
    scale.value = viewer.value?.getCurrentScale() || scale.value;
  };

  const zoomTo = (newScale: number): void => {
    viewer.value?.zoomTo(newScale);
    scale.value = newScale;
  };

  const fitWidth = (): void => {
    viewer.value?.fitWidth();
    scale.value = viewer.value?.getCurrentScale() || scale.value;
  };

  const fitPage = (): void => {
    viewer.value?.fitPage();
    scale.value = viewer.value?.getCurrentScale() || scale.value;
  };

  const resetZoom = (): void => {
    viewer.value?.resetZoom();
    scale.value = viewer.value?.getCurrentScale() || scale.value;
  };

  /**
   * 批注方法
   */
  const activateTool = (toolName: string, config?: any): void => {
    viewer.value?.activateTool(toolName, config);
  };

  const deactivateTool = (): void => {
    viewer.value?.deactivateTool();
  };

  const getAnnotations = (): any[] => {
    return viewer.value?.getAnnotations() || [];
  };

  const exportAnnotations = (exportOptions?: any): string => {
    return viewer.value?.exportAnnotations(exportOptions) || '{}';
  };

  const importAnnotations = (data: string | object, importOptions?: any): void => {
    viewer.value?.importAnnotations(data, importOptions);
  };

  const undo = (): void => {
    viewer.value?.undo();
  };

  const redo = (): void => {
    viewer.value?.redo();
  };

  /**
   * 销毁查看器
   */
  const destroy = (): void => {
    if (viewer.value) {
      viewer.value.destroy();
      viewer.value = null;
      isLoaded.value = false;
      currentPage.value = 1;
      totalPages.value = 0;
    }
  };

  // 组件卸载时自动清理
  onUnmounted(() => {
    destroy();
  });

  return {
    viewer,
    isLoaded,
    currentPage,
    totalPages,
    scale,

    init,
    load,
    loadData,

    zoomIn,
    zoomOut,
    zoomTo,
    fitWidth,
    fitPage,
    resetZoom,

    activateTool,
    deactivateTool,
    getAnnotations,
    exportAnnotations,
    importAnnotations,
    undo,
    redo,

    destroy
  };
}
