/**
 * 虚拟滚动器 - 仅渲染可见页面，支持1000+页大文档
 *
 * 设计要点：
 * - 二分查找可见页面范围
 * - 缓冲区机制（上下各2页）
 * - 渲染优先级（中心页最高）
 * - 自动清理离开视口的页面
 * - Intersection Observer优化
 */
import { EventBus } from '../events/EventBus';
import { PDFDocument } from '../document/PDFDocument';
import { PageRenderer } from '../renderer/PageRenderer';
export interface VirtualScrollerConfig {
    container: HTMLElement;
    pdfDocument: PDFDocument;
    pageRenderer: PageRenderer;
    scale?: number;
    bufferPages?: number;
    enableIntersectionObserver?: boolean;
    eventBus?: EventBus;
}
export interface PageInfo {
    pageNumber: number;
    top: number;
    height: number;
    canvas: HTMLCanvasElement | null;
    rendered: boolean;
    visible: boolean;
}
export declare class VirtualScroller {
    private container;
    private pdfDocument;
    private pageRenderer;
    private eventBus;
    private scale;
    private bufferPages;
    private enableIntersectionObserver;
    private pages;
    private visiblePages;
    private intersectionObserver;
    private scrollTimeout;
    constructor(config: VirtualScrollerConfig);
    /**
     * 初始化虚拟滚动
     */
    init(): Promise<void>;
    /**
     * 设置容器高度
     */
    private setContainerHeight;
    /**
     * 创建Canvas占位符
     */
    private createCanvasPlaceholders;
    /**
     * 设置IntersectionObserver
     */
    private setupIntersectionObserver;
    /**
     * 绑定滚动事件
     */
    private bindScrollEvent;
    /**
     * 更新可见页面（手动计算，不依赖IntersectionObserver）
     */
    private updateVisiblePages;
    /**
     * 二分查找页面索引
     */
    private binarySearchPage;
    /**
     * 渲染页面
     */
    private renderPage;
    /**
     * 更新缩放
     */
    updateScale(newScale: number): void;
    /**
     * 跳转到指定页面
     */
    scrollToPage(pageNumber: number, smooth?: boolean): void;
    /**
     * 销毁虚拟滚动器
     */
    destroy(): void;
    /**
     * 获取状态
     */
    getStatus(): {
        totalPages: number;
        visiblePages: number;
        renderedPages: number;
        scale: number;
        bufferPages: number;
    };
}
//# sourceMappingURL=VirtualScroller.d.ts.map