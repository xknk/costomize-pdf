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
  priority: number; // 数字越小优先级越高
  timestamp: number;
  abortController?: AbortController;
}

export interface PageRendererConfig {
  maxConcurrentRenders?: number; // 最大并发渲染数
  eventBus?: EventBus;
}

export class PageRenderer {
  private renderQueue: RenderTask[] = [];
  private activeRenders: Map<number, Promise<void>> = new Map();
  private maxConcurrentRenders: number;
  private eventBus: EventBus;

  constructor(config: PageRendererConfig = {}) {
    this.maxConcurrentRenders = config.maxConcurrentRenders || 3;
    this.eventBus = config.eventBus || new EventBus();
  }

  /**
   * 渲染页面（加入队列）
   */
  async renderPage(
    page: PDFPage,
    canvas: HTMLCanvasElement,
    scale: number,
    priority: number = 10
  ): Promise<void> {
    const task: RenderTask = {
      pageNumber: page.pageNumber,
      canvas,
      scale,
      priority,
      timestamp: Date.now(),
      abortController: new AbortController()
    };

    // 如果已经有相同页面的渲染任务，取消旧任务
    this.cancelPage(page.pageNumber);

    // 加入队列
    this.renderQueue.push(task);
    this.sortQueue();

    // 更新队列大小事件
    this.eventBus.emit('render-queue-size-changed', {
      size: this.renderQueue.length
    });

    // 处理队列
    await this.processQueue(page);
  }

  /**
   * 取消页面渲染
   */
  cancelPage(pageNumber: number): void {
    // 取消队列中的任务
    const index = this.renderQueue.findIndex(t => t.pageNumber === pageNumber);
    if (index !== -1) {
      const task = this.renderQueue[index];
      task.abortController?.abort();
      this.renderQueue.splice(index, 1);
    }

    // 注意：已经开始渲染的任务无法真正取消（pdfjs限制）
    // 但我们可以标记为已取消，在完成时不触发事件
  }

  /**
   * 取消所有渲染任务
   */
  cancelAll(): void {
    this.renderQueue.forEach(task => {
      task.abortController?.abort();
    });
    this.renderQueue = [];

    this.eventBus.emit('render-queue-size-changed', {
      size: 0
    });
  }

  /**
   * 处理渲染队列
   */
  private async processQueue(page: PDFPage): Promise<void> {
    // 如果已达到最大并发数，等待
    while (this.activeRenders.size >= this.maxConcurrentRenders) {
      await Promise.race(Array.from(this.activeRenders.values()));
    }

    // 从队列中取出最高优先级的任务
    const task = this.renderQueue.shift();
    if (!task) {
      return;
    }

    // 更新队列大小
    this.eventBus.emit('render-queue-size-changed', {
      size: this.renderQueue.length
    });

    // 如果任务已被取消，跳过
    if (task.abortController?.signal.aborted) {
      return;
    }

    // 执行渲染
    const renderPromise = this.executeRender(page, task);
    this.activeRenders.set(task.pageNumber, renderPromise);

    try {
      await renderPromise;
    } finally {
      this.activeRenders.delete(task.pageNumber);
    }
  }

  /**
   * 执行实际渲染
   */
  private async executeRender(
    page: PDFPage,
    task: RenderTask
  ): Promise<void> {
    try {
      // 检查是否已取消
      if (task.abortController?.signal.aborted) {
        return;
      }

      // 调用PDFPage的渲染方法
      await page.render(task.canvas, task.scale);

      // 成功渲染（事件已在PDFPage中触发）
    } catch (error) {
      // 如果是取消错误，忽略
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      // 其他错误，触发错误事件（PDFPage中已触发）
      throw error;
    }
  }

  /**
   * 按优先级和时间排序队列
   * 优先级数字越小越优先，相同优先级则时间越早越优先
   */
  private sortQueue(): void {
    this.renderQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return {
      queueLength: this.renderQueue.length,
      activeRenders: this.activeRenders.size,
      maxConcurrentRenders: this.maxConcurrentRenders
    };
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    this.cancelAll();
    this.activeRenders.clear();
  }
}
