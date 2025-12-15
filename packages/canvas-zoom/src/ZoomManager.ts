/**
 * 缩放管理器 - 核心控制器
 *
 * 功能：
 * - 整合所有缩放策略
 * - 管理手势识别
 * - 提供统一的API接口
 * - 发送缩放事件
 */

import { InstantTransform } from './transforms/InstantTransform';
import { DeferredTransform } from './transforms/DeferredTransform';
import { HybridTransform } from './transforms/HybridTransform';
import { BaseTransform } from './transforms/BaseTransform';
import { WheelGesture } from './gestures/WheelGesture';
import { PinchGesture } from './gestures/PinchGesture';
import type {
  ZoomManagerConfig,
  ZoomStrategy,
  ZoomState,
  ZoomEvent,
  ZoomEventType,
  ZoomEventListener
} from './types';

/**
 * 缩放管理器
 */
export class ZoomManager {
  private container: HTMLElement;
  private element: HTMLElement;
  private strategy: ZoomStrategy;
  private transform: BaseTransform;
  private currentState: ZoomState;

  // 手势处理器
  private wheelGesture?: WheelGesture;
  private pinchGesture?: PinchGesture;

  // 事件监听器
  private listeners: Map<ZoomEventType, Set<ZoomEventListener>> = new Map();

  // 配置
  private config: Required<Omit<ZoomManagerConfig, 'container' | 'gestures'>> & {
    gestures: NonNullable<ZoomManagerConfig['gestures']>;
  };

  constructor(config: ZoomManagerConfig) {
    // 解析容器
    this.container =
      typeof config.container === 'string'
        ? document.querySelector(config.container)!
        : config.container;

    if (!this.container) {
      throw new Error('ZoomManager: 容器元素不存在');
    }

    // 查找或创建缩放元素（假设容器内第一个子元素）
    this.element = this.container.firstElementChild as HTMLElement;
    if (!this.element) {
      throw new Error('ZoomManager: 容器内没有可缩放的元素');
    }

    // 初始化配置（设置默认值）
    this.config = {
      strategy: config.strategy || 'hybrid',
      minScale: config.minScale ?? 0.5,
      maxScale: config.maxScale ?? 5.0,
      initialScale: config.initialScale ?? 1.0,
      zoomSpeed: config.zoomSpeed ?? 0.1,
      rerenderThreshold: config.rerenderThreshold ?? 0.3,
      rerenderDelay: config.rerenderDelay ?? 300,
      gestures: config.gestures ?? { wheel: true, pinch: true, doubleClick: false }
    };

    this.strategy = this.config.strategy;

    // 初始化缩放状态
    this.currentState = {
      scale: this.config.initialScale,
      offsetX: 0,
      offsetY: 0
    };

    // 创建变换策略
    this.transform = this.createTransform(this.strategy);

    // 初始化手势
    this.initGestures();

    // 应用初始缩放
    this.transform.applyZoom(this.element, this.currentState);
  }

  /**
   * 创建变换策略实例
   */
  private createTransform(strategy: ZoomStrategy): BaseTransform {
    const options = {
      minScale: this.config.minScale,
      maxScale: this.config.maxScale,
      zoomSpeed: this.config.zoomSpeed
    };

    switch (strategy) {
      case 'instant':
        return new InstantTransform(options);

      case 'deferred': {
        const transform = new DeferredTransform({
          ...options,
          rerenderDelay: this.config.rerenderDelay
        });
        transform.setRerenderCallback(this.handleRerender);
        return transform;
      }

      case 'hybrid': {
        const transform = new HybridTransform({
          ...options,
          rerenderThreshold: this.config.rerenderThreshold,
          rerenderDelay: this.config.rerenderDelay
        });
        transform.setRerenderCallback(this.handleRerender);
        return transform;
      }

      default:
        throw new Error(`ZoomManager: 未知的缩放策略 "${strategy}"`);
    }
  }

  /**
   * 初始化手势识别
   */
  private initGestures(): void {
    const { gestures } = this.config;

    // 滚轮缩放
    if (gestures.wheel) {
      const wheelOptions =
        typeof gestures.wheel === 'object'
          ? gestures.wheel
          : { requireCtrl: true, preventDefault: true };

      this.wheelGesture = new WheelGesture(
        this.container,
        this.handleWheelZoom,
        wheelOptions
      );
    }

    // 触摸捏合缩放
    if (gestures.pinch) {
      const pinchOptions =
        typeof gestures.pinch === 'object' ? gestures.pinch : { preventDefault: true };

      this.pinchGesture = new PinchGesture(
        this.container,
        this.handlePinchZoom,
        pinchOptions
      );
    }

    // 双击缩放（可选）
    if (gestures.doubleClick) {
      this.container.addEventListener('dblclick', this.handleDoubleClick);
    }
  }

  /**
   * 处理滚轮缩放
   */
  private handleWheelZoom = (
    delta: number,
    centerX: number,
    centerY: number
  ): void => {
    this.emit('zoom-start', this.currentState);

    const previousState = { ...this.currentState };

    // 执行缩放
    this.currentState = this.transform.zoom(
      this.element,
      this.currentState,
      delta,
      centerX,
      centerY
    );

    this.emit('zoom-change', this.currentState, previousState);
    this.emit('zoom-end', this.currentState);
  };

  /**
   * 处理触摸捏合缩放
   */
  private handlePinchZoom = (
    scale: number,
    centerX: number,
    centerY: number
  ): void => {
    this.emit('zoom-start', this.currentState);

    const previousState = { ...this.currentState };

    // 将scale转换为delta（对数映射）
    const delta = scale > 1 ? -50 : 50;

    this.currentState = this.transform.zoom(
      this.element,
      this.currentState,
      delta,
      centerX,
      centerY
    );

    this.emit('zoom-change', this.currentState, previousState);
    this.emit('zoom-end', this.currentState);
  };

  /**
   * 处理双击缩放
   */
  private handleDoubleClick = (event: MouseEvent): void => {
    const rect = this.container.getBoundingClientRect();
    const centerX = event.clientX - rect.left;
    const centerY = event.clientY - rect.top;

    // 双击时在100%和200%之间切换
    const targetScale = this.currentState.scale > 1.5 ? 1.0 : 2.0;
    this.zoomTo(targetScale, centerX, centerY);
  };

  /**
   * 处理重渲染回调
   */
  private handleRerender = (scale: number): void => {
    this.emit('rerender-start', { ...this.currentState, scale });

    // 这里应该触发PDF重新渲染
    // 实际使用时，外部应该监听这个事件并执行重渲染
    // 重渲染完成后，应该调用 onRerenderComplete(scale)

    // 模拟异步渲染完成（实际应该由外部调用）
    // this.onRerenderComplete(scale);
  };

  /**
   * 重渲染完成回调（由外部调用）
   */
  public onRerenderComplete(newScale: number): void {
    // 更新基础scale（仅hybrid策略需要）
    if (this.transform instanceof HybridTransform) {
      this.transform.updateBaseScale(newScale);
      this.transform.resetZoom(this.element);
    } else if (this.transform instanceof DeferredTransform) {
      this.transform.resetZoom(this.element);
    }

    this.currentState.scale = newScale;
    this.emit('rerender-end', this.currentState);
  }

  /**
   * 放大
   */
  public zoomIn(centerX?: number, centerY?: number): void {
    this.emit('zoom-start', this.currentState);

    const previousState = { ...this.currentState };

    this.currentState = this.transform.zoom(
      this.element,
      this.currentState,
      -50, // 负值表示放大
      centerX,
      centerY
    );

    this.emit('zoom-change', this.currentState, previousState);
    this.emit('zoom-end', this.currentState);
  }

  /**
   * 缩小
   */
  public zoomOut(centerX?: number, centerY?: number): void {
    this.emit('zoom-start', this.currentState);

    const previousState = { ...this.currentState };

    this.currentState = this.transform.zoom(
      this.element,
      this.currentState,
      50, // 正值表示缩小
      centerX,
      centerY
    );

    this.emit('zoom-change', this.currentState, previousState);
    this.emit('zoom-end', this.currentState);
  }

  /**
   * 缩放到指定比例
   */
  public zoomTo(scale: number, centerX?: number, centerY?: number): void {
    // 限制scale范围
    scale = Math.max(this.config.minScale, Math.min(this.config.maxScale, scale));

    this.emit('zoom-start', this.currentState);

    const previousState = { ...this.currentState };

    // 计算缩放后的偏移量
    const currentScale = this.currentState.scale;

    let newOffsetX = this.currentState.offsetX;
    let newOffsetY = this.currentState.offsetY;

    if (centerX !== undefined && centerY !== undefined) {
      const scaleChange = scale / currentScale;
      newOffsetX = centerX - (centerX - this.currentState.offsetX) * scaleChange;
      newOffsetY = centerY - (centerY - this.currentState.offsetY) * scaleChange;
    }

    this.currentState = {
      scale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    };

    this.transform.applyZoom(this.element, this.currentState);

    this.emit('zoom-change', this.currentState, previousState);
    this.emit('zoom-end', this.currentState);
  }

  /**
   * 适应宽度
   */
  public fitWidth(): void {
    const containerWidth = this.container.clientWidth;
    const elementWidth = this.element.offsetWidth;

    if (elementWidth === 0) {
      console.warn('ZoomManager: 元素宽度为0，无法计算缩放比例');
      return;
    }

    const scale = containerWidth / elementWidth;
    this.zoomTo(scale, 0, 0);
  }

  /**
   * 适应页面
   */
  public fitPage(): void {
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;
    const elementWidth = this.element.offsetWidth;
    const elementHeight = this.element.offsetHeight;

    if (elementWidth === 0 || elementHeight === 0) {
      console.warn('ZoomManager: 元素尺寸为0，无法计算缩放比例');
      return;
    }

    const scaleX = containerWidth / elementWidth;
    const scaleY = containerHeight / elementHeight;
    const scale = Math.min(scaleX, scaleY);

    this.zoomTo(scale, 0, 0);
  }

  /**
   * 重置缩放
   */
  public reset(): void {
    this.zoomTo(this.config.initialScale, 0, 0);
    this.currentState.offsetX = 0;
    this.currentState.offsetY = 0;
    this.transform.applyZoom(this.element, this.currentState);
  }

  /**
   * 切换缩放策略
   */
  public setStrategy(strategy: ZoomStrategy): void {
    if (strategy === this.strategy) {
      return;
    }

    // 销毁旧策略
    if ('destroy' in this.transform && typeof this.transform.destroy === 'function') {
      this.transform.destroy();
    }

    // 创建新策略
    this.strategy = strategy;
    this.transform = this.createTransform(strategy);

    // 重新应用当前状态
    this.transform.applyZoom(this.element, this.currentState);
  }

  /**
   * 获取当前缩放状态
   */
  public getState(): Readonly<ZoomState> {
    return { ...this.currentState };
  }

  /**
   * 获取当前缩放比例
   */
  public getScale(): number {
    return this.currentState.scale;
  }

  /**
   * 监听事件
   */
  public on(type: ZoomEventType, listener: ZoomEventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  /**
   * 移除事件监听
   */
  public off(type: ZoomEventType, listener: ZoomEventListener): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * 触发事件
   */
  private emit(type: ZoomEventType, state: ZoomState, previousState?: ZoomState): void {
    const listeners = this.listeners.get(type);
    if (!listeners || listeners.size === 0) {
      return;
    }

    const event: ZoomEvent = {
      type,
      state: { ...state },
      previousState: previousState ? { ...previousState } : undefined,
      timestamp: Date.now()
    };

    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error(`ZoomManager: 事件监听器执行出错 (${type}):`, error);
      }
    });
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    // 销毁手势
    if (this.wheelGesture) {
      this.wheelGesture.destroy();
      this.wheelGesture = undefined;
    }

    if (this.pinchGesture) {
      this.pinchGesture.destroy();
      this.pinchGesture = undefined;
    }

    if (this.config.gestures.doubleClick) {
      this.container.removeEventListener('dblclick', this.handleDoubleClick);
    }

    // 销毁变换策略
    if ('destroy' in this.transform && typeof this.transform.destroy === 'function') {
      this.transform.destroy();
    }

    // 清空事件监听器
    this.listeners.clear();

    // 重置元素样式
    this.transform.resetZoom(this.element);
  }
}
