/**
 * Worker池 - 管理多个PDF渲染Worker
 *
 * 设计要点：
 * - 自动检测CPU核心数
 * - 任务队列管理
 * - 负载均衡（分配到最空闲的Worker）
 * - Worker生命周期管理
 */

import { EventBus } from '../events/EventBus';

export interface WorkerPoolConfig {
  workerCount?: number; // Worker数量，默认为CPU核心数
  maxQueueSize?: number; // 最大队列大小，默认100
  workerScript?: string; // Worker脚本路径
  eventBus?: EventBus;
}

export interface RenderTask {
  taskId: string;
  pdfData: ArrayBuffer;
  pageNumber: number;
  scale: number;
  width: number;
  height: number;
  resolve: (imageBitmap: ImageBitmap) => void;
  reject: (error: Error) => void;
}

interface WorkerInfo {
  worker: Worker;
  busy: boolean;
  taskCount: number; // 当前处理的任务数
  currentTaskId: string | null;
}

export class WorkerPool {
  private workers: WorkerInfo[] = [];
  private taskQueue: RenderTask[] = [];
  private workerCount: number;
  private maxQueueSize: number;
  private workerScript: string;
  private _eventBus: EventBus; // 未使用，预留给未来事件通知
  private pendingTasks: Map<string, RenderTask> = new Map();

  constructor(config: WorkerPoolConfig = {}) {
    // 默认Worker数量 = CPU核心数
    this.workerCount = config.workerCount || navigator.hardwareConcurrency || 4;
    this.maxQueueSize = config.maxQueueSize || 100;
    this.workerScript = config.workerScript || './pdf-render.worker.js';
    this._eventBus = config.eventBus || new EventBus();
  }

  /**
   * 初始化Worker池
   */
  async init(): Promise<void> {
    const initPromises: Promise<void>[] = [];

    for (let i = 0; i < this.workerCount; i++) {
      initPromises.push(this.createWorker());
    }

    await Promise.all(initPromises);
    console.log(`✅ Worker池初始化完成，共${this.workerCount}个Worker`);
  }

  /**
   * 创建单个Worker
   */
  private createWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(this.workerScript, { type: 'module' });

        const workerInfo: WorkerInfo = {
          worker,
          busy: false,
          taskCount: 0,
          currentTaskId: null
        };

        // 监听Worker消息
        worker.onmessage = (event) => {
          const { type, taskId, imageBitmap, error } = event.data;

          if (type === 'ready') {
            // Worker就绪
            this.workers.push(workerInfo);
            resolve();
            return;
          }

          if (type === 'render-complete') {
            this.handleTaskComplete(taskId, imageBitmap);
            workerInfo.busy = false;
            workerInfo.taskCount--;
            workerInfo.currentTaskId = null;

            // 处理队列中的下一个任务
            this.processQueue();
          }

          if (type === 'render-error') {
            this.handleTaskError(taskId, new Error(error));
            workerInfo.busy = false;
            workerInfo.taskCount--;
            workerInfo.currentTaskId = null;

            // 处理队列中的下一个任务
            this.processQueue();
          }
        };

        worker.onerror = (error) => {
          console.error('Worker错误:', error);
          workerInfo.busy = false;

          // 如果有当前任务，标记为失败
          if (workerInfo.currentTaskId) {
            this.handleTaskError(
              workerInfo.currentTaskId,
              new Error('Worker发生错误')
            );
            workerInfo.currentTaskId = null;
          }

          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 提交渲染任务
   */
  async render(
    pdfData: ArrayBuffer,
    pageNumber: number,
    scale: number,
    width: number,
    height: number
  ): Promise<ImageBitmap> {
    return new Promise((resolve, reject) => {
      // 检查队列是否已满
      if (this.taskQueue.length >= this.maxQueueSize) {
        reject(new Error('任务队列已满'));
        return;
      }

      // 创建任务
      const taskId = `task_${Date.now()}_${Math.random()}`;
      const task: RenderTask = {
        taskId,
        pdfData,
        pageNumber,
        scale,
        width,
        height,
        resolve,
        reject
      };

      // 加入队列
      this.taskQueue.push(task);
      this.pendingTasks.set(taskId, task);

      // 处理队列
      this.processQueue();
    });
  }

  /**
   * 处理任务队列
   */
  private processQueue(): void {
    if (this.taskQueue.length === 0) {
      return;
    }

    // 查找空闲的Worker
    const idleWorker = this.findIdleWorker();

    if (!idleWorker) {
      // 没有空闲Worker，等待
      return;
    }

    // 从队列中取出任务
    const task = this.taskQueue.shift();
    if (!task) {
      return;
    }

    // 分配任务给Worker
    this.assignTask(idleWorker, task);

    // 继续处理队列（如果还有空闲Worker）
    this.processQueue();
  }

  /**
   * 查找最空闲的Worker
   */
  private findIdleWorker(): WorkerInfo | null {
    // 优先找完全空闲的Worker
    const idle = this.workers.find(w => !w.busy && w.taskCount === 0);
    if (idle) {
      return idle;
    }

    // 如果没有完全空闲的，找任务数最少的
    const leastBusy = this.workers.reduce((prev, current) => {
      return current.taskCount < prev.taskCount ? current : prev;
    }, this.workers[0]);

    return leastBusy && !leastBusy.busy ? leastBusy : null;
  }

  /**
   * 分配任务给Worker
   */
  private assignTask(workerInfo: WorkerInfo, task: RenderTask): void {
    workerInfo.busy = true;
    workerInfo.taskCount++;
    workerInfo.currentTaskId = task.taskId;

    // 发送任务到Worker
    workerInfo.worker.postMessage({
      type: 'render',
      taskId: task.taskId,
      pdfData: task.pdfData,
      pageNumber: task.pageNumber,
      scale: task.scale,
      width: task.width,
      height: task.height
    }, [task.pdfData]); // 转移ArrayBuffer所有权
  }

  /**
   * 处理任务完成
   */
  private handleTaskComplete(taskId: string, imageBitmap: ImageBitmap): void {
    const task = this.pendingTasks.get(taskId);
    if (task) {
      task.resolve(imageBitmap);
      this.pendingTasks.delete(taskId);
    }
  }

  /**
   * 处理任务错误
   */
  private handleTaskError(taskId: string, error: Error): void {
    const task = this.pendingTasks.get(taskId);
    if (task) {
      task.reject(error);
      this.pendingTasks.delete(taskId);
    }
  }

  /**
   * 获取池状态
   */
  getStatus() {
    return {
      workerCount: this.workers.length,
      busyWorkers: this.workers.filter(w => w.busy).length,
      queueLength: this.taskQueue.length,
      pendingTasks: this.pendingTasks.size,
      maxQueueSize: this.maxQueueSize
    };
  }

  /**
   * 销毁Worker池
   */
  destroy(): void {
    // 终止所有Worker
    this.workers.forEach(workerInfo => {
      workerInfo.worker.terminate();
    });

    // 清空队列
    this.workers = [];
    this.taskQueue = [];

    // 拒绝所有待处理任务
    this.pendingTasks.forEach(task => {
      task.reject(new Error('Worker池已销毁'));
    });
    this.pendingTasks.clear();
  }
}
