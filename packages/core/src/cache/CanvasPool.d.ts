/**
 * Canvas对象池 - 复用Canvas元素，减少创建销毁开销
 *
 * 设计要点：
 * - 对象复用模式，避免频繁的DOM创建/销毁
 * - 自动清理机制，防止内存泄漏
 * - 尺寸匹配优化，优先复用尺寸相近的Canvas
 */
export interface CanvasPoolConfig {
    maxPoolSize?: number;
    maxCanvasSize?: number;
}
export declare class CanvasPool {
    private pool;
    private maxPoolSize;
    private maxCanvasSize;
    constructor(config?: CanvasPoolConfig);
    /**
     * 从池中获取Canvas
     */
    acquire(width: number, height: number): HTMLCanvasElement;
    /**
     * 归还Canvas到池中
     */
    release(canvas: HTMLCanvasElement): void;
    /**
     * 查找可复用的Canvas
     */
    private findReusableCanvas;
    /**
     * 创建新Canvas
     */
    private createCanvas;
    /**
     * 移除最旧的未使用Canvas
     */
    private removeOldestCanvas;
    /**
     * 清理所有未使用的Canvas
     */
    cleanup(): void;
    /**
     * 清理超过指定时间未使用的Canvas
     */
    cleanupOld(maxAge?: number): void;
    /**
     * 销毁池中所有Canvas
     */
    destroy(): void;
    /**
     * 获取池状态
     */
    getStatus(): {
        total: number;
        inUse: number;
        available: number;
        maxPoolSize: number;
    };
}
export declare const globalCanvasPool: CanvasPool;
//# sourceMappingURL=CanvasPool.d.ts.map