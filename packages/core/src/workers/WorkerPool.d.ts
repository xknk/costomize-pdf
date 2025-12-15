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
    workerCount?: number;
    maxQueueSize?: number;
    workerScript?: string;
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
export declare class WorkerPool {
    private workers;
    private taskQueue;
    private workerCount;
    private maxQueueSize;
    private workerScript;
    private _eventBus;
    private pendingTasks;
    constructor(config?: WorkerPoolConfig);
    /**
     * 初始化Worker池
     */
    init(): Promise<void>;
    /**
     * 创建单个Worker
     */
    private createWorker;
    /**
     * 提交渲染任务
     */
    render(pdfData: ArrayBuffer, pageNumber: number, scale: number, width: number, height: number): Promise<ImageBitmap>;
    /**
     * 处理任务队列
     */
    private processQueue;
    /**
     * 查找最空闲的Worker
     */
    private findIdleWorker;
    /**
     * 分配任务给Worker
     */
    private assignTask;
    /**
     * 处理任务完成
     */
    private handleTaskComplete;
    /**
     * 处理任务错误
     */
    private handleTaskError;
    /**
     * 获取池状态
     */
    getStatus(): {
        workerCount: number;
        busyWorkers: number;
        queueLength: number;
        pendingTasks: number;
        maxQueueSize: number;
    };
    /**
     * 销毁Worker池
     */
    destroy(): void;
}
//# sourceMappingURL=WorkerPool.d.ts.map