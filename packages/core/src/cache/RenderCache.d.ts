/**
 * 渲染缓存 - LRU缓存机制，缓存已渲染的页面
 *
 * 设计要点：
 * - LRU（Least Recently Used）淘汰策略
 * - 两级缓存：内存缓存 + IndexedDB持久化（可选）
 * - 缓存键：fingerprint + pageNumber + scale
 * - 自动内存管理
 */
import { EventBus } from '../events/EventBus';
export interface RenderCacheConfig {
    maxCacheSize?: number;
    enablePersistence?: boolean;
    persistenceDBName?: string;
    eventBus?: EventBus;
}
interface CacheKey {
    fingerprint: string;
    pageNumber: number;
    scale: number;
}
export declare class RenderCache {
    private cache;
    private accessOrder;
    private maxCacheSize;
    private enablePersistence;
    private _persistenceDBName;
    private eventBus;
    private totalCacheSize;
    private maxMemorySize;
    constructor(config?: RenderCacheConfig);
    /**
     * 生成缓存键
     */
    private generateKey;
    /**
     * 获取缓存
     */
    get(cacheKey: CacheKey): ImageData | null;
    /**
     * 设置缓存
     */
    set(cacheKey: CacheKey, imageData: ImageData): void;
    /**
     * 检查缓存是否存在
     */
    has(cacheKey: CacheKey): boolean;
    /**
     * 删除缓存
     */
    delete(cacheKey: CacheKey): void;
    /**
     * 淘汰最近最少使用的缓存项（LRU）
     */
    private evictLRU;
    /**
     * 更新访问顺序（将键移到最后）
     */
    private updateAccessOrder;
    /**
     * 从访问顺序中移除
     */
    private removeFromAccessOrder;
    /**
     * 清空所有缓存
     */
    clear(): void;
    /**
     * 清空指定文档的所有缓存
     */
    clearDocument(fingerprint: string): void;
    /**
     * 获取缓存状态
     */
    getStatus(): {
        size: number;
        maxSize: number;
        memoryUsage: number;
        maxMemoryUsage: number;
        memoryUsageMB: string;
        maxMemoryUsageMB: string;
    };
    /**
     * 获取缓存命中率统计（需要额外实现统计逻辑）
     */
    private hitCount;
    private missCount;
    getHitRate(): number;
    /**
     * 重置统计
     */
    resetStats(): void;
    /**
     * 销毁缓存
     */
    destroy(): void;
}
export declare const globalRenderCache: RenderCache;
export {};
//# sourceMappingURL=RenderCache.d.ts.map