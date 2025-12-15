/**
 * @customize-pdf/core - 核心PDF渲染引擎
 *
 * 功能模块:
 * - EventBus: 事件总线
 * - PDFDocument: PDF文档抽象
 * - PageRenderer: 页面渲染器
 * - VirtualScroller: 虚拟滚动 ✅
 * - WorkerPool: Worker渲染池 ✅
 * - CanvasPool: Canvas对象池 ✅
 * - RenderCache: 渲染缓存 ✅
 */
export { EventBus, globalEventBus } from './events/EventBus';
export type { EventHandler, EventMap } from './events/EventBus';
export { PDFDocument, PDFPage } from './document/PDFDocument';
export type { PDFDocumentConfig, PDFPageInfo } from './document/PDFDocument';
export { PageRenderer } from './renderer/PageRenderer';
export type { RenderTask, PageRendererConfig } from './renderer/PageRenderer';
export { CanvasPool, globalCanvasPool } from './cache/CanvasPool';
export type { CanvasPoolConfig } from './cache/CanvasPool';
export { RenderCache, globalRenderCache } from './cache/RenderCache';
export type { RenderCacheConfig } from './cache/RenderCache';
export { WorkerPool } from './workers/WorkerPool';
export type { WorkerPoolConfig } from './workers/WorkerPool';
export { VirtualScroller } from './viewport/VirtualScroller';
export type { VirtualScrollerConfig, PageInfo } from './viewport/VirtualScroller';
export type { Scale, Point, Size, Rect, CoreConfig } from './types';
//# sourceMappingURL=index.d.ts.map