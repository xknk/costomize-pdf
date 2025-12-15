/**
 * 事件总线 - 核心事件通信系统
 *
 * 设计参考PDF.js的EventBus，提供跨模块的事件通信
 */
export type EventHandler<T = any> = (event: T) => void;
export interface EventMap {
    'document-loaded': {
        pdfDocument: any;
        numPages: number;
    };
    'document-load-error': {
        error: Error;
    };
    'document-unloaded': void;
    'page-rendered': {
        pageNumber: number;
        canvas: HTMLCanvasElement;
    };
    'page-render-error': {
        pageNumber: number;
        error: Error;
    };
    'pages-initialized': {
        pagesCount: number;
    };
    'visible-pages-changed': {
        pages: number[];
        buffer: number;
    };
    'scroll-position-changed': {
        scrollTop: number;
        scrollLeft: number;
    };
    'zoom-change': {
        scale: number;
        oldScale: number;
    };
    'zoom-start': {
        scale: number;
    };
    'zoom-end': {
        scale: number;
    };
    'annotation-created': {
        annotation: any;
    };
    'annotation-updated': {
        annotation: any;
    };
    'annotation-deleted': {
        id: string;
    };
    'annotation-selected': {
        annotation: any | null;
    };
    'tool-changed': {
        toolName: string;
    };
    'render-queue-size-changed': {
        size: number;
    };
    'cache-size-changed': {
        size: number;
    };
}
export declare class EventBus {
    private handlers;
    private onceHandlers;
    /**
     * 注册事件监听器
     */
    on<K extends keyof EventMap>(eventName: K, handler: EventHandler<EventMap[K]>): void;
    /**
     * 注册一次性事件监听器
     */
    once<K extends keyof EventMap>(eventName: K, handler: EventHandler<EventMap[K]>): void;
    /**
     * 移除事件监听器
     */
    off<K extends keyof EventMap>(eventName: K, handler: EventHandler<EventMap[K]>): void;
    /**
     * 触发事件
     */
    emit<K extends keyof EventMap>(eventName: K, data: EventMap[K]): void;
    /**
     * 移除所有监听器
     */
    clear(): void;
    /**
     * 移除指定事件的所有监听器
     */
    clearEvent<K extends keyof EventMap>(eventName: K): void;
    /**
     * 获取事件监听器数量
     */
    getListenerCount(eventName: string): number;
}
export declare const globalEventBus: EventBus;
//# sourceMappingURL=EventBus.d.ts.map