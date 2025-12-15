/**
 * 滚轮手势识别
 *
 * 支持：
 * - Ctrl/Cmd + 滚轮缩放
 * - 可配置修饰键
 * - 防抖优化
 */

export interface WheelGestureOptions {
  requireCtrl?: boolean; // 是否需要Ctrl键，默认true
  preventDefault?: boolean; // 是否阻止默认行为，默认true
  debounceTime?: number; // 防抖时间（ms），默认0
}

export type WheelGestureHandler = (
  delta: number,
  centerX: number,
  centerY: number,
  event: WheelEvent
) => void;

export class WheelGesture {
  private element: HTMLElement;
  private handler: WheelGestureHandler;
  private options: Required<WheelGestureOptions>;
  private debounceTimer: number | null = null;

  constructor(
    element: HTMLElement,
    handler: WheelGestureHandler,
    options: WheelGestureOptions = {}
  ) {
    this.element = element;
    this.handler = handler;
    this.options = {
      requireCtrl: options.requireCtrl !== false,
      preventDefault: options.preventDefault !== false,
      debounceTime: options.debounceTime || 0
    };

    this.bind();
  }

  /**
   * 绑定事件
   */
  private bind(): void {
    this.element.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  /**
   * 处理滚轮事件
   */
  private handleWheel = (event: WheelEvent): void => {
    // 检查修饰键
    if (this.options.requireCtrl && !event.ctrlKey && !event.metaKey) {
      return;
    }

    // 阻止默认行为
    if (this.options.preventDefault) {
      event.preventDefault();
    }

    // 获取鼠标位置（相对于元素）
    const rect = this.element.getBoundingClientRect();
    const centerX = event.clientX - rect.left;
    const centerY = event.clientY - rect.top;

    // 归一化滚轮增量（不同浏览器/设备的值不同）
    const delta = this.normalizeDelta(event);

    // 防抖处理
    if (this.options.debounceTime > 0) {
      if (this.debounceTimer !== null) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = window.setTimeout(() => {
        this.handler(delta, centerX, centerY, event);
        this.debounceTimer = null;
      }, this.options.debounceTime);
    } else {
      // 直接触发
      this.handler(delta, centerX, centerY, event);
    }
  };

  /**
   * 归一化滚轮增量
   */
  private normalizeDelta(event: WheelEvent): number {
    let delta = event.deltaY;

    // 归一化不同浏览器的值
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      delta *= 40; // 行滚动转换为像素
    } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      delta *= 800; // 页滚动转换为像素
    }

    // 限制增量范围（避免极端值）
    delta = Math.max(-100, Math.min(100, delta));

    return delta;
  }

  /**
   * 解绑事件
   */
  destroy(): void {
    this.element.removeEventListener('wheel', this.handleWheel);

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
