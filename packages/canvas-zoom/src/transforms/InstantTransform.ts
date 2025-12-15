/**
 * 即时变换策略 - 纯CSS Transform
 *
 * 特点：
 * - 永不卡顿，响应极快
 * - 使用CSS transform: scale()
 * - 大倍数时可能模糊
 * - 适合快速交互
 */

import { BaseTransform, ZoomState, ZoomOptions } from './BaseTransform';

export class InstantTransform extends BaseTransform {
  constructor(options?: ZoomOptions) {
    super(options);
  }

  /**
   * 应用CSS transform缩放
   */
  applyZoom(element: HTMLElement, state: ZoomState): void {
    const { scale, offsetX, offsetY } = state;

    // 使用CSS transform
    element.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    element.style.transformOrigin = '0 0';

    // 使用will-change优化性能
    element.style.willChange = 'transform';
  }

  /**
   * 重置变换
   */
  resetZoom(element: HTMLElement): void {
    element.style.transform = '';
    element.style.transformOrigin = '';
    element.style.willChange = '';
  }

  /**
   * 执行缩放（带中心点）
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

    // 如果提供了中心点，围绕中心点缩放
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

    // 立即应用
    this.applyZoom(element, newState);

    return newState;
  }
}
