/**
 * 混合变换策略 - CSS即时响应 + 超阈值重渲染
 *
 * 特点：
 * - 默认推荐策略
 * - 小范围缩放使用CSS（快速）
 * - 超过阈值触发重渲染（高清）
 * - 平衡性能和清晰度
 */

import { BaseTransform, ZoomState, ZoomOptions } from './BaseTransform';

export interface HybridTransformOptions extends ZoomOptions {
  rerenderThreshold?: number; // 重渲染阈值（相对于基础scale的变化），默认0.3
  rerenderDelay?: number; // 重渲染延迟时间（ms），默认300
}

export class HybridTransform extends BaseTransform {
  private rerenderThreshold: number;
  private rerenderDelay: number;
  private rerenderTimer: number | null = null;
  private baseScale: number = 1; // 基础渲染scale（上次重渲染的scale）
  private onRerender?: (scale: number) => void;

  constructor(options: HybridTransformOptions = {}) {
    super(options);
    this.rerenderThreshold = options.rerenderThreshold || 0.3; // 30%变化触发重渲染
    this.rerenderDelay = options.rerenderDelay || 300;
  }

  /**
   * 设置重渲染回调
   */
  setRerenderCallback(callback: (scale: number) => void): void {
    this.onRerender = callback;
  }

  /**
   * 更新基础scale（重渲染完成后调用）
   */
  updateBaseScale(newBaseScale: number): void {
    this.baseScale = newBaseScale;
  }

  /**
   * 应用缩放
   */
  applyZoom(element: HTMLElement, state: ZoomState): void {
    const { scale, offsetX, offsetY } = state;

    // 计算相对于基础scale的比例
    const relativeScale = scale / this.baseScale;

    // 使用CSS transform应用相对缩放
    element.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${relativeScale})`;
    element.style.transformOrigin = '0 0';

    // 检查是否需要重渲染
    const scaleDiff = Math.abs(scale - this.baseScale) / this.baseScale;

    if (scaleDiff > this.rerenderThreshold) {
      // 清除之前的定时器
      if (this.rerenderTimer !== null) {
        clearTimeout(this.rerenderTimer);
      }

      // 延迟触发重渲染
      this.rerenderTimer = window.setTimeout(() => {
        this.triggerRerender(element, scale);
        this.rerenderTimer = null;
      }, this.rerenderDelay);
    }
  }

  /**
   * 触发重渲染
   */
  private triggerRerender(_element: HTMLElement, scale: number): void {
    if (this.onRerender) {
      // 调用重渲染回调
      this.onRerender(scale);

      // 注意：重渲染完成后需要调用 updateBaseScale 和 resetZoom
    }
  }

  /**
   * 重置CSS变换（保持baseScale）
   */
  resetZoom(element: HTMLElement): void {
    element.style.transform = '';
    element.style.transformOrigin = '';

    if (this.rerenderTimer !== null) {
      clearTimeout(this.rerenderTimer);
      this.rerenderTimer = null;
    }
  }

  /**
   * 执行缩放
   */
  zoom(
    element: HTMLElement,
    currentState: ZoomState,
    delta: number,
    centerX?: number,
    centerY?: number
  ): ZoomState {
    const newScale = this.calculateNewScale(currentState.scale, delta);

    let newOffsetX = currentState.offsetX;
    let newOffsetY = currentState.offsetY;

    if (centerX !== undefined && centerY !== undefined) {
      newOffsetX = this.calculateOffset(
        currentState.offsetX,
        centerX,
        currentState.scale,
        newScale
      );
      newOffsetY = this.calculateOffset(
        currentState.offsetY,
        centerY,
        currentState.scale,
        newScale
      );
    }

    const newState: ZoomState = {
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    };

    this.applyZoom(element, newState);

    return newState;
  }

  /**
   * 销毁
   */
  destroy(): void {
    if (this.rerenderTimer !== null) {
      clearTimeout(this.rerenderTimer);
      this.rerenderTimer = null;
    }
    this.onRerender = undefined;
  }
}
