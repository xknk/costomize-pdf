/**
 * 缩放模块类型定义
 */

/**
 * 缩放状态
 */
export interface ZoomState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * 缩放策略类型
 */
export type ZoomStrategy = 'instant' | 'deferred' | 'hybrid';

/**
 * 缩放事件类型
 */
export type ZoomEventType =
  | 'zoom-start'      // 缩放开始
  | 'zoom-change'     // 缩放变化
  | 'zoom-end'        // 缩放结束
  | 'rerender-start'  // 重渲染开始
  | 'rerender-end';   // 重渲染结束

/**
 * 缩放事件数据
 */
export interface ZoomEvent {
  type: ZoomEventType;
  state: ZoomState;
  previousState?: ZoomState;
  timestamp: number;
}

/**
 * 事件监听器
 */
export type ZoomEventListener = (event: ZoomEvent) => void;

/**
 * 手势配置
 */
export interface GestureConfig {
  wheel?: boolean | {
    requireCtrl?: boolean;
    preventDefault?: boolean;
    debounceTime?: number;
  };
  pinch?: boolean | {
    preventDefault?: boolean;
    minDistance?: number;
  };
  doubleClick?: boolean;
}

/**
 * 缩放管理器配置
 */
export interface ZoomManagerConfig {
  container: HTMLElement | string;  // 容器元素或选择器
  strategy?: ZoomStrategy;          // 缩放策略，默认'hybrid'
  minScale?: number;                // 最小缩放比例，默认0.5
  maxScale?: number;                // 最大缩放比例，默认5.0
  initialScale?: number;            // 初始缩放比例，默认1.0
  zoomSpeed?: number;               // 缩放速度，默认0.1

  // 混合策略专用
  rerenderThreshold?: number;       // 重渲染阈值，默认0.3
  rerenderDelay?: number;           // 重渲染延迟（ms），默认300

  // 手势配置
  gestures?: GestureConfig;
}
