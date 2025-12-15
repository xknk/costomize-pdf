/**
 * 页面渲染器 - 管理PDF页面渲染
 *
 * 功能:
 * - 渲染队列管理
 * - 渲染优先级
 * - 渲染取消
 * - 错误处理
 */
import { PDFPage } from '../document/PDFDocument';
import { EventBus } from '../events/EventBus';
export interface RenderTask {
    pageNumber: number;
    canvas: HTMLCanvasElement;
    scale: number;
    priority: number;
    timestamp: number;
    abortController?: AbortController;
}
export interface PageRendererConfig {
    maxConcurrentRenders?: number;
    eventBus?: EventBus;
}
export declare class PageRenderer {
    private renderQueue;
    private activeRenders;
    private maxConcurrentRenders;
    private eventBus;
    constructor(config?: PageRendererConfig);
    /**
     * 渲染页面（加入队列）
     */
    renderPage(page: PDFPage, canvas: HTMLCanvasElement, scale: number, priority?: number): Promise<void>;
    /**
     * 取消页面渲染
     */
    cancelPage(pageNumber: number): void;
    /**
     * 取消所有渲染任务
     */
    cancelAll(): void;
    /**
     * 处理渲染队列
     */
    private processQueue;
    /**
     * 执行实际渲染
     */
    private executeRender;
    /**
     * 按优先级和时间排序队列
     * 优先级数字越小越优先，相同优先级则时间越早越优先
     */
    private sortQueue;
    /**
     * 获取队列状态
     */
    getQueueStatus(): {
        queueLength: number;
        activeRenders: number;
        maxConcurrentRenders: number;
    };
    /**
     * 销毁渲染器
     */
    destroy(): void;
}
//# sourceMappingURL=PageRenderer.d.ts.map