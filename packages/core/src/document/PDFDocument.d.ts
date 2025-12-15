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
export declare class PDFDocument {
    private pdfjsDoc;
    private pdflibDoc;
    private eventBus;
    private _numPages;
    private _fingerprint;
    constructor(eventBus?: EventBus);
    /**
     * 加载PDF文档
     */
    load(config: PDFDocumentConfig): Promise<void>;
    /**
     * 获取页面
     */
    getPage(pageNumber: number): Promise<PDFPage>;
    /**
     * 获取所有页面信息
     */
    getAllPagesInfo(): Promise<PDFPageInfo[]>;
    /**
     * 销毁文档
     */
    destroy(): Promise<void>;
    /**
     * 获取文档信息
     */
    get numPages(): number;
    get fingerprint(): string;
    get isLoaded(): boolean;
    /**
     * 获取底层pdfjs文档（高级用法）
     */
    getPDFJSDocument(): pdfjsLib.PDFDocumentProxy | null;
    /**
     * 获取底层pdf-lib文档（高级用法）
     */
    getPDFLibDocument(): PDFLibDocument | null;
}
/**
 * PDF页面封装
 */
export declare class PDFPage {
    private pdfjsPage;
    readonly pageNumber: number;
    private eventBus;
    constructor(pdfjsPage: pdfjsLib.PDFPageProxy, pageNumber: number, eventBus: EventBus);
    /**
     * 渲染页面到Canvas
     */
    render(canvas: HTMLCanvasElement, scale: number): Promise<void>;
    /**
     * 获取视口信息
     */
    getViewport(scale: number): import("pdfjs-dist/types/src/display/display_utils").PageViewport;
    /**
     * 获取底层pdfjs页面
     */
    getPDFJSPage(): pdfjsLib.PDFPageProxy;
}
//# sourceMappingURL=PDFDocument.d.ts.map