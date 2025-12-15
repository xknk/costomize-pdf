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
  maxCacheSize?: number; // 最大缓存页数，默认50
  enablePersistence?: boolean; // 是否启用IndexedDB持久化，默认false
  persistenceDBName?: string; // IndexedDB数据库名
  eventBus?: EventBus;
}

interface CacheEntry {
  key: string;
  imageData: ImageData;
  timestamp: number;
  size: number; // 字节数
}

interface CacheKey {
  fingerprint: string;
  pageNumber: number;
  scale: number;
}

export class RenderCache {
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = []; // LRU访问顺序
  private maxCacheSize: number;
  private enablePersistence: boolean;
  private _persistenceDBName: string; // 未使用，预留给未来IndexedDB实现
  private eventBus: EventBus;
  private totalCacheSize: number = 0; // 总缓存大小（字节）
  private maxMemorySize: number = 100 * 1024 * 1024; // 最大内存占用100MB

  constructor(config: RenderCacheConfig = {}) {
    this.maxCacheSize = config.maxCacheSize || 50;
    this.enablePersistence = config.enablePersistence || false;
    this._persistenceDBName = config.persistenceDBName || 'pdf-render-cache';
    this.eventBus = config.eventBus || new EventBus();
  }

  /**
   * 生成缓存键
   */
  private generateKey(cacheKey: CacheKey): string {
    const { fingerprint, pageNumber, scale } = cacheKey;
    // 将scale四舍五入到2位小数，避免浮点数精度问题
    const roundedScale = Math.round(scale * 100) / 100;
    return `${fingerprint}_${pageNumber}_${roundedScale}`;
  }

  /**
   * 获取缓存
   */
  get(cacheKey: CacheKey): ImageData | null {
    const key = this.generateKey(cacheKey);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 更新访问时间和顺序
    entry.timestamp = Date.now();
    this.updateAccessOrder(key);

    return entry.imageData;
  }

  /**
   * 设置缓存
   */
  set(cacheKey: CacheKey, imageData: ImageData): void {
    const key = this.generateKey(cacheKey);

    // 计算ImageData大小（宽 * 高 * 4字节/像素）
    const size = imageData.width * imageData.height * 4;

    // 检查是否需要清理空间
    while (
      (this.cache.size >= this.maxCacheSize ||
       this.totalCacheSize + size > this.maxMemorySize) &&
      this.cache.size > 0
    ) {
      this.evictLRU();
    }

    // 如果键已存在，先删除旧的
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!;
      this.totalCacheSize -= oldEntry.size;
    }

    // 添加新缓存
    const entry: CacheEntry = {
      key,
      imageData,
      timestamp: Date.now(),
      size
    };

    this.cache.set(key, entry);
    this.totalCacheSize += size;
    this.updateAccessOrder(key);

    // 触发缓存大小变化事件
    this.eventBus.emit('cache-size-changed', {
      size: this.cache.size
    });

    // 如果启用持久化，保存到IndexedDB（可选实现）
    if (this.enablePersistence) {
      // TODO: 实现IndexedDB持久化
      // this.persistToIndexedDB(key, imageData);
    }
  }

  /**
   * 检查缓存是否存在
   */
  has(cacheKey: CacheKey): boolean {
    const key = this.generateKey(cacheKey);
    return this.cache.has(key);
  }

  /**
   * 删除缓存
   */
  delete(cacheKey: CacheKey): void {
    const key = this.generateKey(cacheKey);
    const entry = this.cache.get(key);

    if (entry) {
      this.totalCacheSize -= entry.size;
      this.cache.delete(key);
      this.removeFromAccessOrder(key);

      this.eventBus.emit('cache-size-changed', {
        size: this.cache.size
      });
    }
  }

  /**
   * 淘汰最近最少使用的缓存项（LRU）
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    // 获取最旧的键（访问顺序的第一个）
    const oldestKey = this.accessOrder[0];
    const entry = this.cache.get(oldestKey);

    if (entry) {
      this.totalCacheSize -= entry.size;
      this.cache.delete(oldestKey);
      this.accessOrder.shift();

      this.eventBus.emit('cache-size-changed', {
        size: this.cache.size
      });
    }
  }

  /**
   * 更新访问顺序（将键移到最后）
   */
  private updateAccessOrder(key: string): void {
    // 先从当前位置移除
    this.removeFromAccessOrder(key);
    // 添加到末尾（最新访问）
    this.accessOrder.push(key);
  }

  /**
   * 从访问顺序中移除
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.totalCacheSize = 0;

    this.eventBus.emit('cache-size-changed', {
      size: 0
    });
  }

  /**
   * 清空指定文档的所有缓存
   */
  clearDocument(fingerprint: string): void {
    const keysToDelete: string[] = [];

    this.cache.forEach((_entry, key) => {
      if (key.startsWith(`${fingerprint}_`)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      const entryToDelete = this.cache.get(key);
      if (entryToDelete) {
        this.totalCacheSize -= entryToDelete.size;
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
      }
    });

    this.eventBus.emit('cache-size-changed', {
      size: this.cache.size
    });
  }

  /**
   * 获取缓存状态
   */
  getStatus() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      memoryUsage: this.totalCacheSize,
      maxMemoryUsage: this.maxMemorySize,
      memoryUsageMB: (this.totalCacheSize / 1024 / 1024).toFixed(2),
      maxMemoryUsageMB: (this.maxMemorySize / 1024 / 1024).toFixed(2)
    };
  }

  /**
   * 获取缓存命中率统计（需要额外实现统计逻辑）
   */
  private hitCount = 0;
  private missCount = 0;

  getHitRate(): number {
    const total = this.hitCount + this.missCount;
    return total === 0 ? 0 : this.hitCount / total;
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * 销毁缓存
   */
  destroy(): void {
    this.clear();
    if (this.enablePersistence) {
      // TODO: 清理IndexedDB
    }
  }
}

// 导出全局渲染缓存单例（可选）
export const globalRenderCache = new RenderCache();
