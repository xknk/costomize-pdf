/**
 * PDF查看器主类
 * 整合core、zoom、annotations所有模块
 */

import * as pdfjsLib from 'pdfjs-dist';
import { ZoomManager, type ZoomManagerConfig } from '@customize-pdf/canvas-zoom';
import { AnnotationManager, type AnnotationManagerConfig } from '@customize-pdf/canvas-annotations';

// 配置PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export interface PDFViewerConfig {
  container: HTMLElement | string;
  url?: string;
  data?: Uint8Array;

  // 缩放配置
  zoom?: Partial<ZoomManagerConfig>;

  // 批注配置
  annotations?: Partial<AnnotationManagerConfig> & {
    enabled?: boolean;
  };

  // 渲染配置
  scale?: number;
  enableTextLayer?: boolean;
}

export interface PDFPageInfo {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  viewport: any;
}

export class PDFViewer {
  private container: HTMLElement;
  private pdfDocument: pdfjsLib.PDFDocumentProxy | null = null;
  private pages: Map<number, PDFPageInfo> = new Map();

  private zoomManager: ZoomManager | null = null;
  private annotationManager: AnnotationManager | null = null;

  private currentScale: number = 1.0;
  private config: PDFViewerConfig;

  constructor(config: PDFViewerConfig) {
    this.config = config;

    // 解析容器
    this.container = typeof config.container === 'string'
      ? document.querySelector(config.container)!
      : config.container;

    if (!this.container) {
      throw new Error('PDFViewer: 容器元素不存在');
    }

    this.currentScale = config.scale || 1.0;

    // 初始化容器样式
    this.initContainer();
  }

  /**
   * 初始化容器
   */
  private initContainer(): void {
    this.container.style.overflow = 'auto';
    this.container.style.position = 'relative';
  }

  /**
   * 加载PDF文档
   */
  async loadDocument(url?: string, data?: Uint8Array): Promise<void> {
    const source = url || this.config.url;
    const docData = data || this.config.data;

    if (!source && !docData) {
      throw new Error('PDFViewer: 必须提供url或data');
    }

    const loadingTask = source
      ? pdfjsLib.getDocument(source)
      : pdfjsLib.getDocument({ data: docData! });

    this.pdfDocument = await loadingTask.promise;

    // 渲染第一页
    await this.renderPage(1);

    // 初始化缩放管理器
    this.initZoomManager();

    // 初始化批注管理器
    if (this.config.annotations?.enabled !== false) {
      this.initAnnotationManager();
    }
  }

  /**
   * 渲染页面
   */
  async renderPage(pageNumber: number): Promise<void> {
    if (!this.pdfDocument) {
      throw new Error('PDFViewer: 文档未加载');
    }

    const page = await this.pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: this.currentScale });

    // 创建或获取Canvas
    let canvas = this.pages.get(pageNumber)?.canvas;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.display = 'block';
      canvas.style.margin = '10px auto';
      this.container.appendChild(canvas);
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d')!;

    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    this.pages.set(pageNumber, { pageNumber, canvas, viewport });
  }

  /**
   * 初始化缩放管理器
   */
  private initZoomManager(): void {
    const firstPage = this.pages.get(1);
    if (!firstPage) return;

    this.zoomManager = new ZoomManager({
      container: this.container,
      strategy: 'hybrid',
      initialScale: this.currentScale,
      gestures: {
        wheel: true,
        pinch: true
      },
      ...this.config.zoom
    });

    // 监听缩放变化
    this.zoomManager.on('zoom-change', (event: any) => {
      this.currentScale = event.state.scale;
    });

    // 监听重渲染请求
    this.zoomManager.on('rerender-start', async (event: any) => {
      await this.rerenderAllPages(event.state.scale);
      this.zoomManager?.onRerenderComplete(event.state.scale);
    });
  }

  /**
   * 初始化批注管理器
   */
  private initAnnotationManager(): void {
    const firstPage = this.pages.get(1);
    if (!firstPage) return;

    this.annotationManager = new AnnotationManager({
      canvas: firstPage.canvas,
      canvasId: 'page-1',
      enableUndo: true,
      ...this.config.annotations
    });
  }

  /**
   * 重新渲染所有页面
   */
  private async rerenderAllPages(scale: number): Promise<void> {
    this.currentScale = scale;
    const pageNumbers = Array.from(this.pages.keys());

    for (const pageNumber of pageNumbers) {
      await this.renderPage(pageNumber);
    }

    // 重新渲染批注
    if (this.annotationManager) {
      this.annotationManager.render();
    }
  }

  /**
   * 缩放方法
   */
  zoomIn(): void {
    this.zoomManager?.zoomIn();
  }

  zoomOut(): void {
    this.zoomManager?.zoomOut();
  }

  zoomTo(scale: number): void {
    this.zoomManager?.zoomTo(scale);
  }

  fitWidth(): void {
    this.zoomManager?.fitWidth();
  }

  fitPage(): void {
    this.zoomManager?.fitPage();
  }

  resetZoom(): void {
    this.zoomManager?.reset();
  }

  /**
   * 批注方法
   */
  activateTool(toolName: string, config?: any): void {
    this.annotationManager?.activateTool(toolName, config);
  }

  deactivateTool(): void {
    this.annotationManager?.deactivateTool();
  }

  getAnnotations(): any[] {
    return this.annotationManager?.getAnnotations() || [];
  }

  exportAnnotations(options?: any): string {
    return this.annotationManager?.exportAnnotations(options) || '{}';
  }

  importAnnotations(data: string | object, options?: any): void {
    this.annotationManager?.importAnnotations(data, options);
  }

  undo(): void {
    this.annotationManager?.undo();
  }

  redo(): void {
    this.annotationManager?.redo();
  }

  /**
   * 文档信息
   */
  getTotalPages(): number {
    return this.pdfDocument?.numPages || 0;
  }

  getCurrentScale(): number {
    return this.currentScale;
  }

  /**
   * 销毁查看器
   */
  destroy(): void {
    this.zoomManager?.destroy();
    this.annotationManager?.destroy();

    this.pages.forEach(page => {
      page.canvas.remove();
    });

    this.pages.clear();
    this.pdfDocument = null;
  }
}
