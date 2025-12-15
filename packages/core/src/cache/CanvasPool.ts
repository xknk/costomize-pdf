/**
 * Canvas对象池 - 复用Canvas元素，减少创建销毁开销
 *
 * 设计要点：
 * - 对象复用模式，避免频繁的DOM创建/销毁
 * - 自动清理机制，防止内存泄漏
 * - 尺寸匹配优化，优先复用尺寸相近的Canvas
 */

export interface CanvasPoolConfig {
  maxPoolSize?: number; // 最大池大小，默认20
  maxCanvasSize?: number; // 单个Canvas最大尺寸（宽*高），默认16777216 (4096x4096)
}

interface PooledCanvas {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  lastUsed: number; // 时间戳
  inUse: boolean;
}

export class CanvasPool {
  private pool: PooledCanvas[] = [];
  private maxPoolSize: number;
  private maxCanvasSize: number;

  constructor(config: CanvasPoolConfig = {}) {
    this.maxPoolSize = config.maxPoolSize || 20;
    this.maxCanvasSize = config.maxCanvasSize || 16777216; // 4096 * 4096
  }

  /**
   * 从池中获取Canvas
   */
  acquire(width: number, height: number): HTMLCanvasElement {
    // 检查尺寸是否超过限制
    if (width * height > this.maxCanvasSize) {
      console.warn(`Canvas尺寸超过限制 (${width}x${height}), 直接创建新Canvas`);
      return this.createCanvas(width, height);
    }

    // 查找可复用的Canvas（优先选择尺寸相近的）
    const reusable = this.findReusableCanvas(width, height);

    if (reusable) {
      reusable.inUse = true;
      reusable.lastUsed = Date.now();

      // 如果尺寸不完全匹配，调整Canvas尺寸
      if (reusable.width !== width || reusable.height !== height) {
        reusable.canvas.width = width;
        reusable.canvas.height = height;
        reusable.width = width;
        reusable.height = height;
      }

      // 清空Canvas内容
      const ctx = reusable.canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
      }

      return reusable.canvas;
    }

    // 如果池已满，清理最旧的Canvas
    if (this.pool.length >= this.maxPoolSize) {
      this.removeOldestCanvas();
    }

    // 创建新Canvas并加入池
    const canvas = this.createCanvas(width, height);
    this.pool.push({
      canvas,
      width,
      height,
      lastUsed: Date.now(),
      inUse: true
    });

    return canvas;
  }

  /**
   * 归还Canvas到池中
   */
  release(canvas: HTMLCanvasElement): void {
    const pooled = this.pool.find(p => p.canvas === canvas);
    if (pooled) {
      pooled.inUse = false;
      pooled.lastUsed = Date.now();
    }
  }

  /**
   * 查找可复用的Canvas
   */
  private findReusableCanvas(width: number, height: number): PooledCanvas | null {
    // 优先查找尺寸完全匹配的空闲Canvas
    const exactMatch = this.pool.find(
      p => !p.inUse && p.width === width && p.height === height
    );
    if (exactMatch) {
      return exactMatch;
    }

    // 查找尺寸相近的空闲Canvas（误差在10%以内）
    const area = width * height;
    const tolerance = 0.1;

    const closeMatch = this.pool.find(p => {
      if (p.inUse) return false;

      const pooledArea = p.width * p.height;
      const diff = Math.abs(pooledArea - area) / area;

      return diff <= tolerance && pooledArea >= area;
    });

    return closeMatch || null;
  }

  /**
   * 创建新Canvas
   */
  private createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  /**
   * 移除最旧的未使用Canvas
   */
  private removeOldestCanvas(): void {
    // 找到最旧的未使用Canvas
    const unused = this.pool.filter(p => !p.inUse);

    if (unused.length === 0) {
      // 如果所有Canvas都在使用中，强制移除最旧的
      console.warn('Canvas池已满且所有Canvas都在使用中，强制移除最旧的Canvas');
      unused.push(...this.pool);
    }

    unused.sort((a, b) => a.lastUsed - b.lastUsed);

    const oldest = unused[0];
    const index = this.pool.indexOf(oldest);

    if (index !== -1) {
      this.pool.splice(index, 1);
    }
  }

  /**
   * 清理所有未使用的Canvas
   */
  cleanup(): void {
    this.pool = this.pool.filter(p => p.inUse);
  }

  /**
   * 清理超过指定时间未使用的Canvas
   */
  cleanupOld(maxAge: number = 60000): void {
    const now = Date.now();
    this.pool = this.pool.filter(p => {
      if (p.inUse) return true;
      return (now - p.lastUsed) < maxAge;
    });
  }

  /**
   * 销毁池中所有Canvas
   */
  destroy(): void {
    this.pool = [];
  }

  /**
   * 获取池状态
   */
  getStatus() {
    return {
      total: this.pool.length,
      inUse: this.pool.filter(p => p.inUse).length,
      available: this.pool.filter(p => !p.inUse).length,
      maxPoolSize: this.maxPoolSize
    };
  }
}

// 导出全局Canvas池单例（可选）
export const globalCanvasPool = new CanvasPool();
