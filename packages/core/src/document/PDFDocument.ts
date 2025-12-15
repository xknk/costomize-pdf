/**
 * PDF文档抽象层 - 封装pdf-lib和pdfjs-dist
 *
 * 提供统一的PDF文档接口，隐藏底层实现细节
 */

import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument as PDFLibDocument } from 'pdf-lib';
import { EventBus } from '../events/EventBus';

export interface PDFDocumentConfig {
  url?: string;
  data?: ArrayBuffer | Uint8Array;
  workerSrc?: string;
  eventBus?: EventBus;
}

export interface PDFPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
}

export class PDFDocument {
  private pdfjsDoc: pdfjsLib.PDFDocumentProxy | null = null;
  private pdflibDoc: PDFLibDocument | null = null;
  private eventBus: EventBus;
  private _numPages: number = 0;
  private _fingerprint: string = '';

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus || new EventBus();
  }

  /**
   * 加载PDF文档
   */
  async load(config: PDFDocumentConfig): Promise<void> {
    try {
      // 设置Worker路径
      if (config.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = config.workerSrc;
      }

      // 加载PDF（用于渲染）
      let loadingTask: pdfjsLib.PDFDocumentLoadingTask;

      if (config.url) {
        loadingTask = pdfjsLib.getDocument(config.url);
      } else if (config.data) {
        loadingTask = pdfjsLib.getDocument({ data: config.data });
      } else {
        throw new Error('必须提供url或data参数');
      }

      this.pdfjsDoc = await loadingTask.promise;
      this._numPages = this.pdfjsDoc.numPages;
      this._fingerprint = this.pdfjsDoc.fingerprints[0];

      // 加载pdf-lib（用于编辑）
      let pdfBytes: Uint8Array;
      if (config.data) {
        pdfBytes = config.data instanceof Uint8Array
          ? config.data
          : new Uint8Array(config.data);
      } else if (config.url) {
        const response = await fetch(config.url);
        const arrayBuffer = await response.arrayBuffer();
        pdfBytes = new Uint8Array(arrayBuffer);
      } else {
        throw new Error('无法获取PDF数据');
      }

      this.pdflibDoc = await PDFLibDocument.load(pdfBytes);

      // 触发加载完成事件
      this.eventBus.emit('document-loaded', {
        pdfDocument: this,
        numPages: this._numPages
      });

    } catch (error) {
      this.eventBus.emit('document-load-error', {
        error: error as Error
      });
      throw error;
    }
  }

  /**
   * 获取页面
   */
  async getPage(pageNumber: number): Promise<PDFPage> {
    if (!this.pdfjsDoc) {
      throw new Error('PDF文档未加载');
    }

    if (pageNumber < 1 || pageNumber > this._numPages) {
      throw new Error(`页码超出范围: ${pageNumber}`);
    }

    const page = await this.pdfjsDoc.getPage(pageNumber);
    return new PDFPage(page, pageNumber, this.eventBus);
  }

  /**
   * 获取所有页面信息
   */
  async getAllPagesInfo(): Promise<PDFPageInfo[]> {
    if (!this.pdfjsDoc) {
      throw new Error('PDF文档未加载');
    }

    const pagesInfo: PDFPageInfo[] = [];

    for (let i = 1; i <= this._numPages; i++) {
      const page = await this.pdfjsDoc.getPage(i);
      const viewport = page.getViewport({ scale: 1 });

      pagesInfo.push({
        pageNumber: i,
        width: viewport.width,
        height: viewport.height,
        rotation: viewport.rotation
      });
    }

    return pagesInfo;
  }

  /**
   * 销毁文档
   */
  async destroy(): Promise<void> {
    if (this.pdfjsDoc) {
      await this.pdfjsDoc.destroy();
      this.pdfjsDoc = null;
    }

    this.pdflibDoc = null;
    this._numPages = 0;
    this._fingerprint = '';

    this.eventBus.emit('document-unloaded', undefined);
  }

  /**
   * 获取文档信息
   */
  get numPages(): number {
    return this._numPages;
  }

  get fingerprint(): string {
    return this._fingerprint;
  }

  get isLoaded(): boolean {
    return this.pdfjsDoc !== null;
  }

  /**
   * 获取底层pdfjs文档（高级用法）
   */
  getPDFJSDocument(): pdfjsLib.PDFDocumentProxy | null {
    return this.pdfjsDoc;
  }

  /**
   * 获取底层pdf-lib文档（高级用法）
   */
  getPDFLibDocument(): PDFLibDocument | null {
    return this.pdflibDoc;
  }
}

/**
 * PDF页面封装
 */
export class PDFPage {
  constructor(
    private pdfjsPage: pdfjsLib.PDFPageProxy,
    public readonly pageNumber: number,
    private eventBus: EventBus
  ) {}

  /**
   * 渲染页面到Canvas
   */
  async render(
    canvas: HTMLCanvasElement,
    scale: number
  ): Promise<void> {
    try {
      const viewport = this.pdfjsPage.getViewport({ scale });
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('无法获取Canvas上下文');
      }

      // 设置Canvas尺寸
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // 渲染PDF
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      await this.pdfjsPage.render(renderContext).promise;

      this.eventBus.emit('page-rendered', {
        pageNumber: this.pageNumber,
        canvas
      });

    } catch (error) {
      this.eventBus.emit('page-render-error', {
        pageNumber: this.pageNumber,
        error: error as Error
      });
      throw error;
    }
  }

  /**
   * 获取视口信息
   */
  getViewport(scale: number) {
    return this.pdfjsPage.getViewport({ scale });
  }

  /**
   * 获取底层pdfjs页面
   */
  getPDFJSPage(): pdfjsLib.PDFPageProxy {
    return this.pdfjsPage;
  }
}
