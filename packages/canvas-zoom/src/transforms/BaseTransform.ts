/**
 * 缩放策略基类
 *
 * 定义所有缩放策略的通用接口
 */

export interface ZoomState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface ZoomOptions {
  minScale?: number;
  maxScale?: number;
  zoomSpeed?: number; // 缩放速度（每次缩放的比例）
}

export abstract class BaseTransform {
  protected minScale: number;
  protected maxScale: number;
  protected zoomSpeed: number;

  constructor(options: ZoomOptions = {}) {
    this.minScale = options.minScale || 0.5;
    this.maxScale = options.maxScale || 5.0;
    this.zoomSpeed = options.zoomSpeed || 0.1;
  }

  /**
   * 应用缩放变换
   */
  abstract applyZoom(
    element: HTMLElement,
    state: ZoomState
  ): void;

  /**
   * 重置变换
   */
  abstract resetZoom(element: HTMLElement): void;

  /**
   * 执行缩放（带中心点）
   */
  abstract zoom(
    element: HTMLElement,
    currentState: ZoomState,
    delta: number,
    centerX?: number,
    centerY?: number
  ): ZoomState;

  /**
   * 计算新的缩放比例
   */
  protected calculateNewScale(
    currentScale: number,
    delta: number
  ): number {
    const factor = delta > 0 ? 1 - this.zoomSpeed : 1 + this.zoomSpeed;
    let newScale = currentScale * factor;

    // 限制范围
    newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));

    return newScale;
  }

  /**
   * 计算缩放中心点偏移
   */
  protected calculateOffset(
    currentOffset: number,
    centerPosition: number,
    oldScale: number,
    newScale: number
  ): number {
    // 围绕中心点缩放的偏移计算
    const scaleRatio = newScale / oldScale;
    return centerPosition - (centerPosition - currentOffset) * scaleRatio;
  }
}
