/**
 * 双指捏合手势识别
 *
 * 支持：
 * - 双指捏合缩放
 * - 缩放中心点计算
 * - 手势状态管理
 */

export interface PinchGestureOptions {
  preventDefault?: boolean; // 是否阻止默认行为，默认true
  minDistance?: number; // 最小有效距离（像素），默认20
}

export type PinchGestureHandler = (
  scale: number,
  centerX: number,
  centerY: number,
  event: TouchEvent
) => void;

export class PinchGesture {
  private element: HTMLElement;
  private handler: PinchGestureHandler;
  private options: Required<PinchGestureOptions>;

  private lastDistance: number = 0;
  private isPinching = false;

  constructor(
    element: HTMLElement,
    handler: PinchGestureHandler,
    options: PinchGestureOptions = {}
  ) {
    this.element = element;
    this.handler = handler;
    this.options = {
      preventDefault: options.preventDefault !== false,
      minDistance: options.minDistance || 20
    };

    this.bind();
  }

  /**
   * 绑定事件
   */
  private bind(): void {
    this.element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd);
    this.element.addEventListener('touchcancel', this.handleTouchEnd);
  }

  /**
   * 处理触摸开始
   */
  private handleTouchStart = (event: TouchEvent): void => {
    if (event.touches.length === 2) {
      if (this.options.preventDefault) {
        event.preventDefault();
      }

      this.isPinching = true;
      this.lastDistance = this.getDistance(event.touches[0], event.touches[1]);
    }
  };

  /**
   * 处理触摸移动
   */
  private handleTouchMove = (event: TouchEvent): void => {
    if (!this.isPinching || event.touches.length !== 2) {
      return;
    }

    if (this.options.preventDefault) {
      event.preventDefault();
    }

    const currentDistance = this.getDistance(event.touches[0], event.touches[1]);
    const currentCenter = this.getCenter(event.touches[0], event.touches[1]);

    // 检查距离变化是否足够大
    const distanceChange = Math.abs(currentDistance - this.lastDistance);
    if (distanceChange < this.options.minDistance && this.lastDistance > 0) {
      return;
    }

    // 计算缩放比例
    if (this.lastDistance > 0) {
      const scale = currentDistance / this.lastDistance;

      // 触发回调
      this.handler(scale, currentCenter.x, currentCenter.y, event);
    }

    // 更新状态
    this.lastDistance = currentDistance;
  };

  /**
   * 处理触摸结束
   */
  private handleTouchEnd = (): void => {
    this.isPinching = false;
    this.lastDistance = 0;
  };

  /**
   * 计算两点距离
   */
  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 计算两点中心
   */
  private getCenter(touch1: Touch, touch2: Touch): { x: number; y: number } {
    const rect = this.element.getBoundingClientRect();
    return {
      x: (touch1.clientX + touch2.clientX) / 2 - rect.left,
      y: (touch1.clientY + touch2.clientY) / 2 - rect.top
    };
  }

  /**
   * 解绑事件
   */
  destroy(): void {
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchEnd);

    this.isPinching = false;
    this.lastDistance = 0;
  }
}
