/**
 * 事件总线 - 核心事件通信系统
 *
 * 设计参考PDF.js的EventBus，提供跨模块的事件通信
 */

export type EventHandler<T = any> = (event: T) => void;

export interface EventMap {
  // 文档事件
  'document-loaded': { pdfDocument: any; numPages: number };
  'document-load-error': { error: Error };
  'document-unloaded': void;

  // 页面事件
  'page-rendered': { pageNumber: number; canvas: HTMLCanvasElement };
  'page-render-error': { pageNumber: number; error: Error };
  'pages-initialized': { pagesCount: number };

  // 视口事件
  'visible-pages-changed': { pages: number[]; buffer: number };
  'scroll-position-changed': { scrollTop: number; scrollLeft: number };

  // 缩放事件
  'zoom-change': { scale: number; oldScale: number };
  'zoom-start': { scale: number };
  'zoom-end': { scale: number };

  // 批注事件
  'annotation-created': { annotation: any };
  'annotation-updated': { annotation: any };
  'annotation-deleted': { id: string };
  'annotation-selected': { annotation: any | null };

  // 工具事件
  'tool-changed': { toolName: string };

  // 性能事件
  'render-queue-size-changed': { size: number };
  'cache-size-changed': { size: number };
}

export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private onceHandlers: Map<string, Set<EventHandler>> = new Map();

  /**
   * 注册事件监听器
   */
  on<K extends keyof EventMap>(
    eventName: K,
    handler: EventHandler<EventMap[K]>
  ): void {
    const key = eventName as string;
    if (!this.handlers.has(key)) {
      this.handlers.set(key, new Set());
    }
    this.handlers.get(key)!.add(handler);
  }

  /**
   * 注册一次性事件监听器
   */
  once<K extends keyof EventMap>(
    eventName: K,
    handler: EventHandler<EventMap[K]>
  ): void {
    const key = eventName as string;
    if (!this.onceHandlers.has(key)) {
      this.onceHandlers.set(key, new Set());
    }
    this.onceHandlers.get(key)!.add(handler);
  }

  /**
   * 移除事件监听器
   */
  off<K extends keyof EventMap>(
    eventName: K,
    handler: EventHandler<EventMap[K]>
  ): void {
    const key = eventName as string;
    this.handlers.get(key)?.delete(handler);
    this.onceHandlers.get(key)?.delete(handler);
  }

  /**
   * 触发事件
   */
  emit<K extends keyof EventMap>(
    eventName: K,
    data: EventMap[K]
  ): void {
    const key = eventName as string;

    // 触发普通监听器
    const handlers = this.handlers.get(key);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for "${key}":`, error);
        }
      });
    }

    // 触发一次性监听器
    const onceHandlers = this.onceHandlers.get(key);
    if (onceHandlers) {
      onceHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in once handler for "${key}":`, error);
        }
      });
      // 清空一次性监听器
      onceHandlers.clear();
    }
  }

  /**
   * 移除所有监听器
   */
  clear(): void {
    this.handlers.clear();
    this.onceHandlers.clear();
  }

  /**
   * 移除指定事件的所有监听器
   */
  clearEvent<K extends keyof EventMap>(eventName: K): void {
    const key = eventName as string;
    this.handlers.delete(key);
    this.onceHandlers.delete(key);
  }

  /**
   * 获取事件监听器数量
   */
  getListenerCount(eventName: string): number {
    const regularCount = this.handlers.get(eventName)?.size || 0;
    const onceCount = this.onceHandlers.get(eventName)?.size || 0;
    return regularCount + onceCount;
  }
}

// 导出全局事件总线单例（可选）
export const globalEventBus = new EventBus();
