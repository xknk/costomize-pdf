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
export type ZoomEventType = 'zoom-start' | 'zoom-change' | 'zoom-end' | 'rerender-start' | 'rerender-end';
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
    container: HTMLElement | string;
    strategy?: ZoomStrategy;
    minScale?: number;
    maxScale?: number;
    initialScale?: number;
    zoomSpeed?: number;
    rerenderThreshold?: number;
    rerenderDelay?: number;
    gestures?: GestureConfig;
}
//# sourceMappingURL=index.d.ts.map