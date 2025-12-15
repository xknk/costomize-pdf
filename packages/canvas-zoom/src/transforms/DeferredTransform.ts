/**
 * 延迟变换策略 - 延迟重渲染
 *
 * 特点：
 * - 总是高清，无模糊
 * - 缩放时先用CSS快速响应
 * - 延迟后触发高清重渲染
 * - 有延迟感但画质最好
 */

import { BaseTransform, ZoomState, ZoomOptions } from './BaseTransform';

export interface DeferredTransformOptions extends ZoomOptions {
  rerenderDelay?: number; // 重渲染延迟时间（ms），默认300
}

export class DeferredTransform extends BaseTransform {
  private rerenderDelay: number;
  private rerenderTimer: number | null = null;
  private onRerender?: (scale: number) => void;

  constructor(options: DeferredTransformOptions = {}) {
    super(options);
    this.rerenderDelay = options.rerenderDelay || 300;
  }

  /**
   * 设置重渲染回调
   */
  setRerenderCallback(callback: (scale: number) => void): void {
    this.onRerender = callback;
  }

  /**
   * 应用缩放（先CSS，后重渲染）
   */
  applyZoom(element: HTMLElement, state: ZoomState): void {
    const { scale, offsetX, offsetY } = state;

    // 立即应用CSS变换
    element.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    element.style.transformOrigin = '0 0';

    // 清除之前的重渲染定时器
    if (this.rerenderTimer !== null) {
      clearTimeout(this.rerenderTimer);
    }

    // 延迟触发重渲染
    this.rerenderTimer = window.setTimeout(() => {
      this.triggerRerender(element, scale);
      this.rerenderTimer = null;
    }, this.rerenderDelay);
  }

  /**
   * 触发重渲染
   */
  private triggerRerender(_element: HTMLElement, scale: number): void {
    if (this.onRerender) {
      // 调用重渲染回调
      this.onRerender(scale);

      // 重渲染完成后，移除CSS transform
      // 注意：这需要在重渲染完成后调用
      // 实际使用中，应该在重渲染完成回调中调用 resetZoom
    }
  }

  /**
   * 重置变换
   */
  resetZoom(element: HTMLElement): void {
    element.style.transform = '';
    element.style.transformOrigin = '';

    // 清除定时器
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
